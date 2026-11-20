import { and, asc, desc, eq, gte, ilike, lte, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { ensureCatalog } from "@/db/seed";
import { categories, products } from "@/db/schema";
import { escapeLike } from "@/lib/paths";
import { PAGE_SIZE, type SortOption } from "@/lib/validation";

export type Product = typeof products.$inferSelect;
export type Category = typeof categories.$inferSelect;

export interface ListingOptions {
  collection?: string;
  q?: string;
  sort?: SortOption;
  page?: number;
  min?: number;
  max?: number;
}

export interface ListingResult {
  items: Product[];
  total: number;
  page: number;
  pageCount: number;
}

/** Every product slug for the sitemap — unpaginated, minimal columns (242 rows at demo scale). */
export async function listAllProductSlugs(): Promise<{ slug: string }[]> {
  await ensureCatalog();
  return db.select({ slug: products.slug }).from(products).orderBy(asc(products.id));
}

export async function getNavCategories(): Promise<Category[]> {
  await ensureCatalog();
  return db.select().from(categories).where(eq(categories.kind, "category")).orderBy(asc(categories.sortOrder));
}

/** Every category AND collection slug for the sitemap — both render public listing pages. */
export async function listAllCategorySlugs(): Promise<{ slug: string }[]> {
  await ensureCatalog();
  return db.select({ slug: categories.slug }).from(categories).orderBy(asc(categories.sortOrder));
}

export async function getCategory(slug: string): Promise<Category | undefined> {
  await ensureCatalog();
  const [row] = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  return row;
}

function orderBy(sort: SortOption, hasQuery: boolean, term: string): SQL[] {
  switch (sort) {
    case "price-asc":
      return [asc(products.priceCents), asc(products.id)];
    case "price-desc":
      return [desc(products.priceCents), asc(products.id)];
    case "name-asc":
      return [asc(products.name), asc(products.id)];
    case "rating":
      return [sql`${products.rating} desc nulls last`, desc(products.reviewCount), asc(products.id)];
    case "relevance":
      return hasQuery
        ? [
            sql`case when ${products.name} ilike ${`${escapeLike(term)}%`} then 0 else 1 end`,
            desc(products.reviewCount),
            asc(products.id),
          ]
        : [desc(products.reviewCount), asc(products.id)];
  }
}

export async function listProducts(options: ListingOptions): Promise<ListingResult> {
  await ensureCatalog();
  const { collection, q = "", sort = "relevance", min, max } = options;
  const requestedPage = Math.max(1, options.page ?? 1);

  const filters: (SQL | undefined)[] = [];
  if (collection) filters.push(sql`${products.collections} @> ARRAY[${collection}]::text[]`);
  if (q) {
    const pattern = `%${escapeLike(q)}%`;
    filters.push(
      or(ilike(products.name, pattern), ilike(products.typeDesc, pattern), ilike(products.articleNo, pattern)),
    );
  }
  if (min !== undefined) filters.push(gte(products.priceCents, min));
  if (max !== undefined) filters.push(lte(products.priceCents, max));
  const where = and(...filters);

  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(products).where(where);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount);

  const items = await db
    .select()
    .from(products)
    .where(where)
    .orderBy(...orderBy(sort, q !== "", q))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  return { items, total, page, pageCount };
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  await ensureCatalog();
  const [row] = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
  return row;
}

export async function getRelatedProducts(product: Product, limit = 8): Promise<Product[]> {
  await ensureCatalog();
  return db
    .select()
    .from(products)
    .where(and(eq(products.categorySlug, product.categorySlug), sql`${products.id} <> ${product.id}`))
    .orderBy(desc(products.reviewCount), asc(products.id))
    .limit(limit);
}

export async function getFeaturedProducts(collection: string, limit = 10): Promise<Product[]> {
  const { items } = await listProducts({ collection, sort: "rating" });
  return items.slice(0, limit);
}

export interface Suggestions {
  products: Pick<Product, "id" | "slug" | "name" | "typeDesc" | "priceCents" | "image">[];
  categories: Pick<Category, "slug" | "name">[];
}

export async function getSuggestions(q: string): Promise<Suggestions> {
  await ensureCatalog();
  const pattern = `%${escapeLike(q)}%`;
  const [matchedProducts, matchedCategories] = await Promise.all([
    db
      .select({
        id: products.id,
        slug: products.slug,
        name: products.name,
        typeDesc: products.typeDesc,
        priceCents: products.priceCents,
        image: products.image,
      })
      .from(products)
      .where(or(ilike(products.name, pattern), ilike(products.typeDesc, pattern)))
      .orderBy(
        sql`case when ${products.name} ilike ${`${escapeLike(q)}%`} then 0 else 1 end`,
        desc(products.reviewCount),
      )
      .limit(6),
    db
      .select({ slug: categories.slug, name: categories.name })
      .from(categories)
      .where(and(eq(categories.kind, "category"), ilike(categories.name, pattern)))
      .limit(3),
  ]);
  return { products: matchedProducts, categories: matchedCategories };
}
