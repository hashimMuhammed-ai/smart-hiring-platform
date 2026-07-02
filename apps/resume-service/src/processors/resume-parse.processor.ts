import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_RESUME_PARSE } from '@app/shared/constants';
import { OpenAIEmbeddings } from '@app/shared/langchain';
import { ResumeLangChainService } from '../resume/resume-langchain.service.js';
import { CandidateRepository } from '../resume/candidate.repository.js';

@Processor(QUEUE_RESUME_PARSE)
export class ResumeParseProcessor extends WorkerHost {
  private readonly logger = new Logger(ResumeParseProcessor.name);

  constructor(
    private readonly resumeLangChainService: ResumeLangChainService,
    private readonly openaiEmbeddings: OpenAIEmbeddings,
    private readonly candidateRepository: CandidateRepository,
  ) {
    super();
  }

  /**
   * Processes a resume parse job:
   * 1. Downloads and extracts candidate JSON from PDF using ResumeLangChainService.
   * 2. Generates embedding vector for candidate matching description.
   * 3. Saves candidate information and vector back to the database.
   * 4. Rethrows error on failure to activate BullMQ's retry mechanism.
   */
  async process(job: Job<any, any, string>): Promise<void> {
    const { tenantId, jobId, candidateId, r2Key } = job.data;

    this.logger.log(`[Job ${job.id}] Starting resume parse processing`, {
      candidateId,
      tenantId,
      jobId,
      r2Key,
    });

    try {
      // 1. Extract structured data using LangChain & LLM
      const parsedData = await this.resumeLangChainService.extractFromPdf(r2Key);

      // 2. Generate embedding for candidate based on summary & skills
      const summary = parsedData.summary || '';
      const skills = parsedData.skills ? parsedData.skills.join(' ') : '';
      const textToEmbed = `${summary} ${skills}`.trim() || 'resume';

      this.logger.log(`[Job ${job.id}] Generating embeddings for candidate ${candidateId}`);
      const embeddingArray = await this.openaiEmbeddings.embedQuery(textToEmbed);

      // Convert array of numbers into pgvector string representation: "[0.123, -0.456, ...]"
      const embeddingString = `[${embeddingArray.join(',')}]`;

      // 3. Update database candidate entity
      this.logger.log(`[Job ${job.id}] Saving parsed details & embeddings to database`);
      await this.candidateRepository.updateWithParsedData(
        candidateId,
        tenantId,
        parsedData,
        embeddingString,
      );

      this.logger.log(`[Job ${job.id}] Successfully completed resume parse processing for candidate ${candidateId}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`[Job ${job.id}] Failed to process resume parse job for candidate ${candidateId}: ${message}`, {
        error: err,
        candidateId,
        tenantId,
      });

      // Mark candidate row as failed in the database
      try {
        await this.candidateRepository.markFailed(candidateId, tenantId);
      } catch (dbErr: unknown) {
        const dbMsg = dbErr instanceof Error ? dbErr.message : 'Unknown DB error';
        this.logger.error(`[Job ${job.id}] Secondary failure: Could not mark candidate as failed in DB: ${dbMsg}`);
      }

      // Rethrow to trigger BullMQ retry / backoff logic
      throw err;
    }
  }
}
