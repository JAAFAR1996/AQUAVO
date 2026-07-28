import { describe, it, expect } from "vitest";
import { resolveAdminCredentials, isProductionUrl } from "../../e2e/support/test-credentials.js";

describe("E2E credential guard (Item 3)", () => {
  it("throws clearly when credentials are absent (no default/fallback)", () => {
    expect(() => resolveAdminCredentials({ env: {} })).toThrow(/Missing E2E admin credentials/);
    expect(() => resolveAdminCredentials({ env: { E2E_ADMIN_EMAIL: "a@b.com" } })).toThrow(/Missing/);
    expect(() => resolveAdminCredentials({ env: { E2E_ADMIN_PASSWORD: "x" } })).toThrow(/Missing/);
  });

  it("never falls back to admin123 or any static default", () => {
    // With no env, it must throw — not silently return a baked-in pair.
    let creds: unknown = null;
    try { creds = resolveAdminCredentials({ env: {} }); } catch { /* expected */ }
    expect(creds).toBeNull();
  });

  it("returns env credentials for a local (non-production) baseURL", () => {
    const c = resolveAdminCredentials({
      baseURL: "http://localhost:5000",
      env: { E2E_ADMIN_EMAIL: "local@test.dev", E2E_ADMIN_PASSWORD: "s3cret" },
    });
    expect(c).toEqual({ email: "local@test.dev", password: "s3cret" });
  });

  it("REFUSES a production URL unless ADMIN_AUDIT_READ_ONLY=true", () => {
    const env = { E2E_ADMIN_EMAIL: "a@b.com", E2E_ADMIN_PASSWORD: "p" };
    expect(() => resolveAdminCredentials({ baseURL: "https://www.aquavoiq.com", env }))
      .toThrow(/production URL/i);
    // explicit read-only flag unlocks it
    expect(resolveAdminCredentials({ baseURL: "https://www.aquavoiq.com", env: { ...env, ADMIN_AUDIT_READ_ONLY: "true" } }))
      .toEqual({ email: "a@b.com", password: "p" });
  });

  it("detects AQUAVO production hosts (and not localhost/preview-less)", () => {
    expect(isProductionUrl("https://www.aquavoiq.com")).toBe(true);
    expect(isProductionUrl("https://aquavoiq.com/admin")).toBe(true);
    expect(isProductionUrl("http://localhost:5000")).toBe(false);
    expect(isProductionUrl("http://127.0.0.1:5000")).toBe(false);
    expect(isProductionUrl(undefined)).toBe(false);
  });
});
