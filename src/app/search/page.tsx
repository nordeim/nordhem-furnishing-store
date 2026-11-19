import type { Metadata } from "next";
import { ListingView, parseListingParams } from "@/components/shop/listing-view";
import { listProducts } from "@/lib/catalog";
import { normaliseQuery } from "@/lib/paths";

export const dynamic = "force-dynamic";

interface SearchPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export const metadata: Metadata = { title: "Search", robots: { index: false } };

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const raw = await searchParams;
  const term = normaliseQuery(Array.isArray(raw.q) ? raw.q[0] : raw.q);
  const query = parseListingParams(raw);
  const result = await listProducts({ q: term, ...query });

  return (
    <ListingView
      title={term ? `Search results for “${term}”` : "Search"}
      crumbs={[{ label: "Home", href: "/" }, { label: "Search" }]}
      result={result}
      query={query}
      basePath="/search"
      searchTerm={term || undefined}
      emptyHint={term ? undefined : "Type a product name, article number or room in the search bar."}
    />
  );
}
