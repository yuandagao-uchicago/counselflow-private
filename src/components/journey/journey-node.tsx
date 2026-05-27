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

// Map journey categories onto the Almanac phase color tokens so the journey
// reads as part of the same design system as the rest of the app (instead of
// the previous saturated rainbow Tailwind gradients).
const categoryStyle: Record<
  string,
  { cssVar: string; Icon: typeof Sparkles }
> = {
  Research:        { cssVar: "--phase-exploration",  Icon: BookOpen },
  Testing:         { cssVar: "--phase-testing",      Icon: Target },
  Application:     { cssVar: "--phase-applications", Icon: Landmark },
  Essay:           { cssVar: "--phase-essays",       Icon: PenLine },
  Recommendation:  { cssVar: "--phase-list-building", Icon: Users },
  "Financial Aid": { cssVar: "--phase-enrollment",   Icon: Banknote },
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

export function JourneyNode({ milestone, side, studentId, isCurrent }: JourneyNodeProps) {
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
          <ProgressCard milestone={milestone} status={status} cssVar={catStyle.cssVar} />
        )}
      </div>

      {/* Center: node */}
      <div className="col-span-1 flex flex-col items-center gap-0 relative z-10">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                title="Change status"
                className="focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--almanac-oxblood)] focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-full"
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
              cssVar={catStyle.cssVar}
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
        <p className="text-[11px] font-medium text-center mt-3 max-w-[120px] leading-tight">
          {milestone.title}
        </p>
        {targetDate && (
          <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
            {format(targetDate, "MMM yyyy")}
          </p>
        )}
      </div>

      {/* Right card slot */}
      <div className="col-span-4">
        {side === "right" && !isLocked && !isSkipped && (
          <ProgressCard milestone={milestone} status={status} cssVar={catStyle.cssVar} />
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
  cssVar,
}: {
  Icon: typeof Sparkles;
  isDone: boolean;
  isCurrent: boolean;
  isActive: boolean;
  isBlocked: boolean;
  isSkipped: boolean;
  isLocked: boolean;
  cssVar: string;
}) {
  if (isDone) {
    return (
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full shadow-md transition-transform hover:scale-105"
        style={{
          backgroundColor: `var(${cssVar})`,
          boxShadow: `0 6px 18px -6px color-mix(in oklab, var(${cssVar}) 50%, transparent)`,
        }}
      >
        <Check className="h-6 w-6 text-white" strokeWidth={3} />
      </div>
    );
  }
  if (isBlocked) {
    return (
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-card border-2 border-destructive/60 transition-transform hover:scale-105">
        <Lock className="h-5 w-5 text-destructive" />
      </div>
    );
  }
  if (isSkipped) {
    return (
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-foreground/5 border-2 border-dashed border-foreground/20 transition-transform hover:scale-105">
        <SkipForward className="h-5 w-5 text-muted-foreground" />
      </div>
    );
  }
  if (isCurrent || isActive) {
    return (
      <div className="relative">
        {/* Outer breathing ring */}
        <span
          className="pulse-glow absolute -inset-1.5 rounded-full"
          style={{
            boxShadow: `0 0 0 2px color-mix(in oklab, var(${cssVar}) 28%, transparent)`,
          }}
          aria-hidden="true"
        />
        {/* Node */}
        <div
          className="relative flex h-14 w-14 items-center justify-center rounded-full transition-transform hover:scale-105"
          style={{
            backgroundColor: `color-mix(in oklab, var(${cssVar}) 14%, var(--card))`,
            boxShadow: `inset 0 0 0 2px var(${cssVar}), 0 8px 20px -8px color-mix(in oklab, var(${cssVar}) 45%, transparent)`,
          }}
        >
          <Icon
            className="h-6 w-6"
            strokeWidth={2.25}
            style={{ color: `var(${cssVar})` }}
          />
        </div>
      </div>
    );
  }
  if (isLocked) {
    return (
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-foreground/[0.04] border border-foreground/10 transition-transform hover:scale-105">
        <Lock className="h-4 w-4 text-muted-foreground/50" />
      </div>
    );
  }
  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-foreground/[0.06] transition-transform hover:scale-105">
      <Circle className="h-5 w-5 text-muted-foreground" />
    </div>
  );
}

function ProgressCard({
  milestone,
  status,
  cssVar,
}: {
  milestone: JourneyMilestone;
  status: string;
  cssVar: string;
}) {
  const isDone = status === "COMPLETED";
  const isActive = status === "IN_PROGRESS";
  const isBlocked = status === "BLOCKED";

  const completion = isDone ? 100 : isActive ? 50 : isBlocked ? 25 : 0;

  const statusText = isDone
    ? "Complete"
    : isActive
    ? "In progress"
    : isBlocked
    ? "Blocked"
    : "Not started";

  const accentColor = isDone || isActive
    ? `var(${cssVar})`
    : isBlocked
    ? "var(--destructive)"
    : "var(--muted-foreground)";

  return (
    <div className="rounded-2xl border border-foreground/[0.06] bg-card p-4 glow-card">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight truncate">{milestone.title}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{milestone.category}</p>
        </div>
        <span
          className="text-[10px] uppercase tracking-wider font-bold shrink-0"
          style={{ color: accentColor }}
        >
          {statusText}
        </span>
      </div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-muted-foreground">Completion</span>
        <span className="font-bold font-mono" style={{ color: accentColor }}>
          {completion}%
        </span>
      </div>
      <div className="relative h-1.5 rounded-full bg-foreground/5 overflow-hidden mb-3">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
          style={{
            width: `${completion}%`,
            backgroundColor: isBlocked ? "var(--destructive)" : `var(${cssVar})`,
          }}
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
