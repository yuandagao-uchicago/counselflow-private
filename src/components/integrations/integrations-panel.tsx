"use client";

import { Video, Bot, Upload, FileText, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * Integrations panel — for MVP we support one flow end-to-end:
 *   Manual upload of a .vtt transcript (works with Zoom, Google Meet, Teams).
 * Zoom OAuth and AI meeting bot exist in the codebase but are gated behind
 * paid setup (Zoom Pro / Recall.ai per-hour billing), so we label them as
 * "Coming soon" until we decide on pricing and turn them on for users.
 */
export function IntegrationsPanel() {
  return (
    <div className="rounded-2xl border border-foreground/[0.06] bg-card p-6 space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Meeting capture</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          How transcripts flow into CounselFlow&apos;s AI pipeline.
        </p>
      </div>

      <div className="space-y-3">
        {/* Manual paste — always available */}
        <IntegrationRow
          icon={<FileText className="h-5 w-5 text-emerald-400" />}
          name="Paste meeting notes"
          status="available"
          description="Type or paste notes directly into any meeting page and click Convert to Summary."
        />

        {/* VTT upload — available */}
        <IntegrationRow
          icon={<Upload className="h-5 w-5 text-emerald-400" />}
          name="Transcript upload (.vtt)"
          status="available"
          description="After a recorded meeting, upload the transcript file. Works with Zoom, Google Meet, Teams, or anything that exports WebVTT."
        />

        {/* Zoom direct — coming soon */}
        <IntegrationRow
          icon={<Video className="h-5 w-5 text-[oklch(0.7_0.18_220)]" />}
          name="Direct Zoom sync"
          status="coming_soon"
          description="Connect your Zoom account once; transcripts flow in automatically after every cloud recording."
        />

        {/* Recall.ai bot — coming soon */}
        <IntegrationRow
          icon={<Bot className="h-5 w-5 text-[oklch(0.66_0.15_75)]" />}
          name="AI meeting bot"
          status="coming_soon"
          description="A notetaker joins your Zoom / Meet / Teams calls, records, transcribes, and runs the AI summary automatically."
        />
      </div>

      <div className="rounded-xl bg-gradient-to-br from-[oklch(0.34_0.13_25_/_10%)] to-transparent border border-[oklch(0.34_0.13_25_/_15%)] p-4 flex items-start gap-3">
        <Sparkles className="h-4 w-4 text-[oklch(0.66_0.15_75)] shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          Every path feeds the same AI pipeline: a structured meeting summary, extracted tasks, and a draft follow-up email that enters the approval queue for your review.
        </p>
      </div>
    </div>
  );
}

type Status = "available" | "coming_soon";

function IntegrationRow(props: {
  icon: React.ReactNode;
  name: string;
  description: string;
  status: Status;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl bg-foreground/[0.03] p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-foreground/5">
          {props.icon}
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium">{props.name}</p>
            {props.status === "available" ? (
              <Badge className="bg-emerald-500/15 text-emerald-400 border-0 text-[10px]">
                Available
              </Badge>
            ) : (
              <Badge className="bg-amber-500/15 text-amber-400 border-0 text-[10px]">
                Coming soon
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
            {props.description}
          </p>
        </div>
      </div>
    </div>
  );
}
