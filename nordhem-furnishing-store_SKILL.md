---
name: nordhem-furnishing-store
description: Complete engineering skill for the Nordhem Furnishing Store codebase (IKEA Singapore re-creation) — Next.js 16 App Router, React 19, TS strict, Tailwind v4 CSS-first, Drizzle/PostgreSQL, Zod, Vitest/Playwright. Use when extending, debugging, auditing or replicating this storefront.
version: 1.1.0
last_updated: 2026-11-20
---

# Nordhem Furnishing Store — Engineering Skill (v1.0.0)

## §1 Project Identity & Design Philosophy
Independent educational re-creation of ikea.com/sg with working commerce (242-product catalog, search, cart, favourites, checkout, tracking, Family sign-up). One Next.js app + PostgreSQL; server-authoritative; degrade-never-fail; pure seams tested; superset of the marketing reference. **Project state (session 002): 65 unit tests / 18 e2e (3× consecutive green) / 19 smoke checks; sitemap covers 100% of the catalog (267 locs); production build clean.**

## §2 Tech Stack (locked)
Next.js ^16.4.2 · React ^19.2.6 · TypeScript ^5.9.3 strict · Tailwind ^4.1.17 (CSS-first) · Drizzle ^0.45.2 · PostgreSQL 17 · Zod ^4.6.7 · Vitest ^5.1.0 · @playwright/test ^1.65.1 · @fontsource/noto-sans ^5.3.0. Node ≥ 20, npm ≥ 10, one lockfile.

## §3 Bootstrapping
```bash
npm install && bash docs/setup_pg_z.sh && cp .env.example .env && npm run db:setup && npm run dev
# gate: npm run lint && npm run typecheck && npm run typecheck:tests && npm test && npm run build \
#       && BASE_URL=http://127.0.0.1:3100 scripts/smoke.sh && npm run test:e2e
```
Env: `DATABASE_URL` (required — shell env beats .env, dotenv never overrides), `NEXT_PUBLIC_SITE_URL` (build-time inlined). Seed CLI = `scripts/seed-cli.ts` (dotenv BEFORE the import graph; src/db throws at import time without the URL).

## §4 Design System (CSS-first)
Tokens in `src/app/globals.css` `@theme inline` with literal hex (ink #111, brand #0058a3, yellow #ffdb00, surface #f5f5f5, line #dfdfdf …). Utilities `@utility btn/btn-*/field/page-x/scrollbar-none`. Container 1760px; breakpoint xs 30rem. No tailwind.config.js — ever.

## §5 Component Architecture
Layers: content → lib (pure seams) → db → components → app. Client islands: header/drawer, search-box, carousels, cart view, forms, toaster, shopping-store (`useSyncExternalStore` module store — no Zustand). Route handlers thin: guard() wraps Zod → rate-limit → origin-check → Drizzle → envelope.

## §6 Anti-Patterns & Common Bugs
1. **Tailwind scanner leak (the signature bug, hit TWICE)**: prose in root markdown compiles class-shaped tokens into invalid CSS → `CssSyntaxError: Missed semicolon` at ~100KB offsets → build dies. Fix = `@source not` guard in globals.css; **paths are relative to the CSS file** — root targets need `../../`; bare `docs`/`skills`/`**/*.md` match NOTHING in 4.1.17. Warm Turbopack cache masks it: `rm -rf .next`. Pinned by tests/unit/tailwind-scan-guard.test.ts. NEVER write literal arbitrary-value classes in root docs or comments.
2. JS-toggling `hidden` vs `flex` (v4 bug class) — conditionally mount panels instead (zero classList in src/).
3. Client-supplied prices — the server re-derives inside the checkout transaction.
4. Shell DATABASE_URL shadowing .env — check `env | grep DATABASE` before touching code.
5. tsx compiles .ts as CJS here — no top-level await in scripts.
6. Stale :3100 server → phantom e2e failures on untouched pages; restart first.
7. aria-hidden product image links — use `a[href^='/p/']:visible` in e2e.
8. `**/*.md` inside a JS block comment terminates the comment (`*/`) — parse error far from the cause.

## §7 Debugging Guide
| Symptom | Root cause | Fix |
|---|---|---|
| Build: Missed semicolon at huge CSS offset | prose token in scanner | restore `../../` guard; rm -rf .next |
| DATABASE_URL is required at import | seed ran without .env | scripts/seed-cli.ts (dotenv first) |
| Wrong DB / missing data | shell env shadow | `env -u DATABASE_URL` |
| e2e fails, code unchanged | stale :3100 | restart server |
| 429s in tests | fixed-window limiter | one login per suite; wait Retry-After |

## §8 Pre-Ship Checklist
Gate chain green (all seven steps) · changed surfaces at 390/768/1440 · `git status` free of .env/keys/logs/test-results · doc counts swept (README/AGENTS/CLAUDE/PAD same-commit) · scanner guard test still green after adding any root file · conventional commit to main · push via docs/ssh_git_wrapper_v3.py.

## §9 Lessons (session 001)
1. The `@source not` relative-path semantics is the entire guard — verify with a probe, not docs.
2. The oxide scanner reads markdown by default; the JS-side file hook sees nothing — bisect by hiding files.
3. Test files that pin poison tokens must construct them by concatenation, or they become the leak.
4. An existing good README can be updated in place — full rewrites lose accurate specifics.
5. Production-build e2e caught nothing the smoke missed, but the mobile-navigation pin is the regression net for the v4 drawer bug — keep it first-class.

## §10 Lessons (session 002)
1. A code comment that says "every product fits the first page" is a claim, not a fact — PAGE_SIZE=24 vs 242 products; the sitemap omitted 90% of the catalog behind that sentence. Verify data-dependent claims against the data.
2. `x-forwarded-for.split(",")[0]` is the single most common rate-limit bypass: proxies APPEND, so the FIRST hop is client-controlled. Count from the END per a declared proxy depth, and fail closed.
3. Playwright `:visible` does NOT exclude `aria-hidden` links; `.click()` resolves at dispatch, not navigation. Click a named/visible target and assert the URL before reading the DOM — otherwise the test races (or silently passes against the previous page).
4. `toHaveURL(/^\/p\//)` fails on absolute URLs — Playwright matches the full URL; drop the anchor or match the host too.
5. Node's `Request` does NOT populate a `host` header from the URL — set it explicitly in unit tests that exercise host-dependent logic (the CSRF guard).
