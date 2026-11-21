import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Session-008 S8-M1/L4: axe scans of DYNAMIC states, not just static pages. The static
 * sweep missed the favourite active state for two sessions because nothing ever pressed
 * the button before analyzing — these tests favourite a product, open the mobile drawer,
 * add to cart and open the search-suggestions panel first, then run the same
 * serious/critical axe gate over the resulting DOM.
 */
test.describe("accessibility of dynamic states (axe, serious+critical)", () => {
  test("favourited product page (pressed state) has no serious/critical violations", async ({ page }) => {
    await page.goto("/p/billy-oxberg-bookcase-white-s69528344");
    // Scope to the MAIN product actions (the related-products rail has its own buttons).
    // The accessible name changes after the click (Save → Remove), so re-locate by class.
    const favourite = page.locator(".btn-outline").filter({ hasText: "shopping list" });
    await favourite.click();
    await expect(favourite).toHaveAttribute("aria-pressed", "true");
    // S8-M1 pin: the pressed state's visible text matches its accessible name.
    await expect(favourite).toContainText("Remove BILLY / OXBERG from shopping list");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(
      serious.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })),
      "favourited-state axe violations",
    ).toEqual([]);
  });

  test("mobile drawer, open over the home page, has no serious/critical violations", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByRole("button", { name: "Menu" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(
      serious.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })),
      "drawer-open axe violations",
    ).toEqual([]);
  });

  test("cart with one line item has no serious/critical violations", async ({ page }) => {
    await page.goto("/p/billy-oxberg-bookcase-white-s69528344");
    await page.getByRole("button", { name: "Add to shopping cart" }).first().click();
    // The toast confirms the add before we navigate.
    await expect(page.getByText("added to your shopping cart").first()).toBeVisible({ timeout: 10_000 });
    await page.goto("/cart");
    // Wait until the line actually appears (the empty-state heading must be gone).
    await expect(page.getByText("BILLY / OXBERG").first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("heading", { name: "Your shopping cart is empty" })).toHaveCount(0);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(
      serious.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })),
      "cart-with-items axe violations",
    ).toEqual([]);
  });

  test("search suggestions panel, open with results, has no serious/critical violations", async ({ page }) => {
    await page.goto("/");
    const search = page.locator("#site-search");
    await search.fill("billy");
    // The panel is the combobox's aria-controls target (a plain div, not role=listbox).
    const panelId = await search.getAttribute("aria-controls");
    const panel = page.locator(`#${panelId}`);
    // Session-009 S9-L9: count-independent (a catalog refresh may add BILLY-matches);
    // the contract is "at least one suggestion, first one matches the query".
    await expect(panel.locator("a[href]").first()).toBeVisible({ timeout: 10_000 });
    await expect(panel.locator("a[href]").first()).toContainText(/billy/i);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(
      serious.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })),
      "suggestions-open axe violations",
    ).toEqual([]);
  });
});
