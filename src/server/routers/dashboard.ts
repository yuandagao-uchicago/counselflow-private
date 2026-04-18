import { router, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";

export const dashboardRouter = router({
  stats: protectedProcedure.query(async ({ ctx }) => {
    const [
      activeStudents,
      upcomingMeetings,
      pendingTasks,
      overdueTasks,
    ] = await Promise.all([
      prisma.student.count({
        where: { counselorId: ctx.counselorId, status: "ACTIVE" },
      }),
      prisma.meeting.count({
        where: {
          counselorId: ctx.counselorId,
          scheduledAt: { gte: new Date() },
        },
      }),
      prisma.task.count({
        where: {
          student: { counselorId: ctx.counselorId },
          status: { in: ["TODO", "IN_PROGRESS"] },
        },
      }),
      prisma.task.count({
        where: {
          student: { counselorId: ctx.counselorId },
          status: { in: ["TODO", "IN_PROGRESS"] },
          dueDate: { lt: new Date() },
        },
      }),
    ]);

    return { activeStudents, upcomingMeetings, pendingTasks, overdueTasks };
  }),

  upcomingMeetings: protectedProcedure.query(async ({ ctx }) => {
    return prisma.meeting.findMany({
      where: {
        counselorId: ctx.counselorId,
        scheduledAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // include today's past meetings
      },
      orderBy: { scheduledAt: "asc" },
      take: 5,
      include: {
        student: { select: { firstName: true, lastName: true, id: true } },
      },
    });
  }),

  recentStudents: protectedProcedure.query(async ({ ctx }) => {
    return prisma.student.findMany({
      where: { counselorId: ctx.counselorId, status: "ACTIVE" },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: {
        _count: {
          select: {
            tasks: { where: { status: { in: ["TODO", "IN_PROGRESS"] } } },
          },
        },
      },
    });
  }),
});
