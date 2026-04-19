import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";

export const reviewRouter = router({
  /** Count of pending review items for the sidebar badge. */
  pendingCount: protectedProcedure.query(async ({ ctx }) => {
    return prisma.reviewQueueItem.count({
      where: { counselorId: ctx.counselorId, status: "PENDING" },
    });
  }),

  /**
   * List review items. For communication_draft entityTypes we hydrate the
   * Communication row so the UI can show subject + body + student.
   */
  list: protectedProcedure
    .input(
      z
        .object({
          status: z.enum(["PENDING", "APPROVED", "REJECTED", "REVISED"]).default("PENDING"),
          limit: z.number().min(1).max(100).default(50),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const status = input?.status ?? "PENDING";
      const items = await prisma.reviewQueueItem.findMany({
        where: { counselorId: ctx.counselorId, status },
        orderBy: { createdAt: "desc" },
        take: input?.limit ?? 50,
      });

      // Batch-load communications for the items that point at them
      const commIds = items
        .filter((i) => i.entityType === "communication_draft")
        .map((i) => i.entityId);
      const communications = commIds.length
        ? await prisma.communication.findMany({
            where: { id: { in: commIds } },
            include: {
              student: { select: { id: true, firstName: true, lastName: true } },
            },
          })
        : [];
      const commById = new Map(communications.map((c) => [c.id, c]));

      return items.map((item) => ({
        ...item,
        communication:
          item.entityType === "communication_draft"
            ? commById.get(item.entityId) ?? null
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
      await prisma.communication.update({
        where: { id: item.entityId },
        data: {
          subject: input.subject,
          body: input.body,
        },
      });
      return { ok: true };
    }),

  approve: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const item = await prisma.reviewQueueItem.findFirst({
        where: { id: input.id, counselorId: ctx.counselorId },
      });
      if (!item) throw new Error("Review item not found");

      const now = new Date();

      // Mark the underlying entity as approved/ready
      if (item.entityType === "communication_draft") {
        await prisma.communication.update({
          where: { id: item.entityId },
          data: {
            isDraft: false,
            approvedAt: now,
            // MVP: we don't actually send the email, just mark it ready.
            // Counselor can copy/paste the body into their client.
          },
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

      // For communication drafts, delete the draft Communication row so it
      // doesn't accumulate abandoned content. Keep the ReviewQueueItem for audit.
      if (item.entityType === "communication_draft") {
        await prisma.communication.deleteMany({
          where: { id: item.entityId, isDraft: true },
        });
      }

      await prisma.reviewQueueItem.update({
        where: { id: input.id },
        data: { status: "REJECTED", reviewedAt: new Date() },
      });

      return { ok: true };
    }),
});
