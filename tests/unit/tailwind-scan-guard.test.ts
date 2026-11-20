import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Tailwind v4 scans every non-excluded file under the package root for class-shaped tokens —
 * including markdown prose. The run-75 lesson (inherited from the pre-rewrite repo): a literal
 * colon-form md-prefixed aspect-ratio arbitrary token in root markdown compiled to invalid
 * `aspect-ratio` CSS and broke the production build behind a warm Turbopack cache.
 *
 * The critical semantics this suite pins: `@source not` paths resolve relative to the CSS file
 * (src/app/globals.css), so ROOT-LEVEL targets must carry the ../../ prefix. Bare dir names
 * or star-star globs match nothing at the root in Tailwind 4.1.17 — verified by probe during
 * session 001 — and the poison classes keep compiling.
 */
const GUARD_PATH = "src/app/globals.css";

/** Every exclusion the scanner needs, expressed exactly as it must appear in globals.css. */
const REQUIRED_EXCLUSIONS = [
  '@source not "../../README.md"',
  '@source not "../../AGENTS.md"',
  '@source not "../../CLAUDE.md"',
  '@source not "../../Project_Architecture_Document.md"',
  '@source not "../../worklog.md"',
  '@source not "../../docs"',
  '@source not "../../skills"',
  '@source not "../../tests"',
  '@source not "../../scripts"',
  '@source not "../../package-lock.json"',
    '@source not "../../docker-compose.yml"',
  '@source not "../content"',
];

/**
 * Class-shaped tokens that exist ONLY in prose (root docs). Constructed by concatenation so
 * this test file — which lives under the excluded tests/ tree — never writes the literal
 * token into a scannable source file.
 */
const POISON_TOKENS = [
  ["md", "aspect-[3", "1]"].join(":"),
  ["aspect", "[3", "1]"].join(":"),
  ["md", "aspect-[3/1]"].join(":"),
];

function scanTreeFor(dir: string, token: string): string[] {
  const hits: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      hits.push(...scanTreeFor(full, token));
    } else if (/\.(tsx?|json|css)$/.test(entry) && readFileSync(full, "utf8").includes(token)) {
      hits.push(full);
    }
  }
  return hits;
}

describe("tailwind scan guard (globals.css)", () => {
  const css = readFileSync(GUARD_PATH, "utf8");

  it("excludes every root-level doc and non-app tree with ../../-anchored paths", () => {
    for (const exclusion of REQUIRED_EXCLUSIONS) {
      expect(css, `globals.css must contain: ${exclusion}`).toContain(exclusion);
    }
  });

  it("keeps the content JSON boundary excluded (scraped IKEA data)", () => {
    expect(css).toContain('@source not "../content"');
  });

  it("still imports tailwindcss (the guard never replaces the import)", () => {
    expect(css).toContain('@import "tailwindcss"');
  });

  it("poison prose tokens never appear inside src/ (all of src/ is scanned by design)", () => {
    for (const token of POISON_TOKENS) {
      const hits = scanTreeFor("src", token);
      expect(hits, `${token} leaked into src/: ${hits.join(", ")}`).toEqual([]);
    }
  });
});
