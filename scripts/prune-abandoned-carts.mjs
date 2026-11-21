#!/usr/bin/env node
/**
 * Prunes abandoned cart/favourites rows left by cookie sessions that never returned.
 *
 * Sessions are cookie-only UUIDs with no sessions table, so orphan detection is purely
 * age-based. cart_items carries only updated_at (set on insert and every mutation);
 * favourites carries only created_at (favourites are inserted/deleted, never mutated).
 * 180 days matches the session cookie's maxAge (src/lib/session.ts) — a session that
 * cannot legally still exist cannot own live rows.
 *
 * Usage:
 *   node scripts/prune-abandoned-carts.mjs            # report only (dry run)
 *   node scripts/prune-abandoned-carts.mjs --apply    # actually delete
 * Footgun guard: MAX_AGE_DAYS is a blunt instrument — a value below ~30 also deletes
 * RECENT ACTIVE carts. Always dry-run first; 180 (the cookie maxAge) is the safe default.
 *   MAX_AGE_DAYS=90 node scripts/prune-abandoned-carts.mjs --apply
 *
 * Reads DATABASE_URL from the environment (same source as the app). Intended for an
 * operator cron (see docs/DEPLOYMENT.md §9) — deliberately NOT wired into any request
 * path: a hot-path scan would couple checkout latency to table size.
 */
import { Pool } from "pg";

const MAX_AGE_DAYS = Number(process.env.MAX_AGE_DAYS ?? 180);
const APPLY = process.argv.includes("--apply");

if (!Number.isInteger(MAX_AGE_DAYS) || MAX_AGE_DAYS < 1) {
  console.error(`MAX_AGE_DAYS must be a positive integer, got ${MAX_AGE_DAYS}`);
  process.exit(2);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(2);
}

const pool = new Pool({ connectionString: databaseUrl });

// One age column per table, matching the actual schema (see header comment).
const targets = [
  { table: "cart_items", ageColumn: "updated_at" },
  { table: "favourites", ageColumn: "created_at" },
];

try {
  console.log(`${APPLY ? "APPLY" : "DRY RUN"} — pruning rows older than ${MAX_AGE_DAYS} days`);
  let total = 0;
  for (const { table, ageColumn } of targets) {
    const predicate = `${ageColumn} < now() - ($1 || ' days')::interval`;
    const count = await pool.query(`SELECT count(*)::int AS n FROM ${table} WHERE ${predicate}`, [String(MAX_AGE_DAYS)]);
    console.log(`  ${table}: ${count.rows[0].n} candidate row(s)`);
    if (APPLY && count.rows[0].n > 0) {
      const deleted = await pool.query(`DELETE FROM ${table} WHERE ${predicate}`, [String(MAX_AGE_DAYS)]);
      console.log(`  ${table}: deleted ${deleted.rowCount}`);
      total += deleted.rowCount;
    }
  }
  console.log(APPLY ? `done — ${total} row(s) deleted` : "done (dry run — pass --apply to delete)");
} catch (error) {
  console.error(`prune failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
} finally {
  await pool.end();
}
