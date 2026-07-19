import { Module } from '@nestjs/common';
import { MatchingModule } from '../matching/matching.module.js';

import { ConfigModule } from '@nestjs/config';

/**
 * Root module for the Matching Service TCP microservice.
 */
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: 'apps/matching-service/.env' }), MatchingModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
