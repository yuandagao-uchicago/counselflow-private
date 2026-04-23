"use client";

import { GraduationCap, Sparkles } from "lucide-react";

interface JourneyCompleteProps {
  completed: number;
  total: number;
  nextTitle: string | null;
}

export function JourneyComplete({ completed, total, nextTitle }: JourneyCompleteProps) {
  const allDone = completed === total;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-foreground/[0.08] bg-gradient-to-br from-[oklch(0.22_0.08_300)] via-[oklch(0.18_0.06_280)] to-[oklch(0.2_0.05_255)] p-8 md:p-10">
      {/* Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-[oklch(0.65_0.2_265_/_20%)] blur-3xl rounded-full pointer-events-none" />

      <div className="relative text-center space-y-4">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[oklch(0.65_0.2_265)] to-[oklch(0.55_0.22_290)] shadow-xl shadow-[oklch(0.65_0.2_265_/_40%)] rotate-6">
          <GraduationCap className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-3xl md:text-4xl font-black tracking-tight uppercase">
          {allDone ? (
            <>
              <span className="gradient-text">Application Complete</span>
            </>
          ) : (
            <>
              Keep the <span className="gradient-text">momentum</span>
            </>
          )}
        </h2>
        <p className="text-base text-muted-foreground max-w-lg mx-auto leading-relaxed">
          {allDone
            ? "All checkpoints complete. Time to submit and wait for good news."
            : `You've knocked out ${completed} of ${total} checkpoints. Every step forward compounds — keep pushing.`}
        </p>
        {!allDone && nextTitle && (
          <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[oklch(0.65_0.2_265)] to-[oklch(0.55_0.22_290)] px-5 py-2.5 text-white shadow-lg shadow-[oklch(0.65_0.2_265_/_30%)]">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-semibold">Up next · {nextTitle}</span>
          </div>
        )}
      </div>
    </div>
  );
}
