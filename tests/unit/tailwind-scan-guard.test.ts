import { spawnSync } from "node:child_process";
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
  '@source not "../../nordhem-furnishing-store_SKILL.md"',
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

/**
 * Session-015 S15-L2: REQUIRED_EXCLUSIONS above is a fixed enumeration — it proves the KNOWN
 * fences exist but says nothing about a NEW root file. The scanner incident class (hit twice:
 * run-75 pre-rewrite, session-001 post-rewrite) is exactly "a root file nobody fenced" — so
 * this census turns the arrival of any unfenced root file into a RED test instead of a broken
 * build. Root DIRECTORIES other than the fenced ones are also flagged — only the known trees
 * may exist at the root.
 *
 * Session-016 S16-L2: the original census whitelisted whole EXTENSIONS (.ts/.mjs/.json) as
 * scanner-benign — but the oxide scanner DOES scan .ts files for class candidates, so a future
 * prose-bearing root .ts (scratch notes with class-shaped comments) would slip both this census
 * AND the poison scan (src-only). The blanket is replaced by an explicit root-config FILENAME
 * allowlist: today's root .ts/.mjs/.json files are pure configs (no prose, no class-shaped
 * strings), and a NEW root file of ANY extension now fails exactly like NOTES.md would.
 * When you legitimately add a root config, add its name here with a reason.
 */
const FENCED_ROOT_DIRS = new Set(["docs", "skills", "tests", "scripts", "public", "src"]);
const BENIGN_ROOT_FILES = new Set([
  // Tool configs — pure key/value directives, no prose comments carrying class-shaped tokens.
  // The two test-runner configs are .mts since session-019 (S19-01: ESM-native configs —
  // vitest 5.1 warns on loading a .ts config as CommonJS under the planned Vite native
  // configLoader default). vitest.config.mts carries only URL/alias literals in its
  // comments; the rename keeps the filenames here in lockstep with the root listing.
  "next.config.ts",
  "playwright.config.mts",
  "vitest.config.mts",
  "eslint.config.mjs",
  "postcss.config.mjs",
  "drizzle.config.json",
  "tsconfig.json",
  "tsconfig.tests.json",
  "package.json",
  // Env template — prose comments only, and values are URLs/flags, never class-shaped.
  ".env.example",
]);
const IGNORED_ROOT_ENTRIES = new Set([
  ".git",
  ".next",
  "node_modules",
  ".env", // gitignored, never committed; scanner-wise treated as fenced by absence
  ".gitignore", // gitignore patterns — no prose, no class-shaped values
  "playwright-report",
  "test-results",
  "next-env.d.ts", // generated + gitignored
]);

// tsc incremental artifacts — *.tsbuildinfo is gitignored (*.tsbuildinfo in .gitignore)
// and never committed; match by suffix.
//
// Session-018 S18-03: gitignored root files are scanner-benign BY CONSTRUCTION — Tailwind v4's
// oxide scanner respects .gitignore, so a file git refuses to track (.env.local, *.log, *.key,
// dev-server runtime logs) never reaches the scanner. The census's job is what git WOULD track:
// a new tracked-or-untracked-ungitignored root file (the NOTES.md class) must stay RED. git
// reports tracked files as not-ignored even when a pattern matches, so a tracked file can never
// false-pass through here. If git itself is unavailable, this derivation fails closed (treated
// as not ignored — same behavior as before this change).
const gitIgnoreCache = new Map<string, boolean>();
function isGitIgnored(entry: string): boolean {
  const cached = gitIgnoreCache.get(entry);
  if (cached !== undefined) return cached;
  let ignored = false;
  try {
    // check-ignore -q: exit 0 = ignored, 1 = not ignored; anything else (git missing) = closed.
    ignored =
      spawnSync("git", ["check-ignore", "-q", "--", entry], { stdio: "ignore" }).status === 0;
  } catch {
    ignored = false;
  }
  gitIgnoreCache.set(entry, ignored);
  return ignored;
}

function isIgnored(entry: string): boolean {
  if (IGNORED_ROOT_ENTRIES.has(entry)) return true;
  if (entry.endsWith(".tsbuildinfo")) return true;
  return isGitIgnored(entry);
}

function rootEntries(): { files: string[]; dirs: string[] } {
  const files: string[] = [];
  const dirs: string[] = [];
  for (const entry of readdirSync(".")) {
    if (isIgnored(entry)) continue;
    if (statSync(entry).isDirectory()) dirs.push(entry);
    else files.push(entry);
  }
  return { files, dirs };
}

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

  it("base layer gives every button a pointer cursor (v4 preflight trap, session-009 S9-L4)", () => {
    expect(css).toMatch(/@layer base\s*{[\s\S]*?button,\s*\n?\s*\[role="button"\]\s*{\s*cursor:\s*pointer;\s*}/);
    expect(css).toMatch(/button:disabled\s*{\s*cursor:\s*not-allowed;\s*}/);
  });

  it("poison prose tokens never appear inside src/ (all of src/ is scanned by design)", () => {
    for (const token of POISON_TOKENS) {
      const hits = scanTreeFor("src", token);
      expect(hits, `${token} leaked into src/: ${hits.join(", ")}`).toEqual([]);
    }
  });

  it("every root file is either scanner-excluded or an allowlisted root config (S15-L2 census, S16-L2 hardened)", () => {
    const { files, dirs } = rootEntries();
    // Every root directory must be a known fenced tree (the @source not list + the app's own
    // scanned trees). An unexpected root directory is the same incident class as an
    // unexpected root file — it is a whole tree the scanner sees unfenced.
    for (const dir of dirs) {
      expect(FENCED_ROOT_DIRS, `unexpected root directory '${dir}' — fence it in globals.css or explain it here`).toContain(dir);
    }
    for (const file of files) {
      const excluded = REQUIRED_EXCLUSIONS.some((line) => line.includes(`/${file}"`));
      const benign = BENIGN_ROOT_FILES.has(file);
      expect(
        excluded || benign,
        `root file '${file}' is neither scanner-excluded in globals.css nor an allowlisted root config — fence it (@source not "../../${file}") or add it to BENIGN_ROOT_FILES with a reason (extension blankets are NOT scanner-benign: oxide scans .ts for class candidates)`,
      ).toBe(true);
    }
  });
});
