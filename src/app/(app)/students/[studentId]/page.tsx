"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { PageTransition, StaggerList, StaggerItem, motion } from "@/components/shared/motion";
import { Skeleton } from "@/components/ui/skeleton";
import { StudentHeader } from "@/components/student/student-header";
import { PhaseCard } from "@/components/student/phase-card";
import { TasksCard } from "@/components/student/tasks-card";
import { MilestonesCard } from "@/components/student/milestones-card";
import { MeetingsCard } from "@/components/student/meetings-card";
import { RisksCard } from "@/components/student/risks-card";
import { ProfileCard } from "@/components/student/profile-card";
import { QuickActions } from "@/components/student/quick-actions";

export default function StudentDetailPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = use(params);
  const router = useRouter();
  const { data: student, isLoading } = trpc.student.getById.useQuery({ id: studentId });

  if (isLoading) {
    return (
      <div className="space-y-6 page-enter">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-48 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Student not found.</p>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Hero header */}
        <StudentHeader student={student} />

        {/* Quick action bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <QuickActions studentId={student.id} />
        </motion.div>

        {/* Main grid */}
        <StaggerList className="grid gap-5 lg:grid-cols-3">
          {/* Left column — 2/3 */}
          <div className="space-y-5 lg:col-span-2">
            <StaggerItem><ProfileCard student={student} /></StaggerItem>
            <StaggerItem><TasksCard tasks={student.tasks} studentId={student.id} /></StaggerItem>
            <StaggerItem><MeetingsCard meetings={student.meetings} studentId={student.id} /></StaggerItem>
          </div>

          {/* Right column — 1/3 */}
          <div className="space-y-5">
            <StaggerItem><PhaseCard phase={student.phase} /></StaggerItem>
            <StaggerItem><MilestonesCard milestones={student.milestones} studentId={student.id} /></StaggerItem>
            <StaggerItem><RisksCard risks={student.riskFlags} /></StaggerItem>
          </div>
        </StaggerList>
      </div>
    </PageTransition>
  );
}
