# Deployment Guide — Nordhem Furnishing Store

Nordhem is a Next.js 16 (App Router) storefront with a **PostgreSQL** database
accessed through Drizzle ORM. This guide covers the supported production paths
and the environment contract. (Rewritten in session 003 — the previous revision
described the pre-rewrite ElyBeauty app: SQLite, Prisma, AUTH_SECRET, an admin
console, Stripe, and Cloudflare client-IP handling that this codebase never
had.)

## 1. Prerequisites

- Node ≥ 20, npm ≥ 10.
- A PostgreSQL 15+ server (managed or self-hosted). For local development,
  `docs/setup_pg_z.sh` + `skills/rootless-postgresql/SKILL.md` set up a
  rootless PostgreSQL 17 in `pg/`.

## 2. Build

```bash
npm install
npm run db:setup       # drizzle-kit push (creates/updates tables) + idempotent seed
npm run build          # next build (Turbopack)
```

`db:seed` is idempotent: it seeds the catalog (23 categories / 242 products
from `src/content/catalog.json`) only when the tables are empty, so re-running
is always safe.

`NEXT_PUBLIC_SITE_URL` is baked into the sitemap, robots, canonical URLs, and
JSON-LD **at build time** — set it to the public origin before
`npm run build`. Editing it without rebuilding leaves the sitemap/robots on
the old origin while per-request canonicals flip: a silent divergence.

## 3. Run

```bash
npm run start          # next start on $PORT (default 3000)
```

Health probe: `GET /api/health` returns `{"ok":true}` when the database
answers (`SELECT 1`).

## 4. Environment contract

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | `postgresql://user:pass@host:5432/app_db` |
| `NEXT_PUBLIC_SITE_URL` | build | Public origin, e.g. `https://nordhem.example` — feeds sitemap/robots/canonicals/JSON-LD |
| `TRUSTED_PROXY_DEPTH` | no | See §5. Unset = 1 (one trusted proxy). |

Start from `.env.example` (`cp .env.example .env`) — it documents every
variable above.

The session cookie (`ikea_sid`) is `HttpOnly`, `SameSite=Lax`, and `Secure`
whenever `x-forwarded-proto: https` **or** `NODE_ENV=production`. A production
server that terminates TLS itself (no proxy) must therefore serve HTTPS or
the browser will refuse the cookie.

## 5. Reverse proxy and rate limiting

All API limiters (cart 120/min, search 90/min, checkout 10/min, order
tracking 10/min, family 5/min) key on the client IP derived from
`x-forwarded-for` (`src/lib/http.ts` → `clientKey`):

- **Behind a proxy** (the supported posture): the proxy **appends** the client
  IP to `x-forwarded-for`, so the key counts `TRUSTED_PROXY_DEPTH` hops from
  the END (default 1 = the proxy-added entry — trustworthy). Two chained
  proxies → `TRUSTED_PROXY_DEPTH=2`.
- **Direct exposure** (no proxy): set `TRUSTED_PROXY_DEPTH=0` — client-supplied
  `x-forwarded-for` values are ignored entirely and every caller shares the
  `unknown` bucket (fail closed; without a real proxy there is no per-client
  IP signal anyway — `x-real-ip` still works if your LB sets it).
- Forward `X-Forwarded-Proto: https` from the proxy so cookie attributes and
  the CSRF origin check stay correct.

The limiters are in-memory fixed windows (per server instance). A
multi-instance deployment needs an external store to keep them accurate.

## 6. Updating

```bash
git pull
npm install
npm run db:setup       # after schema changes (drizzle-kit push)
npm run build
# restart the server process
```

## 7. Smoke test and verification checklist

```bash
BASE_URL=http://127.0.0.1:3000 scripts/smoke.sh   # 21 checks
curl -s $ORIGIN/api/health                        # {"ok":true}
curl -s $ORIGIN/sitemap.xml | grep -c "<loc>"     # 267 (2 static + 23 cats + 242 products)
curl -s $ORIGIN/robots.txt                        # sitemap pointer + disallows
npm run lint && npm run typecheck && npm run typecheck:tests
npm run test                                      # Vitest unit suite
npm run build
npm run test:e2e                                  # Playwright (boots :3100 itself)
```

Loopback host required for the smoke cookie jar — the production cookie is
`Secure`, and curl only returns Secure cookies to plain-HTTP loopback hosts
(see the note in the script header).

## 8. Common production issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| Cookie never sent; cart always empty | Production server on plain HTTP without `x-forwarded-proto: https` → `Secure` cookie refused | Serve HTTPS or terminate TLS at a proxy that forwards the header |
| 429s from a single office/CGNAT IP | Limiters key per-IP behind the proxy; shared egress IPs share buckets | Wait for `Retry-After`; move to a shared-store limiter if it recurs |
| Sitemap shows the old domain | `NEXT_PUBLIC_SITE_URL` changed without a rebuild (prerendered route) | Rebuild |
| `EADDRINUSE :3100` during e2e | A previous server is alive (process renames to `next-server`) | `pkill -f next-server` |
| `DATABASE_URL is required` at boot | `.env` missing or not readable by the process | `cp .env.example .env`, fill values, restart |

## 9. Known limitations

- No CSP header yet (needs per-request nonces on Next 16).
- `drizzle-kit push` dev posture — no migration journal for auditable DDL history.
- Cart/favourites rows from abandoned first-visit sessions are never swept.
- The sitemap is prerendered at build time; catalog changes require a rebuild.
