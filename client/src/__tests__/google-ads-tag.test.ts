import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Google Ads tag wiring", () => {
  it("installs the approved Google Ads destination in the document shell", () => {
    const html = readFileSync(resolve(process.cwd(), "client/index.html"), "utf8");

    expect(html).toContain("https://www.googletagmanager.com/gtag/js?id=AW-18476435110");
    expect(html).toContain("gtag('config', 'AW-18476435110')");
  });

  it("does not load the production Google tag on unique Vercel preview hosts", () => {
    const html = readFileSync(resolve(process.cwd(), "client/index.html"), "utf8");

    expect(html).toContain("hostname.endsWith('.vercel.app')");
    expect(html).toContain("hostname !== 'aquavo.vercel.app'");
    expect(html).toContain("if (isUniqueVercelDeployment) return;");
    expect(html).toContain("document.head.appendChild(script)");
  });


  it("allows the exact Google Ads endpoints reported by Tag Diagnostics", () => {
    const vercel = JSON.parse(readFileSync(resolve(process.cwd(), "vercel.json"), "utf8"));
    const csp = vercel.headers
      .flatMap((rule: { headers?: Array<{ key: string; value: string }> }) => rule.headers ?? [])
      .find((header: { key: string }) => header.key === "Content-Security-Policy")?.value as string;

    expect(csp).toBeTruthy();

    const directive = (name: string) =>
      csp
        .split(";")
        .map((part: string) => part.trim())
        .find((part: string) => part.startsWith(`${name} `)) ?? "";

    const scriptSrc = directive("script-src");
    const scriptSrcElem = directive("script-src-elem");
    const connectSrc = directive("connect-src");

    // Google documents Google Ads script loading under script-src-elem.
    // Keep it explicit rather than relying on CSP fallback from script-src.
    expect(scriptSrcElem).toContain("https://www.googletagmanager.com");
    expect(scriptSrcElem).toContain("https://tagmanager.google.com");
    expect(scriptSrcElem).toContain("https://www.googleadservices.com");
    expect(scriptSrcElem).toContain("https://www.google.com");
    expect(scriptSrcElem).toContain("https://googleads.g.doubleclick.net");
    expect(scriptSrcElem).toContain("'unsafe-inline'");

    // Keep the general script policy compatible with the explicit element policy.
    expect(scriptSrc).toContain("https://googleads.g.doubleclick.net");

    expect(connectSrc).toContain("https://ad.doubleclick.net");
    expect(connectSrc).toContain("https://www.google.com");
    expect(connectSrc).toContain("https://www.googleadservices.com");

    // Keep the rest of Google's documented Ads measurement endpoints available.
    expect(scriptSrc).toContain("https://www.googletagmanager.com");
    expect(connectSrc).toContain("https://googleads.g.doubleclick.net");
    expect(connectSrc).toContain("https://pagead2.googlesyndication.com");

    const styleSrc = directive("style-src");
    expect(styleSrc).toContain("https://www.googletagmanager.com");
    expect(styleSrc).toContain("https://tagmanager.google.com");
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
