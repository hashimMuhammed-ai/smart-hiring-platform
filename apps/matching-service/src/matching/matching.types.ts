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
