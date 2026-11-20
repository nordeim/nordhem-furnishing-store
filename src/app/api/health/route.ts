import { db } from "@/db";
import { sql } from "drizzle-orm";
import { json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return json({ ok: true }, 200);
  } catch {
    return json({ ok: false }, 500);
  }
}
