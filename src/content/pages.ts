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
  { prefix: "campaigns/christmas", title: "Christmas at IKEA", lead: "Trees, decorations, cooking and hosting essentials to make the season feel like yours.", collection: "christmas-decoration-wt001" },
  { prefix: "rooms", title: "Rooms", lead: "Find inspiration and products for every room in your home.", collection: "sofas-armchairs-700640" },
  { prefix: "ideas", title: "Ideas & guides", lead: "Real homes, clever solutions and planning guides.", collection: "decoration-de001" },
  { prefix: "product-guides/sustainable-products", title: "A sustainable everyday", lead: "Ways to save energy, water and waste at home.", collection: "recycled-materials-700324" },
  { prefix: "customer-service/returns-claims/return-policy", title: "365 days to change your mind", lead: "Changed your mind? You have 365 days to return eligible items." },
  { prefix: "customer-service/services", title: "Services", lead: "Home design, delivery, assembly, finance options and more." },
  { prefix: "stores", title: "Stores", lead: "Visit an IKEA store, restaurant, Swedish Bistro and Swedish Food Market." },
];

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
