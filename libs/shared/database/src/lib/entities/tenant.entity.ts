import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity.js';

@Entity('tenants')
export class Tenant extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 50, default: 'free' })
  plan: string;
}
