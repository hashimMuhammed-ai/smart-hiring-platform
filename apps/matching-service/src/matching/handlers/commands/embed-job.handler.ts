import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { EmbedJobCommand } from './embed-job.command.js';
import { MatchingLangChainService } from '../../matching-langchain.service.js';
import type { JobEmbedResult } from '../../matching.types.js';

@CommandHandler(EmbedJobCommand)
export class EmbedJobHandler
  implements ICommandHandler<EmbedJobCommand, JobEmbedResult>
{
  private readonly logger = new Logger(EmbedJobHandler.name);

  constructor(
    private readonly matchingLangChainService: MatchingLangChainService,
  ) {}

  async execute(command: EmbedJobCommand): Promise<JobEmbedResult> {
    const { jobId, description, tenantId } = command;
    this.logger.log('Executing EmbedJobCommand', { jobId, tenantId });

    await this.matchingLangChainService.embedJobDescription(
      jobId,
      description,
      tenantId,
    );

    return { jobId };
  }
}
