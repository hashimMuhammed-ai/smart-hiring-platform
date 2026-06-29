import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEmailLogsTable20260627000008 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE email_logs (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        candidate_id  UUID REFERENCES candidates(id),
        template      VARCHAR(100) NOT NULL,
        recipient     VARCHAR(255) NOT NULL,
        status        VARCHAR(50)  NOT NULL DEFAULT 'sent',
        error         TEXT,
        sent_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS email_logs;`);
  }
}
