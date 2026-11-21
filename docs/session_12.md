# Session 012 — the last-unthrottled-read + drawer-reopen cycle

**Baseline (workspace survived; pulled `b5dfb2f` — operator doc-only, session_12.md; all exit-code-checked):** lint 0/0 · typecheck ✓ · typecheck:tests ✓ · unit 107/107 (17 files) · build cold ✓ · e2e 51/51 · smoke 21/21 · sitemap 274 · DB 22/242 intact from the surviving PG data dir. Dev server re-verified live on both origins; no Tailwind v4 bug.

## What was done

**Audit (read-only subagent; web-application + tdd methodology; deep pass over the session-011 changeset d03a442):** 0 CRITICAL · 0 HIGH · **0 MEDIUM · 2 LOW · 6 INFO.** All session-011 changes verified correct (og merge semantics traced in the installed Next 16.4.2; the staggered-clock eviction pin's arithmetic traced exactly; every doc-claim count statically recounted). The LOWs: `GET /api/summary` is the last unthrottled, unauthenticated, DB-touching read (the S11-L2 class — doc and code agreed it was unlimited, but the posture was inconsistent: health is a select-1 probe, summary runs two indexed queries per call); the api-surface tripwire's regex was formatting-dependent (a one-line GET refactor + dropped limiter would let it pass vacuously on POST's limiter). Deferred verdicts unchanged: migration journal do-later · CSP nonces never · Redis limiter do-later. Config instruction: documented no-op (fifth consecutive session).

**Browser verification (agent-browser):** dev drawer state machine all-pass on both origins; desktop clean (no overflow, 16 cards); **I4 confirmed live** — after Escape-close + reopen the Products submenu still showed `aria-expanded="true"` (expected `false` on a fresh open).

**Remediation (TDD, plan-012):** S12-L1 summary GET throttled 120/min (health stays unlimited as a true probe) — tripwire RED → GREEN, live-verified (78×200 + 429s: the shared 120/min window, the e2e run having consumed 42 first) · S12-L2 api-surface pins restructured to a structural slice (indexOf GET → next `export function`) — bites under any formatting · S12-I2 category og:image, conditional on `categories.image` (21/22 seeded; `lowest-price` deliberately omits — og:image must never be an empty string) — e2e RED → GREEN live-verified · S12-I4 the drawer reopens with the submenu collapsed (`panel !== "mobile"` reset effect) — live-confirmed the bug, e2e RED → GREEN, live-verified post-fix · S12-I3 comment clause (blocked path inserts nothing) · S12-I5 `.gitignore` `*.log` · S12-I6 DEPLOYMENT clarifies the cart cap is combined across methods per client, and the summary/health rows are split.

**Verification — all exit-code-checked:** lint 0/0 · typecheck ✓ · typecheck:tests ✓ · **unit 108/108 (17 files)** · build cold ✓ · smoke 21/21 · **e2e 52/52 ×3** · sitemap **274** · screenshots **12/12** PIL-valid from the dev server.

**Deferred (documented):** migration journal · CSP nonces (never, per threat model) · Redis limiter · checkout-lock tx-body extraction · pre-hydration image-failure fallback · allowedDevOrigins automated gate · docs-counts DOCS-table duplication · info pages keeping the layout's og.

---

I'll start by internalizing the uploaded instructions and checking the workspace state, then proceed through the full task sequence.
Session 011 of the standing instruction. Checking workspace state and pulling the operator's new commit (`docs/session_11.md`):
Pulled `14dc8db` — doc-only, adds `docs/session_11.md` (the session-010 record). Setting up the session-011 plan and reviewing the new session doc:
Session_11.md is my session-010 raw log — context confirmed. PG up, data intact. Running the baseline gate:
**Baseline fully green** (exit-code-checked): unit 105/105 · build cold · e2e 50/50 · smoke 21/21 · sitemap 274. Launching the session-011 audit subagent:
Audit complete: **0 CRITICAL / 0 HIGH / 1 MEDIUM / 2 LOW / 4 INFO** — the MEDIUM is the same og-replace bug class as S10-M1, still live on **product pages** (the only other page-level og export). Now browser verification — dev server, mobile drawer state machine on both origins:
Browser verification complete — and M-1 confirmed live: the product page serves **zero** og:type/og:site_name/og:url tags. Reading all TDD anchors in one pass:
All anchors confirmed. Writing plan-011 and the RED test batch:
RED confirmed on all three fronts (I1 pin, L2 tripwire, category og e2e). Capturing the product-og RED too (its title didn't match my grep), then applying the GREEN batch:
All four REDs captured. Applying the GREEN batch:
Same fixture-design flaw as session-010: 'a' was reinserted while still the only key (stays at the front), and the equal-window expiry makes prune eat the flood. Fixing with staggered clocks so eviction (not prune) is exercised:
I1 GREEN. Pin-bite verification (revert the reorder → expect RED → restore), then the full gate:
Pin-bite proven; unit **107/107 (17 files)**. Now the rebuild and full gate:
Full gate GREEN — e2e **51/51 ×3**, smoke 21/21, sitemap 274, both og fixes live. Now the dev-server screenshots:
12/12 PIL-valid from the dev server. Now the docs sweep with final counts (107/17 unit, 51 e2e):
All green with docs in lockstep. Saving deliverables, committing, and pushing:
Committed `d03a442`. Pushing via the SSH wrapper:
# Session 011 — complete (pushed as `d03a442` to `main` on `nordeim/nordhem-furnishing-store`, remote ref verified by the SSH wrapper)

**Workspace & alignment** — Workspace survived session 010 intact: repo at `f22a819` + the operator's doc-only `14dc8db` (pulled — adds `docs/session_11.md`, the session-010 record). PostgreSQL restarted from the surviving data dir via `docs/setup_pg_z.sh` (22 / 242 intact). Baseline gate fully green (exit-code-checked): lint 0/0 · typecheck ✓✓ · unit 105/105 (16 files) · build cold · e2e 50/50 · smoke 21/21 · sitemap 274. Dev server re-verified live on both origins; no Tailwind v4 bug.

**Audit** (read-only subagent, web-application + tdd skills; deep pass over the session-010 changeset): **0 CRITICAL · 0 HIGH · 1 MEDIUM · 2 LOW · 4 INFO.** The MEDIUM: the SAME openGraph-replace bug class session-010 fixed on `/` was still live on **product pages** — the partial page-level og silently dropped `og:type`/`og:site_name`/`og:url` on every `/p/*` page (verified in the installed Next 16.4.2 and live). Config instruction: documented no-op (fourth consecutive session — both configs sound). Sitemap/SEO verified: 274 canonical roots; the og fixes strengthen it.

**Browser verification** (agent-browser): dev drawer state machine all-pass on both origins, Escape/focus-restore/scroll-unlock, submenu navigation, desktop clean. Product-page og absence confirmed live (the RED evidence).

**Remediation (plan-011, every fix RED→GREEN):**
- **S11-M1** product og full set — e2e RED → GREEN (og:url/og:type/og:site_name live on `/p/*`).
- **S11-I2** category pages adopt the same pattern (og:title = category name; og:url follows the paginated canonical) — e2e RED → GREEN live-verified. Info pages intentionally inherit the layout's og (recorded).
- **S11-I1** rate-limiter fresh-window branch now reorders too (a returning key kept its ancient eviction-queue position despite a fresh window). The first pin fixture was flawed twice over — redesigned with staggered clocks so eviction, not prune, removes the victim; **pin-bite verified** (revert → RED → restore).
- **S11-L2** `GET /api/cart` rate-limited 120/min (DEPLOYMENT's documented posture was the right one — it was an unthrottled unauthenticated DB read) + new `api-surface.test.ts` tripwire · **S11-L1** SmartImage abort delay 2500→4500 ms (CI-slow hydration margin).

**Final gate (exit-code-checked):** lint 0/0 · typecheck ✓✓ · **unit 107/107 (17 files)** · build cold ✓ · smoke 21/21 · **e2e 51/51 ×3 consecutive** · sitemap **274** · screenshots **12/12 PIL-valid from the dev server**. Docs: PAD v2.10.0, SKILL v1.10.0 (§19 lessons), AGENTS/CLAUDE/README counts, worklog Task 129, session_11.md record, plan-011, `.env.example` verified complete and in the commit. Key shredded after the verified push.

Saved for you in download/: [session-011_summary.md](/home/z/my-project/download/session-011_summary.md), [2026-11-21_session-011_remediation-plan.md](/home/z/my-project/download/2026-11-21_session-011_remediation-plan.md), [session_11.md](/home/z/my-project/download/session_11.md), [DEPLOYMENT.md](/home/z/my-project/download/DEPLOYMENT.md), [nordhem-furnishing-store_SKILL.md](/home/z/my-project/download/nordhem-furnishing-store_SKILL.md). The repo is clean at `/home/z/my-project/nordhem-furnishing-store`, `main` synced with origin at `d03a442`. The og:replace class is now closed everywhere it existed; deferred items (migration journal, CSP nonces, Redis limiter, checkout-lock extraction) remain documented in the plan and PAD.
