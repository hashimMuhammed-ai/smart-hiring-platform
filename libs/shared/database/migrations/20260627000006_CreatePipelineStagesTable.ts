import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePipelineStagesTable20260627000006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE pipeline_stages (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        job_id        UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        candidate_id  UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
        stage         VARCHAR(50)  NOT NULL DEFAULT 'applied',
        notes         TEXT,
        moved_by      UUID REFERENCES users(id),
        moved_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
        UNIQUE (job_id, candidate_id)
      );
      CREATE INDEX idx_pipeline_job       ON pipeline_stages(job_id, stage);
      CREATE INDEX idx_pipeline_candidate ON pipeline_stages(candidate_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS pipeline_stages;`);
  }
}
