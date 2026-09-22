import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("analytics CSP", () => {
  it("allows the GA4 collection host actually used by gtag without widening connect-src", () => {
    const config = JSON.parse(readFileSync(resolve(process.cwd(), "vercel.json"), "utf8"));
    const cspHeader = config.headers
      .flatMap((rule: { headers?: Array<{ key: string; value: string }> }) => rule.headers ?? [])
      .find((header: { key: string }) => header.key === "Content-Security-Policy");
    expect(cspHeader).toBeDefined();
    const csp = cspHeader?.value ?? "";
    const connectSrc = csp.match(/connect-src ([^;]+);/)?.[1] ?? "";
    expect(connectSrc).toContain("https://www.google.com");
    expect(connectSrc.split(/\s+/)).not.toContain("*");
  });

  it("lets the Meta Pixel fall back to a form POST without widening form-action further", () => {
    // When a payload is too long for the image beacon, fbevents.js submits a
    // form to https://www.facebook.com/tr/. Without this the event is blocked
    // by CSP and silently lost.
    const config = JSON.parse(readFileSync(resolve(process.cwd(), "vercel.json"), "utf8"));
    const csp = config.headers
      .flatMap((rule: { headers?: Array<{ key: string; value: string }> }) => rule.headers ?? [])
      .find((header: { key: string }) => header.key === "Content-Security-Policy")?.value ?? "";
    const formAction = (csp.match(/form-action ([^;]+);/)?.[1] ?? "").split(/\s+/);
    expect(formAction).toEqual(["'self'", "https://www.facebook.com"]);
  });
});
