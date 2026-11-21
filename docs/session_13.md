# Session 013 — the overflow-bound + census + lg-breakpoint cycle

**Environment:** the sandbox was RECYCLED before this session — fresh `git clone` at `1bf5db8` (operator doc-only: session_13.md), `npm install` (lockfile clean, zero drift), `.env` recreated, chromium-1255 restored (`npx playwright install chromium`), and the PG data dir **repaired in place**: the reset pruned only its *empty* subdirectories (pg_notify, pg_stat, pg_logical/snapshots, pg_multixact/*, …), which were recreated with mode 700; the server then recovered cleanly with the data intact (22 / 242 — no reseed).

**Baseline (all exit-code-checked):** lint 0/0 · typecheck ✓ · typecheck:tests ✓ · unit 108/108 (17 files) · build cold ✓ · e2e 52/52 · smoke 21/21 · sitemap 274. Dev server re-verified live on both origins (S12-I4 submenu reset holding); no Tailwind v4 bug.

## What was done

**Audit (read-only subagent; web-application + tdd methodology; deep pass over the session-012 changeset 7d51eed):** 0 CRITICAL · 0 HIGH · **2 MEDIUM · 2 LOW · 3 INFO.** All nine session-012 areas verified correct. The MEDIUMs: `optionalDollars` validated the dollar input but never bounded the cent output — `?max=1e308` → Infinity cents, `?max=1e17` → 1e19 cents, both blowing the Postgres bind and 500ing every `/cat/*` and `/search` render (live-confirmed: both URLs 500) in violation of the fallback contract; DEPLOYMENT §10's gate counts had sat at session-008 figures (90/14/44) for five sessions because the docs-counts census did not cover DEPLOYMENT.md. LOWs: DEPLOYMENT §1 self-contradicted §8 (claimed four headers/no HSTS while the code ships six incl. HSTS since session-009); the drawer stayed scroll-locked with a live focus trap when the viewport crossed lg (live-confirmed at 1440px). Config instruction: documented no-op (sixth consecutive session). Deferred verdicts: migration journal do-later · CSP nonces never · Redis limiter do-later.

**Remediation (TDD, plan-013):** S13-M1 `optionalDollars` now returns `undefined` unless the cents are a safe integer ≤ int32 max — unit RED (1e308 / 1e17 / 21474836.48 boundary) → GREEN, and all three URLs verified **200** live (the $21,474,836.47 boundary still filters) · S13-M2 DEPLOYMENT.md joined the docs-counts census (DOCS array + per-doc it, RED vs the stale 90/14/44) and §10 now reads 110/17/53 · S13-L1 §1 states the six-header truth incl. HSTS, the intro marker moved to session-013, and the stale "HSTS does not apply here" sample-facts item was dropped · S13-L2 a `matchMedia("(min-width: 1024px)")` listener closes the drawer through the normal path when the viewport crosses lg — e2e RED → GREEN (drawer unmounted, scroll unlocked) · S13-I2 both cosmetic script nits fixed.

**Verification — all exit-code-checked:** lint 0/0 · typecheck ✓ · typecheck:tests ✓ · **unit 110/110 (17 files)** · build cold ✓ · smoke 21/21 · **e2e 53/53 ×3** · sitemap **274** · screenshots **12/12** PIL-valid from the dev server.

**Deferred (documented):** migration journal · CSP nonces (never, per threat model) · Redis limiter · checkout-lock tx-body extraction · pre-hydration image-failure fallback · allowedDevOrigins automated gate · docs-counts DOCS-regex duplication · info pages keeping the layout's og · e2e summary-bucket sharing (benign, documented).

---

I'll start by organizing this large task into a structured TODO list, then begin execution.
Session 012 of the standing instruction. Checking workspace state and pulling the operator's new commit (`docs/session_12.md`):
Pulled `b5dfb2f` — doc-only, adds `docs/session_12.md` (the session-011 record). Reviewing it and restoring the environment:
Session_12.md is my session-011 raw log — context confirmed. Environment survived, PG up, data intact. Running the baseline gate:
**Baseline fully green** (exit-code-checked): unit 107/107 (17 files) · build cold · e2e 51/51 · smoke 21/21 · sitemap 274. All session-011 fixes hold. Launching the session-012 audit subagent:
Audit complete: **0 CRITICAL / 0 HIGH / 0 MEDIUM / 2 LOW / 6 INFO** — session-011 changes all verified correct. Findings: summary GET is the last unthrottled DB read (S11-L2 class), api-surface regex is formatting-dependent, plus 6 INFOs (category og:image, drawer submenu persistence, comment nit, .gitignore, DEPLOYMENT wording). Now browser verification — including capturing the drawer-submenu issue live:
The selector found nothing — inspecting the actual drawer DOM to find the real IDs:
**I4 confirmed live**: after close/reopen, Products still shows `aria-expanded="true"` (should be `false` on a fresh open). Completing browser verification:
All evidence captured. Reading every edit anchor in one pass:
All anchors read. Checking the last unknowns (Panel type, imageUrl usage, category image data) before writing the plan:
All unknowns resolved: `Panel = "products" | "mobile" | null` (drawer = `"mobile"`), `imageUrl` in `src/lib/images.ts`, categories 21/22 have images (og:image must be conditional). Writing plan-012 and the RED batch:
RED confirmed on all fronts (null-image category is `lowest-price` — the sofas pin is safe; cart slice stays green under the structural bound). Applying the GREEN batch:
Unit **108/108 (17 files)** GREEN. Rebuilding and running the full gate:
Full gate GREEN — e2e **52/52 ×3**, smoke 21/21, sitemap 274, og:image live on sofas (correctly omitted on lowest-price), and the summary limiter live-verified (429s after the shared 120/min window budget — 78+42=120 exactly). Now dev-server screenshots:
12/12 PIL-valid; drawer fix live-verified on dev (`aria-expanded: "false"` on reopen). Now the docs sweep with final counts (108/17, 52):
All green with docs in lockstep. Saving deliverables, committing, and pushing:
Committed `7d51eed`. Pushing via the SSH wrapper:
# Session 012 — complete (pushed as `7d51eed` to `main` on `nordeim/nordhem-furnishing-store`, remote ref verified by the SSH wrapper)

**Workspace & alignment** — Workspace survived session 011 intact: repo at `d03a442` + the operator's doc-only `b5dfb2f` (pulled — adds `docs/session_12.md`, the session-011 record). PostgreSQL restarted from the surviving data dir via `docs/setup_pg_z.sh` (22 / 242 intact). Baseline gate fully green (exit-code-checked): lint 0/0 · typecheck ✓✓ · unit 107/107 (17 files) · build cold · e2e 51/51 · smoke 21/21 · sitemap 274. Dev server re-verified live on both origins; no Tailwind v4 bug.

**Audit** (read-only subagent, web-application + tdd skills; deep pass over the session-011 changeset d03a442): **0 CRITICAL · 0 HIGH · 0 MEDIUM · 2 LOW · 6 INFO** — all session-011 changes verified correct (og merge semantics traced in the installed Next 16.4.2, the staggered-clock eviction pin's arithmetic traced exactly, every doc-claim count statically recounted). The LOWs: `GET /api/summary` was the last unthrottled, unauthenticated, DB-touching read (the S11-L2 class — doc and code agreed "unlimited", but summary runs two indexed queries per call, unlike the select-1 health probe); the api-surface tripwire regex was formatting-dependent. Config instruction: documented no-op (fifth consecutive session). Sitemap/SEO verified: 274 canonical roots.

**Browser verification** (agent-browser): drawer state machine all-pass on both origins, desktop clean — and the audit's I4 confirmed live: after close/reopen the Products submenu still showed `aria-expanded="true"`.

**Remediation (plan-012, every fix RED→GREEN):**
- **S12-L1** summary GET throttled 120/min (health stays unlimited as a true probe) — live-verified: 78×200 + 429s = the shared 120/min window budget exactly.
- **S12-L2** api-surface pins restructured to a structural slice (indexOf GET → next `export function`) — bites under any formatting; now pins cart and summary GET.
- **S12-I2** category og:image, conditional on `categories.image` (21/22 seeded; `lowest-price` deliberately omits — og:image must never be an empty string) — both branches live-verified.
- **S12-I4** the mobile drawer reopens with the submenu collapsed (the flag survived the drawer's conditional unmount) — bug live-confirmed, fixed via a `panel !== "mobile"` reset effect, live-verified post-fix (`"false"`).
- **S12-I3/I5/I6** rate-limit comment clause · `.gitignore` `*.log` · DEPLOYMENT clarifies the cart cap is combined across methods per client and splits the health/summary rows.

**Final gate (exit-code-checked):** lint 0/0 · typecheck ✓✓ · **unit 108/108 (17 files)** · build cold ✓ · smoke 21/21 · **e2e 52/52 ×3 consecutive** · sitemap **274** · screenshots **12/12 PIL-valid from the dev server**. Docs: PAD v2.11.0, SKILL v1.11.0 (§20 lessons), AGENTS/CLAUDE/README counts, worklog Task 130, session_12.md record, plan-012, `.env.example` verified complete and in the commit. Key shredded after the verified push.

Saved for you in download/: [session-012_summary.md](/home/z/my-project/download/session-012_summary.md), [2026-11-21_session-012_remediation-plan.md](/home/z/my-project/download/2026-11-21_session-012_remediation-plan.md), [session_12.md](/home/z/my-project/download/session_12.md), [DEPLOYMENT.md](/home/z/my-project/download/DEPLOYMENT.md), [nordhem-furnishing-store_SKILL.md](/home/z/my-project/download/nordhem-furnishing-store_SKILL.md). The repo is clean at `/home/z/my-project/nordhem-furnishing-store`, `main` synced with origin at `7d51eed`. No unthrottled unauthenticated DB-touching read remains; deferred items (migration journal, CSP nonces, Redis limiter, checkout-lock extraction) stay documented in the plan and PAD.
