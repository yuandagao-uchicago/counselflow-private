"use client";

import { useState } from "react";
import { Loader2, Video, RefreshCw, Download } from "lucide-react";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export function ZoomImportPanel({
  meetingId,
  onImported,
}: {
  meetingId: string;
  onImported?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { data, isLoading, refetch, isFetching } = trpc.integration.zoom.listRecentRecordings.useQuery(
    undefined,
    { enabled: expanded }
  );

  const utils = trpc.useUtils();
  const importMutation = trpc.integration.zoom.importRecording.useMutation({
    onSuccess: (res) => {
      utils.review.pendingCount.invalidate();
      toast.success(
        `Imported Zoom transcript (${res.transcriptChars.toLocaleString()} chars) — ${res.tasksCreated} tasks created`
      );
      onImported?.();
    },
    onError: (err) => toast.error(err.message || "Failed to import"),
  });

  return (
    <div className="rounded-2xl border border-foreground/[0.06] bg-card p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Video className="h-4 w-4 text-[oklch(0.7_0.18_220)]" />
          <h3 className="font-semibold">Import from Zoom</h3>
        </div>
        <div className="flex items-center gap-2">
          {expanded && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="border-foreground/10 bg-foreground/5 hover:bg-foreground/10"
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? "Hide" : "Show recent recordings"}
          </Button>
        </div>
      </div>

      {expanded && (
        <>
          {isLoading ? (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading recordings…
            </div>
          ) : !data?.recordings.length ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No cloud recordings with transcripts found in the last 30 days.
              Make sure cloud recording + audio transcription are enabled in your Zoom account.
            </p>
          ) : (
            <div className="space-y-2">
              {data.recordings.map((rec) => {
                if (!rec) return null;
                const isImporting =
                  importMutation.isPending &&
                  importMutation.variables?.downloadUrl === rec.downloadUrl;
                return (
                  <div
                    key={rec.uuid}
                    className="flex items-center justify-between gap-3 rounded-xl bg-foreground/[0.03] p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{rec.topic}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(rec.startTime), "MMM d, h:mm a")}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          · {rec.duration} min
                        </span>
                        {rec.fileStatus !== "completed" && (
                          <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-400 border-0">
                            {rec.fileStatus}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-[oklch(0.65_0.2_265)] to-[oklch(0.55_0.22_290)] text-white border-0"
                      disabled={
                        rec.fileStatus !== "completed" || importMutation.isPending
                      }
                      onClick={() =>
                        importMutation.mutate({
                          meetingId,
                          downloadUrl: rec.downloadUrl,
                          zoomRecordingId: String(rec.id),
                        })
                      }
                    >
                      {isImporting ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                          Importing…
                        </>
                      ) : (
                        <>
                          <Download className="h-3.5 w-3.5 mr-1.5" />
                          Import
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
