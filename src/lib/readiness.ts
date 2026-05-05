/**
 * Application readiness engine.
 *
 * Pure functions that compute the "is this kid ready to submit" view.
 * Operates on already-loaded Prisma data; no DB calls inside. Callers in
 * `application.ts` and `dashboard.ts` load the right shape and pass it in.
 *
 * Two responsibilities:
 *   1. `resolveItemStatus` — for a single ApplicationRequirementItem, decide
 *      what its status should be NOW given current student/app state. Used
 *      to "auto-resolve" derived items (transcript on file, recs received,
 *      essay finalized) without the counselor checking a box.
 *   2. `computeReadiness` — roll items + dates into a per-application summary
 *      (completionPct, missing items, urgency, state).
 */
import type {
  ApplicationRequirementItem,
  RequirementItemKind,
  RequirementItemStatus,
  ApplicationStatus,
} from "@prisma/client";

// ----- Inputs (loosely typed shape the engine needs from Prisma) -----

export type ReadinessApplication = {
  id: string;
  status: ApplicationStatus;
  deadline: Date | null;
  submittedAt: Date | null;
  requirementItems: ApplicationRequirementItem[];
  essays: { id: string; status: string }[];
  recommenders: { id: string; requestStatus: string }[];
};

export type ReadinessStudent = {
  satScore: number | null;
  actScore: number | null;
  documents: { documentType: string }[];
  activitiesCount: number;
};

// ----- Derived item resolution -----

/**
 * Given a single requirement item plus the surrounding student/application
 * context, return the status this item should have NOW. For CUSTOM items
 * (no derivationKey, no linked entity) we trust the stored status — the
 * counselor manages it manually. For derived items we auto-resolve.
 */
export function resolveItemStatus(
  item: ApplicationRequirementItem,
  app: ReadinessApplication,
  student: ReadinessStudent,
): RequirementItemStatus {
  // Manual items: respect counselor's stored value.
  if (item.kind === "CUSTOM") return item.status;

  // Linked-entity items resolve from the linked record.
  if (item.essayId) {
    const essay = app.essays.find((e) => e.id === item.essayId);
    if (essay && (essay.status === "FINAL" || essay.status === "SUBMITTED")) {
      return "DONE";
    }
    if (essay && essay.status !== "BRAINSTORMING") return "IN_PROGRESS";
    return item.status === "NOT_APPLICABLE" ? "NOT_APPLICABLE" : "PENDING";
  }

  if (item.recommenderId) {
    const rec = app.recommenders.find((r) => r.id === item.recommenderId);
    if (!rec) return item.status;
    if (rec.requestStatus === "SUBMITTED" || rec.requestStatus === "RECEIVED") {
      return "DONE";
    }
    if (rec.requestStatus === "REQUESTED" || rec.requestStatus === "REMINDED") {
      return "WAITING_ON_EXTERNAL";
    }
    return "PENDING";
  }

  // Kind-based derivation (no linked entity yet — look at student state).
  switch (item.kind as RequirementItemKind) {
    case "TRANSCRIPT": {
      const has = student.documents.some((d) => d.documentType === "TRANSCRIPT");
      return has ? "DONE" : "PENDING";
    }
    case "TEST_SCORES": {
      const hasScores =
        student.satScore != null ||
        student.actScore != null ||
        student.documents.some((d) => d.documentType === "TEST_SCORE");
      return hasScores ? "DONE" : "PENDING";
    }
    case "ACTIVITIES_LIST": {
      // Common App allows up to 10; we mark "DONE" once the list is non-trivial.
      if (student.activitiesCount >= 8) return "DONE";
      if (student.activitiesCount >= 1) return "IN_PROGRESS";
      return "PENDING";
    }
    case "APPLICATION_FORM": {
      if (app.status === "SUBMITTED") return "DONE";
      if (app.status === "READY_FOR_REVIEW") return "DONE";
      if (app.status === "IN_PROGRESS") return "IN_PROGRESS";
      return "PENDING";
    }
    case "COMMON_APP_ESSAY": {
      // Common App essay is one student-wide essay reused across applications.
      // We approximate: if any essay tied to this app is FINAL/SUBMITTED → DONE.
      const finalized = app.essays.some(
        (e) => e.status === "FINAL" || e.status === "SUBMITTED",
      );
      if (finalized) return "DONE";
      const inProgress = app.essays.some(
        (e) => e.status !== "BRAINSTORMING",
      );
      return inProgress ? "IN_PROGRESS" : "PENDING";
    }
    case "RECOMMENDATION": {
      // Generic "rec needed" without a specific recommender attached:
      // mark DONE once at least one recommender is SUBMITTED on this app.
      const submitted = app.recommenders.some(
        (r) => r.requestStatus === "SUBMITTED" || r.requestStatus === "RECEIVED",
      );
      return submitted ? "DONE" : "PENDING";
    }
    default:
      return item.status;
  }
}

// ----- Per-application readiness summary -----

export type ReadinessUrgency =
  | "OVERDUE"
  | "DUE_SOON" // ≤ 14 days
  | "UPCOMING" // ≤ 60 days
  | "NORMAL";

export type ReadinessState =
  | "SUBMITTED"
  | "READY_FOR_REVIEW"
  | "IN_PROGRESS"
  | "NOT_STARTED";

export type MissingItem = {
  id: string;
  kind: RequirementItemKind;
  label: string;
  status: RequirementItemStatus;
  required: boolean;
};

export type ApplicationReadiness = {
  applicationId: string;
  state: ReadinessState;
  urgency: ReadinessUrgency;
  daysUntilDeadline: number | null;
  completionPct: number;
  totalRequired: number;
  doneRequired: number;
  missingRequired: MissingItem[];
  blockerCount: number;
  resolvedItems: { id: string; status: RequirementItemStatus }[];
};

export function computeUrgency(deadline: Date | null, submittedAt: Date | null): {
  urgency: ReadinessUrgency;
  daysUntilDeadline: number | null;
} {
  if (submittedAt) return { urgency: "NORMAL", daysUntilDeadline: null };
  if (!deadline) return { urgency: "NORMAL", daysUntilDeadline: null };

  // Compare by calendar date (midnight-to-midnight) so urgency doesn't
  // flip mid-day based on the exact timestamp.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlineDay = new Date(deadline);
  deadlineDay.setHours(0, 0, 0, 0);
  const days = Math.ceil((deadlineDay.getTime() - today.getTime()) / 86_400_000);

  if (days < 0) return { urgency: "OVERDUE", daysUntilDeadline: days };
  if (days <= 14) return { urgency: "DUE_SOON", daysUntilDeadline: days };
  if (days <= 60) return { urgency: "UPCOMING", daysUntilDeadline: days };
  return { urgency: "NORMAL", daysUntilDeadline: days };
}

export function computeReadiness(
  app: ReadinessApplication,
  student: ReadinessStudent,
): ApplicationReadiness {
  const resolved = app.requirementItems.map((item) => ({
    item,
    resolvedStatus: resolveItemStatus(item, app, student),
  }));

  const required = resolved.filter(
    (r) => r.item.required && r.resolvedStatus !== "NOT_APPLICABLE",
  );

  const doneRequired = required.filter((r) => r.resolvedStatus === "DONE").length;
  const totalRequired = required.length;

  const missingRequired: MissingItem[] = required
    .filter((r) => r.resolvedStatus !== "DONE")
    .map((r) => ({
      id: r.item.id,
      kind: r.item.kind,
      label: r.item.label,
      status: r.resolvedStatus,
      required: r.item.required,
    }));

  // If nothing is required, treat as fully complete (nothing to do).
  const completionPct = totalRequired === 0 ? 100 : Math.round((doneRequired / totalRequired) * 100);

  let state: ReadinessState;
  if (app.submittedAt || app.status === "SUBMITTED") {
    state = "SUBMITTED";
  } else if (totalRequired === 0 || doneRequired === totalRequired) {
    state = "READY_FOR_REVIEW";
  } else if (doneRequired > 0) {
    state = "IN_PROGRESS";
  } else {
    state = "NOT_STARTED";
  }

  const { urgency, daysUntilDeadline } = computeUrgency(app.deadline, app.submittedAt);

  // A "blocker" is a still-missing required item that is also overdue or due-soon.
  const blockerCount =
    urgency === "OVERDUE" || urgency === "DUE_SOON" ? missingRequired.length : 0;

  return {
    applicationId: app.id,
    state,
    urgency,
    daysUntilDeadline,
    completionPct,
    totalRequired,
    doneRequired,
    missingRequired,
    blockerCount,
    resolvedItems: resolved.map((r) => ({ id: r.item.id, status: r.resolvedStatus })),
  };
}

// ----- Default checklist materializer -----

/**
 * The default required-items list for a freshly-created application.
 * Covers the universal Common App expectations; counselor can add
 * school-specific supplements after.
 */
export function defaultChecklist(opts: {
  recommendationCount?: number | null;
  hasSupplement?: boolean;
}): Array<{
  kind: RequirementItemKind;
  label: string;
  required: boolean;
  derivationKey: string;
  sortOrder: number;
}> {
  const recCount = Math.max(0, opts.recommendationCount ?? 2);

  const base: Array<{
    kind: RequirementItemKind;
    label: string;
    required: boolean;
    derivationKey: string;
    sortOrder: number;
  }> = [
    { kind: "APPLICATION_FORM", label: "Application form", required: true, derivationKey: "form", sortOrder: 0 },
    { kind: "TRANSCRIPT", label: "Official transcript", required: true, derivationKey: "transcript", sortOrder: 10 },
    { kind: "TEST_SCORES", label: "Test scores (SAT / ACT)", required: false, derivationKey: "test_scores", sortOrder: 20 },
    { kind: "ACTIVITIES_LIST", label: "Activities list", required: true, derivationKey: "activities", sortOrder: 30 },
    { kind: "COMMON_APP_ESSAY", label: "Personal statement", required: true, derivationKey: "common_app_essay", sortOrder: 40 },
  ];

  for (let i = 0; i < recCount; i++) {
    base.push({
      kind: "RECOMMENDATION",
      label: `Letter of recommendation #${i + 1}`,
      required: true,
      derivationKey: `recommendation:${i + 1}`,
      sortOrder: 50 + i,
    });
  }

  if (opts.hasSupplement) {
    base.push({
      kind: "SUPPLEMENT_ESSAY",
      label: "School-specific supplement",
      required: true,
      derivationKey: "supplement",
      sortOrder: 80,
    });
  }

  return base;
}
