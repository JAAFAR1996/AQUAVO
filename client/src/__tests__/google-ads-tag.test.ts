import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Google Ads tag wiring", () => {
  it("installs the approved Google Ads destination in the document shell", () => {
    const html = readFileSync(resolve(process.cwd(), "client/index.html"), "utf8");

    expect(html).toContain("https://www.googletagmanager.com/gtag/js?id=AW-18476435110");
    expect(html).toContain("gtag('config', 'AW-18476435110')");
  });


  it("allows Google Ads measurement endpoints through the production CSP", () => {
    const vercel = readFileSync(resolve(process.cwd(), "vercel.json"), "utf8");

    expect(vercel).toContain("https://www.googletagmanager.com");
    expect(vercel).toContain("https://www.googleadservices.com");
    expect(vercel).toContain("https://googleads.g.doubleclick.net");
    expect(vercel).toContain("https://stats.g.doubleclick.net");
    expect(vercel).toContain("https://td.doubleclick.net");
  });

  it("reuses the shell Google tag instead of injecting a duplicate loader", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/lib/analytics.ts"), "utf8");

    expect(source).toContain("googletagmanager.com/gtag/js");
    expect(source).toContain("hasGoogleTagLoader");
    expect(source).toContain("if (!hasGoogleTagLoader)");
  });

  it("emits purchase only after tracking is allowed and records blocked gtag for retry", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/lib/analytics.ts"), "utf8");

    expect(source).toContain("if (!orderId || orderId === 'unknown' || !isTrackingAllowed()) return;");
    expect(source).toContain("if (!window.gtag)");
    expect(source).toContain("'gtag_unavailable'");
    expect(source).toContain("window.gtag('event', 'purchase'");
    expect(source).toContain("transaction_id: orderId");
    expect(source).toContain("currency: 'IQD'");
    expect(source).toContain("value: orderData.total");
    expect(source).toContain("AW-18476435110/iP0mCJaFsYYdEKaNoOpE");
    expect(source).toContain("window.gtag('event', 'conversion'");
    expect(source).toContain("send_to: GOOGLE_ADS_PURCHASE_DESTINATION");
    expect(source).toContain("aqSid: getSessionId()");
  });
});
