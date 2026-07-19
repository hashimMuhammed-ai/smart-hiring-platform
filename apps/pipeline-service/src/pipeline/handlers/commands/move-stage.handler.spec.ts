import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NOTIFICATIONS } from '@app/shared/constants';
import { MoveStageHandler } from './move-stage.handler.js';
import { MoveStageCommand } from './move-stage.command.js';
import { PipelineRepository } from '../../pipeline.repository.js';
import { StageHistoryRepository } from '../../stage-history.repository.js';

describe('MoveStageHandler', () => {
  let handler: MoveStageHandler;
  let pipelineRepository: jest.Mocked<PipelineRepository>;
  let stageHistoryRepository: jest.Mocked<StageHistoryRepository>;
  let notificationsQueue: jest.Mocked<Queue>;

  beforeEach(async () => {
    const pipelineRepoMock = {
      getStage: jest.fn(),
      upsertStage: jest.fn(),
      findByIdWithRelations: jest.fn(),
    };

    const historyRepoMock = {
      createHistory: jest.fn(),
    };

    const queueMock = {
      add: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MoveStageHandler,
        {
          provide: PipelineRepository,
          useValue: pipelineRepoMock,
        },
        {
          provide: StageHistoryRepository,
          useValue: historyRepoMock,
        },
        {
          provide: getQueueToken(QUEUE_NOTIFICATIONS),
          useValue: queueMock,
        },
      ],
    }).compile();

    handler = module.get<MoveStageHandler>(MoveStageHandler);
    pipelineRepository = module.get(PipelineRepository) as jest.Mocked<PipelineRepository>;
    stageHistoryRepository = module.get(StageHistoryRepository) as jest.Mocked<StageHistoryRepository>;
    notificationsQueue = module.get(getQueueToken(QUEUE_NOTIFICATIONS)) as jest.Mocked<Queue>;
  });

  it('should successfully transition stage and enqueue notifications job', async () => {
    const command = new MoveStageCommand(
      'job-1',
      'cand-1',
      'tenant-1',
      'screening',
      'Looks good',
      'user-1',
    );

    // Mock existing stage (applied)
    pipelineRepository.getStage.mockResolvedValue({
      id: 'pipeline-1',
      stage: 'applied',
      jobId: 'job-1',
      candidateId: 'cand-1',
      tenantId: 'tenant-1',
      notes: null,
      movedBy: null,
      movedAt: new Date(),
    } as any);

    // Mock upsertStage
    const movedAt = new Date();
    pipelineRepository.upsertStage.mockResolvedValue({
      id: 'pipeline-1',
      stage: 'screening',
      jobId: 'job-1',
      candidateId: 'cand-1',
      tenantId: 'tenant-1',
      notes: 'Looks good',
      movedBy: 'user-1',
      movedAt,
    } as any);

    // Mock findByIdWithRelations
    pipelineRepository.findByIdWithRelations.mockResolvedValue({
      candidate: { name: 'Alice', email: 'alice@email.com' },
      job: { title: 'Engineer' },
    } as any);

    const result = await handler.execute(command);

    expect(pipelineRepository.getStage).toHaveBeenCalledWith('job-1', 'cand-1', 'tenant-1');
    expect(pipelineRepository.upsertStage).toHaveBeenCalledWith(
      'job-1',
      'cand-1',
      'tenant-1',
      'screening',
      'Looks good',
      'user-1',
    );
    expect(stageHistoryRepository.createHistory).toHaveBeenCalledWith(
      'tenant-1',
      'pipeline-1',
      'applied',
      'screening',
      'Looks good',
      'user-1',
    );
    expect(notificationsQueue.add).toHaveBeenCalledWith('candidate.stage.changed', {
      tenantId: 'tenant-1',
      candidateId: 'cand-1',
      candidateEmail: 'alice@email.com',
      candidateName: 'Alice',
      jobTitle: 'Engineer',
      toStage: 'screening',
      fromStage: 'applied',
    });

    expect(result).toEqual({
      candidateId: 'cand-1',
      fromStage: 'applied',
      toStage: 'screening',
      movedAt,
    });
  });

  it('should throw an error for invalid transitions', async () => {
    const command = new MoveStageCommand(
      'job-1',
      'cand-1',
      'tenant-1',
      'hired',
      'invalid transition',
      'user-1',
    );

    // Mock existing stage (applied)
    pipelineRepository.getStage.mockResolvedValue({
      id: 'pipeline-1',
      stage: 'applied',
    } as any);

    await expect(handler.execute(command)).rejects.toThrow('Invalid stage transition');
    expect(pipelineRepository.upsertStage).not.toHaveBeenCalled();
    expect(stageHistoryRepository.createHistory).not.toHaveBeenCalled();
    expect(notificationsQueue.add).not.toHaveBeenCalled();
  });

  it('should allow transition to rejected from any stage', async () => {
    const command = new MoveStageCommand(
      'job-1',
      'cand-1',
      'tenant-1',
      'rejected',
      'No match',
      'user-1',
    );

    // Mock existing stage (interview)
    pipelineRepository.getStage.mockResolvedValue({
      id: 'pipeline-1',
      stage: 'interview',
    } as any);

    pipelineRepository.upsertStage.mockResolvedValue({
      id: 'pipeline-1',
      stage: 'rejected',
      movedAt: new Date(),
    } as any);

    pipelineRepository.findByIdWithRelations.mockResolvedValue({
      candidate: { name: 'Bob', email: 'bob@email.com' },
      job: { title: 'Analyst' },
    } as any);

    await handler.execute(command);

    expect(pipelineRepository.upsertStage).toHaveBeenCalledWith(
      'job-1',
      'cand-1',
      'tenant-1',
      'rejected',
      'No match',
      'user-1',
    );
  });
});
