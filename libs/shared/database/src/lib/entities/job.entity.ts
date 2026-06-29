import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../base.entity.js';
import { Tenant } from './tenant.entity.js';
import { User } from './user.entity.js';

@Entity('jobs')
@Index('idx_jobs_tenant', ['tenantId'])
export class Job extends BaseEntity {
  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  @Column({ type: 'uuid', name: 'created_by' })
  createdBy: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  /**
   * The job description embedding stored as a real[] array (pgvector vector(1536)).
   * TypeORM does not have a native vector type; we use 'simple-array' at TS level
   * but the actual column is created with type `vector(1536)` via raw migration SQL.
   */
  @Column({ type: 'text', nullable: true, name: 'embedding' })
  embedding: string | null;

  @Column({ type: 'varchar', length: 50, default: 'open' })
  status: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;
}
