"use client";

import {
  Check,
  Lock,
  Circle,
  SkipForward,
  Sparkles,
  BookOpen,
  PenLine,
  Target,
  Landmark,
  FileText,
  GraduationCap,
  Award,
  Banknote,
  Users,
} from "lucide-react";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface JourneyMilestone {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  targetDate: string | Date | null;
  templateKey: string | null;
}

const categoryStyle: Record<
  string,
  { gradient: string; glow: string; Icon: typeof Sparkles }
> = {
  Research: { gradient: "from-blue-500 to-cyan-400", glow: "shadow-blue-500/30", Icon: BookOpen },
  Testing: { gradient: "from-amber-500 to-orange-400", glow: "shadow-amber-500/30", Icon: Target },
  Application: {
    gradient: "from-violet-500 to-purple-400",
    glow: "shadow-violet-500/30",
    Icon: Landmark,
  },
  Essay: { gradient: "from-pink-500 to-rose-400", glow: "shadow-pink-500/30", Icon: PenLine },
  Recommendation: {
    gradient: "from-indigo-500 to-blue-400",
    glow: "shadow-indigo-500/30",
    Icon: Users,
  },
  "Financial Aid": {
    gradient: "from-emerald-500 to-green-400",
    glow: "shadow-emerald-500/30",
    Icon: Banknote,
  },
};

// Per-template overrides for more bespoke iconography
const templateIconOverride: Record<string, typeof Sparkles> = {
  initial_college_research: BookOpen,
  finalize_test_plan: Target,
  summer_programs_or_activities: Award,
  narrow_college_list: BookOpen,
  request_recommendations: Users,
  common_app_profile: FileText,
  personal_statement_draft: PenLine,
  supplemental_essays: PenLine,
  early_submissions: Landmark,
  regular_submissions: Landmark,
  fafsa_css: Banknote,
  final_decision: GraduationCap,
};

const STATUS_OPTIONS = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "BLOCKED", "SKIPPED"] as const;

interface JourneyNodeProps {
  milestone: JourneyMilestone;
  side: "left" | "right";
  isLast: boolean;
  studentId: string;
  isCurrent: boolean;
}

export function JourneyNode({ milestone, side, isLast, studentId, isCurrent }: JourneyNodeProps) {
  const utils = trpc.useUtils();
  const updateStatus = trpc.milestone.updateStatus.useMutation({
    onSuccess: () => {
      utils.student.getById.invalidate({ id: studentId });
      utils.milestone.list.invalidate({ studentId });
    },
    onError: (err) => toast.error(err.message || "Failed to update"),
  });

  const catStyle = categoryStyle[milestone.category] || categoryStyle.Application;
  const Icon =
    (milestone.templateKey && templateIconOverride[milestone.templateKey]) || catStyle.Icon;
  const targetDate = milestone.targetDate ? new Date(milestone.targetDate) : null;

  const status = milestone.status;
  const isDone = status === "COMPLETED";
  const isBlocked = status === "BLOCKED";
  const isSkipped = status === "SKIPPED";
  const isActive = status === "IN_PROGRESS";
  const isLocked = status === "NOT_STARTED" && !isCurrent;

  return (
    <div className="relative grid grid-cols-9 items-center gap-4 min-h-[180px]">
      {/* Left card slot */}
      <div className="col-span-4">
        {side === "left" && !isLocked && !isSkipped && (
          <ProgressCard milestone={milestone} status={status} />
        )}
      </div>

      {/* Center: node + vertical connector */}
      <div className="col-span-1 flex flex-col items-center gap-0 relative z-10">
        {/* Floating badge (only on completed + current) */}
        {(isDone || isCurrent) && (
          <div
            className={`absolute -top-4 -right-3 flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br ${catStyle.gradient} shadow-lg ${catStyle.glow} rotate-12 z-20`}
          >
            <Sparkles className="h-4 w-4 text-white" />
          </div>
        )}

        {/* Node */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                title="Change status"
                className="focus:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.34_0.13_25)] focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-full"
              />
            }
          >
            <NodeVisual
              Icon={Icon}
              isDone={isDone}
              isCurrent={isCurrent}
              isActive={isActive}
              isBlocked={isBlocked}
              isSkipped={isSkipped}
              isLocked={isLocked}
              catStyle={catStyle}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="border-foreground/10 bg-popover"
          >
            {STATUS_OPTIONS.map((s) => (
              <DropdownMenuItem
                key={s}
                disabled={s === status || updateStatus.isPending}
                onClick={() => updateStatus.mutate({ id: milestone.id, status: s })}
              >
                {statusLabel(s)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Label below node */}
        <p className="text-[11px] font-medium text-center mt-2 max-w-[120px] leading-tight">
          {milestone.title}
        </p>
        {targetDate && (
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {format(targetDate, "MMM yyyy")}
          </p>
        )}

        {/* Connecting line to next node */}
        {!isLast && (
          <svg
            className="absolute left-1/2 -translate-x-1/2 top-full pointer-events-none"
            width="240"
            height="180"
            viewBox="0 0 240 180"
            style={{ zIndex: 0 }}
          >
            {side === "left" ? (
              <path
                d="M 120 0 C 120 60, 80 120, 40 170"
                stroke="url(#journeyLine)"
                strokeWidth="3"
                strokeDasharray={isLocked ? "6 6" : "0"}
                fill="none"
                strokeLinecap="round"
              />
            ) : (
              <path
                d="M 120 0 C 120 60, 160 120, 200 170"
                stroke="url(#journeyLine)"
                strokeWidth="3"
                strokeDasharray={isLocked ? "6 6" : "0"}
                fill="none"
                strokeLinecap="round"
              />
            )}
            <defs>
              <linearGradient id="journeyLine" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.34 0.13 25)" stopOpacity={isLocked ? 0.15 : 0.5} />
                <stop offset="100%" stopColor="oklch(0.34 0.13 25)" stopOpacity={isLocked ? 0.1 : 0.3} />
              </linearGradient>
            </defs>
          </svg>
        )}
      </div>

      {/* Right card slot */}
      <div className="col-span-4">
        {side === "right" && !isLocked && !isSkipped && (
          <ProgressCard milestone={milestone} status={status} />
        )}
      </div>
    </div>
  );
}

function NodeVisual({
  Icon,
  isDone,
  isCurrent,
  isActive,
  isBlocked,
  isSkipped,
  isLocked,
  catStyle,
}: {
  Icon: typeof Sparkles;
  isDone: boolean;
  isCurrent: boolean;
  isActive: boolean;
  isBlocked: boolean;
  isSkipped: boolean;
  isLocked: boolean;
  catStyle: { gradient: string; glow: string };
}) {
  if (isDone) {
    return (
      <div className="relative">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-green-500 shadow-xl shadow-emerald-500/40 transition-transform hover:scale-105">
          <Check className="h-7 w-7 text-white" strokeWidth={3} />
        </div>
      </div>
    );
  }
  if (isBlocked) {
    return (
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-rose-500 shadow-xl shadow-red-500/30 transition-transform hover:scale-105">
        <Lock className="h-6 w-6 text-white" />
      </div>
    );
  }
  if (isSkipped) {
    return (
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-foreground/5 border-2 border-dashed border-foreground/20 transition-transform hover:scale-105">
        <SkipForward className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }
  if (isCurrent || isActive) {
    return (
      <div className="relative">
        <div
          className={`flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br ${catStyle.gradient} shadow-xl ${catStyle.glow} ring-4 ring-[oklch(0.34_0.13_25_/_20%)] transition-transform hover:scale-105`}
        >
          <Icon className="h-7 w-7 text-white" strokeWidth={2.5} />
        </div>
        {/* Pulsing halo */}
        <div
          className={`absolute inset-0 rounded-full bg-gradient-to-br ${catStyle.gradient} animate-ping opacity-20`}
        />
      </div>
    );
  }
  if (isLocked) {
    return (
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-foreground/5 border border-foreground/10 transition-transform hover:scale-105">
        <Lock className="h-5 w-5 text-muted-foreground/50" />
      </div>
    );
  }
  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-foreground/10 transition-transform hover:scale-105">
      <Circle className="h-6 w-6 text-muted-foreground" />
    </div>
  );
}

function ProgressCard({
  milestone,
  status,
}: {
  milestone: JourneyMilestone;
  status: string;
}) {
  const isDone = status === "COMPLETED";
  const isActive = status === "IN_PROGRESS";
  const isBlocked = status === "BLOCKED";

  const completion = isDone ? 100 : isActive ? 50 : isBlocked ? 25 : 0;

  const statusLabel = isDone
    ? "Complete"
    : isActive
    ? "In progress"
    : isBlocked
    ? "Blocked"
    : "Not started";

  const accent = isDone
    ? "text-emerald-400"
    : isActive
    ? "text-[oklch(0.66_0.15_75)]"
    : isBlocked
    ? "text-red-400"
    : "text-muted-foreground";

  return (
    <div className="rounded-2xl border border-foreground/[0.06] bg-card p-4 glow-card">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight truncate">{milestone.title}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{milestone.category}</p>
        </div>
        <span className={`text-[10px] uppercase tracking-wider font-bold ${accent} shrink-0`}>
          {statusLabel}
        </span>
      </div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-muted-foreground">Completion</span>
        <span className={`font-bold font-mono ${accent}`}>{completion}%</span>
      </div>
      <div className="relative h-1.5 rounded-full bg-foreground/5 overflow-hidden mb-3">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
            isDone
              ? "bg-gradient-to-r from-emerald-500 to-green-400"
              : isBlocked
              ? "bg-gradient-to-r from-red-500 to-rose-500"
              : "bg-gradient-to-r from-[oklch(0.34_0.13_25)] to-[oklch(0.34_0.13_25)]"
          }`}
          style={{ width: `${completion}%` }}
        />
      </div>
      {milestone.description && (
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {milestone.description}
        </p>
      )}
    </div>
  );
}

function statusLabel(s: (typeof STATUS_OPTIONS)[number]): string {
  switch (s) {
    case "NOT_STARTED":
      return "Not started";
    case "IN_PROGRESS":
      return "In progress";
    case "COMPLETED":
      return "Completed";
    case "BLOCKED":
      return "Blocked";
    case "SKIPPED":
      return "Skipped";
  }
}

