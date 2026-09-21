import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateKeyPairSync, sign } from "node:crypto";
import {
  AQUAVO_CRON_OIDC_AUDIENCE,
  verifyGitHubActionsCronToken,
} from "../security/github-actions-oidc";

const NOW = 1_800_000_000;
const KID = "aquavo-test-key";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const publicJwk = {
  ...(publicKey.export({ format: "jwk" }) as Record<string, unknown>),
  kid: KID,
  alg: "RS256",
  use: "sig",
};

function base64urlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function makeToken(overrides: Record<string, unknown> = {}): string {
  const header = base64urlJson({ alg: "RS256", kid: KID, typ: "JWT" });
  const payload = base64urlJson({
    iss: "https://token.actions.githubusercontent.com",
    aud: AQUAVO_CRON_OIDC_AUDIENCE,
    repository: "JAAFAR1996/AQUAVO",
    repository_id: "1107721882",
    ref: "refs/heads/main",
    workflow_ref:
      "JAAFAR1996/AQUAVO/.github/workflows/customer-messaging-retry.yml@refs/heads/main",
    event_name: "schedule",
    iat: NOW - 30,
    nbf: NOW - 30,
    exp: NOW + 300,
    ...overrides,
  });
  const signingInput = `${header}.${payload}`;
  const signature = sign(
    "RSA-SHA256",
    Buffer.from(signingInput),
    privateKey,
  ).toString("base64url");
  return `${signingInput}.${signature}`;
}

describe("GitHub Actions customer-messaging OIDC verifier", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ keys: [publicJwk] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("accepts a correctly signed short-lived token for this repo/workflow/main", async () => {
    await expect(verifyGitHubActionsCronToken(makeToken(), NOW)).resolves.toEqual({
      ok: true,
      reason: "ok",
    });
  });

  it.each([
    ["wrong audience", { aud: "some-other-service" }, "invalid_audience"],
    ["wrong repository", { repository: "attacker/repo" }, "invalid_repository"],
    ["wrong repository id", { repository_id: "999" }, "invalid_repository_id"],
    ["wrong branch", { ref: "refs/heads/feature" }, "invalid_ref"],
    [
      "wrong workflow",
      { workflow_ref: "JAAFAR1996/AQUAVO/.github/workflows/other.yml@refs/heads/main" },
      "invalid_workflow_ref",
    ],
    ["pull request event", { event_name: "pull_request" }, "invalid_event"],
    ["expired token", { exp: NOW - 120 }, "expired"],
    ["old replayed token", { iat: NOW - 3600, nbf: NOW - 3600 }, "token_too_old"],
  ])("rejects %s", async (_name, overrides, reason) => {
    await expect(verifyGitHubActionsCronToken(makeToken(overrides), NOW)).resolves.toEqual({
      ok: false,
      reason,
    });
  });

  it("rejects a token whose signature was made by another key", async () => {
    const token = makeToken();
    const [header, payload] = token.split(".");
    const { privateKey: attackerKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const forged = `${header}.${payload}.${sign(
      "RSA-SHA256",
      Buffer.from(`${header}.${payload}`),
      attackerKey,
    ).toString("base64url")}`;

    await expect(verifyGitHubActionsCronToken(forged, NOW)).resolves.toEqual({
      ok: false,
      reason: "invalid_signature",
    });
  });
});
