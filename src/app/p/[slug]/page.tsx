import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductPurchase } from "@/components/shop/product-actions";
import { ProductCard } from "@/components/shop/product-card";
import { AppLink } from "@/components/ui/app-link";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Carousel } from "@/components/ui/carousel";
import { Price, Rating } from "@/components/ui/price";
import { SmartImage } from "@/components/ui/smart-image";
import { DELIVERY_FEE_CENTS, FREE_DELIVERY_THRESHOLD_CENTS } from "@/lib/cart-math";
import { getCategory, getProductBySlug, getRelatedProducts } from "@/lib/catalog";
import { imageUrl } from "@/lib/images";
import { formatPrice } from "@/lib/money";

export const dynamic = "force-dynamic";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const product = await getProductBySlug((await params).slug);
  if (!product) return { title: "Product not found" };
  return { title: `${product.name} ${product.typeDesc}`, description: `${product.name}, ${product.typeDesc}. ${formatPrice(product.priceCents)} at IKEA Singapore.` };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const product = await getProductBySlug((await params).slug);
  if (!product) notFound();

  const [category, related] = await Promise.all([getCategory(product.categorySlug), getRelatedProducts(product)]);

  // Escaping "<" keeps the inline JSON from terminating the script element.
  const structuredData = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${product.name} ${product.typeDesc}`,
    sku: product.articleNo,
    image: imageUrl(product.image, "l"),
    offers: { "@type": "Offer", priceCurrency: "SGD", price: (product.priceCents / 100).toFixed(2), availability: "https://schema.org/InStock" },
    ...(product.rating !== null && product.reviewCount > 0
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: product.rating, reviewCount: product.reviewCount } }
      : {}),
  }).replace(/</g, "\\u003c");

  return (
    <div className="page-x mx-auto max-w-page py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData }} />
      <Breadcrumbs
        crumbs={[
          { label: "Home", href: "/" },
          ...(category ? [{ label: category.name, href: `/cat/${category.slug}` }] : []),
          { label: product.name },
        ]}
      />

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-14">
        <SmartImage src={product.image} alt={`${product.name} ${product.typeDesc}`} size="xl" priority className="aspect-square w-full object-contain p-6 mix-blend-multiply" />

        <div>
          <h1 className="text-3xl font-bold">{product.name}</h1>
          <p className="mt-1 text-base text-ink-soft">{product.typeDesc}</p>
          <div className="mt-4">
            <Rating value={product.rating} count={product.reviewCount} />
          </div>
          <Price priceCents={product.priceCents} size="lg" className="mt-5" />
          <p className="mt-1 text-xs text-ink-soft">Price incl. GST · Article no. {product.articleNo}</p>

          <div className="mt-6 max-w-md">
            <ProductPurchase productId={product.id} name={product.name} />
          </div>

          <div className="mt-8 divide-y divide-line border-y border-line">
            <details className="group py-4" open>
              <summary className="cursor-pointer text-sm font-bold">Delivery &amp; collection</summary>
              <p className="mt-2 text-sm text-ink-soft">
                Home delivery is {formatPrice(DELIVERY_FEE_CENTS)}, and free for orders of {formatPrice(FREE_DELIVERY_THRESHOLD_CENTS)} or more. Click &amp; collect is free.
              </p>
            </details>
            <details className="py-4">
              <summary className="cursor-pointer text-sm font-bold">365 days to change your mind</summary>
              <p className="mt-2 text-sm text-ink-soft">
                Changed your mind? Read the full{" "}
                <AppLink href="/customer-service/returns-claims/return-policy/" className="underline">
                  return policy
                </AppLink>
                .
              </p>
            </details>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16" aria-labelledby="related-heading">
          <h2 id="related-heading" className="mb-6 text-2xl font-bold">
            More from {category?.name ?? "this category"}
          </h2>
          <Carousel
            label="Related products"
            itemClassName="w-[62%] sm:w-[36%] lg:w-[23%]"
            items={related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          />
        </section>
      )}
    </div>
  );
}
