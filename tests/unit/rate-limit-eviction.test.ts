import { describe, expect, it } from "vitest";
import { createRateLimiter, MAX_TRACKED_KEYS } from "@/lib/rate-limit";

/**
 * Session-009 S9-M2: once more than MAX_TRACKED_KEYS live keys existed, the old guard
 * (prune only when size > cap, deleting only expired buckets) degraded to an O(n) scan
 * on EVERY request while the map kept growing — the cap protected neither CPU nor memory
 * in exactly the flood scenario it was built for. The limiter must stay bounded: prune
 * expired entries, then evict the oldest-tracked key when still at capacity. `size()` is
 * the observability seam that makes the bound assertable.
 */
describe("rate limiter bounded eviction (session-009 S9-M2)", () => {

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

  it("never evicts the caller's own key mid-check (session-010 S10-L1)", () => {
    let t = 0;
    const limiter = createRateLimiter({ limit: 2, windowMs: 60_000, now: () => t });
    // Exhaust 'a'; fill the map to exactly the cap with 4999 other live keys (no eviction
    // has fired yet — each insert entered below the cap).
    limiter.check("a");
    limiter.check("a");
    expect(limiter.check("a").ok).toBe(false);
    for (let i = 1; i < MAX_TRACKED_KEYS; i++) limiter.check(`b${i}`);
    expect(limiter.size()).toBe(MAX_TRACKED_KEYS);
    // 'a' is the oldest-tracked key AND the caller. The old code deleted it right here,
    // read its own bucket as absent and minted a fresh window — a blocked client
    // unblocking itself with one more request. It must stay blocked.
    expect(limiter.check("a").ok).toBe(false);
  });

  it("window renewal refreshes insertion order — steady consumers are not permanent eviction victims (session-010 S10-L1)", () => {
    let t = 0;
    const limiter = createRateLimiter({ limit: 5, windowMs: 60_000, now: () => t });
    // 'a' starts using its allowance, other traffic arrives, then 'a' comes back and
    // renews — the renewal (an allowed check) must move it to the BACK of the eviction
    // queue. Map.set on an existing key preserves its ORIGINAL position, so the old code
    // left 'a' at the front: first victim under any flood, window reset.
    for (let i = 0; i < 4; i++) limiter.check("a");
    for (let i = 1; i <= 4000; i++) limiter.check(`b${i}`);
    limiter.check("a"); // count 4 -> 5 (allowed: renews + reorders)
    // Fill to exactly the cap (no eviction yet), then one more key forces one eviction.
    for (let i = 4001; i <= 4999; i++) limiter.check(`b${i}`);
    limiter.check("b5000");
    expect(limiter.size()).toBe(MAX_TRACKED_KEYS);
    // 'a' was NOT the eviction victim: its bucket survived, count still at the limit.
    expect(limiter.check("a").ok).toBe(false);
    // b1 WAS the victim: its next check mints a fresh window (the documented tradeoff).
    expect(limiter.check("b1").ok).toBe(true);
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
