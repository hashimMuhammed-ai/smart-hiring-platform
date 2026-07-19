'use client';

import { useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import ResumeDropzone from '@/components/upload/ResumeDropzone';
import { useToast } from '@/lib/toast';
import type {
  UploadedFile,
  UploadResponse,
  CandidatesListResponse,
  Candidate,
} from '@/lib/types/candidate.types';

// ── helpers ────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const STATUS_META: Record<
  UploadedFile['status'],
  { label: string; className: string; icon: string }
> = {
  idle: { label: 'Ready', className: 'status-dot status-dot--idle', icon: '○' },
  uploading: { label: 'Uploading…', className: 'status-dot status-dot--uploading', icon: '↑' },
  processing: { label: 'Processing…', className: 'status-dot status-dot--processing', icon: '⟳' },
  done: { label: 'Done', className: 'status-dot status-dot--done', icon: '✓' },
  error: { label: 'Error', className: 'status-dot status-dot--error', icon: '✗' },
};

// ── component ───────────────────────────────────────────────────────────────

export default function UploadPage() {
  const params = useParams<{ jobId: string }>();
  const jobId = params.jobId;
  const { toast } = useToast();

  // Per-file upload state — keyed by file name + size to handle duplicates
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  // True once at least one file has been successfully queued (starts polling)
  const [pollingActive, setPollingActive] = useState(false);

  // IDs of candidates we've queued — used to focus the poll on our uploads
  const [queuedCandidateIds, setQueuedCandidateIds] = useState<string[]>([]);

  // ── upload handler ──────────────────────────────────────────────────────

  const handleAccepted = useCallback(
    async (newFiles: File[]): Promise<void> => {
      // Append new UploadedFile entries in 'uploading' state
      const entries: UploadedFile[] = newFiles.map((file) => ({
        file,
        status: 'uploading',
        candidateId: null,
        errorMessage: null,
      }));

      setUploadedFiles((prev) => [...prev, ...entries]);

      // Upload all files in a single multipart request
      const formData = new FormData();
      for (const file of newFiles) {
        formData.append('files', file);
      }

      try {
        const res = await apiClient.post<UploadResponse>(
          `/jobs/${jobId}/candidates/upload`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } },
        );

        const queued = res.data.queued;

        // Map returned candidateIds back to our file entries by position
        setUploadedFiles((prev) => {
          const updated = [...prev];
          // Find entries that are still 'uploading' (our just-added ones)
          let queuedIdx = 0;
          for (let i = 0; i < updated.length; i++) {
            if (updated[i].status === 'uploading' && newFiles.includes(updated[i].file)) {
              updated[i] = {
                ...updated[i],
                status: 'processing',
                candidateId: queued[queuedIdx]?.candidateId ?? null,
              };
              queuedIdx++;
            }
          }
          return updated;
        });

        const newIds = queued.map((q) => q.candidateId);
        setQueuedCandidateIds((prev) => [...prev, ...newIds]);
        setPollingActive(true);
        toast(
          `${newFiles.length} resume${newFiles.length !== 1 ? 's' : ''} queued for parsing`,
          'success',
        );
      } catch (err: unknown) {
        const msg =
          typeof err === 'object' &&
            err !== null &&
            'response' in err
            ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
            : undefined;

        // Mark all files from this batch as errored
        setUploadedFiles((prev) => {
          const updated = [...prev];
          for (let i = 0; i < updated.length; i++) {
            if (updated[i].status === 'uploading' && newFiles.includes(updated[i].file)) {
              updated[i] = {
                ...updated[i],
                status: 'error',
                errorMessage: msg ?? 'Upload failed',
              };
            }
          }
          return updated;
        });
        toast(msg ?? 'Upload failed — check your connection', 'error');
      }
    },
    [jobId, toast],
  );


  // ── polling query ───────────────────────────────────────────────────────

  const { data: candidatesData } = useQuery<CandidatesListResponse>({
    queryKey: ['candidates', jobId, 'upload-poll'],
    queryFn: async (): Promise<CandidatesListResponse> => {
      const res = await apiClient.get<CandidatesListResponse>(`/jobs/${jobId}/candidates`);
      return res.data;
    },
    enabled: pollingActive,
    refetchInterval: (query): number | false => {
      const candidates = query.state.data?.data ?? [];
      const ourCandidates = candidates.filter((c) =>
        queuedCandidateIds.includes(c.id),
      );
      const stillPending = ourCandidates.some(
        (c) => c.parseStatus === 'pending' || c.parseStatus === 'processing',
      );
      return stillPending ? 3000 : false;
    },
  });

  // Sync polling results back into our file list
  const ourCandidates: Candidate[] = (candidatesData?.data ?? []).filter((c) =>
    queuedCandidateIds.includes(c.id),
  );

  const allDone =
    queuedCandidateIds.length > 0 &&
    ourCandidates.length === queuedCandidateIds.length &&
    ourCandidates.every(
      (c) => c.parseStatus === 'done' || c.parseStatus === 'failed',
    );

  const anyUploading = uploadedFiles.some((f) => f.status === 'uploading');

  // ── render ──────────────────────────────────────────────────────────────

  return (
    <div className="page-content page-content--narrow">
      {/* Breadcrumb */}
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/jobs" className="breadcrumb-link">Jobs</Link>
        <span className="breadcrumb-sep" aria-hidden="true">›</span>
        <Link href={`/jobs/${jobId}`} className="breadcrumb-link">Job detail</Link>
        <span className="breadcrumb-sep" aria-hidden="true">›</span>
        <span className="breadcrumb-current">Upload resumes</span>
      </nav>

      <div className="page-header page-header--row">
        <div>
          <h1 className="page-title">Upload resumes</h1>
          <p className="page-subtitle">
            Drop PDF files — they&apos;ll be parsed by AI automatically.
          </p>
        </div>
        {allDone && (
          <div className="page-actions">
            <Link
              href={`/jobs/${jobId}/candidates`}
              id="view-candidates-btn"
              className="btn-primary btn--sm"
            >
              View candidates →
            </Link>
          </div>
        )}
      </div>

      {/* Dropzone */}
      <ResumeDropzone onAccepted={handleAccepted} disabled={anyUploading} />

      {/* File list */}
      {uploadedFiles.length > 0 && (
        <div className="file-list" id="upload-file-list" role="list" aria-label="Uploaded files">
          <p className="file-list-heading">
            {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''} queued
          </p>
          {uploadedFiles.map((uf, idx) => {
            // Find matched candidate from polling data
            const candidate = uf.candidateId
              ? ourCandidates.find((c) => c.id === uf.candidateId)
              : null;

            // Resolve effective status from poll if we have live data
            let effectiveStatus = uf.status;
            if (candidate && uf.status === 'processing') {
              if (candidate.parseStatus === 'done') effectiveStatus = 'done';
              if (candidate.parseStatus === 'failed') effectiveStatus = 'error';
            }
            const effectiveMeta = STATUS_META[effectiveStatus];

            return (
              <div
                key={`${uf.file.name}-${idx}`}
                className={`file-item file-item--${effectiveStatus}`}
                role="listitem"
                id={`file-item-${idx}`}
              >
                {/* File icon */}
                <div className="file-item__icon" aria-hidden="true">
                  📄
                </div>

                {/* File info */}
                <div className="file-item__info">
                  <p className="file-item__name">{uf.file.name}</p>
                  <p className="file-item__meta">
                    {formatBytes(uf.file.size)}
                    {candidate?.name && effectiveStatus === 'done' && (
                      <> · <strong>{candidate.name}</strong>{candidate.email ? ` — ${candidate.email}` : ''}</>
                    )}
                    {uf.errorMessage && (
                      <> · <span className="file-item__error">{uf.errorMessage}</span></>
                    )}
                  </p>
                </div>

                {/* Status indicator */}
                <div className="file-item__status" aria-label={effectiveMeta.label}>
                  <span className={effectiveMeta.className} aria-hidden="true">
                    {effectiveMeta.icon}
                  </span>
                  <span className="file-item__status-label">{effectiveMeta.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Polling progress banner */}
      {pollingActive && !allDone && (
        <div className="upload-progress-banner" role="status" aria-live="polite">
          <span className="upload-progress-spinner" aria-hidden="true" />
          AI is parsing resumes — this usually takes 10–30 seconds per file…
        </div>
      )}

      {/* All done banner */}
      {allDone && (
        <div className="upload-done-banner" role="status" aria-live="polite" id="upload-done-banner">
          <span aria-hidden="true">✓</span>
          All resumes parsed!{' '}
          <Link href={`/jobs/${jobId}/candidates`} className="auth-link">
            View candidates →
          </Link>
        </div>
      )}

      {/* Results table */}
      {ourCandidates.length > 0 && (
        <div className="upload-results" id="upload-results">
          <h2 className="upload-results-heading">
            Parsed candidates ({ourCandidates.filter((c) => c.parseStatus === 'done').length} / {ourCandidates.length})
          </h2>
          <div className="table-wrapper">
            <table className="data-table" id="upload-results-table">
              <thead>
                <tr>
                  <th className="data-table__th">Name</th>
                  <th className="data-table__th">Email</th>
                  <th className="data-table__th">Status</th>
                </tr>
              </thead>
              <tbody>
                {ourCandidates.map((c) => (
                  <tr key={c.id} className="data-table__row">
                    <td className="data-table__td">
                      {c.name || <span className="text-muted">—</span>}
                    </td>
                    <td className="data-table__td data-table__td--muted">
                      {c.email || <span className="text-muted">—</span>}
                    </td>
                    <td className="data-table__td">
                      <span className={`parse-status parse-status--${c.parseStatus}`}>
                        {c.parseStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
