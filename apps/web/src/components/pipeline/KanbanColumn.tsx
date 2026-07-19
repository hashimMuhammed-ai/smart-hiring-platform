'use client';

import { useDroppable } from '@dnd-kit/core';
import KanbanCard from './KanbanCard';
import type { PipelineCard, PipelineStage } from '@/lib/types/pipeline.types';

interface KanbanColumnProps {
  stage: PipelineStage;
  label: string;
  cards: PipelineCard[];
  isDragActive: boolean;
}

const COLUMN_ACCENT: Record<PipelineStage, string> = {
  applied:   'kanban-column--applied',
  screening: 'kanban-column--screening',
  interview: 'kanban-column--interview',
  offer:     'kanban-column--offer',
  hired:     'kanban-column--hired',
  rejected:  'kanban-column--rejected',
};

export default function KanbanColumn({
  stage,
  label,
  cards,
  isDragActive,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div
      className={[
        'kanban-column',
        COLUMN_ACCENT[stage],
        isOver ? 'kanban-column--over' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      id={`kanban-column-${stage}`}
      aria-label={`${label} column, ${cards.length} candidate${cards.length !== 1 ? 's' : ''}`}
    >
      {/* Column header */}
      <div className="kanban-column__header">
        <span className="kanban-column__label">{label}</span>
        <span className="kanban-column__count" aria-label={`${cards.length} cards`}>
          {cards.length}
        </span>
      </div>

      {/* Cards list */}
      <div
        ref={setNodeRef}
        className="kanban-column__cards"
        role="list"
        aria-label={`${label} candidates`}
      >
        {cards.map((card) => (
          <div key={card.candidateId} role="listitem">
            <KanbanCard card={card} columnStage={stage} />
          </div>
        ))}

        {/* Drop-target placeholder shown when dragging over empty column */}
        {isDragActive && cards.length === 0 && (
          <div
            className={`kanban-column__empty ${isOver ? 'kanban-column__empty--over' : ''}`}
            aria-hidden="true"
          >
            Drop here
          </div>
        )}

        {/* Static empty state when no drag in progress */}
        {!isDragActive && cards.length === 0 && (
          <div className="kanban-column__empty-static" aria-hidden="true">
            No candidates
          </div>
        )}
      </div>
    </div>
  );
}
