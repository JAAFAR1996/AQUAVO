import { createPublicKey, verify as verifySignature } from "node:crypto";

const GITHUB_OIDC_ISSUER = "https://token.actions.githubusercontent.com";
const GITHUB_OIDC_JWKS_URL = "https://token.actions.githubusercontent.com/.well-known/jwks";
export const AQUAVO_CRON_OIDC_AUDIENCE = "aquavo-customer-messaging";
const EXPECTED_REPOSITORY = "JAAFAR1996/AQUAVO";
const EXPECTED_REPOSITORY_ID = "1107721882";
const EXPECTED_REF = "refs/heads/main";
const EXPECTED_WORKFLOW_REF =
  "JAAFAR1996/AQUAVO/.github/workflows/customer-messaging-retry.yml@refs/heads/main";
const ALLOWED_EVENTS = new Set(["schedule", "workflow_dispatch"]);
const CLOCK_SKEW_SECONDS = 60;
const MAX_TOKEN_AGE_SECONDS = 10 * 60;
const JWKS_CACHE_MS = 60 * 60 * 1000;

type JwtHeader = {
  alg?: string;
  kid?: string;
  typ?: string;
};

type GitHubOidcClaims = {
  iss?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  iat?: number;
  repository?: string;
  repository_id?: string;
  ref?: string;
  workflow_ref?: string;
  event_name?: string;
};

type JwksResponse = {
  keys?: Array<Record<string, unknown> & { kid?: string; kty?: string; alg?: string; use?: string }>;
};

export type GitHubActionsOidcVerification = {
  ok: boolean;
  reason: string;
};

let cachedJwks: { expiresAt: number; keys: NonNullable<JwksResponse["keys"]> } | null = null;

function decodeJsonSegment<T>(segment: string): T {
  return JSON.parse(Buffer.from(segment, "base64url").toString("utf8")) as T;
}

function audienceMatches(aud: GitHubOidcClaims["aud"]): boolean {
  return Array.isArray(aud)
    ? aud.includes(AQUAVO_CRON_OIDC_AUDIENCE)
    : aud === AQUAVO_CRON_OIDC_AUDIENCE;
}

async function fetchJwks(force = false): Promise<NonNullable<JwksResponse["keys"]>> {
  const now = Date.now();
  if (!force && cachedJwks && cachedJwks.expiresAt > now) return cachedJwks.keys;

  const response = await fetch(GITHUB_OIDC_JWKS_URL, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) throw new Error(`GitHub OIDC JWKS returned HTTP ${response.status}`);

  const payload = (await response.json()) as JwksResponse;
  const keys = Array.isArray(payload.keys) ? payload.keys : [];
  if (keys.length === 0) throw new Error("GitHub OIDC JWKS returned no signing keys");

  cachedJwks = { expiresAt: now + JWKS_CACHE_MS, keys };
  return keys;
}

async function signingKey(kid: string): Promise<Record<string, unknown>> {
  let keys = await fetchJwks();
  let key = keys.find((candidate) => candidate.kid === kid);
  if (!key) {
    // Key rotation can happen while a warm function still holds the previous
    // JWKS set. Refresh once before rejecting a legitimate new signing key.
    keys = await fetchJwks(true);
    key = keys.find((candidate) => candidate.kid === kid);
  }
  if (!key) throw new Error("GitHub OIDC signing key is unknown");
  if (key.kty !== "RSA") throw new Error("GitHub OIDC signing key is not RSA");
  return key;
}

/**
 * Verify the short-lived GitHub Actions OIDC token used by the five-minute
 * customer-messaging recovery worker.
 *
 * Signature verification is only half the boundary: the token must also be
 * issued for this exact repository, immutable repository id, workflow file,
 * main branch and the dedicated AQUAVO audience. A valid token from another
 * GitHub repository/workflow is rejected.
 */
export async function verifyGitHubActionsCronToken(
  token: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<GitHubActionsOidcVerification> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3 || parts.some((part) => !part)) {
      return { ok: false, reason: "malformed_token" };
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const header = decodeJsonSegment<JwtHeader>(encodedHeader);
    const claims = decodeJsonSegment<GitHubOidcClaims>(encodedPayload);

    if (header.alg !== "RS256" || !header.kid || (header.typ && header.typ !== "JWT")) {
      return { ok: false, reason: "unexpected_jose_header" };
    }

    const jwk = await signingKey(header.kid);
    const publicKey = createPublicKey({ key: jwk as any, format: "jwk" });
    const verified = verifySignature(
      "RSA-SHA256",
      Buffer.from(`${encodedHeader}.${encodedPayload}`),
      publicKey,
      Buffer.from(encodedSignature, "base64url"),
    );
    if (!verified) return { ok: false, reason: "invalid_signature" };

    if (claims.iss !== GITHUB_OIDC_ISSUER) return { ok: false, reason: "invalid_issuer" };
    if (!audienceMatches(claims.aud)) return { ok: false, reason: "invalid_audience" };
    if (claims.repository !== EXPECTED_REPOSITORY) return { ok: false, reason: "invalid_repository" };
    if (claims.repository_id !== EXPECTED_REPOSITORY_ID) return { ok: false, reason: "invalid_repository_id" };
    if (claims.ref !== EXPECTED_REF) return { ok: false, reason: "invalid_ref" };
    if (claims.workflow_ref !== EXPECTED_WORKFLOW_REF) return { ok: false, reason: "invalid_workflow_ref" };
    if (!claims.event_name || !ALLOWED_EVENTS.has(claims.event_name)) {
      return { ok: false, reason: "invalid_event" };
    }

    if (
      typeof claims.exp !== "number" ||
      typeof claims.nbf !== "number" ||
      typeof claims.iat !== "number"
    ) {
      return { ok: false, reason: "missing_time_claims" };
    }
    if (claims.exp < nowSeconds - CLOCK_SKEW_SECONDS) return { ok: false, reason: "expired" };
    if (claims.nbf > nowSeconds + CLOCK_SKEW_SECONDS) return { ok: false, reason: "not_yet_valid" };
    if (claims.iat > nowSeconds + CLOCK_SKEW_SECONDS) return { ok: false, reason: "issued_in_future" };
    if (claims.iat < nowSeconds - MAX_TOKEN_AGE_SECONDS) return { ok: false, reason: "token_too_old" };

    return { ok: true, reason: "ok" };
  } catch {
    // Do not surface parsing/key-fetch details to callers and never log the JWT.
    return { ok: false, reason: "verification_failed" };
  }
}
