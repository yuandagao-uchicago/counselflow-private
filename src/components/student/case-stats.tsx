"use client";

import { differenceInCalendarDays } from "date-fns";
import { Calendar, GraduationCap, ListChecks, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ProgressRing } from "@/components/shared/progress-ring";

type Milestone = { status: string };
type Task = { status: string; dueDate: Date | null };
type Meeting = { scheduledAt: Date };

type Props = {
  studentId: string;
  milestones?: Milestone[];
  tasks?: Task[];
  meetings?: Meeting[];
};

// Editorial dashboard band — sits inside the StudentHeader. Reads as an
// instrument panel: progress ring + three numeric pulls + a "next event"
// fact. Numbers carry the page's voice; everything else gets out of the way.
export function CaseStats({ studentId, milestones = [], tasks = [], meetings = [] }: Props) {
  const { data: applications = [] } = trpc.application.list.useQuery({ studentId });
  const totalMilestones = milestones.length;
  const completedMilestones = milestones.filter((m) => m.status === "COMPLETED").length;
  const milestonePct = totalMilestones === 0 ? 0 : completedMilestones / totalMilestones;

  const openTasks = tasks.filter((t) => t.status !== "COMPLETED" && t.status !== "CANCELLED").length;
  const today = new Date();
  const overdueTasks = tasks.filter(
    (t) => t.status !== "COMPLETED" && t.status !== "CANCELLED" && t.dueDate && new Date(t.dueDate) < today
  ).length;

  const nextMeeting = [...meetings]
    .filter((m) => new Date(m.scheduledAt) >= today)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0];
  const daysToNextMeeting = nextMeeting
    ? differenceInCalendarDays(new Date(nextMeeting.scheduledAt), today)
    : null;

  const upcomingDeadlines = applications
    .filter((a) => a.status !== "SUBMITTED" && a.status !== "WITHDRAWN" && a.deadline)
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime());
  const nextDeadline = upcomingDeadlines[0];
  const daysToNextDeadline = nextDeadline
    ? differenceInCalendarDays(new Date(nextDeadline.deadline!), today)
    : null;

  const submittedApps = applications.filter((a) => a.status === "SUBMITTED").length;

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-4 md:gap-x-8">
      {/* Milestone progress — the centerpiece */}
      <Stat
        eyebrow="Milestones"
        leading={
          <ProgressRing
            value={milestonePct}
            size={56}
            stroke={5}
            fillColor="oklch(0.7 0.22 285)"
          >
            <span className="num-display text-sm font-semibold leading-none">
              {completedMilestones}
              <span className="text-muted-foreground/60 text-[10px]">/{totalMilestones}</span>
            </span>
          </ProgressRing>
        }
        primary={
          <span className="num-display text-2xl font-medium tracking-tight">
            {Math.round(milestonePct * 100)}<span className="text-muted-foreground/60 text-base">%</span>
          </span>
        }
        sub="complete"
      />

      <Stat
        eyebrow="Applications"
        icon={<GraduationCap className="h-4 w-4" />}
        primary={
          <span className="num-display text-2xl font-medium tracking-tight">
            {applications.length}
          </span>
        }
        sub={
          submittedApps > 0
            ? `${submittedApps} submitted`
            : applications.length > 0
              ? "in progress"
              : "none yet"
        }
      />

      <Stat
        eyebrow="Open tasks"
        icon={<ListChecks className="h-4 w-4" />}
        primary={
          <span className="num-display text-2xl font-medium tracking-tight">
            {openTasks}
          </span>
        }
        sub={
          overdueTasks > 0 ? (
            <span className="inline-flex items-center gap-1 text-destructive">
              <AlertCircle className="h-3 w-3" /> {overdueTasks} overdue
            </span>
          ) : openTasks > 0 ? "all on track" : "all clear"
        }
      />

      <Stat
        eyebrow={daysToNextDeadline !== null ? "Next deadline" : "Next meeting"}
        icon={<Calendar className="h-4 w-4" />}
        primary={
          daysToNextDeadline !== null ? (
            <span className="num-display text-2xl font-medium tracking-tight">
              {daysToNextDeadline === 0 ? "today" : `${Math.abs(daysToNextDeadline)}d`}
            </span>
          ) : daysToNextMeeting !== null ? (
            <span className="num-display text-2xl font-medium tracking-tight">
              {daysToNextMeeting === 0 ? "today" : `${daysToNextMeeting}d`}
            </span>
          ) : (
            <span className="num-display text-2xl font-medium tracking-tight text-muted-foreground/60">
              —
            </span>
          )
        }
        sub={
          daysToNextDeadline !== null
            ? daysToNextDeadline < 0 ? "deadline passed" : "until application due"
            : daysToNextMeeting !== null
              ? "until next meeting"
              : "nothing scheduled"
        }
      />
    </div>
  );
}

function Stat({
  eyebrow,
  primary,
  sub,
  icon,
  leading,
}: {
  eyebrow: string;
  primary: React.ReactNode;
  sub: React.ReactNode;
  icon?: React.ReactNode;
  leading?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      {leading ? (
        <div className="text-foreground/80">{leading}</div>
      ) : icon ? (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-foreground/[0.04] text-muted-foreground">
          {icon}
        </div>
      ) : null}
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70 mb-0.5">
          {eyebrow}
        </p>
        <div className="leading-none">{primary}</div>
        <p className="text-xs text-muted-foreground/70 mt-1.5">{sub}</p>
      </div>
    </div>
  );
}
