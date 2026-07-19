interface MatchScoreBadgeProps {
  score: number | null;
  size?: 'sm' | 'md';
}

function getScoreTier(score: number): 'high' | 'mid' | 'low' {
  if (score >= 85) return 'high';
  if (score >= 60) return 'mid';
  return 'low';
}

export default function MatchScoreBadge({
  score,
  size = 'md',
}: MatchScoreBadgeProps) {
  if (score === null || score === undefined) {
    return (
      <span
        className={`match-score-badge match-score-badge--none match-score-badge--${size}`}
        aria-label="No match score yet"
      >
        —
      </span>
    );
  }

  const tier = getScoreTier(score);

  return (
    <span
      className={`match-score-badge match-score-badge--${tier} match-score-badge--${size}`}
      aria-label={`Match score: ${score}`}
      title={`Match score: ${score} / 100`}
    >
      {score}
    </span>
  );
}
