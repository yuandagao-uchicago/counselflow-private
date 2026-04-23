"use client";

import { Flame, Target, Calendar, ChevronLeft } from "lucide-react";
import { differenceInDays } from "date-fns";
import Link from "next/link";

interface JourneyHeaderProps {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    graduationYear: number;
    phase: string;
  };
  completed: number;
  total: number;
  inProgress: number;
}

const phaseLabels: Record<string, string> = {
  EXPLORATION: "Exploration",
  LIST_BUILDING: "List building",
  TESTING: "Testing",
  APPLICATIONS: "Applications",
  ESSAYS: "Essays",
  SUBMISSIONS: "Submissions",
  DECISIONS: "Decisions",
  ENROLLMENT: "Enrollment",
};

export function JourneyHeader({ student, completed, total, inProgress }: JourneyHeaderProps) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const graduationDate = new Date(student.graduationYear, 5, 1);
  const daysLeft = Math.max(0, differenceInDays(graduationDate, new Date()));

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href={`/students/${student.id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to case file
      </Link>

      {/* Hero — bold typographic, PandaScore-style */}
      <div className="text-center space-y-4 py-4">
        <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[oklch(0.65_0.2_265_/_15%)] to-[oklch(0.55_0.22_290_/_15%)] px-4 py-1.5 border border-[oklch(0.65_0.2_265_/_20%)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.75_0.15_265)] pulse-glow" />
          <p className="text-xs uppercase tracking-widest font-medium text-[oklch(0.75_0.15_265)]">
            {student.firstName} {student.lastName} · Class of {student.graduationYear}
          </p>
        </div>

        <h1 className="text-5xl md:text-6xl font-black tracking-tight uppercase">
          Application <span className="gradient-text">Journey</span>
        </h1>

        <p className="text-base text-muted-foreground max-w-xl mx-auto">
          Complete each checkpoint to build and submit strong applications. Work at your own pace — every section feeds forward.
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          icon={<Target className="h-4 w-4" />}
          label="Progress"
          value={`${completed}/${total}`}
          hint={`${pct}% complete`}
          accent="from-[oklch(0.65_0.2_265)] to-[oklch(0.55_0.22_290)]"
        />
        <StatTile
          icon={<Flame className="h-4 w-4" />}
          label="In motion"
          value={inProgress.toString()}
          hint={inProgress === 0 ? "No active work" : inProgress === 1 ? "milestone in progress" : "milestones in progress"}
          accent="from-amber-500 to-orange-500"
        />
        <StatTile
          icon={<Calendar className="h-4 w-4" />}
          label="Days to graduation"
          value={daysLeft.toString()}
          hint={phaseLabels[student.phase] || student.phase}
          accent="from-emerald-500 to-teal-500"
        />
      </div>

      {/* Progress bar */}
      <div className="rounded-2xl border border-white/[0.06] bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium">Overall progress</p>
          <p className="text-sm font-bold text-[oklch(0.75_0.15_265)]">{pct}%</p>
        </div>
        <div className="relative h-2 rounded-full bg-white/5 overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-[oklch(0.65_0.2_265)] to-[oklch(0.55_0.22_290)] transition-all duration-500 rounded-full"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {completed} of {total} checkpoints complete — {total - completed} to go.
        </p>
      </div>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-card p-4 glow-card">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${accent} text-white shadow-md`}>
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold font-mono tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{hint}</p>
    </div>
  );
}
