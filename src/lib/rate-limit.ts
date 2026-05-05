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
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  return new Ratelimit({
    redis: Redis.fromEnv(),
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
 * Check rate limit. Returns { success: true } if allowed or if rate limiting
 * is not configured (graceful degradation for dev environments).
 */
export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<{ success: boolean; remaining?: number }> {
  if (!limiter) return { success: true };
  const result = await limiter.limit(identifier);
  return { success: result.success, remaining: result.remaining };
}
