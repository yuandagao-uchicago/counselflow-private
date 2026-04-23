"use client";

import { use, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Sparkles, Loader2, CheckCircle2, FileText, Trash2, Upload, Video, Bot } from "lucide-react";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { PageTransition } from "@/components/shared/motion";
import { PrepBriefView } from "@/components/meeting/prep-brief-view";
import { SummaryView } from "@/components/meeting/summary-view";
import { parseVTT } from "@/lib/vtt-parser";
import type { MeetingPrep } from "@/ai/schemas/meetingPrep";

export default function MeetingDetailPage({
  params,
}: {
  params: Promise<{ studentId: string; meetingId: string }>;
}) {
  const { studentId, meetingId } = use(params);
  const router = useRouter();
  const [rawNotes, setRawNotes] = useState("");
  const [importedFileName, setImportedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  async function handleTranscriptUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_SIZE = 2 * 1024 * 1024; // 2MB — transcripts are text; this is generous
    if (file.size > MAX_SIZE) {
      toast.error("Transcript too large (max 2MB). Make sure you're uploading the .vtt/.txt transcript, not the video.");
      return;
    }

    try {
      const text = await file.text();
      const isVTT = file.name.toLowerCase().endsWith(".vtt") || text.trimStart().startsWith("WEBVTT");
      const parsed = isVTT ? parseVTT(text) : text.trim();

      if (parsed.length < 10) {
        toast.error("Transcript appears to be empty.");
        return;
      }

      setRawNotes(parsed);
      setImportedFileName(file.name);
      toast.success(`Imported ${file.name}`);
    } catch (err) {
      toast.error("Failed to read file");
      console.error(err);
    } finally {
      // Reset so the same file can be re-picked if needed
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const { data: meeting, isLoading } = trpc.meeting.getById.useQuery({ id: meetingId });

  const generatePrep = trpc.meeting.generatePrepBrief.useMutation({
    onSuccess: () => {
      utils.meeting.getById.invalidate({ id: meetingId });
      toast.success("Prep brief generated!");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to generate prep brief");
    },
  });

  const submitNotes = trpc.meeting.submitNotes.useMutation({
    onSuccess: (data) => {
      utils.meeting.getById.invalidate({ id: meetingId });
      utils.review.pendingCount.invalidate();
      const parts: string[] = [`${data.tasksCreated} tasks created`];
      if (data.reviewQueueItemId) parts.push("follow-up email awaiting approval");
      toast.success(`Summary generated — ${parts.join(", ")}.`);
      setRawNotes("");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to process notes");
    },
  });

  const deleteMeeting = trpc.meeting.delete.useMutation({
    onSuccess: () => {
      utils.meeting.list.invalidate({ studentId });
      utils.student.getById.invalidate({ id: studentId });
      utils.dashboard.stats.invalidate();
      utils.dashboard.upcomingMeetings.invalidate();
      toast.success("Meeting deleted");
      router.push(`/students/${studentId}/meetings`);
    },
    onError: (err) => toast.error(err.message || "Failed to delete meeting"),
  });

  if (isLoading) {
    return (
      <div className="space-y-6 page-enter">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (!meeting) {
    return <p className="text-muted-foreground">Meeting not found.</p>;
  }

  const date = new Date(meeting.scheduledAt);
  const prepBrief = safeParse(meeting.prepBrief) as MeetingPrep | null;
  const hasSummary = !!meeting.summary;

  // Determine phase
  const phase = hasSummary ? "complete" : prepBrief ? "ready" : "prep";

  return (
    <PageTransition>
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" render={<Link href={`/students/${studentId}/meetings`} />}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Meetings
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
          onClick={() => {
            if (confirm("Delete this meeting?")) {
              deleteMeeting.mutate({ id: meetingId });
            }
          }}
        >
          <Trash2 className="mr-1 h-4 w-4" />
          Delete
        </Button>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-foreground/[0.06] bg-gradient-to-br from-card to-card/80 p-6">
        <div className="absolute inset-0 bg-gradient-to-r from-[oklch(0.65_0.2_265_/_5%)] to-transparent pointer-events-none" />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{format(date, "EEEE, MMMM d, yyyy")}</p>
            <h1 className="text-2xl font-bold mt-1">{meeting.type}</h1>
            <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
              <span>{format(date, "h:mm a")}</span>
              {meeting.location && <span>· {meeting.location}</span>}
              <span>· {meeting.student.firstName} {meeting.student.lastName}</span>
            </div>
          </div>

          {/* Phase indicator */}
          <div className="flex items-center gap-2">
            <PhaseStep label="Prep" done={!!prepBrief} active={phase === "prep"} />
            <div className="w-6 h-px bg-foreground/10" />
            <PhaseStep label="Meeting" done={hasSummary} active={phase === "ready"} />
            <div className="w-6 h-px bg-foreground/10" />
            <PhaseStep label="Summary" done={hasSummary} active={phase === "complete"} />
          </div>
        </div>
      </div>

      {/* Phase 1: Prep Brief */}
      {!prepBrief && (
        <div className="rounded-2xl border border-dashed border-foreground/10 bg-card/50 p-8 text-center">
          <Sparkles className="mx-auto h-10 w-10 text-[oklch(0.65_0.2_265)] mb-3" />
          <h2 className="text-lg font-semibold">Generate Prep Brief</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            AI will analyze the student&apos;s profile, open tasks, milestones, and previous meetings to create a comprehensive preparation brief.
          </p>
          <Button
            className="mt-5 bg-gradient-to-r from-[oklch(0.65_0.2_265)] to-[oklch(0.55_0.22_290)] text-white border-0 shadow-lg shadow-[oklch(0.65_0.2_265_/_20%)]"
            size="lg"
            onClick={() => generatePrep.mutate({ meetingId })}
            disabled={generatePrep.isPending}
          >
            {generatePrep.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Prep Brief
              </>
            )}
          </Button>
        </div>
      )}

      {/* Prep Brief Display */}
      {prepBrief && <PrepBriefView prep={prepBrief} />}

      {/* Phase 2: Post-Meeting Notes */}
      {prepBrief && !hasSummary && (
        <div className="rounded-2xl border border-foreground/[0.06] bg-card p-6 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[oklch(0.65_0.2_265)]" />
              <h2 className="text-lg font-semibold">Post-Meeting Notes</h2>
            </div>
            <div className="flex items-center gap-2">
              {importedFileName && (
                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border-0">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {importedFileName}
                </Badge>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".vtt,.txt"
                onChange={handleTranscriptUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                className="border-foreground/10 bg-foreground/5 hover:bg-foreground/10"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                Import Transcript (.vtt)
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Paste notes below, or import a <code className="px-1 py-0.5 rounded bg-foreground/5 text-xs">.vtt</code> transcript
            from Zoom / Meet / Teams. AI will extract a summary, action items, and draft a follow-up email.
          </p>
          <Textarea
            placeholder="Paste your meeting notes or transcript here, or click Import Transcript above...&#10;&#10;Example:&#10;- Discussed college list, decided to drop Northwestern&#10;- Sarah finished Common App essay, needs to start UC essays&#10;- SAT score came back: 1480 (up from 1420)&#10;- Need to request LOR from Mr. Chen by next week..."
            value={rawNotes}
            onChange={(e) => {
              setRawNotes(e.target.value);
              if (importedFileName) setImportedFileName(null);
            }}
            className="min-h-[200px] bg-foreground/5 border-foreground/10 text-sm"
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {rawNotes.length > 0 && `${rawNotes.length.toLocaleString()} characters`}
            </p>
            <Button
              className="bg-gradient-to-r from-[oklch(0.65_0.2_265)] to-[oklch(0.55_0.22_290)] text-white border-0 shadow-lg shadow-[oklch(0.65_0.2_265_/_20%)]"
              onClick={() => submitNotes.mutate({ meetingId, rawNotes })}
              disabled={submitNotes.isPending || rawNotes.length < 10}
            >
              {submitNotes.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Convert to Summary + Action Items
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Upcoming integrations — shown as placeholders so counselors know what's coming */}
      {prepBrief && !hasSummary && <UpcomingIntegrations />}

      {/* Phase 3: Summary Display */}
      {hasSummary && meeting.actionItems && meeting.decisions && (
        <SummaryView
          summary={meeting.summary!}
          actionItems={meeting.actionItems as unknown as Array<{ title: string; owner: string; dueDate?: string; priority: string }>}
          decisions={meeting.decisions as unknown as Array<{ decision: string; context: string }>}
        />
      )}
    </div>
    </PageTransition>
  );
}

function safeParse(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    console.error("Failed to parse stored JSON");
    return null;
  }
}

function UpcomingIntegrations() {
  return (
    <div className="rounded-2xl border border-dashed border-foreground/10 bg-card/40 p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-[oklch(0.75_0.15_265)]" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Coming soon
        </h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <UpcomingCard
          icon={<Video className="h-4 w-4 text-[oklch(0.7_0.18_220)]" />}
          title="Direct Zoom sync"
          copy="Pull cloud recording transcripts with one click after each Zoom meeting."
        />
        <UpcomingCard
          icon={<Bot className="h-4 w-4 text-[oklch(0.75_0.15_265)]" />}
          title="AI meeting bot"
          copy="A bot joins live Zoom / Meet / Teams calls, records, and summarizes automatically."
        />
      </div>
    </div>
  );
}

function UpcomingCard({ icon, title, copy }: { icon: React.ReactNode; title: string; copy: string }) {
  return (
    <div className="rounded-xl bg-foreground/[0.03] p-4 space-y-1.5">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground/5">
          {icon}
        </div>
        <p className="text-sm font-medium">{title}</p>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{copy}</p>
    </div>
  );
}

function PhaseStep({ label, done, active }: { label: string; done: boolean; active: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
        done
          ? "bg-emerald-500/20 text-emerald-400"
          : active
          ? "bg-[oklch(0.65_0.2_265_/_20%)] text-[oklch(0.75_0.15_265)] ring-2 ring-[oklch(0.65_0.2_265_/_30%)]"
          : "bg-foreground/5 text-muted-foreground/50"
      }`}>
        {done ? <CheckCircle2 className="h-4 w-4" /> : <span>{label[0]}</span>}
      </div>
      <span className={`text-[10px] ${active ? "text-foreground font-medium" : "text-muted-foreground"}`}>
        {label}
      </span>
    </div>
  );
}
