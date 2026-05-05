"use client";

import { use } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, FileSpreadsheet } from "lucide-react";
import { PageTransition, StaggerList, StaggerItem } from "@/components/shared/motion";
import { Skeleton } from "@/components/ui/skeleton";
import { ApplicationRow } from "@/components/application/application-row";
import { AddApplicationDialog } from "@/components/application/add-application-dialog";

export default function StudentApplicationsPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = use(params);
  const { data: apps, isLoading } = trpc.application.list.useQuery({ studentId });
  const { data: student } = trpc.student.getById.useQuery({ id: studentId });

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link
              href={`/students/${studentId}`}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to case file
            </Link>
            <h1 className="text-2xl font-bold tracking-tight mt-2 flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
              Applications
            </h1>
            {student && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {student.preferredName ?? student.firstName} {student.lastName} ·{" "}
                Class of {student.graduationYear}
              </p>
            )}
          </div>
          <AddApplicationDialog studentId={studentId} />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        ) : apps && apps.length > 0 ? (
          <StaggerList className="space-y-3">
            {apps.map((a) => (
              <StaggerItem key={a.id}>
                <ApplicationRow app={a} />
              </StaggerItem>
            ))}
          </StaggerList>
        ) : (
          <div className="rounded-2xl border border-foreground/[0.06] bg-card p-10 text-center glow-card">
            <FileSpreadsheet className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <h3 className="font-semibold mb-1">No applications yet</h3>
            <p className="text-sm text-muted-foreground/70 max-w-md mx-auto mb-4">
              Add a school to seed a default checklist (transcript, scores, essay,
              recs) and start tracking what&apos;s missing.
            </p>
            <AddApplicationDialog studentId={studentId} />
          </div>
        )}
      </div>
    </PageTransition>
  );
}
