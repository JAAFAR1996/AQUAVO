/**
 * AQUAVO E2E — shared fixtures.
 *
 * Provides:
 *   - per-project theme pinning (light/dark) via the app's own localStorage key,
 *   - browser console-error + pageerror capture, attached to the report on failure,
 *   - synthetic credentials (seeded by global-setup, never production),
 *   - `adminPage` / `customerPage`: already-authenticated contexts.
 */
import { test as base, expect, type Page, type BrowserContext } from '@playwright/test';

export interface SyntheticCreds {
    adminEmail: string;
    adminPassword: string;
    userEmail: string;
    userPassword: string;
}

export type AquavoTheme = 'light' | 'dark';

export function projectTheme(projectName: string): AquavoTheme {
    return /dark/i.test(projectName) ? 'dark' : 'light';
}

async function pinTheme(context: BrowserContext, theme: AquavoTheme) {
    await context.addInitScript((t) => {
        try {
            window.localStorage.setItem('theme', t as string);
        } catch {
            /* storage blocked */
        }
    }, theme);
}

async function loginViaApi(context: BrowserContext, baseURL: string, email: string, password: string) {
    const res = await context.request.post(`${baseURL.replace(/\/$/, '')}/api/login`, {
        headers: { Origin: baseURL },
        data: { email, password },
    });
    if (!res.ok()) {
        throw new Error(
            `[fixtures] Synthetic login failed (${res.status()}). ` +
            `Note: /api/login is rate-limited to 5 FAILED attempts / 15 min per IP.`
        );
    }
}

export const test = base.extend<{
    creds: SyntheticCreds;
    consoleErrors: string[];
    adminPage: Page;
    customerPage: Page;
}>({
    creds: async ({ }, use) => {
        const c = {
            adminEmail: process.env.E2E_ADMIN_EMAIL ?? '',
            adminPassword: process.env.E2E_ADMIN_PASSWORD ?? '',
            userEmail: process.env.E2E_USER_EMAIL ?? '',
            userPassword: process.env.E2E_USER_PASSWORD ?? '',
        };
        if (!c.adminEmail || !c.adminPassword) {
            throw new Error(
                '[fixtures] Synthetic credentials missing. They are produced by ' +
                'e2e/support/global-setup.mjs — run via `playwright test`, not a bare spec.'
            );
        }
        await use(c);
    },

    // Pin the theme the project is certifying, before any app JS runs.
    context: async ({ context }, use, testInfo) => {
        await pinTheme(context, projectTheme(testInfo.project.name));
        await use(context);
    },

    // Capture console errors / uncaught page errors for every test.
    consoleErrors: async ({ page }, use, testInfo) => {
        const errors: string[] = [];
        page.on('console', (msg) => {
            if (msg.type() === 'error') errors.push(`[console.error] ${msg.text()}`);
        });
        page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`));
        page.on('requestfailed', (req) =>
            errors.push(`[requestfailed] ${req.method()} ${req.url()} — ${req.failure()?.errorText}`)
        );

        await use(errors);

        if (testInfo.status !== testInfo.expectedStatus && errors.length) {
            await testInfo.attach('browser-console-errors', {
                body: errors.join('\n'),
                contentType: 'text/plain',
            });
        }
    },

    adminPage: async ({ browser, baseURL }, use, testInfo) => {
        const context = await browser.newContext();
        await pinTheme(context, projectTheme(testInfo.project.name));
        await loginViaApi(
            context,
            baseURL!,
            process.env.E2E_ADMIN_EMAIL!,
            process.env.E2E_ADMIN_PASSWORD!
        );
        const page = await context.newPage();
        await use(page);
        await context.close();
    },

    customerPage: async ({ browser, baseURL }, use, testInfo) => {
        const context = await browser.newContext();
        await pinTheme(context, projectTheme(testInfo.project.name));
        await loginViaApi(
            context,
            baseURL!,
            process.env.E2E_USER_EMAIL!,
            process.env.E2E_USER_PASSWORD!
        );
        const page = await context.newPage();
        await use(page);
        await context.close();
    },
});

export { expect };
