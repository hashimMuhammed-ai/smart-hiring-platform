import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job, Candidate, PipelineStage, DatabaseModule } from '@app/shared/database';
import { JobsController } from './jobs.controller.js';
import { CandidatesController } from '../candidates/candidates.controller.js';
import { JobsService } from './jobs.service.js';
import { ClientsConfigModule } from '../clients.module.js';

@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([Job, Candidate, PipelineStage]),
    ClientsConfigModule,
  ],
  controllers: [JobsController, CandidatesController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
