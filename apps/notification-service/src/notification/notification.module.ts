import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { EmailLog, Tenant, Candidate, Job, User, DatabaseModule } from '@app/shared/database';
import { QUEUE_NOTIFICATIONS } from '@app/shared/constants';
import { EmailLogRepository } from './email-log.repository.js';
import { NotificationProcessor } from './processors/notification.processor.js';

import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([EmailLog, Tenant, Candidate, Job, User]),
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
  providers: [EmailLogRepository, NotificationProcessor],
  exports: [EmailLogRepository],
})
export class NotificationModule {}
