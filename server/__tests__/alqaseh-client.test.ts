import { afterEach, describe, expect, it } from "vitest";
import { getAlqasehConfig, getAlqasehHostedPaymentUrl } from "../services/alqaseh-client.js";

const KEYS = [
  "ALQASEH_ENV",
  "ALQASEH_API_BASE_URL",
  "ALQASEH_PAY_BASE_URL",
  "ALQASEH_CLIENT_ID",
  "ALQASEH_CLIENT_SECRET",
] as const;

const original = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of KEYS) {
    const value = original[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("Al-Qaseh configuration", () => {
  it("uses the official public sandbox when production is not explicitly enabled", () => {
    for (const key of KEYS) delete process.env[key];

    const config = getAlqasehConfig();

    expect(config.environment).toBe("sandbox");
    expect(config.apiBaseUrl).toBe("https://api-test.alqaseh.com/v1");
    expect(config.payBaseUrl).toBe("https://pay-test.alqaseh.com/pay");
    expect(config.clientId).toBe("public_test");
    expect(config.clientSecret.length).toBeGreaterThan(20);
  });

  it("fails closed when production secrets or production URLs are missing", () => {
    for (const key of KEYS) delete process.env[key];
    process.env.ALQASEH_ENV = "production";

    expect(() => getAlqasehConfig()).toThrow(/production configuration is incomplete/i);
  });

  it("builds the hosted payment page URL without exposing credentials", () => {
    for (const key of KEYS) delete process.env[key];
    process.env.ALQASEH_ENV = "sandbox";

    const url = getAlqasehHostedPaymentUrl("token/with unsafe chars");

    expect(url).toBe("https://pay-test.alqaseh.com/pay/token%2Fwith%20unsafe%20chars");
    expect(url).not.toContain("public_test");
  });
});
