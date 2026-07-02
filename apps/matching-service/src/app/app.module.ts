import { Module } from '@nestjs/common';
import { MatchingModule } from '../matching/matching.module.js';

/**
 * Root module for the Matching Service TCP microservice.
 */
@Module({
  imports: [MatchingModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
