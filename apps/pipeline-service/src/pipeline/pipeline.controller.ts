import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PipelineService } from './pipeline.service.js';

interface TcpResponse<T> {
  data: T | null;
  error: string | null;
}

@Controller()
export class PipelineController {
  private readonly logger = new Logger(PipelineController.name);

  constructor(private readonly pipelineService: PipelineService) {}

  /**
   * Internal microservice TCP handler for 'pipeline.board'.
   * Returns the formatted Kanban board with candidates grouped by stage.
   */
  @MessagePattern('pipeline.board')
  async handleGetBoard(
    @Payload() payload: { jobId: string; tenantId: string },
  ): Promise<TcpResponse<any>> {
    try {
      const data = await this.pipelineService.getBoard(payload.jobId, payload.tenantId);
      return { data, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error('pipeline.board message handler failed', {
        error: message,
        context: { tenantId: payload.tenantId, jobId: payload.jobId },
      });
      return { data: null, error: message };
    }
  }

  @MessagePattern('pipeline.move')
  async handleMoveStage(
    @Payload()
    payload: {
      jobId: string;
      candidateId: string;
      tenantId: string;
      toStage: string;
      notes: string | null;
      movedBy: string | null;
    },
  ): Promise<TcpResponse<any>> {
    try {
      const data = await this.pipelineService.moveStage(payload);
      return { data, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error('pipeline.move message handler failed', {
        error: message,
        context: {
          tenantId: payload.tenantId,
          jobId: payload.jobId,
          candidateId: payload.candidateId,
        },
      });
      return { data: null, error: message };
    }
  }
}
