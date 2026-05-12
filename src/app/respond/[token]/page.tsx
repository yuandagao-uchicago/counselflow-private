"use client";

import { use, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  Sparkles,
  AlertTriangle,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

/**
 * Public student-facing meeting-response page. Reached via the magic link in
 * the request email. No login. The token in the URL is the only credential.
 */
export default function RespondPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const utils = trpc.useUtils();
  const { data, isLoading, error } = trpc.publicMeeting.getByToken.useQuery({ token });

  const [counterAt, setCounterAt] = useState<string>("");
  const [counterNote, setCounterNote] = useState<string>("");
  const [showCounter, setShowCounter] = useState(false);
  // Snapshot "now" at mount so we don't call Date.now() during render
  // (impure-function lint). Stale-after-mount is fine — slots that flip
  // to past during the same session are vanishingly rare.
  const [nowMs] = useState(() => Date.now());

  const accept = trpc.publicMeeting.acceptSlot.useMutation({
    onSuccess: () => {
      utils.publicMeeting.getByToken.invalidate({ token });
      toast.success("Confirmed! Check your inbox.");
    },
    onError: (e) => toast.error(e.message),
  });

  const propose = trpc.publicMeeting.proposeAlternative.useMutation({
    onSuccess: () => {
      utils.publicMeeting.getByToken.invalidate({ token });
      toast.success("Sent! We'll let your counselor know.");
      setShowCounter(false);
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <Shell>
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading…
        </div>
      </Shell>
    );
  }

  if (error || !data) {
    return (
      <Shell>
        <Center>
          <AlertTriangle className="h-10 w-10 text-amber-400 mb-3" />
          <h1 className="text-lg font-semibold mb-1">Link not found</h1>
          <p className="text-sm text-muted-foreground/70 max-w-sm">
            {error?.message ?? "This invitation link is invalid or has been revoked."}
          </p>
        </Center>
      </Shell>
    );
  }

  if (data.expired) {
    return (
      <Shell>
        <Center>
          <Clock className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <h1 className="text-lg font-semibold mb-1">This link has expired</h1>
          <p className="text-sm text-muted-foreground/70 max-w-sm">
            Reach out to {data.counselor.name} directly to schedule a new time.
          </p>
        </Center>
      </Shell>
    );
  }

  if (data.cancelled) {
    return (
      <Shell>
        <Center>
          <AlertTriangle className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <h1 className="text-lg font-semibold mb-1">Request cancelled</h1>
          <p className="text-sm text-muted-foreground/70 max-w-sm">
            {data.counselor.name} cancelled this meeting request. Watch your email for a new one.
          </p>
        </Center>
      </Shell>
    );
  }

  if (data.confirmed) {
    const chosen = data.slots.find((s) => s.status === "CHOSEN");
    return (
      <Shell>
        <Center>
          <CheckCircle2 className="h-10 w-10 text-emerald-400 mb-3" />
          <h1 className="text-lg font-semibold mb-1">You&rsquo;re confirmed</h1>
          {chosen && (
            <p className="text-sm text-muted-foreground/80 max-w-sm">
              Locked in for{" "}
              <span className="text-foreground font-medium">
                {fmt(chosen.startAt, data.counselor.timezone)}
              </span>
              . Check your inbox for the calendar invite.
            </p>
          )}
        </Center>
      </Shell>
    );
  }

  if (data.status === "COUNTER_PROPOSED" && data.counterProposalAt) {
    return (
      <Shell>
        <Center>
          <Send className="h-10 w-10 text-[oklch(0.66_0.15_75)] mb-3" />
          <h1 className="text-lg font-semibold mb-1">Sent to {data.counselor.name}</h1>
          <p className="text-sm text-muted-foreground/70 max-w-sm">
            You proposed{" "}
            <span className="text-foreground font-medium">
              {fmt(data.counterProposalAt, data.counselor.timezone)}
            </span>
            . You&rsquo;ll get an email once they confirm or counter-propose.
          </p>
        </Center>
      </Shell>
    );
  }

  // Default: show slot picker.
  const studentName = data.student.preferredName ?? data.student.firstName;

  return (
    <Shell>
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground/70 mb-2 flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-[oklch(0.66_0.15_75)]" />
          {data.counselor.name} via CounselFlow
        </p>
        <h1 className="text-2xl font-bold tracking-tight">
          Hi {studentName} — pick a time
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          {data.counselor.name} would like to schedule a{" "}
          <span className="text-foreground font-medium">
            {data.durationMins}-minute {data.meetingType.toLowerCase()}
          </span>{" "}
          with you.
        </p>
      </header>

      {data.message && (
        <div className="mb-6 rounded-xl border border-[oklch(0.34_0.13_25_/_20%)] bg-[oklch(0.34_0.13_25_/_6%)] p-4">
          <p className="text-sm text-muted-foreground italic leading-relaxed whitespace-pre-wrap">
            &ldquo;{data.message}&rdquo;
          </p>
        </div>
      )}

      <div className="space-y-2 mb-6">
        {data.slots.map((slot) => {
          const isPast = new Date(slot.startAt).getTime() < nowMs;
          return (
            <button
              key={slot.id}
              onClick={() => accept.mutate({ token, slotId: slot.id })}
              disabled={accept.isPending || isPast}
              className="group w-full flex items-center justify-between gap-4 rounded-xl border border-foreground/[0.08] bg-card hover:border-[oklch(0.34_0.13_25_/_40%)] hover:bg-[oklch(0.34_0.13_25_/_5%)] transition-all p-4 text-left disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-foreground/[0.04] group-hover:bg-[oklch(0.34_0.13_25_/_15%)] group-hover:text-[oklch(0.66_0.15_75)] transition-colors">
                  <Calendar className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium leading-tight">
                    {fmt(slot.startAt, data.counselor.timezone)}
                  </p>
                  {isPast && (
                    <p className="text-xs text-muted-foreground/60 mt-0.5">No longer available</p>
                  )}
                </div>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground group-hover:text-[oklch(0.66_0.15_75)] font-medium">
                {accept.isPending && accept.variables?.slotId === slot.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Pick →"
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* Counter-propose */}
      {!showCounter ? (
        <button
          onClick={() => setShowCounter(true)}
          className="text-sm text-[oklch(0.66_0.15_75)] hover:underline"
        >
          None of these work? Propose a different time →
        </button>
      ) : (
        <div className="rounded-xl border border-foreground/[0.08] bg-card p-4 space-y-3">
          <div>
            <h3 className="text-sm font-semibold">Propose a different time</h3>
            <p className="text-xs text-muted-foreground/70 mt-0.5">
              {data.counselor.name} will get notified and either confirm or counter-propose.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="counter-at">Your preferred time</Label>
            <Input
              id="counter-at"
              type="datetime-local"
              value={counterAt}
              onChange={(e) => setCounterAt(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="counter-note">Optional note</Label>
            <Textarea
              id="counter-note"
              value={counterNote}
              onChange={(e) => setCounterNote(e.target.value)}
              placeholder="Why this time works better, or any context…"
              maxLength={500}
              className="min-h-[72px]"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => {
                if (!counterAt) {
                  toast.error("Pick a time first");
                  return;
                }
                propose.mutate({
                  token,
                  startAt: new Date(counterAt),
                  note: counterNote || null,
                });
              }}
              disabled={propose.isPending}
            >
              {propose.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : null}
              Send proposal
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowCounter(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground/50 mt-8 text-center">
        Link expires {new Date(data.expiresAt).toLocaleDateString()} · Powered by CounselFlow
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-start sm:items-center justify-center px-4 py-10 bg-background">
      <div className="w-full max-w-lg rounded-2xl border border-foreground/[0.06] bg-card p-6 sm:p-8 shadow-2xl">
        {children}
      </div>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col items-center text-center py-6">{children}</div>;
}

function fmt(d: string | Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(d));
}
