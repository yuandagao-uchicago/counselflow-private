"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, Loader2, CheckCircle2, FileText, Send, Clock, User, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { PrepBriefView } from "@/components/meeting/prep-brief-view";
import { SummaryView } from "@/components/meeting/summary-view";

export default function MeetingDetailPage({
  params,
}: {
  params: Promise<{ studentId: string; meetingId: string }>;
}) {
  const { studentId, meetingId } = use(params);
  const [rawNotes, setRawNotes] = useState("");
  const utils = trpc.useUtils();

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
      toast.success(`Summary generated! ${data.tasksCreated} tasks created.`);
      setRawNotes("");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to process notes");
    },
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
  const prepBrief = meeting.prepBrief ? JSON.parse(meeting.prepBrief) : null;
  const hasSummary = !!meeting.summary;

  // Determine phase
  const phase = hasSummary ? "complete" : prepBrief ? "ready" : "prep";

  return (
    <div className="max-w-4xl mx-auto space-y-6 page-enter">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" render={<Link href={`/students/${studentId}/meetings`} />}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Meetings
        </Button>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-card to-card/80 p-6">
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
            <div className="w-6 h-px bg-white/10" />
            <PhaseStep label="Meeting" done={hasSummary} active={phase === "ready"} />
            <div className="w-6 h-px bg-white/10" />
            <PhaseStep label="Summary" done={hasSummary} active={phase === "complete"} />
          </div>
        </div>
      </div>

      {/* Phase 1: Prep Brief */}
      {!prepBrief && (
        <div className="rounded-2xl border border-dashed border-white/10 bg-card/50 p-8 text-center">
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
        <div className="rounded-2xl border border-white/[0.06] bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[oklch(0.65_0.2_265)]" />
            <h2 className="text-lg font-semibold">Post-Meeting Notes</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Paste your meeting notes or transcript below. AI will extract a structured summary, action items, and draft a follow-up email.
          </p>
          <Textarea
            placeholder="Paste your meeting notes here...&#10;&#10;Example:&#10;- Discussed college list, decided to drop Northwestern&#10;- Sarah finished Common App essay, needs to start UC essays&#10;- SAT score came back: 1480 (up from 1420)&#10;- Need to request LOR from Mr. Chen by next week..."
            value={rawNotes}
            onChange={(e) => setRawNotes(e.target.value)}
            className="min-h-[200px] bg-white/5 border-white/10 text-sm"
          />
          <div className="flex justify-end">
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

      {/* Phase 3: Summary Display */}
      {hasSummary && meeting.actionItems && meeting.decisions && (
        <SummaryView
          summary={meeting.summary!}
          actionItems={meeting.actionItems as unknown as Array<{ title: string; owner: string; dueDate?: string; priority: string }>}
          decisions={meeting.decisions as unknown as Array<{ decision: string; context: string }>}
        />
      )}
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
          : "bg-white/5 text-muted-foreground/50"
      }`}>
        {done ? <CheckCircle2 className="h-4 w-4" /> : <span>{label[0]}</span>}
      </div>
      <span className={`text-[10px] ${active ? "text-foreground font-medium" : "text-muted-foreground"}`}>
        {label}
      </span>
    </div>
  );
}
