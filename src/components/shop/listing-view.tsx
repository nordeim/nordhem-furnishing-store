import { ProductCard } from "@/components/shop/product-card";
import { Breadcrumbs, type Crumb } from "@/components/ui/breadcrumbs";
import { AppLink } from "@/components/ui/app-link";
import type { ListingResult } from "@/lib/catalog";
import { listingQuerySchema, type ListingQuery } from "@/lib/validation";

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseListingParams(raw: RawParams): ListingQuery {
  return listingQuerySchema.parse({ sort: first(raw.sort), page: first(raw.page), min: first(raw.min), max: first(raw.max) });
}

const SORT_LABELS: Record<ListingQuery["sort"], string> = {
  relevance: "Best match",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  "name-asc": "Name: A to Z",
  rating: "Highest rated",
};

interface ListingViewProps {
  title: string;
  crumbs: Crumb[];
  result: ListingResult;
  query: ListingQuery;
  basePath: string;
  searchTerm?: string;
  emptyHint?: string;
}

function pageHref(basePath: string, query: ListingQuery, searchTerm: string | undefined, page: number): string {
  const params = new URLSearchParams();
  if (searchTerm) params.set("q", searchTerm);
  if (query.sort !== "relevance") params.set("sort", query.sort);
  if (query.min !== undefined) params.set("min", String(query.min / 100));
  if (query.max !== undefined) params.set("max", String(query.max / 100));
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function ListingView({ title, crumbs, result, query, basePath, searchTerm, emptyHint }: ListingViewProps) {
  const { items, total, page, pageCount } = result;
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1).filter(
    (candidate) => candidate === 1 || candidate === pageCount || Math.abs(candidate - page) <= 1,
  );

  return (
    <div className="page-x mx-auto max-w-page py-6">
      <Breadcrumbs crumbs={crumbs} />
      <h1 className="mt-4 text-3xl font-bold md:text-4xl">{title}</h1>
      <p className="mt-2 text-sm text-ink-soft" aria-live="polite">
        {total === 0 ? "No products found" : `${total} product${total === 1 ? "" : "s"}`}
      </p>

      <form method="get" action={basePath} className="mt-6 flex flex-wrap items-end gap-4 border-y border-line py-4">
        {searchTerm && <input type="hidden" name="q" value={searchTerm} />}
        <div>
          <label htmlFor="sort" className="mb-1 block text-xs font-bold">
            Sort by
          </label>
          <select id="sort" name="sort" defaultValue={query.sort} className="field w-auto min-w-48">
            {Object.entries(SORT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="min" className="mb-1 block text-xs font-bold">
            Min price ($)
          </label>
          <input id="min" name="min" type="number" inputMode="decimal" min={0} step="1" defaultValue={query.min === undefined ? "" : query.min / 100} className="field w-28" />
        </div>
        <div>
          <label htmlFor="max" className="mb-1 block text-xs font-bold">
            Max price ($)
          </label>
          <input id="max" name="max" type="number" inputMode="decimal" min={0} step="1" defaultValue={query.max === undefined ? "" : query.max / 100} className="field w-28" />
        </div>
        <button type="submit" className="btn btn-dark">
          Apply
        </button>
        <AppLink href={searchTerm ? `${basePath}?q=${encodeURIComponent(searchTerm)}` : basePath} className="btn btn-light">
          Reset
        </AppLink>
      </form>

      {items.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-lg font-bold">We couldn’t find any matching products.</p>
          <p className="mt-2 text-sm text-ink-soft">{emptyHint ?? "Try removing a filter or check the spelling."}</p>
          <AppLink href="/" className="btn btn-dark mt-6">
            Back to start page
          </AppLink>
        </div>
      ) : (
        <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 xl:grid-cols-4">
          {items.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      )}

      {pageCount > 1 && (
        <nav aria-label="Pagination" className="mt-12 flex flex-wrap items-center justify-center gap-2">
          {page > 1 && (
            <AppLink href={pageHref(basePath, query, searchTerm, page - 1)} className="btn btn-light">
              Previous
            </AppLink>
          )}
          {pages.map((candidate, index) => (
            <span key={candidate} className="flex items-center gap-2">
              {index > 0 && candidate - pages[index - 1] > 1 && <span aria-hidden="true">…</span>}
              <AppLink
                href={pageHref(basePath, query, searchTerm, candidate)}
                aria-current={candidate === page ? "page" : undefined}
                className={candidate === page ? "btn btn-dark size-12 p-0!" : "btn btn-light size-12 p-0!"}
              >
                {candidate}
              </AppLink>
            </span>
          ))}
          {page < pageCount && (
            <AppLink href={pageHref(basePath, query, searchTerm, page + 1)} className="btn btn-light">
              Next
            </AppLink>
          )}
        </nav>
      )}
    </div>
  );
}
