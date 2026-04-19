import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import { verifyStudentOwnership } from "../lib/tenant";
import { generateMeetingPrep } from "@/ai/prompts/meetingPrep";
import { createAIOutput } from "@/ai/provenance";
import { MODEL } from "@/ai/client";
import { processMeetingNotes } from "../lib/process-meeting-notes";

export const meetingRouter = router({
  list: protectedProcedure
    .input(z.object({ studentId: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyStudentOwnership(ctx.counselorId, input.studentId);
      return prisma.meeting.findMany({
        where: { studentId: input.studentId, counselorId: ctx.counselorId },
        orderBy: { scheduledAt: "desc" },
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const meeting = await prisma.meeting.findFirst({
        where: { id: input.id, counselorId: ctx.counselorId },
        include: { student: true },
      });
      if (!meeting) throw new Error("Meeting not found");
      return meeting;
    }),

  create: protectedProcedure
    .input(
      z.object({
        studentId: z.string(),
        scheduledAt: z.string().datetime(),
        type: z.string(),
        location: z.string().optional(),
        duration: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await verifyStudentOwnership(ctx.counselorId, input.studentId);
      return prisma.meeting.create({
        data: {
          ...input,
          scheduledAt: new Date(input.scheduledAt),
          counselorId: ctx.counselorId,
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const meeting = await prisma.meeting.findFirst({
        where: { id: input.id, counselorId: ctx.counselorId },
      });
      if (!meeting) throw new Error("Meeting not found");
      await prisma.meeting.delete({ where: { id: input.id } });
      return { success: true };
    }),

  // One-click: create meeting + generate brief in a single call
  quickPrepBrief: protectedProcedure
    .input(z.object({ studentId: z.string(), meetingType: z.string().default("Check-in") }))
    .mutation(async ({ ctx, input }) => {
      await verifyStudentOwnership(ctx.counselorId, input.studentId);

      // Create meeting
      const meeting = await prisma.meeting.create({
        data: {
          studentId: input.studentId,
          counselorId: ctx.counselorId,
          scheduledAt: new Date(),
          type: input.meetingType,
        },
      });

      // Fetch full student context
      const student = await prisma.student.findUniqueOrThrow({
        where: { id: input.studentId },
        include: {
          tasks: {
            where: { status: { in: ["TODO", "IN_PROGRESS", "WAITING_ON_EXTERNAL"] } },
            orderBy: { priority: "desc" },
          },
          milestones: {
            where: { status: { in: ["IN_PROGRESS", "BLOCKED", "NOT_STARTED"] } },
            orderBy: { sortOrder: "asc" },
          },
          meetings: {
            where: { id: { not: meeting.id } },
            orderBy: { scheduledAt: "desc" },
            take: 3,
          },
          riskFlags: {
            where: { resolvedAt: null },
          },
        },
      });

      const { prep, usage } = await generateMeetingPrep({
        student,
        meetingType: input.meetingType,
        recentMeetings: student.meetings.map((m) => ({
          scheduledAt: m.scheduledAt,
          type: m.type,
          summary: m.summary,
        })),
        openTasks: student.tasks.map((t) => ({
          title: t.title,
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate,
        })),
        activeMilestones: student.milestones.map((m) => ({
          title: m.title,
          status: m.status,
          category: m.category,
          targetDate: m.targetDate,
        })),
        riskFlags: student.riskFlags.map((r) => ({
          title: r.title,
          severity: r.severity,
          description: r.description,
        })),
      });

      const aiOutput = await createAIOutput({
        counselorId: ctx.counselorId,
        studentId: input.studentId,
        feature: "meeting_prep",
        sourceBasis: [
          { type: "profile", id: input.studentId, label: `${student.firstName} ${student.lastName} profile` },
        ],
        confidence: "HIGH",
        output: prep,
        modelId: MODEL,
        tokenUsage: usage,
      });

      await prisma.meeting.update({
        where: { id: meeting.id },
        data: {
          prepBrief: JSON.stringify(prep),
          prepBriefAiId: aiOutput.id,
        },
      });

      return { meetingId: meeting.id, prep };
    }),

  generatePrepBrief: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Fetch meeting + full student context
      const meeting = await prisma.meeting.findFirst({
        where: { id: input.meetingId, counselorId: ctx.counselorId },
        include: {
          student: {
            include: {
              tasks: {
                where: { status: { in: ["TODO", "IN_PROGRESS", "WAITING_ON_EXTERNAL"] } },
                orderBy: { priority: "desc" },
              },
              milestones: {
                where: { status: { in: ["IN_PROGRESS", "BLOCKED", "NOT_STARTED"] } },
                orderBy: { sortOrder: "asc" },
              },
              meetings: {
                where: { id: { not: input.meetingId } },
                orderBy: { scheduledAt: "desc" },
                take: 3,
              },
              riskFlags: {
                where: { resolvedAt: null },
              },
            },
          },
        },
      });

      if (!meeting) throw new Error("Meeting not found");

      const { prep, usage } = await generateMeetingPrep({
        student: meeting.student,
        meetingType: meeting.type,
        recentMeetings: meeting.student.meetings.map((m) => ({
          scheduledAt: m.scheduledAt,
          type: m.type,
          summary: m.summary,
        })),
        openTasks: meeting.student.tasks.map((t) => ({
          title: t.title,
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate,
        })),
        activeMilestones: meeting.student.milestones.map((m) => ({
          title: m.title,
          status: m.status,
          category: m.category,
          targetDate: m.targetDate,
        })),
        riskFlags: meeting.student.riskFlags.map((r) => ({
          title: r.title,
          severity: r.severity,
          description: r.description,
        })),
      });

      // Save provenance
      const aiOutput = await createAIOutput({
        counselorId: ctx.counselorId,
        studentId: meeting.studentId,
        feature: "meeting_prep",
        sourceBasis: [
          { type: "profile", id: meeting.studentId, label: `${meeting.student.firstName} ${meeting.student.lastName} profile` },
          ...meeting.student.meetings.map((m) => ({
            type: "meeting" as const,
            id: m.id,
            label: `Meeting ${m.scheduledAt.toLocaleDateString()}`,
          })),
        ],
        confidence: "HIGH",
        output: prep,
        modelId: MODEL,
        tokenUsage: usage,
      });

      // Update meeting with prep brief
      await prisma.meeting.update({
        where: { id: input.meetingId },
        data: {
          prepBrief: JSON.stringify(prep),
          prepBriefAiId: aiOutput.id,
        },
      });

      return { prep, aiOutputId: aiOutput.id };
    }),

  submitNotes: protectedProcedure
    .input(
      z.object({
        meetingId: z.string(),
        rawNotes: z.string().min(10, "Please provide more detailed notes"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership first
      const meeting = await prisma.meeting.findFirst({
        where: { id: input.meetingId, counselorId: ctx.counselorId },
        select: { id: true },
      });
      if (!meeting) throw new Error("Meeting not found");

      const result = await processMeetingNotes({
        meetingId: input.meetingId,
        counselorId: ctx.counselorId,
        rawNotes: input.rawNotes,
      });
      return result;
    }),
});
