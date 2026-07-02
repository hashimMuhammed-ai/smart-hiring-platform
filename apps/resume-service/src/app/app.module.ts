import { Module } from '@nestjs/common';
import { ResumeModule } from '../resume/resume.module.js';

@Module({
  imports: [ResumeModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
