import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

// NOTE (declaration pin): this is a source-text tripwire, not a behavior test. The
// rem-vs-px distinction cannot be exercised in Chromium — media-query rem follows the
// browser's DEFAULT font size (a user a11y setting), which Playwright cannot emulate —
// so we pin the declaration instead: the drawer-close media query must use the same
// unit as the Tailwind v4 `lg` breakpoint (64rem). A hard-coded pixel value diverges
// from the CSS under any non-default root font size, and in the divergence band the
// S13-L2 bug (hidden-but-mounted drawer with a live scroll lock and focus trap)
// recurs. The default-font-size behavior is pinned in
// tests/e2e/mobile-navigation.spec.ts (session-013 S13-L2 test).
const source = readFileSync("src/components/layout/header.tsx", "utf8");

describe("header drawer breakpoint pins (session-014 S14-L1)", () => {
  it("the drawer-close media query uses the lg breakpoint's rem unit, not a hard-coded pixel value", () => {
    expect(source).toContain('matchMedia("(min-width: 64rem)")');
    expect(source, "no matchMedia call may pin a pixel width — Tailwind v4 lg is 64rem").not.toMatch(
      /matchMedia\("[^"]*\d+px/,
    );
  });
});
