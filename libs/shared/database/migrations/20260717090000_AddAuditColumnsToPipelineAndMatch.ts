import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuditColumnsToPipelineAndMatch20260717090000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE pipeline_stages 
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

      ALTER TABLE candidate_job_matches 
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE pipeline_stages 
      DROP COLUMN IF EXISTS created_at,
      DROP COLUMN IF EXISTS updated_at;

      ALTER TABLE candidate_job_matches 
      DROP COLUMN IF EXISTS created_at,
      DROP COLUMN IF EXISTS updated_at;
    `);
  }
}
