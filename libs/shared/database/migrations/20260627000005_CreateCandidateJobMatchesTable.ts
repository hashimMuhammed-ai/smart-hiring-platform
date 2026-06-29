import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCandidateJobMatchesTable20260627000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE candidate_job_matches (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        job_id        UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        candidate_id  UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
        score         SMALLINT NOT NULL CHECK (score BETWEEN 0 AND 100),
        rationale     TEXT,
        similarity    FLOAT,
        matched_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (job_id, candidate_id)
      );
      CREATE INDEX idx_matches_job    ON candidate_job_matches(job_id, score DESC);
      CREATE INDEX idx_matches_tenant ON candidate_job_matches(tenant_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS candidate_job_matches;`);
  }
}
