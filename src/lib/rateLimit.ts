import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

/**
 * Check if a session/IP is within rate limits using Upstash Redis
 * @param identifier - session_id or IP address
 * @param limit - Maximum requests allowed per window
 * @param windowMs - Time window in milliseconds (default: 1 minute)
 * @returns true if allowed, false if rate limited
 */
export async function checkRateLimit(
  identifier: string,
  limit: number = 10,
  windowMs: number = 60 * 1000
): Promise<boolean> {
  // Convert windowMs to seconds for Ratelimit
  const windowSeconds = Math.floor(windowMs / 1000);
  
  // Create a custom limiter for this specific limit/window
  const customLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
    analytics: true,
  });

  const { success } = await customLimiter.limit(identifier);
  return success;
}

/**
 * Get remaining requests for an identifier
 */
export async function getRemainingRequests(
  identifier: string,
  limit: number = 10
): Promise<number> {
  const windowSeconds = 60; // 1 minute default
  const customLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
    analytics: true,
  });
  
  const result = await customLimiter.limit(identifier);
  return result.remaining;
}

