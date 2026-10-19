import { createHash, randomBytes, randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { rowsOf, securityDb, type SecurityDatabase, type SecurityExecutor } from "./security-db.js";
const ALLOWED_SCOPES = new Set(["mcp:read", "mcp:write", "catalog:read"]);
const REFRESH_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
export const ACCESS_TOKEN_LIFETIME_SECONDS = 15 * 60;
export class OAuthGrantError extends Error {
  readonly status = 400;
  constructor(readonly code: "invalid_grant" | "invalid_scope" | "invalid_request") { super(code); }
}
export function canonicalScopes(value: unknown, fallback = "mcp:read"): string {
  if (value !== undefined && typeof value !== "string") throw new OAuthGrantError("invalid_scope");
  const scopes = new Set<string>();
  for (const scope of (typeof value === "string" ? value : fallback).trim().split(/\s+/).filter(Boolean)) {
    if (scope === "mcp") { scopes.add("mcp:read"); scopes.add("mcp:write"); }
    else if (ALLOWED_SCOPES.has(scope)) scopes.add(scope);
    else throw new OAuthGrantError("invalid_scope");
  }
  if (!scopes.size) throw new OAuthGrantError("invalid_scope");
  return [...scopes].sort().join(" ");
}
export function narrowedScopes(original: string, requested?: unknown): string {
  const granted = canonicalScopes(original);
  const next = requested === undefined ? granted : canonicalScopes(requested);
  const allowed = new Set(granted.split(" "));
  if (next.split(" ").some((scope) => !allowed.has(scope))) throw new OAuthGrantError("invalid_scope");
  return next;
}
const hash = (token: string) => createHash("sha256").update(token).digest("hex");
export function validPkce(verifier: string, challenge: string): boolean {
  return /^[A-Za-z0-9._~-]{43,128}$/.test(verifier) && /^[A-Za-z0-9_-]{43}$/.test(challenge)
    && createHash("sha256").update(verifier).digest("base64url") === challenge;
}
interface GrantRow extends Record<string, unknown> {
  id: string; client_id: string; scope: string; resource: string; redirect_uri: string;
  expires_at: Date | string; revoked_at: Date | string | null;
}
interface TokenRow extends Record<string, unknown> {
  token_hash: string; grant_id: string; kind: "code" | "refresh";
  data: { challenge?: string; scope?: string }; expires_at: Date | string; consumed_at: Date | string | null;
}
export interface OAuthTokenGrant { clientId: string; scope: string; grantId: string; refreshToken: string }
interface LockedGrant { grant: GrantRow; token: TokenRow }
/** Shared, hashed, one-use grants. Always lock authorization before its token. */
export class OAuthGrantStore {
  constructor(private readonly db: SecurityDatabase = securityDb()) {}
  private async locked(tx: SecurityExecutor, tokenHash: string): Promise<LockedGrant | null> {
    const reference = rowsOf<{ grant_id: string }>(await tx.execute(sql`SELECT grant_id FROM oauth_token_grants WHERE token_hash=${tokenHash}`))[0];
    if (!reference) return null;
    const grant = rowsOf<GrantRow>(await tx.execute(sql`SELECT * FROM oauth_authorizations WHERE id=${reference.grant_id}::uuid FOR UPDATE`))[0];
    const token = rowsOf<TokenRow>(await tx.execute(sql`SELECT * FROM oauth_token_grants WHERE token_hash=${tokenHash} FOR UPDATE`))[0];
    return grant && token ? { grant, token } : null;
  }
  async issueCode(input: { clientId: string; redirectUri: string; challenge: string; scope: string; resource: string }): Promise<string> {
    if (!/^[A-Za-z0-9_-]{43}$/.test(input.challenge)) throw new OAuthGrantError("invalid_request");
    const scope = canonicalScopes(input.scope), grantId = randomUUID(), code = randomBytes(32).toString("hex"), now = Date.now();
    await this.db.transaction(async (tx) => {
      await tx.execute(sql`INSERT INTO oauth_authorizations(id,client_id,scope,resource,redirect_uri,expires_at)
        VALUES(${grantId}::uuid,${input.clientId},${scope},${input.resource},${input.redirectUri},${new Date(now + REFRESH_LIFETIME_MS).toISOString()}::timestamptz)`);
      await tx.execute(sql`INSERT INTO oauth_token_grants(token_hash,grant_id,kind,data,expires_at)
        VALUES(${hash(code)},${grantId}::uuid,'code',${JSON.stringify({ challenge: input.challenge })}::jsonb,${new Date(now + 600_000).toISOString()}::timestamptz)`);
    });
    return code;
  }
  async exchangeCode(input: { code: string; clientId: string; redirectUri: string; verifier: string; resource?: string }): Promise<OAuthTokenGrant> {
    const result = await this.db.transaction(async (tx): Promise<OAuthTokenGrant | null> => {
      const locked = await this.locked(tx, hash(input.code));
      if (!locked) return null;
      const { grant, token } = locked;
      if (grant.client_id !== input.clientId || grant.redirect_uri !== input.redirectUri
          || (input.resource !== undefined && input.resource !== grant.resource) || token.kind !== "code") return null;
      if (token.consumed_at) {
        await tx.execute(sql`UPDATE oauth_authorizations SET revoked_at=clock_timestamp() WHERE id=${grant.id}::uuid`);
        return null;
      }
      if (grant.revoked_at || new Date(grant.expires_at).getTime() <= Date.now()
          || new Date(token.expires_at).getTime() <= Date.now() || !validPkce(input.verifier, token.data.challenge ?? "")) return null;
      await tx.execute(sql`UPDATE oauth_token_grants SET consumed_at=clock_timestamp() WHERE token_hash=${token.token_hash}`);
      return this.insertRefresh(tx, grant, canonicalScopes(grant.scope));
    });
    if (!result) throw new OAuthGrantError("invalid_grant");
    return result;
  }
  private async insertRefresh(tx: SecurityExecutor, grant: GrantRow, scope: string): Promise<OAuthTokenGrant> {
    const refreshToken = randomBytes(32).toString("hex");
    await tx.execute(sql`INSERT INTO oauth_token_grants(token_hash,grant_id,kind,data,expires_at)
      VALUES(${hash(refreshToken)},${grant.id}::uuid,'refresh',${JSON.stringify({ scope })}::jsonb,${new Date(grant.expires_at).toISOString()}::timestamptz)`);
    return { clientId: grant.client_id, grantId: grant.id, scope, refreshToken };
  }
  async rotateRefresh(input: { token: string; clientId: string; scope?: unknown; resource?: string }): Promise<OAuthTokenGrant> {
    const result = await this.db.transaction(async (tx): Promise<OAuthTokenGrant | null> => {
      const locked = await this.locked(tx, hash(input.token));
      if (!locked) return null;
      const { grant, token } = locked;
      if (grant.client_id !== input.clientId || token.kind !== "refresh"
          || (input.resource !== undefined && input.resource !== grant.resource)) return null;
      if (token.consumed_at) {
        // Commit revocation before returning an invalid-grant response.
        await tx.execute(sql`UPDATE oauth_authorizations SET revoked_at=clock_timestamp() WHERE id=${grant.id}::uuid`);
        return null;
      }
      if (grant.revoked_at || new Date(grant.expires_at).getTime() <= Date.now() || new Date(token.expires_at).getTime() <= Date.now()) return null;
      const scope = narrowedScopes(token.data.scope ?? grant.scope, input.scope);
      await tx.execute(sql`UPDATE oauth_token_grants SET consumed_at=clock_timestamp() WHERE token_hash=${token.token_hash}`);
      return this.insertRefresh(tx, grant, scope);
    });
    if (!result) throw new OAuthGrantError("invalid_grant");
    return result;
  }
  async isActive(grantId: string, clientId: string, scope: string, resource: string): Promise<boolean> {
    if (!/^[a-f0-9-]{36}$/i.test(grantId)) return false;
    const grant = rowsOf<GrantRow>(await this.db.execute(sql`SELECT * FROM oauth_authorizations
      WHERE id=${grantId}::uuid AND client_id=${clientId} AND resource=${resource}
        AND revoked_at IS NULL AND expires_at>clock_timestamp()`))[0];
    if (!grant) return false;
    try { return narrowedScopes(grant.scope, scope) === canonicalScopes(scope); } catch { return false; }
  }
  async revoke(token: string, clientId: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      const locked = await this.locked(tx, hash(token));
      if (locked && locked.grant.client_id === clientId) {
        await tx.execute(sql`UPDATE oauth_authorizations SET revoked_at=clock_timestamp() WHERE id=${locked.grant.id}::uuid`);
      }
    });
  }
}
