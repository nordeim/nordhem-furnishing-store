---
name: nordhem-furnishing-store
description: Complete engineering skill for the Nordhem Furnishing Store codebase (IKEA Singapore re-creation) — Next.js 16 App Router, React 19, TS strict, Tailwind v4 CSS-first, Drizzle/PostgreSQL, Zod, Vitest/Playwright. Use when extending, debugging, auditing or replicating this storefront.
version: 1.4.0
last_updated: 2026-11-20
---

# Nordhem Furnishing Store — Engineering Skill (v1.4.0)

## §1 Project Identity & Design Philosophy
Independent educational re-creation of ikea.com/sg with working commerce (242-product catalog, search, cart, favourites, checkout, tracking, Family sign-up). One Next.js app + PostgreSQL; server-authoritative; degrade-never-fail; pure seams tested; superset of the marketing reference. **Project state (session 005): 73 unit tests / 23 e2e / 21 smoke checks; sitemap covers the catalog + info routes (276 locs); checkout locks cart rows (FOR UPDATE); proxy trust is opt-in (TRUSTED_PROXY_DEPTH unset = direct exposure, XFF ignored); mobile drawer focus-trapped; hero popover toggles correctly; production build clean.**

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

## §11 Lessons (session 003)
1. A doc/impl mismatch is its own vulnerability class: .env.example promised `TRUSTED_PROXY_DEPTH=0` = "ignore XFF" while `Math.max(1, …)` made 0 unreachable — live curl proved forged single-hop XFF still minted fresh rate-limit buckets on direct exposure. Docs that promise security behavior must be pinned by a test of that exact behavior.
2. Removing a synchronous guard flag without adding an in-flight promise turns every mount effect into its own fetch: 25 FavouriteButtons = 25 parallel /api/summary requests. Retry-on-failure and request-collapsing are two separate requirements; the guard must cover both.
3. `expect.poll` + `page.evaluate(activeElement …)` beats counting Tabs when pinning a focus trap — the wrap point is "focus never leaves the drawer", and the exact focusable count is an implementation detail (the Products submenu changes it).
4. e2e `reuseExistingServer` silently tests a STALE build after source edits — kill the server (or rebuild) before trusting a post-fix green run; a focus-trap "pass" against the old bundle is meaningless.
5. A DEPLOYMENT.md from a previous product lifetime (SQLite/Prisma/Stripe/admin references) is worse than no doc: every operator instruction in it is false. When a repo is rewritten, deployment docs belong in the rewrite's definition of done.

## §13 Lessons (session 005)
1. An "unset means the common case" default is wrong when the header is client-controlled: defaulting proxy depth to 1 made every direct-exposure deployment trust a single-hop spoofed `x-forwarded-for` — live-probed, 12/12 rotating XFFs bypassed the checkout limiter. Security-relevant trust must be OPTED INTO (unset = fail closed), and the .env.example prose that said "leave unset on direct exposure" was itself the vulnerability's document.
2. A text-read of a transaction is not a concurrency proof: `SELECT` then `INSERT` then `DELETE` inside one tx is a double-order race under READ COMMITTED without `FOR UPDATE` on the rows the transaction's outcome depends on. Lock the session's cart lines at the head of the checkout tx; the loser must see `empty_cart`.
3. Sitemap "coverage" has a second axis beyond products: the long-tail info routes (offers/rooms/stores/services/policies) are 200-status, indexable and linked from nav — 9 of 9 were invisible to crawlers. When auditing SEO, enumerate every 200 route against the sitemap, not just the catalog.
4. The lint warning backlog is a false economy: the one `react-hooks/exhaustive-deps` warning (ref read in cleanup) was a 2-line fix once triaged, and a clean `0 problems` lint output makes any NEW warning a signal instead of noise.
5. Keyboard operability of a combobox is not "Tab reaches the links eventually": the ARIA pattern requires ArrowDown/ArrowUp to move focus into the list. One `onKeyDown` branch + one e2e `toBeFocused` pin closes it.

## §12 Lessons (session 004)
1. Never verify a test gate by grepping the last line of the runner output: Playwright prints "N passed" after the failure block, so `grep passed | tail -1` showed 21 passed and hid "1 failed". Every verdict comes from the process exit code plus the full tally block.
2. A test born RED is a silent debt: the outside-click pin landed failing (it clicked a 1×1 sr-only h1 — pointer events intercepted by the sticky header) and the commit still claimed 22/22. After writing any new e2e test, run it ALONE and check its exit code before running the suite, and never write "N/N green" into a commit message you did not see with your own exit-code check.
3. A shared ref bound inside a `.map()` holds only the last-rendered element — per-item interactions need per-item identity (a `data-*` marker + `closest()`), not `ref !== target` comparisons. The bug: clicking a popover's own button closed it on pointerdown and re-opened it on click (stale-true toggle).
4. e2e locators must not be textual `filter({ hasText })` on broad attribute selectors — `[aria-label]` matched the carousel region and list ancestors. `data-testid` is boring and correct.
5. Orphan-row hygiene for cookie-only sessions belongs in an operator cron with a dry-run default (`scripts/prune-abandoned-carts.mjs`), never in the request path — and the prune predicate must match the REAL schema (cart_items has only `updated_at`; favourites only `created_at`): check information_schema before writing the SQL, then live-verify by backdating a probe row.
