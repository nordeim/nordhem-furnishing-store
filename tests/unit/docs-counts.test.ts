import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { INFO_SITEMAP_ROUTES, STATIC_SITEMAP_ROUTES } from "@/app/sitemap";

/**
 * Session-007 M-3 pin: live-tense count claims in the root docs must stay in lockstep with
 * the suites. The counts drifted twice (sessions 005 and 006 updated AGENTS+SKILL but missed
 * README/CLAUDE/PAD). This file makes the drift a RED test instead of a manual sweep.
 * Update the constants when a suite grows — the failures name the exact doc + line.
 * Session-008 M-4: scope extended — SKILL + DEPLOYMENT joined the census, and the sitemap /
 * category counts are pinned too (both drifted in session 007: "276 locs", "23 categories").
 *
 * Session-018 S18-02: constants ↔ reality. The census used to compare docs to HAND-SET
 * constants — a suite growth without a constant update shipped stale docs silently (the
 * "53 through a counts-swept commit" incident, twice). Every statically-derivable constant
 * is now DERIVED from the tree at load; only the two run-derived counts stay hand-set
 * (UNIT_TESTS, E2E_TESTS — they need a suite run, not a readdir). A derived constant can
 * never drift from the tree; a doc can never drift from a derived constant.
 */
const UNIT_TESTS = 119; // run-derived: `npm test` tally — sweep every doc when this moves
const E2E_TESTS = 55; // run-derived: `npm run test:e2e` tally — sweep every doc when this moves
const E2E_SPECS = readdirSync("tests/e2e").filter((f) => f.endsWith(".spec.ts")).length;
const UNIT_FILES = readdirSync("tests/unit").filter((f) => f.endsWith(".test.ts")).length;
const SMOKE_CHECKS = readFileSync("scripts/smoke.sh", "utf8").match(/^check /gm)?.length ?? 0;
// The seed's own derivation (src/db/seed.ts): home.json nav /cat/ rows + the synthetic
// lowest-price collection; products = catalog entries whose category is in that set.
const HOME = JSON.parse(readFileSync("src/content/home.json", "utf8")) as {
  categoryNav: Array<{ href: string }>;
};
const CATALOG = JSON.parse(readFileSync("src/content/catalog.json", "utf8")) as Array<{
  category: string;
}>;
const NAV_CATEGORY_ROWS = HOME.categoryNav.filter((item) => item.href.startsWith("/cat/")).length;
const CATEGORIES = NAV_CATEGORY_ROWS + 1; // + the synthetic "lowest-price" collection
const KNOWN_CATEGORY_SLUGS = new Set([
  ...HOME.categoryNav
    .filter((item) => item.href.startsWith("/cat/"))
    .map((item) => item.href.split("/").filter(Boolean).pop() as string),
  "lowest-price",
]);
const PRODUCTS = CATALOG.filter((entry) => KNOWN_CATEGORY_SLUGS.has(entry.category)).length;
// schema.ts: one `= pgTable(` per table.
const TABLES = (readFileSync("src/db/schema.ts", "utf8").match(/= pgTable\(/g) ?? []).length;
// Session-016 S16-L1: the per-spec pin note in PAD's §3 ("mobile-navigation.spec.ts (N tests)")
// — a stale 8 sat there through session-015's sweep because no regex covered the shape.
// Session-019 S19-04 note: this counts LITERAL `test(` declarations only — accessibility.spec.ts
// generates 8 of its tests via a for-loop; if that pattern entered mobile-navigation.spec.ts
// this constant would undercount and the PAD pin would drift. Keep that spec literal-declared.
const MOBILE_NAV_E2E =
  readFileSync("tests/e2e/mobile-navigation.spec.ts", "utf8").match(/^\s*test\(/gm)?.length ?? 0;
// The sitemap's own arithmetic: static + info routes (exported by src/app/sitemap.ts —
// the same constants seo-routes.test.ts pins the degrade contract with) + every category
// and product page.
const SITEMAP_URLS = STATIC_SITEMAP_ROUTES.length + INFO_SITEMAP_ROUTES.length + CATEGORIES + PRODUCTS;
// App Router structure: pages, API route files, exported HTTP methods.
function walk(dir: string, pred: (name: string) => boolean): string[] {
  const hits: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = `${dir}/${entry.name}`;
    if (entry.isDirectory()) hits.push(...walk(full, pred));
    else if (pred(entry.name)) hits.push(full);
  }
  return hits;
}
const PAGE_ROUTES = walk("src/app", (n) => n === "page.tsx").length;
const API_ROUTE_FILES = walk("src/app/api", (n) => n === "route.ts");
const API_ROUTES = API_ROUTE_FILES.length;
const API_METHODS = API_ROUTE_FILES.reduce(
  (sum, f) =>
    sum + (readFileSync(f, "utf8").match(/export (?:async )?function (?:GET|POST|PATCH|PUT|DELETE)/g)?.length ?? 0),
  0,
);
// Per-route rate-limit literals (src/app/api/*/route.ts `createRateLimiter({ limit: N`) —
// the DEPLOYMENT §8 table is pinned against this map. /api/health has no limiter.
const RATE_LIMITS: Record<string, number> = {};
for (const f of API_ROUTE_FILES) {
  const m = readFileSync(f, "utf8").match(/createRateLimiter\(\{ limit: (\d+)/);
  if (m) RATE_LIMITS[`/api/${f.replace(/^src\/app\/api\/|\/route\.ts$/g, "")}`] = Number(m[1]);
}
// Session-019 S19-05: the build's app-path route count, tree-derived. Session-018 left
// DEPLOYMENT's claim unpinned as "build-output-derived" — but the build's route table is
// fully predictable from src/app: every page.tsx + every route.ts + the framework-generated
// routes for the five special files (not-found.tsx → /_not-found, icon.svg, manifest.ts →
// /manifest.webmanifest, robots.ts → /robots.txt, sitemap.ts → /sitemap.xml). Verified
// against the actual `next build` route table (24 = 11 + 8 + 5).
const SPECIAL_ROUTE_FILES = ["not-found.tsx", "icon.svg", "manifest.ts", "robots.ts", "sitemap.ts"].filter(
  (f) => existsSync(`src/app/${f}`),
);
const APP_PATH_ROUTES = PAGE_ROUTES + API_ROUTES + SPECIAL_ROUTE_FILES.length;

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
      // Session-018 S18-01: the residual count shapes the S17-02 generation still could not
      // see — the README quickstart/overview/db-setup/SEO-table rows, the AGENTS db:setup row
      // (the PRODUCTS count had NO constant at all until S18-02 derived it), the three "tables"
      // shapes, DEPLOYMENT's seed prose (line-wrapped bold), its structural route claims, and
      // its §8 rate-limit table (pinned in a dedicated it against the derived code literals).
      for (const m of s.matchAll(/unit tests \(Vitest, (\d+) tests?\)/g)) {
        if (Number(m[1]) !== UNIT_TESTS) stale.push(`${doc}: ${m[0]}`);
      }
      for (const m of s.matchAll(/(\d+) unit \/ (\d+) e2e \/ (\d+) smoke checks/g)) {
        if (Number(m[1]) !== UNIT_TESTS || Number(m[2]) !== E2E_TESTS || Number(m[3]) !== SMOKE_CHECKS) {
          stale.push(`${doc}: ${m[0]}`);
        }
      }
      for (const m of s.matchAll(/\((\d+) categories? \/ (\d+) products?\)/g)) {
        if (Number(m[1]) !== CATEGORIES || Number(m[2]) !== PRODUCTS) stale.push(`${doc}: ${m[0]}`);
      }
      for (const m of s.matchAll(/\((\d+) categories?, (\d+) products?\)/g)) {
        if (Number(m[1]) !== CATEGORIES || Number(m[2]) !== PRODUCTS) stale.push(`${doc}: ${m[0]}`);
      }
      for (const m of s.matchAll(/(\d+) categories\/collections \+ all (\d+) products = (\d+) URLs/g)) {
        if (Number(m[1]) !== CATEGORIES || Number(m[2]) !== PRODUCTS || Number(m[3]) !== SITEMAP_URLS) {
          stale.push(`${doc}: ${m[0]}`);
        }
      }
      for (const m of s.matchAll(/(\d+) real products/g)) {
        if (Number(m[1]) !== PRODUCTS) stale.push(`${doc}: ${m[0]}`);
      }
      for (const m of s.matchAll(/(\d+)-table Drizzle schema/g)) {
        if (Number(m[1]) !== TABLES) stale.push(`${doc}: ${m[0]}`);
      }
      for (const m of s.matchAll(/schema\.ts \((\d+) tables?\)/g)) {
        if (Number(m[1]) !== TABLES) stale.push(`${doc}: ${m[0]}`);
      }
      for (const m of s.matchAll(/\*\*(\d+) tables?\*\* —/g)) {
        if (Number(m[1]) !== TABLES) stale.push(`${doc}: ${m[0]}`);
      }
      // DEPLOYMENT's seed prose wraps mid-bold ("It seeds **22\ncategories** (21 from …") —
      // \s+ rides the line wrap; the 21+1=22 arithmetic is pinned alongside the parts.
      for (const m of s.matchAll(/seeds \*\*(\d+)\s+categories\*\* \((\d+) from [^)]*\+ (\d+) synthetic/g)) {
        if (
          Number(m[1]) !== CATEGORIES ||
          Number(m[2]) !== NAV_CATEGORY_ROWS ||
          Number(m[3]) !== 1 ||
          Number(m[2]) + Number(m[3]) !== Number(m[1])
        ) {
          stale.push(`${doc}: ${m[0]}`);
        }
      }
      for (const m of s.matchAll(/(\d+) page routes/g)) {
        if (Number(m[1]) !== PAGE_ROUTES) stale.push(`${doc}: ${m[0]}`);
      }
      for (const m of s.matchAll(/(\d+) API route files/g)) {
        if (Number(m[1]) !== API_ROUTES) stale.push(`${doc}: ${m[0]}`);
      }
      for (const m of s.matchAll(/route files\s*\((\d+) methods?\)/g)) {
        if (Number(m[1]) !== API_METHODS) stale.push(`${doc}: ${m[0]}`);
      }
      for (const m of s.matchAll(/\| `\/api\/([\w/-]+)` \|[^|]+\|\s*(\d+)\/min/g)) {
        const derived = RATE_LIMITS[`/api/${m[1]}`];
        if (derived === undefined || Number(m[2]) !== derived) stale.push(`${doc}: ${m[0]}`);
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
    // Session-018 S18-01: the state line also carries smoke + product counts — both sat
    // unpinned through every count-shape sweep (the audit's enumeration).
    const smoke = state![1].match(/(\d+) smoke checks/);
    expect(smoke, "SKILL smoke count").not.toBeNull();
    expect(Number(smoke![1])).toBe(SMOKE_CHECKS);
    // "242-product catalog" sits in the §1 prose ahead of the state line, not inside it.
    const products = s.match(/(\d+)-product catalog/);
    expect(products, "SKILL product count").not.toBeNull();
    expect(Number(products![1])).toBe(PRODUCTS);
  });

  it("SKILL section headings are unique (session-018 S18-04)", () => {
    // A byte-identical duplicated "## §16 Lessons (session 008)" block shipped in
    // session-008's own commit and survived nine sessions of doc-integrity work — the
    // census only ever read the state line. Heading uniqueness is now pinned so a
    // copy-paste section can never land again.
    const s = read("nordhem-furnishing-store_SKILL.md");
    const headings = [...s.matchAll(/^## (§\d+ .+)$/gm)].map((m) => m[1]);
    expect(headings.length, "SKILL must carry its lesson sections").toBeGreaterThan(10);
    const dupes = headings.filter((h, i) => headings.indexOf(h) !== i);
    expect(dupes, `duplicated SKILL section headings: ${dupes.join("; ")}`).toEqual([]);
  });

  it("PAD revision blocks are unique (session-019 S19-08)", () => {
    // A byte-identical duplicated "## Revision Block — v2.7.0 … (session 008)" shipped in
    // session-008's own commit and survived every doc sweep — including session-018's own
    // SKILL-dedup fix, whose unique-headings pin covers only SKILL "## §N" headings. The
    // same shape pin over the PAD's revision blocks closes the class where it actually bit.
    const s = read("Project_Architecture_Document.md");
    const blocks = [...s.matchAll(/^## (Revision Block — .+)$/gm)].map((m) => m[1]);
    expect(blocks.length, "PAD must carry its revision history").toBeGreaterThan(10);
    const dupes = blocks.filter((b, i) => blocks.indexOf(b) !== i);
    expect(dupes, `duplicated PAD revision blocks: ${dupes.join("; ")}`).toEqual([]);
  });

  it("DEPLOYMENT app-path route claim matches the tree (session-019 S19-05)", () => {
    // "The current build compiles N app-path routes" — sat stale at 25 through session-018
    // (which deferred pinning it as "build-output-derived, not unit-derivable"). The count
    // is tree-derived (see APP_PATH_ROUTES above) and now pinned both directions: a route
    // file added/removed OR a doc edit drifts this RED. The phrase wraps mid-word-pair in
    // the doc ("app-path\nroutes") — \s+ rides the wrap (the §25 lesson).
    const s = read("docs/DEPLOYMENT.md");
    const m = s.match(/compiles (\d+) app-path\s+routes/);
    expect(m, "DEPLOYMENT must state the app-path route count").not.toBeNull();
    expect(Number(m![1]), "app-path routes = pages + API + special files").toBe(APP_PATH_ROUTES);
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

  it("DEPLOYMENT §8 rate-limit table matches the code literals (session-018 S18-01)", () => {
    // The table is pinned BOTH directions against the derived per-route literals: a code
    // limit change without a table update goes RED, and a table row for a route that no
    // longer exists (or gained/lost its limiter) goes RED too.
    const s = read("docs/DEPLOYMENT.md");
    const rows = [...s.matchAll(/\| `\/api\/([\w/-]+)` \|[^|]+\|\s*(\d+)\/min/g)];
    expect(rows.length, "every limited route must appear in the table").toBe(Object.keys(RATE_LIMITS).length);
    for (const m of rows) {
      expect(Number(m[2]), `limit for /api/${m[1]}`).toBe(RATE_LIMITS[`/api/${m[1]}`]);
    }
    // /api/health is the deliberate unlimited exception — no limiter in code, "unlimited" in prose.
    expect(s).toContain("| `/api/health` | GET | unlimited");
    expect(RATE_LIMITS["/api/health"], "health must have no limiter").toBeUndefined();
  });
});
