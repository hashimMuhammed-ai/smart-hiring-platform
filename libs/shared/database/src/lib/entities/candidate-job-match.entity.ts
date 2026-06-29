import { Entity, Column, ManyToOne, JoinColumn, Index, Unique } from 'typeorm';
import { BaseEntity } from '../base.entity.js';
import { Tenant } from './tenant.entity.js';
import { Job } from './job.entity.js';
import { Candidate } from './candidate.entity.js';

@Entity('candidate_job_matches')
@Unique(['jobId', 'candidateId'])
@Index('idx_matches_job', ['jobId'])
@Index('idx_matches_tenant', ['tenantId'])
export class CandidateJobMatch extends BaseEntity {
  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  @Column({ type: 'uuid', name: 'job_id' })
  jobId: string;

  @Column({ type: 'uuid', name: 'candidate_id' })
  candidateId: string;

  @Column({ type: 'smallint' })
  score: number;

  @Column({ type: 'text', nullable: true })
  rationale: string | null;

  @Column({ type: 'float', nullable: true })
  similarity: number | null;

  @Column({ type: 'timestamptz', name: 'matched_at', default: () => 'now()' })
  matchedAt: Date;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @ManyToOne(() => Job, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_id' })
  job: Job;

  @ManyToOne(() => Candidate, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'candidate_id' })
  candidate: Candidate;
}
