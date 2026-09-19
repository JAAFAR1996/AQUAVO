import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  WaylApiError,
  checkWaylReadiness,
  classifyWaylConfigError,
  createWaylLink,
  getWaylConfig,
  getWaylLinkByReferenceId,
  isWaylStoreVerificationError,
  resetWaylReadinessCache,
  resolveWaylEnvironment,
  verifyWaylWebhookSignature,
} from "../services/wayl-client.js";

const KEYS = ["WAYL_ENV", "WAYL_API_BASE_URL", "WAYL_API_KEY"] as const;
const original = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));

// Exact documented shape of the `data` object (https://wayl.io/docs). `total` is
// serialized as a string in link responses.
const officialLinkData = {
  referenceId: "order-abc",
  id: "clx0link0001",
  code: "I94F590I",
  total: "10000",
  currency: "IQD",
  type: "Order",
  paymentMethod: null,
  status: "Created",
  completedAt: null,
  createdAt: "2026-09-18T10:00:00.000Z",
  updatedAt: "2026-09-18T10:00:00.000Z",
  url: "https://checkout.thewayl.com/en/pay?id=clx0link0001&currency=iqd&lang=en",
  webhookUrl: "https://www.aquavoiq.com/api/payments/wayl/webhook",
  redirectionUrl: "https://www.aquavoiq.com/api/payments/wayl/return?payment_id=order-abc",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

afterEach(() => {
  vi.unstubAllGlobals();
  resetWaylReadinessCache();
  for (const key of KEYS) {
    const value = original[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function configure() {
  for (const key of KEYS) delete process.env[key];
  process.env.WAYL_API_KEY = "unit-test-key";
}

describe("Wayl configuration", () => {
  it("fails closed when no API key is configured, even in test mode", () => {
    for (const key of KEYS) delete process.env[key];
    process.env.WAYL_ENV = "test";
    expect(() => getWaylConfig()).toThrow(/WAYL_API_KEY/);
  });

  it("uses the documented API host by default", () => {
    configure();
    expect(getWaylConfig().apiBaseUrl).toBe("https://api.thewayl.com");
  });
});

describe("WAYL_ENV resolution (test while testing, live only when explicitly going live)", () => {
  it.each([
    ["development", undefined, "test"],
    ["development", "", "test"],
    ["development", "test", "test"],
    ["development", "TEST", "test"],
    ["development", "live", "live"],
    ["test", undefined, "test"],
    [undefined, undefined, "test"],
    ["preview", undefined, "test"],
    ["production", "live", "live"],
    ["production", " Live ", "live"],
  ])("NODE_ENV=%s + WAYL_ENV=%s => %s", (nodeEnv, waylEnv, expected) => {
    expect(resolveWaylEnvironment(waylEnv, nodeEnv)).toBe(expected);
  });

  it.each([
    ["production", undefined, /WAYL_ENV is missing/],
    ["production", "", /WAYL_ENV is missing/],
    ["production", "test", /requires WAYL_ENV=live/],
    ["production", "sandbox", /is invalid/],
    ["development", "sandbox", /is invalid/],
    ["development", "production", /is invalid/],
    ["development", "prod", /is invalid/],
  ])("NODE_ENV=%s + WAYL_ENV=%s => configuration error", (nodeEnv, waylEnv, message) => {
    expect(() => resolveWaylEnvironment(waylEnv, nodeEnv)).toThrow(message);
  });

  it("never silently falls back to live outside production", () => {
    configure();
    delete process.env.WAYL_ENV;
    expect(getWaylConfig().environment).toBe("test");
  });

  it("sends env=test on requests when WAYL_ENV is absent in development", async () => {
    configure();
    delete process.env.WAYL_ENV;
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: officialLinkData }, 201));
    vi.stubGlobal("fetch", fetchMock);

    await createWaylLink({ referenceId: "order-abc", total: 10000, currency: "IQD" });

    expect(JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body)).env).toBe("test");
  });

  it("disables checkout in production when WAYL_ENV is missing or test (getWaylConfig throws)", () => {
    configure();
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      delete process.env.WAYL_ENV;
      expect(() => getWaylConfig()).toThrow(/WAYL_ENV is missing/);
      process.env.WAYL_ENV = "test";
      expect(() => getWaylConfig()).toThrow(/requires WAYL_ENV=live/);
      process.env.WAYL_ENV = "live";
      expect(getWaylConfig().environment).toBe("live");
    } finally {
      process.env.NODE_ENV = previousNodeEnv;
    }
  });
});

describe("Wayl link responses", () => {
  it("parses the exact documented create-link response and uses data.url as the checkout URL", async () => {
    configure();
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ message: "Link created successfully.", data: officialLinkData }, 201));
    vi.stubGlobal("fetch", fetchMock);

    const link = await createWaylLink({ referenceId: "order-abc", total: 10000, currency: "IQD" });

    expect(link).toEqual({
      id: "clx0link0001",
      referenceId: "order-abc",
      status: "Created",
      total: 10000,
      currency: "IQD",
      url: officialLinkData.url,
      paymentMethod: null,
      completedAt: null,
    });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.thewayl.com/api/v1/links");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["X-WAYL-AUTHENTICATION"]).toBe("unit-test-key");
    const sent = JSON.parse(String(init.body));
    expect(sent).toMatchObject({ env: "test", referenceId: "order-abc", total: 10000, currency: "IQD" });
  });

  it("coerces the documented string total to a number and exposes paymentMethod/completedAt once paid", async () => {
    configure();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({
      data: { ...officialLinkData, status: "Complete", paymentMethod: "Card", completedAt: "2026-09-18T10:05:00.000Z", total: "12500" },
    })));

    const link = await getWaylLinkByReferenceId("order-abc");

    expect(link.status).toBe("Complete");
    expect(link.total).toBe(12500);
    expect(link.paymentMethod).toBe("Card");
    expect(link.completedAt).toBe("2026-09-18T10:05:00.000Z");
  });

  it("sends the referenceId in the documented GET path", async () => {
    configure();
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { ...officialLinkData, referenceId: "order abc#r1" } }));
    vi.stubGlobal("fetch", fetchMock);

    await getWaylLinkByReferenceId("order abc#r1");

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("https://api.thewayl.com/api/v1/links/order%20abc%23r1");
  });

  it.each([
    ["missing data envelope", { ...officialLinkData }],
    ["missing url", { data: { ...officialLinkData, url: undefined } }],
    ["undocumented url alias only", { data: { ...officialLinkData, url: undefined, checkoutUrl: officialLinkData.url } }],
    ["missing id", { data: { ...officialLinkData, id: undefined } }],
    ["missing status", { data: { ...officialLinkData, status: undefined } }],
    ["non-numeric total", { data: { ...officialLinkData, total: "ten thousand" } }],
    ["non-url checkout link", { data: { ...officialLinkData, url: "not a url" } }],
    ["empty body", null],
  ])("fails closed on a malformed response (%s) instead of guessing", async (_label, body) => {
    configure();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(body)));

    await expect(getWaylLinkByReferenceId("order-abc")).rejects.toThrow(/did not match the documented schema/);
  });

  it("rejects a create response whose referenceId differs from the one requested", async () => {
    configure();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ data: { ...officialLinkData, referenceId: "someone-else" } }, 201)));

    await expect(createWaylLink({ referenceId: "order-abc", total: 10000, currency: "IQD" }))
      .rejects.toThrow(/different referenceId/);
  });

  it("surfaces provider HTTP errors without retrying non-retryable statuses", async () => {
    configure();
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ message: "Unauthorized" }, 401));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getWaylLinkByReferenceId("order-abc")).rejects.toMatchObject({ name: "WaylApiError", status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("Wayl readiness (config → auth → live merchant)", () => {
  // Exact production responses observed on 2026-09-18 against https://api.thewayl.com.
  const authOk = { data: {}, message: "Authentication key is valid", success: true };
  const authBad = { success: false, message: "Invalid authentication key" };
  const storeUnverified = {
    success: false,
    message: "Store must be verified to create payment links. Please complete the verification process before creating links.",
  };

  function withProduction<T>(waylEnv: string | undefined, run: () => T): T {
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    if (waylEnv === undefined) delete process.env.WAYL_ENV;
    else process.env.WAYL_ENV = waylEnv;
    try {
      return run();
    } finally {
      process.env.NODE_ENV = previousNodeEnv;
    }
  }

  it("classifies every configuration failure with a stable, secret-free reason code", () => {
    for (const key of KEYS) delete process.env[key];
    expect(classifyWaylConfigError(new Error("Wayl configuration is incomplete. Set WAYL_API_KEY"))).toBe("WAYL_API_KEY_MISSING");
    expect(classifyWaylConfigError(new Error("Wayl configuration error: WAYL_ENV is missing."))).toBe("WAYL_ENV_MISSING");
    expect(classifyWaylConfigError(new Error('Wayl configuration error: WAYL_ENV="sandbox" is invalid.'))).toBe("WAYL_ENV_INVALID");
    expect(classifyWaylConfigError(new Error("Wayl configuration error: production requires WAYL_ENV=live explicitly"))).toBe("WAYL_ENV_NOT_LIVE_IN_PRODUCTION");
    expect(classifyWaylConfigError(new Error("something else"))).toBe("UNKNOWN_CONFIG_ERROR");
  });

  it("reports WAYL_ENV_NOT_LIVE_IN_PRODUCTION without calling Wayl when production still has WAYL_ENV=test", async () => {
    configure();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const readiness = await withProduction("test", () => checkWaylReadiness());

    expect(readiness).toMatchObject({ available: false, reason: "WAYL_ENV_NOT_LIVE_IN_PRODUCTION" });
    expect(readiness.checks).toMatchObject({ configValid: false, authValid: false, storeVerified: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports WAYL_AUTH_FAILED on a 401 from verify-auth-key and never surfaces the key", async () => {
    configure();
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(authBad, 401));
    vi.stubGlobal("fetch", fetchMock);

    const readiness = await checkWaylReadiness();

    expect(readiness).toMatchObject({ available: false, reason: "WAYL_AUTH_FAILED", checks: { configValid: true, authValid: false } });
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("https://api.thewayl.com/api/v1/verify-auth-key");
    expect(JSON.stringify(readiness)).not.toContain("unit-test-key");
  });

  it.each([
    [429, "WAYL_RATE_LIMITED"],
    [503, "WAYL_SERVICE_ERROR"],
  ])("maps verify-auth-key HTTP %s to %s instead of a generic false", async (status, reason) => {
    configure();
    // Fresh Response per attempt: the client retries 429/5xx and a body can only be read once.
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => jsonResponse({ message: "nope" }, status)));

    expect((await checkWaylReadiness()).reason).toBe(reason);
  });

  it("reports WAYL_NETWORK_FAILED when Wayl cannot be reached at all", async () => {
    configure();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));

    expect(await checkWaylReadiness()).toMatchObject({ available: false, reason: "WAYL_NETWORK_FAILED" });
  });

  it("reports WAYL_ACCOUNT_NOT_LIVE_ENABLED when auth is valid but Wayl refuses link creation for an unverified store", async () => {
    configure();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(authOk))
      .mockResolvedValueOnce(jsonResponse(storeUnverified, 403));
    vi.stubGlobal("fetch", fetchMock);

    const readiness = await checkWaylReadiness();

    expect(readiness).toMatchObject({
      available: false,
      reason: "WAYL_ACCOUNT_NOT_LIVE_ENABLED",
      checks: { configValid: true, authValid: true, storeVerified: false },
    });
    const probe = JSON.parse(String((fetchMock.mock.calls[1]?.[1] as RequestInit).body));
    expect(probe).toMatchObject({ env: "test", currency: "IQD", total: 1000 });
    expect(probe).not.toHaveProperty("linkExpiresIn");
    expect(probe.referenceId).toMatch(/^aquavo-readiness-/);
  });

  it("production availability stops after config + auth and does not create disposable payment links", async () => {
    configure();
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(authOk));
    vi.stubGlobal("fetch", fetchMock);

    const readiness = await withProduction("live", () => checkWaylReadiness());

    expect(readiness).toEqual({
      available: true,
      reason: "WAYL_CONFIG_VALID",
      checks: { configValid: true, authValid: true, storeVerified: null },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("https://api.thewayl.com/api/v1/verify-auth-key");
  });

  it("caches a successful readiness result so the checkout radio does not create a probe link per request", async () => {
    configure();
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/verify-auth-key")) return jsonResponse(authOk);
      if (init?.method === "POST" && url.endsWith("/api/v1/links")) {
        return jsonResponse({ data: { ...officialLinkData, referenceId: JSON.parse(String(init.body)).referenceId } }, 201);
      }
      return jsonResponse({ message: "ok" }, 201);
    });
    vi.stubGlobal("fetch", fetchMock);

    await checkWaylReadiness();
    const callsAfterFirst = fetchMock.mock.calls.length;
    await checkWaylReadiness();

    expect(fetchMock.mock.calls.length).toBe(callsAfterFirst);
  });

  it("can skip the link probe via WAYL_READINESS_PROBE=off and then stops at auth", async () => {
    configure();
    process.env.WAYL_READINESS_PROBE = "off";
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(authOk));
    vi.stubGlobal("fetch", fetchMock);
    try {
      const readiness = await checkWaylReadiness();
      expect(readiness).toMatchObject({ available: true, checks: { authValid: true, storeVerified: null } });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      delete process.env.WAYL_READINESS_PROBE;
    }
  });

  it("recognises Wayl's store-verification refusal so checkout can fail closed with a customer-safe message", () => {
    expect(isWaylStoreVerificationError(new WaylApiError(storeUnverified.message, 403, storeUnverified))).toBe(true);
    expect(isWaylStoreVerificationError(new WaylApiError("Forbidden", 403))).toBe(false);
    expect(isWaylStoreVerificationError(new WaylApiError(storeUnverified.message, 400))).toBe(false);
    expect(isWaylStoreVerificationError(new Error(storeUnverified.message))).toBe(false);
  });
});

describe("Wayl webhook signature", () => {
  const secret = "9f1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c";
  const body = Buffer.from(JSON.stringify({
    verb: "POST",
    event: "order.status.changed",
    referenceId: "order-abc",
    paymentStatus: "Complete",
    paymentMethod: "Card",
    total: 10000,
    code: "I94F590I",
    id: "clx0link0001",
  }));
  const sign = (raw: Buffer, key: string) => createHmac("sha256", key).update(raw).digest("hex");

  it("accepts a correct HMAC-SHA256 over the exact raw body", () => {
    expect(verifyWaylWebhookSignature(body, sign(body, secret), secret)).toBe(true);
    expect(verifyWaylWebhookSignature(body, `sha256=${sign(body, secret).toUpperCase()}`, secret)).toBe(true);
  });

  it("rejects a modified body, a wrong secret, and a malformed or missing header", () => {
    const tampered = Buffer.from(body.toString("utf8").replace('"total":10000', '"total":1'));
    expect(verifyWaylWebhookSignature(tampered, sign(body, secret), secret)).toBe(false);
    expect(verifyWaylWebhookSignature(body, sign(body, "other-secret"), secret)).toBe(false);
    expect(verifyWaylWebhookSignature(body, sign(body, secret).slice(0, 60), secret)).toBe(false);
    expect(verifyWaylWebhookSignature(body, "not-hex", secret)).toBe(false);
    expect(verifyWaylWebhookSignature(body, undefined, secret)).toBe(false);
    expect(verifyWaylWebhookSignature(body, sign(body, secret), "")).toBe(false);
  });

  it("differs between the raw bytes and a re-serialised body, so only raw bytes can be trusted", () => {
    const reSerialised = Buffer.from(JSON.stringify(JSON.parse(body.toString("utf8")), null, 2));
    expect(verifyWaylWebhookSignature(reSerialised, sign(body, secret), secret)).toBe(false);
  });
});
