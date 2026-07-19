'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import MatchScoreBadge from '@/components/candidates/MatchScoreBadge';
import type { PipelineCard, PipelineStage } from '@/lib/types/pipeline.types';

interface KanbanCardProps {
  card: PipelineCard;
  columnStage: PipelineStage;
  /** When true the card is rendered as an overlay clone — no drag handle */
  isOverlay?: boolean;
}

export default function KanbanCard({
  card,
  columnStage,
  isOverlay = false,
}: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: card.candidateId,
      data: { card, fromStage: columnStage },
      disabled: isOverlay,
    });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        'kanban-card',
        isDragging ? 'kanban-card--source' : '',
        isOverlay ? 'kanban-card--overlay' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      id={`kanban-card-${card.candidateId}`}
      {...(isOverlay ? {} : { ...attributes, ...listeners })}
      role="button"
      tabIndex={isOverlay ? -1 : 0}
      aria-label={`${card.name}, drag to move stage`}
      aria-grabbed={isDragging}
    >
      <div className="kanban-card__content">
        <p className="kanban-card__name">{card.name || 'Unknown'}</p>
        <div className="kanban-card__meta">
          <MatchScoreBadge score={card.matchScore} size="sm" />
        </div>
      </div>
      {!isOverlay && (
        <span className="kanban-card__drag-hint" aria-hidden="true">⠿</span>
      )}
    </div>
  );
}
