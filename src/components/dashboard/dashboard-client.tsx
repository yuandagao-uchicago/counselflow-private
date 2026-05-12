"use client";

import Link from "next/link";
import { format } from "date-fns";
import {
  Users,
  Calendar,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
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

  const today = new Date();
  const issueDate = format(today, "EEEE · MMMM d, yyyy");
  const volume = `Vol. ${today.getFullYear() - 2025} · No. ${
    Math.floor(today.getDate() + today.getMonth() * 31)
  }`;

  return (
    <PageTransition>
      <div className="space-y-10">
        {/* === MASTHEAD === Bodoni Moda hero, almanac date stamp, ledger ornament. */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="paper-grain relative overflow-hidden rounded-3xl border border-border bg-card"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--almanac-brass)]/[0.06] via-transparent to-[var(--almanac-oxblood)]/[0.04] pointer-events-none" />
          <div className="topo-bg pointer-events-none absolute inset-0 text-foreground opacity-[0.04]" />

          <div className="relative px-7 pt-6 pb-3 md:px-12 md:pt-8 flex items-center justify-between gap-4 border-b border-border/60">
            <p className="case-id">
              {issueDate}
            </p>
            <p className="case-id text-[var(--almanac-oxblood)]">{volume}</p>
          </div>

          <div className="relative px-7 pt-10 pb-12 md:px-12 md:pt-14 md:pb-16">
            <p className="section-eyebrow mb-5">{greeting}, counselor</p>
            <h1 className="font-display text-5xl md:text-7xl lg:text-[5.5rem] font-medium leading-[0.95] tracking-tight max-w-4xl">
              Welcome back,{" "}
              <span className="font-serif-italic text-[var(--almanac-oxblood)]">
                {firstName}
              </span>
              <span className="text-[var(--almanac-brass)]">.</span>
            </h1>
            <p className="mt-7 max-w-xl text-base md:text-lg text-muted-foreground leading-relaxed">
              The day&apos;s edition of your practice — students, meetings, drafts
              awaiting your hand. Set in motion below.
            </p>

            {/* Quick-glance ticker — pulls headline numbers into the masthead */}
            <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-5 max-w-3xl border-t border-foreground/10 pt-7">
              <Headline
                label="Students"
                value={stats?.activeStudents ?? 0}
                tone="oxblood"
              />
              <Headline
                label="Meetings"
                value={stats?.upcomingMeetings ?? 0}
                tone="sage"
              />
              <Headline
                label="Open"
                value={stats?.pendingTasks ?? 0}
                tone="brass"
              />
              <Headline
                label="Overdue"
                value={stats?.overdueTasks ?? 0}
                tone={stats && stats.overdueTasks > 0 ? "destructive" : "muted"}
              />
            </div>
          </div>
        </motion.section>

        {/* === SECTION I — Counters === almanac-styled stat tiles */}
        <Section eyebrow="I · Today" title="At a glance">
          {statsLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32 rounded-2xl" />
              ))}
            </div>
          ) : (
            <StaggerList className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <AnimatedCard>
                <StatTile
                  title="Active students"
                  value={stats?.activeStudents ?? 0}
                  icon={Users}
                  tone="oxblood"
                  href="/students"
                  delay={0}
                />
              </AnimatedCard>
              <AnimatedCard>
                <StatTile
                  title="Upcoming meetings"
                  value={stats?.upcomingMeetings ?? 0}
                  icon={Calendar}
                  tone="sage"
                  delay={0.08}
                />
              </AnimatedCard>
              <AnimatedCard>
                <StatTile
                  title="Open tasks"
                  value={stats?.pendingTasks ?? 0}
                  icon={CheckCircle}
                  tone="brass"
                  delay={0.16}
                />
              </AnimatedCard>
              <AnimatedCard>
                <StatTile
                  title="Overdue"
                  value={stats?.overdueTasks ?? 0}
                  icon={AlertTriangle}
                  tone={stats && stats.overdueTasks > 0 ? "destructive" : "muted"}
                  delay={0.24}
                />
              </AnimatedCard>
            </StaggerList>
          )}
        </Section>

        {/* === Scheduling inbox stays as-is === */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
        >
          <SchedulingInboxCard />
        </motion.div>

        {/* === SECTION II + III — content grid === */}
        <Section eyebrow="II · Calendar" title="What&apos;s on the docket">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Meetings */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="paper-grain relative rounded-2xl border border-border bg-card p-6 glow-card"
            >
              <PanelHead title="Upcoming meetings" icon={Calendar} count={meetings?.length} />

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
                  {meetings.map((meeting, i) => {
                    const date = new Date(meeting.scheduledAt);
                    return (
                      <Link
                        key={meeting.id}
                        href={`/students/${meeting.student.id}/meetings/${meeting.id}`}
                        className="count-in flex items-center gap-4 rounded-xl border border-transparent bg-foreground/[0.025] p-3 hover:bg-foreground/[0.05] hover:border-[var(--almanac-brass)]/25 transition-all group"
                        style={{ animationDelay: `${i * 60 + 100}ms` }}
                      >
                        <div className="flex flex-col items-center justify-center rounded-lg bg-[var(--almanac-oxblood)] text-[var(--almanac-paper)] px-3 py-2 min-w-[54px] shadow-sm ring-1 ring-[var(--almanac-brass)]/30">
                          <span className="text-[9px] uppercase tracking-[0.2em] text-[var(--almanac-paper)]/75">
                            {format(date, "MMM")}
                          </span>
                          <span className="num-display text-xl font-semibold leading-none mt-0.5">
                            {format(date, "d")}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">
                            {meeting.type}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            <span className="num-mono">{format(date, "h:mm a")}</span>{" "}
                            · {meeting.student.firstName} {meeting.student.lastName}
                          </p>
                        </div>
                        {meeting.prepBrief ? (
                          <Badge className="bg-[var(--almanac-sage)]/15 text-[var(--almanac-sage)] border border-[var(--almanac-sage)]/30 text-[10px] font-serif-italic font-normal px-2 py-0.5">
                            brief ready
                          </Badge>
                        ) : (
                          <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </motion.div>

            {/* Students */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="paper-grain relative rounded-2xl border border-border bg-card p-6 glow-card"
            >
              <PanelHead
                title="Recent students"
                icon={Users}
                count={students?.length}
                action={
                  <Link
                    href="/students"
                    className="under-draw text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    View all
                  </Link>
                }
              />

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
                <ul className="space-y-1">
                  {students.map((student, i) => (
                    <li
                      key={student.id}
                      className="count-in"
                      style={{ animationDelay: `${i * 60 + 100}ms` }}
                    >
                      <Link
                        href={`/students/${student.id}`}
                        className="group flex items-center gap-3 rounded-xl border border-transparent bg-foreground/[0.02] p-3 hover:bg-foreground/[0.05] hover:border-[var(--almanac-brass)]/25 transition-all"
                      >
                        <span className="num-mono text-[10px] tabular-nums text-muted-foreground/60 w-5 text-right shrink-0">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--almanac-oxblood)] text-[var(--almanac-paper)] text-sm font-display font-semibold ring-1 ring-[var(--almanac-brass)]/30 shrink-0">
                          {student.firstName[0]}
                          {student.lastName[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {student.firstName} {student.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground num-mono">
                            class of {student.graduationYear}
                          </p>
                        </div>
                        {student._count.tasks > 0 && (
                          <span className="num-mono text-[11px] tabular-nums text-[var(--almanac-oxblood)] font-semibold">
                            {student._count.tasks}
                            <span className="text-muted-foreground/60 font-normal ml-0.5">tasks</span>
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          </div>
        </Section>
      </div>
    </PageTransition>
  );
}

// =====================
// Compositional helpers
// =====================

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-5">
      <header className="flex items-end justify-between gap-6 border-b border-border pb-3">
        <div>
          <p className="section-eyebrow mb-1">{eyebrow}</p>
          <h2 className="font-display text-2xl md:text-3xl font-medium tracking-tight">
            {title}
          </h2>
        </div>
        <span className="hair-rule flex-1 mb-2" />
      </header>
      {children}
    </section>
  );
}

function PanelHead({
  title,
  icon: Icon,
  count,
  action,
}: {
  title: string;
  icon: React.ElementType;
  count?: number;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <Icon className="h-4 w-4 text-[var(--almanac-oxblood)]" />
        <h3 className="font-display text-base font-semibold tracking-tight">
          {title}
        </h3>
        {count !== undefined && count > 0 && (
          <span className="num-mono text-[10px] tabular-nums text-muted-foreground/60">
            ({String(count).padStart(2, "0")})
          </span>
        )}
      </div>
      {action}
    </div>
  );
}

function Headline({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "oxblood" | "sage" | "brass" | "destructive" | "muted";
}) {
  const color =
    tone === "oxblood"
      ? "text-[var(--almanac-oxblood)]"
      : tone === "sage"
        ? "text-[var(--almanac-sage)]"
        : tone === "brass"
          ? "text-[var(--almanac-brass)]"
          : tone === "destructive"
            ? "text-destructive"
            : "text-foreground/55";
  return (
    <div className="count-in" style={{ animationDelay: "200ms" }}>
      <p className="num-display text-4xl md:text-5xl font-medium leading-none tabular-nums">
        <span className={color}>{value}</span>
      </p>
      <p className="section-eyebrow mt-2 normal-case tracking-[0.16em] text-[0.65rem]">
        {label}
      </p>
    </div>
  );
}

function StatTile({
  title,
  value,
  icon: Icon,
  tone,
  href,
  delay = 0,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  tone: "oxblood" | "sage" | "brass" | "destructive" | "muted";
  href?: string;
  delay?: number;
}) {
  const map = {
    oxblood: { swatch: "bg-[var(--almanac-oxblood)]", text: "text-[var(--almanac-oxblood)]" },
    sage: { swatch: "bg-[var(--almanac-sage)]", text: "text-[var(--almanac-sage)]" },
    brass: { swatch: "bg-[var(--almanac-brass)]", text: "text-[var(--almanac-brass)]" },
    destructive: { swatch: "bg-destructive", text: "text-destructive" },
    muted: { swatch: "bg-foreground/30", text: "text-foreground/55" },
  }[tone];

  const content = (
    <div
      className="paper-grain group relative h-full overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-1 hover:border-[var(--almanac-brass)]/40 hover:shadow-[0_18px_40px_-12px_color-mix(in_oklab,var(--almanac-oxblood)_22%,transparent)]"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="relative flex flex-col gap-4 h-full min-h-[6.5rem]">
        <div className="flex items-start justify-between">
          <span className={`block h-1.5 w-10 rounded-full ${map.swatch}`} />
          <Icon className={`h-4 w-4 ${map.text} opacity-80`} />
        </div>
        <div>
          <p className="num-display text-5xl font-medium tracking-tight tabular-nums leading-none count-in">
            <span className={map.text}>{value}</span>
          </p>
          <p className="section-eyebrow mt-3 normal-case text-[0.7rem]">{title}</p>
        </div>
      </div>
    </div>
  );

  if (href) return <Link href={href} className="block h-full">{content}</Link>;
  return content;
}
