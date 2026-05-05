"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { ArrowRight, FileSpreadsheet, Plus, Send, AlertTriangle } from "lucide-react";
import { ReadinessBar } from "./readiness-bar";
import { stateMeta, urgencyMeta, applicationTypeLabel } from "./readiness-meta";
import { AddApplicationDialog } from "./add-application-dialog";

/**
 * Compact summary of a student's applications for the case overview page.
 * Shows up to 3 most-urgent applications + roll-up stats; full list lives at
 * /students/[studentId]/applications.
 */
export function ApplicationsCard({ studentId }: { studentId: string }) {
  const { data: apps, isLoading } = trpc.application.list.useQuery({ studentId });

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-foreground/[0.06] bg-card p-5 glow-card animate-pulse">
        <div className="h-4 w-24 bg-foreground/5 rounded mb-4" />
        <div className="h-16 bg-foreground/5 rounded" />
      </div>
    );
  }

  const list = apps ?? [];
  const submittedCount = list.filter((a) => a.readiness.state === "SUBMITTED").length;
  const overdueCount = list.filter((a) => a.readiness.urgency === "OVERDUE").length;
  const dueSoonCount = list.filter((a) => a.readiness.urgency === "DUE_SOON").length;
  const readyCount = list.filter((a) => a.readiness.state === "READY_FOR_REVIEW").length;

  // Sort: not-submitted first (urgency), then submitted at the bottom.
  const sorted = [...list].sort((a, b) => {
    const order: Record<string, number> = { OVERDUE: 0, DUE_SOON: 1, UPCOMING: 2, NORMAL: 3 };
    if (a.readiness.state === "SUBMITTED" && b.readiness.state !== "SUBMITTED") return 1;
    if (b.readiness.state === "SUBMITTED" && a.readiness.state !== "SUBMITTED") return -1;
    return order[a.readiness.urgency] - order[b.readiness.urgency];
  });

  const top = sorted.slice(0, 3);

  return (
    <div className="rounded-2xl border border-foreground/[0.06] bg-card p-5 glow-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Applications
          </h3>
          {list.length > 0 && (
            <span className="text-xs text-muted-foreground/60">· {list.length}</span>
          )}
        </div>
        {list.length > 0 ? (
          <Link
            href={`/students/${studentId}/applications`}
            className="inline-flex items-center gap-1 text-xs text-[oklch(0.75_0.15_265)] hover:underline"
          >
            View all
            <ArrowRight className="h-3 w-3" />
          </Link>
        ) : (
          <AddApplicationDialog studentId={studentId} />
        )}
      </div>

      {list.length === 0 ? (
        <div className="py-6 text-center space-y-2">
          <p className="text-sm text-muted-foreground/70">No applications yet.</p>
          <p className="text-xs text-muted-foreground/50">
            Add a school to start tracking deadlines and missing materials.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Roll-up chips */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {submittedCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                <Send className="h-3 w-3" />
                {submittedCount} submitted
              </span>
            )}
            {readyCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[oklch(0.65_0.2_265_/_15%)] text-[oklch(0.85_0.1_265)] border border-[oklch(0.65_0.2_265_/_25%)]">
                {readyCount} ready
              </span>
            )}
            {dueSoonCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-300 border border-orange-500/20">
                <AlertTriangle className="h-3 w-3" />
                {dueSoonCount} due soon
              </span>
            )}
            {overdueCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-300 border border-red-500/20">
                <AlertTriangle className="h-3 w-3" />
                {overdueCount} overdue
              </span>
            )}
          </div>

          {/* Top 3 applications */}
          <div className="space-y-2">
            {top.map((a) => {
              const u = urgencyMeta[a.readiness.urgency];
              const s = stateMeta[a.readiness.state];
              return (
                <Link
                  key={a.id}
                  href={`/students/${studentId}/applications/${a.id}`}
                  className="block rounded-lg border border-foreground/[0.04] hover:border-foreground/[0.08] hover:bg-foreground/[0.02] transition-all p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-sm truncate">
                          {a.school.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground/70">
                          {applicationTypeLabel(a.applicationType)}
                        </span>
                      </div>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${s.chip}`}>
                      {s.label}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1">
                      <ReadinessBar
                        pct={a.readiness.completionPct}
                        state={a.readiness.state}
                        doneRequired={a.readiness.doneRequired}
                        totalRequired={a.readiness.totalRequired}
                        size="sm"
                        showLabel={false}
                      />
                    </div>
                    <span className={`text-[10px] tabular-nums ${u.tone}`}>
                      {a.readiness.daysUntilDeadline != null
                        ? a.readiness.urgency === "OVERDUE"
                          ? `${Math.abs(a.readiness.daysUntilDeadline)}d late`
                          : `${a.readiness.daysUntilDeadline}d`
                        : ""}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          {list.length > 0 && (
            <div className="pt-1">
              <AddApplicationDialog studentId={studentId} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
