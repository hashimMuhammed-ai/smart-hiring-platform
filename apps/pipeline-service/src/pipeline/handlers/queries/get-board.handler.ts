import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { GetBoardQuery } from './get-board.query.js';
import { PipelineRepository } from '../../pipeline.repository.js';

@QueryHandler(GetBoardQuery)
export class GetBoardHandler implements IQueryHandler<GetBoardQuery, any> {
  constructor(private readonly pipelineRepository: PipelineRepository) {}

  async execute(query: GetBoardQuery): Promise<any> {
    const { jobId, tenantId } = query;
    const candidates = await this.pipelineRepository.getBoard(jobId, tenantId);

    // Group candidates by stage, ensuring all stages are represented
    const stages: Record<string, any[]> = {
      applied: [],
      screening: [],
      interview: [],
      offer: [],
      hired: [],
      rejected: [],
    };

    for (const c of candidates) {
      const stageName = c.stage;
      if (stages[stageName]) {
        stages[stageName].push({
          candidateId: c.candidateId,
          name: c.name,
          email: c.email,
          matchScore: c.matchScore !== null && c.matchScore !== undefined ? Number(c.matchScore) : null,
          experienceYears: c.experienceYears !== null && c.experienceYears !== undefined ? Number(c.experienceYears) : null,
          notes: c.notes,
          movedAt: c.movedAt,
        });
      }
    }

    return { stages };
  }
}
