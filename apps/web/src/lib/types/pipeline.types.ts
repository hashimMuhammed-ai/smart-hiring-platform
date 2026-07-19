// Pipeline types — used by kanban board and stage-move API

export type PipelineStage =
  | 'applied'
  | 'screening'
  | 'interview'
  | 'offer'
  | 'hired'
  | 'rejected';

export const PIPELINE_STAGES: PipelineStage[] = [
  'applied',
  'screening',
  'interview',
  'offer',
  'hired',
  'rejected',
];

export const STAGE_LABELS: Record<PipelineStage, string> = {
  applied:   'Applied',
  screening: 'Screening',
  interview: 'Interview',
  offer:     'Offer',
  hired:     'Hired',
  rejected:  'Rejected',
};

/** A single card on the kanban board */
export interface PipelineCard {
  candidateId: string;
  name: string;
  matchScore: number | null;
}

/** GET /api/jobs/:jobId/pipeline response */
export interface PipelineResponse {
  stages: Record<PipelineStage, PipelineCard[]>;
}

/** PATCH /api/pipeline/:candidateId/stage request body */
export interface MoveStagePayload {
  jobId: string;
  toStage: PipelineStage;
  notes?: string;
}

/** PATCH /api/pipeline/:candidateId/stage response */
export interface MoveStageResponse {
  candidateId: string;
  fromStage: PipelineStage;
  toStage: PipelineStage;
  movedAt: string;
}

/** Client-side board state — keyed by stage */
export type BoardState = Record<PipelineStage, PipelineCard[]>;
