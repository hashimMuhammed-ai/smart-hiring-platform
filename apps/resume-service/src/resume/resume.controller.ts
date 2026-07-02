import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ResumeService } from './resume.service.js';
import type { ResumeUploadPayload, ResumeUploadResult } from './resume.types.js';

interface TcpResponse<T> {
  data: T | null;
  error: string | null;
}

@Controller()
export class ResumeController {
  private readonly logger = new Logger(ResumeController.name);

  constructor(private readonly resumeService: ResumeService) { }

  @MessagePattern('resume.upload')
  async handleResumeUpload(
    @Payload() payload: ResumeUploadPayload,
  ): Promise<TcpResponse<ResumeUploadResult>> {
    try {
      const data = await this.resumeService.handleUpload(payload);
      return { data, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error('resume.upload handler failed', {
        error: message,
        context: { tenantId: payload.tenantId, jobId: payload.jobId },
      });
      return { data: null, error: message };
    }
  }
}
