/**
 * Meeting-request router (counselor-side).
 *
 * Flow:
 *   1. Counselor opens dialog, picks 2–4 candidate slots → `create`
 *      Atomically inserts MeetingRequest + MeetingRequestSlot rows, then
 *      sends a single email with a magic link to /respond/[token].
 *   2. Student responds via the public router (see `publicMeeting.ts`).
 *   3. If the student counter-proposes, it surfaces in `list({status:"COUNTER_PROPOSED"})`
 *      — the Scheduling Inbox — and counselor can `acceptCounterProposal`
 *      or `proposeNewSlots`.
 *   4. `cancel` revokes a pending request and stops further responses.
 */
import { z } from "zod";
import { randomBytes } from "crypto";
import { router, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import { TRPCError } from "@trpc/server";
import { verifyStudentOwnership } from "../lib/tenant";
import { sendEmail, buildMeetingRequestEmail, buildConfirmationEmail } from "@/lib/email";
import { createZoomMeeting } from "@/lib/integrations/zoom-meeting";
import { buildIcsAttachment } from "@/lib/ics";

const REQUEST_TTL_DAYS = 14;

const STATUS_VALUES = [
  "AWAITING_STUDENT",
  "COUNTER_PROPOSED",
  "CONFIRMED",
  "CANCELLED",
  "EXPIRED",
] as const;

function newToken(): string {
  // 24 bytes = 32 base64url chars; collision-resistant for our scale.
  return randomBytes(24).toString("base64url");
}

async function loadOwnedRequest(counselorId: string, requestId: string) {
  const req = await prisma.meetingRequest.findFirst({
    where: { id: requestId, counselorId },
    include: {
      slots: { orderBy: { sortOrder: "asc" } },
      student: { select: { id: true, firstName: true, lastName: true, email: true } },
      counselor: { select: { id: true, name: true, email: true, timezone: true } },
      guardian: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });
  if (!req) throw new TRPCError({ code: "NOT_FOUND", message: "Meeting request not found" });
  return req;
}

export const meetingRequestRouter = router({
  // Counselor's full inbox — defaults to "needs your attention" buckets.
  list: protectedProcedure
    .input(
      z
        .object({
          status: z.enum(STATUS_VALUES).optional(),
          studentId: z.string().optional(),
          limit: z.number().min(1).max(100).default(50),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      // We include `token` so the inbox can build a "copy magic link" affordance.
      // Safe because the counselor owns these requests and tokens are scoped
      // to their own students.
      return prisma.meetingRequest.findMany({
        where: {
          counselorId: ctx.counselorId,
          ...(input?.status && { status: input.status }),
          ...(input?.studentId && { studentId: input.studentId }),
        },
        orderBy: { updatedAt: "desc" },
        take: input?.limit ?? 50,
        include: {
          slots: { orderBy: { sortOrder: "asc" } },
          student: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => loadOwnedRequest(ctx.counselorId, input.id)),

  create: protectedProcedure
    .input(
      z.object({
        studentId: z.string(),
        meetingType: z.string().min(1).default("Check-in"),
        durationMins: z.number().min(15).max(180).default(30),
        message: z.string().max(2000).optional().nullable(),
        ccGuardian: z.boolean().default(false),
        guardianId: z.string().optional().nullable(),
        slots: z
          .array(z.object({ startAt: z.date() }))
          .min(1)
          .max(6),
        location: z.string().optional().nullable().default("Zoom"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const student = await verifyStudentOwnership(ctx.counselorId, input.studentId);
      if (!student.email) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Student has no email on file. Add one before requesting a meeting.",
        });
      }

      // Resolve a ccGuardian, if requested.
      let guardianEmail: string | undefined;
      let guardianId: string | undefined;
      if (input.ccGuardian) {
        const g = input.guardianId
          ? await prisma.guardian.findFirst({
              where: { id: input.guardianId, studentId: student.id },
            })
          : await prisma.guardian.findFirst({
              where: { studentId: student.id, email: { not: null } },
              orderBy: { createdAt: "asc" },
            });
        if (g?.email) {
          guardianEmail = g.email;
          guardianId = g.id;
        }
      }

      const counselor = await prisma.user.findUniqueOrThrow({
        where: { id: ctx.counselorId },
        select: { id: true, name: true, email: true, timezone: true },
      });

      // Atomic: create request + slots together so we never have a request
      // with no slot menu, even if the second insert trips.
      const created = await prisma.$transaction(async (tx) => {
        const request = await tx.meetingRequest.create({
          data: {
            counselorId: ctx.counselorId,
            studentId: student.id,
            guardianId,
            token: newToken(),
            expiresAt: new Date(Date.now() + REQUEST_TTL_DAYS * 86_400_000),
            meetingType: input.meetingType,
            durationMins: input.durationMins,
            message: input.message ?? undefined,
            ccGuardian: input.ccGuardian,
            location: input.location ?? "Zoom",
          },
        });

        await tx.meetingRequestSlot.createMany({
          data: input.slots.map((s, i) => ({
            requestId: request.id,
            startAt: s.startAt,
            sortOrder: i,
          })),
        });

        return request;
      });

      // Send email outside the transaction. Failure here doesn't roll back
      // the request — the counselor can resend from the inbox.
      const email = buildMeetingRequestEmail({
        studentFirstName: student.preferredName ?? student.firstName,
        counselorName: counselor.name,
        meetingType: input.meetingType,
        durationMins: input.durationMins,
        message: input.message ?? null,
        token: created.token,
        slots: input.slots.map((s) => ({ startAt: s.startAt })),
        timezone: counselor.timezone,
      });

      const send = await sendEmail({
        to: student.email,
        ...(guardianEmail && { cc: guardianEmail }),
        replyTo: counselor.email,
        ...email,
      });

      // Dev convenience: when the email didn't actually go out (no key, or
      // a Resend error), print the magic link to the server log so the
      // counselor can paste it into a browser to walk the student flow.
      if (!send.sent) {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        console.log(
          `\n[meetingRequest] Email skipped (${send.reason}). Magic link for ${student.firstName}:\n  ${baseUrl}/respond/${created.token}\n`,
        );
      }

      return {
        request: created,
        sent: send.sent,
        sendReason: !send.sent ? send.reason : undefined,
        // Returned to the client so we can show a copy-link affordance in dev
        magicLink: !send.sent ? `/respond/${created.token}` : undefined,
      };
    }),

  cancel: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const req = await loadOwnedRequest(ctx.counselorId, input.id);
      if (req.status === "CONFIRMED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Already confirmed. Cancel the meeting itself instead.",
        });
      }
      return prisma.meetingRequest.update({
        where: { id: req.id },
        data: { status: "CANCELLED", cancelledAt: new Date() },
      });
    }),

  // Counselor accepts the student's counter-proposal: this is the meeting.
  // Mints Zoom (if connected), creates Meeting record, emails confirmation.
  acceptCounterProposal: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const req = await loadOwnedRequest(ctx.counselorId, input.id);
      if (req.status !== "COUNTER_PROPOSED" || !req.counterProposalAt) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No counter-proposal to accept" });
      }
      if (req.counterProposalAt.getTime() < Date.now()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "The proposed time has passed. Please propose new slots.",
        });
      }

      const startAt = req.counterProposalAt;
      const counselor = req.counselor;

      // Best-effort Zoom create. Returns null if Zoom isn't connected.
      const zoom = await createZoomMeeting({
        counselorId: ctx.counselorId,
        topic: `${req.meetingType} with ${req.student.firstName} ${req.student.lastName}`,
        startAt,
        durationMins: req.durationMins,
        timezone: counselor.timezone,
        agenda: req.message ?? undefined,
      }).catch((e) => {
        console.error("[meetingRequest] zoom create failed:", e);
        return null;
      });

      const result = await prisma.$transaction(async (tx) => {
        const meeting = await tx.meeting.create({
          data: {
            counselorId: ctx.counselorId,
            studentId: req.studentId,
            scheduledAt: startAt,
            duration: req.durationMins,
            type: req.meetingType,
            location: zoom?.joinUrl ?? req.location ?? null,
            meetingUrl: zoom?.joinUrl ?? null,
            recordingSource: zoom ? "zoom" : null,
            externalRecordingId: zoom?.id ?? null,
          },
        });
        const updated = await tx.meetingRequest.update({
          where: { id: req.id },
          data: {
            status: "CONFIRMED",
            confirmedAt: new Date(),
            meetingId: meeting.id,
          },
        });
        return { meeting, request: updated };
      });

      // Send confirmation email (with ICS) to student + cc'd guardian
      if (req.student.email) {
        const conf = buildConfirmationEmail({
          studentFirstName: req.student.firstName,
          counselorName: counselor.name,
          meetingType: req.meetingType,
          durationMins: req.durationMins,
          startAt,
          meetingUrl: zoom?.joinUrl ?? null,
          timezone: counselor.timezone,
        });
        const ics = buildIcsAttachment({
          uid: result.meeting.id,
          startAt,
          endAt: new Date(startAt.getTime() + req.durationMins * 60_000),
          summary: `${req.meetingType} with ${counselor.name}`,
          description: req.message ?? undefined,
          location: zoom?.joinUrl ?? req.location ?? undefined,
          organizer: { name: counselor.name, email: counselor.email },
          attendees: [
            { name: `${req.student.firstName} ${req.student.lastName}`, email: req.student.email },
            ...(req.guardian?.email
              ? [
                  {
                    name: `${req.guardian.firstName} ${req.guardian.lastName}`,
                    email: req.guardian.email,
                  },
                ]
              : []),
          ],
          url: zoom?.joinUrl,
        });

        await sendEmail({
          to: req.student.email,
          ...(req.guardian?.email && { cc: req.guardian.email }),
          replyTo: counselor.email,
          ...conf,
          attachments: [
            { filename: ics.filename, content: ics.content, contentType: ics.contentType },
          ],
        });
      }

      return result;
    }),

  // Counselor counter-counter-proposes: replace slot menu, restart awaiting.
  proposeNewSlots: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        slots: z.array(z.object({ startAt: z.date() })).min(1).max(6),
        message: z.string().max(2000).optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const req = await loadOwnedRequest(ctx.counselorId, input.id);

      const counselor = req.counselor;

      const updated = await prisma.$transaction(async (tx) => {
        // Re-check status inside transaction to prevent race with concurrent acceptSlot
        const current = await tx.meetingRequest.findUniqueOrThrow({ where: { id: req.id } });
        if (current.status === "CONFIRMED" || current.status === "CANCELLED") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Cannot propose new slots — request is already ${current.status.toLowerCase()}.`,
          });
        }

        // Wipe old slots and counter-proposal; new menu, new email.
        await tx.meetingRequestSlot.deleteMany({ where: { requestId: req.id } });
        await tx.meetingRequestSlot.createMany({
          data: input.slots.map((s, i) => ({
            requestId: req.id,
            startAt: s.startAt,
            sortOrder: i,
          })),
        });
        return tx.meetingRequest.update({
          where: { id: req.id },
          data: {
            status: "AWAITING_STUDENT",
            counterProposalAt: null,
            counterProposalNote: null,
            ...(input.message != null && { message: input.message }),
          },
        });
      });

      if (req.student.email) {
        const email = buildMeetingRequestEmail({
          studentFirstName: req.student.firstName,
          counselorName: counselor.name,
          meetingType: req.meetingType,
          durationMins: req.durationMins,
          message: input.message ?? req.message,
          token: req.token,
          slots: input.slots.map((s) => ({ startAt: s.startAt })),
          timezone: counselor.timezone,
        });
        await sendEmail({
          to: req.student.email,
          ...(req.guardian?.email && req.ccGuardian && { cc: req.guardian.email }),
          replyTo: counselor.email,
          ...email,
        });
      }
      return updated;
    }),

  // Resend the original invite without changing slots — for nudging.
  resend: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const req = await loadOwnedRequest(ctx.counselorId, input.id);
      if (req.status !== "AWAITING_STUDENT") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only pending requests can be resent" });
      }
      if (!req.student.email) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Student has no email" });
      }
      const counselor = req.counselor;
      const email = buildMeetingRequestEmail({
        studentFirstName: req.student.firstName,
        counselorName: counselor.name,
        meetingType: req.meetingType,
        durationMins: req.durationMins,
        message: req.message,
        token: req.token,
        slots: req.slots.map((s) => ({ startAt: s.startAt })),
        timezone: counselor.timezone,
      });
      const send = await sendEmail({
        to: req.student.email,
        ...(req.guardian?.email && req.ccGuardian && { cc: req.guardian.email }),
        replyTo: counselor.email,
        ...email,
      });
      await prisma.meetingRequest.update({
        where: { id: req.id },
        data: {
          remindedAt: new Date(),
          // Extend expiry so the student has a fresh window to respond
          expiresAt: new Date(Date.now() + REQUEST_TTL_DAYS * 86_400_000),
        },
      });
      return { sent: send.sent };
    }),
});
