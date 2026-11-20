/**
 * db:seed CLI entry. Loaded FIRST by `tsx scripts/seed-cli.ts` so dotenv runs before the
 * static import graph pulls in src/db — which throws at import time when DATABASE_URL is
 * missing. An explicit process env always wins (dotenv never overrides — the shadowing
 * contract documented in AGENTS.md).
 */
import { config } from "dotenv";

config();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required (set it in .env — see .env.example)");
  process.exit(1);
}

// Import after dotenv: the @/ alias resolves via tsconfig paths under tsx.
import("../src/db/seed")
  .then(async ({ ensureCatalog }) => {
    await ensureCatalog();
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
