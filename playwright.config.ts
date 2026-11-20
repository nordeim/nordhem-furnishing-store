import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E — boots the PRODUCTION build (npm run build && npm run start) on :3100 so the
 * suite exercises the same server that ships. Chromium only: WebKit is not installable in the
 * target sandbox (the homenest-store-s suite documents the same constraint). Run after build:
 *   npm run build && npm run test:e2e
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  outputDir: "test-results",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      // iPhone 13 viewport/UA via Chromium — the touch viewport is what this suite pins
      // (the mobile drawer + conditional-mount pattern is the repo's signature Tailwind v4 risk).
      name: "mobile-navigation",
      testMatch: /mobile-navigation\.spec\.ts/,
      use: {
        ...devices["iPhone 13"],
        browserName: "chromium",
      },
    },
    {
      name: "desktop-chromium",
      testIgnore: /mobile-navigation\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    command: "PORT=3100 npm run start",
    url: "http://127.0.0.1:3100/api/health",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
