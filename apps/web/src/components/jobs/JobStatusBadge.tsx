import type { Job } from '@/lib/types/job.types';

interface JobStatusBadgeProps {
  status: Job['status'];
}

const STATUS_CONFIG: Record<
  Job['status'],
  { label: string; className: string }
> = {
  open: { label: 'Open', className: 'badge badge--open' },
  closed: { label: 'Closed', className: 'badge badge--closed' },
  draft: { label: 'Draft', className: 'badge badge--draft' },
};

export default function JobStatusBadge({ status }: JobStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  return (
    <span className={config.className} aria-label={`Job status: ${config.label}`}>
      {config.label}
    </span>
  );
}
