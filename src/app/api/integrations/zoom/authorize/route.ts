import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { buildZoomAuthUrl } from "@/lib/integrations/zoom";
import crypto from "crypto";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.redirect(new URL("/sign-in", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));

  if (!process.env.ZOOM_CLIENT_ID || !process.env.ZOOM_CLIENT_SECRET) {
    return NextResponse.json(
      { error: "Zoom is not configured. Set ZOOM_CLIENT_ID and ZOOM_CLIENT_SECRET in .env." },
      { status: 500 }
    );
  }

  // CSRF-safe state token; tied to the Clerk user
  const state = crypto.randomBytes(24).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set("zoom_oauth_state", `${userId}:${state}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return NextResponse.redirect(buildZoomAuthUrl(state));
}
