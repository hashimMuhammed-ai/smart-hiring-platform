import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_RESUME_PARSE } from '@app/shared/constants';
import type { ResumeUploadPayload } from './resume.types.js';

@Injectable()
export class ResumeParseQueue {
  private readonly logger = new Logger(ResumeParseQueue.name);

  constructor(
    @InjectQueue(QUEUE_RESUME_PARSE)
    private readonly queue: Queue,
  ) { }

  /**
   * Enqueues a resume parsing job with retry config.
   * { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
   */
  async addParseJob(payload: ResumeUploadPayload): Promise<void> {
    const jobId = payload.candidateId; // Use candidateId as the unique job ID
    this.logger.log(`Adding resume parse job for candidate ${jobId} to queue`, {
      candidateId: jobId,
      tenantId: payload.tenantId,
      jobId: payload.jobId,
    });

    await this.queue.add('parse', payload, {
      jobId,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    });

    this.logger.log(`Successfully enqueued resume parse job for candidate ${jobId}`);
  }
}
