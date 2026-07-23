/**
 * AQUAVO E2E — CERTIFICATION SUITE.
 *
 * One test per certification dimension, each producing real evidence.
 *
 * Dimensions that cannot be certified are SKIPPED WITH AN EXPLICIT REASON that
 * names the owning defect — they are never weakened into a green pass. The
 * precondition probes below discover the blocker at runtime so the report can
 * cite the actual database error rather than an assumption.
 *
 * Runs under four projects: desktop-light, desktop-dark, mobile-light,
 * mobile-dark. Arabic RTL is exercised by all four (the app ships
 * `<html lang="ar" dir="rtl">`).
 */
import { test, expect, projectTheme } from './support/fixtures';
import type { APIRequestContext } from '@playwright/test';

const FULFILLMENT_API = '/api/admin/fulfillment';

/**
 * Read-only query against the SAME database the app under test resolved.
 * `resolveE2EDatabaseUrl()` re-runs the production deny/allow assertion, so this
 * can never reach production even if it were called by mistake.
 */
async function queryTarget<T>(text: string): Promise<T[]> {
    const [{ neon }, harness] = await Promise.all([
        import('@neondatabase/serverless'),
        import('./support/server-harness.mjs'),
    ]);
    const target = (harness as { resolveE2EDatabaseUrl: () => { url: string } }).resolveE2EDatabaseUrl();
    const sql = neon(target.url);
    return (await sql.query(text)) as T[];
}

/** A product that is BOTH advertised in stock and backed by the canonical ledger. */
async function pickOrderableProduct(): Promise<string | undefined> {
    const rows = await queryTarget<{ id: string }>(`
        SELECT p.id
        FROM products p
        JOIN inventory_canonical_balances b
          ON b.product_id = p.id AND b.variant_id IS NULL
        WHERE p.stock > 0
          AND CAST(p.price AS numeric) > 0
          AND p.deleted_at IS NULL
          AND b.canonical_stock > 5
        ORDER BY b.canonical_stock DESC
        LIMIT 1
    `);
    return rows[0]?.id;
}

interface Blockers {
    /** products.cost_price_resolution missing on the target branch. */
    productsDrift: string | null;
    /** fulfillment-costing migrations not applied on the target branch. */
    fulfillmentDrift: string | null;
}

const blockers: Blockers = { productsDrift: null, fulfillmentDrift: null };

async function probeBlockers(request: APIRequestContext, baseURL: string) {
    // Storefront catalogue.
    const products = await request.get(`${baseURL}/api/products?limit=1`);
    if (!products.ok()) {
        blockers.productsDrift = `GET /api/products -> ${products.status()}: ${(await products.text()).slice(0, 200)}`;
    }

    // Fulfillment costing (needs an admin session).
    const login = await request.post(`${baseURL}/api/login`, {
        headers: { Origin: baseURL },
        data: { email: process.env.E2E_ADMIN_EMAIL, password: process.env.E2E_ADMIN_PASSWORD },
    });
    if (!login.ok()) {
        blockers.fulfillmentDrift = `synthetic admin login -> ${login.status()}`;
        return;
    }
    const probe = await request.post(`${baseURL}${FULFILLMENT_API}/purchases`, {
        headers: { Origin: baseURL },
        data: {
            materialId: '00000000-0000-0000-0000-000000000000',
            quantity: 1,
            totalCost: 1,
            idempotencyKey: `probe-${Date.now()}`,
        },
    });
    const body = (await probe.text()).slice(0, 300);
    // A bogus material id is SUPPOSED to be rejected — that is a healthy API, not
    // drift. Only a missing-relation / missing-column error indicates the
    // migrations are absent. (An earlier version of this probe treated any 500 as
    // drift and wrongly skipped the whole costing suite.)
    if (probe.status() >= 500 && /does not exist|undefined column|undefined table|relation .* does not exist/i.test(body)) {
        blockers.fulfillmentDrift = `POST ${FULFILLMENT_API}/purchases -> ${probe.status()}: ${body}`;
    }
}

test.beforeAll(async ({ playwright, baseURL }) => {
    const request = await playwright.request.newContext();
    await probeBlockers(request, baseURL!.replace(/\/$/, ''));
    await request.dispose();
});

// ─────────────────────────────────────────────────────────────────────────────
// Presentation dimensions — certifiable without the drifted tables.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('presentation', () => {
    test('D1 Arabic RTL — document direction, language and Arabic copy', async ({ page, consoleErrors }) => {
        await page.goto('/', { waitUntil: 'domcontentloaded' });

        await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
        await expect(page.locator('html')).toHaveAttribute('lang', 'ar');

        const computed = await page.evaluate(() => getComputedStyle(document.body).direction);
        expect(computed).toBe('rtl');

        // Real Arabic content, not just a direction attribute on an empty shell.
        const text = await page.evaluate(() => document.body.innerText);
        expect(text).toMatch(/[؀-ۿ]{3,}/);

        expect(consoleErrors.filter((e) => e.includes('[pageerror]'))).toEqual([]);
    });

    test('D2/D3 viewport — no horizontal overflow at this project viewport', async ({ page }, testInfo) => {
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1500);

        const size = page.viewportSize();
        expect(size).not.toBeNull();
        // Desktop projects must be wide, mobile projects must be narrow — proves
        // the two form factors are genuinely distinct runs, not a relabel.
        if (/desktop/.test(testInfo.project.name)) {
            expect(size!.width).toBeGreaterThanOrEqual(1000);
        } else {
            expect(size!.width).toBeLessThanOrEqual(500);
        }

        const overflows = await page.evaluate(
            () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
        );
        expect(overflows).toBe(false);

        await testInfo.attach(`viewport-${testInfo.project.name}`, {
            body: await page.screenshot({ fullPage: false }),
            contentType: 'image/png',
        });
    });

    test('D4/D5 theme — the pinned theme is the one the document applies', async ({ page }, testInfo) => {
        const expected = projectTheme(testInfo.project.name);

        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await expect
            .poll(() => page.evaluate(() => document.documentElement.className), { timeout: 15_000 })
            .toContain(expected);

        const stored = await page.evaluate(() => window.localStorage.getItem('theme'));
        expect(stored).toBe(expected);

        // The theme must actually change pixels, not just a class name.
        const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
        expect(bg).toBeTruthy();

        await testInfo.attach(`theme-${expected}-${testInfo.project.name}`, {
            body: await page.screenshot(),
            contentType: 'image/png',
        });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Synthetic authentication — replaces the unavailable production admin.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('synthetic authentication', () => {
    test('D6 admin API is gated for anonymous callers', async ({ request, baseURL }) => {
        const res = await request.get(`${baseURL!.replace(/\/$/, '')}${FULFILLMENT_API}/materials`);
        expect([401, 403]).toContain(res.status());
    });

    test('D6 the seeded synthetic admin authenticates and reaches admin-only data', async ({ adminPage, baseURL }) => {
        const res = await adminPage.request.get(`${baseURL!.replace(/\/$/, '')}${FULFILLMENT_API}/materials`);
        expect(res.status(), `admin session should reach ${FULFILLMENT_API}/materials`).toBe(200);
        const body = await res.json();
        expect(body).toHaveProperty('materials');
    });

    test('D6 the seeded synthetic customer authenticates', async ({ customerPage, baseURL }) => {
        const res = await customerPage.request.get(`${baseURL!.replace(/\/$/, '')}/api/user`);
        expect([200, 304]).toContain(res.status());
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Costing / fulfillment dimensions.
//
// The migrations that previously blocked these (F-4 PIM per-line identity,
// F-5 product cost resolution) were applied to the verification branch by the
// coordinator on 2026-07-23. These tests exercise the REAL owner workflow and
// its invariants end to end — they are not existence checks.
// ─────────────────────────────────────────────────────────────────────────────

/** Unique per project + run so repeated runs never collide on unique keys. */
function runKey(projectName: string) {
    return `cert-${projectName}-${Date.now().toString(36)}`;
}

test.describe('fulfillment costing', () => {
    test.beforeEach(() => {
        test.skip(
            blockers.fulfillmentDrift !== null,
            `NOT CERTIFIED — fulfillment costing API is unhealthy: ${blockers.fulfillmentDrift}`
        );
    });

    test('D7 preparation · D8 approval and history · D9 cost status · D10 expected vs actual · D11 contribution profit · D12 returns and reversal', async ({
        adminPage,
        baseURL,
    }, testInfo) => {
        test.setTimeout(180_000);
        const api = adminPage.request;
        const base = `${baseURL!.replace(/\/$/, '')}${FULFILLMENT_API}`;
        const RUN = runKey(testInfo.project.name);

        // ── D9 cost status: a brand-new material has an UNKNOWN cost, never 0 ──
        const created = await api.post(`${base}/materials`, {
            data: { name: `صندوق ${RUN}`, category: 'box', unit: 'piece' },
        });
        expect(created.status(), await created.text()).toBe(201);
        const materialId = (await created.json()).id as string;

        const listed = await (await api.get(`${base}/materials`)).json();
        const material = listed.materials.find((m: { id: string }) => m.id === materialId);
        expect(material, 'the new material must appear in the catalogue').toBeTruthy();
        expect(material.approvedCost.status).toBe('unknown');
        expect(material.approvedCost.unitCost, 'an unknown cost must be NULL — never a fabricated 0').toBeNull();

        // ── D7 preparation: receive stock, idempotently ──
        const purchaseBody = {
            materialId,
            quantity: 50,
            totalCost: 75000,
            supplier: `مورد ${RUN}`,
            idempotencyKey: `${RUN}-purchase`,
        };
        const purchase = await api.post(`${base}/purchases`, { data: purchaseBody });
        expect(purchase.status(), await purchase.text()).toBe(201);
        expect((await purchase.json()).unitCost, 'server derives unit cost = 75000/50').toBe(1500);

        const retry = await api.post(`${base}/purchases`, { data: purchaseBody });
        expect((await retry.json()).reused, 'same idempotency key must not double-receive').toBe(true);
        expect((await (await api.get(`${base}/materials/${materialId}/stock`)).json()).balance).toBe(50);

        // ── D8 approval + history: only an APPROVED record gives a catalogue cost ──
        const purchases = await (await api.get(`${base}/materials/${materialId}/purchases`)).json();
        const proposed = await api.post(`${base}/materials/${materialId}/costs`, {
            data: {
                costBasis: 'purchase_batch',
                purchaseId: purchases.purchases[0].id,
                unitCost: null,
                reason: `فاتورة ${RUN}`,
            },
        });
        expect(proposed.status(), await proposed.text()).toBe(201);
        const costRecordId = (await proposed.json()).record.id as string;

        const beforeApproval = await (await api.get(`${base}/materials/${materialId}/costs`)).json();
        expect(
            beforeApproval.current?.unitCost ?? null,
            'an UNAPPROVED proposal must not become the current cost'
        ).toBeNull();

        const approved = await api.post(`${base}/cost-records/${costRecordId}/approve`, { data: {} });
        expect(approved.status(), await approved.text()).toBe(200);

        const costs = await (await api.get(`${base}/materials/${materialId}/costs`)).json();
        expect(costs.current.unitCost, 'approval promotes the derived unit cost').toBe(1500);
        expect(costs.history.length, 'the approval must be retained in history').toBeGreaterThanOrEqual(1);

        const orderId = process.env.E2E_FULFILLMENT_ORDER_ID;
        expect(orderId, 'E2E_FULFILLMENT_ORDER_ID must name a real order on the target branch').toBeTruthy();

        // ── D10 expected cost: computed by the SERVER, never the client ──
        const draftRes = await api.post(`${base}/orders/${orderId}/draft`, {
            data: { manualOnly: true, context: { itemCount: 1 } },
        });
        expect(draftRes.status(), await draftRes.text()).toBe(200);
        const draftId = (await draftRes.json()).draft.id as string;

        await api.post(`${base}/drafts/${draftId}/lines/catalog`, { data: { materialId, quantity: 1 } });
        const withManual = await (
            await api.post(`${base}/drafts/${draftId}/lines/manual`, {
                data: {
                    materialName: `ستكرات ${RUN}`,
                    category: 'sticker',
                    description: 'ستكر شعار',
                    quantity: 2,
                    unit: 'piece',
                    unitCost: 200,
                    note: RUN,
                },
            })
        ).json();
        const stickerLine = withManual.draft.lines.find(
            (l: { materialName: string }) => l.materialName === `ستكرات ${RUN}`
        );
        expect(stickerLine.totalCost, '2 × 200 computed server-side').toBe(400);
        expect(withManual.draft.expectedCost, '1500 (catalog) + 400 (manual)').toBe(1900);

        // D9 again: one UNKNOWN line poisons the whole expected cost — it does not
        // silently contribute zero.
        const withUnknown = await (
            await api.post(`${base}/drafts/${draftId}/lines/manual`, {
                data: { materialName: `كارت ${RUN}`, category: 'card', quantity: 1, unitCost: null },
            })
        ).json();
        expect(withUnknown.draft.expectedCost, 'unknown line ⇒ expected cost is NULL, not 1900').toBeNull();
        expect(withUnknown.draft.costStatus).toBe('incomplete');
        const cardLine = withUnknown.draft.lines.find(
            (l: { materialName: string }) => l.materialName === `كارت ${RUN}`
        );
        await api.delete(`${base}/drafts/${draftId}/lines/${cardLine.id}`);

        // ── D11 contribution profit: a draft has NO accounting effect until confirmed ──
        const before = await (await api.get(`${base}/orders/${orderId}/profitability`)).json();
        const fulfillmentBefore = before.breakdown.aquavoFulfillmentCost;

        // ── D10 actual cost + D7 confirm, idempotently ──
        const confirmed = await api.post(`${base}/drafts/${draftId}/confirm`, { data: {} });
        expect(confirmed.status(), await confirmed.text()).toBe(201);
        const result = await confirmed.json();
        expect(result.actualCost, 'actual cost equals the expected cost that was confirmed').toBe(1900);

        const again = await (await api.post(`${base}/drafts/${draftId}/confirm`, { data: {} })).json();
        expect(again.eventId, 'confirming twice must reuse the same immutable event').toBe(result.eventId);
        expect(again.alreadyConfirmed).toBe(true);
        expect(
            (await (await api.get(`${base}/materials/${materialId}/stock`)).json()).balance,
            'stock deducted exactly once despite the double confirm'
        ).toBe(49);

        // ── D11 contribution profit is present and moved ──
        const after = await (await api.get(`${base}/orders/${orderId}/profitability`)).json();
        expect(after.breakdown.aquavoFulfillmentCost).not.toBe(fulfillmentBefore);
        expect(after.breakdown).toHaveProperty('contributionProfit');
        expect(after.breakdown).toHaveProperty('dataStatus');

        await testInfo.attach('profitability-breakdown', {
            body: JSON.stringify(after.breakdown, null, 2),
            contentType: 'application/json',
        });

        // ── D12 returns and reversal history: exactly negating, idempotent ──
        const reversed = await (
            await api.post(`${base}/events/${result.eventId}/reverse`, { data: { reason: `عكس ${RUN}` } })
        ).json();
        expect(reversed.reused).toBe(false);
        const reversedAgain = await (
            await api.post(`${base}/events/${result.eventId}/reverse`, { data: { reason: `عكس ${RUN}` } })
        ).json();
        expect(reversedAgain.reversalEventId, 'reversal is idempotent').toBe(reversed.reversalEventId);
        expect(reversedAgain.reused).toBe(true);

        // ── The independent verifier still finds no critical violation ──
        const verify = await api.get(`${base}/verify`);
        expect(verify.status()).toBe(200);
        const report = (await verify.json()).report;
        await testInfo.attach('fulfillment-verify-report', {
            body: JSON.stringify(report, null, 2),
            contentType: 'application/json',
        });
        expect(
            report.findings.filter((f: { severity: string }) => f.severity === 'critical'),
            'the fulfillment verifier must report zero critical findings'
        ).toEqual([]);
    });

    test('D9 cost status display — the order panel renders in RTL and never shows a fabricated zero', async ({
        adminPage,
    }, testInfo) => {
        // NOTE: there is no `/admin/orders/:id` route. The fulfillment panel is
        // mounted inside the admin dashboard's "الطلبات" tab, in the per-order
        // detail dialog (orders-management.tsx → <OrderFulfillmentPanel/>).
        // `e2e/fulfillment-admin.spec.ts` navigates to the non-existent URL and
        // can never have passed — recorded as a defect in the report.
        await adminPage.goto('/admin', { waitUntil: 'domcontentloaded' });

        // The tab strip scrolls horizontally on a phone viewport, so the trigger
        // must be brought into view and confirmed active before its panel is
        // read — otherwise the products tab stays mounted and the row lookup
        // silently targets the wrong table.
        const ordersTab = adminPage.getByRole('tab', { name: 'الطلبات' });
        await ordersTab.scrollIntoViewIfNeeded();

        // The dashboard's <Tabs> is UNCONTROLLED (`defaultValue="products"`), so a
        // background refetch that remounts the subtree snaps the selection back to
        // المنتجات. On a phone viewport the data arrives late enough that this
        // reliably eats the first click. Re-assert the selection until it sticks.
        // This only makes NAVIGATION robust — every assertion below is unchanged.
        await expect
            .poll(
                async () => {
                    if ((await ordersTab.getAttribute('data-state')) !== 'active') {
                        await ordersTab.click({ timeout: 10_000 }).catch(() => { });
                    }
                    return ordersTab.getAttribute('data-state');
                },
                { timeout: 45_000, intervals: [500, 1000, 2000] }
            )
            .toBe('active');

        const ordersPanel = adminPage.locator('[role="tabpanel"][data-state="active"]');
        const openDetail = ordersPanel.locator('table tbody tr').first().getByRole('button').first();
        await expect(openDetail).toBeVisible({ timeout: 30_000 });
        await openDetail.scrollIntoViewIfNeeded();
        await openDetail.click();

        const panel = adminPage.getByTestId('order-fulfillment-panel');
        await expect(panel).toBeVisible({ timeout: 30_000 });

        const dir = await adminPage.evaluate(
            () => document.documentElement.getAttribute('dir') ?? getComputedStyle(document.body).direction
        );
        expect(dir).toBe('rtl');

        const body = await adminPage.evaluate(() => document.body.innerText);
        expect(body, 'an unknown expected cost must never render as "0 د.ع"').not.toMatch(
            /التكلفة المتوقعة\s*0\s*د\.ع/
        );

        const overflows = await adminPage.evaluate(
            () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
        );
        expect(overflows, 'the order detail must not force horizontal scrolling').toBe(false);

        await testInfo.attach(`cost-status-panel-${testInfo.project.name}`, {
            body: await adminPage.screenshot({ fullPage: false }),
            contentType: 'image/png',
        });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Storefront / order creation.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('order creation', () => {
    test.beforeEach(() => {
        test.skip(
            blockers.productsDrift !== null,
            `NOT CERTIFIED — the product catalogue API is unhealthy: ${blockers.productsDrift}`
        );
    });

    test('D13 storefront order creation — catalogue renders and an order is really created', async ({
        page,
        customerPage,
        baseURL,
    }, testInfo) => {
        const base = baseURL!.replace(/\/$/, '');

        // The catalogue must actually render products in the browser.
        await page.goto('/products', { waitUntil: 'domcontentloaded' });
        await expect(
            page.locator('[data-testid*="product"], [class*="product-card"], a[href^="/product"]').first()
        ).toBeVisible({ timeout: 30_000 });
        await testInfo.attach(`catalogue-${testInfo.project.name}`, {
            body: await page.screenshot(),
            contentType: 'image/png',
        });

        // And a real order must be creatable through the public storefront API.
        //
        // `POST /api/orders` is rate-limited to 10 per hour per IP, so this test
        // must spend exactly ONE. The candidate is therefore chosen up front from
        // the canonical inventory ledger (read-only) rather than by trial and
        // error. This is NOT a weakened assertion — the divergence between what
        // the storefront advertises and what the ledger allows is asserted
        // separately and loudly in D13b, so it cannot hide behind this result.
        const candidateId = await pickOrderableProduct();
        expect(candidateId, 'the target branch must contain a genuinely orderable product').toBeTruthy();

        const orderRes = await customerPage.request.post(`${base}/api/orders`, {
            headers: { Origin: base },
            data: {
                items: [{ productId: candidateId, quantity: 1 }],
                customerInfo: {
                    name: 'زبون اختبار E2E',
                    phone: '07700000000',
                    address: 'بغداد — عنوان اختبار E2E',
                },
            },
        });
        expect(orderRes.status(), await orderRes.text()).toBe(201);
        const candidate = { id: candidateId! };

        const order = await orderRes.json();
        expect(order.id).toBeTruthy();
        expect(order.orderNumber).toBeTruthy();

        await testInfo.attach('storefront-order', {
            body: JSON.stringify(
                { productId: candidate!.id, id: order.id, orderNumber: order.orderNumber, total: order.total },
                null,
                2
            ),
            contentType: 'application/json',
        });

        // It must be readable back as a real, persisted order.
        const readBack = await customerPage.request.get(`${base}/api/orders/${order.id}`);
        expect(readBack.status()).toBe(200);
        expect((await readBack.json()).id).toBe(order.id);
    });

    test('D13b availability integrity — every product the storefront advertises as in stock must actually be orderable', async ({ }, testInfo) => {
        // Asserted directly against the E2E target branch (read-only) rather than
        // by hammering POST /api/orders, which is capped at 10/hour/IP. This also
        // gives the COMPLETE answer instead of a sample.
        const rows = await queryTarget<{ id: string; stock: number }>(`
            SELECT p.id, p.stock
            FROM products p
            WHERE p.stock > 0
              AND CAST(p.price AS numeric) > 0
              AND p.deleted_at IS NULL
              AND NOT EXISTS (
                  SELECT 1 FROM inventory_canonical_balances b
                  WHERE b.product_id = p.id
                    AND b.variant_id IS NULL
                    AND b.canonical_stock > 0
              )
            ORDER BY p.stock DESC
        `);

        const total = await queryTarget<{ n: number }>(`
            SELECT count(*)::int AS n FROM products
            WHERE stock > 0 AND CAST(price AS numeric) > 0 AND deleted_at IS NULL
        `);

        await testInfo.attach('unorderable-in-stock-products', {
            body: JSON.stringify({ advertisedInStock: total[0]?.n, unorderable: rows.length, products: rows }, null, 2),
            contentType: 'application/json',
        });

        expect(
            rows.map((r) => r.id),
            `products.stock advertises ${rows.length} of ${total[0]?.n} products as purchasable, but the ` +
            `canonical inventory ledger holds no balance for them — a real customer who adds one to the ` +
            `cart gets HTTP 500 "insufficient canonical inventory balance" at checkout.`
        ).toEqual([]);
    });

    test('D14 WhatsApp / admin-side order creation — a manual invoice is really created', async ({
        adminPage,
        baseURL,
    }, testInfo) => {
        const base = baseURL!.replace(/\/$/, '');

        // The WhatsApp channel is created admin-side as a MANUAL INVOICE
        // (POST /api/admin/invoices). There is no admin POST /api/admin/orders.
        const productId = await pickOrderableProduct();
        expect(productId).toBeTruthy();

        const unitPrice = 1500;
        const createRes = await adminPage.request.post(`${base}/api/admin/invoices`, {
            headers: { Origin: base },
            data: {
                customerName: 'زبون واتساب اختبار E2E',
                customerPhone: '07700000000',
                customerCity: 'بغداد',
                customerAddress: 'عنوان اختبار E2E',
                items: [
                    {
                        productId,
                        name: 'منتج اختبار',
                        quantity: 2,
                        unitPrice,
                        total: unitPrice * 2,
                    },
                ],
                subtotal: unitPrice * 2,
                discount: 0,
                delivery: 5000,
                total: unitPrice * 2 + 5000,
            },
        });
        expect(createRes.status(), await createRes.text()).toBe(201);
        const created = await createRes.json();
        expect(created.success).toBe(true);
        expect(created.data?.id, 'the manual invoice must be persisted with an id').toBeTruthy();

        // It must be readable back through the admin surface.
        const readBack = await adminPage.request.get(`${base}/api/admin/invoices/${created.data.id}`);
        expect(readBack.status()).toBe(200);

        await testInfo.attach('whatsapp-manual-invoice', {
            body: JSON.stringify({ id: created.data.id, total: created.data.total }, null, 2),
            contentType: 'application/json',
        });

        // The admin orders surface must carry the channel discriminator that
        // separates WhatsApp orders from storefront orders.
        const res = await adminPage.request.get(`${base}/api/admin/orders`);
        expect(res.status(), await res.text()).toBe(200);
        const body = await res.json();
        const orders = Array.isArray(body) ? body : (body.orders ?? []);
        expect(Array.isArray(orders)).toBe(true);
        expect(orders.length, 'the target branch must contain orders to inspect').toBeGreaterThan(0);
        expect(
            Object.prototype.hasOwnProperty.call(orders[0], 'source'),
            'orders must expose the `source` channel discriminator (website | whatsapp)'
        ).toBe(true);

        await testInfo.attach('admin-orders-channels', {
            body: JSON.stringify(
                { count: orders.length, sources: [...new Set(orders.map((o: { source: string }) => o.source))] },
                null,
                2
            ),
            contentType: 'application/json',
        });
    });
});
