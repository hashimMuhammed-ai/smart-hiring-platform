import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStageHistoryTable20260627000007 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE stage_history (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        pipeline_id UUID NOT NULL REFERENCES pipeline_stages(id) ON DELETE CASCADE,
        from_stage  VARCHAR(50),
        to_stage    VARCHAR(50) NOT NULL,
        notes       TEXT,
        moved_by    UUID REFERENCES users(id),
        moved_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS stage_history;`);
  }
}
