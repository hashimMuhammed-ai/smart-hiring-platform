import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  ParseUUIDPipe,
  Inject,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { MoveStageDto } from '@app/shared/dto';
import { PIPELINE_SERVICE } from '../clients.module.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/types/auth.types.js';

interface TcpResponse<T> {
  data: T | null;
  error: string | null;
}

@Controller()
export class PipelineController {
  constructor(
    @Inject(PIPELINE_SERVICE) private readonly pipelineClient: ClientProxy,
  ) {}

  /**
   * GET /api/jobs/:jobId/pipeline
   * Returns candidates grouped by their active pipeline stages.
   */
  @Get('jobs/:jobId/pipeline')
  async getPipelineBoard(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<any> {
    const payload = {
      jobId,
      tenantId: user.tenantId,
    };

    const response = await firstValueFrom(
      this.pipelineClient.send<TcpResponse<any>>('pipeline.board', payload),
    );

    if (response.error) {
      if (response.error.toLowerCase().includes('not found')) {
        throw new NotFoundException(response.error);
      }
      throw new BadRequestException(response.error);
    }

    return response.data;
  }

  /**
   * PATCH /api/pipeline/:candidateId/stage
   * Transitions a candidate to the next hiring stage.
   */
  @Patch('pipeline/:candidateId/stage')
  async moveCandidateStage(
    @Param('candidateId', ParseUUIDPipe) candidateId: string,
    @Body() body: MoveStageDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<any> {
    const payload = {
      candidateId,
      jobId: body.jobId,
      toStage: body.toStage,
      notes: body.notes ?? null,
      tenantId: user.tenantId,
      movedBy: user.userId,
    };

    const response = await firstValueFrom(
      this.pipelineClient.send<TcpResponse<any>>('pipeline.move', payload),
    );

    if (response.error) {
      throw new BadRequestException(response.error);
    }

    return response.data;
  }
}
