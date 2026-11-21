# Session 015 — the lint-gate repair + mutation-surface probes + root-census cycle

**Environment:** workspace rebuilt from a fresh clone (sandbox recycled): npm install (lockfile clean, zero drift), rootless PostgreSQL 17 via docs/setup_pg_z.sh, db:setup → 22/242, chromium-1255 restored for Playwright 1.65.1, paramiko reinstalled. Fresh clone at b333b72.

**Baseline (exit-code-checked):** typecheck ✓ · typecheck:tests ✓ · unit 112/112 (18 files) · sitemap 274 (live) · dev server hydrated on BOTH origins. **lint ✗ — 1 error + 1 warning (header.tsx:49/:126) — the repo's first red lint**, while sessions 012–014 all recorded "lint 0/0 · exit-code-checked". Live browser verification (agent-browser): drawer open/close/reopen + S12-I4 submenu reset, Escape + focus restore, scroll lock/unlock, S13-L2 lg-crossing + S14-I1 logo focus, desktop mega-menu open/outside-close, no horizontal overflow at 390/768/1440, zero console errors — **no Tailwind v4 display-utility bug; the conditional-mount pattern holds**.

**Audit** (read-only subagent; web-application + tdd + tailwind-patterns methodology): **0 CRITICAL · 2 HIGH · 2 MEDIUM · 3 LOW · 3 INFO**. S15-H1/H2 lint-gate red + gate-truth broken; M1 cart PATCH/DELETE + favourites DELETE untested in every tier; M2 junk/secret-adjacent tracked files; L1 indirection setState; L2 fixed-list scan guard; L3 hard-coded 99; I1/I3 doc order + unpinned desktop mega-menu; I2 zod email soft-deprecation (documented no-action). Config instruction (vitest/playwright): audited sound — documented no-op, 9th consecutive session.

**Remediation (plan-015, TDD):**
- **S15-H1** RED (lint exit 1) → GREEN (exit 0): the S12-I4 submenu-reset effect is deleted; `close()` (useCallback) resets both `panel` and `mobileProductsOpen`, and every leave path funnels through it; the S14-I1 cleanup captures `headerRef.current` at effect start. Drawer semantics re-verified live post-refactor.
- **S15-M1** smoke 21 → **26**: favourite POST pin, cart PATCH (quantity→3), cart DELETE (itemCount→0), favourite DELETE (favouriteIds→[]), cart re-add — verified exit 0 on dev (:3000) and prod (:3100).
- **S15-M2** `git rm docs/start_server_log.txt docs/status_pg.txt docs/nordherm-sonnet5.5.zip` (foreign `.env` diff w/ production domain + redacted AUTH_SECRET; shell-history paste; 324 KB binary).
- **S15-L2** the scan guard gains a root CENSUS test (any root file neither excluded nor benign → RED; unexpected root dirs → RED). Born-GREEN: the fence was complete; `.gitignore`/`*.tsbuildinfo` documented in the ignore set.
- **S15-L3** `cart_items_qty_range` interpolates MAX_LINE_QUANTITY; constraint SQL verified byte-identical (`between 1 and 99`); db:push clean.
- **S15-I1** AGENTS/CLAUDE/PAD state the real pipeline order (rate limit → CSRF → Zod → Drizzle). **S15-I3** two desktop mega-menu e2e pins (the first outside-close draft RED — the open panel overlays the hero; dispatches pointerdown on `<main>`, then GREEN alone and in-suite).

**Verification — all exit-code-checked:** lint 0/0 · typecheck ✓ · typecheck:tests ✓ · **unit 113/113 (18 files)** · build cold ✓ · smoke **26/26** · **e2e 55/55** · sitemap **274** · screenshots **12/12** PIL-valid from the dev server.

**Deferred (documented):** migration journal · CSP nonces · Redis limiter · I-2 `z.string().email()` soft-deprecation (migrate at next validation touch) · checkout-lock tx-body extraction · pre-hydration image-failure fallback.
