// Inline progress ring — SVG donut with a centered value. Used for at-a-glance
// completion stats (milestones complete, applications submitted, etc.).

type ProgressRingProps = {
  value: number; // 0-1
  size?: number;
  stroke?: number;
  label?: string;
  trackColor?: string;
  fillColor?: string;
  children?: React.ReactNode;
};

export function ProgressRing({
  value,
  size = 64,
  stroke = 6,
  label,
  trackColor = "color-mix(in oklab, currentColor 12%, transparent)",
  fillColor = "currentColor",
  children,
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(1, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={fillColor}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children ?? (
          <>
            <span className="num-display text-base font-semibold leading-none">
              {Math.round(clamped * 100)}
            </span>
            {label && (
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">
                {label}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
