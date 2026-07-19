import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { BullModule } from '@nestjs/bullmq';
import {
  PipelineStage,
  StageHistory,
  Candidate,
  Job,
  Tenant,
  User,
  DatabaseModule,
} from '@app/shared/database';
import { QUEUE_NOTIFICATIONS } from '@app/shared/constants';
import { PipelineRepository } from './pipeline.repository.js';
import { StageHistoryRepository } from './stage-history.repository.js';
import { PipelineService } from './pipeline.service.js';
import { PipelineController } from './pipeline.controller.js';
import { GetBoardHandler } from './handlers/queries/get-board.handler.js';
import { MoveStageHandler } from './handlers/commands/move-stage.handler.js';

import { ConfigModule, ConfigService } from '@nestjs/config';

const QueryHandlers = [GetBoardHandler];
const CommandHandlers = [MoveStageHandler];

@Module({
  imports: [
    CqrsModule,
    DatabaseModule,
    TypeOrmModule.forFeature([PipelineStage, StageHistory, Candidate, Job, Tenant, User]),
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
      name: QUEUE_NOTIFICATIONS,
    }),
  ],
  controllers: [PipelineController],
  providers: [
    PipelineRepository,
    StageHistoryRepository,
    PipelineService,
    ...QueryHandlers,
    ...CommandHandlers,
  ],
  exports: [PipelineRepository, StageHistoryRepository, PipelineService],
})
export class PipelineModule {}
