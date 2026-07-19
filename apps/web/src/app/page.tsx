'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';
import Sidebar from '@/components/layout/Sidebar';
import JobStatusBadge from '@/components/jobs/JobStatusBadge';
import Providers from './(dashboard)/providers';
import apiClient from '@/lib/api-client';
import type { JobsListResponse, Job } from '@/lib/types/job.types';

// ── Inner dashboard (needs QueryClientProvider context) ───────────────────

function DashboardContent() {
  const { data, isLoading } = useQuery<JobsListResponse>({
    queryKey: ['jobs'],
    queryFn: async (): Promise<JobsListResponse> => {
      const res = await apiClient.get<JobsListResponse>('/jobs');
      return res.data;
    },
  });

  const jobs: Job[] = data?.data ?? [];

  // Derive stats from jobs list
  const openJobs = jobs.filter((j) => j.status === 'open').length;
  const totalCandidates = jobs.reduce((sum, j) => sum + (j.candidateCount ?? 0), 0);
  const recentJobs = [...jobs]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Your hiring activity at a glance</p>
      </div>

      {/* Stats grid */}
      <div className="stats-grid" aria-label="Key metrics">
        <div className="stat-card stat-card--live" id="stat-open-jobs">
          <div className="stat-card-icon stat-card-icon--indigo" aria-hidden="true">◉</div>
          <div className="stat-card-body">
            <p className="stat-card-label">Open Jobs</p>
            {isLoading ? (
              <div className="skeleton skeleton--num stat-card-skeleton" />
            ) : (
              <p className="stat-card-value stat-card-value--animated" id="stat-open-jobs-value">
                {openJobs}
              </p>
            )}
          </div>
        </div>

        <div className="stat-card stat-card--live" id="stat-candidates">
          <div className="stat-card-icon stat-card-icon--violet" aria-hidden="true">◈</div>
          <div className="stat-card-body">
            <p className="stat-card-label">Total Candidates</p>
            {isLoading ? (
              <div className="skeleton skeleton--num stat-card-skeleton" />
            ) : (
              <p className="stat-card-value stat-card-value--animated" id="stat-candidates-value">
                {totalCandidates}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Recent jobs */}
      {!isLoading && jobs.length > 0 && (
        <div className="recent-jobs" id="recent-jobs">
          <div className="recent-jobs__header">
            <h2 className="recent-jobs__title">Recent jobs</h2>
            <Link href="/jobs" className="recent-jobs__all-link">
              View all →
            </Link>
          </div>
          <ul className="recent-jobs-list" role="list">
            {recentJobs.map((job) => (
              <li key={job.id} className="recent-job-item" role="listitem">
                <Link
                  href={`/jobs/${job.id}`}
                  className="recent-job-item__link"
                  id={`recent-job-${job.id}`}
                >
                  <div className="recent-job-item__info">
                    <span className="recent-job-item__title">{job.title}</span>
                    <span className="recent-job-item__meta">
                      {job.candidateCount} candidate{job.candidateCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="recent-job-item__right">
                    <JobStatusBadge status={job.status} />
                    <span className="recent-job-item__arrow" aria-hidden="true">›</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Empty state — no jobs yet */}
      {!isLoading && jobs.length === 0 && (
        <div className="empty-state" id="dashboard-empty-state">
          <div className="empty-state-icon" aria-hidden="true">🚀</div>
          <h2 className="empty-state-title">Ready to hire smarter?</h2>
          <p className="empty-state-body">
            Post your first job and let AI match the best candidates automatically.
          </p>
          <Link href="/jobs/new" className="btn-primary empty-state-cta" id="create-first-job-btn">
            Post a job →
          </Link>
        </div>
      )}
    </div>
  );
}

// ── Root page (owns auth check + shell) ───────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!token) {
      router.replace('/login');
    }
  }, [token, router]);

  if (!token) return null;

  return (
    <Providers>
      <div className="dashboard-shell">
        <Sidebar />
        <main className="dashboard-main" id="main-content">
          <DashboardContent />
        </main>
      </div>
    </Providers>
  );
}
