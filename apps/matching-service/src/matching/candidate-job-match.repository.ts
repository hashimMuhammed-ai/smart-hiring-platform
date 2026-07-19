import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository, CandidateJobMatch } from '@app/shared/database';

@Injectable()
export class CandidateJobMatchRepository extends BaseRepository<CandidateJobMatch> {
  constructor(
    @InjectRepository(CandidateJobMatch)
    private readonly matchRepo: Repository<CandidateJobMatch>,
  ) {
    super(matchRepo);
  }

  /**
   * Upsert a match score and rationale for a candidate and job.
   * Scoped by tenantId to enforce multi-tenancy.
   *
   * Uses ON CONFLICT to update the score/rationale/similarity if it already exists.
   */
  async upsertMatch(
    tenantId: string,
    jobId: string,
    candidateId: string,
    score: number,
    rationale: string,
    similarity: number,
  ): Promise<void> {
    await this.matchRepo.query(
      `INSERT INTO candidate_job_matches (tenant_id, job_id, candidate_id, score, rationale, similarity, matched_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (job_id, candidate_id)
       DO UPDATE SET
         score = EXCLUDED.score,
         rationale = EXCLUDED.rationale,
         similarity = EXCLUDED.similarity,
         matched_at = NOW()`,
      [tenantId, jobId, candidateId, score, rationale, similarity],
    );
  }
}
