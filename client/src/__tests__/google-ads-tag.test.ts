import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Google Ads tag wiring", () => {
  it("installs the approved Google Ads destination in the document shell", () => {
    const html = readFileSync(resolve(process.cwd(), "client/index.html"), "utf8");

    expect(html).toContain("https://www.googletagmanager.com/gtag/js?id=AW-18476435110");
    expect(html).toContain("gtag('config', 'AW-18476435110')");
  });

  it("reuses the shell Google tag instead of injecting a duplicate loader", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/lib/analytics.ts"), "utf8");

    expect(source).toContain("googletagmanager.com/gtag/js");
    expect(source).toContain("hasGoogleTagLoader");
    expect(source).toContain("if (!hasGoogleTagLoader)");
  });

  it("emits purchase only after tracking is allowed and gtag exists", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/lib/analytics.ts"), "utf8");

    expect(source).toContain("if (!isTrackingAllowed() || !window.gtag) return;");
    expect(source).toContain("window.gtag('event', 'purchase'");
    expect(source).toContain("transaction_id: orderData.orderId");
    expect(source).toContain("currency: 'IQD'");
    expect(source).toContain("value: orderData.total");
  });
});
