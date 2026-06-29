import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../base.entity.js';
import { Tenant } from './tenant.entity.js';
import { Job } from './job.entity.js';

@Entity('candidates')
@Index('idx_candidates_tenant', ['tenantId'])
@Index('idx_candidates_job', ['jobId'])
export class Candidate extends BaseEntity {
  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  @Column({ type: 'uuid', name: 'job_id' })
  jobId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string | null;

  @Column({ type: 'text', name: 'resume_url' })
  resumeUrl: string;

  /**
   * Structured extraction from LangChain — stored as JSONB.
   */
  @Column({ type: 'jsonb', nullable: true, name: 'parsed_data' })
  parsedData: Record<string, unknown> | null;

  /**
   * Resume embedding stored as text representation; actual column is vector(1536) via migration.
   */
  @Column({ type: 'text', nullable: true, name: 'embedding' })
  embedding: string | null;

  @Column({ type: 'varchar', length: 50, name: 'parse_status', default: 'pending' })
  parseStatus: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @ManyToOne(() => Job, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_id' })
  job: Job;
}
