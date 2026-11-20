import type { Metadata } from "next";
import { ProductCard } from "@/components/shop/product-card";
import { AppLink } from "@/components/ui/app-link";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { getSessionId } from "@/lib/session";
import { getFavouriteProducts } from "@/lib/shopping";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Shopping list", robots: { index: false } };

export default async function FavouritesPage() {
  const products = await getFavouriteProducts(await getSessionId());
  return (
    <div className="page-x mx-auto max-w-page py-6">
      <Breadcrumbs crumbs={[{ label: "Home", href: "/" }, { label: "Shopping list" }]} />
      <h1 className="mt-4 text-3xl font-bold">Shopping list</h1>
      {products.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-lg font-bold">Your shopping list is empty</p>
          <p className="mt-2 text-sm text-ink-soft">Tap the heart on any product to save it for later.</p>
          <AppLink href="/" className="btn btn-dark mt-6">
            Start browsing
          </AppLink>
        </div>
      ) : (
        // sr-only h2 keeps the heading order intact (h1 → h2 → card h3s) for AT and axe.
        <>
          <h2 className="sr-only">Saved products</h2>
          <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} refreshOnFavouriteChange />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
