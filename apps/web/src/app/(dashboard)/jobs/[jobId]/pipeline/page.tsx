'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import apiClient from '@/lib/api-client';
import { useToast } from '@/lib/toast';
import KanbanColumn from '@/components/pipeline/KanbanColumn';
import KanbanCard from '@/components/pipeline/KanbanCard';
import type {
  PipelineResponse,
  PipelineCard,
  PipelineStage,
  BoardState,
  MoveStagePayload,
  MoveStageResponse,
} from '@/lib/types/pipeline.types';
import { PIPELINE_STAGES, STAGE_LABELS } from '@/lib/types/pipeline.types';

// ── helpers ────────────────────────────────────────────────────────────────

function buildBoardState(response: PipelineResponse): BoardState {
  const board = {} as BoardState;
  for (const stage of PIPELINE_STAGES) {
    board[stage] = response.stages[stage] ?? [];
  }
  return board;
}

// ── component ───────────────────────────────────────────────────────────────

interface ActiveDrag {
  card: PipelineCard;
  fromStage: PipelineStage;
}

export default function PipelinePage() {
  const params = useParams<{ jobId: string }>();
  const jobId = params.jobId;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ── Server query ──────────────────────────────────────────────────────────

  const { data, isLoading, isError } = useQuery<PipelineResponse>({
    queryKey: ['pipeline', jobId],
    queryFn: async (): Promise<PipelineResponse> => {
      const res = await apiClient.get<PipelineResponse>(`/jobs/${jobId}/pipeline`);
      return res.data;
    },
    enabled: Boolean(jobId),
  });

  // ── Optimistic board state ────────────────────────────────────────────────

  const [boardState, setBoardState] = useState<BoardState | null>(null);

  // Sync server data → local board state (only when not mid-drag)
  useEffect(() => {
    if (data) {
      setBoardState(buildBoardState(data));
    }
  }, [data]);

  // ── DnD sensors ───────────────────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 }, // avoid accidental drags on click
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // ── Active drag state ─────────────────────────────────────────────────────

  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { card, fromStage } = event.active.data.current as {
      card: PipelineCard;
      fromStage: PipelineStage;
    };
    setActiveDrag({ card, fromStage });
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveDrag(null);

      const { over, active } = event;
      if (!over || !boardState) return;

      const toStage = over.id as PipelineStage;
      const { card, fromStage } = active.data.current as ActiveDrag;

      if (toStage === fromStage) return; // dropped in same column

      // ── Optimistic update ───────────────────────────────────────────────
      const snapshot = boardState; // capture pre-move state for revert

      setBoardState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          [fromStage]: prev[fromStage].filter(
            (c) => c.candidateId !== card.candidateId,
          ),
          [toStage]: [...prev[toStage], card],
        };
      });

      // Show success toast optimistically for instant feedback
      toast(`${card.name} moved to ${STAGE_LABELS[toStage]}`, 'success');

      // ── API call ────────────────────────────────────────────────────────
      try {
        const payload: MoveStagePayload = { jobId, toStage };
        await apiClient.patch<MoveStageResponse>(
          `/pipeline/${card.candidateId}/stage`,
          payload,
        );
        // Invalidate in the background so the server state is reflected
        queryClient.invalidateQueries({ queryKey: ['pipeline', jobId] });
        queryClient.invalidateQueries({ queryKey: ['candidates', jobId] });
      } catch {
        // ── Revert on error ───────────────────────────────────────────────
        setBoardState(snapshot);
        toast(
          `Failed to save move for ${card.name} — changes reverted.`,
          'error',
        );
      }
    },
    [boardState, jobId, queryClient, toast],
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="page-content page-content--full">
      {/* Breadcrumb */}
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/jobs" className="breadcrumb-link">Jobs</Link>
        <span className="breadcrumb-sep" aria-hidden="true">›</span>
        <Link href={`/jobs/${jobId}`} className="breadcrumb-link">Job detail</Link>
        <span className="breadcrumb-sep" aria-hidden="true">›</span>
        <span className="breadcrumb-current">Pipeline</span>
      </nav>

      <div className="page-header page-header--row">
        <div>
          <h1 className="page-title">Pipeline</h1>
          <p className="page-subtitle">
            Drag candidates between stages to track their progress.
          </p>
        </div>
        <div className="page-actions">
          <Link
            href={`/jobs/${jobId}/candidates`}
            className="btn-ghost btn--sm"
            id="view-candidates-list-btn"
          >
            ← Candidate list
          </Link>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="kanban-skeleton" aria-busy="true" aria-label="Loading pipeline">
          {PIPELINE_STAGES.map((s) => (
            <div key={s} className="kanban-skeleton__col">
              <div className="skeleton skeleton--title" style={{ marginBottom: '0.75rem' }} />
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="skeleton kanban-skeleton__card" />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="empty-state" id="pipeline-error">
          <div className="empty-state-icon" aria-hidden="true">⚠️</div>
          <h2 className="empty-state-title">Could not load pipeline</h2>
          <p className="empty-state-body">Check that the API is running.</p>
        </div>
      )}

      {/* Kanban board */}
      {boardState && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="kanban-board-wrapper">
            <div
              className="kanban-board"
              role="region"
              aria-label="Pipeline kanban board"
              id="kanban-board"
            >
              {PIPELINE_STAGES.map((stage) => (
                <KanbanColumn
                  key={stage}
                  stage={stage}
                  label={STAGE_LABELS[stage]}
                  cards={boardState[stage]}
                  isDragActive={activeDrag !== null}
                />
              ))}
            </div>
          </div>

          {/* Floating card clone while dragging */}
          <DragOverlay dropAnimation={null}>
            {activeDrag ? (
              <KanbanCard
                card={activeDrag.card}
                columnStage={activeDrag.fromStage}
                isOverlay
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
