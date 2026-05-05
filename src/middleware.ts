import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { SECURITY_HEADERS } from "@/lib/security-headers";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/trpc(.*)",
  // Webhooks are called by third-party services (Recall.ai, Zoom event
  // notifications) — must be reachable without a logged-in session.
  "/api/webhooks(.*)",
  // Vercel Blob's upload-completed callback hits this route from Vercel
  // infra, not from the signed-in browser. The route validates its own
  // authenticity via a signature on the body.
  "/api/blob/upload",
  // Public meeting-RSVP page — accessed by students via emailed magic link.
  // Auth is enforced inside the public router by token verification.
  "/respond(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }

  // Apply security headers to all responses
  const response = NextResponse.next();
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
