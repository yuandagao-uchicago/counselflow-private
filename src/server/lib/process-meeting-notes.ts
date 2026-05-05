import { TRPCError } from "@trpc/server";
import { prisma } from "@/lib/prisma";
import { generateMeetingSummary } from "@/ai/prompts/meetingSummary";
import { createAIOutput } from "@/ai/provenance";
import { MODEL } from "@/ai/client";

export interface ProcessNotesResult {
  tasksCreated: number;
  aiOutputId: string;
  communicationDraftId: string | null;
  reviewQueueItemId: string | null;
}

/**
 * Shared pipeline: raw notes/transcript -> AI summary -> tasks created -> meeting updated.
 * Used by:
 *   - meeting.submitNotes (manual paste)
 *   - integration.zoom.importRecording (Zoom cloud VTT)
 *   - /api/webhooks/recall (Recall.ai bot transcript)
 */
export async function processMeetingNotes(opts: {
  meetingId: string;
  counselorId: string;
  rawNotes: string;
  sourceLabel?: string; // e.g. "Zoom recording" or "Recall.ai bot"
}): Promise<ProcessNotesResult> {
  const meeting = await prisma.meeting.findFirst({
    where: { id: opts.meetingId, counselorId: opts.counselorId },
    include: { student: true },
  });
  if (!meeting) throw new TRPCError({ code: "NOT_FOUND", message: "Meeting not found" });

  const prevMeeting = await prisma.meeting.findFirst({
    where: {
      studentId: meeting.studentId,
      counselorId: opts.counselorId,
      id: { not: meeting.id },
      summary: { not: null },
    },
    orderBy: { scheduledAt: "desc" },
  });

  const { summary, usage } = await generateMeetingSummary({
    student: meeting.student,
    meetingType: meeting.type,
    rawNotes: opts.rawNotes,
    previousMeetingSummary: prevMeeting?.summary || null,
  });

  const aiOutput = await createAIOutput({
    counselorId: opts.counselorId,
    studentId: meeting.studentId,
    feature: "meeting_summary",
    sourceBasis: [
      {
        type: "meeting",
        id: meeting.id,
        label: opts.sourceLabel
          ? `${opts.sourceLabel} — ${meeting.type}`
          : `Meeting notes (${meeting.type})`,
      },
      {
        type: "profile",
        id: meeting.studentId,
        label: `${meeting.student.firstName} ${meeting.student.lastName}`,
      },
    ],
    confidence: "HIGH",
    output: summary,
    modelId: MODEL,
    tokenUsage: usage,
  });

  // Persist tasks, meeting update, and optional communication draft
  // atomically. If the meeting was deleted while the AI was running,
  // the transaction verifies it still exists before writing.
  const taskData = summary.actionItems.map((item) => ({
    studentId: meeting.studentId,
    title: item.title,
    description: item.notes || undefined,
    priority: item.priority.toUpperCase() as "LOW" | "MEDIUM" | "HIGH" | "URGENT",
    source: "AI_EXTRACTED" as const,
    dueDate: item.dueDate ? new Date(item.dueDate) : undefined,
    createdById: opts.counselorId,
    aiOutputId: aiOutput.id,
  }));

  const result = await prisma.$transaction(async (tx) => {
    // Re-verify the meeting still exists before persisting anything
    const current = await tx.meeting.findFirst({
      where: { id: opts.meetingId, counselorId: opts.counselorId },
      select: { id: true },
    });
    if (!current) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Meeting was deleted while processing notes",
      });
    }

    const createdTasks = taskData.length
      ? await tx.task.createMany({ data: taskData })
      : { count: 0 };

    await tx.meeting.update({
      where: { id: opts.meetingId },
      data: {
        rawNotes: opts.rawNotes,
        summary: summary.summary,
        summaryAiId: aiOutput.id,
        actionItems: JSON.parse(JSON.stringify(summary.actionItems)),
        decisions: JSON.parse(JSON.stringify(summary.keyDecisions)),
      },
    });

    // Create a Communication draft from the AI's follow-up email suggestion,
    // and queue it for counselor review.
    let communicationDraftId: string | null = null;
    let reviewQueueItemId: string | null = null;

    if (summary.followUpDraft?.body?.trim()) {
      const draft = await tx.communication.create({
        data: {
          counselorId: opts.counselorId,
          studentId: meeting.studentId,
          type: "EMAIL",
          direction: "OUTBOUND",
          subject: summary.followUpDraft.subject || `Follow-up: ${meeting.type}`,
          body: summary.followUpDraft.body,
          isDraft: true,
          draftAiId: aiOutput.id,
        },
      });
      communicationDraftId = draft.id;

      const queueItem = await tx.reviewQueueItem.create({
        data: {
          counselorId: opts.counselorId,
          entityType: "communication_draft",
          entityId: draft.id,
          aiOutputId: aiOutput.id,
          title: `Follow-up email · ${meeting.student.firstName} ${meeting.student.lastName}`,
          summary: draft.subject,
        },
      });
      reviewQueueItemId = queueItem.id;
    }

    return {
      tasksCreated: createdTasks.count,
      communicationDraftId,
      reviewQueueItemId,
    };
  });

  return {
    tasksCreated: result.tasksCreated,
    aiOutputId: aiOutput.id,
    communicationDraftId: result.communicationDraftId,
    reviewQueueItemId: result.reviewQueueItemId,
  };
}
