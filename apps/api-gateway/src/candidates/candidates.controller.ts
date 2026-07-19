import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { JobsService } from '../jobs/jobs.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/types/auth.types.js';

@Controller('candidates')
export class CandidatesController {
  constructor(private readonly jobsService: JobsService) {}

  @Get(':id')
  async getCandidateById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.jobsService.getCandidateById(id, user.tenantId);
  }
}
