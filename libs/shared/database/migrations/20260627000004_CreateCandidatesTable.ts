import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCandidatesTable20260627000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE candidates (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        job_id        UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        name          VARCHAR(255),
        email         VARCHAR(255),
        phone         VARCHAR(50),
        resume_url    TEXT NOT NULL,
        parsed_data   JSONB,
        embedding     vector(1536),
        parse_status  VARCHAR(50)  NOT NULL DEFAULT 'pending',
        created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
        updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
      );
      CREATE INDEX idx_candidates_tenant    ON candidates(tenant_id);
      CREATE INDEX idx_candidates_job       ON candidates(job_id);
      CREATE INDEX idx_candidates_embedding ON candidates USING hnsw (embedding vector_cosine_ops);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS candidates;`);
  }
}
