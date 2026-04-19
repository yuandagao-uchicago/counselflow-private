import { NextResponse, NextRequest } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { exchangeZoomCode, zoomGet, type ZoomUser } from "@/lib/integrations/zoom";
import { prisma } from "@/lib/prisma";

function redirectToSettings(err?: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const url = new URL(`${base}/settings`);
  if (err) url.searchParams.set("zoom_error", err);
  else url.searchParams.set("zoom_connected", "1");
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return redirectToSettings("unauthorized");

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");
  if (error) return redirectToSettings(error);
  if (!code || !state) return redirectToSettings("missing_code");

  const cookieStore = await cookies();
  const saved = cookieStore.get("zoom_oauth_state")?.value;
  cookieStore.delete("zoom_oauth_state");
  if (!saved) return redirectToSettings("state_expired");
  const [savedUserId, savedState] = saved.split(":");
  if (savedUserId !== userId || savedState !== state) {
    return redirectToSettings("state_mismatch");
  }

  try {
    const tok = await exchangeZoomCode(code);
    const expiresAt = new Date(Date.now() + tok.expires_in * 1000);

    // Persist first so the zoomGet helper can read the token
    await prisma.integration.upsert({
      where: { counselorId_provider: { counselorId: userId, provider: "zoom" } },
      create: {
        counselorId: userId,
        provider: "zoom",
        accessToken: tok.access_token,
        refreshToken: tok.refresh_token,
        expiresAt,
        scopes: tok.scope,
      },
      update: {
        accessToken: tok.access_token,
        refreshToken: tok.refresh_token,
        expiresAt,
        scopes: tok.scope,
      },
    });

    // Fetch the connected Zoom user for display
    try {
      const me = await zoomGet<ZoomUser>(userId, "/users/me");
      await prisma.integration.update({
        where: { counselorId_provider: { counselorId: userId, provider: "zoom" } },
        data: {
          providerUserId: me.id,
          accountLabel: me.email,
        },
      });
    } catch {
      // Non-fatal — user info is just for display
    }

    return redirectToSettings();
  } catch (err) {
    console.error("Zoom OAuth callback error:", err);
    return redirectToSettings(err instanceof Error ? err.message : "unknown");
  }
}
