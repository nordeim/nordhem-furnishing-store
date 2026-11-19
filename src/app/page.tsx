import { IdeasGrid, type IdeaCard } from "@/components/home/ideas-grid";
import { MediaCard, Section } from "@/components/home/blocks";
import { ShoppableHero, type HeroSlide } from "@/components/home/shoppable-hero";
import { ProductCard } from "@/components/shop/product-card";
import { AppLink } from "@/components/ui/app-link";
import { Carousel } from "@/components/ui/carousel";
import { SmartImage } from "@/components/ui/smart-image";
import home from "@/content/home.json";
import { getFeaturedProducts, type Product } from "@/lib/catalog";

export const dynamic = "force-dynamic";

/** Hotspot coordinates (percent of image box) measured from the live shoppable carousel. */
const HOTSPOT_COORDINATES: { x: number; y: number }[][] = [
  [
    { x: 56, y: 32 },
    { x: 66, y: 48 },
    { x: 39, y: 36 },
    { x: 13, y: 23 },
  ],
  [
    { x: 30, y: 42 },
    { x: 62, y: 56 },
  ],
  [{ x: 45, y: 48 }],
];

function buildHeroSlides(products: Product[]): HeroSlide[] {
  let cursor = 0;
  return home.christmas.slides.map((slide, slideIndex) => ({
    img: slide.img,
    alt: slide.alt,
    hotspots: (HOTSPOT_COORDINATES[slideIndex] ?? []).flatMap((point) => {
      const product = products[cursor++];
      return product
        ? [{ ...point, name: product.name, typeDesc: product.typeDesc, priceCents: product.priceCents, href: `/p/${product.slug}` }]
        : [];
    }),
  }));
}

function buildIdeas(): IdeaCard[] {
  const fromGuides = home.guides.cards.map((card) => ({ href: card.href, img: card.img, alt: card.alt, title: card.label ?? card.alt }));
  const fromHappening = home.happening.cards.map((card) => ({ href: card.href, img: card.img, alt: card.alt, title: card.title }));
  const fromXmas = home.xmasCards.map((card) => ({ href: card.href, img: card.img, alt: card.alt, title: card.label ?? card.alt }));
  return [...fromHappening, ...fromGuides, ...fromXmas];
}

export default async function HomePage() {
  const [christmasProducts, storageProducts] = await Promise.all([
    getFeaturedProducts("christmas-decoration-wt001", 12),
    getFeaturedProducts("storage-organisation-st001", 8),
  ]);

  return (
    <article>
      <section aria-label="Product categories" className="page-x mx-auto max-w-page pt-6">
        <Carousel
          label="Product categories"
          gapClassName="gap-3"
          itemClassName="w-24 md:w-28"
          items={home.categoryNav.map((item) => (
            <AppLink key={item.href} href={item.href} className="group flex flex-col items-center gap-2 text-center">
              {item.img ? (
                <SmartImage src={item.img} alt="" size="s" className="size-20 rounded-full object-cover md:size-24" />
              ) : (
                <span aria-hidden="true" className="grid size-20 place-items-center rounded-full bg-sale text-3xl font-bold text-white md:size-24">
                  %
                </span>
              )}
              <span className="text-xs font-bold leading-tight group-hover:underline">{item.label}</span>
            </AppLink>
          ))}
        />
      </section>

      <h1 className="sr-only">Welcome to IKEA Singapore</h1>

      <Section title={home.christmas.title} text={home.christmas.text}>
        <AppLink href={home.christmas.cta.href} className="btn btn-dark mb-6">
          {home.christmas.cta.label}
        </AppLink>
        <ShoppableHero slides={buildHeroSlides(christmasProducts)} />
      </Section>

      <Section title={home.reasons.title} text={home.reasons.text}>
        <ul className="grid gap-4 md:grid-cols-3">
          {home.reasons.banners.map((banner) => (
            <li key={banner.img}>
              <MediaCard href={banner.href} img={banner.img} alt={banner.alt} aspect="aspect-[4/3]" />
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Check out what's happening this X'mas!">
        <Carousel
          label="Christmas highlights"
          itemClassName="w-[62%] sm:w-[36%] lg:w-[23%]"
          items={home.xmasCards.map((card) => (
            <MediaCard key={card.img} href={card.href} img={card.img} alt={card.alt} title={card.label} />
          ))}
        />
      </Section>

      <Section title={home.family.title} text={home.family.text}>
        <Carousel
          label="IKEA Family offers"
          itemClassName="w-[62%] sm:w-[36%] lg:w-[23%]"
          items={[
            <MediaCard key="lead" href={home.family.cta.href} img={home.family.images[0].img} alt={home.family.images[0].alt} title={home.family.cta.label} />,
            ...storageProducts.map((product) => <ProductCard key={product.id} product={product} />),
          ]}
        />
      </Section>

      <Section>
        <div className="grid items-center gap-6 md:grid-cols-2 md:gap-12">
          <AppLink href={home.feature.cta.href} aria-label={home.feature.cta.label}>
            <SmartImage src={home.feature.img} alt={home.feature.alt} size="l" className="aspect-[4/3] w-full object-cover" />
          </AppLink>
          <div>
            <h2 className="text-2xl font-bold leading-tight md:text-3xl">{home.feature.title}</h2>
            <p className="mt-4 text-sm text-ink-soft md:text-base">{home.feature.text}</p>
            <AppLink href={home.feature.cta.href} className="btn btn-dark mt-6">
              {home.feature.cta.label}
            </AppLink>
          </div>
        </div>
      </Section>

      <Section title={home.happening.title} text={home.happening.text}>
        <Carousel
          label="What's happening now"
          itemClassName="w-[72%] sm:w-[44%] lg:w-[31%]"
          items={home.happening.cards.map((card) => (
            <MediaCard key={card.img} href={card.href} img={card.img} alt={card.alt} title={card.title} text={card.text} aspect="aspect-[4/3]" />
          ))}
        />
      </Section>

      <Section title={home.newTitle}>
        <Carousel
          label="New at IKEA"
          itemClassName="w-[62%] sm:w-[36%] lg:w-[23%]"
          items={home.newCards.map((card) => (
            <MediaCard key={card.img} href={card.href} img={card.img} alt={card.alt} title={card.label} />
          ))}
        />
      </Section>

      <Section>
        <hr className="mb-10 border-line" />
        <ul className="grid gap-8 md:grid-cols-3">
          {home.trio.map((item) => (
            <li key={item.title}>
              <AppLink href={item.href} className="block">
                <SmartImage src={item.img} alt={item.alt} size="m" className="aspect-[4/3] w-full object-cover" />
              </AppLink>
              <h3 className="mt-3 text-base font-bold">
                {item.title} — {item.lead}{" "}
                <AppLink href={item.href} className="underline">
                  {item.linkLabel}
                </AppLink>
              </h3>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={home.food.title}>
        <Carousel
          label="IKEA food"
          itemClassName="w-[78%] sm:w-[46%] lg:w-[32%]"
          items={home.food.cards.map((card) => (
            <MediaCard key={card.img} href={card.href} img={card.img} alt={card.alt} title={card.title} text={card.text} aspect="aspect-[4/3]" />
          ))}
        />
      </Section>

      <Section title={home.services.title}>
        <Carousel
          label="IKEA services"
          gapClassName="gap-3"
          itemClassName="w-[44%] sm:w-[28%] lg:w-[15%]"
          items={home.services.cards.map((card) => (
            <AppLink key={card.img} href={card.href} className="group flex h-full flex-col items-center gap-3 rounded-lg bg-surface p-4 text-center hover:bg-line">
              <SmartImage src={card.img} alt={card.alt} size="s" className="size-20 object-contain mix-blend-multiply" />
              <span className="text-sm font-bold group-hover:underline">{card.label}</span>
            </AppLink>
          ))}
        />
      </Section>

      <Section title={home.guides.title}>
        <AppLink href={home.guides.leadHref} className="mb-4 inline-block text-lg font-bold underline">
          {home.guides.lead}
        </AppLink>
        <Carousel
          label="Guides for your home"
          itemClassName="w-[62%] sm:w-[36%] lg:w-[23%]"
          items={home.guides.cards.map((card) => (
            <MediaCard key={card.img} href={card.href} img={card.img} alt={card.alt} title={card.label} />
          ))}
        />
      </Section>

      <Section title="IKEA Singapore" text={home.seoText}>
        <span className="sr-only">Browse the full range from the menu above.</span>
      </Section>

      <Section title="More ideas and inspiration">
        <IdeasGrid ideas={buildIdeas()} />
      </Section>

      <Section>
        <ul className="grid gap-4 md:grid-cols-2">
          {home.recalls.map((card) => (
            <li key={card.img}>
              <MediaCard href={card.href} img={card.img} alt={card.alt} aspect="aspect-[16/9]" />
            </li>
          ))}
        </ul>
      </Section>
    </article>
  );
}
