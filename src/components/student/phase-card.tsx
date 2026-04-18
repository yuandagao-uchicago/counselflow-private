"use client";

const phases = [
  { key: "EXPLORATION", label: "Exploration" },
  { key: "LIST_BUILDING", label: "List Building" },
  { key: "TESTING", label: "Testing" },
  { key: "APPLICATIONS", label: "Applications" },
  { key: "ESSAYS", label: "Essays" },
  { key: "SUBMISSIONS", label: "Submissions" },
  { key: "DECISIONS", label: "Decisions" },
  { key: "ENROLLMENT", label: "Enrollment" },
];

export function PhaseCard({ phase }: { phase: string }) {
  const currentIndex = phases.findIndex((p) => p.key === phase);

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-card p-5 glow-card">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
        Current Phase
      </h3>
      <div className="space-y-2">
        {phases.map((p, i) => {
          const isComplete = i < currentIndex;
          const isCurrent = i === currentIndex;
          const isFuture = i > currentIndex;

          return (
            <div key={p.key} className="flex items-center gap-3">
              {/* Step indicator */}
              <div className="relative flex items-center justify-center">
                <div
                  className={`h-3 w-3 rounded-full transition-all ${
                    isCurrent
                      ? "bg-gradient-to-r from-[oklch(0.65_0.2_265)] to-[oklch(0.6_0.22_290)] shadow-lg shadow-[oklch(0.65_0.2_265_/_40%)]"
                      : isComplete
                      ? "bg-emerald-500"
                      : "bg-white/10"
                  }`}
                />
                {isCurrent && (
                  <div className="absolute h-3 w-3 rounded-full bg-[oklch(0.65_0.2_265)] animate-ping opacity-30" />
                )}
              </div>

              {/* Label */}
              <span
                className={`text-sm ${
                  isCurrent
                    ? "font-semibold text-foreground"
                    : isComplete
                    ? "text-muted-foreground line-through"
                    : "text-muted-foreground/50"
                }`}
              >
                {p.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
