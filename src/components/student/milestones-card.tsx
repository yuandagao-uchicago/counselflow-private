"use client";

import Link from "next/link";
import { CheckCircle2, Circle, Lock, SkipForward, Sparkles, ArrowRight, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Milestone {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  category: string;
  targetDate: string | Date | null;
}

const statusConfig: Record<string, { icon: typeof Circle; color: string; label: string }> = {
  COMPLETED: { icon: CheckCircle2, color: "text-emerald-400", label: "Completed" },
  IN_PROGRESS: { icon: Circle, color: "text-[oklch(0.65_0.2_265)]", label: "In progress" },
  BLOCKED: { icon: Lock, color: "text-red-400", label: "Blocked" },
  SKIPPED: { icon: SkipForward, color: "text-muted-foreground", label: "Skipped" },
  NOT_STARTED: { icon: Circle, color: "text-foreground/20", label: "Not started" },
};

const STATUS_OPTIONS = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "BLOCKED", "SKIPPED"] as const;

export function MilestonesCard({
  milestones,
  studentId,
}: {
  milestones: Milestone[];
  studentId: string;
}) {
  const utils = trpc.useUtils();

  const updateStatus = trpc.milestone.updateStatus.useMutation({
    onSuccess: () => {
      utils.student.getById.invalidate({ id: studentId });
    },
    onError: (err) => toast.error(err.message || "Failed to update milestone"),
  });

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

  const sync = trpc.milestone.syncFromData.useMutation({
    onSuccess: (res) => {
      utils.student.getById.invalidate({ id: studentId });
      utils.milestone.list.invalidate({ studentId });
      if (res.updated === 0) {
        toast.info("Milestones already match the student's state.");
      } else {
        toast.success(`Updated ${res.updated} milestone${res.updated === 1 ? "" : "s"} from current data.`);
      }
    },
    onError: (err) => toast.error(err.message || "Failed to sync"),
  });

  return (
    <div className="rounded-2xl border border-foreground/[0.06] bg-card p-5 glow-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Milestones
        </h3>
        <div className="flex items-center gap-2">
          {milestones.length > 0 && (
            <button
              onClick={() => sync.mutate({ studentId })}
              disabled={sync.isPending}
              title="Recompute milestone status from current student data (apps, essays, scores, etc.)"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className={`h-3 w-3 ${sync.isPending ? "animate-spin" : ""}`} />
              Sync
            </button>
          )}
          {milestones.length > 0 && (
            <Link
              href={`/students/${studentId}/journey`}
              className="inline-flex items-center gap-1 text-xs text-[oklch(0.75_0.15_265)] hover:underline"
            >
              Journey
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      </div>

      {milestones.length === 0 ? (
        <div className="py-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground/70">No milestones yet.</p>
          <Button
            size="sm"
            variant="outline"
            className="border-foreground/10 bg-foreground/5 hover:bg-foreground/10"
            onClick={() => seed.mutate({ studentId })}
            disabled={seed.isPending}
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            Generate application timeline
          </Button>
        </div>
      ) : (
        <div className="space-y-1">
          {milestones.map((milestone, i) => {
            const config = statusConfig[milestone.status] || statusConfig.NOT_STARTED;
            const Icon = config.icon;
            const isLast = i === milestones.length - 1;
            const targetDate = milestone.targetDate
              ? new Date(milestone.targetDate)
              : null;

            return (
              <div key={milestone.id} className="flex items-start gap-3 py-1.5 group">
                {/* Timeline line + dot — click to cycle */}
                <div className="flex flex-col items-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <button
                          title="Change status"
                          className="rounded-full hover:bg-foreground/5 p-0.5 transition-colors disabled:opacity-50"
                          disabled={updateStatus.isPending}
                        />
                      }
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${config.color}`} />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="border-foreground/10 bg-popover">
                      {STATUS_OPTIONS.map((s) => {
                        const optConfig = statusConfig[s];
                        const OptIcon = optConfig.icon;
                        return (
                          <DropdownMenuItem
                            key={s}
                            onClick={() =>
                              updateStatus.mutate({ id: milestone.id, status: s })
                            }
                            disabled={s === milestone.status}
                          >
                            <OptIcon className={`h-3.5 w-3.5 mr-2 ${optConfig.color}`} />
                            {optConfig.label}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {!isLast && (
                    <div className="w-px flex-1 min-h-[16px] bg-foreground/10 mt-1" />
                  )}
                </div>

                {/* Content */}
                <div className="pb-1 flex-1 min-w-0">
                  <p
                    className={`text-sm leading-tight ${
                      milestone.status === "COMPLETED"
                        ? "text-muted-foreground line-through"
                        : "font-medium"
                    }`}
                  >
                    {milestone.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground/60">
                      {milestone.category}
                    </span>
                    {targetDate && (
                      <>
                        <span className="text-xs text-muted-foreground/40">·</span>
                        <span className="text-xs text-muted-foreground/60">
                          Target {format(targetDate, "MMM yyyy")}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
