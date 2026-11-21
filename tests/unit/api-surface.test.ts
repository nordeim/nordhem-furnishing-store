import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// NOTE (session-011 S11-L2, hardened session-012 S12-L2): source-text tripwires in the
// style of checkout-lock — they pin declarations, not behavior. Behavior coverage for
// the limiter itself lives in rate-limit-*.test.ts; the smoke script exercises the real
// endpoints end-to-end. The GET slice is bounded STRUCTURALLY (indexOf "export function
// GET" to the next "export function", not a formatting-dependent regex) so a one-line
// refactor can never make the match span into the next handler and pass vacuously.

function getHandlerSlice(routeFile: string): string {
  const src = readFileSync(routeFile, "utf8");
  const start = src.indexOf("export function GET");
  expect(start, `GET handler in ${routeFile}`).toBeGreaterThanOrEqual(0);
  const rest = src.slice(start);
  const nextExport = rest.slice(1).indexOf("export function");
  return nextExport === -1 ? rest : rest.slice(0, nextExport + 1);
}

describe("API route surface (session-011 S11-L2, session-012 S12-L1/L2)", () => {
  it("GET /api/cart is rate-limited like the mutations (DEPLOYMENT table says 120/min)", () => {
    expect(getHandlerSlice("src/app/api/cart/route.ts")).toContain("limiter.check");
  });

  it("GET /api/summary is rate-limited too (session-012 S12-L1 — it runs DB queries, it is not a probe)", () => {
    expect(getHandlerSlice("src/app/api/summary/route.ts")).toContain("limiter.check");
  });
});
