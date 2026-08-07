import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("order shipped delivery-company contract", () => {
  it("requires the admin UI to choose a company before shipping", () => {
    const management = read("client/src/components/admin/orders-management.tsx");
    const dialog = read("client/src/components/admin/order-ship-carrier-dialog.tsx");

    expect(management).toContain("OrderShipCarrierDialog");
    expect(management).toContain("<OrderShipCarrierDialog orderId={order.id} onShipped={fetchOrders} />");
    expect(management).not.toContain("handleStatusChange(order.id, 'shipped')");

    expect(dialog).toContain("اختر شركة التوصيل");
    expect(dialog).toContain('useState("")');
    expect(dialog).toContain('/api/admin/orders/delivery-companies');
    expect(dialog).toContain('status: "shipped"');
    expect(dialog).toContain("deliveryCompanyId: selectedCompanyId");
    expect(dialog).toContain("disabled={!selectedCompanyId || loading || submitting}");
    expect(dialog).not.toContain("is_default");
    expect(dialog).not.toContain("الوسيط");
    expect(dialog).not.toContain("الطائر المميز للنقل");
  });

  it("serves only active companies from the existing accounting table", () => {
    const route = read("server/routes/admin-orders-v2.ts");

    expect(route).toContain('router.get("/orders/delivery-companies"');
    expect(route).toContain("FROM public.delivery_companies");
    expect(route).toContain("WHERE active=true");
    expect(route).not.toContain("INSERT INTO public.delivery_companies");
  });

  it("rejects shipped transitions without an explicit active deliveryCompanyId", () => {
    const route = read("server/routes/admin-orders-v2.ts");

    expect(route).toContain('const enteringShipped = input.status === "shipped" && oldStatus !== "shipped"');
    expect(route).toContain("if (enteringShipped && !input.deliveryCompanyId)");
    expect(route).toContain("WHERE id=${input.deliveryCompanyId} AND active=true FOR SHARE");
    expect(route).toContain("carrierName = company.name");
    expect(route).toContain("carrierFee = Number(company.default_fee)");
    expect(route).toContain("else if (!enteringShipped && needsCarrier && !carrierName)");
  });

  it("does not mark COD received or paid merely because an order is shipped", () => {
    const route = read("server/routes/admin-orders-v2.ts");
    const shippedBlock = route.slice(
      route.indexOf('const enteringShipped = input.status === "shipped"'),
      route.indexOf("let lifecycle:", route.indexOf('const enteringShipped = input.status === "shipped"')),
    );

    expect(shippedBlock).not.toContain("codReceived");
    expect(shippedBlock).not.toContain("cod_received");
    expect(shippedBlock).not.toContain("paid");
  });

  it("keeps a database-level shipped guard without rewriting historical orders", () => {
    const migration = read("migrations/0072_accounting_require_explicit_shipped_carrier.sql");

    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.apply_default_delivery_company_to_order()");
    expect(migration).toContain("DELIVERY_COMPANY_REQUIRED_FOR_SHIPPED");
    expect(migration).toContain("DELIVERY_COMPANY_INACTIVE_OR_UNKNOWN");
    expect(migration).toContain("NEW.carrier_fee:=v_fee");
    expect(migration).toContain("BEFORE INSERT OR UPDATE OF carrier,status ON public.orders");
    expect(migration).not.toMatch(/UPDATE\s+public\.orders\s+SET/i);
  });
});
