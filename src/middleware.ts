import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

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
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
