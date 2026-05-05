/**
 * Milestone status reconciliation.
 *
 * The milestone templates are scaffolding — every student gets the same set
 * with template-relative target dates. But once a student starts taking
 * actions (creating applications, finalizing essays, getting scores back),
 * the canonical milestones drift out of sync with reality.
 *
 * This module derives "what should this milestone's status be NOW given
 * everything we know about the student" and reconciles the stored status
 * accordingly. Same auto-resolution pattern as the application readiness
 * engine.
 *
 * Rules:
 *   - We ONLY escalate (NOT_STARTED → IN_PROGRESS → COMPLETED).
 *     Counselor's manual BLOCKED / SKIPPED is preserved.
 *   - We ONLY change milestones that have a templateKey we recognize.
 *     Custom counselor-added milestones are untouched.
 *   - We ONLY apply derived status when the signal is strong; weak signals
 *     leave the milestone alone (no false positives).
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// ----- Inputs the derivation needs -----

export type StudentSnapshot = {
  id: string;
  phase: string;
  status: string;
  satScore: number | null;
  actScore: number | null;
  applications: { id: string; applicationType: string; status: string; submittedAt: Date | null }[];
  essays: { id: string; status: string; applicationId: string | null }[];
  recommenders: { id: string; requestStatus: string }[];
  documents: { documentType: string }[];
  activitiesCount: number;
};

type DerivedStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

const EARLY_TYPES = new Set([
  "EARLY_DECISION",
  "EARLY_DECISION_2",
  "EARLY_ACTION",
  "RESTRICTIVE_EARLY_ACTION",
]);

/**
 * Per-template derivation. Returns null when the signal is too weak to
 * say anything; the existing stored status wins in that case.
 */
function deriveForTemplate(key: string, s: StudentSnapshot): DerivedStatus | null {
  switch (key) {
    case "initial_college_research": {
      if (s.applications.length >= 5) return "COMPLETED";
      if (s.applications.length >= 1) return "IN_PROGRESS";
      return null;
    }

    case "finalize_test_plan": {
      if (s.satScore != null || s.actScore != null) return "COMPLETED";
      if (s.documents.some((d) => d.documentType === "TEST_SCORE")) return "COMPLETED";
      if (s.phase === "TESTING" || s.phase === "APPLICATIONS" || s.phase === "ESSAYS") {
        return "IN_PROGRESS";
      }
      return null;
    }

    case "narrow_college_list": {
      if (s.applications.length >= 8) return "COMPLETED";
      if (s.applications.length >= 4) return "IN_PROGRESS";
      return null;
    }

    case "request_recommendations": {
      const active = s.recommenders.filter((r) => r.requestStatus !== "NOT_REQUESTED");
      if (active.length === 0) return null;
      const submitted = s.recommenders.filter(
        (r) => r.requestStatus === "SUBMITTED" || r.requestStatus === "RECEIVED",
      );
      if (submitted.length >= 2 && submitted.length === s.recommenders.length) {
        return "COMPLETED";
      }
      return "IN_PROGRESS";
    }

    case "common_app_profile": {
      // Strong signal: a student with 8+ activities is clearly past basic profile.
      if (s.activitiesCount >= 8) return "COMPLETED";
      if (s.activitiesCount >= 3) return "IN_PROGRESS";
      return null;
    }

    case "personal_statement_draft": {
      // Personal statement is the EssayArtifact NOT tied to a specific application.
      // If the student doesn't have any unattached essay, we can also accept any
      // FINAL/SUBMITTED essay as evidence of a finished personal statement.
      const personal = s.essays.filter((e) => !e.applicationId);
      const candidate = personal.length > 0 ? personal : s.essays;

      if (candidate.some((e) => e.status === "FINAL" || e.status === "SUBMITTED")) {
        return "COMPLETED";
      }
      if (candidate.some((e) => e.status !== "BRAINSTORMING")) {
        return "IN_PROGRESS";
      }
      return null;
    }

    case "supplemental_essays": {
      const supps = s.essays.filter((e) => e.applicationId);
      if (supps.length === 0) return null;
      const allFinal = supps.every(
        (e) => e.status === "FINAL" || e.status === "SUBMITTED",
      );
      if (allFinal) return "COMPLETED";
      if (supps.some((e) => e.status !== "BRAINSTORMING")) return "IN_PROGRESS";
      return null;
    }

    case "early_submissions": {
      const earlies = s.applications.filter((a) => EARLY_TYPES.has(a.applicationType));
      if (earlies.length === 0) return null;
      const submittedEarlies = earlies.filter((a) => a.status === "SUBMITTED" || !!a.submittedAt);
      if (submittedEarlies.length === earlies.length) return "COMPLETED";
      if (submittedEarlies.length > 0) return "IN_PROGRESS";
      return null;
    }

    case "regular_submissions": {
      const rds = s.applications.filter((a) => a.applicationType === "REGULAR_DECISION");
      if (rds.length === 0) return null;
      const submittedRds = rds.filter((a) => a.status === "SUBMITTED" || !!a.submittedAt);
      if (submittedRds.length === rds.length) return "COMPLETED";
      if (submittedRds.length > 0) return "IN_PROGRESS";
      return null;
    }

    case "final_decision": {
      if (s.phase === "ENROLLMENT" || s.status === "GRADUATED") return "COMPLETED";
      return null;
    }

    // Templates we leave alone (no reliable signal):
    //   - summer_programs_or_activities
    //   - fafsa_css
    default:
      return null;
  }
}

const STATUS_RANK: Record<string, number> = {
  NOT_STARTED: 0,
  IN_PROGRESS: 1,
  COMPLETED: 2,
  // BLOCKED / SKIPPED never get reconciled — counselor decision.
  BLOCKED: 99,
  SKIPPED: 99,
};

function shouldEscalate(stored: string, derived: DerivedStatus): boolean {
  // Don't touch counselor-set BLOCKED or SKIPPED.
  if (STATUS_RANK[stored] === 99) return false;
  return STATUS_RANK[derived] > STATUS_RANK[stored];
}

// ----- The reconciler -----

export type ReconcileResult = {
  studentId: string;
  changes: { id: string; templateKey: string; from: string; to: DerivedStatus }[];
};

/**
 * Load all the student state we need, derive each milestone's target status,
 * and apply ONLY the upgrades. Never demotes; never touches custom milestones.
 *
 * Single-trip-friendly: one `findUniqueOrThrow` for the snapshot, one bulk
 * `findMany` for milestones, then per-changed-row updates inside a transaction.
 */
export async function reconcileMilestonesForStudent(
  studentId: string,
  tx?: Prisma.TransactionClient,
): Promise<ReconcileResult> {
  const db = tx ?? prisma;

  const [snapshot, activitiesCount, milestones] = await Promise.all([
    db.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        phase: true,
        status: true,
        satScore: true,
        actScore: true,
        applications: {
          select: { id: true, applicationType: true, status: true, submittedAt: true },
        },
        // Schema calls this `essayArtifacts`; we'll alias to `essays` below.
        essayArtifacts: { select: { id: true, status: true, applicationId: true } },
        recommenders: { select: { id: true, requestStatus: true } },
        documents: { select: { documentType: true } },
      },
    }),
    db.activity.count({ where: { studentId } }),
    db.milestone.findMany({
      where: { studentId, templateKey: { not: null } },
      select: { id: true, templateKey: true, status: true },
    }),
  ]);

  // Student may have been deleted concurrently — exit gracefully.
  // Also skip reconciliation for archived students (frozen state).
  if (!snapshot || snapshot.status === "ARCHIVED") {
    return { studentId, changes: [] };
  }

  const state: StudentSnapshot = {
    id: snapshot.id,
    phase: snapshot.phase,
    status: snapshot.status,
    satScore: snapshot.satScore,
    actScore: snapshot.actScore,
    applications: snapshot.applications,
    // The schema names this relation `essayArtifacts` on Student; expose it
    // under `essays` for consistency with the readiness engine.
    essays: snapshot.essayArtifacts,
    recommenders: snapshot.recommenders,
    documents: snapshot.documents,
    activitiesCount,
  };

  const changes: ReconcileResult["changes"] = [];

  for (const m of milestones) {
    if (!m.templateKey) continue;
    const derived = deriveForTemplate(m.templateKey, state);
    if (!derived) continue;
    if (!shouldEscalate(m.status, derived)) continue;

    changes.push({ id: m.id, templateKey: m.templateKey, from: m.status, to: derived });
  }

  if (changes.length === 0) {
    return { studentId, changes: [] };
  }

  // Apply updates. Cheap because changes is bounded by ~12 templates.
  await Promise.all(
    changes.map((c) =>
      db.milestone.update({
        where: { id: c.id },
        data: {
          status: c.to,
          ...(c.to === "COMPLETED" && { completedAt: new Date() }),
        },
      }),
    ),
  );

  return { studentId, changes };
}
