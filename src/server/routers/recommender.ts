import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, aiProtectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import { verifyStudentOwnership } from "../lib/tenant";
import { generateBragSheet, generateRequestEmailDraft } from "@/ai/prompts/bragSheet";
import { createAIOutput } from "@/ai/provenance";
import { MODEL } from "@/ai/client";
import type { BragSheetContext } from "@/ai/prompts/bragSheet";

const RECOMMENDER_TYPES = [
  "TEACHER",
  "COUNSELOR",
  "EMPLOYER",
  "MENTOR",
  "PEER",
  "OTHER",
] as const;

const REQUEST_STATUSES = [
  "NOT_REQUESTED",
  "REQUESTED",
  "REMINDED",
  "RECEIVED",
  "SUBMITTED",
] as const;

const STATUS_ORDER: Record<string, number> = {
  NOT_REQUESTED: 0,
  REQUESTED: 1,
  REMINDED: 2,
  RECEIVED: 3,
  SUBMITTED: 4,
};

/** Verify recommender ownership through the student → counselor chain. */
async function verifyRecommenderOwnership(counselorId: string, recommenderId: string) {
  const rec = await prisma.studentRecommender.findFirst({
    where: { id: recommenderId, student: { counselorId } },
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          gradeLevel: true,
          phase: true,
          gpaUnweighted: true,
          gpaWeighted: true,
          satScore: true,
          actScore: true,
          intendedMajors: true,
          interests: true,
          personalNotes: true,
        },
      },
      application: {
        select: { id: true, school: { select: { name: true } }, applicationType: true, deadline: true },
      },
    },
  });
  if (!rec) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Recommender not found" });
  }
  return rec;
}

/** Build the context object used by both AI functions. */
async function buildAIContext(
  rec: Awaited<ReturnType<typeof verifyRecommenderOwnership>>
): Promise<BragSheetContext> {
  const activities = await prisma.activity.findMany({
    where: { studentId: rec.student.id },
    select: {
      name: true,
      category: true,
      role: true,
      description: true,
      significance: true,
    },
    orderBy: { sortOrder: "asc" },
  });

  return {
    student: rec.student,
    activities,
    recommender: {
      name: rec.name,
      type: rec.type,
      relationship: rec.relationship,
      organization: rec.organization,
    },
    applicationContext: rec.application
      ? `${rec.application.school?.name ?? "Unknown school"} (${rec.application.applicationType})${rec.application.deadline ? ` — deadline ${rec.application.deadline.toLocaleDateString()}` : ""}`
      : null,
  };
}

export const recommenderRouter = router({
  list: protectedProcedure
    .input(z.object({ studentId: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyStudentOwnership(ctx.counselorId, input.studentId);
      return prisma.studentRecommender.findMany({
        where: { studentId: input.studentId },
        orderBy: { createdAt: "desc" },
        include: {
          application: {
            select: {
              id: true,
              applicationType: true,
              deadline: true,
              school: { select: { id: true, name: true } },
            },
          },
        },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        studentId: z.string(),
        name: z.string().min(1).max(200),
        email: z.string().email().optional(),
        type: z.enum(RECOMMENDER_TYPES),
        relationship: z.string().max(500).optional(),
        organization: z.string().max(200).optional(),
        applicationId: z.string().optional(),
        notes: z.string().max(2000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await verifyStudentOwnership(ctx.counselorId, input.studentId);

      // If linking to an application, verify it belongs to the same student
      if (input.applicationId) {
        const app = await prisma.application.findFirst({
          where: { id: input.applicationId, studentId: input.studentId },
          select: { id: true },
        });
        if (!app) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Application does not belong to this student",
          });
        }
      }

      return prisma.studentRecommender.create({
        data: {
          studentId: input.studentId,
          name: input.name,
          email: input.email,
          type: input.type,
          relationship: input.relationship,
          organization: input.organization,
          applicationId: input.applicationId,
          notes: input.notes,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(200).optional(),
        email: z.string().email().optional().nullable(),
        type: z.enum(RECOMMENDER_TYPES).optional(),
        relationship: z.string().max(500).optional().nullable(),
        organization: z.string().max(200).optional().nullable(),
        applicationId: z.string().optional().nullable(),
        notes: z.string().max(2000).optional().nullable(),
        bragSheetFinal: z.string().optional().nullable(),
        requestEmailDraft: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const rec = await verifyRecommenderOwnership(ctx.counselorId, input.id);
      const { id, ...data } = input;

      // If changing applicationId, verify ownership
      if (data.applicationId) {
        const app = await prisma.application.findFirst({
          where: { id: data.applicationId, studentId: rec.studentId },
          select: { id: true },
        });
        if (!app) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Application does not belong to this student",
          });
        }
      }

      return prisma.studentRecommender.update({
        where: { id },
        data,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await verifyRecommenderOwnership(ctx.counselorId, input.id);
      await prisma.studentRecommender.delete({ where: { id: input.id } });
      return { ok: true };
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(REQUEST_STATUSES),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const rec = await verifyRecommenderOwnership(ctx.counselorId, input.id);

      // Enforce forward-only transitions
      const currentRank = STATUS_ORDER[rec.requestStatus] ?? 0;
      const targetRank = STATUS_ORDER[input.status] ?? 0;
      if (targetRank < currentRank) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot move status backward from ${rec.requestStatus} to ${input.status}`,
        });
      }

      // Stamp the appropriate timestamp
      const timestamps: Record<string, Date> = {};
      if (input.status === "REQUESTED") timestamps.requestedAt = new Date();
      if (input.status === "REMINDED") timestamps.reminderSentAt = new Date();
      if (input.status === "RECEIVED") timestamps.receivedAt = new Date();
      if (input.status === "SUBMITTED") timestamps.submittedAt = new Date();

      return prisma.studentRecommender.update({
        where: { id: input.id },
        data: { requestStatus: input.status, ...timestamps },
      });
    }),

  generateBragSheet: aiProtectedProcedure
    .input(z.object({ recommenderId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const rec = await verifyRecommenderOwnership(ctx.counselorId, input.recommenderId);
      const context = await buildAIContext(rec);

      const { bragSheet, usage } = await generateBragSheet(context);

      const aiOutput = await createAIOutput({
        counselorId: ctx.counselorId,
        studentId: rec.studentId,
        feature: "brag_sheet",
        sourceBasis: [
          {
            type: "profile",
            id: rec.studentId,
            label: `${rec.student.firstName} ${rec.student.lastName}`,
          },
          {
            type: "recommender",
            id: rec.id,
            label: `Recommender: ${rec.name} (${rec.type})`,
          },
        ],
        confidence: "MEDIUM",
        output: bragSheet,
        modelId: MODEL,
        tokenUsage: usage,
      });

      // Store the draft as JSON
      await prisma.studentRecommender.update({
        where: { id: input.recommenderId },
        data: { bragSheetDraft: JSON.stringify(bragSheet) },
      });

      return { bragSheet, aiOutputId: aiOutput.id };
    }),

  generateRequestEmail: aiProtectedProcedure
    .input(z.object({ recommenderId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const rec = await verifyRecommenderOwnership(ctx.counselorId, input.recommenderId);
      const context = await buildAIContext(rec);

      const counselor = await prisma.user.findUniqueOrThrow({
        where: { id: ctx.counselorId },
        select: { name: true },
      });

      const { draft, usage } = await generateRequestEmailDraft({
        ...context,
        counselorName: counselor.name,
        deadline: rec.application?.deadline
          ? rec.application.deadline.toLocaleDateString()
          : null,
      });

      await createAIOutput({
        counselorId: ctx.counselorId,
        studentId: rec.studentId,
        feature: "recommender_email",
        sourceBasis: [
          {
            type: "profile",
            id: rec.studentId,
            label: `${rec.student.firstName} ${rec.student.lastName}`,
          },
          {
            type: "recommender",
            id: rec.id,
            label: `Recommender: ${rec.name}`,
          },
        ],
        confidence: "MEDIUM",
        output: draft,
        modelId: MODEL,
        tokenUsage: usage,
      });

      // Store draft on the recommender
      await prisma.studentRecommender.update({
        where: { id: input.recommenderId },
        data: { requestEmailDraft: draft.body },
      });

      return { subject: draft.subject, body: draft.body };
    }),

  sendForReview: protectedProcedure
    .input(
      z.object({
        recommenderId: z.string(),
        type: z.enum(["request", "reminder"]).default("request"),
        // Optional: pass the edited email body from the UI. If provided,
        // this overrides the stored draft so user edits aren't lost.
        body: z.string().min(1).max(10000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const rec = await verifyRecommenderOwnership(ctx.counselorId, input.recommenderId);

      if (!rec.email) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Recommender email is required before sending a request",
        });
      }

      const isReminder = input.type === "reminder";
      // Use the user-edited body if provided, otherwise fall back to stored draft
      const body = input.body ?? rec.requestEmailDraft;
      if (!body) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Generate a request email draft first",
        });
      }

      // Persist the (potentially edited) body back to the recommender
      if (input.body && input.body !== rec.requestEmailDraft) {
        await prisma.studentRecommender.update({
          where: { id: input.recommenderId },
          data: { requestEmailDraft: input.body },
        });
      }

      // Prevent duplicate pending review items for the same recommender
      const existingPending = await prisma.reviewQueueItem.findFirst({
        where: {
          counselorId: ctx.counselorId,
          entityType: isReminder ? "recommender_reminder" : "recommender_request",
          aiOutputId: input.recommenderId,
          status: "PENDING",
        },
      });
      if (existingPending) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A review item for this recommender is already pending approval",
        });
      }

      const subject = isReminder
        ? `Friendly reminder: recommendation for ${rec.student.firstName} ${rec.student.lastName}`
        : `Recommendation request for ${rec.student.firstName} ${rec.student.lastName}`;

      // Create a Communication draft for the review queue
      const comm = await prisma.communication.create({
        data: {
          counselorId: ctx.counselorId,
          studentId: rec.studentId,
          type: "EMAIL",
          direction: "OUTBOUND",
          subject,
          body,
          isDraft: true,
        },
      });

      // Store recommenderId in aiOutputId so the approve handler can look it up
      // directly instead of guessing which recommender this email was for.
      const queueItem = await prisma.reviewQueueItem.create({
        data: {
          counselorId: ctx.counselorId,
          entityType: isReminder
            ? "recommender_reminder"
            : "recommender_request",
          entityId: comm.id,
          aiOutputId: input.recommenderId,
          title: `${isReminder ? "Reminder" : "Request"} email to ${rec.name}`,
          summary: `For ${rec.student.firstName} ${rec.student.lastName} — ${rec.type.toLowerCase()}`,
        },
      });

      return { reviewQueueItemId: queueItem.id, communicationId: comm.id };
    }),
});
