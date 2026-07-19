import { Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module.js';

import { ConfigModule } from '@nestjs/config';

/**
 * Root module for the Notification Service TCP microservice.
 * Feature modules (NotificationModule) will be added in Sprint 5.
 */
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: 'apps/notification-service/.env' }), NotificationModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
