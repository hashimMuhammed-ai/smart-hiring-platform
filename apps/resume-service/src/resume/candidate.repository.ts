import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository, Candidate } from '@app/shared/database';

export interface CreatePendingPayload {
  id: string;
  tenantId: string;
  jobId: string;
  resumeUrl: string;
}

export interface ParsedResumeData {
  name: string | null;
  email: string | null;
  phone: string | null;
  summary: string | null;
  skills: string[];
  experience: Array<{
    company: string;
    role: string;
    years: number;
    description: string;
  }>;
  education: Array<{
    institution: string;
    degree: string;
    year: number;
  }>;
  total_experience_years: number;
}

@Injectable()
export class CandidateRepository extends BaseRepository<Candidate> {
  constructor(
    @InjectRepository(Candidate)
    private readonly candidateRepo: Repository<Candidate>,
  ) {
    super(candidateRepo);
  }

  /**
   * Insert a new candidate row in 'pending' status.
   * Called immediately when a resume.upload message arrives,
   * before any parsing starts.
   */
  async createPending(payload: CreatePendingPayload): Promise<Candidate> {
    const candidate = this.candidateRepo.create({
      id: payload.id,
      tenantId: payload.tenantId,
      jobId: payload.jobId,
      resumeUrl: payload.resumeUrl,
      parseStatus: 'pending',
      name: null,
      email: null,
      phone: null,
      parsedData: null,
      embedding: null,
    });
    return this.candidateRepo.save(candidate);
  }

  /**
   * Set structured parsed data + embedding vector string and mark status 'done'.
   * Scoped by both id and tenantId to enforce multi-tenancy.
   */
  async updateWithParsedData(
    id: string,
    tenantId: string,
    parsedData: ParsedResumeData,
    embedding: string,
  ): Promise<void> {
    await this.candidateRepo.update(
      { id, tenantId },
      {
        name: parsedData.name,
        email: parsedData.email,
        phone: parsedData.phone,
        parsedData: parsedData as unknown as Record<string, unknown>,
        embedding,
        parseStatus: 'done',
      },
    );
  }

  /**
   * Mark candidate parse as failed.
   * Scoped by both id and tenantId to enforce multi-tenancy.
   */
  async markFailed(id: string, tenantId: string): Promise<void> {
    await this.candidateRepo.update(
      { id, tenantId },
      { parseStatus: 'failed' },
    );
  }
}
