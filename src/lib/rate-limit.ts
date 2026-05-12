import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate limiter for public endpoints (magic-link RSVP, webhook).
 * Falls back to a no-op if Upstash is not configured (dev/CI).
 */
function createRateLimiter(
  tokens: number,
  windowSeconds: number
): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    return null;
  }
  return new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(tokens, `${windowSeconds} s`),
    analytics: true,
  });
}

/** Public endpoints: 10 requests per 60 seconds per IP */
export const publicRateLimit = createRateLimiter(10, 60);

/** AI-intensive operations: 5 requests per 60 seconds per user */
export const aiRateLimit = createRateLimiter(5, 60);

/** Webhook endpoints: 30 requests per 60 seconds per IP */
export const webhookRateLimit = createRateLimiter(30, 60);

/**
 * Check rate limit.
 * - In production: if Upstash isn't configured, fail closed so a misconfigured
 *   deploy can't silently leave AI endpoints unthrottled (would let a single
 *   stolen session drain Gemini quota).
 * - In dev/test: gracefully degrade (no-op) so local dev doesn't need Redis.
 */
export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<{ success: boolean; remaining?: number }> {
  if (!limiter) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[rate-limit] Upstash not configured in production — failing closed. " +
          "Set UPSTASH_REDIS_REST_URL/TOKEN or KV_REST_API_URL/TOKEN."
      );
      return { success: false };
    }
    return { success: true };
  }
  const result = await limiter.limit(identifier);
  return { success: result.success, remaining: result.remaining };
}
