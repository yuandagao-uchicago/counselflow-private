import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import { verifyStudentOwnership } from "../lib/tenant";

export const studentRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          status: z.enum(["PROSPECT", "ACTIVE", "DEFERRED", "GRADUATED", "ARCHIVED"]).optional(),
          search: z.string().optional(),
          limit: z.number().min(1).max(100).default(50),
          cursor: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const where = {
        counselorId: ctx.counselorId,
        ...(input?.status && { status: input.status }),
        ...(input?.search && {
          OR: [
            { firstName: { contains: input.search, mode: "insensitive" as const } },
            { lastName: { contains: input.search, mode: "insensitive" as const } },
            { email: { contains: input.search, mode: "insensitive" as const } },
          ],
        }),
      };

      const students = await prisma.student.findMany({
        where,
        take: (input?.limit ?? 50) + 1,
        ...(input?.cursor && { cursor: { id: input.cursor }, skip: 1 }),
        orderBy: { updatedAt: "desc" },
        include: {
          _count: {
            select: {
              tasks: { where: { status: { in: ["TODO", "IN_PROGRESS"] } } },
              milestones: { where: { status: { in: ["IN_PROGRESS", "BLOCKED"] } } },
            },
          },
        },
      });

      let nextCursor: string | undefined;
      if (students.length > (input?.limit ?? 50)) {
        const nextItem = students.pop();
        nextCursor = nextItem?.id;
      }

      return { students, nextCursor };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const student = await prisma.student.findFirst({
        where: { id: input.id, counselorId: ctx.counselorId },
        include: {
          guardians: true,
          milestones: {
            orderBy: { sortOrder: "asc" },
            take: 10,
          },
          tasks: {
            where: { status: { in: ["TODO", "IN_PROGRESS", "WAITING_ON_EXTERNAL"] } },
            orderBy: { priority: "desc" },
            take: 10,
          },
          meetings: {
            orderBy: { scheduledAt: "desc" },
            take: 5,
          },
          riskFlags: {
            where: { resolvedAt: null },
          },
          _count: {
            select: {
              tasks: true,
              milestones: true,
              documents: true,
              communications: true,
              activities: true,
            },
          },
        },
      });

      if (!student) {
        throw new Error("Student not found");
      }

      return student;
    }),

  create: protectedProcedure
    .input(
      z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        gradeLevel: z.enum([
          "FRESHMAN",
          "SOPHOMORE",
          "JUNIOR",
          "SENIOR",
          "GAP_YEAR",
          "TRANSFER",
        ]),
        graduationYear: z.number().min(2024).max(2035),
        highSchool: z.string().optional(),
        gpaUnweighted: z.number().min(0).max(4.0).optional(),
        gpaWeighted: z.number().min(0).max(5.0).optional(),
        satScore: z.number().min(400).max(1600).optional(),
        actScore: z.number().min(1).max(36).optional(),
        intendedMajors: z.array(z.string()).default([]),
        interests: z.array(z.string()).default([]),
        personalNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return prisma.student.create({
        data: {
          ...input,
          counselorId: ctx.counselorId,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        email: z.string().email().optional().nullable(),
        phone: z.string().optional().nullable(),
        gradeLevel: z
          .enum(["FRESHMAN", "SOPHOMORE", "JUNIOR", "SENIOR", "GAP_YEAR", "TRANSFER"])
          .optional(),
        graduationYear: z.number().optional(),
        highSchool: z.string().optional().nullable(),
        gpaUnweighted: z.number().optional().nullable(),
        gpaWeighted: z.number().optional().nullable(),
        satScore: z.number().optional().nullable(),
        actScore: z.number().optional().nullable(),
        intendedMajors: z.array(z.string()).optional(),
        interests: z.array(z.string()).optional(),
        personalNotes: z.string().optional().nullable(),
        status: z
          .enum(["PROSPECT", "ACTIVE", "DEFERRED", "GRADUATED", "ARCHIVED"])
          .optional(),
        phase: z
          .enum([
            "EXPLORATION",
            "LIST_BUILDING",
            "TESTING",
            "APPLICATIONS",
            "ESSAYS",
            "SUBMISSIONS",
            "DECISIONS",
            "ENROLLMENT",
          ])
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await verifyStudentOwnership(ctx.counselorId, input.id);
      const { id, ...data } = input;
      return prisma.student.update({
        where: { id },
        data,
      });
    }),

  archive: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await verifyStudentOwnership(ctx.counselorId, input.id);
      return prisma.student.update({
        where: { id: input.id },
        data: { status: "ARCHIVED" },
      });
    }),

  completeTask: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const task = await prisma.task.findFirst({
        where: { id: input.taskId, student: { counselorId: ctx.counselorId } },
      });
      if (!task) throw new Error("Task not found");
      return prisma.task.update({
        where: { id: input.taskId },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
    }),
});
