'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import type { CreateJobResponse } from '@/lib/types/job.types';

const createJobSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(120, 'Title must be under 120 characters')
    .trim(),
  description: z
    .string()
    .min(50, 'Description must be at least 50 characters')
    .max(5000, 'Description must be under 5000 characters')
    .trim(),
});

type CreateJobValues = z.infer<typeof createJobSchema>;

const MAX_DESCRIPTION = 5000;

export default function NewJobPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateJobValues>({
    resolver: zodResolver(createJobSchema),
    defaultValues: { title: '', description: '' },
  });

  const descriptionValue = watch('description');
  const charCount = descriptionValue?.length ?? 0;

  const onSubmit = async (values: CreateJobValues): Promise<void> => {
    setServerError(null);
    try {
      const res = await apiClient.post<CreateJobResponse>('/jobs', values);
      // Invalidate jobs list so it refetches when user navigates back
      await queryClient.invalidateQueries({ queryKey: ['jobs'] });
      router.push(`/jobs/${res.data.id}`);
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' &&
        err !== null &&
        'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data
              ?.message
          : undefined;
      setServerError(msg ?? 'Failed to create job. Please try again.');
    }
  };

  return (
    <div className="page-content page-content--narrow">
      {/* Breadcrumb */}
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/jobs" className="breadcrumb-link">
          Jobs
        </Link>
        <span className="breadcrumb-sep" aria-hidden="true">›</span>
        <span className="breadcrumb-current">New job</span>
      </nav>

      <div className="page-header">
        <h1 className="page-title">Post a new job</h1>
        <p className="page-subtitle">
          The job description is embedded by AI for candidate matching.
        </p>
      </div>

      <div className="form-card">
        <form
          id="create-job-form"
          onSubmit={handleSubmit(onSubmit)}
          className="create-form"
          noValidate
        >
          {serverError && (
            <div className="form-error-banner" role="alert">
              {serverError}
            </div>
          )}

          {/* Title */}
          <div className="form-group">
            <label htmlFor="job-title" className="form-label">
              Job title <span className="form-label-required" aria-hidden="true">*</span>
            </label>
            <input
              id="job-title"
              type="text"
              className={`form-input ${errors.title ? 'form-input--error' : ''}`}
              placeholder="e.g. Senior Backend Engineer"
              autoFocus
              {...register('title')}
            />
            {errors.title && (
              <p className="form-field-error">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="form-group">
            <div className="form-label-row">
              <label htmlFor="job-description" className="form-label">
                Job description <span className="form-label-required" aria-hidden="true">*</span>
              </label>
              <span
                className={`char-count ${charCount > MAX_DESCRIPTION * 0.9 ? 'char-count--warn' : ''}`}
                aria-live="polite"
              >
                {charCount} / {MAX_DESCRIPTION}
              </span>
            </div>
            <textarea
              id="job-description"
              rows={12}
              className={`form-textarea ${errors.description ? 'form-input--error' : ''}`}
              placeholder="Describe the role, responsibilities, required skills, and what makes this position exciting…"
              {...register('description')}
            />
            {errors.description && (
              <p className="form-field-error">{errors.description.message}</p>
            )}
            <p className="form-hint">
              Min 50 characters. A richer description improves AI matching accuracy.
            </p>
          </div>

          {/* Actions */}
          <div className="form-actions">
            <Link href="/jobs" className="btn-ghost" id="cancel-create-job">
              Cancel
            </Link>
            <button
              id="submit-create-job"
              type="submit"
              disabled={isSubmitting}
              className="btn-primary btn--fit"
            >
              {isSubmitting && <span className="btn-spinner" aria-hidden="true" />}
              {isSubmitting ? 'Creating…' : 'Create job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
