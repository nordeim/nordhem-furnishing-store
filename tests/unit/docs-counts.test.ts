import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Session-007 M-3 pin: live-tense count claims in the root docs must stay in lockstep with
 * the suites. The counts drifted twice (sessions 005 and 006 updated AGENTS+SKILL but missed
 * README/CLAUDE/PAD). This file makes the drift a RED test instead of a manual sweep.
 * Update the constants when a suite grows — the failures name the exact doc + line.
 * Session-008 M-4: scope extended — SKILL + DEPLOYMENT joined the census, and the sitemap /
 * category counts are pinned too (both drifted in session 007: "276 locs", "23 categories").
 */
const UNIT_TESTS = 115;
const UNIT_FILES = 19;
const E2E_TESTS = 55;
const E2E_SPECS = 5;
const SMOKE_CHECKS = 26;
// Session-016 S16-L1: the per-spec pin note in PAD's §3 ("mobile-navigation.spec.ts (N tests)")
// — a stale 8 sat there through session-015's sweep because no regex covered the shape.
const MOBILE_NAV_E2E = 10;
const TABLES = 7;
const SITEMAP_URLS = 274;
const CATEGORIES = 22;

// Session-017 S17-03: this was Array<[string, RegExp[]]> but the consumer only ever read the
// doc name — the per-doc regexes were dead code implying coverage the sweep did not provide
// (two of them were exactly the shapes S17-02 found unpinned). All shapes now live in the
// shared stale-pattern sweep below; per-doc canonical forms stay in the per-doc `it` blocks.
const DOCS = [
  "README.md",
  "AGENTS.md",
  "CLAUDE.md",
  "Project_Architecture_Document.md",
  "docs/DEPLOYMENT.md",
];

function read(doc: string): string {
  return readFileSync(doc, "utf8");
}

describe("docs stay in lockstep with the suites (session-007 M-3)", () => {
  it("DEPLOYMENT cites the current gate counts (session-013 S13-M2)", () => {
    // §10's verification checklist is operator-facing — stale counts there (they sat at
    // the session-008 figures for five sessions) mislead exactly the person running the
    // gate. DEPLOYMENT is now inside the census so it cannot drift again.
    const s = read("docs/DEPLOYMENT.md");
    const unit = s.match(/Vitest: (\d+) unit tests, (\d+) files/);
    expect(unit, "DEPLOYMENT §10 must state the unit-test and file counts").not.toBeNull();
    expect(Number(unit![1])).toBe(UNIT_TESTS);
    expect(Number(unit![2])).toBe(UNIT_FILES);
    const e2e = s.match(/(\d+) e2e against the production build/);
    expect(e2e, "DEPLOYMENT §10 must state the e2e count").not.toBeNull();
    expect(Number(e2e![1])).toBe(E2E_TESTS);
  });

  it("README cites the current unit/e2e counts", () => {
    const s = read("README.md");
    const unit = s.match(/\b(\d+)\s+unit\b/i) ?? s.match(/unit tests \(Vitest, (\d+)\)/i);
    expect(unit, "README must state the unit-test count").not.toBeNull();
    expect(Number(unit![1])).toBe(UNIT_TESTS);
    const e2e = s.match(/\b(\d+)\s+e2e\b/i) ?? s.match(/E2E \(Playwright, (\d+)\)/);
    expect(e2e, "README must state the e2e count").not.toBeNull();
    expect(Number(e2e![1])).toBe(E2E_TESTS);
  });

  it("AGENTS cites the current counts (unit tests+files, e2e, smoke)", () => {
    const s = read("AGENTS.md");
    const m = s.match(/Vitest unit suite \((\d+) tests, (\d+) files\)/);
    expect(m, "AGENTS Vitest row").not.toBeNull();
    expect(Number(m![1])).toBe(UNIT_TESTS);
    expect(Number(m![2])).toBe(UNIT_FILES);
    const e2e = s.match(/Playwright \((\d+) tests\)/);
    expect(e2e, "AGENTS Playwright row").not.toBeNull();
    expect(Number(e2e![1])).toBe(E2E_TESTS);
    const smoke = s.match(/\((\d+)-check HTTP smoke/) ?? s.match(/(\d+)-check HTTP smoke/);
    expect(smoke, "AGENTS smoke row").not.toBeNull();
    expect(Number(smoke![1])).toBe(SMOKE_CHECKS);
  });

  it("CLAUDE cites the current counts", () => {
    const s = read("CLAUDE.md");
    const unit = s.match(/Vitest \((\d+) unit tests?\)/);
    expect(unit, "CLAUDE unit count").not.toBeNull();
    expect(Number(unit![1])).toBe(UNIT_TESTS);
    const e2e = s.match(/Playwright, (\d+) tests\)/);
    expect(e2e, "CLAUDE e2e count").not.toBeNull();
    expect(Number(e2e![1])).toBe(E2E_TESTS);
  });

  it("PAD cites the current counts and the true table count", () => {
    const s = read("Project_Architecture_Document.md");
    const unit = s.match(/\| Unit \| (\d+) tests \/ (\d+) files? \|/);
    expect(unit, "PAD unit row").not.toBeNull();
    expect(Number(unit![1])).toBe(UNIT_TESTS);
    expect(Number(unit![2])).toBe(UNIT_FILES);
    const tables = s.match(/(\d+)-table Drizzle schema/);
    expect(tables, "PAD table count").not.toBeNull();
    expect(Number(tables![1])).toBe(TABLES);
  });

  it("no stale count patterns survive anywhere in the five docs", () => {
    const stale: string[] = [];
    for (const doc of DOCS) {
      const s = read(doc);
      // Any "N unit tests / N files" or "N e2e" pattern that disagrees with the constants.
      for (const m of s.matchAll(/\b(\d+)\s+(?:unit|e2e)\s+tests?/gi)) {
        const n = Number(m[1]);
        if (n !== UNIT_TESTS && n !== E2E_TESTS) stale.push(`${doc}: ${m[0]}`);
      }
      for (const m of s.matchAll(/\bUnit \(Vitest, (\d+) tests\)/g)) {
        if (Number(m[1]) !== UNIT_TESTS) stale.push(`${doc}: ${m[0]}`);
      }
      // Session-016 S16-L1: four live-tense shapes the canonical sweep could not see —
      // the CLAUDE command-table row, PAD's tree comments, PAD's per-spec pin note, and
      // the smoke.sh checks line. Each shape sat stale through an entire "counts swept"
      // commit because no regex covered it; each is now pinned to its constant.
      for (const m of s.matchAll(/\((\d+) tests?, build first\)/g)) {
        if (Number(m[1]) !== E2E_TESTS) stale.push(`${doc}: ${m[0]}`);
      }
      for (const m of s.matchAll(/# (\d+) files \/ (\d+) tests/g)) {
        if (Number(m[1]) !== UNIT_FILES || Number(m[2]) !== UNIT_TESTS) stale.push(`${doc}: ${m[0]}`);
      }
      for (const m of s.matchAll(/smoke\.sh \((\d+) checks\)/g)) {
        if (Number(m[1]) !== SMOKE_CHECKS) stale.push(`${doc}: ${m[0]}`);
      }
      for (const m of s.matchAll(/spec\.ts`? \((\d+) tests\)/g)) {
        if (Number(m[1]) !== MOBILE_NAV_E2E) stale.push(`${doc}: ${m[0]}`);
      }
      // Session-017 S17-02: eight more live-tense shapes the sweep could not see — the
      // README testing-table rows (one of them, "E2E (Chromium, 53 tests)", had sat STALE
      // since session-015's 53→55 e2e growth), the README overview "N smoke checks" line,
      // CLAUDE's E2E/Smoke strategy rows, PAD's §3 e2e tree row, PAD's §7 tier table, and
      // PAD's §11/AGENTS "-check HTTP …" key-file rows. Each is now pinned to its constant.
      for (const m of s.matchAll(/\((\d+) tests?, (\d+) files?\)/g)) {
        if (Number(m[1]) !== UNIT_TESTS || Number(m[2]) !== UNIT_FILES) stale.push(`${doc}: ${m[0]}`);
      }
      for (const m of s.matchAll(/E2E \((?:Playwright|Chromium), (\d+) tests?\)/g)) {
        if (Number(m[1]) !== E2E_TESTS) stale.push(`${doc}: ${m[0]}`);
      }
      for (const m of s.matchAll(/^tests\/e2e\/[^\n]*\((\d+) tests\)/gm)) {
        if (Number(m[1]) !== E2E_TESTS) stale.push(`${doc}: ${m[0]}`);
      }
      for (const m of s.matchAll(/\| E2E \| (\d+) tests \/ (\d+) specs \|/g)) {
        if (Number(m[1]) !== E2E_TESTS || Number(m[2]) !== E2E_SPECS) stale.push(`${doc}: ${m[0]}`);
      }
      for (const m of s.matchAll(/\| Smoke \| (\d+) checks \|/g)) {
        if (Number(m[1]) !== SMOKE_CHECKS) stale.push(`${doc}: ${m[0]}`);
      }
      for (const m of s.matchAll(/Smoke \((\d+) checks?\)/g)) {
        if (Number(m[1]) !== SMOKE_CHECKS) stale.push(`${doc}: ${m[0]}`);
      }
      for (const m of s.matchAll(/(\d+) smoke checks/g)) {
        if (Number(m[1]) !== SMOKE_CHECKS) stale.push(`${doc}: ${m[0]}`);
      }
      for (const m of s.matchAll(/(\d+)-check HTTP (?:contract|smoke)/g)) {
        if (Number(m[1]) !== SMOKE_CHECKS) stale.push(`${doc}: ${m[0]}`);
      }
      // The README shields.io badges are count claims too (they sat unpinned through
      // the same sweeps as the prose lines).
      for (const m of s.matchAll(/Vitest-(\d+)_passing/g)) {
        if (Number(m[1]) !== UNIT_TESTS) stale.push(`${doc}: ${m[0]}`);
      }
      for (const m of s.matchAll(/Playwright-(\d+)_passing/g)) {
        if (Number(m[1]) !== E2E_TESTS) stale.push(`${doc}: ${m[0]}`);
      }
    }
    expect(stale, `stale counts: ${stale.join("; ")}`).toEqual([]);
  });

  it("SKILL.md state line cites the current counts (session-008 M-4)", () => {
    const s = read("nordhem-furnishing-store_SKILL.md");
    const state = s.match(/\*\*Project state \(session \d+\): ([^*]+)\*\*/);
    expect(state, "SKILL state line").not.toBeNull();
    const unit = state![1].match(/(\d+) unit tests/);
    expect(unit, "SKILL unit count").not.toBeNull();
    expect(Number(unit![1])).toBe(UNIT_TESTS);
    const e2e = state![1].match(/(\d+) e2e/);
    expect(e2e, "SKILL e2e count").not.toBeNull();
    expect(Number(e2e![1])).toBe(E2E_TESTS);
    const sitemap = state![1].match(/sitemap (\d+) locs/);
    expect(sitemap, "SKILL sitemap count").not.toBeNull();
    expect(Number(sitemap![1])).toBe(SITEMAP_URLS);
  });

  it("docs cite the current sitemap and category counts (session-008 M-4)", () => {
    // README: the SEO row carries both.
    const r = read("README.md");
    const rSitemap = r.match(/\+ (\d+) categories\/collections \+ all \d+ products = (\d+) URLs/);
    expect(rSitemap, "README sitemap arithmetic row").not.toBeNull();
    expect(Number(rSitemap![1])).toBe(CATEGORIES);
    expect(Number(rSitemap![2])).toBe(SITEMAP_URLS);
    // No live-tense "276" or "23 categories" survives anywhere in README.
    expect(r.match(/\b276\b/g) ?? [], "README must not cite 276").toEqual([]);
    const rSeed = r.match(/idempotent seed \((\d+) categories, (\d+) products\)/);
    expect(rSeed, "README seed claim").not.toBeNull();
    expect(Number(rSeed![1])).toBe(CATEGORIES);
    // DEPLOYMENT: seeds line + sitemap verify line.
    const d = read("docs/DEPLOYMENT.md");
    const dSeed = d.match(/seeds \*\*(\d+)\n?\s*categories\*\*/);
    expect(dSeed, "DEPLOYMENT seeds claim").not.toBeNull();
    expect(Number(dSeed![1])).toBe(CATEGORIES);
    const dSitemap = d.match(/grep -c "<url>"\s*#\s*(\d+)/);
    expect(dSitemap, "DEPLOYMENT sitemap verify line").not.toBeNull();
    expect(Number(dSitemap![1])).toBe(SITEMAP_URLS);
    // DEPLOYMENT must not describe the removed 2nd synthetic collection.
    expect(d.includes("recycled-materials-700324"), "DEPLOYMENT must not cite the removed collection").toBe(false);
  });
});
