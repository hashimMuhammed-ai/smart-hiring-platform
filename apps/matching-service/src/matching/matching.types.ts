import { z } from 'zod';

/**
 * Types for the Matching Service TCP message handlers.
 */

/**
 * Payload sent by API Gateway when a job is created.
 * The matching service uses this to generate and persist the JD embedding.
 */
export interface JobEmbedPayload {
  tenantId: string;
  jobId: string;
  description: string;
}

/**
 * Result returned by the job.embed handler.
 */
export interface JobEmbedResult {
  jobId: string;
}

/**
 * Payload sent by API Gateway when triggering candidate matching.
 */
export interface JobMatchPayload {
  tenantId: string;
  jobId: string;
}

/**
 * Single candidate match entry returned to API Gateway.
 */
export interface CandidateMatchItem {
  candidateId: string;
  name: string | null;
  score: number;
  rationale: string | null;
}

/**
 * Main results container returned by the job.match TCP handler.
 */
export interface CandidateMatchResult {
  jobId: string;
  matchedCount: number;
  topCandidates: CandidateMatchItem[];
}

/**
 * Candidate data returned from pgvector similarity search.
 */
export interface CandidateWithSimilarity {
  id: string;
  name: string | null;
  email: string | null;
  parsedData: Record<string, unknown> | null;
  similarity: number;
}

/**
 * Zod schema for a single scored candidate.
 */
export const ScoredCandidateSchema = z.object({
  candidateId: z.string().uuid(),
  score: z.number().int().min(0).max(100),
  rationale: z.string(),
});

/**
 * Zod schema for an array of scored candidates.
 */
export const ScoredCandidateArraySchema = z.array(ScoredCandidateSchema);

/**
 * TypeScript interface inferred from the Zod schema.
 */
export type ScoredCandidate = z.infer<typeof ScoredCandidateSchema>;
