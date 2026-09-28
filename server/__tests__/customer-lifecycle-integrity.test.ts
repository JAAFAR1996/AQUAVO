import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const checkout = read("client/src/pages/checkout.tsx");
const legacyCheckout = read("client/src/components/cart/checkout-dialog.tsx");
const confirmation = read("client/src/components/cart/checkout/confirmation-view.tsx");
const products = read("server/routes/products.ts");
const orders = read("server/routes/orders.ts");
const orderStorage = read("server/storage/order-storage.ts");
const cartContext = read("client/src/contexts/cart-context.tsx");
const cartRoute = read("server/routes/cart.ts");
const analyticsRoute = read("server/routes/analytics.ts");
const analyticsTracker = read("server/services/analytics-tracker.ts");
const profiler = read("server/services/customer-profiler.ts");
const reviews = read("server/routes/reviews.ts");
const paymentMaintenance = read("server/services/payment-maintenance.ts");
const migration = read("migrations/0090_customer_lifecycle_integrity.sql");
const schema = read("shared/schema.ts");
const waylRoute = read("server/routes/wayl.ts");
const waylService = read("server/services/wayl-order-payment.ts");

describe("customer lifecycle integrity", () => {
  it("carries the exact browser session and acquisition snapshot into COD checkout", () => {
    expect(checkout).toContain("clientSessionId: getClientSessionId()");
    expect(checkout).toContain("attribution: orderAttributionPayload()");
    expect(legacyCheckout).toContain("clientSessionId: getClientSessionId()");
    expect(legacyCheckout).toContain("attribution: orderAttributionPayload()");
    expect(orders).toContain("CLIENT_VIEW_SESSION_ID.test(clientSessionId)");
    expect(orders).toContain("viewSessionId: clientSessionId");
    expect(orderStorage).toContain("viewSessionId: commerceContext.viewSessionId");
    expect(orderStorage).toContain("aqSid: commerceContext.attribution?.aq_sid");
  });

  it("uses the same cs_ session for page/product/cart/order analytics", () => {
    expect(products).toContain("resolveClientSessionId(req, req.query.sid)");
    expect(cartContext).toContain("clientSessionId: getClientSessionId()");
    expect(cartRoute).toContain("resolveCartSessionId(req, data.clientSessionId)");
    expect(analyticsRoute).toContain('router.post("/cart-event"');
    expect(analyticsRoute).toContain("CLIENT_VIEW_SESSION_ID.test(body.clientSessionId)");
    expect(orders).toContain('analyticsTracker.trackSessionStatus(\n                analyticsSessionId');
  });

  it("classifies abandoned carts from real inactivity instead of leaving them active forever", () => {
    expect(analyticsTracker).toContain("async abandonStaleCartSessions(maxAgeHours = 24)");
    expect(analyticsTracker).toContain("status='abandoned'");
    expect(migration).toContain("updated_at < now() - interval '24 hours'");
  });

  it("persists the same attribution contract for Wayl orders", () => {
    expect(confirmation).toContain("clientSessionId: getClientSessionId()");
    expect(confirmation).toContain("attribution: orderAttributionPayload()");
    expect(waylRoute).toContain("attribution: parsed.data.attribution");
    expect(waylService).toContain("viewSessionId: input.sessionId");
    expect(waylService).toContain("aqSid: input.attribution?.aq_sid");
  });

  it("aligns customer_profiles with the phone-centric production identity model", () => {
    expect(schema).toContain('id: serial("id").primaryKey()');
    expect(schema).toContain('phone: varchar("phone", { length: 32 }).notNull()');
    expect(schema).toContain('userId: text("user_id").references(() => users.id)');
    expect(profiler).toContain("normalizeCustomerPhone");
    expect(profiler).toContain("existingByPhone");
    expect(migration).toContain("aquavo_normalize_iraqi_phone");
    expect(migration).toContain("aquavo_sync_customer_profile_from_order");
    expect(migration).toContain("EXCEPTION WHEN OTHERS");
  });

  it("repairs verified-purchase reviews against delivered normalized order lines", () => {
    expect(reviews).toContain('(item.productId ?? item.id) === productId');
    expect(reviews).toContain('order.status === "delivered"');
    expect(migration).toContain("JOIN public.order_items_relational oi ON oi.order_id=o.id");
    expect(migration).toContain("SET verified_purchase=true");
  });

  it("retires the orphan logistics agent path without touching canonical fulfillment", () => {
    expect(orders).not.toContain("INSERT INTO event_bus");
    expect(paymentMaintenance).toContain('eventTypes = ["analytics", "loyalty", "merchant_notification"]');
    expect(migration).toContain("LEGACY_LOGISTICS_CONSUMER_RETIRED_2026_09_28");
  });

  it("adds durable order join keys without guessing historical attribution", () => {
    for (const column of [
      "view_session_id",
      "aq_sid",
      "attribution_utm_source",
      "attribution_fbclid",
      "attribution_gclid",
      "attribution_ttclid",
      "attribution_captured_at",
      "first_touch_utm_source",
      "first_touch_captured_at",
    ]) {
      expect(migration).toContain(column);
    }
    expect(migration).not.toMatch(/UPDATE public\.orders[\s\S]{0,300}(aq_sid|view_session_id)/);
  });
});
