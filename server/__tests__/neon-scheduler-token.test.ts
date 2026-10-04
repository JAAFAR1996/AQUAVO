import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db.js", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "../db.js";
import { verifyNeonSchedulerToken } from "../security/neon-scheduler-token.js";

const getDbMock=vi.mocked(getDb);

function dbWithHash(tokenHash: string) {
  return {
    execute: vi.fn().mockResolvedValue([{ token_hash:tokenHash }]),
  } as any;
}

describe("Neon customer-messaging scheduler token", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fails closed without a database", async () => {
    getDbMock.mockReturnValue(null as any);
    await expect(verifyNeonSchedulerToken("scheduler-secret")).resolves.toEqual({
      ok:false,
      reason:"db_unavailable",
    });
  });

  it("accepts only the bearer whose SHA-256 digest is configured", async () => {
    const token="scheduler-secret";
    const digest=createHash("sha256").update(token,"utf8").digest("hex");
    getDbMock.mockReturnValue(dbWithHash(digest));

    await expect(verifyNeonSchedulerToken(token)).resolves.toEqual({
      ok:true,
      reason:"ok",
    });
    await expect(verifyNeonSchedulerToken("wrong-secret")).resolves.toEqual({
      ok:false,
      reason:"invalid_token",
    });
  });

  it("fails closed for malformed stored scheduler state", async () => {
    getDbMock.mockReturnValue(dbWithHash("not-a-sha256"));
    await expect(verifyNeonSchedulerToken("scheduler-secret")).resolves.toEqual({
      ok:false,
      reason:"not_configured",
    });
  });
});
