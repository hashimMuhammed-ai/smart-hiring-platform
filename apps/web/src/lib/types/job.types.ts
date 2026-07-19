// Shared Job types — used by jobs list, create, and detail pages

export interface Job {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'closed' | 'draft';
  candidateCount: number;
  createdAt: string;
}

export interface JobsListResponse {
  data: Job[];
  total: number;
}

export interface CreateJobPayload {
  title: string;
  description: string;
}

export interface CreateJobResponse {
  id: string;
  title: string;
  status: 'open' | 'closed' | 'draft';
  embeddingStatus: string;
}
