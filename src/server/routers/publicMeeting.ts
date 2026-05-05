/**
 * Public meeting-RSVP router. NO Clerk auth — every procedure requires a
 * valid token (the unguessable URL slug emailed to the student). Each
 * procedure verifies the token and the request's expiry/state before acting.
 *
 * Surface intentionally minimal:
 *   - getByToken     : student loads the response page
 *   - acceptSlot     : student picks one of the offered times → CONFIRMED
 *   - proposeAlt     : student proposes a different time → COUNTER_PROPOSED
 */
import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import { TRPCError } from "@trpc/server";
import { sendEmail, buildConfirmationEmail, buildCounterAcknowledgementEmail } from "@/lib/email";
import { createZoomMeeting } from "@/lib/integrations/zoom-meeting";
import { buildIcsAttachment } from "@/lib/ics";

async function loadByToken(token: string) {
  const req = await prisma.meetingRequest.findUnique({
    where: { token },
    include: {
      slots: { orderBy: { sortOrder: "asc" } },
      student: { select: { id: true, firstName: true, lastName: true, email: true, preferredName: true } },
      counselor: { select: { id: true, name: true, email: true, timezone: true } },
      guardian: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });
  if (!req) {
    throw new TRPCError({ code: "NOT_FOUND", message: "This link is invalid or has been revoked." });
  }
  return req;
}

function ensureOpen(req: { status: string; expiresAt: Date }) {
  if (req.status === "CONFIRMED") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "This meeting has already been confirmed." });
  }
  if (req.status === "CANCELLED") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "This request has been cancelled." });
  }
  if (req.status === "EXPIRED" || req.expiresAt.getTime() < Date.now()) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "This link has expired." });
  }
}

export const publicMeetingRouter = router({
  getByToken: publicProcedure
    .input(z.object({ token: z.string().min(8) }))
    .query(async ({ input }) => {
      const req = await loadByToken(input.token);
      // Return only the fields safe to expose publicly. Don't leak emails/IDs.
      return {
        meetingType: req.meetingType,
        durationMins: req.durationMins,
        message: req.message,
        location: req.location,
        status: req.status,
        expiresAt: req.expiresAt,
        counterProposalAt: req.counterProposalAt,
        slots: req.slots.map((s) => ({ id: s.id, startAt: s.startAt, status: s.status })),
        student: {
          firstName: req.student.firstName,
          preferredName: req.student.preferredName,
        },
        counselor: { name: req.counselor.name, timezone: req.counselor.timezone },
        confirmed: req.status === "CONFIRMED",
        cancelled: req.status === "CANCELLED",
        expired: req.status === "EXPIRED" || req.expiresAt.getTime() < Date.now(),
      };
    }),

  acceptSlot: publicProcedure
    .input(z.object({ token: z.string().min(8), slotId: z.string() }))
    .mutation(async ({ input }) => {
      const req = await loadByToken(input.token);
      ensureOpen(req);

      const slot = req.slots.find((s) => s.id === input.slotId);
      if (!slot) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "That time is no longer available." });
      }

      const counselor = req.counselor;
      const startAt = slot.startAt;

      // Mint Zoom (or null if Zoom isn't connected) BEFORE the transaction
      // so the transaction stays short. We tolerate Zoom failure — the
      // meeting still confirms; counselor can attach a link later.
      const zoom = await createZoomMeeting({
        counselorId: counselor.id,
        topic: `${req.meetingType} with ${req.student.firstName} ${req.student.lastName}`,
        startAt,
        durationMins: req.durationMins,
        timezone: counselor.timezone,
        agenda: req.message ?? undefined,
      }).catch((e) => {
        console.error("[publicMeeting] zoom create failed:", e);
        return null;
      });

      const result = await prisma.$transaction(async (tx) => {
        // Race-safety: re-check status inside the transaction. If two
        // people clicked at the same time, only the first wins.
        const live = await tx.meetingRequest.findUnique({
          where: { id: req.id },
          select: { status: true, expiresAt: true },
        });
        if (!live || live.status !== "AWAITING_STUDENT" || live.expiresAt.getTime() < Date.now()) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "This request is no longer accepting responses.",
          });
        }

        const meeting = await tx.meeting.create({
          data: {
            counselorId: counselor.id,
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

        await tx.meetingRequestSlot.update({
          where: { id: slot.id },
          data: { status: "CHOSEN" },
        });
        await tx.meetingRequestSlot.updateMany({
          where: { requestId: req.id, id: { not: slot.id } },
          data: { status: "REJECTED" },
        });

        const updated = await tx.meetingRequest.update({
          where: { id: req.id },
          data: {
            status: "CONFIRMED",
            respondedAt: new Date(),
            confirmedAt: new Date(),
            meetingId: meeting.id,
          },
        });

        return { meeting, request: updated };
      });

      // Send the confirmation email outside the transaction.
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
          ...(req.guardian?.email && req.ccGuardian && { cc: req.guardian.email }),
          replyTo: counselor.email,
          ...conf,
          attachments: [
            { filename: ics.filename, content: ics.content, contentType: ics.contentType },
          ],
        });
      }

      return {
        confirmed: true,
        startAt,
        meetingUrl: zoom?.joinUrl ?? null,
      };
    }),

  proposeAlternative: publicProcedure
    .input(
      z.object({
        token: z.string().min(8),
        startAt: z.date(),
        note: z.string().max(500).optional().nullable(),
      }),
    )
    .mutation(async ({ input }) => {
      const req = await loadByToken(input.token);
      ensureOpen(req);

      // Reject obviously past times.
      if (input.startAt.getTime() < Date.now() - 60 * 60_000) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Pick a future time." });
      }

      const updated = await prisma.meetingRequest.update({
        where: { id: req.id },
        data: {
          status: "COUNTER_PROPOSED",
          counterProposalAt: input.startAt,
          counterProposalNote: input.note ?? null,
          respondedAt: new Date(),
        },
      });

      // Acknowledge to the student.
      if (req.student.email) {
        const ack = buildCounterAcknowledgementEmail({
          studentFirstName: req.student.firstName,
          counselorName: req.counselor.name,
          proposedAt: input.startAt,
          timezone: req.counselor.timezone,
        });
        await sendEmail({
          to: req.student.email,
          replyTo: req.counselor.email,
          ...ack,
        });
      }

      return { ok: true, status: updated.status };
    }),
});
