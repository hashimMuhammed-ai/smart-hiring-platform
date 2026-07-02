import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job, DatabaseModule } from '@app/shared/database';
import { LangChainModule } from '@app/shared/langchain';
import { JobRepository } from './job.repository.js';
import { MatchingService } from './matching.service.js';
import { MatchingController } from './matching.controller.js';
import { MatchingLangChainService } from './matching-langchain.service.js';

@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([Job]),
    LangChainModule,
  ],
  controllers: [MatchingController],
  providers: [
    JobRepository,
    MatchingService,
    MatchingLangChainService,
  ],
  exports: [MatchingService, JobRepository],
})
export class MatchingModule {}
