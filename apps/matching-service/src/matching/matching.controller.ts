import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { MatchingService } from './matching.service.js';
import type { JobEmbedPayload, JobEmbedResult } from './matching.types.js';

interface TcpResponse<T> {
  data: T | null;
  error: string | null;
}

@Controller()
export class MatchingController {
  private readonly logger = new Logger(MatchingController.name);

  constructor(private readonly matchingService: MatchingService) {}

  /**
   * Handles the `job.embed` TCP message sent by the API Gateway
   * when a new job is created. Generates an OpenAI embedding for
   * the job description and persists it to the `jobs.embedding` column.
   */
  @MessagePattern('job.embed')
  async handleJobEmbed(
    @Payload() payload: JobEmbedPayload,
  ): Promise<TcpResponse<JobEmbedResult>> {
    try {
      const data = await this.matchingService.embedJob(payload);
      return { data, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error('job.embed handler failed', {
        error: message,
        context: { tenantId: payload.tenantId, jobId: payload.jobId },
      });
      return { data: null, error: message };
    }
  }
}
