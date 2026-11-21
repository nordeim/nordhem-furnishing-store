import { describe, expect, it } from "vitest";
import { createRateLimiter } from "@/lib/rate-limit";

/**
 * Session-009 S9-M2: once more than MAX_TRACKED_KEYS live keys existed, the old guard
 * (prune only when size > cap, deleting only expired buckets) degraded to an O(n) scan
 * on EVERY request while the map kept growing — the cap protected neither CPU nor memory
 * in exactly the flood scenario it was built for. The limiter must stay bounded: prune
 * expired entries, then evict the oldest-tracked key when still at capacity. `size()` is
 * the observability seam that makes the bound assertable.
 */
describe("rate limiter bounded eviction (session-009 S9-M2)", () => {
  // Must mirror src/lib/rate-limit.ts MAX_TRACKED_KEYS.
  const MAX_TRACKED_KEYS = 5000;

  it("memory stays bounded at MAX_TRACKED_KEYS under a live-key flood", () => {
    let t = 0;
    const limiter = createRateLimiter({ limit: 10, windowMs: 60_000, now: () => t });
    for (let i = 0; i < MAX_TRACKED_KEYS + 500; i++) {
      limiter.check(`flood-key-${i}`);
    }
    // The old code held all 5500 live buckets (nothing expired, nothing evicted); the
    // eviction path must cap the map at MAX_TRACKED_KEYS.
    expect(limiter.size()).toBe(MAX_TRACKED_KEYS);
  });

  it("an evicted key's next check starts a fresh window (documented tradeoff, never a bypass)", () => {
    let t = 0;
    const limiter = createRateLimiter({ limit: 2, windowMs: 60_000, now: () => t });
    // Exhaust flood-key-0's allowance; it is the oldest insertion, so it is the first
    // eviction victim once the cap is hit.
    limiter.check("flood-key-0");
    limiter.check("flood-key-0");
    expect(limiter.check("flood-key-0").ok).toBe(false);
    for (let i = 1; i <= MAX_TRACKED_KEYS + 10; i++) limiter.check(`other-${i}`);
    expect(limiter.size()).toBe(MAX_TRACKED_KEYS);
    // The victim mints a fresh bucket: one extra allowance for ONE evicted key is the
    // price of bounded memory. The flood keys themselves stay limited.
    expect(limiter.check("flood-key-0").ok).toBe(true);
    limiter.check("other-1");
    limiter.check("other-1");
    expect(limiter.check("other-1").ok).toBe(false);
  });

  it("normal window behavior is unchanged below the cap", () => {
    let t = 0;
    const limiter = createRateLimiter({ limit: 2, windowMs: 60_000, now: () => t });
    expect(limiter.size()).toBe(0);
    expect(limiter.check("a").ok).toBe(true);
    expect(limiter.check("a").ok).toBe(true);
    const blocked = limiter.check("a");
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterMs).toBe(60_000);
    expect(limiter.size()).toBe(1);
    // A different key has its own bucket.
    expect(limiter.check("b").ok).toBe(true);
    expect(limiter.size()).toBe(2);
    // Window expiry resets the count (and prune drops the expired bucket at the cap gate).
    t = 60_001;
    expect(limiter.check("a").ok).toBe(true);
  });
});
