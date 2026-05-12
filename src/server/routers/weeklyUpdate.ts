/**
 * Weekly update drafter — parent/student status emails.
 *
 * One mutation: generateDraft({ studentId, audience, personalNote? }).
 *   - Pulls completed-this-week and coming-up data straight from the case file.
 *   - Calls Gemini for a tone-adjusted draft (parent vs student).
 *   - For audience=BOTH, creates TWO drafts so the counselor can edit each
 *     independently in the review queue.
 *   - Always draft-first: a Communication row + ReviewQueueItem land in the
 *     queue; nothing is sent until the counselor approves in review.approve.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, aiProtectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import { verifyStudentOwnership } from "../lib/tenant";
import { generateWeeklyUpdate, type WeeklyUpdateAudience } from "@/ai/prompts/weeklyUpdate";
import { createAIOutput } from "@/ai/provenance";
import { MODEL } from "@/ai/client";

const AUDIENCES = ["PARENT", "STUDENT", "BOTH"] as const;
type Audience = (typeof AUDIENCES)[number];

const WINDOW_PAST_DAYS = 7;
const WINDOW_FUTURE_TASKS_DAYS = 14;
const WINDOW_FUTURE_DEADLINES_DAYS = 45;

/** Returns the date N days before now, at midnight. */
function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Returns the date N days from now, at end-of-day. */
function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Pull the data slices the AI prompt expects. One round-trip via Promise.all. */
async function loadContext(studentId: string) {
  const pastFrom = daysAgo(WINDOW_PAST_DAYS);
  const taskHorizon = daysFromNow(WINDOW_FUTURE_TASKS_DAYS);
  const deadlineHorizon = daysFromNow(WINDOW_FUTURE_DEADLINES_DAYS);
  const now = new Date();

  const [
    completedTasks,
    completedMilestones,
    pastMeetings,
    upcomingTasks,
    upcomingDeadlines,
    upcomingMeetings,
    activeMilestones,
  ] = await Promise.all([
    prisma.task.findMany({
      where: {
        studentId,
        status: "COMPLETED",
        completedAt: { gte: pastFrom },
      },
      orderBy: { completedAt: "desc" },
      select: { title: true, completedAt: true },
      take: 20,
    }),
    prisma.milestone.findMany({
      where: {
        studentId,
        status: "COMPLETED",
        completedAt: { gte: pastFrom },
      },
      orderBy: { completedAt: "desc" },
      select: { title: true, completedAt: true },
      take: 10,
    }),
    prisma.meeting.findMany({
      where: {
        studentId,
        scheduledAt: { gte: pastFrom, lte: now },
      },
      orderBy: { scheduledAt: "desc" },
      select: { scheduledAt: true, type: true, summary: true },
      take: 5,
    }),
    prisma.task.findMany({
      where: {
        studentId,
        status: { in: ["TODO", "IN_PROGRESS", "WAITING_ON_EXTERNAL"] },
        OR: [
          { dueDate: { gte: now, lte: taskHorizon } },
          { dueDate: null, priority: { in: ["HIGH", "URGENT"] } },
        ],
      },
      orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
      select: { title: true, dueDate: true, priority: true },
      take: 12,
    }),
    prisma.application.findMany({
      where: {
        studentId,
        status: { notIn: ["SUBMITTED", "WITHDRAWN"] },
        deadline: { gte: now, lte: deadlineHorizon },
      },
      orderBy: { deadline: "asc" },
      select: {
        applicationType: true,
        deadline: true,
        school: { select: { name: true, commonName: true } },
      },
      take: 10,
    }),
    prisma.meeting.findMany({
      where: {
        studentId,
        scheduledAt: { gte: now, lte: daysFromNow(WINDOW_FUTURE_TASKS_DAYS) },
      },
      orderBy: { scheduledAt: "asc" },
      select: { scheduledAt: true, type: true },
      take: 5,
    }),
    prisma.milestone.findMany({
      where: {
        studentId,
        status: { in: ["IN_PROGRESS", "BLOCKED", "NOT_STARTED"] },
        OR: [
          { targetDate: { gte: now, lte: deadlineHorizon } },
          { status: "BLOCKED" },
        ],
      },
      orderBy: [{ targetDate: "asc" }, { sortOrder: "asc" }],
      select: { title: true, targetDate: true },
      take: 8,
    }),
  ]);

  return {
    completed: {
      // completedAt is non-null in practice because we filtered on it, but
      // Prisma still types it as Date | null. Narrow it for the AI context.
      tasks: completedTasks.map((t) => ({ title: t.title, completedAt: t.completedAt! })),
      milestones: completedMilestones.map((m) => ({ title: m.title, completedAt: m.completedAt! })),
      meetings: pastMeetings,
    },
    upcoming: {
      tasks: upcomingTasks,
      deadlines: upcomingDeadlines.map((a) => ({
        school: a.school.commonName ?? a.school.name,
        type: a.applicationType,
        date: a.deadline!,
      })),
      meetings: upcomingMeetings,
      milestones: activeMilestones,
    },
  };
}

interface DraftSpec {
  audience: WeeklyUpdateAudience;
  guardianId: string | null;
  recipientFirstName: string | null;
  recipientEmail: string;
}

/**
 * Figure out who we're drafting to.
 *
 * Throws BAD_REQUEST when the requested audience has no email on file —
 * better to surface the gap than silently produce an undeliverable draft.
 */
async function resolveRecipients(
  studentId: string,
  audience: Audience,
): Promise<DraftSpec[]> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      firstName: true,
      preferredName: true,
      email: true,
      guardians: {
        select: { id: true, firstName: true, email: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!student) throw new TRPCError({ code: "NOT_FOUND", message: "Student not found" });

  const specs: DraftSpec[] = [];

  if (audience === "STUDENT" || audience === "BOTH") {
    if (!student.email) {
      // For BOTH, we'd rather draft just the parent than fail outright.
      // For STUDENT-only, missing email is a hard error.
      if (audience === "STUDENT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Student has no email on file. Add one before drafting an update.",
        });
      }
    } else {
      specs.push({
        audience: "STUDENT",
        guardianId: null,
        recipientFirstName: student.preferredName ?? student.firstName,
        recipientEmail: student.email,
      });
    }
  }

  if (audience === "PARENT" || audience === "BOTH") {
    const guardian = student.guardians.find((g) => !!g.email);
    if (!guardian) {
      if (audience === "PARENT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No guardian with an email on file. Add one before drafting an update.",
        });
      }
    } else {
      specs.push({
        audience: "PARENT",
        guardianId: guardian.id,
        recipientFirstName: guardian.firstName,
        recipientEmail: guardian.email!,
      });
    }
  }

  if (specs.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No recipient email available for this audience.",
    });
  }
  return specs;
}

export const weeklyUpdateRouter = router({
  generateDraft: aiProtectedProcedure
    .input(
      z.object({
        studentId: z.string(),
        audience: z.enum(AUDIENCES),
        personalNote: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const student = await verifyStudentOwnership(ctx.counselorId, input.studentId);
      const counselor = await prisma.user.findUniqueOrThrow({
        where: { id: ctx.counselorId },
        select: { name: true },
      });

      const specs = await resolveRecipients(student.id, input.audience);
      const data = await loadContext(student.id);

      // Empty-state guard: if there's literally nothing to report AND no note,
      // the email will just say "nothing happened" — that's a worse counselor
      // experience than a clear error.
      const hasAnyContent =
        data.completed.tasks.length > 0 ||
        data.completed.milestones.length > 0 ||
        data.completed.meetings.length > 0 ||
        data.upcoming.tasks.length > 0 ||
        data.upcoming.deadlines.length > 0 ||
        data.upcoming.meetings.length > 0 ||
        data.upcoming.milestones.length > 0 ||
        (input.personalNote && input.personalNote.trim().length > 0);
      if (!hasAnyContent) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Nothing to summarize for this student this week. Add a personal note, or wait until there's some activity.",
        });
      }

      // Generate one draft per resolved recipient (BOTH yields two AI calls).
      // Run sequentially so we don't blow past the 5/min AI rate limit on a
      // single click; the cost is one extra Gemini round-trip in the worst case.
      const createdItems = [];
      for (const spec of specs) {
        const { draft, usage } = await generateWeeklyUpdate({
          audience: spec.audience,
          counselorName: counselor.name,
          recipientFirstName: spec.recipientFirstName,
          student: {
            firstName: student.firstName,
            lastName: student.lastName,
            preferredName: student.preferredName,
            gradeLevel: student.gradeLevel,
            phase: student.phase,
          },
          completed: data.completed,
          upcoming: data.upcoming,
          personalNote: input.personalNote ?? null,
        });

        const aiOutput = await createAIOutput({
          counselorId: ctx.counselorId,
          studentId: student.id,
          feature: "weekly_update",
          sourceBasis: [
            {
              type: "profile",
              id: student.id,
              label: `${student.firstName} ${student.lastName}`,
            },
          ],
          confidence: "MEDIUM",
          output: draft,
          modelId: MODEL,
          tokenUsage: usage,
        });

        // One Communication + ReviewQueueItem per recipient — so each can be
        // edited and approved independently.
        const comm = await prisma.communication.create({
          data: {
            counselorId: ctx.counselorId,
            studentId: student.id,
            guardianId: spec.guardianId,
            type: "EMAIL",
            direction: "OUTBOUND",
            subject: draft.subject,
            body: draft.body,
            isDraft: true,
            draftAiId: aiOutput.id,
          },
        });

        const queueItem = await prisma.reviewQueueItem.create({
          data: {
            counselorId: ctx.counselorId,
            entityType: "weekly_update",
            entityId: comm.id,
            aiOutputId: aiOutput.id,
            title: `Weekly update to ${spec.audience === "PARENT" ? "parent" : "student"} · ${student.firstName} ${student.lastName}`,
            summary: `To ${spec.recipientEmail}`,
          },
        });

        createdItems.push({
          reviewQueueItemId: queueItem.id,
          communicationId: comm.id,
          audience: spec.audience,
        });
      }

      return { drafts: createdItems };
    }),
});
