"use client";

import { use } from "react";
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
import { UploadDocumentsPanel } from "@/components/document/upload-documents-panel";
import { ExtractionReviewCard } from "@/components/document/extraction-review-card";
import { ApplicationsCard } from "@/components/application/applications-card";
import { RecommendersCard } from "@/components/student/recommenders-card";
import { GuardiansCard } from "@/components/student/guardians-card";
import { WeeklyUpdateCard } from "@/components/student/weekly-update-card";
import { Sparkles } from "lucide-react";

export default function StudentDetailPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = use(params);
  const { data: student, isLoading } = trpc.student.getById.useQuery({ id: studentId });
  // Per-student pending extractions — same tRPC endpoint as /approvals, just scoped
  const { data: pendingReviews } = trpc.review.list.useQuery({
    status: "PENDING",
    studentId,
  });

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

  const pendingExtractions = (pendingReviews ?? []).filter(
    (r) => r.entityType === "profile_extraction"
  );

  return (
    <PageTransition>
      <div className="space-y-6">
        <StudentHeader student={student} />

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <QuickActions studentId={student.id} />
        </motion.div>

        {/* Pending extractions — surfaces at the top when there's AI work awaiting approval */}
        {pendingExtractions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary pulse-glow" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Pending profile updates
              </h2>
              <span className="text-xs text-muted-foreground">
                · {pendingExtractions.length} awaiting your review
              </span>
            </div>
            {pendingExtractions.map((r) => (
              <ExtractionReviewCard key={r.id} item={r} />
            ))}
          </div>
        )}

        <StaggerList className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <StaggerItem><ProfileCard student={student} /></StaggerItem>
            <StaggerItem><ApplicationsCard studentId={student.id} /></StaggerItem>
            <StaggerItem><RecommendersCard studentId={student.id} /></StaggerItem>
            <StaggerItem><GuardiansCard studentId={student.id} /></StaggerItem>
            <StaggerItem><WeeklyUpdateCard studentId={student.id} /></StaggerItem>
            <StaggerItem><UploadDocumentsPanel studentId={student.id} /></StaggerItem>
            <StaggerItem><TasksCard tasks={student.tasks} studentId={student.id} /></StaggerItem>
            <StaggerItem><MeetingsCard meetings={student.meetings} studentId={student.id} /></StaggerItem>
          </div>

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
