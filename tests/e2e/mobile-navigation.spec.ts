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

  test("focus is trapped in the drawer: Tab wraps from the last link back to the close button", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Menu", exact: true }).click();
    const drawer = page.getByRole("dialog", { name: "Menu" });
    await expect(drawer).toBeVisible();
    // Focus starts on the close button (initial focus).
    await expect(drawer.getByRole("button", { name: "Close menu" })).toBeFocused();

    // Tab through every focusable in the drawer: focus must never escape the drawer, and the
    // press that would leave the last link must WRAP to the first focusable (the close button).
    const focusables = await drawer.locator("button, a[href]").all();
    expect(focusables.length).toBeGreaterThan(1);
    for (let i = 0; i < focusables.length - 1; i += 1) {
      await page.keyboard.press("Tab");
      await expect
        .poll(() => page.evaluate(() => document.getElementById("mobile-drawer")?.contains(document.activeElement)))
        .toBe(true);
    }
    // We are now on the last focusable; the next Tab wraps to the first (close button).
    await page.keyboard.press("Tab");
    await expect(drawer.getByRole("button", { name: "Close menu" })).toBeFocused();
  });

  test("drawer reopens with the Products submenu collapsed (session-012 S12-I4)", async ({ page }) => {
    await page.goto("/");
    const hamburger = page.getByRole("button", { name: "Menu", exact: true });
    await hamburger.click();
    const drawer = page.getByRole("dialog", { name: "Menu" });
    const productsToggle = drawer.getByRole("button", { name: "Products", exact: true });
    await productsToggle.click();
    await expect(productsToggle).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Escape");
    await expect(drawer).toHaveCount(0);
    // Reopening must present a FRESH drawer: the submenu flag lives in the parent while
    // the drawer unmounts, so without an explicit reset it survives the round-trip.
    await hamburger.click();
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("button", { name: "Products", exact: true })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  test("drawer closes when the viewport crosses the lg breakpoint (session-013 S13-L2)", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Menu", exact: true }).click();
    const drawer = page.getByRole("dialog", { name: "Menu" });
    await expect(drawer).toBeVisible();
    // Widening past lg used to leave the drawer hidden-but-mounted (lg:hidden) with the
    // scroll lock and the Tab focus trap still live and no visible drawer. It must
    // close through the normal path: unmounted, scroll unlocked.
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(drawer).toHaveCount(0);
    await expect
      .poll(() => page.evaluate(() => document.body.style.overflow))
      .toBe("");
  });

  test("focus restores to the hamburger button after the drawer closes", async ({ page }) => {
    await page.goto("/");
    const hamburger = page.getByRole("button", { name: "Menu", exact: true });
    await hamburger.click();
    await expect(page.getByRole("dialog", { name: "Menu" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Menu" })).toHaveCount(0);
    await expect(hamburger).toBeFocused();
  });
});
