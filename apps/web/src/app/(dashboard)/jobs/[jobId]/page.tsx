'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import JobStatusBadge from '@/components/jobs/JobStatusBadge';
import { useToast } from '@/lib/toast';
import type { Job } from '@/lib/types/job.types';

interface JobDetailResponse extends Job {
  description: string;
}

export default function JobDetailPage() {
  const params = useParams<{ jobId: string }>();
  const jobId = params.jobId;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const { data: job, isLoading, isError } = useQuery<JobDetailResponse>({
    queryKey: ['jobs', jobId],
    queryFn: async (): Promise<JobDetailResponse> => {
      const res = await apiClient.get<JobDetailResponse>(`/jobs/${jobId}`);
      return res.data;
    },
    enabled: Boolean(jobId),
  });

  const toggleStatus = async () => {
    if (!job) return;
    setIsUpdatingStatus(true);
    const newStatus = job.status === 'open' ? 'closed' : 'open';
    try {
      await apiClient.patch(`/jobs/${jobId}`, { status: newStatus });
      toast(`Job status updated to ${newStatus}`, 'success');
      // Refetch details and job lists
      queryClient.invalidateQueries({ queryKey: ['jobs', jobId] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    } catch (err) {
      toast('Failed to update job status', 'error');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div className="page-content">
      {/* Breadcrumb */}
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/jobs" className="breadcrumb-link">
          Jobs
        </Link>
        <span className="breadcrumb-sep" aria-hidden="true">›</span>
        <span className="breadcrumb-current">
          {isLoading ? 'Loading…' : (job?.title ?? 'Job detail')}
        </span>
      </nav>

      {isLoading && (
        <div className="skeleton-block" aria-busy="true" aria-label="Loading job">
          <div className="skeleton skeleton--heading" />
          <div className="skeleton skeleton--text" />
          <div className="skeleton skeleton--text skeleton--short" />
        </div>
      )}

      {isError && (
        <div className="empty-state" id="job-detail-error">
          <div className="empty-state-icon" aria-hidden="true">⚠️</div>
          <h2 className="empty-state-title">Job not found</h2>
          <p className="empty-state-body">
            This job may have been deleted or you don&apos;t have access to it.
          </p>
          <Link href="/jobs" className="btn-primary empty-state-cta">
            Back to jobs
          </Link>
        </div>
      )}

      {job && (
        <div id="job-detail">
          <div className="page-header page-header--row">
            <div className="page-header-title-group">
              <h1 className="page-title">{job.title}</h1>
              <JobStatusBadge status={job.status} />
            </div>
            <div className="page-actions" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <button
                type="button"
                onClick={toggleStatus}
                disabled={isUpdatingStatus}
                className={job.status === 'open' ? 'btn-danger btn--sm' : 'btn-ghost btn--sm'}
                id="toggle-job-status-btn"
              >
                {isUpdatingStatus ? 'Updating…' : (job.status === 'open' ? 'Close job' : 'Reopen job')}
              </button>
              
              {job.status === 'open' && (
                <Link
                  href={`/jobs/${jobId}/candidates/upload`}
                  id="upload-resumes-btn"
                  className="btn-primary btn--sm"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  Upload resumes
                </Link>
              )}
            </div>
          </div>

          {/* Tab bar — links to sub-pages (implemented in S5-T3 onwards) */}
          <nav className="tab-bar" aria-label="Job sections">
            <Link
              href={`/jobs/${jobId}/candidates`}
              id="tab-candidates"
              className="tab-bar__link"
            >
              Candidates
            </Link>
            <Link
              href={`/jobs/${jobId}/pipeline`}
              id="tab-pipeline"
              className="tab-bar__link"
            >
              Pipeline
            </Link>
          </nav>

          {/* Overview card */}
          <div className="detail-card" id="job-overview-card">
            <h2 className="detail-card__title">Job Description</h2>
            <p className="detail-card__body">{job.description}</p>
          </div>
        </div>
      )}
    </div>
  );
}
