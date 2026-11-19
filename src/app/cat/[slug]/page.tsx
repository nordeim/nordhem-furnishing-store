import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListingView, parseListingParams } from "@/components/shop/listing-view";
import { getCategory, listProducts } from "@/lib/catalog";

export const dynamic = "force-dynamic";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const category = await getCategory((await params).slug);
  return { title: category?.name ?? "Category" };
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
      crumbs={[{ label: "Home", href: "/" }, { label: "Products", href: "/cat/storage-organisation-st001" }, { label: category.name }]}
      result={result}
      query={query}
      basePath={`/cat/${slug}`}
    />
  );
}
