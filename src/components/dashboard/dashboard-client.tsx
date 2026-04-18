"use client";

import { Users, Calendar, CheckCircle, AlertTriangle, Sparkles } from "lucide-react";
import {
  PageTransition,
  StaggerList,
  StaggerItem,
  AnimatedCard,
  motion,
  fadeSlideUp,
} from "@/components/shared/motion";

export function DashboardClient({
  greeting,
  firstName,
}: {
  greeting: string;
  firstName: string;
}) {
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
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <h1 className="text-3xl font-bold tracking-tight">
              {greeting},{" "}
              <span className="gradient-text">{firstName}</span>.
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Here&apos;s what needs your attention today.
            </p>
          </motion.div>
        </motion.div>

        {/* Stats grid */}
        <StaggerList className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AnimatedCard>
            <StatCard
              title="Active Students"
              value="0"
              icon={Users}
              gradient="from-blue-500 to-cyan-400"
            />
          </AnimatedCard>
          <AnimatedCard>
            <StatCard
              title="Upcoming Meetings"
              value="0"
              icon={Calendar}
              gradient="from-violet-500 to-purple-400"
            />
          </AnimatedCard>
          <AnimatedCard>
            <StatCard
              title="Pending Approvals"
              value="0"
              icon={CheckCircle}
              gradient="from-amber-500 to-orange-400"
            />
          </AnimatedCard>
          <AnimatedCard>
            <StatCard
              title="Overdue Tasks"
              value="0"
              icon={AlertTriangle}
              gradient="from-red-500 to-pink-400"
            />
          </AnimatedCard>
        </StaggerList>

        {/* Content grid */}
        <StaggerList className="grid gap-5 md:grid-cols-2">
          <AnimatedCard className="rounded-2xl border border-white/[0.06] bg-card p-6 hover:border-white/[0.12] transition-colors">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-4 w-4 text-[oklch(0.65_0.2_265)]" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Today&apos;s Priorities
              </h2>
            </div>
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No priorities yet. Add students to get started.
              </p>
            </div>
          </AnimatedCard>
          <AnimatedCard className="rounded-2xl border border-white/[0.06] bg-card p-6 hover:border-white/[0.12] transition-colors">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-4 w-4 text-[oklch(0.7_0.18_155)]" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Upcoming Deadlines
              </h2>
            </div>
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No upcoming deadlines.
              </p>
            </div>
          </AnimatedCard>
        </StaggerList>
      </div>
    </PageTransition>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  gradient,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  gradient: string;
}) {
  return (
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
}
