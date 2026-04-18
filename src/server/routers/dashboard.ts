import { router, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export const dashboardRouter = router({
  stats: protectedProcedure.query(async ({ ctx }) => {
    const today = startOfToday();

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
          scheduledAt: { gte: today },
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
    const today = startOfToday();

    return prisma.meeting.findMany({
      where: {
        counselorId: ctx.counselorId,
        scheduledAt: { gte: today },
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
