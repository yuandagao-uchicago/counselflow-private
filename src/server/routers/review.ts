import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import {
  sendEmail,
  buildRecommenderRequestEmail,
  buildRecommenderReminderEmail,
} from "@/lib/email";

/** Fields the counselor is allowed to approve individually from an extraction. */
const ApplicableExtractionFieldsSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  preferredName: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  highSchool: z.string().optional().nullable(),
  graduationYear: z.number().optional(),
  gpaUnweighted: z.number().optional().nullable(),
  gpaWeighted: z.number().optional().nullable(),
  satScore: z.number().optional().nullable(),
  actScore: z.number().optional().nullable(),
  classRank: z.string().optional().nullable(),
  courseRigor: z.string().optional().nullable(),
  intendedMajors: z.array(z.string()).optional(),
  interests: z.array(z.string()).optional(),
  personalNotes: z.string().optional().nullable(),
});

export const reviewRouter = router({
  /** Count of pending review items for the sidebar badge. */
  pendingCount: protectedProcedure.query(async ({ ctx }) => {
    return prisma.reviewQueueItem.count({
      where: { counselorId: ctx.counselorId, status: "PENDING" },
    });
  }),

  /**
   * List review items. For communication_draft we hydrate the Communication
   * row. For profile_extraction we hydrate the Document + Student so the UI
   * can render a side-by-side diff.
   *
   * Accepts an optional studentId filter so the same query powers both the
   * global /approvals page and the per-student panel.
   */
  list: protectedProcedure
    .input(
      z
        .object({
          status: z
            .enum(["PENDING", "APPROVED", "REJECTED", "REVISED"])
            .default("PENDING"),
          limit: z.number().min(1).max(100).default(50),
          studentId: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const status = input?.status ?? "PENDING";
      const limit = input?.limit ?? 50;
      const studentFilter = input?.studentId;

      // When filtering by studentId, we need the per-student matches to
      // survive pagination. Pre-filter the ReviewQueueItem query so the LIMIT
      // applies to MATCHING rows, not "any rows then filter." We pre-resolve
      // the matching entity IDs (communications + documents for this student)
      // and scope ReviewQueueItem to those.
      let entityIdFilter: string[] | undefined;
      if (studentFilter) {
        const [comms, docs] = await Promise.all([
          prisma.communication.findMany({
            where: {
              studentId: studentFilter,
              counselorId: ctx.counselorId,
            },
            select: { id: true },
          }),
          prisma.document.findMany({
            where: {
              studentId: studentFilter,
              student: { counselorId: ctx.counselorId },
            },
            select: { id: true },
          }),
        ]);
        entityIdFilter = [...comms.map((c) => c.id), ...docs.map((d) => d.id)];
        // No entities for this student → short-circuit with empty array so we
        // don't issue a WHERE IN () against an empty set (Prisma treats as
        // "match everything" on some versions).
        if (entityIdFilter.length === 0) return [];
      }

      const items = await prisma.reviewQueueItem.findMany({
        where: {
          counselorId: ctx.counselorId,
          status,
          ...(entityIdFilter && { entityId: { in: entityIdFilter } }),
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      });

      // Batch-load linked Communications. Recommender request/reminder items
      // also point to a Communication via entityId.
      const commTypes = ["communication_draft", "recommender_request", "recommender_reminder"];
      const commIds = items
        .filter((i) => commTypes.includes(i.entityType))
        .map((i) => i.entityId);
      const communications = commIds.length
        ? await prisma.communication.findMany({
            where: { id: { in: commIds }, counselorId: ctx.counselorId },
            include: {
              student: { select: { id: true, firstName: true, lastName: true } },
            },
          })
        : [];
      const commById = new Map(communications.map((c) => [c.id, c]));

      // Batch-load linked Documents (for profile_extraction items) +
      // their owning Student so the review card shows current-vs-suggested.
      const docIds = items
        .filter((i) => i.entityType === "profile_extraction")
        .map((i) => i.entityId);
      const documents = docIds.length
        ? await prisma.document.findMany({
            where: {
              id: { in: docIds },
              student: { counselorId: ctx.counselorId },
            },
            include: {
              student: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  preferredName: true,
                  email: true,
                  phone: true,
                  highSchool: true,
                  graduationYear: true,
                  gpaUnweighted: true,
                  gpaWeighted: true,
                  satScore: true,
                  actScore: true,
                  classRank: true,
                  courseRigor: true,
                  intendedMajors: true,
                  interests: true,
                  personalNotes: true,
                },
              },
            },
          })
        : [];
      const docById = new Map(documents.map((d) => [d.id, d]));

      return items.map((item) => ({
        ...item,
        communication: commTypes.includes(item.entityType)
          ? commById.get(item.entityId) ?? null
          : null,
        document:
          item.entityType === "profile_extraction"
            ? docById.get(item.entityId) ?? null
            : null,
      }));
    }),

  /** Edit the draft content before approval. */
  updateCommunicationDraft: protectedProcedure
    .input(
      z.object({
        reviewQueueItemId: z.string(),
        subject: z.string().optional(),
        body: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const item = await prisma.reviewQueueItem.findFirst({
        where: { id: input.reviewQueueItemId, counselorId: ctx.counselorId },
      });
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Review item not found" });
      if (item.status !== "PENDING") {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Item is already ${item.status.toLowerCase()}` });
      }
      if (item.entityType !== "communication_draft") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This review item is not a communication draft" });
      }
      // Defense-in-depth: scope the update by counselorId on the Communication
      // itself. item was already verified counselor-owned, so this is a no-op
      // guard against data drift between ReviewQueueItem and Communication.
      await prisma.communication.updateMany({
        where: { id: item.entityId, counselorId: ctx.counselorId },
        data: {
          subject: input.subject,
          body: input.body,
        },
      });
      return { ok: true };
    }),

  /**
   * Apply a selected subset of the extracted fields to the student.
   * `acceptedFields` is whatever the counselor chose to keep after reviewing;
   * anything not in that object is silently dropped (rejected per-field).
   */
  applyProfileExtraction: protectedProcedure
    .input(
      z.object({
        reviewQueueItemId: z.string(),
        acceptedFields: ApplicableExtractionFieldsSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const item = await prisma.reviewQueueItem.findFirst({
        where: { id: input.reviewQueueItemId, counselorId: ctx.counselorId },
      });
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Review item not found" });
      if (item.status !== "PENDING") {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Item is already ${item.status.toLowerCase()}` });
      }
      if (item.entityType !== "profile_extraction") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This review item is not a profile extraction" });
      }

      const doc = await prisma.document.findFirst({
        where: {
          id: item.entityId,
          student: { counselorId: ctx.counselorId },
        },
      });
      if (!doc) throw new TRPCError({ code: "NOT_FOUND", message: "Linked document not found" });

      const now = new Date();

      // Strip out undefined values (zod's .optional() lets them through)
      const cleaned = Object.fromEntries(
        Object.entries(input.acceptedFields).filter(([, v]) => v !== undefined)
      );

      // One transaction: apply fields + mark approved + update extraction status.
      // Verify the student still exists before writing.
      const result = await prisma.$transaction(async (tx) => {
        let appliedFields = 0;

        if (Object.keys(cleaned).length > 0) {
          const updated = await tx.student.updateMany({
            where: { id: doc.studentId, counselorId: ctx.counselorId },
            data: cleaned,
          });
          if (updated.count === 0) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Student no longer exists — cannot apply extraction",
            });
          }
          appliedFields = Object.keys(cleaned).length;
        }

        await tx.reviewQueueItem.update({
          where: { id: item.id },
          data: { status: "APPROVED", reviewedAt: now },
        });
        await tx.document.update({
          where: { id: doc.id },
          data: { extractionStatus: "APPLIED" },
        });

        return { appliedFields };
      });

      return { ok: true, appliedFields: result.appliedFields };
    }),

  approve: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const item = await prisma.reviewQueueItem.findFirst({
        where: { id: input.id, counselorId: ctx.counselorId },
      });
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Review item not found" });
      if (item.status !== "PENDING") {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Item is already ${item.status.toLowerCase()}` });
      }

      const now = new Date();

      if (item.entityType === "communication_draft") {
        await prisma.communication.updateMany({
          where: { id: item.entityId, counselorId: ctx.counselorId },
          data: { isDraft: false, approvedAt: now },
        });
      }
      // For profile_extraction, callers should use applyProfileExtraction
      // to specify which fields to apply. Plain approve() just closes the
      // review item without copying fields.
      if (item.entityType === "profile_extraction") {
        await prisma.document.updateMany({
          where: {
            id: item.entityId,
            student: { counselorId: ctx.counselorId },
          },
          data: { extractionStatus: "APPLIED" },
        });
      }

      // Recommender request/reminder: approve the communication and send the email.
      // item.aiOutputId stores the recommenderId (set by sendForReview).
      if (
        item.entityType === "recommender_request" ||
        item.entityType === "recommender_reminder"
      ) {
        const comm = await prisma.communication.findFirst({
          where: { id: item.entityId, counselorId: ctx.counselorId },
          include: {
            student: { select: { firstName: true, lastName: true } },
          },
        });
        // Look up the recommender directly by the stored ID
        const recommender = item.aiOutputId
          ? await prisma.studentRecommender.findFirst({
              where: { id: item.aiOutputId, student: { counselorId: ctx.counselorId } },
            })
          : null;

        if (comm) {
          await prisma.communication.update({
            where: { id: comm.id },
            data: { isDraft: false, approvedAt: now },
          });

          if (recommender?.email) {
            const counselor = await prisma.user.findUnique({
              where: { id: ctx.counselorId },
              select: { name: true, email: true, timezone: true },
            });

            const isReminder = item.entityType === "recommender_reminder";
            const buildEmail = isReminder
              ? buildRecommenderReminderEmail
              : buildRecommenderRequestEmail;

            const emailContent = buildEmail({
              recommenderName: recommender.name,
              studentFirstName: comm.student.firstName,
              studentLastName: comm.student.lastName,
              counselorName: counselor?.name ?? "Your Counselor",
              customBody: comm.body,
              timezone: counselor?.timezone ?? undefined,
            });

            await sendEmail({
              to: recommender.email,
              replyTo: counselor?.email ?? undefined,
              ...emailContent,
            });

            // Update recommender status
            const statusUpdate = isReminder
              ? { requestStatus: "REMINDED" as const, reminderSentAt: now }
              : { requestStatus: "REQUESTED" as const, requestedAt: now };

            await prisma.studentRecommender.update({
              where: { id: recommender.id },
              data: statusUpdate,
            });
          }
        }
      }

      await prisma.reviewQueueItem.update({
        where: { id: input.id },
        data: { status: "APPROVED", reviewedAt: now },
      });

      return { ok: true };
    }),

  reject: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const item = await prisma.reviewQueueItem.findFirst({
        where: { id: input.id, counselorId: ctx.counselorId },
      });
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Review item not found" });
      if (item.status !== "PENDING") {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Item is already ${item.status.toLowerCase()}` });
      }

      // For communication drafts and recommender request/reminder emails,
      // delete the draft Communication so abandoned drafts don't pile up.
      // Keep the ReviewQueueItem for audit.
      const draftEntityTypes = [
        "communication_draft",
        "recommender_request",
        "recommender_reminder",
      ];
      if (draftEntityTypes.includes(item.entityType)) {
        await prisma.communication.deleteMany({
          where: {
            id: item.entityId,
            isDraft: true,
            counselorId: ctx.counselorId,
          },
        });
      }
      // For profile_extraction, mark the Document as rejected but keep the
      // file blob (counselor may want to re-upload or inspect it manually).
      if (item.entityType === "profile_extraction") {
        await prisma.document.updateMany({
          where: {
            id: item.entityId,
            student: { counselorId: ctx.counselorId },
          },
          data: { extractionStatus: "REJECTED" },
        });
      }

      await prisma.reviewQueueItem.update({
        where: { id: input.id },
        data: { status: "REJECTED", reviewedAt: new Date() },
      });

      return { ok: true };
    }),
});

// Expose the schema type so the client can keep in sync.
export type ProfileExtractionFieldsInput = z.infer<
  typeof ApplicableExtractionFieldsSchema
>;
