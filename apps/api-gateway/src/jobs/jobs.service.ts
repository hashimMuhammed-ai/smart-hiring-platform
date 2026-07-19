import { Injectable, NotFoundException, Inject, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { Job, Candidate } from '@app/shared/database';
import { MATCHING_SERVICE } from '../clients.module.js';
import { CreateJobDto } from '@app/shared/dto';
import { UpdateJobDto } from '@app/shared/dto';
import type { AuthenticatedUser } from '../common/types/auth.types.js';

interface TcpResponse<T> {
  data: T | null;
  error: string | null;
}

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    @InjectRepository(Candidate)
    private readonly candidateRepo: Repository<Candidate>,
    @Inject(MATCHING_SERVICE)
    private readonly matchingClient: ClientProxy,
  ) {}

  /**
   * Create a new job and trigger job embedding (async).
   */
  async createJob(dto: CreateJobDto, user: AuthenticatedUser) {
    const job = this.jobRepo.create({
      tenantId: user.tenantId,
      createdBy: user.userId,
      title: dto.title,
      description: dto.description,
      status: 'open',
    });

    const savedJob = await this.jobRepo.save(job);

    // Emit job.embed internal event to Matching Service (fire-and-forget)
    this.matchingClient.emit('job.embed', {
      tenantId: user.tenantId,
      jobId: savedJob.id,
      description: savedJob.description,
    });

    return {
      id: savedJob.id,
      title: savedJob.title,
      status: savedJob.status,
      embeddingStatus: 'processing',
    };
  }

  /**
   * Get all open jobs for the tenant, with candidate count.
   */
  async getJobs(tenantId: string) {
    const jobs = await this.jobRepo.createQueryBuilder('job')
      .leftJoin('candidates', 'candidate', 'candidate.job_id = job.id')
      .select([
        'job.id AS id',
        'job.title AS title',
        'job.description AS description',
        'job.status AS status',
        'job.createdAt AS "createdAt"',
      ])
      .addSelect('COUNT(candidate.id)', 'candidateCount')
      .where('job.tenantId = :tenantId', { tenantId })
      .groupBy('job.id')
      .orderBy('job.createdAt', 'DESC')
      .getRawMany();

    const mapped = jobs.map((j) => ({
      id: j.id,
      title: j.title,
      description: j.description,
      status: j.status,
      candidateCount: parseInt(j.candidateCount, 10),
      createdAt: j.createdAt,
    }));

    return {
      data: mapped,
      total: mapped.length,
    };
  }

  /**
   * Get a single job by ID, including candidate counts and stage breakdown.
   */
  async getJobById(jobId: string, tenantId: string) {
    const job = await this.jobRepo.findOne({ where: { id: jobId, tenantId } });
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    // Run stage counts aggregation
    const countsQuery = await this.candidateRepo.manager.query(
      `
      SELECT
        COALESCE(ps.stage, 'applied') AS stage,
        COUNT(c.id) AS count
      FROM candidates c
      LEFT JOIN pipeline_stages ps ON ps.candidate_id = c.id AND ps.job_id = c.job_id
      WHERE c.job_id = $1 AND c.tenant_id = $2
      GROUP BY stage
      `,
      [jobId, tenantId],
    );

    const breakdown: Record<string, number> = {
      applied: 0,
      screening: 0,
      interview: 0,
      offer: 0,
      hired: 0,
      rejected: 0,
    };

    let totalCandidates = 0;
    for (const row of countsQuery) {
      const count = parseInt(row.count, 10);
      if (breakdown[row.stage] !== undefined) {
        breakdown[row.stage] = count;
      }
      totalCandidates += count;
    }

    return {
      id: job.id,
      title: job.title,
      description: job.description,
      status: job.status,
      createdAt: job.createdAt,
      candidateCount: totalCandidates,
      stageBreakdown: breakdown,
    };
  }

  /**
   * Update details of a job.
   */
  async updateJob(jobId: string, tenantId: string, dto: UpdateJobDto) {
    const job = await this.jobRepo.findOne({ where: { id: jobId, tenantId } });
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (dto.title !== undefined) job.title = dto.title;
    if (dto.description !== undefined) job.description = dto.description;
    if (dto.status !== undefined) job.status = dto.status;

    return this.jobRepo.save(job);
  }

  /**
   * Soft-delete a job (sets status to 'closed').
   */
  async deleteJob(jobId: string, tenantId: string) {
    const job = await this.jobRepo.findOne({ where: { id: jobId, tenantId } });
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    job.status = 'closed';
    await this.jobRepo.save(job);

    return { success: true };
  }

  /**
   * Get all candidates for a job.
   */
  async getCandidatesForJob(jobId: string, tenantId: string) {
    const candidates = await this.candidateRepo.createQueryBuilder('c')
      .leftJoin('candidate_job_matches', 'cjm', 'cjm.candidate_id = c.id AND cjm.job_id = c.job_id')
      .leftJoin('pipeline_stages', 'ps', 'ps.candidate_id = c.id AND ps.job_id = c.job_id')
      .select([
        'c.id AS id',
        'c.name AS name',
        'c.email AS email',
        'c.parse_status AS "parseStatus"',
        'cjm.score AS "matchScore"',
        'ps.stage AS stage',
        'c.parsed_data AS "parsedData"',
      ])
      .where('c.job_id = :jobId', { jobId })
      .andWhere('c.tenant_id = :tenantId', { tenantId })
      .getRawMany();

    const mapped = candidates.map((c) => {
      const parsedData = c.parsedData || {};
      const skills = Array.isArray(parsedData.skills) ? parsedData.skills : [];
      const expYears = typeof parsedData.total_experience_years === 'number'
        ? parsedData.total_experience_years
        : null;

      return {
        id: c.id,
        name: c.name ?? '',
        email: c.email ?? '',
        parseStatus: c.parseStatus,
        matchScore: c.matchScore !== null ? parseInt(c.matchScore, 10) : null,
        stage: c.stage ?? 'applied',
        skills,
        experienceYears: expYears,
      };
    });

    return {
      data: mapped,
    };
  }

  /**
   * Get a single candidate by ID.
   */
  async getCandidateById(candidateId: string, tenantId: string) {
    const candidate = await this.candidateRepo.createQueryBuilder('c')
      .leftJoin('candidate_job_matches', 'cjm', 'cjm.candidate_id = c.id AND cjm.job_id = c.job_id')
      .leftJoin('pipeline_stages', 'ps', 'ps.candidate_id = c.id AND ps.job_id = c.job_id')
      .select([
        'c.id AS id',
        'c.name AS name',
        'c.email AS email',
        'c.parse_status AS "parseStatus"',
        'cjm.score AS "matchScore"',
        'cjm.rationale AS "matchRationale"',
        'ps.stage AS stage',
        'c.parsed_data AS "parsedData"',
      ])
      .where('c.id = :candidateId', { candidateId })
      .andWhere('c.tenant_id = :tenantId', { tenantId })
      .getRawOne();

    if (!candidate) {
      throw new NotFoundException('Candidate not found');
    }

    const parsedData = candidate.parsedData || {};
    const skills = Array.isArray(parsedData.skills) ? parsedData.skills : [];
    const expYears = typeof parsedData.total_experience_years === 'number'
      ? parsedData.total_experience_years
      : null;

    // Fetch stage history
    const stageHistory = await this.candidateRepo.manager.query(
      `
      SELECT
        sh.to_stage AS stage,
        sh.notes AS notes,
        sh.moved_at AS "movedAt"
      FROM stage_history sh
      JOIN pipeline_stages ps ON ps.id = sh.pipeline_id
      WHERE ps.candidate_id = $1 AND sh.tenant_id = $2
      ORDER BY sh.moved_at DESC
      `,
      [candidateId, tenantId],
    );

    return {
      id: candidate.id,
      name: candidate.name ?? '',
      email: candidate.email ?? '',
      parseStatus: candidate.parseStatus,
      matchScore: candidate.matchScore !== null ? parseInt(candidate.matchScore, 10) : null,
      matchRationale: candidate.matchRationale ?? null,
      stage: candidate.stage ?? 'applied',
      skills,
      experienceYears: expYears,
      parsedData,
      stageHistory: stageHistory.map((h: any) => ({
        stage: h.stage,
        notes: h.notes,
        movedAt: h.movedAt,
      })),
    };
  }

  /**
   * Run candidate matching for a job using the Matching Service via TCP.
   */
  async runMatch(jobId: string, user: AuthenticatedUser) {
    const job = await this.jobRepo.findOne({ where: { id: jobId, tenantId: user.tenantId } });
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    const payload = {
      jobId,
      tenantId: user.tenantId,
    };

    const response = await firstValueFrom(
      this.matchingClient.send<TcpResponse<any>>('job.match', payload),
    );

    if (response.error) {
      throw new BadRequestException(response.error);
    }

    return response.data;
  }
}
