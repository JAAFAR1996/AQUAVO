import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("GA4 ecommerce contract", () => {
  it("implements every required customer-journey event", () => {
    const analytics = read("client/src/lib/analytics.ts");
    for (const event of [
      "view_item", "view_item_list", "select_item", "add_to_cart",
      "remove_from_cart", "view_cart", "begin_checkout", "add_shipping_info", "purchase",
    ]) {
      expect(analytics).toContain(`'${event}'`);
    }
  });

  it("emits shipping info at both checkout entry points and purchase only after a successful response", () => {
    for (const path of [
      "client/src/pages/checkout.tsx",
      "client/src/components/cart/checkout-dialog.tsx",
    ]) {
      const source = read(path);
      expect(source).toContain("trackAddShippingInfo(");
      expect(source.indexOf("trackPurchase({")).toBeGreaterThan(source.indexOf("if (!response.ok)"));
      expect(source).toContain('"Idempotency-Key": idempotencyKey');
    }
  });

  it("disables browser and server tracking on Preview without exposing configuration", () => {
    expect(read("client/src/lib/analytics.ts")).toContain("isTrackingAllowed()");
    expect(read("client/src/lib/meta-pixel.ts")).toContain("if (!isTrackingAllowed()) return");
    const capi = read("server/routes/capi.ts");
    expect(capi).toContain('process.env.VERCEL_ENV === "preview"');
    expect(capi).toContain('reason: "preview"');
    expect(capi).not.toContain('console.error("[CAPI] Meta API error â€” status:", metaRes.status)');
  });
});
