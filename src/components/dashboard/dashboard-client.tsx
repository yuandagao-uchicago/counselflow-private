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
          className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-card via-card to-[oklch(0.15_0.02_265)] p-8"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[oklch(0.65_0.2_265_/_8%)] to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <h1 className="text-3xl font-bold tracking-tight">
              {greeting},{" "}
              <span className="gradient-text">{firstName}</span>.
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Here&apos;s what needs your attention today.
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

        {/* Content grid */}
        <div className="grid gap-5 md:grid-cols-2">
          {/* Upcoming Meetings */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="rounded-2xl border border-white/[0.06] bg-card p-6"
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
              <div className="py-8 text-center">
                <Calendar className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">
                  No upcoming meetings.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {meetings.map((meeting) => {
                  const date = new Date(meeting.scheduledAt);
                  return (
                    <Link
                      key={meeting.id}
                      href={`/students/${meeting.student.id}/meetings/${meeting.id}`}
                      className="flex items-center gap-4 rounded-xl bg-white/[0.03] p-3 hover:bg-white/[0.06] transition-colors group"
                    >
                      <div className="flex flex-col items-center rounded-lg bg-white/5 px-3 py-1.5 min-w-[50px]">
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
            className="rounded-2xl border border-white/[0.06] bg-card p-6"
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
              <div className="py-8 text-center">
                <Users className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">
                  No students yet. Add your first student to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {students.map((student) => (
                  <Link
                    key={student.id}
                    href={`/students/${student.id}`}
                    className="flex items-center gap-3 rounded-xl bg-white/[0.03] p-3 hover:bg-white/[0.06] transition-colors group"
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
                        className="bg-white/5 text-muted-foreground border-white/10 text-[10px]"
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
    <div className="rounded-2xl border border-white/[0.06] bg-card p-5 hover:border-white/[0.12] transition-colors">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{title}</p>
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${gradient} shadow-md`}
        >
          <Icon className="h-4 w-4 text-white" />
        </div>
      </div>
      <p className="text-3xl font-bold mt-2">{value}</p>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}
