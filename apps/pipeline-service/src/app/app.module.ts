import { Module } from '@nestjs/common';
import { PipelineModule } from '../pipeline/pipeline.module.js';

import { ConfigModule } from '@nestjs/config';

/**
 * Root module for the Pipeline Service TCP microservice.
 * Feature modules (PipelineModule) will be added in Sprint 4.
 */
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: 'apps/pipeline-service/.env' }), PipelineModule],
  controllers: [],
  providers: [],
})
export class AppModule {}

