import { describe, expect, it } from "vitest";
import home from "@/content/home.json";
import { resolveInfoPage } from "@/content/pages";
import { isExternal, toHref } from "@/lib/links";

describe("toHref", () => {
  it("drops trailing slashes but keeps query and hash", () => {
    expect(toHref("/offers/")).toBe("/offers");
    expect(toHref("/new/new-products/?sort=NEWEST")).toBe("/new/new-products?sort=NEWEST");
    expect(toHref("/campaigns/christmas/#abc")).toBe("/campaigns/christmas#abc");
  });

  it("keeps the root and external URLs intact", () => {
    expect(toHref("/")).toBe("/");
    expect(toHref("https://family.ikea.com.sg/")).toBe("https://family.ikea.com.sg/");
    expect(isExternal("https://example.com")).toBe(true);
    expect(isExternal("/cart")).toBe(false);
  });
});

describe("resolveInfoPage", () => {
  it("uses curated copy and a product collection for known sections", () => {
    const page = resolveInfoPage(["offers"]);
    expect(page.title).toBe("Offers & promotions");
    expect(page.collection).toBe("lowest-price");
  });

  it("derives a readable title for unknown CMS slugs without a collection", () => {
    const page = resolveInfoPage(["customer-service", "faq"]);
    expect(page.title).toBe("Faq");
    expect(page.collection).toBeUndefined();
    expect(page.officialPath).toBe("customer-service/faq");
  });
});

describe("captured home content", () => {
  it("links every product category to an internal /cat/ route", () => {
    const categories = home.categoryNav.filter((item) => item.href.startsWith("/cat/"));
    expect(categories.length).toBeGreaterThanOrEqual(20);
    for (const item of categories) expect(item.img).toBeTruthy();
  });

  it("has an image and alt text for every card so no tile renders blank", () => {
    const cards = [...home.xmasCards, ...home.newCards, ...home.guides.cards, ...home.services.cards];
    for (const card of cards) {
      expect(card.img).toMatch(/^https:\/\/www\.ikea\.com\//);
      expect(card.alt.length).toBeGreaterThan(0);
    }
  });
});
