import { describe, expect, it } from "vitest";
import { PgDialect, getTableConfig } from "drizzle-orm/pg-core";
import {
  cartItems,
  categories,
  familyMembers,
  favourites,
  orderItems,
  orders,
  products,
} from "@/db/schema";
import { MAX_LINE_QUANTITY } from "@/lib/cart-math";

/**
 * Session-017 S17-01 pin: CHECK-constraint SQL must be DDL-LEGAL.
 *
 * drizzle's `sql` template turns every interpolated JS primitive into a bound
 * parameter (`$1` + params), which is fine for runtime DML but ILLEGAL when
 * drizzle-kit `push` embeds the check SQL verbatim inside `CREATE TABLE` DDL —
 * Postgres answers `there is no parameter $1` and `npm run db:setup` dies on
 * every empty database. The regression shipped in session-015 (S15-L3 replaced
 * the literal 99 with the interpolated constant) and survived two sessions
 * because warm-DB pushes skip same-name altered checks and no tier pinned the
 * emitted SQL TEXT — the S15-L3 verification checked the bound VALUE instead.
 *
 * This test serializes every CHECK on every schema table through
 * `PgDialect.sqlToQuery()` — the same serializer drizzle-kit push uses — so the
 * DDL-legality invariant is a unit gate, not a fresh-clone discovery.
 * Constants that must reach DDL as literals use `sql.raw(String(…))` at the
 * schema site (safe for module constants; never for user input).
 */

// Every table in src/db/schema.ts — grow this list when the schema grows.
const TABLES = [categories, products, cartItems, favourites, orders, orderItems, familyMembers];

const dialect = new PgDialect();

describe("schema CHECK constraints are DDL-legal (session-017 S17-01)", () => {
  it("every check serializes with zero bind parameters", () => {
    const offenders: string[] = [];
    for (const table of TABLES) {
      for (const check of getTableConfig(table).checks) {
        const q = dialect.sqlToQuery(check.value);
        if (q.params.length > 0 || q.sql.includes("$")) {
          offenders.push(`${check.name}: ${JSON.stringify(q)}`);
        }
      }
    }
    expect(
      offenders,
      `checks whose SQL carries bind placeholders are illegal inside CREATE TABLE DDL: ${offenders.join("; ")}`,
    ).toEqual([]);
  });

  it("the quantity-range check text carries the single authority constant", () => {
    const check = getTableConfig(cartItems).checks.find((c) => c.name === "cart_items_qty_range");
    expect(check, "cart_items_qty_range must exist").toBeDefined();
    const q = dialect.sqlToQuery(check!.value);
    // The emitted TEXT (not the bound value) must read the constant — a stale
    // literal here diverges the DB constraint from cart-math.ts invisibly.
    expect(q.sql).toBe(`"cart_items"."quantity" between 1 and ${MAX_LINE_QUANTITY}`);
  });
});
