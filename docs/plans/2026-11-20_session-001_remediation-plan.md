# Nordhem Furnishing Store — Remediation Plan
**Date:** 2026-11-20 · **Session:** 001 · **Baseline commit:** `928d609` (main)
**Scope:** Audit + remediation of the `sonnet 5.5 v1` furniture-store rewrite (`7b1c902` + `928d609`)
**Methodology:** skills/web-application (audit dimensions §14–§16, §18) · skills/tdd (red→green at the seams) · homenest-store-s patterns (scripts, configs, sitemap/robots, mobile-navigation e2e) · docs/how-to-git-push-using-ssh-wrapper_SKILL.md (push contract)

---

## 1. Audit summary (counts by severity)

| Severity | Count | IDs |
|---|---|---|
| CRITICAL | 1 | C-1 |
| HIGH | 4 | H-1..H-4 |
| MEDIUM | 5 | M-1..M-5 |
| LOW | 4 | L-1..L-4 |
| INFO | 3 | I-1..I-3 |

Baseline gates on the pulled tree: lint ✗ (4 errors — all in `skills/`, outside the app boundary) · typecheck ✗ on app code (✗ only via vendored `skills/` + stale `vitest.config.ts`) · unit 35/35 ✓ (via `vitest.config.mts`) · **build ✗ CRITICAL** · e2e — not runnable (no `@playwright/test` dependency, no spec files).

---

## 2. Findings

### C-1 (CRITICAL, Verified) — Production build broken: stale root docs leak `md:aspect-[3:1]` into Tailwind's scanner
- **Location:** `src/app/globals.css` (guard lines 3–5) vs root `AGENTS.md`, `CLAUDE.md`, `Project_Architecture_Document.md`, `worklog.md`, `ely-beauty_SKILL.md`.
- **Evidence:** `next build` fails: `CssSyntaxError: globals.css:2:113664: Missed semicolon`. Reproduced mechanically: the compiled stylesheet contains `.md\:aspect-\[3\:1\] { @media (width >= 48rem) { aspect-ratio: 3:1; } }` — a colon in `aspect-ratio` is invalid CSS. The token `md:aspect-[3:1]` exists ONLY in the five stale root docs (grep-verified; zero hits in `src/`), and Tailwind v4's default source scan reads every non-excluded file. The rewrite trimmed the `@source not` guard to just `../../README.md` + `../content`; the old guard (documented in the pre-rewrite AGENTS.md, run-75 lesson) excluded `**/*.md`, `docs/`, `skills/`, `tests/`, `scripts/`.
- **Impact:** `next build` cannot complete → no deploy, no e2e (Playwright boots the build). A warm Turbopack cache can mask it (run-75's false-green).
- **Fix (P1):** restore the full guard in `globals.css`; add `tests/unit/tailwind-scan-guard.test.ts` pinning every exclusion; both doc-token classes (`aspect-[3:1]` colon form AND `aspect-[3/1]` slash form) must never appear in compiled CSS.

### H-1 (HIGH, Verified) — No test infrastructure wiring: stale configs, missing scripts, missing deps
- **Location:** `package.json` (no `test`/`test:e2e`/`db:*` scripts), `vitest.config.ts` (imports `@vitejs/plugin-react` + `tests/unit/setup.ts` — both absent), `vitest.config.mts` (the working duplicate the rewrite left behind), `playwright.config.ts` (references `tests/e2e/global-setup.ts` — deleted, and `mobile-navigation.spec.ts` — deleted), `tsconfig.tests.json` (references deleted paths, includes `prisma/`).
- **Impact:** `npm test` does not exist; `npx vitest run` picks the broken `vitest.config.ts` and fails; Playwright cannot run (no `@playwright/test` in devDependencies).
- **Fix (P2):** align to homenest-store-s: single `vitest.config.ts` (node env, `@` alias, include `tests/unit/**`), add `tests/unit/setup.ts` (DATABASE_URL default), rewrite `playwright.config.ts` (webServer = production build on :3100, mobile-navigation + desktop-chromium projects), delete `vitest.config.mts`, add npm scripts `test`, `test:watch`, `test:e2e`, `typecheck:tests`, `db:push`, `db:seed`, `db:setup`; install `@playwright/test` + `@vitejs/plugin-react` as devDependencies.

### H-2 (HIGH, Verified) — SEO surface deleted by the rewrite: no sitemap, no robots, no manifest
- **Location:** `src/app/` — `sitemap.ts`, `robots.ts`, `manifest.ts`, `icon.svg` all deleted in `7b1c902`; `src/lib/seo.ts` (siteBaseUrl + JSON-LD helpers) deleted.
- **Impact:** No `sitemap.xml`, no `robots.txt`, no PWA manifest, no favicon; product JSON-LD survives only inline in `src/app/p/[slug]/page.tsx`. `NEXT_PUBLIC_SITE_URL` is read by nothing.
- **Fix (P3):** re-create `src/lib/seo.ts` (siteBaseUrl + Organization/WebSite JSON-LD builders), `src/app/sitemap.ts` (static routes + categories + products, DB-failure-safe), `src/app/robots.ts` (disallow private surfaces + sitemap pointer), `src/app/manifest.ts`, `src/app/icon.svg`; unit tests `tests/unit/seo-routes.test.ts` + `tests/unit/seo-ld.test.ts` (TDD); add metadata verification to e2e.

### H-3 (HIGH, Verified) — `.env.example` describes the deleted app
- **Location:** `.env.example` — ElyBeauty/SQLite/Prisma/AUTH_SECRET/Stripe/BDT content; the app now uses Drizzle + PostgreSQL and none of those variables (only `DATABASE_URL` + `NEXT_PUBLIC_SITE_URL` are read, via `src/db/index.ts` and the new seo seam).
- **Impact:** A fresh clone following `.env.example` sets a SQLite URL → the app throws at module load.
- **Fix (P4):** rewrite `.env.example` to the actual two-variable contract with the rootless-PG default and `docs/setup_pg_z.sh` pointer.

### H-4 (HIGH, Verified) — Prisma schema remnants contradict the Drizzle data layer
- **Location:** `prisma/schema.prisma` (old ely-beauty models), `prisma/seed.ts`, `drizzle.config.json` (the real contract), `tsconfig.tests.json` including `prisma/**`.
- **Impact:** Two competing schema definitions confuse agents and typecheck runs; a future `prisma db push` would destroy the Drizzle database.
- **Fix (P2):** delete `prisma/`; fix `tsconfig.tests.json` includes; document Drizzle as the sole ORM.

### M-1 (MEDIUM, Verified) — Root docs are the stale ely-beauty set
- The five root docs (AGENTS/CLAUDE/PAD/README/worklog tail) describe the deleted beauty store; they also carry the C-1 tokens. **Fix (P5):** regenerate all four docs for the furniture store; truncate worklog with a pivot entry (keep history: append, don't delete).

### M-2 (MEDIUM, Verified) — `ely-beauty_SKILL.md` stale skill file at root
- 333 KB of the old app's skill. Carries C-1 tokens. **Fix (P5):** remove it; the new `nordhem-furnishing-store_SKILL.md` replaces it (per task instruction).

### M-3 (MEDIUM, Verified) — No e2e safety net at all
- The rewrite deleted all 68 e2e specs. Mobile navigation (the Tailwind v4 conditional-mount pattern — this repo's signature bug class) has no regression pin. **Fix (P6):** port the homenest mobile-navigation spec shape (open → categories submenu → navigate → unmount; close → reopen; body scroll lock) + a storefront smoke spec + seo spec.

### M-4 (MEDIUM, Verified) — `db:seed` has no CLI entry
- `src/db/seed.ts` exports `ensureCatalog()` only; `npx tsx src/db/seed.ts` exits 0 doing nothing. **Fix (P2):** add a `main()` guard to seed.ts (invoked by the new `db:seed` script) that loads `.env` via dotenv and awaits `ensureCatalog()`.

### M-5 (MEDIUM, Verified) — ESLint does not ignore the vendored `skills/` tree
- 4 errors + 12 warnings all originate in `skills/**`; the app boundary is `src/` + root configs. homenest's config ignores `skills/**`, `docs/**`, `test-results/**`, `playwright-report/**`. **Fix (P2).**

### L-1 (LOW, Verified) — `package.json` name is the template placeholder `nextjs-postgresql-template`.
- **Fix (P2):** rename to `nordhem-furnishing-store`.

### L-2 (LOW, Verified) — `tests/e2e/` directory deleted entirely (empty tree).
- Restored by P6.

### L-3 (LOW, Verified) — `scripts/smoke.sh` expects the seeded catalog via API at :3000.
- Still valid; will run as part of VERIFY against the production build (port-aligned).

### L-4 (LOW, Verified) — `src/app/layout.tsx` metadata lacks `metadataBase`, canonical URLs, and openGraph.
- **Fix (P3):** wire `metadataBase` from `siteBaseUrl()`, add openGraph + robots defaults.

### I-1 (INFO) — `clientKey()` trusts `x-forwarded-for` first hop (rightmost-vs-leftmost question on direct deploys). Documented in `.env.example`/docs; single-instance demo posture — accept + document.
### I-2 (INFO) — In-memory rate limiter is single-instance by design (comment documents it). Accept.
### I-3 (INFO) — `SmartImage` deliberately uses plain `<img>` (third-party pre-sized IKEA CDN) with eslint-disable comments — a documented deviation, keep.

---

## 3. Execution order (each step gated; TDD where a seam exists)

| # | Phase | Deliverables | Gate |
|---|---|---|---|
| P1 | **Build unbreak** (C-1) | Full `@source not` guard in `globals.css` + `tests/unit/tailwind-scan-guard.test.ts` (RED→GREEN) | `npm run build` ✗→✓ |
| P2 | **Toolchain repair** (H-1, H-4, M-4, M-5, L-1) | package.json scripts + deps; delete `vitest.config.mts`, `prisma/`; fix `vitest.config.ts`, `playwright.config.ts`, `tsconfig.tests.json`, `eslint.config.mjs`; `seed.ts` CLI entry; setup.ts | `npm run lint` ✓ · `typecheck` ✓ · `typecheck:tests` ✓ · `npm test` 35+ ✓ · `db:setup` ✓ |
| P3 | **SEO surface** (H-2, L-4) — TDD | `src/lib/seo.ts`, `sitemap.ts`, `robots.ts`, `manifest.ts`, `icon.svg`, layout metadataBase; `tests/unit/seo-routes.test.ts`, `tests/unit/seo-ld.test.ts` | tests RED→GREEN; build ✓; `/sitemap.xml` + `/robots.txt` render |
| P4 | **`.env.example`** (H-3) | Two-variable contract + setup_pg_z pointer | smoke.sh against build ✓ |
| P5 | **Docs pivot** (M-1, M-2) | README.md, AGENTS.md, CLAUDE.md, Project_Architecture_Document.md rewritten for the furniture store; remove `ely-beauty_SKILL.md`; worklog Task entry; `nordhem-furnishing-store_SKILL.md` (distill) | doc skill checklists |
| P6 | **E2E suite** (M-3) | `tests/e2e/mobile-navigation.spec.ts`, `tests/e2e/storefront.spec.ts`, `tests/e2e/seo-platform.spec.ts` | `npm run test:e2e` ✓ |
| P7 | **Browser verification** | agent-browser pass: mobile menu (open/close/reopen/submenu/scroll-lock), search overlay, category grid, product page, cart flow at 390/768/1440; screenshots → `docs/screenshots/` | visual + functional pass |
| P8 | **Full gate + ship** | lint → typecheck → typecheck:tests → test → build → smoke → e2e; commit; SSH-wrapper push to main | all green; remote verified |

---

## 4. Verification evidence to capture
1. `npm run build` success output (P1) — the C-1 before/after.
2. `npm test` / `npm run test:e2e` counts (P2/P6).
3. `/sitemap.xml`, `/robots.txt`, `/manifest.webmanifest` HTTP 200 + content checks (P3).
4. `scripts/smoke.sh` full pass against the standalone build (P4/P8).
5. Screenshot set in `docs/screenshots/` (P7): home desktop, home mobile, mobile menu open, menu categories submenu, search overlay, category listing, product page, cart, checkout, order confirmation.
6. Gate chain transcript (P8) + remote ref verification from the SSH wrapper.

## 5. Known limitations / deliberate decisions
- **Stale root docs keep their history** — worklog is append-only; the old doc content is replaced but git history preserves it. The C-1 tokens leave the working tree via P1's guard anyway (scan no longer reads them) AND P5 removes the bulk of the stale files.
- **No CI exists** — the local gate chain is the only gate (homenest posture; documented in AGENTS.md).
- **Playwright browsers**: install Chromium via `npx playwright install chromium` (WebKit not installable in this sandbox — same constraint the homenest suite documents).
- **Screenshots from the production build**, not `next dev` (homenest lesson: the dev indicator pollutes captures).
- **`docs/nordherm-sonnet5.5.zip` and prompt/review docs stay untouched** — operator's reference material, out of app scope; excluded from the Tailwind scan by the P1 guard (`docs/` exclusion).
