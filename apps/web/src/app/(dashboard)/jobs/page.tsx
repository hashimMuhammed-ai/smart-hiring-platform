'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import JobStatusBadge from '@/components/jobs/JobStatusBadge';
import type { JobsListResponse } from '@/lib/types/job.types';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function TableSkeleton() {
  return (
    <div className="skeleton-table" aria-busy="true" aria-label="Loading jobs">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="skeleton-row">
          <div className="skeleton skeleton--title" />
          <div className="skeleton skeleton--badge" />
          <div className="skeleton skeleton--num" />
          <div className="skeleton skeleton--date" />
        </div>
      ))}
    </div>
  );
}

export default function JobsPage() {
  const router = useRouter();

  const { data, isLoading, isError, error } = useQuery<JobsListResponse>({
    queryKey: ['jobs'],
    queryFn: async (): Promise<JobsListResponse> => {
      const res = await apiClient.get<JobsListResponse>('/jobs');
      return res.data;
    },
  });

  const jobs = data?.data ?? [];

  return (
    <div className="page-content">
      {/* Page header */}
      <div className="page-header page-header--row">
        <div>
          <h1 className="page-title">Jobs</h1>
          <p className="page-subtitle">
            {isLoading
              ? 'Loading…'
              : `${data?.total ?? 0} job${(data?.total ?? 0) !== 1 ? 's' : ''} in your workspace`}
          </p>
        </div>
        <div className="page-actions">
          <Link href="/jobs/new" id="new-job-btn" className="btn-primary btn--sm">
            + New job
          </Link>
        </div>
      </div>

      {/* Error banner */}
      {isError && (
        <div className="form-error-banner" role="alert" id="jobs-error-banner">
          {(error as Error).message ?? 'Failed to load jobs. Is the API running?'}
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && <TableSkeleton />}

      {/* Empty state */}
      {!isLoading && !isError && jobs.length === 0 && (
        <div className="empty-state" id="jobs-empty-state">
          <div className="empty-state-icon" aria-hidden="true">💼</div>
          <h2 className="empty-state-title">No jobs yet</h2>
          <p className="empty-state-body">
            Post your first job and start matching candidates with AI.
          </p>
          <Link
            href="/jobs/new"
            className="btn-primary empty-state-cta"
            id="create-first-job-link"
          >
            Post a job →
          </Link>
        </div>
      )}

      {/* Jobs table */}
      {!isLoading && jobs.length > 0 && (
        <div className="table-wrapper" role="region" aria-label="Jobs list">
          <table className="data-table" id="jobs-table">
            <thead>
              <tr>
                <th className="data-table__th">Title</th>
                <th className="data-table__th">Status</th>
                <th className="data-table__th data-table__th--num">Candidates</th>
                <th className="data-table__th">Created</th>
                <th className="data-table__th" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr
                  key={job.id}
                  className="data-table__row"
                  onClick={() => router.push(`/jobs/${job.id}`)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Open job: ${job.title}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      router.push(`/jobs/${job.id}`);
                    }
                  }}
                >
                  <td className="data-table__td data-table__td--title">
                    <span className="job-title">{job.title}</span>
                  </td>
                  <td className="data-table__td">
                    <JobStatusBadge status={job.status} />
                  </td>
                  <td className="data-table__td data-table__td--num">
                    <span className="candidate-count">{job.candidateCount}</span>
                  </td>
                  <td className="data-table__td data-table__td--muted">
                    {formatDate(job.createdAt)}
                  </td>
                  <td className="data-table__td data-table__td--action">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="btn-ghost btn--sm"
                      id={`view-job-${job.id}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
