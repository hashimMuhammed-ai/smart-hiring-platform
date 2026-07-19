import { Injectable, Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { EmbedJobCommand } from './handlers/commands/embed-job.command.js';
import { MatchJobCommand } from './handlers/commands/match-job.command.js';
import type {
  JobEmbedPayload,
  JobEmbedResult,
  JobMatchPayload,
  CandidateMatchResult,
} from './matching.types.js';

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(private readonly commandBus: CommandBus) {}

  /**
   * Dispatches EmbedJobCommand via CommandBus.
   * Conforms to the project standards requiring CQRS for all write operations.
   */
  async embedJob(payload: JobEmbedPayload): Promise<JobEmbedResult> {
    this.logger.log('Dispatching EmbedJobCommand', {
      jobId: payload.jobId,
      tenantId: payload.tenantId,
    });

    return this.commandBus.execute<EmbedJobCommand, JobEmbedResult>(
      new EmbedJobCommand(
        payload.jobId,
        payload.description,
        payload.tenantId,
      ),
    );
  }

  /**
   * Dispatches MatchJobCommand via CommandBus to run similarity search,
   * LLM evaluation scoring, and storing candidate job matches.
   */
  async matchJob(payload: JobMatchPayload): Promise<CandidateMatchResult> {
    this.logger.log('Dispatching MatchJobCommand', {
      jobId: payload.jobId,
      tenantId: payload.tenantId,
    });

    return this.commandBus.execute<MatchJobCommand, CandidateMatchResult>(
      new MatchJobCommand(payload.jobId, payload.tenantId),
    );
  }
}
