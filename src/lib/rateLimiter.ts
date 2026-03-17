// simple client-side rate limiter to prevent spamming the backend
// tracks calls per endpoint and blocks if too many happen in a time window

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const limits: Record<string, RateLimitEntry> = {};

// default: 10 requests per 10 seconds per endpoint
const MAX_REQUESTS = 10;
const WINDOW_MS = 10_000;

export function checkRateLimit(endpoint: string): boolean {
  const now = Date.now();
  const entry = limits[endpoint];

  // if no entry or window expired, reset
  if (!entry || now > entry.resetAt) {
    limits[endpoint] = { count: 1, resetAt: now + WINDOW_MS };
    return true;
  }

  // if under the limit, allow
  if (entry.count < MAX_REQUESTS) {
    entry.count++;
    return true;
  }

  // over the limit
  return false;
}

export function getRateLimitReset(endpoint: string): number {
  const entry = limits[endpoint];
  if (!entry) return 0;
  const remaining = entry.resetAt - Date.now();
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}
