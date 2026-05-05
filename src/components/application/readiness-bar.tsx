"use client";

import { stateMeta } from "./readiness-meta";
import type { ReadinessState } from "@/lib/readiness";

/**
 * The readiness bar is the single most-recurring visual atom in this feature.
 * It needs to look the same on a list row, on a detail header, on the
 * counselor dashboard, and inside the student case file. Implementation is
 * intentionally minimal — a track + a fill + an optional label — so it
 * composes cleanly at multiple sizes.
 */
export function ReadinessBar({
  pct,
  state,
  doneRequired,
  totalRequired,
  size = "md",
  showLabel = true,
}: {
  pct: number;
  state: ReadinessState;
  doneRequired: number;
  totalRequired: number;
  size?: "sm" | "md";
  showLabel?: boolean;
}) {
  const isComplete = state === "SUBMITTED" || state === "READY_FOR_REVIEW";

  const fillClass = isComplete
    ? "bg-gradient-to-r from-emerald-500/80 to-emerald-400"
    : pct === 0
      ? "bg-foreground/10"
      : "bg-gradient-to-r from-[oklch(0.65_0.2_265)] to-[oklch(0.6_0.22_290)]";

  const trackHeight = size === "sm" ? "h-1.5" : "h-2";

  return (
    <div className="space-y-1.5">
      {showLabel && (
        <div className="flex items-center justify-between text-xs">
          <span className={isComplete ? "text-emerald-300 font-medium" : "text-muted-foreground"}>
            {stateMeta[state].label}
          </span>
          <span className="text-muted-foreground tabular-nums">
            {doneRequired}/{totalRequired}{" "}
            <span className="text-muted-foreground/50">· {pct}%</span>
          </span>
        </div>
      )}
      <div className={`w-full ${trackHeight} rounded-full bg-foreground/[0.06] overflow-hidden`}>
        <div
          className={`${trackHeight} ${fillClass} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${Math.max(2, pct)}%` }}
        />
      </div>
    </div>
  );
}
