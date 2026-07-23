import { test, expect, type Page } from "@playwright/test";
import { resolveAdminCredentials, isProductionUrl } from "./support/test-credentials";

/**
 * End-to-end workflow for the per-order fulfillment-costing admin UX.
 *
 * SAFETY. This spec WRITES accounting rows (materials, cost approvals, fulfillment
 * events, stock movements). It therefore refuses to run against production, and
 * skips entirely unless the operator explicitly opts in with a writable local
 * database via E2E_FULFILLMENT_WRITABLE=true. Running it against the read-only
 * Neon connection would fail on the first mutation, so the skip is deliberate and
 * loud rather than a silent pass.
 *
 * Local run:
 *   PLAYWRIGHT_BASE_URL=http://localhost:5000 \
 *   E2E_ADMIN_EMAIL=... E2E_ADMIN_PASSWORD=... \
 *   E2E_FULFILLMENT_WRITABLE=true \
 *   npx playwright test e2e/fulfillment-admin.spec.ts
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? process.env.E2E_BASE_URL;
const WRITABLE = process.env.E2E_FULFILLMENT_WRITABLE === "true";
const API = "/api/admin/fulfillment";

// A unique suffix per run so repeated local runs never collide on unique keys.
const RUN = `e2e-${Date.now().toString(36)}`;

test.describe("تجهيز الطلب — fulfillment costing admin workflow", () => {
  test.skip(!WRITABLE,
    "Set E2E_FULFILLMENT_WRITABLE=true and point PLAYWRIGHT_BASE_URL at a LOCAL app with a WRITABLE database. " +
    "This spec creates accounting rows and must never run against production or a read-only connection.");

  test.beforeAll(() => {
    if (isProductionUrl(BASE_URL)) {
      throw new Error("Refusing to run the write-heavy fulfillment E2E spec against a production URL.");
    }
  });

  async function loginAsAdmin(page: Page) {
    const { email, password } = resolveAdminCredentials({ baseURL: BASE_URL });
    await page.goto("/admin/login", { waitUntil: "domcontentloaded" });
    await page.locator('input[type="email"]').first().fill(email);
    await page.locator('input[type="password"]').first().fill(password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/\/admin(?!\/login)/, { timeout: 20_000 });
  }

  test("the admin API is gated: an anonymous request is refused", async ({ request }) => {
    const res = await request.get(`${API}/materials`);
    expect([401, 403]).toContain(res.status());
  });

  test("full owner workflow: material → approved cost → draft → confirm → profit → reverse", async ({ page }) => {
    await loginAsAdmin(page);
    const api = page.request;

    // 1) Create a material. It starts with an UNKNOWN cost — never 0.
    const created = await api.post(`${API}/materials`, {
      data: { name: `صندوق ${RUN}`, category: "box", unit: "piece" },
    });
    expect(created.status()).toBe(201);
    const materialId = (await created.json()).id as string;

    const listed = await (await api.get(`${API}/materials`)).json();
    const material = listed.materials.find((m: { id: string }) => m.id === materialId);
    expect(material.approvedCost.unitCost).toBeNull();
    expect(material.approvedCost.status).toBe("unknown");

    // 2) Receive stock via a purchase, idempotently.
    const purchaseBody = {
      materialId, quantity: 50, totalCost: 75000,
      supplier: "مورد اختبار", idempotencyKey: `${RUN}-purchase`,
    };
    const purchase = await api.post(`${API}/purchases`, { data: purchaseBody });
    expect(purchase.status()).toBe(201);
    expect((await purchase.json()).unitCost).toBe(1500);
    const retry = await api.post(`${API}/purchases`, { data: purchaseBody });
    expect((await retry.json()).reused).toBe(true);
    expect((await (await api.get(`${API}/materials/${materialId}/stock`)).json()).balance).toBe(50);

    // 3) Approve the cost. Only an approved record can give the catalog a cost.
    const purchases = await (await api.get(`${API}/materials/${materialId}/purchases`)).json();
    const proposed = await api.post(`${API}/materials/${materialId}/costs`, {
      data: {
        costBasis: "purchase_batch", purchaseId: purchases.purchases[0].id,
        unitCost: null, reason: `فاتورة اختبار ${RUN}`,
      },
    });
    expect(proposed.status()).toBe(201);
    const costRecordId = (await proposed.json()).record.id as string;
    const approved = await api.post(`${API}/cost-records/${costRecordId}/approve`, { data: {} });
    expect(approved.status()).toBe(200);

    const costs = await (await api.get(`${API}/materials/${materialId}/costs`)).json();
    expect(costs.current.unitCost).toBe(1500);
    expect(costs.history.length).toBeGreaterThanOrEqual(1);

    // 4) Pick a real order to work against.
    const orderId = process.env.E2E_FULFILLMENT_ORDER_ID;
    test.skip(!orderId, "Set E2E_FULFILLMENT_ORDER_ID to an order id in the local database.");

    // 5) Open a draft, add a catalog line and a NAMED manual line.
    const draftRes = await api.post(`${API}/orders/${orderId}/draft`, {
      data: { manualOnly: true, context: { itemCount: 1 } },
    });
    expect(draftRes.status()).toBe(200);
    const draftId = (await draftRes.json()).draft.id as string;

    await api.post(`${API}/drafts/${draftId}/lines/catalog`, { data: { materialId, quantity: 1 } });
    const withManual = await (await api.post(`${API}/drafts/${draftId}/lines/manual`, {
      data: {
        materialName: "ستكرات", category: "sticker", description: "ستكر شعار",
        quantity: 2, unit: "piece", unitCost: 200, note: `${RUN}`,
      },
    })).json();
    // The SERVER computed every total — the client never does.
    const stickerLine = withManual.draft.lines.find((l: { materialName: string }) => l.materialName === "ستكرات");
    expect(stickerLine.totalCost).toBe(400);
    expect(withManual.draft.expectedCost).toBe(1900);

    // An UNKNOWN cost keeps the whole expected cost unknown.
    const withUnknown = await (await api.post(`${API}/drafts/${draftId}/lines/manual`, {
      data: { materialName: "كارت", category: "card", quantity: 1, unitCost: null },
    })).json();
    expect(withUnknown.draft.expectedCost).toBeNull();
    expect(withUnknown.draft.costStatus).toBe("incomplete");
    const cardLine = withUnknown.draft.lines.find((l: { materialName: string }) => l.materialName === "كارت");
    await api.delete(`${API}/drafts/${draftId}/lines/${cardLine.id}`);

    // 6) A draft has NO accounting effect until it is confirmed.
    const beforeConfirm = await (await api.get(`${API}/orders/${orderId}/profitability`)).json();
    const fulfillmentBefore = beforeConfirm.breakdown.aquavoFulfillmentCost;

    // 7) Confirm — one immutable event — and repeat to prove idempotency.
    const confirmed = await api.post(`${API}/drafts/${draftId}/confirm`, { data: {} });
    expect(confirmed.status()).toBe(201);
    const result = await confirmed.json();
    expect(result.actualCost).toBe(1900);
    const again = await (await api.post(`${API}/drafts/${draftId}/confirm`, { data: {} })).json();
    expect(again.eventId).toBe(result.eventId);
    expect(again.alreadyConfirmed).toBe(true);

    // Stock deducted exactly once.
    expect((await (await api.get(`${API}/materials/${materialId}/stock`)).json()).balance).toBe(49);

    // 8) The canonical profitability breakdown now includes the fulfillment cost.
    const after = await (await api.get(`${API}/orders/${orderId}/profitability`)).json();
    expect(after.breakdown.aquavoFulfillmentCost).not.toBe(fulfillmentBefore);
    expect(after.breakdown).toHaveProperty("contributionProfit");
    expect(after.breakdown).toHaveProperty("dataStatus");

    // 9) Reverse the event; the reversal is idempotent and exactly negating.
    const reversed = await (await api.post(`${API}/events/${result.eventId}/reverse`, {
      data: { reason: `عكس تلقائي ${RUN}` },
    })).json();
    expect(reversed.reused).toBe(false);
    const reversedAgain = await (await api.post(`${API}/events/${result.eventId}/reverse`, {
      data: { reason: `عكس تلقائي ${RUN}` },
    })).json();
    expect(reversedAgain.reversalEventId).toBe(reversed.reversalEventId);
    expect(reversedAgain.reused).toBe(true);

    // 10) The independent verifier confirms every invariant still holds.
    const verify = await api.get(`${API}/verify`);
    expect(verify.status()).toBe(200);
    const report = (await verify.json()).report;
    expect(report.findings.filter((f: { severity: string }) => f.severity === "critical")).toEqual([]);
  });

  test("the fulfillment panel renders inside an order in Arabic RTL, light and dark", async ({ page }) => {
    // F-9 FIX: there is NO `/admin/orders/:id` route. The fulfillment panel
    // (SectionCard title="تجهيز الطلب") is composed by <OrderFulfillmentPanel>,
    // which renders inside the order-DETAIL DIALOG of the admin Orders tab
    // (client/src/components/admin/orders-management.tsx → Dialog → line ~806),
    // opened from the per-row detail (eye) button. The previous navigation drove
    // a route that 404s, so this test could never have exercised the real panel.
    // We now reach it through the real UI surface.
    await loginAsAdmin(page);

    await page.goto(`/admin`, { waitUntil: "domcontentloaded" });

    // Switch to the Orders tab (Radix TabsTrigger → role="tab").
    await page.getByRole("tab", { name: "الطلبات" }).click();

    // The orders table lists real orders; open the first row's detail dialog.
    const firstRow = page.locator("table tbody tr").first();
    const hasOrders = await firstRow.count();
    test.skip(hasOrders === 0, "No orders in the local database to open a fulfillment panel against.");
    // The first action button in the row is the detail (eye) trigger.
    await firstRow.getByRole("button").first().click();

    // The detail dialog carries the fulfillment panel. Scope every assertion to it.
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 20_000 });
    const panel = dialog.getByText("تجهيز الطلب").first();
    await expect(panel).toBeVisible({ timeout: 20_000 });

    // Direction is RTL.
    const dir = await page.evaluate(() =>
      document.documentElement.getAttribute("dir") ?? getComputedStyle(document.body).direction);
    expect(dir).toBe("rtl");

    // An unknown amount reads as "غير معروف" — never as a fabricated zero.
    const body = await dialog.evaluate((el) => (el as HTMLElement).innerText);
    expect(body).not.toMatch(/التكلفة المتوقعة\s*0\s*د\.ع/);

    // Both themes render the panel.
    for (const theme of ["light", "dark"] as const) {
      await page.evaluate((t) => {
        document.documentElement.classList.toggle("dark", t === "dark");
        document.documentElement.setAttribute("data-theme", t);
      }, theme);
      await expect(panel).toBeVisible();
    }

    // Mobile viewport keeps the panel usable and does not scroll horizontally.
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(panel).toBeVisible();
    const overflows = await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(overflows).toBe(false);
  });
});
