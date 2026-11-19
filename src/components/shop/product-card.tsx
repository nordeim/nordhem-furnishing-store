import { AppLink } from "@/components/ui/app-link";
import { Price, Rating } from "@/components/ui/price";
import { SmartImage } from "@/components/ui/smart-image";
import { AddToCartButton, FavouriteButton } from "@/components/shop/product-actions";
import type { Product } from "@/lib/catalog";

export function ProductCard({ product, refreshOnFavouriteChange = false }: { product: Product; refreshOnFavouriteChange?: boolean }) {
  const href = `/p/${product.slug}`;
  return (
    <article className="relative flex h-full flex-col" data-testid="product-card">
      <AppLink href={href} className="block aspect-square overflow-hidden bg-surface" aria-hidden="true" tabIndex={-1}>
        <SmartImage src={product.image} alt="" size="m" className="size-full object-contain p-3 mix-blend-multiply" />
      </AppLink>
      <FavouriteButton productId={product.id} name={product.name} className="absolute right-2 top-2" refreshOnChange={refreshOnFavouriteChange} />
      <div className="flex flex-1 flex-col gap-1 pt-3">
        <h3 className="text-sm font-bold leading-snug">
          <AppLink href={href} className="hover:underline">
            {product.name}
          </AppLink>
        </h3>
        <p className="line-clamp-2 text-sm text-ink-soft">{product.typeDesc}</p>
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div className="flex flex-col gap-1.5">
            <Price priceCents={product.priceCents} />
            <Rating value={product.rating} count={product.reviewCount} />
          </div>
          <AddToCartButton productId={product.id} name={product.name} />
        </div>
      </div>
    </article>
  );
}
