import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Session-007 a11y gate: machine-checked accessibility on the key public surfaces.
 * The manual work (drawer focus trap, combobox keyboard nav, labels, landmarks) is
 * pinned ad hoc elsewhere; this sweep catches regressions axe can see — heading order
 * (fixed this session: h1 → sr-only h2 → card h3s), contrast, names, ARIA validity.
 * Scope: serious/critical only, so the gate stays actionable.
 */
test.describe("accessibility sweep (axe, serious+critical)", () => {
  const pages: Array<[string, string]> = [
    ["home", "/"],
    ["product", "/p/billy-oxberg-bookcase-white-s69528344"],
    ["category", "/cat/sofas-armchairs-700640"],
    ["search", "/search?q=billy"],
    ["cart", "/cart"],
    ["checkout", "/checkout"],
    ["info page", "/offers/"],
    ["404", "/totally-unknown-page-xyz"],
  ];

  for (const [name, path] of pages) {
    test(`${name} (${path}) has no serious/critical violations`, async ({ page }) => {
      await page.goto(path);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(
        serious.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })),
        `${name} serious/critical axe violations`,
      ).toEqual([]);
    });
  }
});
