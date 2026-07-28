import { defineConfig, devices } from '@playwright/test';
import { isProductionWebUrl } from './e2e/support/target-safety.mjs';

/**
 * AQUAVO E2E configuration.
 *
 * The app under test is started by e2e/support/global-setup.mjs, which:
 *   - hard-verifies the database target (production endpoints are rejected),
 *   - injects e2e/support/env-lock.mjs so the committed `.env` cannot re-point
 *     the server at production,
 *   - disables all cron / scheduled jobs,
 *   - seeds synthetic admin + customer accounts (no production credentials),
 *   - waits for readiness and PROVES the running server is on the verify branch.
 *
 * Default base URL is loopback-only. Production hosts are rejected outright.
 */
const E2E_PORT = process.env.E2E_PORT || '5199';
const e2eBaseUrl =
    process.env.PLAYWRIGHT_BASE_URL?.trim() ||
    process.env.E2E_BASE_URL?.trim() ||
    `http://127.0.0.1:${E2E_PORT}`;

const parsedBaseUrl = new URL(e2eBaseUrl);

if (isProductionWebUrl(e2eBaseUrl)) {
    throw new Error(`Refusing to run Playwright against blocked host: ${parsedBaseUrl.hostname}`);
}

/** Serial by default; opt into parallelism with E2E_WORKERS. */
const workers = process.env.E2E_WORKERS ? Number(process.env.E2E_WORKERS) : 1;

/** Only chromium engines are installed in this environment (see certification report). */
const enableExtraEngines = process.env.E2E_EXTRA_ENGINES === 'true';

const desktop = { ...devices['Desktop Chrome'], locale: 'ar-IQ', timezoneId: 'Asia/Baghdad' };
const mobile = { ...devices['Pixel 5'], locale: 'ar-IQ', timezoneId: 'Asia/Baghdad' };

export default defineConfig({
    testDir: './e2e',

    globalSetup: './e2e/support/global-setup.mjs',

    fullyParallel: workers > 1,
    forbidOnly: !!process.env.CI,
    retries: Number(process.env.E2E_RETRIES ?? 0),
    workers,

    reporter: [
        // NOTE: reports are written under e2e-artifacts/, NOT the git-tracked
        // playwright-report/ — writes into that directory silently produced no
        // output in this environment, which is why earlier runs left no report.
        ['html', { outputFolder: 'e2e-artifacts/html-report', open: 'never' }],
        ['junit', { outputFile: 'e2e-artifacts/junit.xml' }],
        ['list'],
    ],

    outputDir: 'e2e-artifacts/test-output',

    use: {
        baseURL: parsedBaseUrl.toString(),
        // 'retain-on-failure' (not 'on-first-retry') so a zero-retry serial run
        // still captures the trace — which embeds the browser console log.
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        viewport: { width: 1280, height: 720 },
        ignoreHTTPSErrors: true,
        actionTimeout: 20_000,
        navigationTimeout: 45_000,
    },

    projects: [
        // Arabic RTL is the app default (<html lang="ar" dir="rtl">); every
        // project therefore also exercises RTL.
        { name: 'desktop-light', use: { ...desktop, colorScheme: 'light' } },
        { name: 'desktop-dark', use: { ...desktop, colorScheme: 'dark' } },
        { name: 'mobile-light', use: { ...mobile, colorScheme: 'light' } },
        { name: 'mobile-dark', use: { ...mobile, colorScheme: 'dark' } },
        ...(enableExtraEngines
            ? [
                { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
                { name: 'webkit', use: { ...devices['Desktop Safari'] } },
            ]
            : []),
    ],

    timeout: 60 * 1000,
    expect: { timeout: 15 * 1000 },
});
