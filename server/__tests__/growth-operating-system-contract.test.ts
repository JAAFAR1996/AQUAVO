import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

describe("AQUAVO Growth OS contract", () => {
  it("ships an additive Growth OS migration and rollback", () => {
    const migration = read("migrations/0091_growth_operating_system.sql");
    const rollback = read("migrations/0091_growth_operating_system_rollback.sql");
    for (const table of [
      "order_attribution",
      "purchase_measurement_receipts",
      "inventory_sku_daily",
      "product_repurchase_profiles",
      "customer_aquarium_profiles",
      "customer_lifecycle_jobs",
      "product_bundles",
      "product_bundle_items",
      "business_expense_inbox",
    ]) {
      expect(migration).toContain(table);
      expect(rollback).toContain(table);
    }
    expect(migration).toContain("0091_growth_operating_system");
    expect(migration).not.toContain("UPDATE public.orders");
    expect(migration).not.toContain("DELETE FROM public.orders");
  });

  it("carries durable attribution through COD and Wayl checkout", () => {
    const browser = read("client/src/lib/attribution.ts");
    const checkout = read("client/src/pages/checkout.tsx");
    const online = read("client/src/components/cart/checkout/confirmation-view.tsx");
    const orders = read("server/routes/orders.ts");
    const wayl = read("server/routes/wayl.ts");

    expect(browser).toContain('"gclid", "gbraid", "wbraid"');
    expect(browser).toContain("landing_path");
    expect(checkout).toContain("attribution: orderAttributionPayload()");
    expect(online).toContain("attribution: orderAttributionPayload()");
    expect(orders).toContain("await persistOrderAttribution");
    expect(wayl).toContain("await persistOrderAttribution");
  });

  it("makes Google purchase measurement recoverable and diagnosable", () => {
    const analytics = read("client/src/lib/analytics.ts");
    const confirmation = read("client/src/pages/order-confirmation.tsx");

    expect(analytics).toContain("aq_google_purchase_");
    expect(analytics).toContain("/api/growth/purchase-receipt");
    expect(analytics).toContain("transaction_id: orderId");
    expect(analytics).toContain("gtag_unavailable");
    expect(confirmation).toContain("trackPurchase({");
  });

  it("classifies SKU velocity and keeps lifecycle outbound manual", () => {
    const service = read("server/services/growth-operating-system.ts");
    expect(service).toContain("units_30d");
    expect(service).toContain("units_60d");
    expect(service).toContain("units_90d");
    expect(service).toContain("recommended_reorder_qty");
    expect(service).toContain("capital_locked");
    expect(service).toContain("'day7_care'");
    expect(service).toContain("'repurchase'");
    expect(service).toContain("'planned','manual'");
    expect(service).not.toContain("graph.facebook.com");
  });

  it("never exposes internal bundle cost or margin on the public API", () => {
    const service = read("server/services/growth-operating-system.ts");
    const route = read("server/routes/growth-operating-system.ts");
    expect(service).toContain("if (publicOnly) return shared");
    expect(service.indexOf("if (publicOnly) return shared")).toBeLessThan(service.indexOf("estimatedCost:"));
    expect(route).toContain('getBundles(true)');
    expect(route).toContain('getBundles(false)');
  });

  it("is protected in admin, scheduled daily, visible, and MCP-readable", () => {
    const routes = read("server/routes.ts");
    const growthRoute = read("server/routes/growth-operating-system.ts");
    const cron = read("server/routes/cron.ts");
    const dashboard = read("client/src/components/admin/business-intelligence-dashboard.tsx");
    const mcp = read("server/routes/mcp.ts");

    expect(growthRoute).toContain("requireAccountingAdmin");
    expect(routes).toContain('"/api/admin/growth-os"');
    expect(routes).toContain('"/api/growth"');
    expect(cron).toContain("refreshGrowthOs");
    expect(dashboard).toContain('queryKey: ["growth-os", "overview"]');
    for (const tool of [
      "get_growth_overview",
      "get_attribution_health",
      "get_inventory_intelligence",
      "get_customer_lifecycle",
      "get_customer_aquarium_profiles",
      "get_product_bundles",
      "get_expense_completeness",
    ]) {
      expect(mcp).toContain(tool);
    }
  });

  it("keeps curated bundle pricing consistent with the ordinary cart", () => {
    const service = read("server/services/growth-operating-system.ts");
    const page = read("client/src/pages/bundles.tsx");
    expect(service).toContain("'sum'");
    expect(page).toContain("addItems(resolved)");
    expect(page).toContain("requiresVariantSelection");
  });

  it("mirrors manually entered admin expenses into the completeness inbox", () => {
    const expenses = read("server/routes/expenses.ts");
    expect(expenses).toContain("mirrorExpenseToGrowthInbox(inserted)");
    expect(expenses).toContain("mirrorExpenseToGrowthInbox(updated)");
    expect(expenses).toContain("ignoreBusinessExpense");
  });
});
