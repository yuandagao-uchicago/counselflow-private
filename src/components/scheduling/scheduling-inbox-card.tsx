"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Calendar,
  Check,
  Copy,
  ExternalLink,
  Inbox,
  Loader2,
  MailQuestion,
  RefreshCw,
  X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";

/**
 * Scheduling inbox: shows requests that need the counselor's attention —
 * student counter-proposals at the top, awaiting-student requests below.
 *
 * Lives on the dashboard; can also be embedded elsewhere.
 */
export function SchedulingInboxCard() {
  const utils = trpc.useUtils();

  const { data: counterProposed, isLoading: l1 } = trpc.meetingRequest.list.useQuery({
    status: "COUNTER_PROPOSED",
    limit: 20,
  });
  const { data: awaiting, isLoading: l2 } = trpc.meetingRequest.list.useQuery({
    status: "AWAITING_STUDENT",
    limit: 20,
  });

  const isLoading = l1 || l2;

  const accept = trpc.meetingRequest.acceptCounterProposal.useMutation({
    onSuccess: () => {
      utils.meetingRequest.list.invalidate();
      utils.dashboard.upcomingMeetings.invalidate();
      utils.dashboard.stats.invalidate();
      toast.success("Confirmed — invite sent.");
    },
    onError: (e) => toast.error(e.message),
  });

  const cancel = trpc.meetingRequest.cancel.useMutation({
    onSuccess: () => {
      utils.meetingRequest.list.invalidate();
      toast.success("Cancelled");
    },
    onError: (e) => toast.error(e.message),
  });

  const resend = trpc.meetingRequest.resend.useMutation({
    onSuccess: (res) => {
      utils.meetingRequest.list.invalidate();
      toast.success(res.sent ? "Reminder sent" : "Couldn't send (check email config)");
    },
    onError: (e) => toast.error(e.message),
  });

  const total = (counterProposed?.length ?? 0) + (awaiting?.length ?? 0);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-foreground/[0.06] bg-card p-5 glow-card animate-pulse">
        <div className="h-4 w-40 bg-foreground/5 rounded mb-4" />
        <div className="h-16 bg-foreground/5 rounded" />
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="rounded-2xl border border-foreground/[0.06] bg-card p-5 glow-card">
        <div className="flex items-center gap-2 mb-3">
          <Inbox className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Scheduling inbox
          </h3>
        </div>
        <p className="text-sm text-muted-foreground/60">
          No pending meeting requests. Send one from a student case file.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-foreground/[0.06] bg-card p-5 glow-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Inbox className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Scheduling inbox
          </h3>
          <span className="text-xs text-muted-foreground/60">· {total}</span>
        </div>
      </div>

      {/* Counter-proposals — needs your action */}
      {counterProposed && counterProposed.length > 0 && (
        <div className="space-y-3 mb-5">
          <p className="text-[10px] uppercase tracking-widest text-amber-300/80 font-semibold">
            Counter-proposed · {counterProposed.length}
          </p>
          {counterProposed.map((req) => (
            <CounterProposalRow
              key={req.id}
              req={req}
              onAccept={() => accept.mutate({ id: req.id })}
              onReject={() => cancel.mutate({ id: req.id })}
              isAccepting={accept.isPending && accept.variables?.id === req.id}
            />
          ))}
        </div>
      )}

      {/* Awaiting student response */}
      {awaiting && awaiting.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground/70 font-semibold">
            Awaiting student · {awaiting.length}
          </p>
          {awaiting.map((req) => (
            <AwaitingRow
              key={req.id}
              req={req}
              onResend={() => resend.mutate({ id: req.id })}
              onCancel={() => cancel.mutate({ id: req.id })}
              isResending={resend.isPending && resend.variables?.id === req.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CounterProposalRow({
  req,
  onAccept,
  onReject,
  isAccepting,
}: {
  req: {
    id: string;
    counterProposalAt: Date | null;
    counterProposalNote: string | null;
    meetingType: string;
    durationMins: number;
    student: { id: string; firstName: string; lastName: string };
  };
  onAccept: () => void;
  onReject: () => void;
  isAccepting: boolean;
}) {
  if (!req.counterProposalAt) return null;
  const at = new Date(req.counterProposalAt);

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.03] p-3.5 space-y-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/students/${req.student.id}`}
            className="font-medium text-sm hover:underline"
          >
            {req.student.firstName} {req.student.lastName}
          </Link>
          <p className="text-xs text-muted-foreground/70">
            proposed a different time for {req.durationMins}-min {req.meetingType.toLowerCase()}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <Calendar className="h-4 w-4 text-amber-300 shrink-0" />
        <span className="font-medium tabular-nums">
          {new Intl.DateTimeFormat("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          }).format(at)}
        </span>
      </div>
      {req.counterProposalNote && (
        <p className="text-xs text-muted-foreground italic border-l-2 border-amber-500/30 pl-2">
          &ldquo;{req.counterProposalNote}&rdquo;
        </p>
      )}
      <div className="flex items-center gap-2 pt-1">
        <Button size="sm" onClick={onAccept} disabled={isAccepting}>
          {isAccepting ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <Check className="h-3 w-3 mr-1.5" />}
          Accept
        </Button>
        <Button size="sm" variant="ghost" onClick={onReject}>
          <X className="h-3 w-3 mr-1.5" />
          Decline
        </Button>
      </div>
    </div>
  );
}

function AwaitingRow({
  req,
  onResend,
  onCancel,
  isResending,
}: {
  req: {
    id: string;
    token: string;
    sentAt: Date;
    remindedAt: Date | null;
    meetingType: string;
    durationMins: number;
    student: { id: string; firstName: string; lastName: string; email: string | null };
    slots: { id: string; startAt: Date }[];
  };
  onResend: () => void;
  onCancel: () => void;
  isResending: boolean;
}) {
  const sentAgo = formatDistanceToNow(new Date(req.sentAt), { addSuffix: true });
  const magicLink = typeof window !== "undefined"
    ? `${window.location.origin}/respond/${req.token}`
    : `/respond/${req.token}`;

  return (
    <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.015] p-3.5 space-y-3">
      {/* Header: who + when sent */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <MailQuestion className="h-4 w-4 text-muted-foreground/60 shrink-0" />
          <div className="min-w-0">
            <Link
              href={`/students/${req.student.id}`}
              className="text-sm font-medium hover:underline"
            >
              {req.student.firstName} {req.student.lastName}
            </Link>
            <p className="text-xs text-muted-foreground/70">
              {req.durationMins}-min {req.meetingType.toLowerCase()} · sent {sentAgo}
              {req.student.email && ` · to ${req.student.email}`}
            </p>
          </div>
        </div>
      </div>

      {/* Slot preview chips */}
      {req.slots.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {req.slots.slice(0, 4).map((s) => (
            <span
              key={s.id}
              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-foreground/[0.04] text-muted-foreground border border-foreground/[0.06]"
            >
              <Calendar className="h-2.5 w-2.5" />
              {new Intl.DateTimeFormat("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              }).format(new Date(s.startAt))}
            </span>
          ))}
          {req.slots.length > 4 && (
            <span className="text-[10px] text-muted-foreground/60">
              +{req.slots.length - 4} more
            </span>
          )}
        </div>
      )}

      {/* Always-visible actions */}
      <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-foreground/[0.04]">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs"
          onClick={() => {
            navigator.clipboard.writeText(magicLink);
            toast.success("Magic link copied");
          }}
          title="Copy the student's response link to share manually"
        >
          <Copy className="h-3 w-3 mr-1.5" />
          Copy link
        </Button>
        <a
          href={magicLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 h-7"
          title="Preview the student-facing page in a new tab"
        >
          <ExternalLink className="h-3 w-3" />
          Preview
        </a>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs"
          onClick={onResend}
          disabled={isResending}
          title="Resend the invite email"
        >
          {isResending ? (
            <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3 mr-1.5" />
          )}
          Resend
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs ml-auto text-muted-foreground hover:text-red-400"
          onClick={onCancel}
          title="Cancel this request"
        >
          <X className="h-3 w-3 mr-1.5" />
          Cancel
        </Button>
      </div>
    </div>
  );
}
