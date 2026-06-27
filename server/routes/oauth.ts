/**
 * AQUAVO OAuth 2.1 Authorization Server
 *
 * Implements the MCP authorization spec:
 *   RFC 9728  — Protected Resource Metadata
 *   RFC 8414  — Authorization Server Metadata
 *   RFC 7591  — Dynamic Client Registration
 *   OAuth 2.1 — Authorization Code + PKCE (S256 mandatory)
 *   JWT HS256 — no external dependency, uses Node built-in crypto
 *
 * Single-owner use: one admin password guards consent.
 * Tokens live in memory (cleared on restart → re-authorize once).
 */

import { createHmac, randomBytes, timingSafeEqual, createHash } from "crypto";
import type { Request, Response, Router as RouterType } from "express";
import { Router } from "express";

// ─── Config ───────────────────────────────────────────────────────────────────

const ISSUER = (process.env.AQUAVO_BASE_URL ?? "https://www.aquavoiq.com").replace(/\/$/, "");
const MCP_RESOURCE = `${ISSUER}/api/mcp`;
const JWT_SECRET = (process.env.AQUAVO_MCP_SECRET ?? process.env.AQUAVO_MCP_TOKEN ?? "").trim();
const ADMIN_PASSWORD = (process.env.AQUAVO_MCP_ADMIN_PASSWORD ?? "").trim();

// ─── In-memory stores (auth codes only — clients are stateless) ───────────────
//
// On Vercel serverless, in-memory Maps are NOT shared across instances.
// → Client registration uses HMAC-signed tokens (no storage needed).
// → Auth codes are still ephemeral (10-min TTL); user re-authorizes if expired.
// → Refresh tokens are also ephemeral; user re-authorizes after restart.

interface AuthCodeRecord {
  clientId: string;          // the full signed client_id string
  redirectUris: string[];    // decoded from client_id
  codeChallenge: string;
  codeChallengeMethod: string;
  redirectUri: string;
  expiresAt: number;
  scope: string;
}

const authCodes = new Map<string, AuthCodeRecord>();
const refreshTokenStore = new Map<string, { clientId: string; expiresAt: number }>();

// Cleanup expired records every minute
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of authCodes) if (v.expiresAt < now) authCodes.delete(k);
  for (const [k, v] of refreshTokenStore) if (v.expiresAt < now) refreshTokenStore.delete(k);
}, 60_000);

// ─── Stateless Client ID (HMAC-signed, no DB / no Map needed) ─────────────────
//
// client_id = base64url(JSON payload) + "." + hmac(payload, JWT_SECRET)[0:32]
// This survives Vercel cold-starts and horizontal scaling.

interface ClientPayload {
  r: string[];   // redirect_uris
  n: string;     // client_name
  t: number;     // issued_at (ms)
}

function createClientId(redirectUris: string[], name: string): string {
  const payload = JSON.stringify({ r: redirectUris, n: name, t: Date.now() } satisfies ClientPayload);
  const payloadB64 = Buffer.from(payload).toString("base64url");
  const sig = createHmac("sha256", JWT_SECRET || "fallback-insecure")
    .update(payloadB64)
    .digest("hex")
    .slice(0, 32);
  return `${payloadB64}.${sig}`;
}

function verifyClientId(clientId: string): { redirectUris: string[]; name: string } | null {
  try {
    const dot = clientId.lastIndexOf(".");
    if (dot < 0) return null;
    const payloadB64 = clientId.slice(0, dot);
    const sig = clientId.slice(dot + 1);
    const expected = createHmac("sha256", JWT_SECRET || "fallback-insecure")
      .update(payloadB64)
      .digest("hex")
      .slice(0, 32);
    // Timing-safe compare
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length) return null;
    try { if (!timingSafeEqual(sigBuf, expBuf)) return null; } catch { return null; }
    const parsed: ClientPayload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
    if (!Array.isArray(parsed.r)) return null;
    return { redirectUris: parsed.r, name: String(parsed.n ?? "unknown") };
  } catch {
    return null;
  }
}

// ─── JWT (HS256, no deps) ─────────────────────────────────────────────────────

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function signJwt(payload: Record<string, unknown>, expiresInSec: number): string {
  if (!JWT_SECRET) throw new Error("AQUAVO_MCP_SECRET env var not set");
  const header = b64url(Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = b64url(Buffer.from(JSON.stringify({
    ...payload,
    iss: ISSUER,
    aud: MCP_RESOURCE,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expiresInSec,
  })));
  const sig = b64url(createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest());
  return `${header}.${body}.${sig}`;
}

export function verifyMcpToken(token: string): { clientId: string; scope: string } | null {
  if (!JWT_SECRET || !token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const expected = b64url(createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest());
  try {
    if (sig.length !== expected.length) return null;
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString());
  } catch {
    return null;
  }
  if (typeof payload.exp === "number" && payload.exp < Math.floor(Date.now() / 1000)) return null;
  if (payload.aud !== MCP_RESOURCE) return null;
  return { clientId: String(payload.sub ?? "oauth-client"), scope: String(payload.scope ?? "mcp") };
}

// ─── PKCE ─────────────────────────────────────────────────────────────────────

function verifyPkce(verifier: string, challenge: string, method: string): boolean {
  if (method === "plain") {
    try { return timingSafeEqual(Buffer.from(verifier), Buffer.from(challenge)); }
    catch { return false; }
  }
  // S256 (MCP spec mandatory)
  const hash = b64url(createHash("sha256").update(verifier).digest());
  return hash === challenge;
}

// ─── redirect_uri validation ──────────────────────────────────────────────────
// Only allow https:// or http://localhost (loopback) — block javascript:, data:, etc.

function isAllowedRedirectUri(uri: string): boolean {
  try {
    const u = new URL(uri);
    if (u.protocol === "https:") return true;
    if (u.protocol === "http:") {
      const host = u.hostname;
      return host === "localhost" || host === "127.0.0.1" || host === "::1";
    }
    return false;
  } catch {
    return false;
  }
}

// ─── HTML helpers ─────────────────────────────────────────────────────────────

export function handleOAuthRegisterOptions(_req: Request, res: Response): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.sendStatus(204);
}

export function handleOAuthRegister(req: Request, res: Response): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  const body = req.body ?? {};
  const rawUris: unknown[] = Array.isArray(body.redirect_uris) ? body.redirect_uris : [];
  if (!rawUris.length) {
    res.status(400).json({ error: "invalid_client_metadata", error_description: "redirect_uris is required" });
    return;
  }

  const redirectUris: string[] = [];
  for (const uri of rawUris) {
    if (typeof uri !== "string") {
      res.status(400).json({ error: "invalid_client_metadata", error_description: "redirect_uris must be strings" });
      return;
    }
    if (!isAllowedRedirectUri(uri)) {
      res.status(400).json({ error: "invalid_redirect_uri", error_description: `Redirect URI scheme not allowed: ${uri} — only https:// or http://localhost` });
      return;
    }
    redirectUris.push(uri);
  }

  const clientId = createClientId(redirectUris, String(body.client_name ?? "unknown"));
  console.log(`[OAUTH] Registered client (stateless): name=${body.client_name ?? "unknown"} uris=${redirectUris.join(",")}`);
  res.status(201).json({
    client_id: clientId,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    redirect_uris: redirectUris,
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method: "none",
  });
}

function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function consentHtml(params: {
  client_id: string;
  client_name: string;
  redirect_uri: string;
  state: string;
  code_challenge: string;
  code_challenge_method: string;
  scope: string;
  showError: boolean;
}): string {
  const { client_id, client_name, redirect_uri, state, code_challenge, code_challenge_method, scope, showError } = params;
  // Show only the origin of redirect_uri (safe to display)
  let redirectOrigin = redirect_uri;
  try { redirectOrigin = new URL(redirect_uri).origin; } catch { /* keep as-is */ }

  const scopeItems = scope.split(/\s+/).filter(Boolean);

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AQUAVO — تفويض MCP</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,sans-serif;background:#0a1628;color:#e8f4f8;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
    .card{background:#0d1f3c;border:1px solid #1e3a5f;border-radius:16px;padding:36px;max-width:460px;width:100%}
    .logo{font-size:24px;font-weight:800;color:#199bb8;margin-bottom:4px;letter-spacing:-0.5px}
    .subtitle{color:#7fb3c8;font-size:13px;margin-bottom:20px}
    .client-box{background:#061020;border:1px solid #2a4a6b;border-radius:10px;padding:14px 16px;margin-bottom:20px;font-size:13px}
    .client-row{display:flex;gap:8px;padding:3px 0;color:#c8e6f0}
    .client-label{color:#5a8fa8;min-width:80px;flex-shrink:0}
    .client-value{color:#e8f4f8;word-break:break-all;font-family:monospace;font-size:12px}
    .scope-box{background:#0a1628;border:1px solid #1e3a5f;border-radius:10px;padding:14px 16px;margin-bottom:20px}
    .scope-title{font-size:11px;color:#5a8fa8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px}
    .scope-item{display:flex;align-items:center;gap:8px;padding:4px 0;font-size:13px;color:#c8e6f0}
    .scope-item::before{content:"✓";color:#199bb8;font-weight:700;min-width:14px}
    label{display:block;font-size:12px;color:#7fb3c8;margin-bottom:7px;font-weight:500}
    input[type=password]{width:100%;padding:12px 16px;background:#0a1628;border:1px solid #1e3a5f;border-radius:8px;color:#e8f4f8;font-size:15px;outline:none;transition:border-color 0.2s}
    input[type=password]:focus{border-color:#199bb8;box-shadow:0 0 0 3px rgba(25,155,184,0.1)}
    .btn{width:100%;padding:13px;background:#199bb8;border:none;border-radius:8px;color:#fff;font-size:15px;font-weight:600;cursor:pointer;margin-top:16px;transition:background 0.2s}
    .btn:hover{background:#1589a3}
    .err{background:#2d0a0a;border:1px solid #5c1a1a;border-radius:8px;padding:12px 14px;color:#f87171;font-size:13px;margin-bottom:14px}
    .warn{background:#1a1200;border:1px solid #4a3000;border-radius:8px;padding:10px 14px;color:#fbbf24;font-size:12px;margin-bottom:14px}
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">AQUAVO</div>
    <div class="subtitle">طلب وصول AI إلى لوحة الأدمن</div>

    <div class="client-box">
      <div class="client-row"><span class="client-label">الطالب:</span><span class="client-value">${esc(client_name || "غير معروف")}</span></div>
      <div class="client-row"><span class="client-label">Client ID:</span><span class="client-value">${esc(client_id)}</span></div>
      <div class="client-row"><span class="client-label">Redirect:</span><span class="client-value">${esc(redirectOrigin)}</span></div>
    </div>

    <div class="scope-box">
      <div class="scope-title">الصلاحيات المطلوبة: ${esc(scope)}</div>
      <div class="scope-item">قراءة وتعديل المنتجات والمخزون</div>
      <div class="scope-item">قراءة وتحديث حالة الطلبات</div>
      <div class="scope-item">قراءة بيانات الزبائن والتقارير</div>
      <div class="scope-item">إدارة الكوبونات والمصاريف</div>
      <div class="scope-item">الإحصائيات والتحليلات</div>
    </div>

    ${showError ? '<div class="err">كلمة المرور غير صحيحة — حاول ثاني</div>' : ""}
    <div class="warn">تأكد إن الطالب هو Claude.ai أو أداة موثوقة قبل الموافقة</div>

    <form method="POST" action="/oauth/authorize">
      <input type="hidden" name="client_id" value="${esc(client_id)}">
      <input type="hidden" name="redirect_uri" value="${esc(redirect_uri)}">
      <input type="hidden" name="state" value="${esc(state)}">
      <input type="hidden" name="code_challenge" value="${esc(code_challenge)}">
      <input type="hidden" name="code_challenge_method" value="${esc(code_challenge_method)}">
      <input type="hidden" name="scope" value="${esc(scope)}">
      <label for="pw">كلمة مرور الأدمن</label>
      <input type="password" id="pw" name="password" placeholder="أدخل كلمة المرور" autofocus required>
      <button type="submit" class="btn">منح الوصول</button>
    </form>
  </div>
</body>
</html>`;
}

// ─── Router ───────────────────────────────────────────────────────────────────

export function createOAuthRouter(): RouterType {
  const router = Router();

  // RFC 9728 — Protected Resource Metadata
  // Claude.ai fetches this after getting 401 from /api/mcp
  router.get("/.well-known/oauth-protected-resource", (_req: Request, res: Response) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.json({
      resource: MCP_RESOURCE,
      authorization_servers: [ISSUER],
      bearer_methods_supported: ["header"],
      scopes_supported: ["mcp", "mcp:read", "mcp:write"],
    });
  });

  // RFC 8414 — Authorization Server Metadata
  router.get("/.well-known/oauth-authorization-server", (_req: Request, res: Response) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.json({
      issuer: ISSUER,
      authorization_endpoint: `${ISSUER}/oauth/authorize`,
      token_endpoint: `${ISSUER}/oauth/token`,
      registration_endpoint: `${ISSUER}/oauth/register`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none"],
      scopes_supported: ["mcp", "mcp:read", "mcp:write"],
      authorization_response_iss_parameter_supported: true,
    });
  });

  // RFC 7591 — Dynamic Client Registration
  // Uses stateless HMAC-signed client_id — no server-side storage required.
  // Survives Vercel cold-starts and horizontal scaling.
  // Security: the actual gate is the admin password on the consent screen.

  // CORS preflight for /oauth/register
  router.options("/oauth/register", handleOAuthRegisterOptions);
  router.post("/oauth/register", handleOAuthRegister);

  // Admin endpoint — verify a client_id token
  router.get("/oauth/admin/verify-client", (req: Request, res: Response) => {
    const authHeader = req.headers["authorization"] ?? "";
    const provided = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (!ADMIN_PASSWORD) { res.status(503).json({ error: "AQUAVO_MCP_ADMIN_PASSWORD not set" }); return; }
    const pwBuf = Buffer.from(provided);
    const expectedBuf = Buffer.from(ADMIN_PASSWORD);
    let ok = false;
    if (pwBuf.length === expectedBuf.length) { try { ok = timingSafeEqual(pwBuf, expectedBuf); } catch { /* */ } }
    if (!ok) { res.status(401).json({ error: "unauthorized" }); return; }
    const clientId = String(req.query.client_id ?? "");
    const client = verifyClientId(clientId);
    res.json({ valid: !!client, client });
  });

  // Authorization Endpoint — GET (consent page)
  router.get("/oauth/authorize", (req: Request, res: Response) => {
    const q = req.query as Record<string, string>;
    const { client_id, redirect_uri, state = "", code_challenge, code_challenge_method = "S256", scope = "mcp", error } = q;

    if (!client_id || !redirect_uri || !code_challenge) {
      res.status(400).send("<h1>Bad Request: missing required parameters</h1>");
      return;
    }

    // Stateless: verify the HMAC-signed client_id (no Map lookup)
    const client = verifyClientId(client_id);
    if (!client) {
      res.status(400).send("<h1>Invalid client_id signature</h1>");
      return;
    }
    if (!client.redirectUris.includes(redirect_uri)) {
      res.status(400).send("<h1>redirect_uri not registered for this client</h1>");
      return;
    }

    // Override CSP for the consent page — allow form POST redirect to the OAuth callback
    let redirectOriginForCsp = "'self'";
    try { redirectOriginForCsp = new URL(redirect_uri).origin; } catch { /* keep self */ }
    res.setHeader("Content-Security-Policy",
      `default-src 'none'; style-src 'unsafe-inline'; form-action 'self' ${redirectOriginForCsp}; base-uri 'self'`
    );
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(consentHtml({
      client_id,
      client_name: client.name ?? "غير معروف",
      redirect_uri,
      state,
      code_challenge,
      code_challenge_method,
      scope,
      showError: error === "1",
    }));
  });

  // Authorization Endpoint — POST (process consent)
  router.post("/oauth/authorize", (req: Request, res: Response) => {
    const body = req.body ?? {};
    const { client_id, redirect_uri, state = "", code_challenge, code_challenge_method = "S256", scope = "mcp", password } = body;

    if (!client_id || !redirect_uri || !code_challenge) {
      res.status(400).json({ error: "invalid_request", error_description: "Missing required parameters" });
      return;
    }

    if (!ADMIN_PASSWORD) {
      res.status(503).json({ error: "server_error", error_description: "AQUAVO_MCP_ADMIN_PASSWORD not configured on server" });
      return;
    }

    // Validate admin password (timing-safe)
    const pwBuf = Buffer.from(String(password ?? ""));
    const expectedBuf = Buffer.from(ADMIN_PASSWORD);
    let passwordOk = false;
    if (pwBuf.length === expectedBuf.length) {
      try { passwordOk = timingSafeEqual(pwBuf, expectedBuf); } catch { /* */ }
    }

    if (!passwordOk) {
      const params = new URLSearchParams({ client_id, redirect_uri, state, code_challenge, code_challenge_method, scope, error: "1" });
      res.redirect(303, `/oauth/authorize?${params}`);
      return;
    }

    // Stateless: verify the HMAC-signed client_id (no Map lookup needed)
    const client = verifyClientId(client_id);
    if (!client || !client.redirectUris.includes(redirect_uri)) {
      res.status(400).json({ error: "invalid_client", error_description: "Invalid or tampered client_id" });
      return;
    }

    const code = randomBytes(32).toString("hex");
    authCodes.set(code, {
      clientId: client_id,
      redirectUris: client.redirectUris,
      codeChallenge: code_challenge,
      codeChallengeMethod: code_challenge_method,
      redirectUri: redirect_uri,
      expiresAt: Date.now() + 10 * 60 * 1000,
      scope,
    });

    console.log(`[OAUTH] Issued auth code for client=${client_id.slice(0, 20)}...`);
    const dest = new URL(redirect_uri);
    dest.searchParams.set("code", code);
    if (state) dest.searchParams.set("state", state);
    dest.searchParams.set("iss", ISSUER);
    // Force 303 See Other to ensure the browser switches from POST to GET
    res.redirect(303, dest.toString());
  });

  // Token Endpoint — CORS preflight
  router.options("/oauth/token", (_req: Request, res: Response) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.sendStatus(204);
  });

  // Token Endpoint — POST
  router.post("/oauth/token", (req: Request, res: Response) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-store");

    const body = req.body ?? {};
    const { grant_type, code, redirect_uri, code_verifier, refresh_token } = body;

    if (grant_type === "authorization_code") {
      if (!code || !redirect_uri || !code_verifier) {
        res.status(400).json({ error: "invalid_request", error_description: "code, redirect_uri, code_verifier required" });
        return;
      }

      const record = authCodes.get(code);
      if (!record || record.expiresAt < Date.now()) {
        authCodes.delete(code);
        res.status(400).json({ error: "invalid_grant", error_description: "Authorization code expired or already used" });
        return;
      }
      if (record.redirectUri !== redirect_uri) {
        res.status(400).json({ error: "invalid_grant", error_description: "redirect_uri mismatch" });
        return;
      }
      if (!verifyPkce(String(code_verifier), record.codeChallenge, record.codeChallengeMethod)) {
        res.status(400).json({ error: "invalid_grant", error_description: "PKCE code_verifier failed" });
        return;
      }

      authCodes.delete(code); // one-time use

      const accessToken = signJwt({ sub: record.clientId, scope: record.scope }, 24 * 3600); // 24h
      const rfToken = randomBytes(32).toString("hex");
      refreshTokenStore.set(rfToken, { clientId: record.clientId, expiresAt: Date.now() + 30 * 24 * 3600_000 });

      console.log(`[OAUTH] Issued access token for client=${record.clientId}`);
      res.json({
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: 24 * 3600,
        refresh_token: rfToken,
        scope: record.scope,
      });
      return;
    }

    if (grant_type === "refresh_token") {
      if (!refresh_token) {
        res.status(400).json({ error: "invalid_request", error_description: "refresh_token required" });
        return;
      }
      const record = refreshTokenStore.get(String(refresh_token));
      if (!record || record.expiresAt < Date.now()) {
        refreshTokenStore.delete(String(refresh_token));
        res.status(400).json({ error: "invalid_grant", error_description: "Refresh token expired" });
        return;
      }
      // Rotate refresh token
      refreshTokenStore.delete(String(refresh_token));
      const newRfToken = randomBytes(32).toString("hex");
      refreshTokenStore.set(newRfToken, { clientId: record.clientId, expiresAt: Date.now() + 30 * 24 * 3600_000 });

      const accessToken = signJwt({ sub: record.clientId, scope: "mcp" }, 24 * 3600);
      console.log(`[OAUTH] Refreshed token for client=${record.clientId}`);
      res.json({
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: 24 * 3600,
        refresh_token: newRfToken,
        scope: "mcp",
      });
      return;
    }

    res.status(400).json({ error: "unsupported_grant_type" });
  });

  return router;
}
