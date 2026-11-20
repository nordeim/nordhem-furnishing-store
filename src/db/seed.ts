import { sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import catalog from "@/content/catalog.json";
import home from "@/content/home.json";
import { lastSegment } from "@/lib/paths";

interface CatalogEntry {
  articleNo: string;
  slug: string;
  name: string;
  typeDesc: string;
  priceCents: number;
  image: string;
  rating: number | null;
  reviewCount: number;
  category: string;
  collections: string[];
}

const LOWEST_PRICE = "lowest-price";
const RECYCLED = "recycled-materials-700324";
/** Products at or below this price (S$15) populate the "lowest price" collection. */
const LOWEST_PRICE_CEILING_CENTS = 1500;
const ADVISORY_LOCK_KEY = 727_001;
const INSERT_CHUNK = 100;

const entries: CatalogEntry[] = catalog;

function buildCategoryRows() {
  const navRows = home.categoryNav
    .filter((item) => item.href.startsWith("/cat/"))
    .map((item, index) => ({
      slug: lastSegment(item.href),
      name: item.label,
      kind: "category",
      image: item.img,
      sortOrder: index,
    }));

  return [
    ...navRows,
    { slug: LOWEST_PRICE, name: "Our lowest prices", kind: "collection", image: null, sortOrder: 100 },
    { slug: RECYCLED, name: "Products made with recycled materials", kind: "collection", image: null, sortOrder: 101 },
  ];
}

function buildProductRows(knownCategories: ReadonlySet<string>) {
  return entries
    .filter((entry) => knownCategories.has(entry.category))
    .map((entry) => {
      const collections = new Set(entry.collections);
      if (entry.priceCents <= LOWEST_PRICE_CEILING_CENTS) collections.add(LOWEST_PRICE);
      if (/recycl/i.test(`${entry.name} ${entry.typeDesc}`)) collections.add(RECYCLED);
      return {
        articleNo: entry.articleNo,
        slug: entry.slug,
        name: entry.name,
        typeDesc: entry.typeDesc,
        priceCents: entry.priceCents,
        image: entry.image,
        rating: entry.rating,
        reviewCount: entry.reviewCount,
        categorySlug: entry.category,
        collections: [...collections],
      };
    });
}

async function seedCatalog(): Promise<void> {
  await db.transaction(async (tx) => {
    // Serialises concurrent cold starts so the catalog is only seeded once.
    await tx.execute(sql`select pg_advisory_xact_lock(${ADVISORY_LOCK_KEY})`);

    const [{ count }] = await tx.select({ count: sql<number>`count(*)::int` }).from(categories);
    if (count > 0) return;

    const categoryRows = buildCategoryRows();
    await tx.insert(categories).values(categoryRows).onConflictDoNothing();

    const productRows = buildProductRows(new Set(categoryRows.map((row) => row.slug)));
    for (let offset = 0; offset < productRows.length; offset += INSERT_CHUNK) {
      await tx
        .insert(products)
        .values(productRows.slice(offset, offset + INSERT_CHUNK))
        .onConflictDoNothing();
    }
    console.info(
      JSON.stringify({ event: "catalog.seeded", categories: categoryRows.length, products: productRows.length }),
    );
  });
}

let seeding: Promise<void> | undefined;

/** Idempotent, memoised per process. Failures are not cached so the next request retries. */
export function ensureCatalog(): Promise<void> {
  seeding ??= seedCatalog().catch((error: unknown) => {
    seeding = undefined;
    throw error;
  });
  return seeding;
}

// CLI entry is scripts/seed-cli.ts (npm run db:seed): dotenv must load BEFORE this module's
// static imports pull in src/db, which throws when DATABASE_URL is missing at import time.
