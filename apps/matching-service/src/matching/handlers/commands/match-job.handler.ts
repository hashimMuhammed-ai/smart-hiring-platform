import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { MatchJobCommand } from './match-job.command.js';
import { JobRepository } from '../../job.repository.js';
import { VectorSearchRepository } from '../../vector-search.repository.js';
import { CandidateJobMatchRepository } from '../../candidate-job-match.repository.js';
import { MatchingLangChainService } from '../../matching-langchain.service.js';
import type { CandidateMatchResult } from '../../matching.types.js';

@CommandHandler(MatchJobCommand)
export class MatchJobHandler
  implements ICommandHandler<MatchJobCommand, CandidateMatchResult>
{
  private readonly logger = new Logger(MatchJobHandler.name);

  constructor(
    private readonly jobRepository: JobRepository,
    private readonly vectorSearchRepository: VectorSearchRepository,
    private readonly candidateJobMatchRepository: CandidateJobMatchRepository,
    private readonly matchingLangChainService: MatchingLangChainService,
  ) {}

  async execute(command: MatchJobCommand): Promise<CandidateMatchResult> {
    const { jobId, tenantId } = command;
    this.logger.log('Executing MatchJobCommand', { jobId, tenantId });

    // 1. Fetch job description and embedding
    const job = await this.jobRepository.findByIdAndTenant(jobId, tenantId);
    if (!job) {
      throw new Error(`Job ${jobId} not found for this tenant`);
    }
    if (!job.embedding) {
      throw new Error(`Job ${jobId} does not have description embedding yet`);
    }

    // Parse embedding string "[0.1, 0.2, ...]" to number[]
    const jobEmbedding = job.embedding
      .slice(1, -1)
      .split(',')
      .map(Number);

    // 2. Fetch up to 20 similar candidates using pgvector similarity search
    const similarCandidates =
      await this.vectorSearchRepository.findSimilarCandidates(
        jobEmbedding,
        jobId,
        tenantId,
        20,
      );

    if (similarCandidates.length === 0) {
      this.logger.warn('No parsed candidates found to match for job', { jobId });
      return {
        jobId,
        matchedCount: 0,
        topCandidates: [],
      };
    }

    // 3. Score similar candidates using ChatOpenAI structured evaluation
    const scoredCandidates = await this.matchingLangChainService.scoreCandidates(
      job.description,
      similarCandidates,
    );

    // 4. Upsert scores to candidate_job_matches table
    const similarityMap = new Map(
      similarCandidates.map((c) => [c.id, c.similarity]),
    );
    const candidateNameMap = new Map(
      similarCandidates.map((c) => [c.id, c.name]),
    );

    for (const scored of scoredCandidates) {
      const similarity = similarityMap.get(scored.candidateId) ?? 0;
      await this.candidateJobMatchRepository.upsertMatch(
        tenantId,
        jobId,
        scored.candidateId,
        scored.score,
        scored.rationale,
        similarity,
      );
    }

    // 5. Construct response list and sort by score DESC
    const topCandidates = scoredCandidates.map((sc) => ({
      candidateId: sc.candidateId,
      name: candidateNameMap.get(sc.candidateId) || null,
      score: sc.score,
      rationale: sc.rationale,
    }));

    topCandidates.sort((a, b) => b.score - a.score);

    this.logger.log('Matching orchestration complete', {
      jobId,
      matchedCount: topCandidates.length,
    });

    return {
      jobId,
      matchedCount: topCandidates.length,
      topCandidates,
    };
  }
}
