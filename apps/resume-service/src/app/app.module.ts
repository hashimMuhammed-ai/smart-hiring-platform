import { Module } from '@nestjs/common';
import { ResumeModule } from '../resume/resume.module.js';

import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: 'apps/resume-service/.env' }), ResumeModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
