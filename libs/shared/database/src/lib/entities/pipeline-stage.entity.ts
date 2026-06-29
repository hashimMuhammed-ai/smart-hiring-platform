import { Entity, Column, ManyToOne, JoinColumn, Index, Unique } from 'typeorm';
import { BaseEntity } from '../base.entity.js';
import { Tenant } from './tenant.entity.js';
import { Job } from './job.entity.js';
import { Candidate } from './candidate.entity.js';
import { User } from './user.entity.js';

@Entity('pipeline_stages')
@Unique(['jobId', 'candidateId'])
@Index('idx_pipeline_job', ['jobId', 'stage'])
@Index('idx_pipeline_candidate', ['candidateId'])
export class PipelineStage extends BaseEntity {
  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  @Column({ type: 'uuid', name: 'job_id' })
  jobId: string;

  @Column({ type: 'uuid', name: 'candidate_id' })
  candidateId: string;

  @Column({ type: 'varchar', length: 50, default: 'applied' })
  stage: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'moved_by' })
  movedBy: string | null;

  @Column({ type: 'timestamptz', name: 'moved_at', default: () => 'now()' })
  movedAt: Date;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @ManyToOne(() => Job, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_id' })
  job: Job;

  @ManyToOne(() => Candidate, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'candidate_id' })
  candidate: Candidate;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'moved_by' })
  mover: User | null;
}
