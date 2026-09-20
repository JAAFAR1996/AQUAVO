/**
 * Standalone Playwright config for the trilingual UI checks.
 *
 * The main config boots a database-backed server through a Neon verify
 * branch. These checks only need the storefront shell (bundles, routing,
 * lang/dir, selector, screenshots), so they run against an already started
 * local server (mock storage) or a preview URL:
 *
 *   PLAYWRIGHT_BASE_URL=http://localhost:5199 npx playwright test -c e2e/i18n.config.ts
 */
import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || process.env.E2E_BASE_URL || "http://localhost:5199";

export default defineConfig({
  testDir: ".",
  testMatch: /i18n-(locales|bidi)\.spec\.ts/,
  timeout: 60_000,
  retries: 0,
  workers: 2,
  reporter: [["line"], ["html", { outputFolder: "../e2e-artifacts/i18n-report", open: "never" }]],
  outputDir: "../e2e-artifacts/i18n-results",
  use: { baseURL, screenshot: "only-on-failure", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 720 } } },
    { name: "mobile", use: { ...devices["Pixel 5"] } },
  ],
});
