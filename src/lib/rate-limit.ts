export interface RateLimitResult {
  ok: boolean;
  retryAfterMs: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const MAX_TRACKED_KEYS = 5000;

/**
 * Fixed-window in-memory limiter. Adequate for a single instance; a multi-instance deployment
 * needs a shared store (e.g. Redis) behind the same `check` signature.
 */
export function createRateLimiter(options: { limit: number; windowMs: number; now?: () => number }) {
  const { limit, windowMs } = options;
  const now = options.now ?? Date.now;
  const buckets = new Map<string, Bucket>();

  function prune(current: number) {
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= current) buckets.delete(key);
    }
  }

  return {
    check(key: string): RateLimitResult {
      const current = now();
      if (buckets.size > MAX_TRACKED_KEYS) prune(current);

      const existing = buckets.get(key);
      if (!existing || existing.resetAt <= current) {
        buckets.set(key, { count: 1, resetAt: current + windowMs });
        return { ok: true, retryAfterMs: 0 };
      }
      if (existing.count >= limit) {
        return { ok: false, retryAfterMs: existing.resetAt - current };
      }
      existing.count += 1;
      return { ok: true, retryAfterMs: 0 };
    },
  };
}
