# Deployment Guide — NORDHEM (home-furnishing-store)

NORDHEM ships as a **single Next.js application over one PostgreSQL
database**: one Node process plus Postgres, nothing else. This revision
(2026-11-20, Tasks 115-134; counts re-pinned by the docs-counts test since
Task 131 F-7) replaces the inherited ElyBeauty-era guide wholesale —
that document described Prisma + SQLite file databases, an
`output: "standalone"` build with `.env` baking, `AUTH_SECRET` / Stripe /
`NEXT_PUBLIC_SITE_URL` environment variables, and a Cloudflare-aware rate
limiter, none of which exist in this codebase. Every claim below is verified
against the remediated tree: Drizzle ORM over `node-postgres`
(`src/db/index.ts`), the `{ ok, data | error }` envelope on all six API
routes, integer-cents money re-derived server-side at checkout
(`src/lib/server-data.ts`, `src/lib/utils.ts`), and the "Degrade, Never Fail"
static-catalogue fallback.

## 1. Supported shape

- One Next.js 16 App Router app: 20 page routes + 6 API route handlers under
  `src/app/` (the current build compiles 31 routes).
- One PostgreSQL database: 9 tables defined in `src/db/schema.ts`
  (categories, products, stores, inventory, orders,
  order_items, reviews, inspirations, promotions).
- No external services: no Redis, no queues, no object storage. Product
  imagery is hot-linked from the Pexels CDN through plain `<img>` tags —
  there is no local image pipeline.
- No authentication and mock payments (card / PayNow / GrabPay / Atome
  selectors, flagged "Demo — no charge"). These are documented deferrals
  (`docs/implementation-plan.md`), not omissions to work around.
- The build output is the plain `.next/` directory served by `next start`.
  `next.config.ts` sets three things: the platform security-header set
  (X-Content-Type-Options, X-Frame-Options DENY, Referrer-Policy,
  Permissions-Policy, HSTS) with `poweredByHeader: false` (Task 125 G-1,
  e2e-pinned), and `allowedDevOrigins: ["127.0.0.1"]`, the dev-mode
  HMR/hydration guard (irrelevant to the production build). There is no
  standalone bundle assembly and no `.env` copying into the build.

## 2. Prerequisites

- **Node.js ≥ 20** (verified on Node 24). npm is the package manager;
  `package-lock.json` is the lockfile.
- **A reachable PostgreSQL server.** The **rootless install in §4 is the
  documented and verified method** (PostgreSQL 17.12 served the live-DB
  verification cycle — checkout round-trip, seeding, tracking). Any other
  PostgreSQL — system service, Docker, or a managed instance — works
  identically: the application only ever sees `DATABASE_URL`.

## 3. Install and configure

```bash
git clone https://github.com/nordeim/home-furnishing-store.git
cd home-furnishing-store
npm install
cp .env.example .env    # then edit DATABASE_URL
```

`DATABASE_URL` is the **only** variable the codebase reads (verified: the
sole environment access in `src/` is `src/db/index.ts`). Set it to a
PostgreSQL connection string — with §4's defaults:

```
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/app_db"
```

- There is no `AUTH_SECRET` (auth is deferred), no payment keys (mock
  methods only), and no `NEXT_PUBLIC_SITE_URL` — the canonical origin
  `https://nordhem.sg` is single-sourced as the `SITE_ORIGIN` constant in
  `src/lib/utils.ts` and composed by `src/app/layout.tsx`, `robots.ts` and
  `sitemap.ts` (fs-pinned: no raw origin literal in `src/app`).
- `src/db/index.ts` throws `DATABASE_URL is required` at module load when
  the variable is missing — including during `next build`. It must always
  be present; it may point at an unreachable server while developing on the
  static fallback (§8).
- **Precedence trap:** an exported shell `DATABASE_URL` silently overrides
  `.env` (Next's own env loader never overrides an existing env). If the
  app connects to the wrong database, check `env | grep DATABASE` and pin
  the value per command:
  `DATABASE_URL="postgresql://…" npm run dev`.

## 4. Database installation — rootless PostgreSQL

The supported method installs and runs PostgreSQL **entirely as an
unprivileged user**: the server binaries are extracted from the official
Debian packages into a user-owned prefix, the cluster is initialized with
`initdb` under that prefix, and the server lifecycle runs through `pg_ctl`.
No `sudo`, no `apt-get install`, no systemd, no writes outside the prefix.
This fits restricted hosts — shared sandboxes, VPS user accounts, containers
without init systems — and it is the exact method behind this repository's
live-database verification (PostgreSQL 17.12, port 5432, database `app_db`).

The canonical version is the repo skill `skills/rootless-postgresql/SKILL.md`
(Debian trixie/sid, non-root user with a writable prefix). The commands
below are that method as executed for this codebase.

```bash
set -euo pipefail

# 0. Layout — any writable prefix works (the verification workspace used
#    /home/z/my-project/pg). Port/role/database match drizzle.config.json
#    and the .env.example default: zero configuration drift.
PG_BASE="$HOME/pg"                  # the prefix
PG_MAJOR=17                         # trixie ships 17; resolve dynamically with:
                                    # apt-cache search --names-only '^postgresql-[0-9]+$'
PG_ROOT="$PG_BASE/pgroot"           # extracted binaries (the "install")
PG_DATA="$PG_BASE/pgdata"           # the cluster
PG_LOG_DIR="$PG_BASE/pglog"         # server logs
PG_PORT=5432
PG_ROLE=postgres
PG_SECRET=postgres                  # dev default; scram-authenticated over TCP only
PG_DB=app_db

# 1. Probes — every check must pass before proceeding
[ "$(id -u)" -ne 0 ] || { echo "FAIL: run as a non-root user"; exit 1; }
mkdir -p "$PG_BASE" && [ -w "$PG_BASE" ] || { echo "FAIL: $PG_BASE not writable"; exit 1; }
mkdir -p "$PG_ROOT" "$PG_DATA" "$PG_LOG_DIR" "$PG_BASE/pgdeb"

# 2. Download the official .debs (download only — nothing is installed)
cd "$PG_BASE/pgdeb"
apt-get download "postgresql-${PG_MAJOR}" "postgresql-client-${PG_MAJOR}" \
                 postgresql-common libpq5

# 3. Extract them into the prefix
for f in *.deb; do dpkg-deb -x "$f" "$PG_ROOT/"; done
PGBIN="$PG_ROOT/usr/lib/postgresql/${PG_MAJOR}/bin"
"$PGBIN/initdb" --version     # sanity: the binaries run against system libs

# 4. Initialize the cluster (only if empty).
#    Socket auth = trust (admin convenience, local user only);
#    TCP auth = scram-sha-256 (the app carries the password).
if [ ! -f "$PG_DATA/PG_VERSION" ]; then
  chmod 700 "$PG_DATA"
  "$PGBIN/initdb" -D "$PG_DATA" -U "$PG_ROLE" \
    --auth-local=trust --auth-host=scram-sha-256 \
    --encoding=UTF8 --locale=C.UTF-8
fi

# 5. Point the config at the prefix and the port (idempotent)
PGCONF="$PG_DATA/postgresql.conf"
sed -i "s/^#port = 5432/port = ${PG_PORT}/"                                       "$PGCONF"
sed -i "s|^#unix_socket_directories = .*|unix_socket_directories = '${PG_DATA}'|" "$PGCONF"
sed -i "s/^#listen_addresses = 'localhost'/listen_addresses = 'localhost'/"      "$PGCONF"
sed -i "s/^#logging_collector = off/logging_collector = on/"                     "$PGCONF"
sed -i "s|^#log_directory = 'log'|log_directory = '${PG_LOG_DIR}'|"              "$PGCONF"

# 6. Start (pg_ctl, not systemd) — logs go to $PG_LOG_DIR/postgres.log
"$PGBIN/pg_ctl" -D "$PG_DATA" -l "$PG_LOG_DIR/postgres.log" -w -t 30 start

# 7. Role password + application database (over the trusted socket)
"$PGBIN/psql" -h "$PG_DATA" -p "$PG_PORT" -U "$PG_ROLE" -d postgres \
  -c "ALTER ROLE \"${PG_ROLE}\" WITH LOGIN PASSWORD '${PG_SECRET}';"
"$PGBIN/createdb" -h "$PG_DATA" -p "$PG_PORT" -U "$PG_ROLE" "$PG_DB" \
  || echo "database ${PG_DB} already exists"

# 8. Verify — TCP requires the scram password; this is the app's path
"$PGBIN/pg_isready" -h 127.0.0.1 -p "$PG_PORT"
```

On success the connection string is exactly what `.env` and
`drizzle.config.json` pin:

```
postgresql://postgres:postgres@127.0.0.1:5432/app_db
```

Operational notes:

- **Lifecycle** is `pg_ctl`: `… -D "$PG_DATA" status`, and
  `… -D "$PG_DATA" -m fast -w stop`. Keep start/stop/status scripts next to
  the prefix (the verification workspace keeps them under
  `<prefix>/scripts/`); the whole cluster is plain files under `$PG_DATA`
  — stop the server before copying it wholesale.
- **Auth split:** the Unix socket inside `$PG_DATA` trusts the local user
  (administrative commands never need the password); TCP on 127.0.0.1
  requires the scram password. The application always connects over TCP.
- **Change `PG_SECRET`** for anything exposed beyond loopback, and never
  expose this cluster directly to the internet — it is a single-user
  development-grade deployment.
- **Backups:** `pg_dump` / `pg_dumpall` from the same `$PGBIN` against
  `app_db`.

**Alternatives.** Any reachable PostgreSQL serves equally — a system
service (`apt-get install postgresql`), Docker, or a
managed provider. The application is indifferent; §5–§6 are the same either
way. The rootless method above is the one this repository documents,
verifies, and keeps in lockstep with its pinned connection string.

For a Docker-based local database the repository ships a **postgres-only**
`docker-compose.yml` (Task 118 aligned it to this architecture: PostgreSQL 17
with `app_db`/`postgres`/`postgres` on :5432, matching `drizzle.config.json`
exactly — `docker compose up -d`, then `npx drizzle-kit push`). It
intentionally runs no other service: there is no Redis, no Stripe, and no
init-script mount — the schema needs no PostgreSQL extensions (integer serial
keys, `ilike` search).

## 5. Schema push

There is no migrations folder. The schema is applied by **push** from the
single source of truth `src/db/schema.ts`:

```bash
npx drizzle-kit push
```

On a fresh database this creates all 9 tables; on an existing one it
applies the diff (drizzle-kit asks for confirmation on data-loss
operations). Seeding is automatic afterwards (§6) — no schema or seed
command is wired into `npm run` scripts by design.

> **Dual-config drift warning.** `drizzle.config.json` pins its own
> `dbCredentials.url` (`postgresql://postgres:postgres@127.0.0.1:5432/app_db`)
> and does **not** read `.env`. When your database moves, update **both**
> `.env` and `drizzle.config.json`, or the app and the push tool will
> silently disagree.

## 6. Seeding — automatic on first read

No seed command exists. `ensureSeed()` in `src/lib/server-data.ts` runs
lazily on the first database read of a server process. It checks whether
the `products` table has any row and, **only when it is empty**, inserts
the static catalogue from `src/lib/catalog.ts`:

- 24 products, 8 categories, 3 stores (Tampines, Jurong, Alexandra),
- 6 inspiration rooms, 3 promotions (`WELCOME10`, `MAKAN15`, `FLAT20`),
- 72 per-store inventory rows (24 products × 3 stores) with aisle/bin
  locations, and 5 sample reviews.

The insert is single-flight (one shared promise per process) and every row
uses `onConflictDoNothing`, so concurrent first requests cannot double-seed.

Consequences for operators:

- **Re-seeding is a no-op once data exists.** The seed is a bootstrap, not
  a refresh: it never overwrites live rows (it returns early when
  `products` is non-empty). Admin edits, orders and customer reviews are
  safe from it.
- **To force a full reseed** on a database you are willing to reset (this
  destroys orders and reviews — real traffic), with any psql client (§4's
  `"$PGBIN/psql"` or a system psql):
  ```bash
  PGPASSWORD=postgres psql -h 127.0.0.1 -U postgres -d app_db \
    -c 'TRUNCATE order_items, orders, reviews, inventory,
        products, categories, stores, inspirations, promotions
        RESTART IDENTITY CASCADE;'
  ```
  then restart the app and open any database-backed page (e.g. `/shop`).

## 7. Build and run

```bash
npm run build     # DATABASE_URL must be in the environment (§3) — module-
                  # level import of src/db throws otherwise, even for build
npm run start     # next start — port 3000 by default (PORT overrides)
```

- There is no standalone output and no `.env` copying: environment changes
  do **not** require a rebuild, only a server restart.
- Run a process manager (systemd, pm2, Docker) around
  `DATABASE_URL=… npm run start` (or `next start` directly) from the repo
  root. The Node process is stateless apart from two in-process caches
  (§8).
- Development: `npm run dev` (same environment requirement).
- The Playwright suite boots its own production server on **:3100** with a
  pinned `DATABASE_URL` (`playwright.config.ts` `webServer`) — keep the
  port free while testing.

## 8. Production notes

**Degrade, Never Fail — the operational contract.** Every database read in
`src/lib/server-data.ts` is wrapped in try/catch with a static-catalogue
fallback: the storefront keeps rendering (home, shop, search, product
pages, inspiration) even when PostgreSQL is unreachable. Write paths have
no fallback and genuinely require the live database:

| Path | Needs live DB? |
|---|---|
| Browse / search / product pages | No — static fallback (`src/lib/catalog.ts`) |
| `POST /api/checkout` (order placement) | Yes |
| `POST /api/reviews` (publish a review) | Yes |
| `POST /api/orders/track` (order tracking) | Yes — fail-closed |
| `POST /api/promotions/validate` | Partial — falls back to the static promo table |

`GET /api/health` is the probe: `{"ok":true,"data":{"db":"up"}}` iff the database answers
`select 1`, HTTP 500 otherwise. Monitor it; a 500 means the deployment has
degraded to catalogue-only browsing.

**Money is server-truth.** `placeOrder()` re-derives every total from the
live product rows and promo rules; the client's totals payload is ignored
(the checkout route passes zeroed totals deliberately). All amounts are
integer cents. Prices are GST-inclusive (9%, back-calculated for the
receipt line); delivery is $12 standard / free at ≥ $200 net / $29 express
/ $0 Click & Collect; order numbers are `NH-YYYYMMDD-XXXXXX` with a random
base-36 suffix.

**Reverse proxy.** Terminate TLS in front (Caddy/Nginx) and forward to the
Node port. The checkout limiter keys on the **rightmost entry** of
`X-Forwarded-For` (the shared `clientIp()` seam in `src/lib/rate-limit.ts`,
Task 125 G-2 — the leftmost hop is the client-forgeable form), falling back
to `"direct"` when the header is absent. When deploying behind a proxy,
strip or override `X-Forwarded-For` at the edge so the rightmost hop is the
proxy-appended client address, otherwise a client can forge its own bucket
key (the documented TRUST_PROXY caveat).

**Single-process state.** The checkout rate limiter is an in-process fixed
window (20 attempts/min/IP, a module-scope Map) and the seed is a
single-flight per-process promise. Both reset on restart and neither is
shared between processes. The intended deployment is one Node process;
before scaling to multiple replicas, move rate limiting to a shared store
(there is no session state to share — auth is deferred).

## 9. Updating an existing deployment

```bash
git pull
npm install
npx drizzle-kit push        # apply schema changes (§5 dual-config warning)
rm -rf .next                # cold build — mandatory, see below
DATABASE_URL="postgresql://…" npm run build
# restart the server process (§7)
```

The `rm -rf .next` is not ritual: Tailwind v4's candidate scan guard (the
`@source not` block at the top of `src/app/globals.css`) keeps prose files
from injecting class candidates, and a warm `.next` cache can mask both
the failure and the fix. The repository's gate mandates cold builds.

## 10. Verification checklist

There is no hosted CI; the local gate (AGENTS.md) is the only gate. Run it
before every deploy of code changes:

```bash
rm -rf .next && DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/app_db" npm run build
npm run typecheck
npm run typecheck:tests
npm run lint                # 0 errors / 0 warnings expected
npm run test                # 180/180 unit (Vitest, pure seams; TZ-pure — the three-TZ run: UTC/Singapore/New_York)
npm run test:e2e            # 125/125 e2e — needs the live Postgres
```

One-time before e2e: `npm run test:e2e:install` (installs the pinned
Playwright Chromium build). The e2e suite builds and boots the production
server itself on :3100.

Runtime probes against a running deployment:

```bash
curl -s localhost:3000/api/health      # {"ok":true,"data":{"db":"up"}} — database answers
curl -s localhost:3000/api/products    # {"ok":true,"data":[…24 products…]}

# promo boundary (min spend is inclusive: $150.00 exactly passes)
curl -s -X POST localhost:3000/api/promotions/validate \
  -H 'content-type: application/json' \
  -d '{"code":"WELCOME10","subtotalCents":15000}'      # {"ok":true,…}

# end-to-end: place a demo order from /checkout in a browser (any payment
# selector — they are all "Demo, no charge"), then:
curl -s -X POST localhost:3000/api/orders/track \
  -H 'content-type: application/json' \
  -d '{"orderNumber":"NH-YYYYMMDD-XXXXXX","email":"<the email you entered>"}'
# {"ok":true,…} on match; 404 on mismatch — tracking is fail-closed
```

## 11. Common production issues

| Symptom | Cause | Fix |
|---|---|---|
| `Error: DATABASE_URL is required` at boot or build | `src/db/index.ts` throws at module load — the variable is absent | Set it in `.env` (§3); while developing on the fallback it may point anywhere |
| `/api/health` returns 500 | Database unreachable — expected on the static fallback | Start the cluster (§4) and re-check; browsing still works (§8) |
| `POST /api/checkout` → 500 `CHECKOUT_FAILED` | Write path has no fallback: DB down, schema not pushed, or seed not run | Verify §4 → §5 → §6 in order, then retry |
| App connects to the wrong DB / seed logs SASL password errors | An exported shell `DATABASE_URL` beats `.env` (Next's own env loader never overrides an existing env) | `env \| grep DATABASE`, pin the value per command (§3) |
| `drizzle-kit push` touches the wrong database | `drizzle.config.json` pins its own URL, independent of `.env` | Update both when the database moves (§5) |
| Build fails: `Missed semicolon` in `globals.css` | Tailwind v4's candidate scan read a class-like string from a prose file — the `@source not` guard was removed, or a colon-form arbitrary value was added somewhere | Keep the guard; write slash-form `aspect-[16/9]`, never colon-form; verify with a COLD build (§9) |
| 429 `RATE_LIMIT` on checkout | In-process fixed window: 20 attempts/min/IP (rightmost `X-Forwarded-For` hop, "direct" without the header) | Wait a minute; strip/override `X-Forwarded-For` at the edge so the rightmost hop is proxy-appended (§8) |
| `pg_ctl: another server might be running` / rootless start fails | Stale `postmaster.pid` after a hard kill, or the log directory is missing | `pg_ctl status`; remove `$PG_DATA/postmaster.pid` only when no postgres process owns it; `mkdir -p` the log dir; retry (§4) |
| e2e: browser not found | Playwright Chromium not installed | `npm run test:e2e:install` once |
| e2e: port 3100 in use / suite hangs at webServer | A previous e2e webServer is still alive | Kill the leftover `next start` process on :3100, re-run |
| e2e checkout journey fails with `CHECKOUT_FAILED` | The journey places real orders — it needs the live database | Start Postgres (§4), `npx drizzle-kit push` (§5), re-run |

## 12. Pushing changes to this repository

Code and doc deployments go to **main only** (no feature branches), with
Conventional Commit messages, through the SSH wrapper — full runbook:
`docs/how-to-git-push-using-ssh-wrapper_SKILL.md`. The wrapper's built-in
default remote is stale (`nordeim/ely-beauty`), so the `--remote` override
is **mandatory**:

```bash
python3 docs/ssh_git_wrapper_v3.py --key-file /secure/key-outside-the-repo \
  --remote git@github.com:nordeim/home-furnishing-store.git
```

Run the §10 gate before every push. The wrapper materializes the key into
a 0600 temp file outside the repo, pushes `HEAD:refs/heads/main`, re-queries
the remote to verify the ref equals local HEAD, then shreds the temp key.
Never commit the key (`.gitignore` rejects `*.key`, `ssh-key.txt`, `.env`).
