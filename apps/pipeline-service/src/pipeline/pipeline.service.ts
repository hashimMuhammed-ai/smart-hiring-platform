import { Injectable, Logger } from '@nestjs/common';
import { QueryBus, CommandBus } from '@nestjs/cqrs';
import { GetBoardQuery } from './handlers/queries/get-board.query.js';
import { MoveStageCommand } from './handlers/commands/move-stage.command.js';

@Injectable()
export class PipelineService {
  private readonly logger = new Logger(PipelineService.name);

  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  async getBoard(jobId: string, tenantId: string): Promise<any> {
    this.logger.log(`Fetching pipeline board via QueryBus`, { jobId, tenantId });
    return this.queryBus.execute(new GetBoardQuery(jobId, tenantId));
  }

  async moveStage(payload: {
    jobId: string;
    candidateId: string;
    tenantId: string;
    toStage: string;
    notes: string | null;
    movedBy: string | null;
  }): Promise<any> {
    this.logger.log(`Dispatching MoveStageCommand`, {
      candidateId: payload.candidateId,
      toStage: payload.toStage,
    });
    return this.commandBus.execute(
      new MoveStageCommand(
        payload.jobId,
        payload.candidateId,
        payload.tenantId,
        payload.toStage,
        payload.notes,
        payload.movedBy,
      ),
    );
  }
}
