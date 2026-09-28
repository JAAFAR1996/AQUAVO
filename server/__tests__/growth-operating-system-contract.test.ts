import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read=(path:string)=>readFileSync(path,"utf8");

describe("AQUAVO Growth OS contract",()=>{
  it("extends canonical customer lifecycle instead of creating duplicate identity stores",()=>{
    const migration=read("migrations/0091_growth_operating_system.sql");
    const service=read("server/services/growth-operating-system.ts");
    expect(migration).toContain("ALTER TABLE public.customer_profiles");
    expect(migration).not.toContain("CREATE TABLE IF NOT EXISTS public.order_attribution");
    expect(migration).not.toContain("CREATE TABLE IF NOT EXISTS public.customer_aquarium_profiles");
    expect(service).toContain("public.aquavo_normalize_iraqi_phone");
  });

  it("keeps public purchase diagnostics non-authoritative, order keyed and bound to aq_sid",()=>{
    const route=read("server/routes/growth-operating-system.ts");
    const service=read("server/services/growth-operating-system.ts");
    const analytics=read("client/src/lib/analytics.ts");
    const meta=read("client/src/lib/meta-pixel.ts");
    expect(route).toContain('router.post("/purchase-receipt"');
    expect(route).toContain("aqSid:z.string()");
    expect(route).toContain("res.status(204).end()");
    expect(service).toContain("AND aq_sid=");
    expect(analytics).toContain("aq_google_purchase_");
    expect(analytics).toContain("aqSid: getSessionId()");
    expect(meta).toContain("aqSid: getSessionId()");
    expect(analytics).toContain("transaction_id: orderId");
    expect(analytics).toContain("gtag_unavailable");
  });

  it("retries Google Purchase on the confirmation page",()=>{
    const confirmation=read("client/src/pages/order-confirmation.tsx");
    expect(confirmation).toContain('import { trackPurchase } from "@/lib/analytics"');
    expect(confirmation).toContain("trackPurchase({");
  });

  it("never creates a reorder quantity from product fallback variant demand or stale variant identities",()=>{
    const service=read("server/services/growth-operating-system.ts");
    expect(service).toContain("s.sales_basis<>'product_fallback'");
    expect(service).toContain("p.has_variants=true");
    expect(service).toContain("vv->>'id'=b.variant_id");
    expect(service).toContain("recommended_reorder_qty");
    expect(service).toContain("capital_locked");
  });

  it("keeps aquarium notes separate from generic CRM notes",()=>{
    const migration=read("migrations/0092_growth_os_aquarium_notes.sql");
    const service=read("server/services/growth-operating-system.ts");
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS aquarium_notes text");
    expect(service).toContain("aquarium_notes=");
    expect(service).not.toContain("THEN 'Tank age: ' || (u.aquarium_profile->>'tankAge')\n        ELSE cp.notes");
  });

  it("keeps lifecycle outbound manual and suppresses already replenished reminders",()=>{
    const service=read("server/services/growth-operating-system.ts");
    expect(service).toContain("'planned','manual'");
    expect(service).toContain("'already_replenished'");
    expect(service).not.toContain("graph.facebook.com");
  });

  it("fails closed on incomplete bundles and hides internal margin from public responses",()=>{
    const service=read("server/services/growth-operating-system.ts");
    const page=read("client/src/pages/bundles.tsx");
    expect(service).toContain("storefront_visible=false");
    expect(service).toContain("expectedItemCount");
    expect(service).toContain("if(publicOnly) return shared");
    expect(page).toContain("_variantId");
    expect(page).toContain("_variantLabel");
  });

  it("is protected in admin, scheduled daily and exposed read-only through MCP",()=>{
    const routes=read("server/routes.ts");
    const growthRoute=read("server/routes/growth-operating-system.ts");
    const cron=read("server/routes/cron.ts");
    const mcp=read("server/routes/mcp.ts");
    expect(growthRoute).toContain("requireAccountingAdmin");
    expect(routes).toContain('"/api/admin/growth-os"');
    expect(routes).toContain('"/api/growth"');
    expect(cron).toContain("refreshGrowthOs");
    for(const tool of [
      "get_growth_overview","get_attribution_health","get_inventory_intelligence",
      "get_customer_lifecycle","get_customer_aquarium_profiles",
      "get_product_bundles","get_expense_completeness",
    ]) expect(mcp).toContain(tool);
  });

  it("mirrors ordinary admin expenses into the completeness inbox",()=>{
    const expenses=read("server/routes/expenses.ts");
    expect(expenses).toContain("mirrorExpenseToGrowthInbox(inserted)");
    expect(expenses).toContain("mirrorExpenseToGrowthInbox(updated)");
    expect(expenses).toContain("ignoreBusinessExpense");
  });
});
