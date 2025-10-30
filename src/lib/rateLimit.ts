// Simple in-memory rate limiter
// For production, consider Redis or a proper rate limiting service

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const sessions = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of sessions.entries()) {
    if (now > value.resetAt) {
      sessions.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Check if a session/IP is within rate limits
 * @param identifier - session_id or IP address
 * @param limit - Maximum requests allowed per window
 * @param windowMs - Time window in milliseconds (default: 1 minute)
 * @returns true if allowed, false if rate limited
 */
export function checkRateLimit(
  identifier: string,
  limit: number = 10,
  windowMs: number = 60 * 1000
): boolean {
  const now = Date.now();
  const entry = sessions.get(identifier);

  // No entry or expired - create new
  if (!entry || now > entry.resetAt) {
    sessions.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });
    return true;
  }

  // Within window - check limit
  if (entry.count >= limit) {
    return false; // Rate limited
  }

  // Increment counter
  entry.count++;
  sessions.set(identifier, entry);
  return true;
}

/**
 * Get remaining requests for an identifier
 */
export function getRemainingRequests(
  identifier: string,
  limit: number = 10
): number {
  const entry = sessions.get(identifier);
  if (!entry || Date.now() > entry.resetAt) {
    return limit;
  }
  return Math.max(0, limit - entry.count);
}

