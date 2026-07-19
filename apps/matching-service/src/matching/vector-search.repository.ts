import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { BaseRepository, Candidate } from '@app/shared/database';
import { CandidateWithSimilarity } from './matching.types.js';

@Injectable()
export class VectorSearchRepository extends BaseRepository<Candidate> {
  constructor(
    @InjectRepository(Candidate)
    candidateRepo: Repository<Candidate>,
    private readonly dataSource: DataSource,
  ) {
    super(candidateRepo);
  }

  /**
   * Find candidates whose resumes are similar to a job description embedding.
   * Scoped by tenantId and jobId to enforce multi-tenancy and matching boundaries.
   *
   * Uses raw SQL with pgvector (<=> operator for cosine distance) mapped to similarity.
   */
  async findSimilarCandidates(
    jobEmbedding: number[],
    jobId: string,
    tenantId: string,
    limit = 20,
  ): Promise<CandidateWithSimilarity[]> {
    const embeddingString = `[${jobEmbedding.join(',')}]`;

    const rawResults = await this.dataSource.query(
      `SELECT
        id,
        name,
        email,
        parsed_data,
        1 - (embedding <=> $1::vector) AS similarity
      FROM candidates
      WHERE tenant_id = $2
        AND job_id = $3
        AND parse_status = 'done'
        AND embedding IS NOT NULL
      ORDER BY embedding <=> $1::vector
      LIMIT $4`,
      [embeddingString, tenantId, jobId, limit],
    );

    return rawResults.map((row: any) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      parsedData: row.parsed_data,
      similarity: Number(row.similarity),
    }));
  }
}
