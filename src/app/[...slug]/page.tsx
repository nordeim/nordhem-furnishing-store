import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/shop/product-card";
import { AppLink } from "@/components/ui/app-link";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { isKnownInfoPath, resolveInfoPage } from "@/content/pages";
import { productCategories } from "@/content/nav";
import { getFeaturedProducts } from "@/lib/catalog";

export const dynamic = "force-dynamic";

interface InfoPageProps {
  params: Promise<{ slug: string[] }>;
}

const SEGMENT_PATTERN = /^[a-z0-9][a-z0-9-]*$/i;
const MAX_SEGMENTS = 6;

function validSegments(slug: string[]): string[] | null {
  return slug.length <= MAX_SEGMENTS && slug.every((part) => SEGMENT_PATTERN.test(part)) ? slug : null;
}

export async function generateMetadata({ params }: InfoPageProps): Promise<Metadata> {
  const segments = validSegments((await params).slug);
  if (!segments || !isKnownInfoPath(segments)) return { title: "Page not found" };
  // Session-010 S10-I4: gate on isKnownInfoPath exactly like the body, so a ruleless
  // path's 404 can never carry a synthesized canonical (Next 16 already suppresses
  // metadata flushing on notFound() — this makes the two paths agree by construction).
  // Session-008 S8-M2: unique description + canonical that folds the synthesized long tail
  // into the prefix root (exact prefixes keep their self-canonical) — kills the thin-content
  // surface the broad prefixes opened (every page previously carried the layout-default
  // description and no canonical at all).
  const page = resolveInfoPage(segments);
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: page.canonicalPath },
  };
}

/**
 * Covers the long tail of IKEA content URLs linked from the home page and footer (services, policies,
 * campaigns). Only pre-validated path segments are reflected, and each page links to the official source.
 */
export default async function InfoPage({ params }: InfoPageProps) {
  const segments = validSegments((await params).slug);
  // Session-006 M-3: a ruleless path is a real 404, not a synthesized 200 page — the old
  // behavior served an indexable soft-404 for ANY ≤6-segment URL (infinite duplicate surface).
  if (!segments || !isKnownInfoPath(segments)) notFound();

  const page = resolveInfoPage(segments);
  const products = page.collection ? await getFeaturedProducts(page.collection, 8) : [];

  return (
    <div className="page-x mx-auto max-w-page py-6">
      <Breadcrumbs crumbs={[{ label: "Home", href: "/" }, { label: page.title }]} />
      <h1 className="mt-4 text-3xl font-bold md:text-4xl">{page.title}</h1>
      <p className="mt-3 max-w-2xl text-ink-soft">{page.lead}</p>
      <p className="mt-4 text-sm">
        This section is summarised in the clone. For complete, up-to-date details see{" "}
        <AppLink href={`https://www.ikea.com/sg/en/${page.officialPath}/`} className="font-bold underline">
          the official IKEA Singapore page
        </AppLink>
        .
      </p>

      {products.length > 0 && (
        <section className="mt-10" aria-labelledby="picks-heading">
          <h2 id="picks-heading" className="mb-6 text-2xl font-bold">
            Popular picks
          </h2>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-12" aria-labelledby="browse-heading">
        <h2 id="browse-heading" className="mb-4 text-xl font-bold">
          Browse all products
        </h2>
        <ul className="flex flex-wrap gap-2">
          {productCategories.map((category) => (
            <li key={category.href}>
              <AppLink href={category.href} className="btn btn-light min-h-10 px-4! py-2! font-normal">
                {category.label}
              </AppLink>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
