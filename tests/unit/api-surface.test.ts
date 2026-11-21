import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// NOTE (session-011 S11-L2): source-text tripwires in the style of checkout-lock — they
// pin declarations, not behavior. Behavior coverage for the limiter itself lives in
// rate-limit-*.test.ts; the smoke script exercises the real endpoints end-to-end.

describe("API route surface (session-011 S11-L2)", () => {
  it("GET /api/cart is rate-limited like the mutations (DEPLOYMENT table says 120/min)", () => {
    const src = readFileSync("src/app/api/cart/route.ts", "utf8");
    const getBody = src.match(/export function GET\([^)]*\)\s*\{[\s\S]*?\n\}/);
    expect(getBody, "GET handler").not.toBeNull();
    expect(getBody![0]).toContain("limiter.check");
  });
});
