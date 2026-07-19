import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { LANGCHAIN_LLM, LANGCHAIN_EMBEDDINGS } from '@app/shared/langchain';
import { JobRepository } from './job.repository.js';
import { CANDIDATE_SCORING_PROMPT } from './prompts/candidate-scoring.prompt.js';
import {
  CandidateWithSimilarity,
  ScoredCandidate,
  ScoredCandidateArraySchema,
} from './matching.types.js';

@Injectable()
export class MatchingLangChainService implements OnModuleInit {
  private readonly logger = new Logger(MatchingLangChainService.name);
  private scoringChain: any;

  constructor(
    @Inject(LANGCHAIN_EMBEDDINGS) private readonly embeddings: GoogleGenerativeAIEmbeddings,
    @Inject(LANGCHAIN_LLM) private readonly model: ChatGoogleGenerativeAI,
    private readonly jobRepository: JobRepository,
  ) {}

  /**
   * Called once on module init so the models are ready before messages arrive.
   * Chains are constructed once, not per-request, to match standards.
   */
  onModuleInit(): void {
    this.logger.log('MatchingLangChainService initialising — models ready');
    const prompt = ChatPromptTemplate.fromTemplate(CANDIDATE_SCORING_PROMPT);
    const structuredLlm = this.model.withStructuredOutput(
      ScoredCandidateArraySchema,
    );
    this.scoringChain = prompt.pipe(structuredLlm);
  }

  /**
   * Generate an embedding for the supplied job description, then persist it
   * to the `jobs.embedding` column via JobRepository.
   *
   * @param jobId     UUID of the job row to update
   * @param description Full job description text to embed
   * @param tenantId  Tenant scope for the DB update
   */
  async embedJobDescription(
    jobId: string,
    description: string,
    tenantId: string,
  ): Promise<void> {
    this.logger.log('Generating embedding for job', { jobId, tenantId });

    const vector: number[] = await this.embeddings.embedQuery(description);

    // Serialise as a Postgres vector literal, e.g. "[0.1,0.2,...]"
    const embeddingString = `[${vector.join(',')}]`;

    await this.jobRepository.updateEmbedding(jobId, tenantId, embeddingString);

    this.logger.log('Job embedding persisted', {
      jobId,
      tenantId,
      dimensions: vector.length,
    });
  }

  /**
   * Scores an array of candidates against a job description.
   * Leverages ChatOpenAI configured with structured outputs.
   */
  async scoreCandidates(
    jobDescription: string,
    candidates: CandidateWithSimilarity[],
  ): Promise<ScoredCandidate[]> {
    this.logger.log(
      `Scoring ${candidates.length} candidates against job description`,
    );

    if (candidates.length === 0) {
      return [];
    }

    const candidatesData = candidates
      .map((c) => {
        const summary = c.parsedData?.summary ?? 'No summary available';
        const skills = Array.isArray(c.parsedData?.skills)
          ? c.parsedData.skills.join(', ')
          : 'None';
        const exp = c.parsedData?.total_experience_years ?? 'Unknown';
        return `Candidate ID: ${c.id}\nName: ${
          c.name ?? 'Unknown'
        }\nExperience: ${exp} years\nSkills: ${skills}\nSummary: ${summary}\n---`;
      })
      .join('\n');

    try {
      const result = (await this.scoringChain.invoke({
        jobDescription,
        candidatesData,
      })) as ScoredCandidate[];

      this.logger.log(
        `Successfully evaluated scores for ${candidates.length} candidates`,
      );
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Failed to score candidates: ${message}`);
      throw err;
    }
  }
}
