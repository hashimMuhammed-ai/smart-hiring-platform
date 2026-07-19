import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository, EmailLog } from '@app/shared/database';

@Injectable()
export class EmailLogRepository extends BaseRepository<EmailLog> {
  constructor(
    @InjectRepository(EmailLog)
    private readonly emailLogRepo: Repository<EmailLog>,
  ) {
    super(emailLogRepo);
  }

  /**
   * Insert a new record into the email_logs table to keep an audit trail
   * of notification emails sent to candidates.
   */
  async createLog(payload: {
    tenantId: string;
    candidateId: string | null;
    template: string;
    recipient: string;
    status: 'sent' | 'failed';
    error?: string | null;
  }): Promise<EmailLog> {
    const log = this.emailLogRepo.create({
      tenantId: payload.tenantId,
      candidateId: payload.candidateId,
      template: payload.template,
      recipient: payload.recipient,
      status: payload.status,
      error: payload.error ?? null,
    });
    return this.emailLogRepo.save(log);
  }
}
