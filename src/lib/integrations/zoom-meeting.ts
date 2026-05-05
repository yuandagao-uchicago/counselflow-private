/**
 * Zoom create-meeting helper.
 *
 * Uses the counselor's stored OAuth tokens (from `Integration` table) and
 * Zoom's `POST /users/me/meetings` endpoint to mint a scheduled meeting.
 *
 * Returns just what the rest of the app needs: the join URL and the Zoom
 * meeting id (which we store as `externalRecordingId` so cloud-recording
 * webhooks can be matched back later).
 *
 * No-ops gracefully if the counselor has not connected Zoom yet — we still
 * confirm the meeting in our DB and email the student; the counselor can
 * paste a link manually or connect Zoom later.
 */
import { getValidZoomAccessToken } from "./zoom";
import { prisma } from "@/lib/prisma";

const ZOOM_API_BASE = "https://api.zoom.us/v2";

export type CreatedZoomMeeting = {
  id: string;
  joinUrl: string;
  startUrl: string;
  password?: string;
};

export async function createZoomMeeting(args: {
  counselorId: string;
  topic: string;
  startAt: Date;
  durationMins: number;
  timezone: string;
  agenda?: string;
}): Promise<CreatedZoomMeeting | null> {
  // No Zoom connected? Skip silently (caller falls back to no meeting URL).
  const integration = await prisma.integration.findUnique({
    where: { counselorId_provider: { counselorId: args.counselorId, provider: "zoom" } },
  });
  if (!integration) return null;

  const token = await getValidZoomAccessToken(args.counselorId);

  const body = {
    topic: args.topic,
    type: 2, // 2 = scheduled meeting (one-off)
    start_time: args.startAt.toISOString(),
    duration: args.durationMins,
    timezone: args.timezone,
    agenda: args.agenda?.slice(0, 2000),
    settings: {
      join_before_host: true,
      waiting_room: false,
      mute_upon_entry: true,
      auto_recording: "cloud", // counselor's existing flow ingests Zoom recordings
    },
  };

  const res = await fetch(`${ZOOM_API_BASE}/users/me/meetings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    // Don't crash the scheduling flow on a Zoom hiccup — just log and let
    // the meeting confirm without a link. Counselor can attach one later.
    console.error("[zoom-meeting] create failed:", res.status, text);
    return null;
  }

  const json = (await res.json()) as {
    id: number;
    join_url: string;
    start_url: string;
    password?: string;
  };

  return {
    id: String(json.id),
    joinUrl: json.join_url,
    startUrl: json.start_url,
    password: json.password,
  };
}
