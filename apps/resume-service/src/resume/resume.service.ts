import { Injectable, Logger } from '@nestjs/common';
import { CandidateRepository } from './candidate.repository.js';
import { ResumeParseQueue } from './resume-parse.queue.js';
import type { Candidate } from '@app/shared/database';
import type { ResumeUploadPayload, ResumeUploadResult } from './resume.types.js';

@Injectable()
export class ResumeService {
  private readonly logger = new Logger(ResumeService.name);

  constructor(
    private readonly candidateRepository: CandidateRepository,
    private readonly resumeParseQueue: ResumeParseQueue,
  ) {}

  /**
   * Creates a pending candidate row in the database and enqueues the parse job to BullMQ.
   */
  async handleUpload(payload: ResumeUploadPayload): Promise<ResumeUploadResult> {
    this.logger.log(`Creating pending candidate`, {
      candidateId: payload.candidateId,
      tenantId: payload.tenantId,
      jobId: payload.jobId,
    });

    const candidate: Candidate = await this.candidateRepository.createPending({
      id: payload.candidateId,
      tenantId: payload.tenantId,
      jobId: payload.jobId,
      resumeUrl: payload.r2Key,
    });

    this.logger.log(`Candidate row created with status 'pending'`, {
      candidateId: candidate.id,
      tenantId: payload.tenantId,
    });

    // Enqueue job to BullMQ parse queue
    await this.resumeParseQueue.addParseJob(payload);

    return { candidateId: candidate.id };
  }
}
