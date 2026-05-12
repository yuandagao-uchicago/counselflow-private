"use client";

import { useState } from "react";
import { Bot, Loader2, RefreshCw } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const statusStyles: Record<string, { label: string; className: string }> = {
  scheduled: { label: "Scheduled", className: "bg-blue-500/15 text-blue-400" },
  joining_call: { label: "Joining…", className: "bg-amber-500/15 text-amber-400" },
  in_call_recording: {
    label: "Recording",
    className: "bg-emerald-500/15 text-emerald-400",
  },
  in_call_not_recording: {
    label: "In call",
    className: "bg-blue-500/15 text-blue-400",
  },
  call_ended: { label: "Call ended", className: "bg-muted-foreground/15 text-muted-foreground" },
  done: { label: "Done", className: "bg-emerald-500/15 text-emerald-400" },
  fatal: { label: "Failed", className: "bg-red-500/15 text-red-400" },
};

export function RecallBotPanel({
  meetingId,
  existingMeetingUrl,
  existingBotId,
  existingBotStatus,
  onProcessed,
}: {
  meetingId: string;
  existingMeetingUrl: string | null;
  existingBotId: string | null;
  existingBotStatus: string | null;
  onProcessed?: () => void;
}) {
  const [url, setUrl] = useState(existingMeetingUrl || "");
  const utils = trpc.useUtils();

  const sendBot = trpc.integration.recall.sendBot.useMutation({
    onSuccess: (res) => {
      toast.success("Bot scheduled");
      utils.meeting.getById.invalidate({ id: meetingId });
    },
    onError: (err) => toast.error(err.message || "Failed to send bot"),
  });

  const refresh = trpc.integration.recall.refreshBotStatus.useMutation({
    onSuccess: (res) => {
      if (res.processed) {
        utils.review.pendingCount.invalidate();
        toast.success(`Transcript processed — ${res.tasksCreated} tasks created`);
        onProcessed?.();
      } else {
        toast.info(`Status: ${res.status}`);
      }
      utils.meeting.getById.invalidate({ id: meetingId });
    },
    onError: (err) => toast.error(err.message || "Failed to refresh"),
  });

  const statusMeta = existingBotStatus ? statusStyles[existingBotStatus] : null;

  return (
    <div className="rounded-2xl border border-foreground/[0.06] bg-card p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-[oklch(0.66_0.15_75)]" />
          <h3 className="font-semibold">AI Meeting Bot</h3>
        </div>
        {statusMeta && (
          <Badge className={`${statusMeta.className} border-0`}>
            {statusMeta.label}
          </Badge>
        )}
      </div>

      {existingBotId ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Bot will join <span className="font-mono text-xs">{existingMeetingUrl}</span>,
            record the meeting, and send the transcript back. Summary runs automatically when
            the call ends.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="border-foreground/10 bg-foreground/5 hover:bg-foreground/10"
            onClick={() => refresh.mutate({ meetingId })}
            disabled={refresh.isPending}
          >
            {refresh.isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Checking…
              </>
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Check status / pull transcript
              </>
            )}
          </Button>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Paste a Zoom, Google Meet, or Teams meeting URL. A bot will join, record, and
            transcribe the meeting, then run the AI summary automatically.
          </p>
          <div className="flex gap-2">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://zoom.us/j/12345… or https://meet.google.com/…"
              className="bg-foreground/5 border-foreground/10 text-sm"
            />
            <Button
              className="bg-gradient-to-r from-[oklch(0.34_0.13_25)] to-[oklch(0.34_0.13_25)] text-white border-0 shrink-0"
              disabled={!url || sendBot.isPending}
              onClick={() =>
                sendBot.mutate({ meetingId, meetingUrl: url })
              }
            >
              {sendBot.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Sending…
                </>
              ) : (
                "Send bot"
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
