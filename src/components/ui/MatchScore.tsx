import clsx from "clsx";

function scoreStyles(score: number) {
  if (score >= 80) return { ring: "stroke-accent-500", text: "text-accent-600", bg: "bg-accent-100" };
  if (score >= 60) return { ring: "stroke-brand-500", text: "text-brand-600", bg: "bg-brand-100" };
  if (score >= 40) return { ring: "stroke-warn-500", text: "text-warn-600", bg: "bg-warn-100" };
  return { ring: "stroke-danger-500", text: "text-danger-600", bg: "bg-danger-100" };
}

export function MatchScoreRing({ score, size = 56 }: { score: number; size?: number }) {
  const styles = scoreStyles(score);
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={5} className="stroke-ink-100 fill-none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={clsx("fill-none transition-all duration-500", styles.ring)}
        />
      </svg>
      <div className={clsx("absolute inset-0 flex items-center justify-center text-sm font-bold", styles.text)}>
        {Math.round(score)}%
      </div>
    </div>
  );
}

export function MatchScoreBadge({ score }: { score: number }) {
  const styles = scoreStyles(score);
  return (
    <span className={clsx("badge", styles.bg, styles.text)}>
      {Math.round(score)}% compatible
    </span>
  );
}
