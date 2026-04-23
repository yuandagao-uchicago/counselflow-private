import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { router, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";

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

      // Batch-load linked Communications
      const commIds = items
        .filter((i) => i.entityType === "communication_draft")
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
        communication:
          item.entityType === "communication_draft"
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
      if (!item) throw new Error("Review item not found");
      if (item.entityType !== "communication_draft") {
        throw new Error("This review item is not a communication draft");
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
      if (!item) throw new Error("Review item not found");
      if (item.entityType !== "profile_extraction") {
        throw new Error("This review item is not a profile extraction");
      }

      const doc = await prisma.document.findFirst({
        where: {
          id: item.entityId,
          student: { counselorId: ctx.counselorId },
        },
      });
      if (!doc) throw new Error("Linked document not found");

      const now = new Date();

      // Strip out undefined values (zod's .optional() lets them through)
      const cleaned = Object.fromEntries(
        Object.entries(input.acceptedFields).filter(([, v]) => v !== undefined)
      );

      // One transaction for all three writes — if any step fails, nothing
      // persists. Previously the student.update ran outside the transaction,
      // which could leave the profile updated but the review item still
      // PENDING if the transaction crashed on the second statement.
      const writes: Prisma.PrismaPromise<unknown>[] = [];
      if (Object.keys(cleaned).length > 0) {
        writes.push(
          // updateMany with counselorId on the relation is a defense-in-depth
          // guard: if doc.studentId ever referenced another counselor's student
          // (shouldn't be possible since doc was fetched with counselorId),
          // this is a no-op rather than a cross-tenant write.
          prisma.student.updateMany({
            where: { id: doc.studentId, counselorId: ctx.counselorId },
            data: cleaned,
          })
        );
      }
      writes.push(
        prisma.reviewQueueItem.update({
          where: { id: item.id },
          data: { status: "APPROVED", reviewedAt: now },
        }),
        prisma.document.update({
          where: { id: doc.id },
          data: { extractionStatus: "APPLIED" },
        })
      );
      await prisma.$transaction(writes);

      return { ok: true, appliedFields: Object.keys(cleaned).length };
    }),

  approve: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const item = await prisma.reviewQueueItem.findFirst({
        where: { id: input.id, counselorId: ctx.counselorId },
      });
      if (!item) throw new Error("Review item not found");

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
      if (!item) throw new Error("Review item not found");

      // For communication drafts, delete the draft Communication so abandoned
      // drafts don't pile up. Keep the ReviewQueueItem for audit.
      if (item.entityType === "communication_draft") {
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
