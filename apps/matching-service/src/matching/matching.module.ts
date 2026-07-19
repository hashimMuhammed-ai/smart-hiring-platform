import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import {
  Job,
  Candidate,
  CandidateJobMatch,
  Tenant,
  User,
  DatabaseModule,
} from '@app/shared/database';
import { LangChainModule } from '@app/shared/langchain';
import { JobRepository } from './job.repository.js';
import { VectorSearchRepository } from './vector-search.repository.js';
import { CandidateJobMatchRepository } from './candidate-job-match.repository.js';
import { MatchingService } from './matching.service.js';
import { MatchingController } from './matching.controller.js';
import { MatchingLangChainService } from './matching-langchain.service.js';
import { EmbedJobHandler } from './handlers/commands/embed-job.handler.js';
import { MatchJobHandler } from './handlers/commands/match-job.handler.js';

const CommandHandlers = [EmbedJobHandler, MatchJobHandler];

@Module({
  imports: [
    CqrsModule,
    DatabaseModule,
    TypeOrmModule.forFeature([Job, Candidate, CandidateJobMatch, Tenant, User]),
    LangChainModule,
  ],
  controllers: [MatchingController],
  providers: [
    JobRepository,
    VectorSearchRepository,
    CandidateJobMatchRepository,
    MatchingService,
    MatchingLangChainService,
    ...CommandHandlers,
  ],
  exports: [
    MatchingService,
    JobRepository,
    VectorSearchRepository,
    CandidateJobMatchRepository,
  ],
})
export class MatchingModule {}
