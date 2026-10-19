from pathlib import Path
root=Path('.')
def modify(path,old,new,count=1):
    p=root/path;s=p.read_text();actual=s.count(old)
    if actual!=count:raise RuntimeError(f'{path}: expected {count} matches, got {actual}: {old[:80]}')
    p.write_text(s.replace(old,new))
def block(path,start,end,new):
    p=root/path;s=p.read_text();i=s.index(start);j=s.index(end,i);p.write_text(s[:i]+new+s[j:])
path='server/routes/oauth.ts'
modify(path,'import { Router } from "express";', '''import { Router } from "express";
import { ACCESS_TOKEN_LIFETIME_SECONDS, OAuthGrantError, OAuthGrantStore, canonicalScopes } from "../services/oauth-grant-store.js";
import rateLimit from "express-rate-limit";''')
block(path,'// ─── In-memory stores','// ─── Stateless Client ID', '''// Authorization and refresh state is shared PostgreSQL storage, not instance-local Maps.
// Legacy tokens lack grantVersion=2 and require fresh owner consent after rollout.
const oauthLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });

''')
modify(path,' * Tokens live in memory (cleared on restart → re-authorize once).',' * Hash-only grants persist in PostgreSQL and are atomically consumed/rotated.')
modify(path,'JWT_SECRET || "fallback-insecure"','JWT_SECRET',count=2)
modify(path,'function createClientId(redirectUris: string[], name: string): string {','function createClientId(redirectUris: string[], name: string): string {\n  if (!JWT_SECRET) throw new Error("OAuth signing secret unavailable");')
modify(path,'export function handleOAuthRegister(req: Request, res: Response): void {','export function handleOAuthRegister(req: Request, res: Response): void {\n  if (!JWT_SECRET) { res.status(503).json({ error: "temporarily_unavailable" }); return; }')
modify(path,'    if (!Array.isArray(parsed.r)) return null;','    if (!Array.isArray(parsed.r) || parsed.r.length === 0 || parsed.r.length > 10 || parsed.r.some((uri) => typeof uri !== "string" || !isAllowedRedirectUri(uri))) return null;')
modify(path,'  if (!rawUris.length) {','  if (!rawUris.length || rawUris.length > 10) {')
modify(path,'    if (!isAllowedRedirectUri(uri)) {','    if (uri.length > 2048 || !isAllowedRedirectUri(uri)) {')
modify(path,'    ...payload,\n    iss: ISSUER,','    ...payload,\n    grantVersion: 2,\n    iss: ISSUER,')
block(path,'export function verifyMcpToken(', '// ─── redirect_uri validation', '''export async function verifyMcpToken(token: string): Promise<{ clientId: string; scope: string } | null> {
  if (!JWT_SECRET || !token || token.length > 16_384) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const expected = b64url(createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest());
  try {
    if (Buffer.byteLength(sig) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const algorithm = JSON.parse(Buffer.from(header, "base64url").toString());
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    const now = Math.floor(Date.now() / 1000);
    if (algorithm.alg !== "HS256" || algorithm.typ !== "JWT" || payload.grantVersion !== 2
        || payload.iss !== ISSUER || payload.aud !== MCP_RESOURCE
        || typeof payload.exp !== "number" || !Number.isFinite(payload.exp) || payload.exp <= now
        || typeof payload.iat !== "number" || !Number.isFinite(payload.iat) || payload.iat > now + 30
        || payload.exp - payload.iat > ACCESS_TOKEN_LIFETIME_SECONDS
        || typeof payload.sub !== "string" || typeof payload.scope !== "string" || typeof payload.grantId !== "string") return null;
    const scope = canonicalScopes(payload.scope);
    if (!(await new OAuthGrantStore().isActive(payload.grantId, payload.sub, scope, MCP_RESOURCE))) return null;
    return { clientId: payload.sub, scope };
  } catch { return null; }
}

''')
modify(path,'  router.post("/oauth/register", handleOAuthRegister);','  router.post("/oauth/register", oauthLimiter, handleOAuthRegister);')
modify(path,'  router.get("/oauth/admin/verify-client", (req: Request, res: Response) => {','  router.get("/oauth/admin/verify-client", oauthLimiter, (req: Request, res: Response) => {')
modify(path,'scope = "mcp", error','scope: requestedScope = "mcp:read", error')
modify(path,'    // Stateless: verify the HMAC-signed client_id (no Map lookup)\n', '''    let scope: string;
    try { scope = canonicalScopes(requestedScope); } catch { res.status(400).send("Invalid scope"); return; }
    if (code_challenge_method !== "S256" || !/^[A-Za-z0-9_-]{43}$/.test(code_challenge)) {
      res.status(400).send("PKCE S256 is required"); return;
    }
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Referrer-Policy", "no-referrer");
    // Stateless: verify the HMAC-signed client_id (no Map lookup)
''')
modify(path,'  router.post("/oauth/authorize", (req: Request, res: Response) => {','  router.post("/oauth/authorize", oauthLimiter, async (req: Request, res: Response) => {')
modify(path,'scope = "mcp", password','scope: requestedScope = "mcp:read", password')
modify(path,'    if (!ADMIN_PASSWORD) {\n', '''    let scope: string;
    try { scope = canonicalScopes(requestedScope); } catch { res.status(400).json({ error: "invalid_scope" }); return; }
    if (code_challenge_method !== "S256" || !/^[A-Za-z0-9_-]{43}$/.test(String(code_challenge))) {
      res.status(400).json({ error: "invalid_request", error_description: "PKCE S256 required" }); return;
    }
    if (body.resource !== undefined && body.resource !== MCP_RESOURCE) {
      res.status(400).json({ error: "invalid_target" }); return;
    }
    if (!ADMIN_PASSWORD || !JWT_SECRET) {
''')
block(path,'    const code = randomBytes(32).toString("hex");\n    authCodes.set', '    console.log(`[OAUTH] Issued auth code', '''    let code: string;
    try {
      code = await new OAuthGrantStore().issueCode({ clientId: client_id, redirectUri: redirect_uri, challenge: code_challenge, scope, resource: MCP_RESOURCE });
    } catch { res.status(503).json({ error: "temporarily_unavailable" }); return; }

''')
block(path,'  // Token Endpoint — POST', '\n  return router;', '''  // RFC 9700: exact client/resource binding; refresh preserves or narrows scope only.
  router.post("/oauth/token", oauthLimiter, async (req: Request, res: Response) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-store");
    const body = req.body ?? {};
    if (typeof body.client_id !== "string" || !verifyClientId(body.client_id)) {
      res.status(400).json({ error: "invalid_client" }); return;
    }
    if (body.resource !== undefined && body.resource !== MCP_RESOURCE) {
      res.status(400).json({ error: "invalid_target" }); return;
    }
    try {
      const store = new OAuthGrantStore();
      let grant;
      if (body.grant_type === "authorization_code") {
        if (typeof body.code !== "string" || body.code.length > 256 || typeof body.redirect_uri !== "string" || typeof body.code_verifier !== "string") {
          res.status(400).json({ error: "invalid_request" }); return;
        }
        grant = await store.exchangeCode({ code: body.code, clientId: body.client_id, redirectUri: body.redirect_uri, verifier: body.code_verifier, resource: body.resource });
      } else if (body.grant_type === "refresh_token") {
        if (typeof body.refresh_token !== "string" || body.refresh_token.length > 256) {
          res.status(400).json({ error: "invalid_request" }); return;
        }
        grant = await store.rotateRefresh({ token: body.refresh_token, clientId: body.client_id, scope: body.scope, resource: body.resource });
      } else { res.status(400).json({ error: "unsupported_grant_type" }); return; }
      res.json({
        access_token: signJwt({ sub: grant.clientId, scope: grant.scope, grantId: grant.grantId, jti: randomBytes(16).toString("hex") }, ACCESS_TOKEN_LIFETIME_SECONDS),
        token_type: "Bearer", expires_in: ACCESS_TOKEN_LIFETIME_SECONDS,
        refresh_token: grant.refreshToken, scope: grant.scope,
      });
    } catch (error) {
      res.status(error instanceof OAuthGrantError ? 400 : 503).json({ error: error instanceof OAuthGrantError ? error.code : "temporarily_unavailable" });
    }
  });
  router.post("/oauth/revoke", oauthLimiter, async (req: Request, res: Response) => {
    res.setHeader("Cache-Control", "no-store");
    const { token, client_id } = req.body ?? {};
    if (typeof token !== "string" || token.length > 256 || typeof client_id !== "string") { res.sendStatus(200); return; }
    try { await new OAuthGrantStore().revoke(token, client_id); res.sendStatus(200); }
    catch { res.status(503).json({ error: "temporarily_unavailable" }); }
  });
''')
modify(path,'      token_endpoint: `${ISSUER}/oauth/token`,','      token_endpoint: `${ISSUER}/oauth/token`,\n      revocation_endpoint: `${ISSUER}/oauth/revoke`,')
modify('server/routes/mcp.ts','function mcpAuth(req: McpRequest, res: Response, next: NextFunction): void {','async function mcpAuth(req: McpRequest, res: Response, next: NextFunction): Promise<void> {')
modify('server/routes/mcp.ts','const verified = token ? verifyMcpToken(token) : null;','const verified = token ? await verifyMcpToken(token) : null;')
modify('server/routes/mcp.ts','  "password_reset_tokens",','  "password_reset_tokens",\n  "commerce_request_bindings",\n  "oauth_authorizations",\n  "oauth_token_grants",')
modify('server/session-store.ts','import { sessions }','import { sessions, users }')
modify('server/session-store.ts','import { Store } from "express-session";','import { Store } from "express-session";\nimport { sessionMatchesUser } from "./security/session-proof.js";')
modify('server/session-store.ts','      const session = result[0];','''      const session = result[0];
      if (session.sess?.userId && !(await this.validIdentity(session.sess))) {
        await this.destroy(sid);
        callback(null, null);
        return;
      }''')
modify('server/session-store.ts','      const expire = this.getExpireDate(session);\n\n      // Upsert session','''      if (session?.userId && !(await this.validIdentity(session))) {
        await this.destroy(sid);
        if (callback) callback(Object.assign(new Error("Session was revoked; sign in again"), { status: 401 }));
        return;
      }
      const expire = this.getExpireDate(session);

      // Upsert session''')
modify('server/session-store.ts','  private getExpireDate(session: any): Date {','''  private async validIdentity(session: { userId?: string; authProof?: string }): Promise<boolean> {
    if (!session.userId) return true;
    const [user] = await this.db!.select({ id: users.id, passwordHash: users.passwordHash, role: users.role, deletedAt: users.deletedAt })
      .from(users).where(eq(users.id, session.userId)).limit(1);
    return sessionMatchesUser(session, user);
  }

  private getExpireDate(session: any): Date {''')
modify('server/routes/users.ts','import crypto from "crypto";','import crypto from "crypto";\nimport { establishAuthenticatedSession } from "../security/session-proof.js";')
modify('server/routes/users.ts','            const sess = getSession(req);\n            if (sess) sess.userId = user.id;','            await establishAuthenticatedSession(req, user);',count=2)
modify('server/routes/users.ts','            await storage.updateUser(sess.userId, { passwordHash: hashPassword(newPassword) });\n            res.json', '''            await storage.updateUser(sess.userId, { passwordHash: hashPassword(newPassword) });
            await new Promise<void>((resolve, reject) => req.session.destroy((error) => error ? reject(error) : resolve()));
            res.clearCookie("sid", { path: "/" });
            res.json''')
modify('server/storage/user-storage.ts','where(eq(users.id, id)).limit(1)','where(and(eq(users.id, id), isNull(users.deletedAt))).limit(1)')
modify('server/storage/user-storage.ts','where(eq(users.email, email)).limit(1)','where(and(eq(users.email, email), isNull(users.deletedAt))).limit(1)')
modify('server/storage/user-storage.ts','WHERE id = (SELECT user_id FROM deleted_token)','WHERE id = (SELECT user_id FROM deleted_token) AND deleted_at IS NULL')
p=root/'server/middleware/auth.ts';s=p.read_text();s=s.replace('if (!user) {','if (!user || user.deletedAt) {');p.write_text(s)
modify('server/middleware/accounting-auth-v2.ts','        role: users.role,','        role: users.role,\n        deletedAt: users.deletedAt,')
modify('server/middleware/accounting-auth-v2.ts','    if (!user) {','    if (!user || user.deletedAt) {')
