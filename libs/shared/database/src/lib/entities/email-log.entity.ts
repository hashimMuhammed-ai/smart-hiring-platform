import { Entity, Column, ManyToOne, JoinColumn, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';
import { Tenant } from './tenant.entity.js';
import { Candidate } from './candidate.entity.js';

/**
 * EmailLog does NOT extend BaseEntity (no updatedAt needed for an email audit record).
 */
@Entity('email_logs')
export class EmailLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  @Column({ type: 'uuid', nullable: true, name: 'candidate_id' })
  candidateId: string | null;

  @Column({ type: 'varchar', length: 100 })
  template: string;

  @Column({ type: 'varchar', length: 255 })
  recipient: string;

  @Column({ type: 'varchar', length: 50, default: 'sent' })
  status: string;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'sent_at' })
  sentAt: Date;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @ManyToOne(() => Candidate, { nullable: true })
  @JoinColumn({ name: 'candidate_id' })
  candidate: Candidate | null;
}
