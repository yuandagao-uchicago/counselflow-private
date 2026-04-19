import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getRecallBot,
  getRecallBotTranscript,
  latestBotStatus,
} from "@/lib/integrations/recall";
import { processMeetingNotes } from "@/server/lib/process-meeting-notes";

/**
 * Recall.ai webhook receiver. Events we care about:
 *   - bot.status_change (status = call_ended / done / fatal)
 *   - transcript.done (indicates transcript is ready to fetch)
 *
 * Payload format (simplified):
 *   { event: "bot.status_change", data: { bot: { id, metadata, ... }, ... } }
 */
export async function POST(req: NextRequest) {
  let body: {
    event?: string;
    data?: { bot?: { id: string; metadata?: Record<string, string> } };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const botId = body.data?.bot?.id;
  const metadata = body.data?.bot?.metadata;
  if (!botId || !metadata?.meetingId || !metadata?.counselorId) {
    // Not one of our bots — acknowledge and ignore
    return NextResponse.json({ ok: true, ignored: true });
  }

  const meeting = await prisma.meeting.findFirst({
    where: {
      id: metadata.meetingId,
      counselorId: metadata.counselorId,
      recallBotId: botId,
    },
  });
  if (!meeting) {
    return NextResponse.json({ ok: true, ignored: "meeting_not_found" });
  }

  try {
    // Pull fresh bot state
    const bot = await getRecallBot(botId);
    const status = latestBotStatus(bot);

    await prisma.meeting.update({
      where: { id: meeting.id },
      data: { recallBotStatus: status },
    });

    // Only process transcript once the call has finished and we don't already have a summary
    const isTerminal = ["done", "call_ended", "fatal"].includes(status);
    if (!isTerminal || meeting.summary) {
      return NextResponse.json({ ok: true, status });
    }

    // Fetch transcript and run AI summary pipeline
    const transcript = await getRecallBotTranscript(botId);
    if (transcript.length < 10) {
      return NextResponse.json({ ok: true, status, note: "empty_transcript" });
    }

    await processMeetingNotes({
      meetingId: meeting.id,
      counselorId: meeting.counselorId,
      rawNotes: transcript,
      sourceLabel: "Recall.ai bot",
    });

    return NextResponse.json({ ok: true, processed: true });
  } catch (err) {
    console.error("Recall webhook error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}
