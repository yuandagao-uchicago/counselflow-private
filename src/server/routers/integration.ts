import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import {
  zoomGet,
  fetchZoomTranscript,
  type ZoomRecordingsList,
  type ZoomRecording,
} from "@/lib/integrations/zoom";
import {
  createRecallBot,
  getRecallBot,
  getRecallBotTranscriptWithRetry,
  latestBotStatus,
} from "@/lib/integrations/recall";
import { parseVTT } from "@/lib/vtt-parser";
import { processMeetingNotes } from "../lib/process-meeting-notes";

export const integrationRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const integrations = await prisma.integration.findMany({
      where: { counselorId: ctx.counselorId },
      select: {
        id: true,
        provider: true,
        accountLabel: true,
        providerUserId: true,
        scopes: true,
        expiresAt: true,
        createdAt: true,
      },
    });
    return {
      integrations,
      recallConfigured: !!process.env.RECALL_API_KEY,
      zoomConfigured: !!process.env.ZOOM_CLIENT_ID && !!process.env.ZOOM_CLIENT_SECRET,
    };
  }),

  zoom: router({
    listRecentRecordings: protectedProcedure
      .input(
        z.object({
          pageSize: z.number().min(1).max(30).default(15),
        }).optional()
      )
      .query(async ({ ctx, input }) => {
        // Zoom `users/me/recordings` requires a `from` date; default to 30 days ago
        const from = new Date();
        from.setDate(from.getDate() - 30);

        const data = await zoomGet<ZoomRecordingsList>(
          ctx.counselorId,
          "/users/me/recordings",
          {
            from: from.toISOString().slice(0, 10),
            page_size: input?.pageSize ?? 15,
          }
        );

        // Only return meetings that have a transcript file available
        const withTranscripts = data.meetings
          .map((m: ZoomRecording) => {
            const transcriptFile = m.recording_files.find(
              (f) => f.file_type === "TRANSCRIPT"
            );
            return transcriptFile
              ? {
                  uuid: m.uuid,
                  id: m.id,
                  topic: m.topic,
                  startTime: m.start_time,
                  duration: m.duration,
                  transcriptFileId: transcriptFile.id,
                  downloadUrl: transcriptFile.download_url,
                  fileStatus: transcriptFile.status,
                }
              : null;
          })
          .filter(Boolean);

        return { recordings: withTranscripts };
      }),

    importRecording: protectedProcedure
      .input(
        z.object({
          meetingId: z.string(),
          downloadUrl: z.string().url(),
          zoomRecordingId: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Verify meeting ownership
        const meeting = await prisma.meeting.findFirst({
          where: { id: input.meetingId, counselorId: ctx.counselorId },
        });
        if (!meeting) throw new TRPCError({ code: "NOT_FOUND", message: "Meeting not found" });

        // Pull the VTT file from Zoom
        const vttText = await fetchZoomTranscript(ctx.counselorId, input.downloadUrl);
        const plainText = parseVTT(vttText);

        if (plainText.length < 10) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Zoom transcript was empty" });
        }

        // Mark source
        await prisma.meeting.update({
          where: { id: input.meetingId },
          data: {
            recordingSource: "zoom",
            externalRecordingId: input.zoomRecordingId,
          },
        });

        // Run the shared AI summary pipeline
        const result = await processMeetingNotes({
          meetingId: input.meetingId,
          counselorId: ctx.counselorId,
          rawNotes: plainText,
          sourceLabel: "Zoom recording",
        });

        return {
          tasksCreated: result.tasksCreated,
          transcriptChars: plainText.length,
        };
      }),
  }),

  recall: router({
    sendBot: protectedProcedure
      .input(
        z.object({
          meetingId: z.string(),
          meetingUrl: z.string().url(),
          joinAt: z.string().datetime().optional(), // if omitted, joins now
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!process.env.RECALL_API_KEY) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Recall.ai is not configured",
          });
        }

        const meeting = await prisma.meeting.findFirst({
          where: { id: input.meetingId, counselorId: ctx.counselorId },
        });
        if (!meeting) throw new TRPCError({ code: "NOT_FOUND", message: "Meeting not found" });

        const bot = await createRecallBot({
          meetingUrl: input.meetingUrl,
          joinAt: input.joinAt ? new Date(input.joinAt) : undefined,
          metadata: {
            meetingId: meeting.id,
            counselorId: ctx.counselorId,
          },
        });

        await prisma.meeting.update({
          where: { id: meeting.id },
          data: {
            meetingUrl: input.meetingUrl,
            recallBotId: bot.id,
            recallBotStatus: latestBotStatus(bot),
            recordingSource: "recall",
            externalRecordingId: bot.id,
          },
        });

        return { botId: bot.id, status: latestBotStatus(bot) };
      }),

    refreshBotStatus: protectedProcedure
      .input(z.object({ meetingId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const meeting = await prisma.meeting.findFirst({
          where: { id: input.meetingId, counselorId: ctx.counselorId },
        });
        if (!meeting?.recallBotId) throw new TRPCError({ code: "NOT_FOUND", message: "No Recall bot for this meeting" });

        const bot = await getRecallBot(meeting.recallBotId);
        const status = latestBotStatus(bot);

        await prisma.meeting.update({
          where: { id: meeting.id },
          data: { recallBotStatus: status },
        });

        // If the call ended and we don't yet have a summary, pull the transcript and run the pipeline
        const isTerminal = ["done", "call_ended", "fatal"].includes(status);
        if (isTerminal && !meeting.summary) {
          try {
            const transcript = await getRecallBotTranscriptWithRetry(meeting.recallBotId);
            if (transcript.length >= 10) {
              const result = await processMeetingNotes({
                meetingId: meeting.id,
                counselorId: ctx.counselorId,
                rawNotes: transcript,
                sourceLabel: "Recall.ai bot",
              });
              return {
                status,
                processed: true,
                tasksCreated: result.tasksCreated,
              };
            }
          } catch (err) {
            // Transcript may not be ready yet even though bot is done
            console.error("Recall transcript fetch failed:", err);
          }
        }

        return { status, processed: false };
      }),
  }),
});
