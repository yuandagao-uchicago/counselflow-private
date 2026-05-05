import { router, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import {
  computeReadiness,
  type ReadinessApplication,
  type ReadinessStudent,
} from "@/lib/readiness";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export const dashboardRouter = router({
  stats: protectedProcedure.query(async ({ ctx }) => {
    const today = startOfToday();

    const [activeStudents, upcomingMeetings, pendingTasks, overdueTasks] = await Promise.all([
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
          dueDate: { lt: today },
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

  /**
   * Roster-wide application readiness rollup. Powers the Readiness page.
   * Loads every non-submitted application for this counselor, runs each
   * through `computeReadiness`, and groups the results by urgency bucket
   * for the UI.
   */
  readinessRollup: protectedProcedure.query(async ({ ctx }) => {
    const apps = await prisma.application.findMany({
      where: {
        student: { counselorId: ctx.counselorId, status: { not: "ARCHIVED" } },
      },
      orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
      include: {
        school: { select: { id: true, name: true, commonName: true } },
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            preferredName: true,
            graduationYear: true,
            satScore: true,
            actScore: true,
            documents: { select: { documentType: true } },
            _count: { select: { activities: true } },
          },
        },
        requirementItems: { orderBy: { sortOrder: "asc" } },
        essays: { select: { id: true, status: true } },
        recommenders: { select: { id: true, requestStatus: true } },
      },
    });

    const enriched = apps.map((app) => {
      const studentReadiness: ReadinessStudent = {
        satScore: app.student.satScore,
        actScore: app.student.actScore,
        documents: app.student.documents,
        activitiesCount: app.student._count.activities,
      };
      const readiness = computeReadiness(app as unknown as ReadinessApplication, studentReadiness);
      return { app, readiness };
    });

    // Bucket by urgency for the UI's "Due now / Due soon / Upcoming / Later" lanes.
    const buckets = {
      OVERDUE: [] as typeof enriched,
      DUE_SOON: [] as typeof enriched,
      UPCOMING: [] as typeof enriched,
      NORMAL: [] as typeof enriched,
      SUBMITTED: [] as typeof enriched,
    };
    for (const e of enriched) {
      if (e.readiness.state === "SUBMITTED") buckets.SUBMITTED.push(e);
      else buckets[e.readiness.urgency].push(e);
    }

    // Cross-roster missing-item counts, useful for "5 applications missing
    // testing data" chips on the dashboard.
    const missingByKind: Record<string, number> = {};
    for (const e of enriched) {
      if (e.readiness.state === "SUBMITTED") continue;
      for (const m of e.readiness.missingRequired) {
        missingByKind[m.kind] = (missingByKind[m.kind] ?? 0) + 1;
      }
    }

    const totals = {
      total: enriched.length,
      submitted: buckets.SUBMITTED.length,
      overdue: buckets.OVERDUE.length,
      dueSoon: buckets.DUE_SOON.length,
      readyForReview: enriched.filter((e) => e.readiness.state === "READY_FOR_REVIEW").length,
    };

    return { buckets, missingByKind, totals };
  }),
});
