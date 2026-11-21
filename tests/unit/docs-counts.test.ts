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
const UNIT_TESTS = 112;
const UNIT_FILES = 18;
const E2E_TESTS = 53;
const SMOKE_CHECKS = 21;
const TABLES = 7;
const SITEMAP_URLS = 274;
const CATEGORIES = 22;

const DOCS: Array<[string, RegExp[]]> = [
  ["README.md", [/\b(\d+) unit tests?/i, /\b(\d+) e2e tests?/i]],
  ["AGENTS.md", [/\((\d+) tests?, (\d+) files?\)/, /Playwright \((\d+) tests\)/, /\((\d+) tests?, (\d+) files?\)/]],
  ["CLAUDE.md", [/Vitest \((\d+) unit tests?\)/, /Playwright, (\d+) tests\)/]],
  ["Project_Architecture_Document.md", [/\((\d+) tests? \/ (\d+) files?\)/, /(\d+) tests \/ \d+ specs/, /(\d+)-table Drizzle schema/]],
  ["docs/DEPLOYMENT.md", [/Vitest: (\d+) unit tests, (\d+) files/, /(\d+) e2e against the production build/]],
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
    for (const [doc] of DOCS) {
      const s = read(doc);
      // Any "N unit tests / N files" or "N e2e" pattern that disagrees with the constants.
      for (const m of s.matchAll(/\b(\d+)\s+(?:unit|e2e)\s+tests?/gi)) {
        const n = Number(m[1]);
        if (n !== UNIT_TESTS && n !== E2E_TESTS) stale.push(`${doc}: ${m[0]}`);
      }
      for (const m of s.matchAll(/\bUnit \(Vitest, (\d+) tests\)/g)) {
        if (Number(m[1]) !== UNIT_TESTS) stale.push(`${doc}: ${m[0]}`);
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
