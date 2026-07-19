// Candidate types — used by upload page, candidate list, and slide-over panel

export interface Candidate {
  id: string;
  name: string;
  email: string;
  parseStatus: 'pending' | 'processing' | 'done' | 'failed';
  matchScore: number | null;
  stage: string | null;
  skills: string[];
  experienceYears: number | null;
}

export interface CandidatesListResponse {
  data: Candidate[];
}

// Client-side per-file upload tracking state
export interface UploadedFile {
  /** The original File object from the dropzone */
  file: File;
  /** Client-side upload lifecycle */
  status: 'idle' | 'uploading' | 'processing' | 'done' | 'error';
  /** Returned from POST /api/jobs/:jobId/candidates/upload */
  candidateId: string | null;
  /** Non-null when status === 'error' */
  errorMessage: string | null;
}

export interface UploadQueuedItem {
  candidateId: string;
  filename: string;
  status: string;
}

export interface UploadResponse {
  queued: UploadQueuedItem[];
}

// ── Detail view (GET /api/candidates/:id) ──────────────────────────────────

export interface StageHistoryEntry {
  stage: string;
  notes: string | null;
  movedAt: string;
}

export interface CandidateDetail extends Candidate {
  /** Full parsed resume data returned by the resume service */
  parsedData: Record<string, unknown>;
  stageHistory: StageHistoryEntry[];
  matchRationale?: string | null;
}

// ── AI match trigger (POST /api/jobs/:id/match) ────────────────────────────

export interface MatchTopCandidate {
  candidateId: string;
  name: string;
  score: number;
  rationale: string;
}

export interface MatchResponse {
  jobId: string;
  matchedCount: number;
  topCandidates: MatchTopCandidate[];
}

