"use client";

import Link from "next/link";
import { format } from "date-fns";
import {
  Users,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  Video,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PageTransition,
  StaggerList,
  AnimatedCard,
  motion,
} from "@/components/shared/motion";
import { SchedulingInboxCard } from "@/components/scheduling/scheduling-inbox-card";
import { EmptyState } from "@/components/shared/empty-state";

export function DashboardClient({
  greeting,
  firstName,
}: {
  greeting: string;
  firstName: string;
}) {
  const { data: stats, isLoading: statsLoading } =
    trpc.dashboard.stats.useQuery();
  const { data: meetings, isLoading: meetingsLoading } =
    trpc.dashboard.upcomingMeetings.useQuery();
  const { data: students, isLoading: studentsLoading } =
    trpc.dashboard.recentStudents.useQuery();

  return (
    <PageTransition>
      <div className="space-y-8">
        {/* Hero greeting */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card via-card to-background p-10 md:p-12"
        >
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -left-16 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          <div className="relative space-y-4">
            <p className="text-xs uppercase tracking-[0.25em] font-semibold text-primary/80">
              {greeting}
            </p>
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[0.95]">
              Welcome back,
              <br />
              <span className="gradient-text">{firstName}</span>
            </h1>
            <p className="text-muted-foreground text-base md:text-lg max-w-lg">
              Here&apos;s what needs your attention today — students, meetings, and approvals at a glance.
            </p>
          </div>
        </motion.div>

        {/* Stats grid */}
        {statsLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
        ) : (
          <StaggerList className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <AnimatedCard>
              <StatCard
                title="Active Students"
                value={stats?.activeStudents ?? 0}
                icon={Users}
                gradient="from-blue-500 to-cyan-400"
                href="/students"
              />
            </AnimatedCard>
            <AnimatedCard>
              <StatCard
                title="Upcoming Meetings"
                value={stats?.upcomingMeetings ?? 0}
                icon={Calendar}
                gradient="from-violet-500 to-purple-400"
              />
            </AnimatedCard>
            <AnimatedCard>
              <StatCard
                title="Open Tasks"
                value={stats?.pendingTasks ?? 0}
                icon={CheckCircle}
                gradient="from-amber-500 to-orange-400"
              />
            </AnimatedCard>
            <AnimatedCard>
              <StatCard
                title="Overdue Tasks"
                value={stats?.overdueTasks ?? 0}
                icon={AlertTriangle}
                gradient="from-red-500 to-pink-400"
              />
            </AnimatedCard>
          </StaggerList>
        )}

        {/* Scheduling inbox — counter-proposals + awaiting student */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
        >
          <SchedulingInboxCard />
        </motion.div>

        {/* Content grid */}
        <div className="grid gap-5 md:grid-cols-2">
          {/* Upcoming Meetings */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="rounded-2xl border border-foreground/[0.06] bg-card p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[oklch(0.65_0.2_265)]" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Upcoming Meetings
                </h2>
              </div>
            </div>

            {meetingsLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
              </div>
            ) : !meetings?.length ? (
              <EmptyState
                icon={Calendar}
                title="No meetings on the calendar"
                description="Schedule directly from a student page or send a request and let them pick a time."
              />
            ) : (
              <div className="space-y-2">
                {meetings.map((meeting) => {
                  const date = new Date(meeting.scheduledAt);
                  return (
                    <Link
                      key={meeting.id}
                      href={`/students/${meeting.student.id}/meetings/${meeting.id}`}
                      className="flex items-center gap-4 rounded-xl bg-foreground/[0.03] p-3 hover:bg-foreground/[0.06] transition-colors group"
                    >
                      <div className="flex flex-col items-center rounded-lg bg-foreground/5 px-3 py-1.5 min-w-[50px]">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {format(date, "MMM")}
                        </span>
                        <span className="text-lg font-bold leading-none">
                          {format(date, "d")}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {meeting.type}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(date, "h:mm a")} &middot;{" "}
                          {meeting.student.firstName} {meeting.student.lastName}
                        </p>
                      </div>
                      {meeting.prepBrief ? (
                        <Badge className="bg-[oklch(0.65_0.2_265_/_15%)] text-[oklch(0.75_0.15_265)] border-0 text-[10px]">
                          Brief Ready
                        </Badge>
                      ) : (
                        <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-foreground transition-colors" />
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* Recent Students */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="rounded-2xl border border-foreground/[0.06] bg-card p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[oklch(0.7_0.18_155)]" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Recent Students
                </h2>
              </div>
              <Link
                href="/students"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                View all
              </Link>
            </div>

            {studentsLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-14 rounded-xl" />
                ))}
              </div>
            ) : !students?.length ? (
              <EmptyState
                icon={Users}
                title="No students on your roster"
                description="Add your first student from the Students page to begin tracking their journey."
                tone="primary"
              />
            ) : (
              <div className="space-y-2">
                {students.map((student) => (
                  <Link
                    key={student.id}
                    href={`/students/${student.id}`}
                    className="flex items-center gap-3 rounded-xl bg-foreground/[0.03] p-3 hover:bg-foreground/[0.06] transition-colors group"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-400 text-sm font-bold text-white">
                      {student.firstName[0]}
                      {student.lastName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {student.firstName} {student.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Class of {student.graduationYear}
                      </p>
                    </div>
                    {student._count.tasks > 0 && (
                      <Badge
                        variant="secondary"
                        className="bg-foreground/5 text-muted-foreground border-foreground/10 text-[10px]"
                      >
                        {student._count.tasks} tasks
                      </Badge>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  gradient,
  href,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  gradient: string;
  href?: string;
}) {
  const content = (
    <div className="group relative overflow-hidden rounded-2xl border border-foreground/[0.06] bg-card p-5 hover:border-foreground/[0.12] transition-all hover:-translate-y-0.5">
      {/* Soft gradient corner — color-keyed to the stat */}
      <div
        className={`pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-to-br ${gradient} opacity-[0.10] blur-2xl group-hover:opacity-[0.18] transition-opacity`}
      />
      <div className="relative">
        <div className="flex items-start justify-between mb-2">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/80">
            {title}
          </p>
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${gradient} shadow-md ring-1 ring-white/10`}
          >
            <Icon className="h-4 w-4 text-white" />
          </div>
        </div>
        <p className="num-display text-4xl font-medium tracking-tight tabular-nums">
          {value}
        </p>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}
