import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { checkRateLimit, publicRateLimit, aiRateLimit } from "@/lib/rate-limit";

export type Context = {
  userId: string | null;
};

export async function createContext(): Promise<Context> {
  const { userId } = await auth();
  return { userId };
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const enforceAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      ...ctx,
      counselorId: ctx.userId,
    },
  });
});

export const protectedProcedure = t.procedure.use(enforceAuth);

/**
 * Rate-limited public procedure for endpoints accessed without auth
 * (e.g. magic-link RSVP). Limits by IP address.
 */
const enforcePublicRateLimit = t.middleware(async ({ next }) => {
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  const result = await checkRateLimit(publicRateLimit, `public:${ip}`);
  if (!result.success) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Too many requests. Please try again later.",
    });
  }
  return next();
});

export const rateLimitedPublicProcedure = t.procedure.use(enforcePublicRateLimit);

/**
 * Rate-limited protected procedure for AI-intensive operations.
 * Limits by authenticated user ID.
 */
const enforceAiRateLimit = t.middleware(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: { ...ctx, counselorId: ctx.userId },
  });
});

const enforceAiRateLimitAfterAuth = t.middleware(async ({ ctx, next }) => {
  const result = await checkRateLimit(aiRateLimit, `ai:${ctx.userId}`);
  if (!result.success) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "AI rate limit reached. Please wait before trying again.",
    });
  }
  return next();
});

export const aiProtectedProcedure = t.procedure
  .use(enforceAiRateLimit)
  .use(enforceAiRateLimitAfterAuth);
