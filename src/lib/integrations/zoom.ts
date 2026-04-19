import { prisma } from "@/lib/prisma";

const ZOOM_AUTH_URL = "https://zoom.us/oauth/authorize";
const ZOOM_TOKEN_URL = "https://zoom.us/oauth/token";
const ZOOM_API_BASE = "https://api.zoom.us/v2";

function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`${key} is not configured`);
  return v;
}

export function getZoomRedirectUri(): string {
  return (
    process.env.ZOOM_REDIRECT_URI ||
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/integrations/zoom/callback`
  );
}

export function buildZoomAuthUrl(state: string): string {
  const clientId = requireEnv("ZOOM_CLIENT_ID");
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: getZoomRedirectUri(),
    state,
  });
  return `${ZOOM_AUTH_URL}?${params.toString()}`;
}

interface ZoomTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

function basicAuthHeader(): string {
  const clientId = requireEnv("ZOOM_CLIENT_ID");
  const clientSecret = requireEnv("ZOOM_CLIENT_SECRET");
  return "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
}

export async function exchangeZoomCode(code: string): Promise<ZoomTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: getZoomRedirectUri(),
  });
  const res = await fetch(ZOOM_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Zoom token exchange failed: ${res.status} ${text}`);
  }
  return res.json();
}

export async function refreshZoomToken(refreshToken: string): Promise<ZoomTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const res = await fetch(ZOOM_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Zoom token refresh failed: ${res.status} ${text}`);
  }
  return res.json();
}

/**
 * Returns a valid access token for the counselor's Zoom integration,
 * refreshing it in-place if expired.
 */
export async function getValidZoomAccessToken(counselorId: string): Promise<string> {
  const integration = await prisma.integration.findUnique({
    where: { counselorId_provider: { counselorId, provider: "zoom" } },
  });
  if (!integration) throw new Error("Zoom is not connected");
  if (!integration.refreshToken) throw new Error("No refresh token available");

  const isExpired =
    !integration.expiresAt || integration.expiresAt.getTime() - 60_000 < Date.now();

  if (!isExpired) return integration.accessToken;

  const refreshed = await refreshZoomToken(integration.refreshToken);
  await prisma.integration.update({
    where: { id: integration.id },
    data: {
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token,
      expiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
      scopes: refreshed.scope,
    },
  });
  return refreshed.access_token;
}

export async function zoomGet<T>(
  counselorId: string,
  path: string,
  query?: Record<string, string | number | undefined>
): Promise<T> {
  const token = await getValidZoomAccessToken(counselorId);
  const url = new URL(`${ZOOM_API_BASE}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Zoom API ${path} failed: ${res.status} ${text}`);
  }
  return res.json();
}

/**
 * Fetches a transcript file (VTT) from Zoom cloud storage.
 * Zoom download URLs require a `?access_token=...` query param OR Bearer header.
 */
export async function fetchZoomTranscript(counselorId: string, downloadUrl: string): Promise<string> {
  const token = await getValidZoomAccessToken(counselorId);
  const res = await fetch(downloadUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Zoom transcript download failed: ${res.status} ${text}`);
  }
  return res.text();
}

// ----- Zoom API response types -----

export interface ZoomUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  account_id: string;
}

export interface ZoomRecordingFile {
  id: string;
  meeting_id: string;
  recording_start: string;
  recording_end: string;
  file_type: string; // "TRANSCRIPT" | "MP4" | "M4A" | "CHAT" | ...
  file_extension: string;
  file_size: number;
  download_url: string;
  status: string;
}

export interface ZoomRecording {
  uuid: string;
  id: number;
  account_id: string;
  host_id: string;
  topic: string;
  type: number;
  start_time: string;
  duration: number;
  total_size: number;
  recording_count: number;
  share_url: string;
  recording_files: ZoomRecordingFile[];
}

export interface ZoomRecordingsList {
  from: string;
  to: string;
  page_count: number;
  page_size: number;
  total_records: number;
  next_page_token: string;
  meetings: ZoomRecording[];
}
