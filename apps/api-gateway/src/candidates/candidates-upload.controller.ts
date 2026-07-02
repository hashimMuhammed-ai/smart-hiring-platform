import {
  Controller,
  Post,
  Param,
  ParseUUIDPipe,
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
  Inject,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ClientProxy } from '@nestjs/microservices';
import { randomUUID } from 'crypto';
import { firstValueFrom } from 'rxjs';
import { R2Service } from '../r2/r2.service.js';
import { RESUME_SERVICE } from '../clients.module.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/types/auth.types.js';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_FILE_COUNT = 20;

interface QueuedFile {
  candidateId: string;
  filename: string;
  status: string;
}

interface ResumeUploadPayload {
  tenantId: string;
  jobId: string;
  candidateId: string;
  r2Key: string;
  originalFilename: string;
  uploadedBy: string;
}

interface TcpResponse<T> {
  data: T | null;
  error: string | null;
}

@Controller('jobs')
export class CandidatesUploadController {
  constructor(
    private readonly r2Service: R2Service,
    @Inject(RESUME_SERVICE) private readonly resumeClient: ClientProxy,
  ) { }

  /**
   * POST /api/jobs/:jobId/candidates/upload
   * Accepts up to 20 PDF files (max 5 MB each).
   * For each file: uploads to R2, then fires resume.upload TCP message.
   */
  @Post(':jobId/candidates/upload')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(
    FilesInterceptor('files', MAX_FILE_COUNT, {
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
          cb(new BadRequestException('Only PDF files are accepted'), false);
        } else {
          cb(null, true);
        }
      },
    }),
  )
  async uploadResumes(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ queued: QueuedFile[] }> {
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one PDF file is required');
    }

    const queued: QueuedFile[] = [];

    for (const file of files) {
      const candidateId = randomUUID();
      const r2Key = `tenants/${user.tenantId}/jobs/${jobId}/resumes/${candidateId}.pdf`;

      // Upload to Cloudflare R2
      await this.r2Service.upload(r2Key, file.buffer, 'application/pdf');

      // Dispatch TCP message to Resume Service (fire-and-forget style)
      const payload: ResumeUploadPayload = {
        tenantId: user.tenantId,
        jobId,
        candidateId,
        r2Key,
        originalFilename: file.originalname,
        uploadedBy: user.userId,
      };

      const response = await firstValueFrom(
        this.resumeClient.send<TcpResponse<{ candidateId: string }>>('resume.upload', payload),
      );

      if (response.error) {
        throw new BadRequestException(`Resume service error: ${response.error}`);
      }

      queued.push({ candidateId, filename: file.originalname, status: 'processing' });
    }

    return { queued };
  }
}
