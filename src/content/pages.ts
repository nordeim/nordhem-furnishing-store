import { slugToTitle } from "@/lib/paths";

export interface InfoPage {
  title: string;
  lead: string;
  /** Collection slug whose products are featured under the lead copy. */
  collection?: string;
  officialPath: string;
}

interface PageRule {
  prefix: string;
  title?: string;
  lead: string;
  collection?: string;
}

const RULES: PageRule[] = [
  { prefix: "offers", title: "Offers & promotions", lead: "Our lowest-priced products and current promotions.", collection: "lowest-price" },
  { prefix: "new", title: "New at IKEA", lead: "The latest and greatest, fresh on the shelves.", collection: "christmas-decoration-wt001" },
  // Session-007 M-2: `campaigns` covers the footer's seasonal long tail (christmas,
  // stay-cool-in-the-heat, …) — resolveInfoPage derives titles from the trailing slug.
  { prefix: "campaigns", title: "Campaigns at IKEA", lead: "Seasonal campaigns, offers and inspiration." },
  { prefix: "rooms", title: "Rooms", lead: "Find inspiration and products for every room in your home.", collection: "sofas-armchairs-700640" },
  { prefix: "ideas", title: "Ideas & guides", lead: "Real homes, clever solutions and planning guides.", collection: "decoration-de001" },
  { prefix: "planners", title: "Planners", lead: "Plan your kitchen, wardrobe or storage with our online planning tools." },
  { prefix: "product-guides/sustainable-products", title: "A sustainable everyday", lead: "Ways to save energy, water and waste at home.", collection: "lowest-price" },
  // Session-007 M-2: the footer links deep into customer-service, this-is-ikea, newsroom
  // and ikea-business long-tail pages — broad prefixes, titles derived from the slug.
  { prefix: "customer-service", title: "Customer service", lead: "Help with orders, returns, claims and product support." },
  { prefix: "this-is-ikea", title: "This is IKEA", lead: "About us, our people, sustainability and the circular business." },
  { prefix: "newsroom", title: "Newsroom", lead: "News, media resources and press materials." },
  { prefix: "ikea-business", title: "IKEA Business", lead: "Furnishing solutions for businesses of every size." },
  { prefix: "stores", title: "Stores", lead: "Visit an IKEA store, restaurant, Swedish Bistro and Swedish Food Market." },
];

/** True when the path falls under a known info-page rule prefix — the route 404s everything else. */
export function isKnownInfoPath(segments: string[]): boolean {
  const path = segments.join("/");
  return RULES.some((candidate) => path === candidate.prefix || path.startsWith(`${candidate.prefix}/`));
}

export function resolveInfoPage(segments: string[]): InfoPage {
  const path = segments.join("/");
  const rule = RULES.find((candidate) => path === candidate.prefix || path.startsWith(`${candidate.prefix}/`));
  const last = segments[segments.length - 1] ?? "";
  const title = rule?.title && path === rule.prefix ? rule.title : slugToTitle(last);
  return {
    title,
    lead: rule?.lead ?? `Find out more about ${title.toLowerCase()} at IKEA Singapore.`,
    collection: rule?.collection,
    officialPath: path,
  };
}
