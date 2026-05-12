import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import { verifyStudentOwnership } from "../lib/tenant";

async function verifyGuardianOwnership(counselorId: string, guardianId: string) {
  const g = await prisma.guardian.findFirst({
    where: { id: guardianId, student: { counselorId } },
  });
  if (!g) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Guardian not found" });
  }
  return g;
}

const emailField = z
  .string()
  .trim()
  .email()
  .optional()
  .or(z.literal("").transform(() => undefined));

export const guardianRouter = router({
  list: protectedProcedure
    .input(z.object({ studentId: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyStudentOwnership(ctx.counselorId, input.studentId);
      return prisma.guardian.findMany({
        where: { studentId: input.studentId },
        orderBy: { createdAt: "asc" },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        studentId: z.string(),
        firstName: z.string().trim().min(1).max(100),
        lastName: z.string().trim().min(1).max(100),
        relationship: z.string().trim().min(1).max(100),
        email: emailField,
        phone: z.string().trim().max(50).optional(),
        preferredContact: z.string().trim().max(50).optional(),
        notes: z.string().trim().max(2000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await verifyStudentOwnership(ctx.counselorId, input.studentId);
      const { studentId, ...data } = input;
      return prisma.guardian.create({
        data: { studentId, ...data },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        firstName: z.string().trim().min(1).max(100).optional(),
        lastName: z.string().trim().min(1).max(100).optional(),
        relationship: z.string().trim().min(1).max(100).optional(),
        email: emailField.nullable(),
        phone: z.string().trim().max(50).optional().nullable(),
        preferredContact: z.string().trim().max(50).optional().nullable(),
        notes: z.string().trim().max(2000).optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await verifyGuardianOwnership(ctx.counselorId, input.id);
      const { id, ...data } = input;
      return prisma.guardian.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await verifyGuardianOwnership(ctx.counselorId, input.id);
      await prisma.guardian.delete({ where: { id: input.id } });
      return { ok: true };
    }),
});
