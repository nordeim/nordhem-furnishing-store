export interface RateLimitResult {
  ok: boolean;
  retryAfterMs: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

export const MAX_TRACKED_KEYS = 5000;

/**
 * Fixed-window in-memory limiter. Adequate for a single instance; a multi-instance deployment
 * needs a shared store (e.g. Redis) behind the same `check` signature.
 *
 * Session-009 S9-M2: the map stays bounded under a live-key flood. The old guard only pruned
 * EXPIRED buckets once size exceeded the cap — a flood of live keys therefore grew the map
 * unbounded within the window AND made every `check()` rescan it with no bound. Now the cap
 * gate prunes expired entries first, and if live keys still fill the map, the
 * oldest-tracked key (Map insertion order) is evicted — O(1) eviction, bounded memory.
 * Honest complexity (session-010 S10-L2): under a SUSTAINED flood the map sits at exactly
 * MAX_TRACKED_KEYS, so prune still scans all ≤5000 buckets per request — the guarantee is
 * a BOUNDED O(MAX_TRACKED_KEYS) prune + O(1) eviction, not O(1) per request (microseconds;
 * amortising would add complexity for no measurable win at this scale).
 * Tradeoffs: an evicted key's next check starts a fresh window (one extra allowance for
 * one key) — strictly better than an unbounded map. Session-010 S10-L1: the caller's own
 * key is never the eviction victim (that would reset a blocked client's window mid-check),
 * and window renewal refreshes insertion order so a steady consumer is not permanently the
 * oldest victim. `size()` exists so tests can pin the bound.
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
          // the map stays bounded. Never the caller's own key (S10-L1): deleting it here
          // would make its own lookup below miss and mint a fresh window — a blocked
          // client unblocking itself. When the caller's own key IS the oldest, eviction
          // is simply skipped — safe, because the caller's key is already tracked and
          // the set() below replaces it in place (the map stays at exactly MAX).
          const oldest = buckets.keys().next().value;
          if (oldest !== undefined && oldest !== key) buckets.delete(oldest);
        }
      }

      const existing = buckets.get(key);
      if (!existing || existing.resetAt <= current) {
        // Fresh window (new or expired key). Delete first so a RETURNING key also moves
        // to the back of the eviction queue (S11-I1) — Map.set on the still-present
        // expired key would preserve its ancient insertion position, making a returning
        // key the first victim under any flood despite its fresh window.
        buckets.delete(key);
        buckets.set(key, { count: 1, resetAt: current + windowMs });
        return { ok: true, retryAfterMs: 0 };
      }
      if (existing.count >= limit) {
        return { ok: false, retryAfterMs: existing.resetAt - current };
      }
      existing.count += 1;
      // Refresh insertion order (S10-L1): Map.set on an existing key keeps its ORIGINAL
      // position, so without this delete+reinsert a steadily-renewed key would stay at the
      // front of the eviction queue forever — always the first victim under any flood.
      buckets.delete(key);
      buckets.set(key, existing);
      return { ok: true, retryAfterMs: 0 };
    },
    size(): number {
      return buckets.size;
    },
  };
}
