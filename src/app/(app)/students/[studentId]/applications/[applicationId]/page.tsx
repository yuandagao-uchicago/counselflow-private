"use client";

import { use } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  ArrowLeft,
  Calendar,
  GraduationCap,
  Loader2,
  Send,
  Trash2,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { PageTransition } from "@/components/shared/motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ReadinessBar } from "@/components/application/readiness-bar";
import { RequirementChecklist } from "@/components/application/requirement-checklist";
import { urgencyMeta, stateMeta, applicationTypeLabel } from "@/components/application/readiness-meta";

const STATUSES = [
  { value: "PLANNING", label: "Planning" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "READY_FOR_REVIEW", label: "Ready for review" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "WITHDRAWN", label: "Withdrawn" },
] as const;

export default function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ studentId: string; applicationId: string }>;
}) {
  const { studentId, applicationId } = use(params);
  const utils = trpc.useUtils();

  const { data: app, isLoading } = trpc.application.getById.useQuery({ id: applicationId });

  const updateStatus = trpc.application.update.useMutation({
    onSuccess: () => {
      utils.application.getById.invalidate({ id: applicationId });
      utils.application.list.invalidate({ studentId });
      utils.dashboard.readinessRollup.invalidate();
      toast.success("Updated");
    },
    onError: (e) => toast.error(e.message || "Failed to update"),
  });

  const deleteApp = trpc.application.delete.useMutation({
    onSuccess: () => {
      utils.application.list.invalidate({ studentId });
      utils.dashboard.readinessRollup.invalidate();
      toast.success("Application removed");
      window.location.href = `/students/${studentId}/applications`;
    },
    onError: (e) => toast.error(e.message || "Failed to delete"),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (!app) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Application not found.</p>
      </div>
    );
  }

  const r = app.readiness;
  const u = urgencyMeta[r.urgency];
  const s = stateMeta[r.state];
  const StateIcon = s.icon;
  const UrgencyIcon = u.icon;
  const deadline = app.deadline ? new Date(app.deadline) : null;
  const isReady = r.state === "READY_FOR_REVIEW";

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <Link
          href={`/students/${studentId}/applications`}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to applications
        </Link>

        {/* Hero header */}
        <div className="rounded-2xl border border-foreground/[0.06] bg-card p-6 glow-card">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[oklch(0.34_0.13_25_/_15%)] to-[oklch(0.34_0.13_25_/_15%)] border border-[oklch(0.34_0.13_25_/_20%)]">
                  <GraduationCap className="h-6 w-6 text-[oklch(0.66_0.15_75)]" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl font-bold tracking-tight truncate">
                    {app.school.name}
                  </h1>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-muted-foreground">
                      {applicationTypeLabel(app.applicationType)}
                    </span>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="text-xs text-muted-foreground capitalize">
                      {app.platform.toLowerCase().replaceAll("_", " ")}
                    </span>
                    {(app.school.city || app.school.state) && (
                      <>
                        <span className="text-muted-foreground/40">·</span>
                        <span className="text-xs text-muted-foreground">
                          {[app.school.city, app.school.state].filter(Boolean).join(", ")}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* State + urgency chips */}
            <div className="flex items-start gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.chip}`}>
                <StateIcon className="h-3.5 w-3.5" />
                {s.label}
              </span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${u.chip}`}>
                <UrgencyIcon className="h-3.5 w-3.5" />
                {r.daysUntilDeadline != null
                  ? r.urgency === "OVERDUE"
                    ? `${Math.abs(r.daysUntilDeadline)} days overdue`
                    : `${r.daysUntilDeadline} days`
                  : u.label}
              </span>
            </div>
          </div>

          {/* Deadline + readiness bar */}
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground/70">Deadline</p>
              {deadline ? (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{format(deadline, "EEEE, MMMM d, yyyy")}</span>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground/60">No deadline set</span>
              )}
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground/70 mb-1.5">
                Readiness
              </p>
              <ReadinessBar
                pct={r.completionPct}
                state={r.state}
                doneRequired={r.doneRequired}
                totalRequired={r.totalRequired}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex items-center gap-3 flex-wrap">
            <Select
              value={app.status}
              onValueChange={(v) => updateStatus.mutate({ id: app.id, status: v as (typeof STATUSES)[number]["value"] })}
            >
              <SelectTrigger className="w-44 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {isReady && app.status !== "SUBMITTED" && (
              <Button
                size="sm"
                onClick={() => updateStatus.mutate({ id: app.id, status: "SUBMITTED" })}
                disabled={updateStatus.isPending}
                className="bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-500 hover:to-emerald-300 text-white border-0"
              >
                {updateStatus.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-1.5" />
                )}
                Mark submitted
              </Button>
            )}

            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                if (confirm("Remove this application? Its checklist will be deleted.")) {
                  deleteApp.mutate({ id: app.id });
                }
              }}
              className="text-muted-foreground hover:text-red-400"
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Remove
            </Button>
          </div>
        </div>

        {/* Ready-to-submit banner */}
        {isReady && (
          <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-emerald-400/5 p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-300">All required items are ready</p>
              <p className="text-xs text-muted-foreground">
                Walk through the application one more time, then mark it submitted.
              </p>
            </div>
          </div>
        )}

        {/* Auto-sync banner */}
        <div className="rounded-2xl border border-[oklch(0.34_0.13_25_/_20%)] bg-[oklch(0.34_0.13_25_/_5%)] p-3 flex items-center gap-3">
          <Sparkles className="h-4 w-4 text-[oklch(0.66_0.15_75)] shrink-0" />
          <p className="text-xs text-muted-foreground">
            Items marked <span className="text-[oklch(0.66_0.15_75)] font-medium">Auto</span> sync from
            student data — uploading a transcript or marking a rec received here updates the checklist
            automatically.
          </p>
        </div>

        {/* Checklist */}
        <RequirementChecklist
          applicationId={app.id}
          items={app.requirementItems}
          resolved={r.resolvedItems}
          disabled={app.status === "SUBMITTED"}
        />

        {/* Notes / metadata footer */}
        {app.submittedAt && (
          <div className="rounded-2xl border border-foreground/[0.06] bg-card p-4 text-sm text-muted-foreground">
            Submitted {format(new Date(app.submittedAt), "MMMM d, yyyy 'at' h:mm a")}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
