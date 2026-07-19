import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import * as nodemailer from 'nodemailer';
import { QUEUE_NOTIFICATIONS } from '@app/shared/constants';
import { EmailLogRepository } from '../email-log.repository.js';

interface NotificationJobPayload {
  tenantId: string;
  candidateId: string;
  candidateEmail: string;
  candidateName: string;
  jobTitle: string;
  toStage: string;
  fromStage: string;
}

@Processor(QUEUE_NOTIFICATIONS)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly emailLogRepository: EmailLogRepository) {
    super();

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost) {
      this.logger.log(`Initializing SMTP email transport: ${smtpHost}:${smtpPort}`);
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
    } else {
      this.logger.warn('SMTP_HOST is not defined. Email dispatch falling back to log-only JSON transport.');
      this.transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
    }
  }

  async process(job: Job<NotificationJobPayload, any, string>): Promise<void> {
    const { tenantId, candidateId, candidateEmail, candidateName, jobTitle, toStage } = job.data;

    this.logger.log(`[Job ${job.id}] Processing notification for candidate ${candidateId} moving to stage ${toStage}`, {
      candidateEmail,
      jobTitle,
    });

    if (!candidateEmail || !candidateEmail.trim()) {
      this.logger.warn(`[Job ${job.id}] Candidate ${candidateId} has no recipient email address. Skipping email dispatch.`);
      await this.emailLogRepository.createLog({
        tenantId,
        candidateId,
        template: toStage,
        recipient: candidateEmail || 'N/A',
        status: 'failed',
        error: 'Missing recipient email address',
      });
      return;
    }

    const emailFrom = process.env.EMAIL_FROM || 'outboundcalling213@gmail.com';
    const emailDetails = this.getEmailDetails(candidateName, jobTitle, toStage);
    const brevoApiKey = process.env.BREVO_API_KEY;

    try {
      let messageId = 'N/A';
      let responseDetails = 'N/A';

      if (brevoApiKey && brevoApiKey.trim()) {
        this.logger.log(`[Job ${job.id}] Dispatching email via Brevo HTTP API (Port 443)...`);
        const brevoRes = await this.sendViaBrevoApi(
          brevoApiKey.trim(),
          emailFrom,
          candidateEmail,
          candidateName,
          emailDetails.subject,
          emailDetails.text,
        );
        messageId = brevoRes.messageId;
        responseDetails = brevoRes.response;
      } else {
        // 1. Send the email via Nodemailer SMTP
        const info = await this.transporter.sendMail({
          from: emailFrom,
          to: candidateEmail,
          subject: emailDetails.subject,
          text: emailDetails.text,
        });
        messageId = info.messageId || 'N/A';
        responseDetails = info.response || JSON.stringify(info);
      }

      // 2. Log success to database
      await this.emailLogRepository.createLog({
        tenantId,
        candidateId,
        template: toStage,
        recipient: candidateEmail,
        status: 'sent',
      });

      this.logger.log(`[Job ${job.id}] Successfully sent email notification to ${candidateEmail}. Response: ${responseDetails}, MessageID: ${messageId}`);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error during email dispatch';
      this.logger.error(`[Job ${job.id}] Failed to send email to ${candidateEmail}: ${errMsg}`, err);

      // Log failure to database
      try {
        await this.emailLogRepository.createLog({
          tenantId,
          candidateId,
          template: toStage,
          recipient: candidateEmail,
          status: 'failed',
          error: errMsg,
        });
      } catch (dbErr: unknown) {
        const dbMsg = dbErr instanceof Error ? dbErr.message : 'Unknown DB error';
        this.logger.error(`[Job ${job.id}] Secondary failure: Could not save failed email log to database: ${dbMsg}`);
      }

      // Rethrow to let BullMQ retry or move to dead letter queue
      throw err;
    }
  }

  private async sendViaBrevoApi(
    apiKey: string,
    emailFrom: string,
    candidateEmail: string,
    candidateName: string,
    subject: string,
    text: string,
  ): Promise<{ messageId: string; response: string }> {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'Smart Hiring', email: emailFrom },
        to: [{ email: candidateEmail, name: candidateName || 'Candidate' }],
        subject,
        textContent: text,
      }),
    });

    const data = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      const errorMsg = typeof data['message'] === 'string' ? data['message'] : `HTTP ${res.status}`;
      throw new Error(`Brevo HTTP API error: ${errorMsg}`);
    }

    return {
      messageId: typeof data['messageId'] === 'string' ? data['messageId'] : 'N/A',
      response: `HTTP ${res.status} OK`,
    };
  }

  private getEmailDetails(candidateName: string, jobTitle: string, stage: string) {
    switch (stage) {
      case 'screening':
        return {
          subject: `Application Update: ${jobTitle}`,
          text: `Hi ${candidateName},\n\nYour application for the position of "${jobTitle}" is under review.\n\nBest regards,\nRecruitment Team`,
        };
      case 'interview':
        return {
          subject: `Interview Invitation: ${jobTitle}`,
          text: `Hi ${candidateName},\n\nYou've been selected for an interview for the position of "${jobTitle}". We will contact you soon with more details.\n\nBest regards,\nRecruitment Team`,
        };
      case 'offer':
        return {
          subject: `Job Offer: ${jobTitle}`,
          text: `Hi ${candidateName},\n\nWe have an offer for you for the position of "${jobTitle}". Please review the attached details.\n\nBest regards,\nRecruitment Team`,
        };
      case 'hired':
        return {
          subject: `Welcome to the team!: ${jobTitle}`,
          text: `Hi ${candidateName},\n\nWelcome to the team! We are thrilled to have you join us for the position of "${jobTitle}".\n\nBest regards,\nRecruitment Team`,
        };
      case 'rejected':
        return {
          subject: `Application Update: ${jobTitle}`,
          text: `Hi ${candidateName},\n\nThank you for your interest in the "${jobTitle}" position. Unfortunately, we will not be moving forward with your application at this time. We wish you the best in your search.\n\nBest regards,\nRecruitment Team`,
        };
      default:
        return {
          subject: `Application Status Update: ${jobTitle}`,
          text: `Hi ${candidateName},\n\nYour application status for "${jobTitle}" has been updated to: ${stage}.\n\nBest regards,\nRecruitment Team`,
        };
    }
  }
}
