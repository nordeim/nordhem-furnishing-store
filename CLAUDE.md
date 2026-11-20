---
IMPORTANT: File is read fresh for every conversation. Be brief and practical.
---

# Nordhem Furnishing Store

CLAUDE.md — the agent contract for working in this repo. (Companion: AGENTS.md for the operator quick-reference; README.md for users; Project_Architecture_Document.md for the blueprint.)

**Tech Stack**: Next.js 16 (App Router), React 19, TypeScript strict, Tailwind CSS v4 (CSS-first), Drizzle ORM + PostgreSQL, Zod 4, Vitest, Playwright.

## Core Identity & Purpose

An independent educational re-creation of the IKEA Singapore storefront with working commerce flows: 242-product catalog, search, server-authoritative cart, favourites, checkout, order tracking, IKEA Family sign-up. Not affiliated with Inter IKEA Systems B.V.

## Foundational Principles

### Meticulous Approach (Six-Phase Workflow)

1. **ANALYZE** — read the relevant files in full; reproduce failures before diagnosing; prefer executable truth over prose.
2. **PLAN** — smallest correct sequential plan; name files, tests, and verification evidence.
3. **VALIDATE** — check the plan against configs, lockfiles, schema, and the running app.
4. **IMPLEMENT** — small typed test-backed increments; TDD at the pure seams (red → green → refactor).
5. **VERIFY** — run the full gate: `lint → typecheck → typecheck:tests → test → build → smoke → test:e2e`.
6. **DELIVER** — conventional commit to main, docs updated in the same commit, push via the SSH wrapper.

### Project-Specific Principles

- The production build is the type gate — never set `ignoreBuildErrors`.
- `rm -rf .next` before trusting any build result (warm Turbopack cache masks CSS failures).
- Never weaken a guardrail (lint rule, test, type strictness) to make a gate pass.
- When a count changes (tests, routes, products), sweep every doc copy in the same commit.

## Implementation Standards

### Next.js 16 Specific
- App Router conventions; Server Components by default; `"use client"` only for interactivity.
- `export const dynamic = "force-dynamic"` on every data route and DB-backed page.
- Route Handlers stay thin: Zod parse → rate limit → CSRF check → Drizzle → envelope (`src/lib/route.ts` `guard()`).
- Metadata API for SEO; `metadataBase` from `siteBaseUrl()`; JSON-LD via `jsonLdScript()` (escapes `<`).

### TypeScript Strict Mode
- `strict: true`; never `any` (use `unknown`); `tsc --noEmit` must pass for app AND tests.

### Tailwind CSS v4
- CSS-first: tokens in `globals.css` `@theme inline` with literal hex; NO tailwind.config.js.
- Custom utilities via `@utility` (`btn`, `field`, `page-x`, `scrollbar-none`).
- Panels/drawers are conditionally mounted — NEVER toggle `hidden` via JS (v4 display-utility bug).
- The `@source not` guard fences the scanner: root markdown, docs/, skills/, tests/, scripts/ are excluded — paths are relative to the CSS file (root targets need `../../`). Pinned by `tests/unit/tailwind-scan-guard.test.ts`.

### Data Layer
- Drizzle schema at `src/db/schema.ts` is the single source of truth (no prisma/ — removed).
- Money is integer cents everywhere; totals re-derived server-side inside the checkout transaction.
- Idempotent seed under `pg_advisory_xact_lock`; CLI entry `scripts/seed-cli.ts` (dotenv loads before the import graph).

## Development Workflow

### Environment Setup
```bash
npm install
bash docs/setup_pg_z.sh        # rootless local PostgreSQL :5432
cp .env.example .env           # DATABASE_URL + NEXT_PUBLIC_SITE_URL
npm run db:setup               # schema push + seed
npm run dev
```

### Build Commands
| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server (:3000) |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |
| `npm run typecheck` / `typecheck:tests` | tsc for app / tests |
| `npm test` | Vitest (70 unit tests) |
| `npm run test:e2e` | Playwright (23 tests, build first) |
| `npm run db:setup` | Schema push + seed |

## Testing Strategy

- **Unit (Vitest, 70 tests)**: pure seams only — cart-math, money, validation, paths, rate-limit, content contracts, seo builders, tailwind-scan-guard. New logic in `src/lib/*` gets its spec in the same change (TDD).
- **E2E (Playwright, 23 tests)**: mobile-navigation (conditional-mount drawer state machine), storefront (home/listing/product/search/cart/health), seo-platform (sitemap/robots/manifest/JSON-LD/noindex). Against the production build on :3100.
- **Smoke (21 checks)**: `scripts/smoke.sh` — full cart→checkout→track round-trip including cross-session isolation.

## Error Handling & Debugging

- Route errors → `guard()` → 500 envelope with a stable code; never throw across a handler.
- Symptom: build "works" but CSS error `Missed semicolon` at huge offsets → prose leaked into the Tailwind scanner → check `@source not` guard paths (must be `../../`-anchored for root files).
- Symptom: wrong database / missing data → shell `DATABASE_URL` shadows `.env` (dotenv never overrides) → `env -u DATABASE_URL npm run dev`.
- Symptom: e2e fails on untouched pages → stale :3100 server → restart it.

## Git & Version Control

- Conventional Commits, atomic units, `main` only.
- Push with `python3 docs/ssh_git_wrapper_v3.py --key-file <external key>` (paramiko shim on PATH if no OpenSSH). See `docs/how-to-git-push-using-ssh-wrapper_SKILL.md`.
- Never commit: `.env`, keys, `test-results/`, `playwright-report/`, logs.

## Anti-Patterns to Avoid

- JS classList toggling of display utilities (Tailwind v4 bug class).
- Writing class-shaped arbitrary values (aspect ratios etc.) into root markdown — the scanner reads prose.
- Client-supplied prices or totals — the server re-derives everything.
- A second lockfile or a second ORM — Drizzle + package-lock.json only.
- Weakening lint/tests to pass the gate — fix the code instead.
