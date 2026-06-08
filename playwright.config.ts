import { defineConfig, devices } from '@playwright/test';

const e2eBaseUrl = process.env.PLAYWRIGHT_BASE_URL?.trim() || process.env.E2E_BASE_URL?.trim();

if (!e2eBaseUrl) {
    throw new Error(
        'Missing E2E base URL. Set PLAYWRIGHT_BASE_URL or E2E_BASE_URL to a safe local/staging URL before running Playwright.'
    );
}

const parsedBaseUrl = new URL(e2eBaseUrl);
const blockedHosts = new Set([
    'aquavoiq.com',
    'www.aquavoiq.com',
    ['fist', 'live.vercel.app'].join('-'),
]);

if (blockedHosts.has(parsedBaseUrl.hostname)) {
    throw new Error(`Refusing to run Playwright against blocked host: ${parsedBaseUrl.hostname}`);
}

/**
 * Playwright configuration for AQUAVO E2E tests.
 * Requires an explicit safe local or staging base URL.
 */
export default defineConfig({
    // Test directory
    testDir: './e2e',

    // Run tests in parallel
    fullyParallel: true,

    // Fail the build on CI if you accidentally left test.only in the source code
    forbidOnly: !!process.env.CI,

    // Retry on CI only
    retries: process.env.CI ? 2 : 0,

    // Opt out of parallel tests on CI
    workers: process.env.CI ? 1 : undefined,

    // Reporter to use
    reporter: [
        ['html', { outputFolder: 'playwright-report' }],
        ['list']
    ],

    // Shared settings for all the projects
    use: {
        // Base URL to use in actions like `await page.goto('/')`
        baseURL: parsedBaseUrl.toString(),

        // Collect trace when retrying the failed test
        trace: 'on-first-retry',

        // Take screenshot on failure
        screenshot: 'only-on-failure',

        // Video recording on failure
        video: 'retain-on-failure',

        // Viewport size
        viewport: { width: 1280, height: 720 },

        // Ignore HTTPS errors
        ignoreHTTPSErrors: true,
    },

    // Configure projects for major browsers
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
        },
        {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] },
        },
        // Mobile viewports
        {
            name: 'Mobile Chrome',
            use: { ...devices['Pixel 5'] },
        },
        {
            name: 'Mobile Safari',
            use: { ...devices['iPhone 12'] },
        },
    ],

    // Timeout for each test
    timeout: 60 * 1000,

    // Expect timeout
    expect: {
        timeout: 15 * 1000,
    },
});
