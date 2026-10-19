/**
 * Minimal fixed-window rate limiter.
 *
 * In-memory by default (fine for a single instance / demo). For production
 * multi-instance deployments, swap the `store` implementation for Upstash
 * Redis (env vars are already scaffolded in .env.example) — the interface
 * below is intentionally storage-agnostic so that swap is a one-file change.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, Bucket>();

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

export async function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): Promise<RateLimitResult> {
  const now = Date.now();
  const existing = memoryStore.get(key);

  if (!existing || existing.resetAt < now) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (existing.count >= limit) {
    return { success: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { success: true, remaining: limit - existing.count, resetAt: existing.resetAt };
}

// Periodically sweep expired buckets so memory doesn't grow unbounded.
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of memoryStore.entries()) {
      if (bucket.resetAt < now) memoryStore.delete(key);
    }
  }, 60_000).unref?.();
}
