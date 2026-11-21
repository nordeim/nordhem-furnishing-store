import { chromium, devices } from "@playwright/test";

/** Capture the remediated storefront from the production build on :3100 into docs/screenshots/. */
const BASE = process.env.BASE ?? "http://127.0.0.1:3100"; // session-009: BASE override (dev server shots double as live proof of the S9-H1 fix)
const OUT = "docs/screenshots";

const shots = [
  { name: "01-home-desktop", url: "/", viewport: { width: 1440, height: 900 } },
  { name: "02-home-mobile", url: "/", viewport: { width: 390, height: 844 } },
  { name: "03-mobile-menu-open", url: "/", viewport: { width: 390, height: 844 }, openMenu: true },
  { name: "04-mobile-menu-products", url: "/", viewport: { width: 390, height: 844 }, openMenu: true, openProducts: true },
  { name: "05-search-suggestions", url: "/", viewport: { width: 1440, height: 900 }, typeSearch: "billy" },
  { name: "06-category-listing", url: "/cat/storage-organisation-st001", viewport: { width: 1440, height: 900 } },
  { name: "07-category-mobile", url: "/cat/storage-organisation-st001", viewport: { width: 390, height: 844 } },
  { name: "08-product-page", url: "/", viewport: { width: 1440, height: 900 }, firstProduct: true },
  { name: "09-cart", url: "/cart", viewport: { width: 1440, height: 900 } },
  { name: "10-track-order", url: "/track-order", viewport: { width: 1440, height: 900 } },
  { name: "11-ikea-family", url: "/ikea-family", viewport: { width: 1440, height: 900 } },
  { name: "12-404", url: "/cat/does-not-exist", viewport: { width: 1440, height: 900 } },
];

const browser = await chromium.launch();
for (const shot of shots) {
  const context = await browser.newContext({ ...devices["Desktop Chrome"], viewport: shot.viewport });
  const page = await context.newPage();
  await page.goto(BASE + shot.url, { waitUntil: "load" });
    await page.waitForTimeout(1500);
  if (shot.firstProduct) {
    await page.locator("a[href^='/p/']:visible").first().click();
    await page.waitForTimeout(1200);
  }
  if (shot.openMenu) {
    await page.getByRole("button", { name: "Menu", exact: true }).click();
    if (shot.openProducts) {
      await page.getByRole("dialog", { name: "Menu" }).getByRole("button", { name: /Products/ }).click();
    }
    await page.waitForTimeout(400);
  }
  if (shot.typeSearch) {
    await page.locator("#site-search").fill(shot.typeSearch);
    await page.waitForTimeout(800);
  }
  await page.screenshot({ path: `${OUT}/${shot.name}.png`, fullPage: false });
  await context.close();
  console.log("captured", shot.name);
}
await browser.close();
console.log("done");
