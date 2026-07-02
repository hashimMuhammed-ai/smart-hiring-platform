import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository, Job } from '@app/shared/database';

@Injectable()
export class JobRepository extends BaseRepository<Job> {
  constructor(
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
  ) {
    super(jobRepo);
  }

  /**
   * Persist the embedding vector (serialised as a Postgres vector string)
   * for a job. Always scoped by tenantId to enforce multi-tenancy.
   *
   * The embedding is stored as a text column in TypeORM but the underlying
   * Postgres column is `vector(1536)` created via migration.
   */
  async updateEmbedding(
    jobId: string,
    tenantId: string,
    embedding: string,
  ): Promise<void> {
    await this.jobRepo.update({ id: jobId, tenantId }, { embedding });
  }

  /**
   * Fetch a single job scoped by tenant. Returns null if not found.
   */
  async findByIdAndTenant(jobId: string, tenantId: string): Promise<Job | null> {
    return this.jobRepo.findOne({ where: { id: jobId, tenantId } });
  }
}
