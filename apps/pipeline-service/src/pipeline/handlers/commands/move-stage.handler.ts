import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NOTIFICATIONS } from '@app/shared/constants';
import { MoveStageCommand } from './move-stage.command.js';
import { PipelineRepository } from '../../pipeline.repository.js';
import { StageHistoryRepository } from '../../stage-history.repository.js';

interface MoveStageResult {
  candidateId: string;
  fromStage: string;
  toStage: string;
  movedAt: Date;
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  applied: ['screening', 'rejected'],
  screening: ['interview', 'rejected'],
  interview: ['offer', 'rejected'],
  offer: ['hired', 'rejected'],
  hired: ['rejected'],
  rejected: [],
};

@CommandHandler(MoveStageCommand)
export class MoveStageHandler
  implements ICommandHandler<MoveStageCommand, MoveStageResult>
{
  private readonly logger = new Logger(MoveStageHandler.name);

  constructor(
    private readonly pipelineRepository: PipelineRepository,
    private readonly stageHistoryRepository: StageHistoryRepository,
    @InjectQueue(QUEUE_NOTIFICATIONS)
    private readonly notificationsQueue: Queue,
  ) {}

  async execute(command: MoveStageCommand): Promise<MoveStageResult> {
    const { jobId, candidateId, tenantId, toStage, notes, movedBy } = command;
    this.logger.log('Executing MoveStageCommand', {
      jobId,
      candidateId,
      tenantId,
      toStage,
    });

    // 1. Get current stage, defaulting to 'applied' if not exists
    const currentStage = await this.pipelineRepository.getStage(
      jobId,
      candidateId,
      tenantId,
    );
    const fromStage = currentStage ? currentStage.stage : 'applied';

    // 2. Validate transition
    const allowed = VALID_TRANSITIONS[fromStage] || [];
    const isValid = toStage === 'rejected' || allowed.includes(toStage);

    if (!isValid || fromStage === toStage) {
      this.logger.warn('Invalid stage transition requested', {
        fromStage,
        toStage,
        candidateId,
      });
      throw new Error('Invalid stage transition');
    }

    // 3. Update pipeline stage in database
    const pipelineStage = await this.pipelineRepository.upsertStage(
      jobId,
      candidateId,
      tenantId,
      toStage,
      notes,
      movedBy,
    );

    // 4. Record in stage history
    const historyFromStage = currentStage ? fromStage : null;
    await this.stageHistoryRepository.createHistory(
      tenantId,
      pipelineStage.id,
      historyFromStage,
      toStage,
      notes,
      movedBy,
    );

    // Trigger notification asynchronously (fire-and-forget)
    this.enqueueNotification(
      pipelineStage.id,
      tenantId,
      candidateId,
      toStage,
      fromStage,
    ).catch((err) => {
      this.logger.error('Failed to enqueue notification in background', err);
    });

    return {
      candidateId,
      fromStage,
      toStage,
      movedAt: pipelineStage.movedAt,
    };
  }

  /**
   * Helper to query database relations and enqueue a notification in the background
   * without blocking the critical path of the stage transition request.
   */
  private async enqueueNotification(
    pipelineStageId: string,
    tenantId: string,
    candidateId: string,
    toStage: string,
    fromStage: string,
  ): Promise<void> {
    const psWithRelations = await this.pipelineRepository.findByIdWithRelations(
      pipelineStageId,
      tenantId,
      { candidate: true, job: true },
    );

    const candidateEmail = psWithRelations?.candidate?.email || '';
    const candidateName = psWithRelations?.candidate?.name || 'Candidate';
    const jobTitle = psWithRelations?.job?.title || 'Job Posting';

    if (!candidateEmail || !candidateEmail.trim()) {
      this.logger.warn(`Candidate ${candidateId} does not have a valid email address. Skipping email notification.`, {
        pipelineStageId,
        candidateId,
        toStage,
      });
      return;
    }

    this.logger.log('Enqueuing notifications job', {
      candidateId,
      candidateEmail,
      toStage,
    });

    await this.notificationsQueue.add('candidate.stage.changed', {
      tenantId,
      candidateId,
      candidateEmail,
      candidateName,
      jobTitle,
      toStage,
      fromStage,
    });
  }
}
