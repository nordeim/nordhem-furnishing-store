# Nordhem Furnishing Store — Master Project Architecture Document (PAD) v2.0.0

**Classification:** Internal Engineering Reference
**Status:** DEFINITIVE, PRODUCTION-LOCKED BLUEPRINT
**Last Updated:** 2026-11-20 (session 001 — post-rewrite remediation)
**Audience:** Senior Engineers, Tech Leads, DevOps, and Onboarding Engineers
**Rule:** Every architectural decision in this document traces to a specific rationale. Nothing is here "because it's popular."

---

## 1. System Overview & Decisions

### 1.1 Document Metadata & Purpose
This PAD is the single source of truth for the furniture-store codebase introduced by the `sonnet 5.5 v1` rewrite (commit 7b1c902) and remediated in session 001 (plan: `docs/plans/2026-11-20_session-001_remediation-plan.md`). It supersedes the pre-rewrite ely-beauty PAD entirely.

### 1.2 Technology Stack Summary

| Layer | Technology | Version | Key Rationale |
|---|---|---|---|
| Web framework | Next.js (App Router) | ^16.4.2 | Route handlers + server components + metadata API in one deployable unit |
| UI runtime | React / react-dom | ^19.2.6 | Server components by default; `useSyncExternalStore` for the shopping store |
| Language | TypeScript | ^5.9.3 | `strict: true`; `tsc --noEmit` is a gate for app and tests |
| Styling | Tailwind CSS | ^4.1.17 | CSS-first tokens; no config file (ADR-004) |
| ORM | Drizzle ORM | ^0.45.2 | SQL-transparent, typed schema, transactions, advisory locks (ADR-002) |
| Database | PostgreSQL | 17 (rootless local) | Array columns (`collections text[]`), `@>` operator, advisory-lock seeding |
| Validation | Zod | ^4.6.7 | Every API boundary; lenient query parsers with `.catch()` defaults |
| Unit tests | Vitest | ^5.1.0 | Node env, fast, `@` alias parity with tsconfig |
| E2E | @playwright/test | ^1.65.1 | Against the production build — the dev server lies about production |
| Fonts | @fontsource/noto-sans | ^5.3.0 | Self-hosted (IKEA's actual family), no external font CDN |

### 1.3 Architecture Decision Records

**ADR-001: One deployable Next.js app, no microservices.**
- Context: demo/commerce scope; single operator.
- Decision: one App Router app + PostgreSQL; API routes under `src/app/api/`.
- Rationale: deploys, tests and debugging stay trivial until scale demands more.
- Consequences: in-process rate limiter (single instance) — documented limitation.
- Alternatives rejected: separate API service (operational cost with no benefit at this scale).

**ADR-002: Drizzle ORM over Prisma.**
- Context: the pre-rewrite app used Prisma/SQLite; the rewrite targets PostgreSQL.
- Decision: Drizzle (`src/db/schema.ts` + `drizzle-kit push`); the `prisma/` directory was deleted in session 001.
- Rationale: native PG features used by the catalog (text-array collections with `@>` containment, `pg_advisory_xact_lock` for seed serialisation), SQL-transparent query building, no codegen step.
- Consequences: `drizzle-kit push` in dev (no migrate journal yet — acceptable for a demo dataset that reseeds idempotently).
- Alternatives rejected: Prisma (no advisory-lock/idiomatic array-containment story); raw pg (loses typing).

**ADR-003: Session-cookie identity, no accounts.**
- Context: IKEA's guest-cart UX; no payment, no PII worth protecting with passwords.
- Decision: opaque UUID cookie `ikea_sid` (httpOnly, lax, 180d); order ownership = placing session; tracking = order number + email.
- Rationale: zero credential surface; every auth-adjacent attack class (enumeration, timing, reset) disappears.
- Consequences: cookie loss = order-confirmation loss (tracking still works); documented in README.
- Alternatives rejected: full auth family (the pre-rewrite app's biggest maintenance surface).

**ADR-004: Tailwind v4, CSS-first.**
- Context: token parity with ikea.com/sg; the scanner-leak bug class.
- Decision: `@theme inline` literal-hex tokens in `globals.css`; custom `@utility` classes; **no tailwind.config.js**; `@source not` guard fences prose out of the scanner (root targets `../../`-anchored — see §6).
- Rationale: v4's default scanner reads markdown; the guard is the only thing standing between root docs and a broken build (verified twice: run-75 pre-rewrite, session 001 post-rewrite).
- Consequences: every new root-level doc/tree must be added to the guard + its test.
- Alternatives rejected: v3 config file (not supported by the installed toolchain); scanner on by default (build-breaking).

**ADR-005: Money as integer cents end-to-end.**
- Context: IEEE-754 drift must never reach a total.
- Decision: `priceCents` columns, `computeTotals` integer math, `formatPrice` at the display boundary only; checkout re-reads prices inside the transaction.
- Rationale: correctness at the aggregation boundary is non-negotiable.
- Alternatives rejected: decimal columns (drift risk at boundaries).

**ADR-006: E2E against the production build.**
- Context: the dev server masks production-only failures (hydration, CSS compile, caching).
- Decision: Playwright `webServer` boots `npm start` on :3100 with `/api/health` readiness; Chromium headless-shell only (WebKit not installable in the sandbox).
- Alternatives rejected: e2e against `next dev` (false greens).

---

## 2. High-Level System Topology

```
Browser (Chromium e2e / desktop / mobile 390px)
   │  HTML (RSC) + JSON API
   ▼
Next.js 16 (App Router, node server, :3000/:3100)
   ├── Server Components ──► src/lib/catalog.ts, shopping.ts ─┐
   ├── Route Handlers /api/* (Zod → rate-limit → CSRF → Drizzle)
   ├── sitemap.ts / robots.ts / manifest.ts (MetadataRoute)
   └── Pool (pg) ─────────────────────────────────────────────┼──► PostgreSQL 17 (:5432, app_db)
                                                               │    (categories, products, cart_items,
   Content: src/content/*.json (scraped ikea.com/sg) ──────────┘     favourites, orders, order_items, family_members)
   Images: hot-linked ikea.com CDN (SmartImage sizing via imwidth/f= params)
```

Single instance; no CDN; security headers (nosniff, DENY, referrer, permissions) in `next.config.ts`; no CSP yet (needs per-request nonces — known issue).

---

## 3. Application Architecture

### 3.1 Layer Model
- **Layer 0 `src/content`** — scraped data + nav/pages derivations. Read-only input.
- **Layer 1 `src/lib`** — pure seams (no upward imports): cart-math, money, validation, paths, images, links, rate-limit, http, route, session, seo + server data access (catalog, shopping).
- **Layer 2 `src/db`** — Drizzle schema + pooled client + idempotent seed (the only Prisma-free source of truth).
- **Layer 3 `src/components`** — layout chrome / shop / home / forms / ui primitives; client islands explicit.
- **Layer 4 `src/app`** — pages, API routes, SEO route files; thin composition.

### 3.2 Annotated Directory Structure
```
src/app/            # routes: / (home), cat/[slug], p/[slug], search, cart, checkout,
                    # favourites, ikea-family, track-order, orders/[orderNo], [...slug] (content pages)
src/app/api/        # cart, checkout, favourites, family, orders/track, search, summary, health
src/app/globals.css # @theme tokens + @utility set + THE @source not GUARD
src/app/{sitemap,robots,manifest}.ts   # MetadataRoute generators (session 001)
src/components/     # layout (header+drawer, footer, search-box, toaster), shop, home, forms, ui
src/lib/            # pure seams (see Layer 1) — every one unit-tested
src/db/             # schema.ts (6 tables), index.ts (Pool), seed.ts (advisory-lock idempotent)
src/content/        # catalog.json (242 products), home.json, nav.ts, pages.ts
tests/unit/         # 7 files / 52 tests
tests/e2e/          # mobile-navigation, storefront, seo-platform (18 tests)
scripts/            # seed-cli.ts (dotenv-first), smoke.sh (19 checks), capture-catalog.py,
                    # capture-screenshots.mjs
docs/               # plans/, screenshots/, setup_pg_z.sh, ssh_git_wrapper_v3.py, how-tos
```

### 3.3 Critical Code Patterns

**The route-handler idiom** (`src/lib/route.ts` + any `api/*`):
```ts
export function POST(request: Request) {
  return guard("api.checkout", async () => {           // 500-envelope on throw, logged once
    const limit = limiter.check(clientKey(request));   // per-IP fixed window
    if (!limit.ok) return rateLimited(limit);          // 429 + Retry-After
    const body = await readJson(request, checkoutSchema); // origin check + Zod
    if (!body.ok) return body.response;                // 403/400/422 envelope
    ...Drizzle transaction...
  });
}
```
Why: every mutation shares the same validation/rate/CSRF/error shape; a new route cannot forget a guard.

**The conditional-mount drawer** (`src/components/layout/header.tsx`): `{panel === "mobile" && (<div id="mobile-drawer" role="dialog" aria-modal …>)}` — no `classList`, no `hidden`-toggle (the Tailwind v4 display-utility bug class). Escape/pointerdown close, body scroll lock, focus move to the close button. Pinned by `tests/e2e/mobile-navigation.spec.ts` (6 tests).

**The scanner guard** (`src/app/globals.css`): `@source not "../../AGENTS.md"; … "@source not "../../skills"; …` — **paths relative to the CSS file**, root targets need `../../`. A bare `"docs"` matches nothing; the poison classes compile; the build dies with `CssSyntaxError: Missed semicolon` at a ~100KB offset. Pinned by `tests/unit/tailwind-scan-guard.test.ts`.

**Idempotent advisory-lock seed** (`src/db/seed.ts`): `pg_advisory_xact_lock(727001)` serialises concurrent cold starts; `count(*) > 0` skips; memoised per process via a module-level promise (failures not cached). CLI path `scripts/seed-cli.ts` loads dotenv BEFORE importing the module graph (src/db throws at import time without DATABASE_URL).

---

## 4. Data Architecture

### 4.1 Schema (src/db/schema.ts)
| Table | Key columns | Constraints / indexes |
|---|---|---|
| categories | slug (unique), name, kind ('category'/'collection'), image, sort_order | — |
| products | article_no (unique), slug (unique), price_cents, rating, review_count, category_slug FK, collections text[] | idx category, idx price, check price >= 0 |
| cart_items | session_id, product_id FK cascade, quantity | unique(session, product), check qty 1..99 |
| favourites | session_id, product_id FK cascade | unique(session, product) |
| orders | order_no (unique) IKSG-##########, session_id, customer contact, subtotal/delivery/total cents, status | idx session |
| order_items | order_id FK cascade, product_id FK set null, snapshot (name, type_desc, image, unit_price_cents, quantity) | — |
| family_members | email (unique), name, marketing_consent | — |

### 4.2 Persistence Strategy
Pooled `pg.Pool` (dev global reuse to survive HMR); `force-dynamic` everywhere data renders; seed routed through the app's own `db` import; `drizzle-kit push` for schema changes (dev posture — see ADR-002 consequences).

---

## 5. Design System Reference
Tokens measured from ikea.com/sg (`globals.css` `@theme inline`, literal hex): ink #111111, ink-soft #484848, mute #767676, line #dfdfdf, line-strong #929292, surface #f5f5f5, brand #0058a3 (hover #004f93, press #003e72), yellow #ffdb00, sale #cc0008, positive #0a8a00, negative #e00751, caution #ca5008, family #007cc1. Type: Noto Sans 400/700 (self-hosted). Utilities: `btn`/`btn-primary`/`btn-dark`/`btn-light`/`btn-outline`, `field`, `page-x`, `scrollbar-none`. Container `--container-page: 1760px`; breakpoint `--breakpoint-xs: 30rem`. Focus: 2px ink outline offset 2; reduced-motion honoured globally.

---

## 6. Security Architecture

| Rule | Enforcement |
|---|---|
| Zod at every boundary | `readJson()` in `src/lib/http.ts`; schemas in `src/lib/validation.ts` |
| CSRF on cookie mutations | `hasForeignOrigin()` — cross-site Origin mismatch → 403; no-Origin (curl) allowed by design |
| Rate limiting | per-IP fixed windows: cart/favourites 120/min, search 90/min, checkout 10/min, track 10/min, family 5/min — 429 + Retry-After |
| SQL injection | Drizzle parameterised queries; user search escaped via `escapeLike` before ILIKE |
| Order privacy | confirmation = session-scoped 404; track = orderNo + email, single generic error (no enumeration) |
| Secrets | none in repo; `.env` gitignored; logs are structured JSON without PII |
| Headers | nosniff, X-Frame-Options DENY, strict referrer, restrictive Permissions-Policy |
| Session cookie | httpOnly, SameSite=Lax, secure when x-forwarded-proto=https, 180d, UUID-validated on read |

**Known limitation (accepted):** in-memory rate limiter is single-instance; `clientKey` trusts the first `x-forwarded-for` hop (fine behind a single proxy; revisit for multi-hop edge deploys). No CSP yet.

---

## 7. Testing Strategy

| Tier | Count | Runner | Location |
|---|---|---|---|
| Unit | 52 tests / 7 files | Vitest (node) | `tests/unit/` |
| E2E | 18 tests / 3 specs | Playwright (Chromium, prod build :3100) | `tests/e2e/` |
| Smoke | 19 checks | bash | `scripts/smoke.sh` |

Coverage philosophy: pure seams unit-tested (TDD); user-visible surfaces e2e-pinned; the full HTTP contract smoke-checked. The gate: `lint → typecheck → typecheck:tests → test → build → smoke → test:e2e`.

Pre-deploy checklist: gate green; changed surfaces checked at 390/768/1440; `git status` clean of `.env`/keys/logs; doc counts swept.

---

## 8. Build & Deployment

- `npm run build` → `.next` (Turbopack); `npm start` serves it. The Playwright webServer boots the same build on :3100.
- Env: `DATABASE_URL` (required), `NEXT_PUBLIC_SITE_URL` (build-time inlined).
- Local DB: `bash docs/setup_pg_z.sh` (rootless user-space PostgreSQL 17, port 5432, postgres:postgres, db app_db — matches `drizzle.config.json`).
- Push contract: `main` only, via `docs/ssh_git_wrapper_v3.py` (deploy key outside the repo; see the how-to skill).

---

## 9. Developer Handbook
See AGENTS.md (commands + traps) and README.md (quickstart). Conventional Commits; worklog append-only; remediation plans date-stamped under `docs/plans/`.

---

## 10. Known Issues & Outstanding Tasks

| Priority | Issue | Impact | Status |
|---|---|---|---|
| HIGH | No CSP header (needs per-request nonces on Next 16) | XSS defense-in-depth gap | Open |
| MEDIUM | `drizzle-kit push` dev posture — no migration journal | Prod schema drift risk | Open (accept for demo) |
| MEDIUM | In-memory rate limiter (single instance) | Multi-instance would share nothing | Accepted, documented |
| LOW | Sitemap covers first 24 products only | Full catalog indexing | Open (demo-size catalog fits) |
| LOW | ikea.com image dependency | Offline = placeholder tiles | Accepted |

---

## 11. Key Files Reference

| File | Purpose |
|---|---|
| src/app/globals.css | Tokens, utilities, THE scanner guard |
| src/components/layout/header.tsx | Header + conditional-mount mobile drawer |
| src/lib/shopping.ts | Cart/favourites/orders domain (server) |
| src/lib/cart-math.ts | Integer-cents totals |
| src/lib/validation.ts | All Zod schemas + lenient listing parser |
| src/lib/http.ts | json/apiError/rateLimited/readJson/origin guard |
| src/db/schema.ts | The 6-table Drizzle schema |
| src/db/seed.ts | Advisory-lock idempotent seed |
| scripts/seed-cli.ts | dotenv-first db:seed entry |
| scripts/smoke.sh | 19-check HTTP contract |
| tests/unit/tailwind-scan-guard.test.ts | The scanner-guard pin |
| tests/e2e/mobile-navigation.spec.ts | The drawer state-machine pin |

---

## Revision Block — v2.0.0 (2026-11-20, session 001)

- `[SR]` Full rewrite of the PAD for the furniture-store codebase (the ely-beauty PAD described the deleted app).
- `[CA]` ADR set refreshed: Drizzle/PG (002), session-cookie identity (003), Tailwind v4 CSS-first + guard (004), integer cents (005), prod-build e2e (006).
- `[SAN]` Session-001 remediation recorded: C-1 scanner-guard fix (`../../` semantics), toolchain repair (P2), SEO surface (P3), e2e suite (P6), docs pivot (P5).
