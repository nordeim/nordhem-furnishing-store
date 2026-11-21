import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListingView, parseListingParams } from "@/components/shop/listing-view";
import { getCategory, listProducts } from "@/lib/catalog";
import { imageUrl } from "@/lib/images";

export const dynamic = "force-dynamic";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const firstParam = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

/**
 * Session-009 S9-M1+L3: generateMetadata and the page body share ONE cached load, so the
 * canonical can never diverge from the page actually rendered (the old metadata path
 * hand-rolled its own clamp: ?page=7 canonicalized to ?page=7 while the body rendered
 * page 6, and ?page=999 canonicalized to ?page=500 while the listing schema fell back to
 * page 1). The cache keys are primitives (slug + raw param strings) so both callers —
 * each with its own searchParams promise — hit the same per-request memo entry, and the
 * category's queries run once per request instead of twice.
 */
const loadCategoryPage = cache(
  async (
    slug: string,
    sort: string | undefined,
    page: string | undefined,
    min: string | undefined,
    max: string | undefined,
  ) => {
    const category = await getCategory(slug);
    if (!category) return null;
    const query = parseListingParams({ sort, page, min, max });
    const result = await listProducts({ collection: slug, ...query });
    return { category, query, result };
  },
);

async function loadCategoryPageData(
  slug: string,
  raw: Record<string, string | string[] | undefined>,
) {
  return loadCategoryPage(slug, firstParam(raw.sort), firstParam(raw.page), firstParam(raw.min), firstParam(raw.max));
}

export async function generateMetadata({ params, searchParams }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadCategoryPageData(slug, await searchParams);
  if (!data) return { title: "Category" };
  // Canonical drops sort/filter params so listings don't accumulate duplicate signals, but
  // paginated pages self-canonicalize (session-008 S8-L2). The page number comes from the
  // clamped result the body renders (session-009 S9-M1) — never re-derived from the raw
  // query param, so out-of-range and non-integer ?page= values can't fork the canonical.
  const canonical = data.result.page > 1 ? `/cat/${slug}?page=${data.result.page}` : `/cat/${slug}`;
  // Session-011 S11-I2: same full-set rule as S10-M1/S11-M1 — the og block repeats the
  // layout's type/siteName and follows the already-computed paginated canonical (never
  // re-derived from the raw query param), with the category name as og:title so a shared
  // category link previews the category, not just the store name.
  return {
    title: data.category.name,
    description: `Shop ${data.category.name} at IKEA Singapore — affordable home furnishing with flat-pack prices.`,
    alternates: { canonical },
    openGraph: {
      url: canonical,
      type: "website",
      siteName: "Nordhem Furnishing Store",
      title: data.category.name,
      description: `Shop ${data.category.name} at IKEA Singapore — affordable home furnishing with flat-pack prices.`,
      // Session-012 S12-I2: mirror the category's nav-tile art when it exists (21/22
      // seeded categories carry one; lowest-price is the deliberate exception — og
      // images must never be an empty string, so the key is simply omitted).
      ...(data.category.image ? { images: [imageUrl(data.category.image, "l")] } : {}),
    },
  };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params;
  const data = await loadCategoryPageData(slug, await searchParams);
  if (!data) notFound();

  return (
    <ListingView
      title={data.category.name}
      crumbs={[{ label: "Home", href: "/" }, { label: data.category.name }]}
      result={data.result}
      query={data.query}
      basePath={`/cat/${slug}`}
    />
  );
}
