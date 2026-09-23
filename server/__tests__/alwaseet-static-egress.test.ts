import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  ALWASEET_STATIC_EGRESS_INVALID,
  ALWASEET_STATIC_EGRESS_NOT_CONFIGURED,
  alWaseetStaticEgressConfigurationError,
} from "../services/alwaseet-http.js";

const originalFixieUrl = process.env.FIXIE_URL;

afterEach(() => {
  if (originalFixieUrl === undefined) delete process.env.FIXIE_URL;
  else process.env.FIXIE_URL = originalFixieUrl;
});

describe("Al-Waseet static egress", () => {
  it("fails closed when Fixie is missing", () => {
    delete process.env.FIXIE_URL;
    expect(alWaseetStaticEgressConfigurationError()).toBe(ALWASEET_STATIC_EGRESS_NOT_CONFIGURED);
  });

  it("rejects a malformed or non-HTTP proxy URL", () => {
    process.env.FIXIE_URL = "ftp://proxy.example:1234";
    expect(alWaseetStaticEgressConfigurationError()).toBe(ALWASEET_STATIC_EGRESS_INVALID);
  });

  it("accepts the HTTP proxy URL shape injected by Fixie", () => {
    process.env.FIXIE_URL = "http://user:pass@proxy.example:1234";
    expect(alWaseetStaticEgressConfigurationError()).toBeNull();
  });

  it("keeps both Al-Waseet resolvers off direct fetch", () => {
    const runtimePath = fileURLToPath(new URL("../services/alwaseet-tracking-runtime.ts", import.meta.url));
    const legacyPath = fileURLToPath(new URL("../services/alwaseet-tracking.ts", import.meta.url));
    const runtimeSource = readFileSync(runtimePath, "utf8");
    const legacySource = readFileSync(legacyPath, "utf8");

    expect(runtimeSource).toContain("requestAlWaseetJson<ApiEnvelope>");
    expect(legacySource).toContain("requestAlWaseetJson<ApiEnvelope>");
    expect(runtimeSource).not.toMatch(/\bfetch\s*\(/);
    expect(legacySource).not.toMatch(/\bfetch\s*\(/);
  });
});
