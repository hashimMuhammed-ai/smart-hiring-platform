'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import MatchScoreBadge from '@/components/candidates/MatchScoreBadge';
import StagePill from '@/components/candidates/StagePill';
import CandidateSlideOver from '@/components/candidates/CandidateSlideOver';
import { useToast } from '@/lib/toast';
import type {
  CandidatesListResponse,
  Candidate,
  MatchResponse,
} from '@/lib/types/candidate.types';

const MAX_VISIBLE_SKILLS = 5;

function SkillPills({ skills }: { skills: string[] }) {
  const visible = skills.slice(0, MAX_VISIBLE_SKILLS);
  const overflow = skills.length - MAX_VISIBLE_SKILLS;
  return (
    <div className="skill-pill-row skill-pill-row--compact">
      {visible.map((s) => (
        <span key={s} className="skill-pill skill-pill--sm">{s}</span>
      ))}
      {overflow > 0 && (
        <span className="skill-pill-overflow" title={skills.slice(MAX_VISIBLE_SKILLS).join(', ')}>
          +{overflow}
        </span>
      )}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="skeleton-table" aria-busy="true" aria-label="Loading candidates">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="skeleton-row skeleton-row--candidates">
          <div className="skeleton skeleton--title" />
          <div className="skeleton skeleton--date" />
          <div className="skeleton skeleton--num" />
          <div className="skeleton skeleton--badge" />
          <div className="skeleton skeleton--badge" />
        </div>
      ))}
    </div>
  );
}

export default function CandidatesPage() {
  const params = useParams<{ jobId: string }>();
  const jobId = params.jobId;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [matchSuccess, setMatchSuccess] = useState<string | null>(null);

  // ── Fetch candidates ─────────────────────────────────────────────────────

  const {
    data,
    isLoading,
    isError,
  } = useQuery<CandidatesListResponse>({
    queryKey: ['candidates', jobId],
    queryFn: async (): Promise<CandidatesListResponse> => {
      const res = await apiClient.get<CandidatesListResponse>(`/jobs/${jobId}/candidates`);
      return res.data;
    },
    enabled: Boolean(jobId),
  });

  const candidates: Candidate[] = data?.data ?? [];

  // ── Run AI match ─────────────────────────────────────────────────────────

  const matchMutation = useMutation<MatchResponse, Error>({
    mutationFn: async (): Promise<MatchResponse> => {
      const res = await apiClient.post<MatchResponse>(`/jobs/${jobId}/match`);
      return res.data;
    },
    onSuccess: async (result) => {
      setMatchError(null);
      const msg = `Matched ${result.matchedCount} candidate${result.matchedCount !== 1 ? 's' : ''}!`;
      setMatchSuccess(msg);
      toast(msg, 'success');
      await queryClient.invalidateQueries({ queryKey: ['candidates', jobId] });
      // Auto-clear success message after 5s
      setTimeout(() => setMatchSuccess(null), 5000);
    },
    onError: (err) => {
      const msg = err.message ?? 'AI match failed. Please try again.';
      setMatchError(msg);
      toast(msg, 'error');
    },
  });

  // ── Derived state ────────────────────────────────────────────────────────

  const parsedCandidates = candidates.filter((c) => c.parseStatus === 'done');
  const pendingParse = candidates.filter(
    (c) => c.parseStatus === 'pending' || c.parseStatus === 'processing',
  );
  const hasScores = candidates.some((c) => c.matchScore !== null);

  // Sort: scored candidates first (desc), then unscored alphabetically
  const sorted = [...candidates].sort((a, b) => {
    if (a.matchScore !== null && b.matchScore !== null) return b.matchScore - a.matchScore;
    if (a.matchScore !== null) return -1;
    if (b.matchScore !== null) return 1;
    return a.name.localeCompare(b.name);
  });

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <div className="page-content">
        {/* Breadcrumb */}
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/jobs" className="breadcrumb-link">Jobs</Link>
          <span className="breadcrumb-sep" aria-hidden="true">›</span>
          <Link href={`/jobs/${jobId}`} className="breadcrumb-link">Job detail</Link>
          <span className="breadcrumb-sep" aria-hidden="true">›</span>
          <span className="breadcrumb-current">Candidates</span>
        </nav>

        {/* Page header */}
        <div className="page-header page-header--row">
          <div>
            <h1 className="page-title">Candidates</h1>
            <p className="page-subtitle">
              {isLoading
                ? 'Loading…'
                : `${candidates.length} candidate${candidates.length !== 1 ? 's' : ''}`
                  + (hasScores ? ' · ranked by AI match score' : '')}
            </p>
          </div>
          <div className="page-actions">
            <Link
              href={`/jobs/${jobId}/candidates/upload`}
              className="btn-ghost btn--sm"
              id="upload-more-btn"
            >
              Upload resumes
            </Link>
            <button
              id="run-match-btn"
              className="btn-primary btn--sm run-match-btn"
              disabled={matchMutation.isPending || parsedCandidates.length === 0}
              onClick={() => {
                setMatchError(null);
                matchMutation.mutate();
              }}
              title={parsedCandidates.length === 0 ? 'Upload and parse resumes first' : 'Run AI matching'}
            >
              {matchMutation.isPending && (
                <span className="btn-spinner" aria-hidden="true" />
              )}
              {matchMutation.isPending ? 'Matching…' : '✦ Run AI match'}
            </button>
          </div>
        </div>

        {/* Feedback banners */}
        {matchError && (
          <div className="form-error-banner" role="alert" id="match-error-banner">
            {matchError}
          </div>
        )}
        {matchSuccess && (
          <div className="match-success-banner" role="status" aria-live="polite" id="match-success-banner">
            <span aria-hidden="true">✦</span> {matchSuccess}
          </div>
        )}

        {/* Parse-pending notice */}
        {pendingParse.length > 0 && (
          <div className="parse-pending-notice" role="status" id="parse-pending-notice">
            <span className="upload-progress-spinner" aria-hidden="true" />
            {pendingParse.length} resume{pendingParse.length !== 1 ? 's' : ''} still being parsed…
          </div>
        )}

        {/* Loading */}
        {isLoading && <TableSkeleton />}

        {/* Error */}
        {isError && (
          <div className="empty-state" id="candidates-error">
            <div className="empty-state-icon" aria-hidden="true">⚠️</div>
            <h2 className="empty-state-title">Could not load candidates</h2>
            <p className="empty-state-body">Check that the API is running.</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && candidates.length === 0 && (
          <div className="empty-state" id="candidates-empty">
            <div className="empty-state-icon" aria-hidden="true">📋</div>
            <h2 className="empty-state-title">No candidates yet</h2>
            <p className="empty-state-body">
              Upload PDF resumes to start building your candidate pool.
            </p>
            <Link
              href={`/jobs/${jobId}/candidates/upload`}
              className="btn-primary empty-state-cta"
              id="upload-first-resumes-btn"
            >
              Upload resumes →
            </Link>
          </div>
        )}

        {/* Candidates table */}
        {!isLoading && sorted.length > 0 && (
          <div className="table-wrapper" role="region" aria-label="Candidates list">
            <table className="data-table" id="candidates-table">
              <thead>
                <tr>
                  <th className="data-table__th">#</th>
                  <th className="data-table__th">Name</th>
                  <th className="data-table__th">Email</th>
                  <th className="data-table__th">Exp</th>
                  <th className="data-table__th">Skills</th>
                  <th className="data-table__th data-table__th--num">Score</th>
                  <th className="data-table__th">Stage</th>
                  <th className="data-table__th" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {sorted.map((candidate, idx) => (
                  <tr
                    key={candidate.id}
                    className="data-table__row"
                    onClick={() => setSelectedCandidateId(candidate.id)}
                    role="button"
                    tabIndex={0}
                    aria-label={`View candidate: ${candidate.name}`}
                    id={`candidate-row-${candidate.id}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        setSelectedCandidateId(candidate.id);
                      }
                    }}
                  >
                    <td className="data-table__td data-table__td--muted candidate-rank">
                      {idx + 1}
                    </td>
                    <td className="data-table__td data-table__td--title">
                      <span className="job-title">{candidate.name || '—'}</span>
                    </td>
                    <td className="data-table__td data-table__td--muted">
                      {candidate.email || '—'}
                    </td>
                    <td className="data-table__td data-table__td--muted">
                      {candidate.experienceYears != null
                        ? `${candidate.experienceYears} yr${candidate.experienceYears !== 1 ? 's' : ''}`
                        : '—'}
                    </td>
                    <td className="data-table__td">
                      {candidate.skills.length > 0 ? (
                        <SkillPills skills={candidate.skills} />
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="data-table__td data-table__td--num">
                      <MatchScoreBadge score={candidate.matchScore} size="sm" />
                    </td>
                    <td className="data-table__td">
                      <StagePill stage={candidate.stage} />
                    </td>
                    <td className="data-table__td data-table__td--action">
                      <button
                        className="btn-ghost btn--sm"
                        id={`view-candidate-${candidate.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCandidateId(candidate.id);
                        }}
                        aria-label={`View details for ${candidate.name}`}
                      >
                        View →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Slide-over panel */}
      <CandidateSlideOver
        candidateId={selectedCandidateId}
        jobId={jobId}
        onClose={() => setSelectedCandidateId(null)}
      />
    </>
  );
}
