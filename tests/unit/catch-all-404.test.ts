import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Session-006 M-3 pin: the catch-all [...slug] route must NOT serve HTTP 200 soft-404s for
 * paths that match no info-page rule. Live-verified pre-fix: /totally-unknown-page-xyz →
 * 200 + indexable title, an infinite duplicate-content surface for crawlers. The route must
 * call notFound() when no RULES prefix matches. Text-assertion style (no DB in unit tests).
 */
const PAGE_SRC = readFileSync("src/app/[...slug]/page.tsx", "utf8");
const PAGES_SRC = readFileSync("src/content/pages.ts", "utf8");

describe("catch-all route 404 discipline (src/app/[...slug]/page.tsx)", () => {
  it("exposes a helper that says whether a path matches a known info-page rule", () => {
    // pages.ts must export the rule-matching as its own predicate so the route can 404
    // ruleless paths instead of synthesizing a generic page for ANY slug.
    expect(PAGES_SRC).toMatch(/export function (isKnownInfoPath|matchesInfoRule)/);
  });

  it("the route 404s ruleless paths instead of serving a soft-200 (notFound call gated on the predicate)", () => {
    expect(PAGE_SRC, "the route must gate notFound() on the rule predicate").toMatch(
      /!isKnownInfoPath\(segments\)[\s\S]{0,400}notFound\(\)/,
    );
  });
});
