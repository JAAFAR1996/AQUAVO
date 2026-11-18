import { describe, expect, it } from "vitest";
import { normalizeNeonConnectionString } from "../db-connection-url.js";

const BASE = "postgresql://test_user:test_password@ep-example.aws.neon.tech/neondb";
describe("Neon connection URL normalization", () => {
  it.each([
    "channel_binding=require&sslmode=require",
    "sslmode=require&channel_binding=require",
  ])("preserves database and TLS when query order is %s", (query) => {
    const result = new URL(normalizeNeonConnectionString(`${BASE}?${query}`)!);
    expect(result.pathname).toBe("/neondb");
    expect(result.searchParams.get("sslmode")).toBe("require");
    expect(result.searchParams.has("channel_binding")).toBe(false);
  });

  it("preserves a connection without channel binding", () => {
    const input = `${BASE}?sslmode=verify-full&application_name=aquavo`;
    expect(normalizeNeonConnectionString(input)).toBe(input);
    expect(normalizeNeonConnectionString(BASE)).toBe(BASE);
  });

  it("keeps encoded credentials and all unrelated option values intact", () => {
    const input = "postgres://test%40tenant:pa%3Ass%2Fword%3F%26%23%40%25@ep-example.aws.neon.tech/neondb?channel_binding=require&sslmode=require&options=endpoint%3Dep-example&application_name=AQUAVO%20recovery";
    const before = new URL(input);
    const after = new URL(normalizeNeonConnectionString(input)!);
    expect(after.username).toBe(before.username);
    expect(after.password).toBe(before.password);
    expect(after.pathname).toBe(before.pathname);
    expect(after.searchParams.get("sslmode")).toBe("require");
    expect(after.searchParams.get("options")).toBe("endpoint=ep-example");
    expect(after.searchParams.get("application_name")).toBe("AQUAVO recovery");
  });

  it("removes an only or repeated channel-binding option cleanly", () => {
    expect(normalizeNeonConnectionString(`${BASE}?channel_binding=require`)).toBe(BASE);
    const after = new URL(normalizeNeonConnectionString(`${BASE}?channel_binding=require&sslmode=require&channel_binding=require`)!);
    expect([...after.searchParams.entries()]).toEqual([["sslmode", "require"]]);
  });

  it("preserves missing-target handling and rejects malformed URLs without echoing input", () => {
    expect(normalizeNeonConnectionString("")).toBeUndefined();
    expect(normalizeNeonConnectionString("  ")).toBeUndefined();
    expect(() => normalizeNeonConnectionString("not-a-url-secret")).toThrow("DATABASE_URL is not a valid PostgreSQL connection URL");
  });
});
