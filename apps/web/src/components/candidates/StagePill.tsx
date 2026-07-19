type PipelineStage =
  | 'applied'
  | 'screening'
  | 'interview'
  | 'offer'
  | 'hired'
  | 'rejected'
  | string; // catch-all for unknown stages

interface StagePillProps {
  stage: PipelineStage | null;
}

const STAGE_CLASSES: Record<string, string> = {
  applied:   'stage-pill stage-pill--applied',
  screening: 'stage-pill stage-pill--screening',
  interview: 'stage-pill stage-pill--interview',
  offer:     'stage-pill stage-pill--offer',
  hired:     'stage-pill stage-pill--hired',
  rejected:  'stage-pill stage-pill--rejected',
};

export default function StagePill({ stage }: StagePillProps) {
  if (!stage) {
    return <span className="stage-pill stage-pill--none" aria-label="No stage assigned">—</span>;
  }

  const className = STAGE_CLASSES[stage.toLowerCase()] ?? 'stage-pill stage-pill--applied';
  const label = stage.charAt(0).toUpperCase() + stage.slice(1);

  return (
    <span className={className} aria-label={`Pipeline stage: ${label}`}>
      {label}
    </span>
  );
}
