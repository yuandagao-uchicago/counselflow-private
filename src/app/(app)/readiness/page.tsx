"use client";

import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  Send,
  Sparkles,
} from "lucide-react";
import { PageTransition, StaggerList, StaggerItem } from "@/components/shared/motion";
import { Skeleton } from "@/components/ui/skeleton";
import { ApplicationRow } from "@/components/application/application-row";
import { kindLabel } from "@/components/application/readiness-meta";

/**
 * The counselor-wide readiness command center. The product report frames it
 * as "operations chief of staff" — at-a-glance: which kids are about to
 * miss a deadline, which applications are ready to fire, and what is
 * structurally missing across the roster.
 */
export default function ReadinessPage() {
  const { data, isLoading } = trpc.dashboard.readinessRollup.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-72" />
        <div className="grid gap-3 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (!data) return null;

  const { buckets, missingByKind, totals } = data;

  // Display order matches urgency: most urgent on top.
  const lanes: Array<{
    key: keyof typeof buckets;
    title: string;
    subtitle: string;
    icon: typeof Clock;
    accent: string;
  }> = [
    {
      key: "OVERDUE",
      title: "Overdue",
      subtitle: "Deadline has passed without submission",
      icon: AlertTriangle,
      accent: "text-red-400",
    },
    {
      key: "DUE_SOON",
      title: "Due in 14 days",
      subtitle: "These need attention this week",
      icon: Clock,
      accent: "text-orange-400",
    },
    {
      key: "UPCOMING",
      title: "Due in 60 days",
      subtitle: "Plan the next round of follow-ups",
      icon: Calendar,
      accent: "text-amber-300",
    },
    {
      key: "NORMAL",
      title: "Later",
      subtitle: "On track, no immediate pressure",
      icon: Calendar,
      accent: "text-muted-foreground",
    },
    {
      key: "SUBMITTED",
      title: "Submitted",
      subtitle: "Done — track for confirmation and decisions",
      icon: Send,
      accent: "text-emerald-400",
    },
  ];

  // "Missing testing data on 4 applications" style chips.
  const missingChips = Object.entries(missingByKind)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-bold tracking-tight">Application readiness</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Roster-wide view of every application, ranked by what needs you next.
          </p>
        </div>

        {/* Stats strip */}
        <div className="grid gap-3 md:grid-cols-4">
          <StatTile
            label="Overdue"
            value={totals.overdue}
            tone="red"
            icon={AlertTriangle}
          />
          <StatTile
            label="Due in 14 days"
            value={totals.dueSoon}
            tone="orange"
            icon={Clock}
          />
          <StatTile
            label="Ready to submit"
            value={totals.readyForReview}
            tone="violet"
            icon={CheckCircle2}
          />
          <StatTile
            label="Submitted"
            value={totals.submitted}
            tone="emerald"
            icon={Send}
          />
        </div>

        {/* Cross-roster missing-item heatmap */}
        {missingChips.length > 0 && (
          <div className="rounded-2xl border border-foreground/[0.06] bg-card p-5 glow-card">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-[oklch(0.66_0.15_75)]" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Missing across roster
              </h2>
            </div>
            <p className="text-xs text-muted-foreground/70 mb-4">
              These items are still pending across multiple applications. Tackling them in batches saves
              meeting prep time later.
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {missingChips.map(([kind, count]) => (
                <span
                  key={kind}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-foreground/[0.04] text-sm border border-foreground/[0.06]"
                >
                  <span className="font-semibold tabular-nums text-foreground">{count}</span>
                  <span className="text-muted-foreground">×</span>
                  <span className="text-muted-foreground">{kindLabel(kind)}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {totals.total === 0 && (
          <div className="rounded-2xl border border-foreground/[0.06] bg-card p-10 text-center glow-card">
            <FileSpreadsheet className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <h3 className="font-semibold mb-1">No applications yet</h3>
            <p className="text-sm text-muted-foreground/70 max-w-md mx-auto">
              Add applications from a student case file. Once you do, this page becomes your roster-wide
              command center.
            </p>
          </div>
        )}

        {/* Urgency lanes */}
        {lanes.map((lane) => {
          const items = buckets[lane.key];
          if (items.length === 0) return null;
          const Icon = lane.icon;
          return (
            <section key={lane.key} className="space-y-3">
              <div className="flex items-baseline justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${lane.accent}`} />
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    {lane.title}
                  </h2>
                  <span className="text-xs text-muted-foreground/60 tabular-nums">
                    · {items.length}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground/60 hidden sm:block">{lane.subtitle}</p>
              </div>
              <StaggerList className="space-y-2">
                {items.map(({ app, readiness }) => (
                  <StaggerItem key={app.id}>
                    <ApplicationRow
                      app={{
                        id: app.id,
                        studentId: app.student.id,
                        applicationType: app.applicationType,
                        platform: app.platform,
                        deadline: app.deadline,
                        school: { name: app.school.name, commonName: app.school.commonName },
                        readiness,
                      }}
                      studentLabel={`${app.student.preferredName ?? app.student.firstName} ${app.student.lastName} · Class of ${app.student.graduationYear}`}
                    />
                  </StaggerItem>
                ))}
              </StaggerList>
            </section>
          );
        })}
      </div>
    </PageTransition>
  );
}

function StatTile({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number;
  tone: "red" | "orange" | "violet" | "emerald";
  icon: typeof AlertTriangle;
}) {
  const toneClasses: Record<typeof tone, { ring: string; iconBg: string; iconColor: string }> = {
    red: {
      ring: "ring-red-500/20",
      iconBg: "bg-red-500/10",
      iconColor: "text-red-400",
    },
    orange: {
      ring: "ring-orange-500/20",
      iconBg: "bg-orange-500/10",
      iconColor: "text-orange-400",
    },
    violet: {
      ring: "ring-[oklch(0.34_0.13_25_/_20%)]",
      iconBg: "bg-[oklch(0.34_0.13_25_/_15%)]",
      iconColor: "text-[oklch(0.66_0.15_75)]",
    },
    emerald: {
      ring: "ring-emerald-500/20",
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-400",
    },
  };
  const c = toneClasses[tone];
  const dim = value === 0;

  return (
    <div
      className={`rounded-2xl border border-foreground/[0.06] bg-card p-4 transition-all ${
        dim ? "opacity-60" : `ring-1 ${c.ring}`
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${c.iconBg}`}>
          <Icon className={`h-3.5 w-3.5 ${c.iconColor}`} />
        </div>
      </div>
      <p className="text-3xl font-bold tracking-tight mt-2 tabular-nums">{value}</p>
    </div>
  );
}
