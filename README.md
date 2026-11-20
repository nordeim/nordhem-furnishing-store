# Nordhem Furnishing Store — an IKEA Singapore storefront re-creation

An independent, educational re-creation of <https://www.ikea.com/sg/en/> built on Next.js 16 (App Router), React 19,
TypeScript (strict), Tailwind CSS 4 and PostgreSQL via Drizzle ORM. It reproduces the live home page's structure and
design tokens and adds working commerce flows (a functional superset of the marketing site).

> Not affiliated with or endorsed by Inter IKEA Systems B.V. Product names and imagery are hot-linked from ikea.com for
> demonstration; prices are a snapshot of the public site and are sample data.

## What is in the box

| Area | Routes |
|---|---|
| Home (parity with the live page: category strip, shoppable Christmas hero, promos, carousels, services, guides, footer) | `/` |
| Browse | `/cat/[slug]` (sort, price filter, pagination), `/search?q=`, `/p/[slug]` |
| Shopping | `/cart`, `/favourites` (shopping list), `/checkout`, `/orders/[orderNo]`, `/track-order` |
| Account-lite | `/ikea-family` (Family sign-up; `/profile` redirects here) |
| Long tail of IKEA content URLs | `/[...slug]` — summary page + link to the official page, with a product rail where relevant |
| SEO | `/sitemap.xml` (home + 23 categories/collections + all 242 products), `/robots.txt` (private surfaces disallowed), `/manifest.webmanifest`, Organization/WebSite/Product JSON-LD |
| API | `/api/cart`, `/api/favourites`, `/api/summary`, `/api/search`, `/api/checkout`, `/api/family`, `/api/orders/track`, `/api/health` |

## Commands

```bash
npm install
bash docs/setup_pg_z.sh         # OPTIONAL: rootless local PostgreSQL on :5432 (postgres:postgres/app_db)
cp .env.example .env            # DATABASE_URL + NEXT_PUBLIC_SITE_URL
npm run db:setup                # drizzle-kit push + idempotent seed (23 categories, 242 products)
npm run dev                     # http://localhost:3000 — the catalog seeds itself on first request
npm test                        # unit tests (Vitest, 52 tests)
npm run test:e2e                # Playwright against the production build on :3100 (build first)
npm run build && npm start      # production
BASE_URL=http://127.0.0.1:3000 scripts/smoke.sh   # HTTP end-to-end smoke test (server must be running)
```

`DATABASE_URL` is read from `.env` (never shadowed: dotenv does not override an explicit env).

### The quality gate (no hosted CI — this chain is the only gate)

```bash
npm run lint && npm run typecheck && npm run typecheck:tests && npm test && npm run build \
  && BASE_URL=http://127.0.0.1:3100 scripts/smoke.sh && npm run test:e2e
```

## Architecture

- `src/content/home.json` — home-page copy, links and image URLs captured from the live page.
- `src/content/catalog.json` — 242 real products captured from the live category pages by `scripts/capture-catalog.py`
  (sequential, rate-limited; re-run to refresh). `src/db/seed.ts` loads it idempotently under a Postgres advisory lock.
- `src/lib/*` — pure, unit-tested logic (`cart-math`, `money`, `validation`, `images`, `paths`, `links`, `rate-limit`, `seo`)
  and server data access (`catalog`, `shopping`). Money is integer cents everywhere.
- Server Components by default; client islands only for interaction (header/search, carousels, cart, forms).
- Design tokens (`--colour-*` measured from IKEA's stylesheet) live in `src/app/globals.css` under `@theme`.
- The mobile drawer is **conditionally mounted** (React state), never a JS-toggled `hidden` class — the Tailwind v4
  display-utility bug class. Pinned by `tests/e2e/mobile-navigation.spec.ts`.
- The Tailwind v4 class scanner is fenced by `@source not` in `globals.css` (root markdown, `docs/`, `skills/`,
  `tests/`, `scripts/` are excluded — paths are relative to the CSS file, so root targets carry `../../`).
  Pinned by `tests/unit/tailwind-scan-guard.test.ts`.

## Security & reliability notes

- Cart, shopping list and order ownership use an opaque `httpOnly`, `SameSite=Lax` session cookie (`ikea_sid`); there are no user accounts.
- All mutations validate input with Zod, use parameterised Drizzle queries, reject cross-origin `Origin` headers, and are rate limited.
- Order totals are recomputed from database prices inside the checkout transaction; the client never supplies a price.
- Order confirmation pages are visible only to the placing session; `/track-order` needs order number **and** email and
  returns one generic error for either mismatch.
- Logs are structured JSON and never include names, emails, phone numbers or addresses.

## Known limitations

- Checkout is a demo: no payment, no inventory, no emails. Delivery fee / free-delivery threshold are demo constants in `src/lib/cart-math.ts`.
- Rate limiting is per-process memory; a multi-instance deployment needs a shared store.
- No Content-Security-Policy header yet (needs per-request nonces with Next 16); other security headers are set in `next.config.ts`.
- Images load from ikea.com; if that host is unreachable tiles fall back to a neutral placeholder.
- Rooms, ideas, services and policy pages are summarised, not fully re-authored.
- Playwright runs Chromium only (the headless-shell build); WebKit/Firefox are not installable in the target sandbox.

## Testing

| Tier | Runner | Scope |
|---|---|---|
| Unit (70 tests, 9 files) | Vitest | Pure seams: cart math, money, validation schemas, paths/search helpers, rate-limit windows, content contracts, SEO builders, the Tailwind scan guard |
| E2E (Chromium) | Playwright | `mobile-navigation` (iPhone 13 viewport — the conditional-mount drawer), `storefront` (home/listing/product/search/cart), `seo-platform` (sitemap, robots, manifest, JSON-LD, noindex) |
| Smoke (21 checks) | bash `scripts/smoke.sh` | Pages, validation rejections, cart → checkout → track round-trip, cross-session order isolation |
