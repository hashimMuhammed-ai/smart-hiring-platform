import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Candidate, Tenant, Job, User, DatabaseModule } from '@app/shared/database';
import { QUEUE_RESUME_PARSE } from '@app/shared/constants';
import { LangChainModule } from '@app/shared/langchain';
import { CandidateRepository } from './candidate.repository.js';
import { ResumeService } from './resume.service.js';
import { ResumeController } from './resume.controller.js';
import { ResumeParseQueue } from './resume-parse.queue.js';
import { ResumeLangChainService } from './resume-langchain.service.js';
import { ResumeParseProcessor } from '../processors/resume-parse.processor.js';
import { R2Module } from '../r2/r2.module.js';

import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([Candidate, Tenant, Job, User]),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
        const url = new URL(redisUrl);
        const connection: any = {
          host: url.hostname,
          port: url.port ? parseInt(url.port, 10) : 6379,
          db: url.pathname ? parseInt(url.pathname.replace('/', ''), 10) || 0 : 0,
        };

        if (url.username) {
          connection.username = decodeURIComponent(url.username);
        }
        if (url.password) {
          connection.password = decodeURIComponent(url.password);
        }
        if (url.protocol === 'rediss:') {
          connection.tls = {};
        }
        return {
          connection,
        };
      },
    }),
    BullModule.registerQueue({
      name: QUEUE_RESUME_PARSE,
    }),
    R2Module,
    LangChainModule,
  ],
  controllers: [ResumeController],
  providers: [
    CandidateRepository,
    ResumeService,
    ResumeParseQueue,
    ResumeLangChainService,
    ResumeParseProcessor,
  ],
  exports: [
    CandidateRepository,
    ResumeService,
    ResumeParseQueue,
    ResumeLangChainService,
    ResumeParseProcessor,
  ],
})
export class ResumeModule {}
