import { expect, test } from "@playwright/test";

/**
 * Mobile navigation — the repo's signature Tailwind v4 risk surface.
 *
 * The drawer is CONDITIONITIONALLY MOUNTED via React state (never a JS-toggled `hidden`
 * class fighting a `flex` utility — the tailwindcss#15884/#18653 bug class). These tests pin
 * that state machine: open → submenu → navigate → unmount, close → reopen (proves the toggle
 * is state-driven, not a one-shot class flip), and the body scroll lock.
 */
test.describe("mobile navigation drawer", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("hamburger opens the drawer with primary nav and utility links", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Menu", exact: true }).click();
    const drawer = page.getByRole("dialog", { name: "Menu" });
    await expect(drawer).toBeVisible();
    for (const label of ["Rooms", "Offers", "Ideas & guides", "Services"]) {
      await expect(drawer.getByRole("link", { name: label, exact: true })).toBeVisible();
    }
    await expect(drawer.getByRole("link", { name: "Track order" })).toBeVisible();
  });

  test("Products submenu expands the category list and navigates", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Menu", exact: true }).click();
    const drawer = page.getByRole("dialog", { name: "Menu" });
    await drawer.getByRole("button", { name: /Products/ }).click();
    await expect(drawer.getByRole("list").first()).toBeVisible();
    await drawer.getByRole("link", { name: /Sofas/ }).first().click();
    await expect(page).toHaveURL(/\/cat\//);
    // Navigating closes the drawer: the panel UNMOUNTS (conditional mount, not a class flip).
    await expect(page.getByRole("dialog", { name: "Menu" })).toHaveCount(0);
  });

  test("close button unmounts the drawer and it reopens on a second click", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Menu", exact: true }).click();
    const drawer = page.getByRole("dialog", { name: "Menu" });
    await expect(drawer).toBeVisible();
    await drawer.getByRole("button", { name: "Close menu" }).click();
    await expect(drawer).toHaveCount(0);
    // Reopen: proves the toggle is state-driven, not a one-shot class change.
    await page.getByRole("button", { name: "Menu", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Menu" })).toBeVisible();
  });

  test("Escape closes the drawer", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Menu", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Menu" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Menu" })).toHaveCount(0);
  });

  test("body scroll locks while the drawer is open and unlocks on close", async ({ page }) => {
    await page.goto("/");
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("");
    await page.getByRole("button", { name: "Menu", exact: true }).click();
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("hidden");
    await page.getByRole("dialog", { name: "Menu" }).getByRole("button", { name: "Close menu" }).click();
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("");
  });

  test("drawer works on an interior route (track-order)", async ({ page }) => {
    await page.goto("/track-order");
    await page.getByRole("button", { name: "Menu", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Menu" })).toBeVisible();
    await page.getByRole("dialog", { name: "Menu" }).getByRole("button", { name: "Close menu" }).click();
    await expect(page.getByRole("dialog", { name: "Menu" })).toHaveCount(0);
  });
});
