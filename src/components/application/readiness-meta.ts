/**
 * Shared visual vocabulary for application readiness across cards, lists,
 * detail pages, and the dashboard. Keeping this in one file means the
 * counselor sees the same color/icon/label for "due in 12 days" everywhere.
 */
import type { ReadinessUrgency, ReadinessState } from "@/lib/readiness";
import { AlertTriangle, Clock, Calendar, CheckCircle2, Circle, Send, FileWarning } from "lucide-react";

export const urgencyMeta: Record<
  ReadinessUrgency,
  { label: string; tone: string; chip: string; ring: string; icon: typeof Clock }
> = {
  OVERDUE: {
    label: "Overdue",
    tone: "text-red-400",
    chip: "bg-red-500/15 text-red-300 border border-red-500/30",
    ring: "ring-red-500/40",
    icon: AlertTriangle,
  },
  DUE_SOON: {
    label: "Due soon",
    tone: "text-orange-400",
    chip: "bg-orange-500/15 text-orange-300 border border-orange-500/30",
    ring: "ring-orange-500/40",
    icon: Clock,
  },
  UPCOMING: {
    label: "Upcoming",
    tone: "text-amber-300",
    chip: "bg-amber-500/15 text-amber-200 border border-amber-500/30",
    ring: "ring-amber-500/30",
    icon: Calendar,
  },
  NORMAL: {
    label: "On track",
    tone: "text-muted-foreground",
    chip: "bg-foreground/5 text-muted-foreground border border-foreground/10",
    ring: "ring-foreground/10",
    icon: Calendar,
  },
};

export const stateMeta: Record<
  ReadinessState,
  { label: string; chip: string; icon: typeof Circle }
> = {
  SUBMITTED: {
    label: "Submitted",
    chip: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
    icon: Send,
  },
  READY_FOR_REVIEW: {
    label: "Ready to submit",
    chip:
      "bg-gradient-to-r from-[oklch(0.34_0.13_25_/_15%)] to-[oklch(0.34_0.13_25_/_15%)] text-[oklch(0.85_0.1_265)] border border-[oklch(0.34_0.13_25_/_30%)]",
    icon: CheckCircle2,
  },
  IN_PROGRESS: {
    label: "In progress",
    chip: "bg-amber-500/10 text-amber-200 border border-amber-500/20",
    icon: Circle,
  },
  NOT_STARTED: {
    label: "Not started",
    chip: "bg-foreground/5 text-muted-foreground border border-foreground/10",
    icon: FileWarning,
  },
};

const APPLICATION_TYPE_LABELS: Record<string, string> = {
  EARLY_DECISION: "ED",
  EARLY_DECISION_2: "ED II",
  EARLY_ACTION: "EA",
  RESTRICTIVE_EARLY_ACTION: "REA",
  REGULAR_DECISION: "RD",
  ROLLING: "Rolling",
};

export function applicationTypeLabel(type: string): string {
  return APPLICATION_TYPE_LABELS[type] ?? type;
}

export function kindLabel(kind: string): string {
  switch (kind) {
    case "TRANSCRIPT":
      return "Transcript";
    case "TEST_SCORES":
      return "Test scores";
    case "ACTIVITIES_LIST":
      return "Activities list";
    case "COMMON_APP_ESSAY":
      return "Personal statement";
    case "SUPPLEMENT_ESSAY":
      return "Supplement";
    case "RECOMMENDATION":
      return "Recommendation";
    case "COUNSELOR_LETTER":
      return "Counselor letter";
    case "PORTFOLIO":
      return "Portfolio";
    case "INTERVIEW":
      return "Interview";
    case "FINANCIAL_AID":
      return "Financial aid";
    case "APPLICATION_FORM":
      return "Application form";
    case "CUSTOM":
      return "Custom";
    default:
      return kind;
  }
}
