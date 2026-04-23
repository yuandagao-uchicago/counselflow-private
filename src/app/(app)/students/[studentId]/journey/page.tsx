"use client";

import { use } from "react";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { PageTransition } from "@/components/shared/motion";
import { JourneyHeader } from "@/components/journey/journey-header";
import { JourneyCallout } from "@/components/journey/journey-callout";
import { JourneyNode } from "@/components/journey/journey-node";
import { JourneyComplete } from "@/components/journey/journey-complete";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function JourneyPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = use(params);
  const utils = trpc.useUtils();
  const { data: student, isLoading } = trpc.student.getById.useQuery({ id: studentId });

  const seed = trpc.milestone.seedForStudent.useMutation({
    onSuccess: (res) => {
      utils.student.getById.invalidate({ id: studentId });
      if (res.created === 0) {
        toast.info("Already up to date");
      } else {
        toast.success(`Generated ${res.created} milestones`);
      }
    },
    onError: (err) => toast.error(err.message || "Failed to seed"),
  });

  if (isLoading) {
    return (
      <div className="space-y-6 page-enter max-w-5xl mx-auto">
        <Skeleton className="h-48 rounded-3xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-[700px] rounded-2xl" />
      </div>
    );
  }

  if (!student) {
    return <p className="text-muted-foreground">Student not found.</p>;
  }

  const milestones = student.milestones;
  const total = milestones.length;
  const completed = milestones.filter((m) => m.status === "COMPLETED").length;
  const inProgress = milestones.filter((m) => m.status === "IN_PROGRESS").length;

  // The "current" milestone is the first non-completed one
  const currentIndex = milestones.findIndex(
    (m) => m.status !== "COMPLETED" && m.status !== "SKIPPED"
  );
  const nextMilestone = currentIndex >= 0 ? milestones[currentIndex] : null;

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto space-y-10 py-4">
        <JourneyHeader
          student={student}
          completed={completed}
          total={total}
          inProgress={inProgress}
        />

        <JourneyCallout />

        {/* The journey */}
        {total === 0 ? (
          <div className="rounded-3xl border border-dashed border-foreground/10 bg-card/50 p-12 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[oklch(0.65_0.2_265)] to-[oklch(0.55_0.22_290)] shadow-lg shadow-[oklch(0.65_0.2_265_/_30%)]">
              <Sparkles className="h-7 w-7 text-white" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Generate the application timeline</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                We&apos;ll lay out the 12 core checkpoints of a senior-year application cycle,
                dated against {student.firstName}&apos;s graduation.
              </p>
            </div>
            <Button
              size="lg"
              onClick={() => seed.mutate({ studentId })}
              disabled={seed.isPending}
              className="bg-gradient-to-r from-[oklch(0.65_0.2_265)] to-[oklch(0.55_0.22_290)] text-white border-0 shadow-lg shadow-[oklch(0.65_0.2_265_/_20%)]"
            >
              {seed.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate journey
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="relative py-4">
            {milestones.map((m, i) => (
              <JourneyNode
                key={m.id}
                milestone={m}
                side={i % 2 === 0 ? "right" : "left"}
                isLast={i === milestones.length - 1}
                studentId={studentId}
                isCurrent={i === currentIndex}
              />
            ))}
          </div>
        )}

        {total > 0 && (
          <JourneyComplete
            completed={completed}
            total={total}
            nextTitle={nextMilestone?.title ?? null}
          />
        )}
      </div>
    </PageTransition>
  );
}
