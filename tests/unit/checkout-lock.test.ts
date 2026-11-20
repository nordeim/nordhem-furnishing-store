import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Session-005 H-2 pin: placeOrder must lock the session's cart rows at the head of the
 * checkout transaction (SELECT … FOR UPDATE). Without the lock, two concurrent
 * same-session checkouts both read non-empty lines under READ COMMITTED and place TWO
 * orders. Text-assertion style (same as seo-routes) — the suite tests pure seams, no DB.
 */
const SHOPPING_SRC = readFileSync("src/lib/shopping.ts", "utf8");

describe("checkout transaction concurrency (src/lib/shopping.ts)", () => {
  it("locks the session's cart rows inside the transaction (FOR UPDATE)", () => {
    expect(SHOPPING_SRC, "placeOrder must SELECT the cart lines with .for('update')").toMatch(
      /\.for\(\s*"update"\s*\)/,
    );
  });

  it("still re-reads prices inside the transaction (server is the price authority)", () => {
    expect(SHOPPING_SRC).toContain("db.transaction");
    expect(SHOPPING_SRC).toContain("computeTotals");
  });
});
