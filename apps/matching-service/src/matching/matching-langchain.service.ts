import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OpenAIEmbeddings } from '@langchain/openai';
import { JobRepository } from './job.repository.js';

@Injectable()
export class MatchingLangChainService implements OnModuleInit {
  private readonly logger = new Logger(MatchingLangChainService.name);

  constructor(
    private readonly embeddings: OpenAIEmbeddings,
    private readonly jobRepository: JobRepository,
  ) {}

  /**
   * Called once on module init so the embedding model is ready before
   * the first TCP message arrives. (Chains are constructed once, not per-request.)
   */
  onModuleInit(): void {
    this.logger.log('MatchingLangChainService initialised — embedding model ready');
  }

  /**
   * Generate an embedding for the supplied job description, then persist it
   * to the `jobs.embedding` column via JobRepository.
   *
   * @param jobId     UUID of the job row to update
   * @param description Full job description text to embed
   * @param tenantId  Tenant scope for the DB update
   */
  async embedJobDescription(
    jobId: string,
    description: string,
    tenantId: string,
  ): Promise<void> {
    this.logger.log('Generating embedding for job', { jobId, tenantId });

    const vector: number[] = await this.embeddings.embedQuery(description);

    // Serialise as a Postgres vector literal, e.g. "[0.1,0.2,...]"
    const embeddingString = `[${vector.join(',')}]`;

    await this.jobRepository.updateEmbedding(jobId, tenantId, embeddingString);

    this.logger.log('Job embedding persisted', { jobId, tenantId, dimensions: vector.length });
  }
}
