/**
 * Recall.ai client — a single server-side API key sends bots to Zoom/Meet/Teams
 * meetings. The bot joins, records, transcribes, then fires a webhook we listen
 * for in /api/webhooks/recall.
 *
 * Docs: https://docs.recall.ai
 */

const RECALL_API_BASE = (() => {
  const region = process.env.RECALL_REGION || "us-west-2";
  return `https://${region}.recall.ai/api/v1`;
})();

function apiKey(): string {
  const k = process.env.RECALL_API_KEY;
  if (!k) throw new Error("RECALL_API_KEY is not configured");
  return k;
}

async function recallFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${RECALL_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Token ${apiKey()}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Recall.ai ${path} failed: ${res.status} ${text}`);
  }
  // 204 No Content is valid
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface RecallBot {
  id: string;
  meeting_url: string;
  status_changes: Array<{
    code: string; // "joining_call" | "in_call_recording" | "in_call_not_recording" | "call_ended" | "done" | "fatal"
    message: string | null;
    created_at: string;
  }>;
  recording?: {
    id: string;
    started_at: string | null;
    completed_at: string | null;
  };
  metadata?: Record<string, string>;
}

/**
 * Create a bot that will join the given meeting URL.
 * `metadata` gets echoed back on webhooks so we can match to our meeting.
 */
export async function createRecallBot(params: {
  meetingUrl: string;
  botName?: string;
  joinAt?: Date; // if omitted, joins immediately
  metadata: { meetingId: string; counselorId: string };
}): Promise<RecallBot> {
  const webhookUrl = `${
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  }/api/webhooks/recall`;

  const body: Record<string, unknown> = {
    meeting_url: params.meetingUrl,
    bot_name: params.botName || "CounselFlow Notetaker",
    // Ask Recall to produce a transcript via their managed provider
    transcription_options: { provider: "meeting_captions" },
    // Echo metadata back on all webhooks
    metadata: params.metadata,
    // Subscribe to the events we care about
    webhook_url: webhookUrl,
  };
  if (params.joinAt) {
    body.join_at = params.joinAt.toISOString();
  }

  return recallFetch<RecallBot>("/bot/", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getRecallBot(botId: string): Promise<RecallBot> {
  return recallFetch<RecallBot>(`/bot/${botId}/`);
}

/**
 * Fetch the bot's transcript with retry. Recall.ai processes transcripts
 * asynchronously — even after the bot reaches a terminal status, the
 * transcript may not be available for several seconds.
 */
export async function getRecallBotTranscriptWithRetry(
  botId: string,
  { maxAttempts = 3, delayMs = 3000 } = {},
): Promise<string> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const text = await getRecallBotTranscript(botId);
    if (text.length >= 10) return text;
    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, delayMs * attempt));
    }
  }
  return ""; // Still empty after retries — caller decides what to do
}

/**
 * Fetch the bot's transcript as an array of { speaker, text, start, end } entries,
 * then flatten into a single plain-text string we can feed to the AI summary pipeline.
 */
export async function getRecallBotTranscript(botId: string): Promise<string> {
  interface TranscriptWord {
    text: string;
    start_timestamp: { relative: number };
  }
  interface TranscriptEntry {
    speaker?: string;
    words: TranscriptWord[];
  }

  const entries = await recallFetch<TranscriptEntry[]>(
    `/bot/${botId}/transcript/`
  );

  const lines: string[] = [];
  let lastSpeaker: string | null = null;
  for (const entry of entries) {
    const text = entry.words.map((w) => w.text).join(" ").trim();
    if (!text) continue;
    const speaker = entry.speaker || null;
    if (speaker && speaker !== lastSpeaker) {
      lines.push(`${speaker}: ${text}`);
      lastSpeaker = speaker;
    } else {
      lines.push(text);
    }
  }
  return lines.join("\n");
}

/**
 * Reduce raw `status_changes` into the latest high-level status we display.
 */
export function latestBotStatus(bot: RecallBot): string {
  if (!bot.status_changes.length) return "scheduled";
  const last = bot.status_changes[bot.status_changes.length - 1];
  return last.code;
}
