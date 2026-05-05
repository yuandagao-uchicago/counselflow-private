import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import { TRPCError } from "@trpc/server";
import { verifyStudentOwnership } from "../lib/tenant";
import {
  computeReadiness,
  defaultChecklist,
  type ReadinessApplication,
  type ReadinessStudent,
} from "@/lib/readiness";

const APPLICATION_TYPES = [
  "EARLY_DECISION",
  "EARLY_DECISION_2",
  "EARLY_ACTION",
  "RESTRICTIVE_EARLY_ACTION",
  "REGULAR_DECISION",
  "ROLLING",
] as const;

const APPLICATION_PLATFORMS = [
  "COMMON_APP",
  "COALITION",
  "UC_APPLICATION",
  "APPLY_TEXAS",
  "SCHOOL_DIRECT",
  "OTHER",
] as const;

const APPLICATION_STATUSES = [
  "PLANNING",
  "IN_PROGRESS",
  "READY_FOR_REVIEW",
  "SUBMITTED",
  "WITHDRAWN",
] as const;

const ITEM_KINDS = [
  "TRANSCRIPT",
  "TEST_SCORES",
  "ACTIVITIES_LIST",
  "COMMON_APP_ESSAY",
  "SUPPLEMENT_ESSAY",
  "RECOMMENDATION",
  "COUNSELOR_LETTER",
  "PORTFOLIO",
  "INTERVIEW",
  "FINANCIAL_AID",
  "APPLICATION_FORM",
  "CUSTOM",
] as const;

const ITEM_STATUSES = [
  "PENDING",
  "IN_PROGRESS",
  "WAITING_ON_EXTERNAL",
  "DONE",
  "NOT_APPLICABLE",
] as const;

/**
 * Verify that this counselor owns the application (via student relation).
 * Returns the student id for downstream operations.
 */
async function verifyApplicationOwnership(counselorId: string, applicationId: string) {
  const app = await prisma.application.findFirst({
    where: { id: applicationId, student: { counselorId } },
    select: { id: true, studentId: true },
  });
  if (!app) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
  }
  return app;
}

// Shape we load for readiness computation. Kept in one place to keep
// the router and the engine in sync.
const READINESS_INCLUDE = {
  requirementItems: { orderBy: { sortOrder: "asc" as const } },
  essays: { select: { id: true, status: true } },
  recommenders: { select: { id: true, requestStatus: true } },
};

async function loadStudentForReadiness(studentId: string): Promise<ReadinessStudent> {
  const [student, activitiesCount] = await Promise.all([
    prisma.student.findUniqueOrThrow({
      where: { id: studentId },
      select: {
        satScore: true,
        actScore: true,
        documents: { select: { documentType: true } },
      },
    }),
    prisma.activity.count({ where: { studentId } }),
  ]);
  return {
    satScore: student.satScore,
    actScore: student.actScore,
    documents: student.documents,
    activitiesCount,
  };
}

export const applicationRouter = router({
  list: protectedProcedure
    .input(z.object({ studentId: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyStudentOwnership(ctx.counselorId, input.studentId);

      const apps = await prisma.application.findMany({
        where: { studentId: input.studentId },
        orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
        include: {
          school: { select: { id: true, name: true, commonName: true, city: true, state: true } },
          ...READINESS_INCLUDE,
        },
      });

      const student = await loadStudentForReadiness(input.studentId);

      return apps.map((app) => ({
        ...app,
        readiness: computeReadiness(app as unknown as ReadinessApplication, student),
      }));
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const app = await prisma.application.findFirst({
        where: { id: input.id, student: { counselorId: ctx.counselorId } },
        include: {
          school: true,
          requirement: true,
          ...READINESS_INCLUDE,
          submissionEvents: { orderBy: { submittedAt: "desc" } },
        },
      });
      if (!app) throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });

      const student = await loadStudentForReadiness(app.studentId);
      return {
        ...app,
        readiness: computeReadiness(app as unknown as ReadinessApplication, student),
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        studentId: z.string(),
        schoolId: z.string(),
        applicationType: z.enum(APPLICATION_TYPES),
        platform: z.enum(APPLICATION_PLATFORMS),
        deadline: z.date().optional().nullable(),
        recommendationCount: z.number().min(0).max(6).default(2),
        hasSupplement: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await verifyStudentOwnership(ctx.counselorId, input.studentId);

      // Atomic create: one application + its default checklist together,
      // so we never end up with an application that has zero requirement
      // items if the second insert fails.
      const items = defaultChecklist({
        recommendationCount: input.recommendationCount,
        hasSupplement: input.hasSupplement,
      });

      return prisma.$transaction(async (tx) => {
        const app = await tx.application.create({
          data: {
            studentId: input.studentId,
            schoolId: input.schoolId,
            applicationType: input.applicationType,
            platform: input.platform,
            deadline: input.deadline ?? undefined,
            status: "PLANNING",
          },
        });

        await tx.applicationRequirementItem.createMany({
          data: items.map((it) => ({
            applicationId: app.id,
            kind: it.kind,
            label: it.label,
            required: it.required,
            derivationKey: it.derivationKey,
            sortOrder: it.sortOrder,
          })),
        });

        return app;
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        applicationType: z.enum(APPLICATION_TYPES).optional(),
        platform: z.enum(APPLICATION_PLATFORMS).optional(),
        status: z.enum(APPLICATION_STATUSES).optional(),
        deadline: z.date().optional().nullable(),
        decision: z.string().optional().nullable(),
        decisionDate: z.date().optional().nullable(),
        notes: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await verifyApplicationOwnership(ctx.counselorId, input.id);
      const { id, ...data } = input;

      // When status flips to SUBMITTED, stamp submittedAt. Counselor can
      // unflip; we don't auto-clear submittedAt on undo to keep the audit trail.
      const submittedAt =
        input.status === "SUBMITTED" ? new Date() : undefined;

      return prisma.application.update({
        where: { id },
        data: { ...data, ...(submittedAt && { submittedAt }) },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await verifyApplicationOwnership(ctx.counselorId, input.id);
      await prisma.application.delete({ where: { id: input.id } });
      return { ok: true };
    }),

  // ---------- Requirement item operations ----------

  addItem: protectedProcedure
    .input(
      z.object({
        applicationId: z.string(),
        kind: z.enum(ITEM_KINDS).default("CUSTOM"),
        label: z.string().min(1),
        required: z.boolean().default(true),
        dueDate: z.date().optional().nullable(),
        notes: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await verifyApplicationOwnership(ctx.counselorId, input.applicationId);

      // Append to the bottom of the checklist.
      const last = await prisma.applicationRequirementItem.findFirst({
        where: { applicationId: input.applicationId },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });
      const sortOrder = (last?.sortOrder ?? -1) + 1;

      return prisma.applicationRequirementItem.create({
        data: {
          applicationId: input.applicationId,
          kind: input.kind,
          label: input.label,
          required: input.required,
          dueDate: input.dueDate ?? undefined,
          notes: input.notes ?? undefined,
          sortOrder,
        },
      });
    }),

  updateItem: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(ITEM_STATUSES).optional(),
        label: z.string().min(1).optional(),
        required: z.boolean().optional(),
        dueDate: z.date().optional().nullable(),
        notes: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify via the application → student → counselor chain.
      const item = await prisma.applicationRequirementItem.findFirst({
        where: {
          id: input.id,
          application: { student: { counselorId: ctx.counselorId } },
        },
        select: { id: true, status: true },
      });
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });

      const { id, ...data } = input;
      // Stamp resolvedAt only on transitions where status is provided.
      // DONE → now; any other explicit status → null; status omitted → leave alone.
      const resolvedAt: Date | null | undefined =
        input.status === undefined
          ? undefined
          : input.status === "DONE"
            ? new Date()
            : null;

      return prisma.applicationRequirementItem.update({
        where: { id },
        data: { ...data, ...(resolvedAt !== undefined && { resolvedAt }) },
      });
    }),

  removeItem: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const item = await prisma.applicationRequirementItem.findFirst({
        where: {
          id: input.id,
          application: { student: { counselorId: ctx.counselorId } },
        },
        select: { id: true },
      });
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });

      await prisma.applicationRequirementItem.delete({ where: { id: input.id } });
      return { ok: true };
    }),
});
