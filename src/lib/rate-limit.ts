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
 *
 * Session-009 S9-M2: the map stays bounded under a live-key flood. The old guard only pruned
 * EXPIRED buckets once size exceeded the cap — a flood of live keys therefore grew the map
 * unbounded within the window AND made every `check()` rescan it (O(n) per request). Now the
 * cap gate prunes expired entries first, and if live keys still fill the map, the
 * oldest-tracked key (Map insertion order) is evicted — O(1), bounded memory. Tradeoff: an
 * evicted key's next check starts a fresh window (one extra allowance for one key), which is
 * strictly better than an unbounded map. `size()` exists so tests can pin the bound.
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
      if (buckets.size >= MAX_TRACKED_KEYS) {
        prune(current);
        if (buckets.size >= MAX_TRACKED_KEYS) {
          // Still full of live buckets: evict the oldest-tracked key (insertion order) so
          // the map stays bounded instead of degrading to O(n) scans on every request.
          const oldest = buckets.keys().next().value;
          if (oldest !== undefined) buckets.delete(oldest);
        }
      }

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
    size(): number {
      return buckets.size;
    },
  };
}
