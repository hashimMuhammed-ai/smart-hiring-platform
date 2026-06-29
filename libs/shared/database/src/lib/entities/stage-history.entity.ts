import { Entity, Column, ManyToOne, JoinColumn, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';
import { Tenant } from './tenant.entity.js';
import { PipelineStage } from './pipeline-stage.entity.js';
import { User } from './user.entity.js';

/**
 * StageHistory does NOT extend BaseEntity (no updatedAt needed for an audit log).
 * Has its own id, tenantId, and moved_at.
 */
@Entity('stage_history')
export class StageHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  @Column({ type: 'uuid', name: 'pipeline_id' })
  pipelineId: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'from_stage' })
  fromStage: string | null;

  @Column({ type: 'varchar', length: 50, name: 'to_stage' })
  toStage: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'moved_by' })
  movedBy: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'moved_at' })
  movedAt: Date;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @ManyToOne(() => PipelineStage, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pipeline_id' })
  pipeline: PipelineStage;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'moved_by' })
  mover: User | null;
}
