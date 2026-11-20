import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListingView, parseListingParams } from "@/components/shop/listing-view";
import { getCategory, listProducts } from "@/lib/catalog";

export const dynamic = "force-dynamic";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({
  params,
  searchParams,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategory(slug);
  // Canonical drops sort/filter params so listings don't accumulate duplicate signals, but
  // paginated pages self-canonicalize (session-008 S8-L2): canonical-to-page-1 risks
  // deindexing the tail (lowest-price alone spans 6 pages).
  const raw = await searchParams;
  const pageParam = Array.isArray(raw.page) ? raw.page[0] : raw.page;
  const page = Math.min(Math.max(Number.parseInt(pageParam ?? "1", 10) || 1, 1), 500);
  const canonical = page > 1 ? `/cat/${slug}?page=${page}` : `/cat/${slug}`;
  return {
    title: category?.name ?? "Category",
    description: `Shop ${category?.name ?? "our range"} at IKEA Singapore — affordable home furnishing with flat-pack prices.`,
    alternates: { canonical },
  };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) notFound();

  const query = parseListingParams(await searchParams);
  const result = await listProducts({ collection: slug, ...query });

  return (
    <ListingView
      title={category.name}
      crumbs={[{ label: "Home", href: "/" }, { label: category.name }]}
      result={result}
      query={query}
      basePath={`/cat/${slug}`}
    />
  );
}
