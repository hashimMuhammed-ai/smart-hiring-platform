import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JobsService } from './jobs.service.js';
import { CreateJobDto } from '@app/shared/dto';
import { UpdateJobDto } from '@app/shared/dto';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/types/auth.types.js';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createJob(
    @Body() dto: CreateJobDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.jobsService.createJob(dto, user);
  }

  @Get()
  async getJobs(@CurrentUser() user: AuthenticatedUser) {
    return this.jobsService.getJobs(user.tenantId);
  }

  @Get(':id')
  async getJobById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.jobsService.getJobById(id, user.tenantId);
  }

  @Patch(':id')
  async updateJob(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateJobDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.jobsService.updateJob(id, user.tenantId, dto);
  }

  @Get(':jobId/candidates')
  async getCandidates(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.jobsService.getCandidatesForJob(jobId, user.tenantId);
  }

  @Post(':id/match')
  @HttpCode(HttpStatus.OK)
  async runMatch(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.jobsService.runMatch(id, user);
  }

  @Delete(':id')
  async deleteJob(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.jobsService.deleteJob(id, user.tenantId);
  }
}
