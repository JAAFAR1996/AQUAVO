import { randomBytes, randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDb } from "../db.js";
import { normalizeOAuthScope, scopeIsSubset, tokenDigest, verifyS256 } from "./oauth-policy.js";

type Db = NonNullable<ReturnType<typeof getDb>>;
type Executor = Pick<Db, "execute">;
function rows(result: any): any[] { return Array.isArray(result) ? result : result?.rows ?? []; }
function requireDb(): Db { const db=getDb(); if (!db) throw new Error("OAuth store unavailable"); return db; }
export interface TokenGrant { clientId: string; scope: string; grantId: string; refreshToken: string; }

/** Tokens are hashed at rest. Transaction-scoped locks serialize exchange and
 * rotation on every serverless instance. A replay revokes its whole grant.
 */
export async function issueAuthorizationCode(input: {
  clientId: string; redirectUri: string; codeChallenge: string; scope: string;
}, db: Db = requireDb()): Promise<string> {
  const scope=normalizeOAuthScope(input.scope);
  if (!scope || !/^[A-Za-z0-9_-]{43}$/.test(input.codeChallenge)) throw new Error("Invalid OAuth grant");
  const code=randomBytes(32).toString("hex");
  await db.execute(sql`INSERT INTO oauth_authorization_codes(code_hash,client_id,redirect_uri,code_challenge,scope,expires_at)
    VALUES(${tokenDigest(code)},${input.clientId},${input.redirectUri},${input.codeChallenge},${scope},now()+interval '10 minutes')`);
  return code;
}
export async function exchangeAuthorizationCode(input: {
  code: string; clientId: string; redirectUri: string; verifier: string;
}, db: Db = requireDb()): Promise<TokenGrant | null> {
  if (!/^[0-9a-f]{64}$/.test(input.code)) return null;
  return db.transaction(async tx => {
    const record=rows(await tx.execute(sql`SELECT *, expires_at>now() AS valid
      FROM oauth_authorization_codes WHERE code_hash=${tokenDigest(input.code)} FOR UPDATE`))[0];
    if (!record?.valid || record.client_id!==input.clientId || record.redirect_uri!==input.redirectUri
      || !verifyS256(input.verifier,record.code_challenge)) return null;
    const scope=normalizeOAuthScope(record.scope);
    if (!scope) return null;
    const grantId=randomUUID(), refreshToken=randomBytes(32).toString("hex");
    await tx.execute(sql`DELETE FROM oauth_authorization_codes WHERE code_hash=${tokenDigest(input.code)}`);
    await tx.execute(sql`INSERT INTO oauth_grants(id,client_id,scope,expires_at)
      VALUES(${grantId}::uuid,${record.client_id},${scope},now()+interval '30 days')`);
    await tx.execute(sql`INSERT INTO oauth_refresh_tokens(token_hash,grant_id)
      VALUES(${tokenDigest(refreshToken)},${grantId}::uuid)`);
    return { clientId: record.client_id, scope, grantId, refreshToken };
  });
}
export async function rotateRefreshToken(input: {
  refreshToken: string; clientId: string; scope?: string;
}, db: Db = requireDb()): Promise<TokenGrant | null> {
  if (!/^[0-9a-f]{64}$/.test(input.refreshToken)) return null;
  return db.transaction(async tx => {
    // All rotations for a family lock the grant first, including replay handling.
    const grant=rows(await tx.execute(sql`SELECT g.*,g.expires_at>now() AS valid
      FROM oauth_grants g JOIN oauth_refresh_tokens t ON t.grant_id=g.id
      WHERE t.token_hash=${tokenDigest(input.refreshToken)} FOR UPDATE OF g`))[0];
    if (!grant || !grant.valid || grant.revoked_at || grant.client_id!==input.clientId) return null;
    const token=rows(await tx.execute(sql`SELECT consumed_at FROM oauth_refresh_tokens
      WHERE token_hash=${tokenDigest(input.refreshToken)}`))[0];
    if (!token || token.consumed_at) {
      await tx.execute(sql`UPDATE oauth_grants SET revoked_at=now() WHERE id=${grant.id}::uuid`);
      return null; // Return, do not throw: revocation must COMMIT.
    }
    const scope=normalizeOAuthScope(input.scope ?? grant.scope);
    if (!scope || !scopeIsSubset(scope,grant.scope)) return null;
    const refreshToken=randomBytes(32).toString("hex");
    await tx.execute(sql`UPDATE oauth_refresh_tokens SET consumed_at=now() WHERE token_hash=${tokenDigest(input.refreshToken)}`);
    await tx.execute(sql`UPDATE oauth_grants SET scope=${scope} WHERE id=${grant.id}::uuid`);
    await tx.execute(sql`INSERT INTO oauth_refresh_tokens(token_hash,grant_id) VALUES(${tokenDigest(refreshToken)},${grant.id}::uuid)`);
    return { clientId:grant.client_id,scope,grantId:grant.id,refreshToken };
  });
}
export async function isOAuthGrantActive(grantId: string,clientId: string,scope: string,db: Executor = requireDb()): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/i.test(grantId)) return false;
  const record=rows(await db.execute(sql`SELECT scope FROM oauth_grants WHERE id=${grantId}::uuid
    AND client_id=${clientId} AND revoked_at IS NULL AND expires_at>now()`))[0];
  return Boolean(record && scopeIsSubset(scope,record.scope));
}
export async function revokeOAuthRefreshToken(token: string,clientId: string,db: Db = requireDb()): Promise<void> {
  if (!/^[0-9a-f]{64}$/.test(token)) return;
  await db.execute(sql`UPDATE oauth_grants SET revoked_at=now() WHERE client_id=${clientId}
    AND id IN (SELECT grant_id FROM oauth_refresh_tokens WHERE token_hash=${tokenDigest(token)})`);
}
