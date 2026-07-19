'use client';

import { useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import MatchScoreBadge from '@/components/candidates/MatchScoreBadge';
import StagePill from '@/components/candidates/StagePill';
import type { CandidateDetail } from '@/lib/types/candidate.types';

interface CandidateSlideOverProps {
  candidateId: string | null;
  jobId: string;
  onClose: () => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function CandidateSlideOver({
  candidateId,
  jobId: _jobId,
  onClose,
}: CandidateSlideOverProps) {
  // Dismiss on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!candidateId) return;
    document.addEventListener('keydown', handleKeyDown);
    // Prevent body scroll while panel is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [candidateId, handleKeyDown]);

  const { data: candidate, isLoading } = useQuery<CandidateDetail>({
    queryKey: ['candidates', candidateId],
    queryFn: async (): Promise<CandidateDetail> => {
      const res = await apiClient.get<CandidateDetail>(`/candidates/${candidateId}`);
      return res.data;
    },
    enabled: Boolean(candidateId),
  });

  if (!candidateId) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="slide-over__backdrop"
        aria-hidden="true"
        onClick={onClose}
        id="slide-over-backdrop"
      />

      {/* Panel */}
      <aside
        className="slide-over__panel"
        role="dialog"
        aria-modal="true"
        aria-label={candidate ? `Candidate: ${candidate.name}` : 'Candidate details'}
        id="candidate-slide-over"
      >
        {/* Header */}
        <div className="slide-over__header">
          <div className="slide-over__header-info">
            {isLoading ? (
              <div className="skeleton skeleton--heading" style={{ width: 180 }} />
            ) : (
              <>
                <h2 className="slide-over__name">{candidate?.name ?? '—'}</h2>
                <p className="slide-over__email">{candidate?.email ?? '—'}</p>
              </>
            )}
          </div>
          <button
            className="slide-over__close"
            onClick={onClose}
            aria-label="Close panel"
            id="slide-over-close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="slide-over__body">
          {isLoading && (
            <div className="skeleton-block">
              <div className="skeleton skeleton--text" />
              <div className="skeleton skeleton--text skeleton--short" />
              <div className="skeleton skeleton--text" />
            </div>
          )}

          {candidate && (
            <>
              {/* Key metrics */}
              <div className="candidate-detail-grid">
                <div className="candidate-detail-cell">
                  <p className="candidate-detail-label">Match score</p>
                  <MatchScoreBadge score={candidate.matchScore} size="md" />
                </div>
                <div className="candidate-detail-cell">
                  <p className="candidate-detail-label">Stage</p>
                  <StagePill stage={candidate.stage} />
                </div>
                <div className="candidate-detail-cell">
                  <p className="candidate-detail-label">Experience</p>
                  <p className="candidate-detail-value">
                    {candidate.experienceYears != null
                      ? `${candidate.experienceYears} yrs`
                      : '—'}
                  </p>
                </div>
                <div className="candidate-detail-cell">
                  <p className="candidate-detail-label">Parse status</p>
                  <span className={`parse-status parse-status--${candidate.parseStatus}`}>
                    {candidate.parseStatus}
                  </span>
                </div>
              </div>

              {/* Skills */}
              {candidate.skills.length > 0 && (
                <div className="slide-over__section">
                  <h3 className="slide-over__section-title">Skills</h3>
                  <div className="skill-pill-row">
                    {candidate.skills.map((skill) => (
                      <span key={skill} className="skill-pill">{skill}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Stage history timeline */}
              {candidate.stageHistory.length > 0 && (
                <div className="slide-over__section">
                  <h3 className="slide-over__section-title">Stage history</h3>
                  <ol className="stage-history" aria-label="Stage history timeline">
                    {candidate.stageHistory.map((entry, i) => (
                      <li key={i} className="stage-history__item">
                        <div className="stage-history__dot" aria-hidden="true" />
                        <div className="stage-history__content">
                          <div className="stage-history__row">
                            <StagePill stage={entry.stage} />
                            <time
                              className="stage-history__time"
                              dateTime={entry.movedAt}
                            >
                              {formatDate(entry.movedAt)}
                            </time>
                          </div>
                          {entry.notes && (
                            <p className="stage-history__notes">{entry.notes}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* AI Match Rationale */}
              {candidate.matchRationale && (
                <div className="slide-over__section" id="candidate-match-rationale-section">
                  <h3 className="slide-over__section-title">AI Match Rationale</h3>
                  <div className="candidate-rationale-block">
                    <p className="candidate-rationale-text">{candidate.matchRationale}</p>
                  </div>
                </div>
              )}

              {/* Parsed data summary */}
              {Object.keys(candidate.parsedData).length > 0 && (
                <div className="slide-over__section">
                  <h3 className="slide-over__section-title">Parsed resume data</h3>
                  <pre className="parsed-data-block">
                    {JSON.stringify(candidate.parsedData, null, 2)}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  );
}
