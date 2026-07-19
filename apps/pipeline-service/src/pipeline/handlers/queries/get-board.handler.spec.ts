import { Test, TestingModule } from '@nestjs/testing';
import { GetBoardHandler } from './get-board.handler.js';
import { GetBoardQuery } from './get-board.query.js';
import { PipelineRepository } from '../../pipeline.repository.js';

describe('GetBoardHandler', () => {
  let handler: GetBoardHandler;
  let pipelineRepository: jest.Mocked<PipelineRepository>;

  beforeEach(async () => {
    const repositoryMock = {
      getBoard: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetBoardHandler,
        {
          provide: PipelineRepository,
          useValue: repositoryMock,
        },
      ],
    }).compile();

    handler = module.get<GetBoardHandler>(GetBoardHandler);
    pipelineRepository = module.get(PipelineRepository) as jest.Mocked<PipelineRepository>;
  });

  it('should group candidates by stage', async () => {
    const mockCandidates = [
      {
        candidateId: 'c1',
        name: 'Alice',
        email: 'alice@test.com',
        stage: 'applied',
        notes: 'Some notes',
        movedAt: new Date(),
        matchScore: '85',
        experienceYears: '3.5',
      },
      {
        candidateId: 'c2',
        name: 'Bob',
        email: 'bob@test.com',
        stage: 'interview',
        notes: null,
        movedAt: new Date(),
        matchScore: 92,
        experienceYears: null,
      },
      {
        candidateId: 'c3',
        name: 'Charlie',
        email: 'charlie@test.com',
        stage: 'applied',
        notes: null,
        movedAt: new Date(),
        matchScore: null,
        experienceYears: 1.5,
      },
    ];

    pipelineRepository.getBoard.mockResolvedValue(mockCandidates);

    const result = await handler.execute(new GetBoardQuery('job-1', 'tenant-1'));

    expect(pipelineRepository.getBoard).toHaveBeenCalledWith('job-1', 'tenant-1');
    expect(result).toHaveProperty('stages');
    expect(result.stages.applied).toHaveLength(2);
    expect(result.stages.interview).toHaveLength(1);
    expect(result.stages.screening).toHaveLength(0);
    expect(result.stages.offer).toHaveLength(0);
    expect(result.stages.hired).toHaveLength(0);
    expect(result.stages.rejected).toHaveLength(0);

    expect(result.stages.applied[0]).toEqual({
      candidateId: 'c1',
      name: 'Alice',
      email: 'alice@test.com',
      matchScore: 85,
      experienceYears: 3.5,
      notes: 'Some notes',
      movedAt: mockCandidates[0].movedAt,
    });

    expect(result.stages.interview[0]).toEqual({
      candidateId: 'c2',
      name: 'Bob',
      email: 'bob@test.com',
      matchScore: 92,
      experienceYears: null,
      notes: null,
      movedAt: mockCandidates[1].movedAt,
    });
  });
});
