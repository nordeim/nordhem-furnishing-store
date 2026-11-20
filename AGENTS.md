# Nordhem Furnishing Store — AGENTS.md

An IKEA Singapore storefront re-creation: Next.js 16 App Router · React 19 · TypeScript strict · Tailwind CSS v4 (CSS-first) · Drizzle ORM · PostgreSQL · Vitest · Playwright. Server-authoritative cart/checkout, session-cookie identity, Zod at every API boundary.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server :3000 (catalog self-seeds on first request) |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint — app boundary only |
| `npm run typecheck` | `tsc --noEmit` (app code) |
| `npm run typecheck:tests` | tsc over tests + configs (`tsconfig.tests.json`) |
| `npm test` | Vitest unit suite (76 tests, 11 files) |
| `npm run test:e2e` | Playwright (25 tests) against the production build on :3100 — **run `npm run build` first** |
| `npm run db:setup` | `drizzle-kit push` + idempotent seed (23 categories / 242 products) |
| `bash docs/setup_pg_z.sh` | Rootless local PostgreSQL on :5432 (postgres:postgres/app_db) |
| `BASE_URL=http://127.0.0.1:3100 scripts/smoke.sh` | 21-check HTTP smoke (server must be running) |

**Clean check order (the only gate — no hosted CI):**
`lint → typecheck → typecheck:tests → test → build → smoke → test:e2e`

## The Tailwind scanner guard (READ THIS FIRST)

`src/app/globals.css` carries `@source not` exclusions for every root markdown doc, `docs/`, `skills/`, `tests/`, `scripts/` and `package-lock.json`. **`@source` paths are relative to the CSS file** (`src/app/`), so root targets MUST use the `../../` prefix — a bare `@source not "docs"` matches nothing and prose tokens compile into invalid CSS that breaks `next build` (the inherited run-75 lesson; rediscovered in session 001). Pinned by `tests/unit/tailwind-scan-guard.test.ts`. Never remove the guard; never write class-shaped arbitrary values into root markdown.

A warm Turbopack cache can mask this class of failure — `rm -rf .next` before trusting a build fix.

## Tailwind v4 trap log (violating these breaks production renders)

1. Never JS-toggle `hidden` against a `flex`/`block` utility (tailwindcss #15884/#18653) — the mobile drawer and all panels are **conditionally mounted** via React state. Zero `classList` in `src/` by design.
2. Theme colors are literal hex in `@theme inline` (bare HSL triplets resolve to transparent).
3. No `tailwind.config.js` — CSS-first only; custom utilities use `@utility` (btn, field, page-x, scrollbar-none).
4. `rounded-full` computes as `calc(infinity * 1px)` — assert `radius > 1000` in tests, never an exact value.
5. Preflight sets no `cursor: pointer` on buttons — the `btn` utility family carries it.

## Environment

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | `postgresql://postgres:postgres@127.0.0.1:5432/app_db` locally. **An explicit shell env always beats `.env`** (dotenv never overrides) — if the app reads the wrong DB, check `env | grep DATABASE_URL` first. |
| `NEXT_PUBLIC_SITE_URL` | recommended | Canonical origin for metadata/sitemap/robots — inlined at build time; set before `npm run build` in production. |
| `TRUSTED_PROXY_DEPTH` | no | **Opt-in proxy trust** (session-005/006): unset/garbage = direct exposure — BOTH `x-forwarded-for` and `x-real-ip` are ignored (fail-closed "unknown" bucket). Declare `1`/`2`/… only behind that many trusted proxies. |

`db:seed` runs through `scripts/seed-cli.ts` — dotenv loads BEFORE the import graph pulls in `src/db`, which throws at import time without `DATABASE_URL`.

## Architecture invariants

- Money is **integer cents** at every boundary (`priceCents`, `computeTotals`); floats never reach a total.
- The server is the sole price authority: checkout re-reads prices inside the transaction; clients never send amounts.
- Session identity is an opaque UUID cookie (`ikea_sid`, httpOnly, lax, 180 days) — no accounts, no PII in sessions.
- Every mutation: Zod parse → rate limit → CSRF origin check (`hasForeignOrigin`) → parameterised Drizzle query. Errors return the `{ error: { code, message } }` envelope, never a throw.
- Order confirmation is session-scoped; `/api/orders/track` needs order number + email and answers identically for "wrong email" and "no such order" (no enumeration).
- Search input is `escapeLike`-escaped before ILIKE; listing query params fall back to defaults on bad input.
- Seeding is idempotent under a Postgres advisory lock, memoised per process.
- Private surfaces (`/cart`, `/checkout`, `/orders/*`, `/track-order`, `/favourites`, `/search`) are `noindex` + robots-disallowed + absent from the sitemap — pinned by `tests/unit/seo-routes.test.ts` and `tests/e2e/seo-platform.spec.ts`.
- Structured JSON logs only; never log names, emails, phones or addresses.

## Testing discipline

- Unit tests target **pure seams** (`src/lib/*` — including `http.ts` CSRF/IP-key/body gates) — no DB, no mocks of internals.
- E2E runs against the **production build** (:3100, Chromium headless-shell; WebKit not installable here). The mobile-navigation project uses the iPhone 13 viewport.
- Product-card image links are `aria-hidden` — use `a[href^='/p/']:visible` locators.
- If e2e fails on a page whose code you did not change, restart the :3100 server first (stale server, not a regression).

## Process discipline

- Conventional Commits; `main` only (no feature branches) — the gate is the bouncer.
- Push via `docs/ssh_git_wrapper_v3.py` with an externally-supplied deploy key (see `docs/how-to-git-push-using-ssh-wrapper_SKILL.md`). Never commit keys, `.env`, or logs.
- Doc counts stay lockstep with reality: if a test/route/model count changes, update README/AGENTS/CLAUDE/PAD in the same commit.
- Remediation plans live in `docs/plans/` (date-stamped + session-numbered); worklog entries are append-only.
