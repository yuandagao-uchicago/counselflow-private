"use client";

import { Sparkles, CheckCircle2 } from "lucide-react";

export function JourneyCallout() {
  return (
    <div className="rounded-2xl border border-[oklch(0.34_0.13_25_/_15%)] bg-gradient-to-r from-[oklch(0.34_0.13_25_/_8%)] via-[oklch(0.34_0.13_25_/_4%)] to-transparent p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[oklch(0.34_0.13_25)] to-[oklch(0.34_0.13_25)] shadow-lg shadow-[oklch(0.34_0.13_25_/_30%)]">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div className="space-y-1">
          <p className="font-semibold">Work at your own pace</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The path is a guide, not a straitjacket. Work on{" "}
            <span className="text-foreground font-medium">multiple sections simultaneously</span> —
            jump around, return later. Every milestone you hit gives you more time for the others.
          </p>
          <div className="flex items-center gap-1.5 pt-1 text-xs text-[oklch(0.66_0.15_75)]">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Click any node to update its status</span>
          </div>
        </div>
      </div>
    </div>
  );
}
