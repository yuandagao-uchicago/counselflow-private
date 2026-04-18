"use client";

import { CheckCircle2, Circle, Lock, SkipForward } from "lucide-react";

interface Milestone {
  id: string;
  title: string;
  status: string;
  category: string;
  targetDate: string | Date | null;
}

const statusConfig: Record<string, { icon: typeof Circle; color: string }> = {
  COMPLETED: { icon: CheckCircle2, color: "text-emerald-400" },
  IN_PROGRESS: { icon: Circle, color: "text-[oklch(0.65_0.2_265)]" },
  BLOCKED: { icon: Lock, color: "text-red-400" },
  SKIPPED: { icon: SkipForward, color: "text-muted-foreground" },
  NOT_STARTED: { icon: Circle, color: "text-white/20" },
};

export function MilestonesCard({ milestones }: { milestones: Milestone[] }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-card p-5 glow-card">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
        Milestones
      </h3>

      {milestones.length === 0 ? (
        <p className="text-sm text-muted-foreground/50 text-center py-6">
          No milestones yet.
        </p>
      ) : (
        <div className="space-y-1">
          {milestones.map((milestone, i) => {
            const config = statusConfig[milestone.status] || statusConfig.NOT_STARTED;
            const Icon = config.icon;
            const isLast = i === milestones.length - 1;

            return (
              <div key={milestone.id} className="flex items-start gap-3 py-1.5">
                {/* Timeline line + dot */}
                <div className="flex flex-col items-center">
                  <Icon className={`h-4 w-4 shrink-0 ${config.color}`} />
                  {!isLast && (
                    <div className="w-px flex-1 min-h-[16px] bg-white/10 mt-1" />
                  )}
                </div>

                {/* Content */}
                <div className="pb-1">
                  <p className={`text-sm leading-tight ${
                    milestone.status === "COMPLETED" ? "text-muted-foreground line-through" : "font-medium"
                  }`}>
                    {milestone.title}
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">
                    {milestone.category}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
