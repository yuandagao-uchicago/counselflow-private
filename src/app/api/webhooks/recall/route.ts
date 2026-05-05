import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getRecallBot,
  getRecallBotTranscriptWithRetry,
  latestBotStatus,
} from "@/lib/integrations/recall";
import { processMeetingNotes } from "@/server/lib/process-meeting-notes";
import { checkRateLimit, webhookRateLimit } from "@/lib/rate-limit";
import crypto from "crypto";

/**
 * Verify Recall.ai webhook signature using HMAC-SHA256.
 * If RECALL_WEBHOOK_SECRET is not set, verification is skipped (dev only).
 */
function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null
): boolean {
  const secret = process.env.RECALL_WEBHOOK_SECRET;
  if (!secret) {
    // In development without a secret configured, allow all requests
    // but log a warning.
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[recall-webhook] RECALL_WEBHOOK_SECRET is not set in production — rejecting request"
      );
      return false;
    }
    return true;
  }
  if (!signatureHeader) return false;

  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(rawBody);
  const expectedSignature = hmac.digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signatureHeader),
    Buffer.from(expectedSignature)
  );
}

/**
 * Recall.ai webhook receiver. Events we care about:
 *   - bot.status_change (status = call_ended / done / fatal)
 *   - transcript.done (indicates transcript is ready to fetch)
 *
 * Payload format (simplified):
 *   { event: "bot.status_change", data: { bot: { id, metadata, ... }, ... } }
 */
export async function POST(req: NextRequest) {
  // Rate limiting by IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  const rateLimitResult = await checkRateLimit(webhookRateLimit, `webhook:recall:${ip}`);
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const rawBody = await req.text();

  // Verify webhook signature
  const signature = req.headers.get("x-recall-signature") ?? req.headers.get("x-webhook-signature");
  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: {
    event?: string;
    data?: { bot?: { id: string; metadata?: Record<string, string> } };
  };
  try {
    body = JSON.parse(rawBody);
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
    const transcript = await getRecallBotTranscriptWithRetry(botId);
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
    // Never expose internal error details to external callers
    return NextResponse.json(
      { error: "Internal processing error" },
      { status: 500 }
    );
  }
}
