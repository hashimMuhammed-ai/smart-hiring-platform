import { Injectable, Logger } from '@nestjs/common';
import { MatchingLangChainService } from './matching-langchain.service.js';
import type { JobEmbedPayload, JobEmbedResult } from './matching.types.js';

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(private readonly matchingLangChain: MatchingLangChainService) {}

  /**
   * Generates an OpenAI embedding for the given job description and persists
   * it to the `jobs.embedding` column. Called by the job.embed TCP handler.
   */
  async embedJob(payload: JobEmbedPayload): Promise<JobEmbedResult> {
    this.logger.log('Embedding job description', {
      jobId: payload.jobId,
      tenantId: payload.tenantId,
    });

    await this.matchingLangChain.embedJobDescription(
      payload.jobId,
      payload.description,
      payload.tenantId,
    );

    return { jobId: payload.jobId };
  }
}
