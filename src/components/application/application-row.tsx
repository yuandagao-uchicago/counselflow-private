"use client";

import Link from "next/link";
import { format } from "date-fns";
import { ArrowRight } from "lucide-react";
import { ReadinessBar } from "./readiness-bar";
import { urgencyMeta, stateMeta, applicationTypeLabel, kindLabel } from "./readiness-meta";
import type { ApplicationReadiness } from "@/lib/readiness";

type ApplicationRow = {
  id: string;
  studentId: string;
  applicationType: string;
  platform: string;
  deadline: Date | string | null;
  school: { name: string; commonName?: string | null };
  readiness: ApplicationReadiness;
};

/**
 * Compact applicaton row used in the per-student applications list and the
 * counselor-wide readiness dashboard. Same component, two contexts — keeps
 * the visual language consistent.
 */
export function ApplicationRow({
  app,
  studentLabel,
  href,
}: {
  app: ApplicationRow;
  studentLabel?: string; // shown on the dashboard, not on the per-student list
  href?: string;
}) {
  const r = app.readiness;
  const u = urgencyMeta[r.urgency];
  const s = stateMeta[r.state];
  const StateIcon = s.icon;
  const UrgencyIcon = u.icon;

  const linkHref = href ?? `/students/${app.studentId}/applications/${app.id}`;
  const deadline = app.deadline ? new Date(app.deadline) : null;

  // Show up to 3 missing-item chips inline; "+N" overflow chip beyond that.
  const inlineMissing = r.missingRequired.slice(0, 3);
  const overflow = Math.max(0, r.missingRequired.length - inlineMissing.length);

  return (
    <Link
      href={linkHref}
      className="block rounded-2xl border border-foreground/[0.06] bg-card hover:bg-foreground/[0.02] transition-colors p-4 group"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold tracking-tight truncate">{app.school.name}</h3>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-foreground/5 text-muted-foreground border border-foreground/10">
              {applicationTypeLabel(app.applicationType)}
            </span>
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${s.chip}`}>
              <StateIcon className="h-3 w-3" />
              {s.label}
            </span>
          </div>

          {studentLabel && (
            <p className="text-xs text-muted-foreground mt-0.5">{studentLabel}</p>
          )}

          {/* Missing items inline */}
          {r.state !== "SUBMITTED" && inlineMissing.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap mt-2">
              {inlineMissing.map((m) => (
                <span
                  key={m.id}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-foreground/5 text-muted-foreground border border-foreground/10"
                >
                  {kindLabel(m.kind) === "Custom" ? m.label : kindLabel(m.kind)}
                </span>
              ))}
              {overflow > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-foreground/5 text-muted-foreground border border-foreground/10">
                  +{overflow} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right side: deadline + urgency chip */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${u.chip}`}>
            <UrgencyIcon className="h-3 w-3" />
            {r.daysUntilDeadline != null
              ? r.urgency === "OVERDUE"
                ? `${Math.abs(r.daysUntilDeadline)}d overdue`
                : `${r.daysUntilDeadline}d`
              : u.label}
          </span>
          {deadline && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {format(deadline, "MMM d, yyyy")}
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div className="flex-1">
          <ReadinessBar
            pct={r.completionPct}
            state={r.state}
            doneRequired={r.doneRequired}
            totalRequired={r.totalRequired}
            size="sm"
            showLabel={false}
          />
        </div>
        <span className="text-xs tabular-nums text-muted-foreground">
          {r.doneRequired}/{r.totalRequired}
        </span>
        <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all" />
      </div>
    </Link>
  );
}
