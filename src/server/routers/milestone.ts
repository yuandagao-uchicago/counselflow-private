import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import { verifyStudentOwnership } from "../lib/tenant";
import { computeMilestoneDates } from "@/lib/milestone-templates";

const STATUSES = ["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "COMPLETED", "SKIPPED"] as const;

export const milestoneRouter = router({
  list: protectedProcedure
    .input(z.object({ studentId: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyStudentOwnership(ctx.counselorId, input.studentId);
      return prisma.milestone.findMany({
        where: { studentId: input.studentId },
        orderBy: { sortOrder: "asc" },
      });
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(STATUSES),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify the milestone belongs to one of this counselor's students
      const milestone = await prisma.milestone.findFirst({
        where: { id: input.id, student: { counselorId: ctx.counselorId } },
        select: { id: true, status: true },
      });
      if (!milestone) throw new Error("Milestone not found");

      return prisma.milestone.update({
        where: { id: input.id },
        data: {
          status: input.status,
          completedAt: input.status === "COMPLETED" ? new Date() : null,
        },
      });
    }),

  // Regenerate milestones for a student who was created before auto-seeding existed,
  // or whose graduation year changed. Skips keys that already exist.
  seedForStudent: protectedProcedure
    .input(z.object({ studentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const student = await verifyStudentOwnership(ctx.counselorId, input.studentId);

      const existing = await prisma.milestone.findMany({
        where: { studentId: student.id, templateKey: { not: null } },
        select: { templateKey: true },
      });
      const existingKeys = new Set(existing.map((m) => m.templateKey));

      const toCreate = computeMilestoneDates(student.graduationYear).filter(
        ({ template }) => !existingKeys.has(template.key)
      );

      if (toCreate.length === 0) return { created: 0 };

      await prisma.milestone.createMany({
        data: toCreate.map(({ template, targetDate }) => ({
          studentId: student.id,
          title: template.title,
          description: template.description,
          category: template.category,
          targetDate,
          templateKey: template.key,
          sortOrder: template.sortOrder,
        })),
      });

      return { created: toCreate.length };
    }),
});
