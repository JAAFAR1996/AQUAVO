/**
 * Client-side rate limiting utility
 * Prevents abuse by limiting actions per time window
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Check if an action is rate limited
 * @param key - Unique identifier for the action (e.g., 'api-call', 'form-submit')
 * @param maxRequests - Maximum number of requests allowed in the time window
 * @param windowMs - Time window in milliseconds (default: 60000 = 1 minute)
 * @returns true if rate limited, false if allowed
 */
export function isRateLimited(
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // No entry or window expired - allow and create new entry
  if (!entry || now >= entry.resetTime) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return false;
  }

  // Increment count
  entry.count++;

  // Check if limit exceeded
  if (entry.count > maxRequests) {
    return true;
  }

  return false;
}

/**
 * Get remaining requests before rate limit
 */
export function getRemainingRequests(
  key: string,
  maxRequests: number = 10
): number {
  const entry = rateLimitStore.get(key);
  if (!entry || Date.now() >= entry.resetTime) {
    return maxRequests;
  }
  return Math.max(0, maxRequests - entry.count);
}

/**
 * Get time until rate limit resets (in seconds)
 */
export function getResetTime(key: string): number {
  const entry = rateLimitStore.get(key);
  if (!entry || Date.now() >= entry.resetTime) {
    return 0;
  }
  return Math.ceil((entry.resetTime - Date.now()) / 1000);
}

/**
 * Clear rate limit for a specific key
 */
export function clearRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

/**
 * Clear all rate limits (useful for testing or after successful login)
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
}

/**
 * Clean up expired entries (call periodically)
 */
export function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of Array.from(rateLimitStore.entries())) {
    if (now >= entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// Auto-cleanup every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(cleanupExpiredEntries, 5 * 60 * 1000);
}

/**
 * React hook for rate limiting
 */
export function useRateLimit(
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60000
) {
  return {
    isLimited: () => isRateLimited(key, maxRequests, windowMs),
    remaining: () => getRemainingRequests(key, maxRequests),
    resetIn: () => getResetTime(key),
    clear: () => clearRateLimit(key),
  };
}
