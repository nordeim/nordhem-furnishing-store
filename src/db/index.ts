import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

function createPool(): Pool {
  const created = new Pool({ connectionString: databaseUrl });
  // An unhandled pool-level 'error' (idle client / backend disconnect) would crash the process;
  // log it instead so the failure surfaces per-request via guard(). Attached here (not at module
  // scope) so dev HMR reloads never stack duplicate listeners on the cached pool.
  created.on("error", (error) => {
    console.error(JSON.stringify({ event: "db.pool_error", message: error instanceof Error ? error.message : String(error) }));
  });
  return created;
}

// Deliberately NOT exported: `db` is the sole handle, so every query funnels through
// one construction (and the HMR-cached global) — session-005 M-3.
const pool = globalForDb.__arenaNextJsPostgresqlPool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);
