import { Module } from '@nestjs/common';
import { PipelineController } from './pipeline.controller.js';
import { ClientsConfigModule } from '../clients.module.js';

@Module({
  imports: [ClientsConfigModule],
  controllers: [PipelineController],
})
export class PipelineModule {}
