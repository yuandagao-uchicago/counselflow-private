"use client";

import { CheckCircle2, Circle, Clock, AlertTriangle, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  source: string;
  dueDate: string | Date | null;
}

const priorityConfig: Record<string, { color: string; label: string }> = {
  URGENT: { color: "text-red-400", label: "Urgent" },
  HIGH: { color: "text-orange-400", label: "High" },
  MEDIUM: { color: "text-yellow-400", label: "Medium" },
  LOW: { color: "text-muted-foreground", label: "Low" },
};

const sourceLabels: Record<string, { label: string; style: string }> = {
  AI_EXTRACTED: { label: "AI", style: "bg-[oklch(0.34_0.13_25_/_15%)] text-[oklch(0.66_0.15_75)]" },
  SYSTEM_GENERATED: { label: "System", style: "bg-foreground/5 text-muted-foreground" },
  MANUAL: { label: "Manual", style: "bg-foreground/5 text-muted-foreground" },
};

export function TasksCard({ tasks, studentId }: { tasks: Task[]; studentId: string }) {
  const utils = trpc.useUtils();

  const completeTask = trpc.student.completeTask.useMutation({
    onSuccess: () => {
      utils.student.getById.invalidate({ id: studentId });
      utils.dashboard.stats.invalidate();
      toast.success("Task completed!");
    },
    onError: (err) => toast.error(err.message || "Failed to update task"),
  });

  const deleteTask = trpc.student.deleteTask.useMutation({
    onSuccess: () => {
      utils.student.getById.invalidate({ id: studentId });
      utils.dashboard.stats.invalidate();
      toast.success("Task deleted");
    },
    onError: (err) => toast.error(err.message || "Failed to delete task"),
  });

  return (
    <div className="rounded-2xl border border-foreground/[0.06] bg-card p-5 glow-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Open Tasks
        </h3>
        <span className="text-xs text-muted-foreground">
          {tasks.length} item{tasks.length !== 1 ? "s" : ""}
        </span>
      </div>

      {tasks.length === 0 ? (
        <div className="py-8 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500/50 mb-2" />
          <p className="text-sm text-muted-foreground">All caught up!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => {
            const priority = priorityConfig[task.priority] || priorityConfig.MEDIUM;
            const source = sourceLabels[task.source] || sourceLabels.MANUAL;

            return (
              <div
                key={task.id}
                className="flex items-start gap-3 rounded-xl bg-foreground/[0.03] p-3 hover:bg-foreground/[0.06] transition-colors group"
              >
                {/* Clickable status icon — complete */}
                <button
                  onClick={() => completeTask.mutate({ taskId: task.id })}
                  disabled={completeTask.isPending}
                  className="mt-0.5 hover:scale-110 transition-transform disabled:opacity-50"
                  title="Mark as complete"
                >
                  {task.status === "WAITING_ON_EXTERNAL" ? (
                    <Clock className="h-4 w-4 text-amber-400" />
                  ) : (
                    <Circle className={`h-4 w-4 ${priority.color} hover:text-emerald-400 transition-colors`} />
                  )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight">{task.title}</p>
                  <div className="mt-1 flex items-center gap-2">
                    {task.dueDate && (
                      <span className="text-xs text-muted-foreground">
                        Due {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
                      </span>
                    )}
                    {task.source !== "MANUAL" && (
                      <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 h-4 ${source.style}`}>
                        {source.label}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Priority indicator */}
                {task.priority === "URGENT" && (
                  <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                )}

                {/* Delete button — appears on hover */}
                <button
                  onClick={() => {
                    if (confirm(`Delete task "${task.title}"?`)) {
                      deleteTask.mutate({ taskId: task.id });
                    }
                  }}
                  disabled={deleteTask.isPending}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-red-500/10 text-muted-foreground/60 hover:text-red-400 transition-all disabled:opacity-30 shrink-0"
                  title="Delete task"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
