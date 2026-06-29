import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateJobsTable20260627000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE jobs (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        created_by  UUID NOT NULL REFERENCES users(id),
        title       VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        embedding   vector(1536),
        status      VARCHAR(50)  NOT NULL DEFAULT 'open',
        created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
        updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
      );
      CREATE INDEX idx_jobs_tenant    ON jobs(tenant_id);
      CREATE INDEX idx_jobs_embedding ON jobs USING hnsw (embedding vector_cosine_ops);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS jobs;`);
  }
}
