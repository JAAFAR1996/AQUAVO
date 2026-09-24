import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import type { Request, Response, Router as RouterType } from "express";
import { Router } from "express";
import { storage } from "../storage/index.js";
import { toPublicProducts } from "../../shared/public-product.js";

const SITE = (process.env.AQUAVO_BASE_URL ?? "https://www.aquavoiq.com").replace(/\/$/, "");
const RESOURCE = `${SITE}/api/agent/catalog`;
const TOKEN_TTL_SECONDS = 60 * 60;
const SECRET = (
  process.env.AQUAVO_AGENT_AUTH_SECRET ??
  process.env.AQUAVO_MCP_SECRET ??
  process.env.AQUAVO_MCP_TOKEN ??
  ""
).trim();

type AgentTokenPayload = {
  iss: string;
  aud: string;
  sub: string;
  scope: "catalog:read";
  iat: number;
  exp: number;
  jti: string;
};

const registrationWindows = new Map<string, { startedAt: number; count: number }>();
const REGISTRATION_WINDOW_MS = 60 * 60 * 1000;
const REGISTRATION_LIMIT = 60;

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(payload: AgentTokenPayload): string {
  if (!SECRET) throw new Error("Agent auth signing secret is not configured");
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify(payload));
  const signature = base64url(createHmac("sha256", SECRET).update(`${header}.${body}`).digest());
  return `${header}.${body}.${signature}`;
}

function verify(token: string): AgentTokenPayload | null {
  if (!SECRET) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const expected = base64url(createHmac("sha256", SECRET).update(`${header}.${body}`).digest());

  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) return null;
  try {
    if (!timingSafeEqual(actualBuffer, expectedBuffer)) return null;
  } catch {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as AgentTokenPayload;
    const now = Math.floor(Date.now() / 1000);
    if (payload.iss !== SITE) return null;
    if (payload.aud !== RESOURCE) return null;
    if (payload.scope !== "catalog:read") return null;
    if (!payload.sub || !payload.jti) return null;
    if (!Number.isFinite(payload.exp) || payload.exp <= now) return null;
    if (!Number.isFinite(payload.iat) || payload.iat > now + 120) return null;
    return payload;
  } catch {
    return null;
  }
}

function clientKey(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  const first = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0];
  return String(first || req.ip || "unknown").trim().slice(0, 120);
}

function registrationAllowed(req: Request): boolean {
  const key = clientKey(req);
  const now = Date.now();
  const current = registrationWindows.get(key);
  if (!current || now - current.startedAt >= REGISTRATION_WINDOW_MS) {
    registrationWindows.set(key, { startedAt: now, count: 1 });
    return true;
  }
  if (current.count >= REGISTRATION_LIMIT) return false;
  current.count += 1;
  return true;
}

function cors(res: Response): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
}

function unauthorized(res: Response): void {
  cors(res);
  res.setHeader(
    "WWW-Authenticate",
    `Bearer realm="AQUAVO public catalog", resource="${RESOURCE}", scope="catalog:read"`,
  );
  res.status(401).json({
    error: "invalid_token",
    error_description: "Register an anonymous catalog agent through /agent/auth/register and use its Bearer token.",
  });
}

export function createAgentAuthRouter(): RouterType {
  const router = Router();

  router.options(["/agent/auth/register", "/api/agent/catalog"], (_req, res) => {
    cors(res);
    res.sendStatus(204);
  });

  router.post("/agent/auth/register", (req: Request, res: Response) => {
    cors(res);
    res.setHeader("Cache-Control", "no-store");

    if (!SECRET) {
      res.status(503).json({
        error: "temporarily_unavailable",
        error_description: "Agent catalog authentication is not configured.",
      });
      return;
    }

    const body = req.body ?? {};
    const type = String(body.type ?? "anonymous");
    const requestedCredentialType = String(body.requested_credential_type ?? "access_token");

    if (type !== "anonymous") {
      res.status(400).json({
        error: "unsupported_identity_type",
        identity_types_supported: ["anonymous"],
      });
      return;
    }
    if (requestedCredentialType !== "access_token") {
      res.status(400).json({
        error: "unsupported_credential_type",
        credential_types_supported: ["access_token"],
      });
      return;
    }
    if (!registrationAllowed(req)) {
      res.setHeader("Retry-After", "3600");
      res.status(429).json({ error: "rate_limited" });
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    const registrationId = `reg_${randomUUID().replace(/-/g, "")}`;
    const accessToken = sign({
      iss: SITE,
      aud: RESOURCE,
      sub: registrationId,
      scope: "catalog:read",
      iat: now,
      exp: now + TOKEN_TTL_SECONDS,
      jti: randomUUID(),
    });

    res.status(201).json({
      registration_id: registrationId,
      registration_type: "anonymous",
      credential_type: "access_token",
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: TOKEN_TTL_SECONDS,
      scope: "catalog:read",
      resource: RESOURCE,
      credential: {
        type: "access_token",
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: TOKEN_TTL_SECONDS,
        scope: "catalog:read",
      },
    });
  });

  router.get("/api/agent/catalog", async (req: Request, res: Response) => {
    cors(res);
    res.setHeader("Cache-Control", "private, no-store");

    const auth = String(req.headers.authorization ?? "");
    const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
    const payload = verify(token);
    if (!payload) {
      unauthorized(res);
      return;
    }

    const search = typeof req.query.search === "string" ? req.query.search.slice(0, 160) : undefined;
    const category = typeof req.query.category === "string" ? req.query.category.slice(0, 120) : undefined;
    const brand = typeof req.query.brand === "string" ? req.query.brand.slice(0, 120) : undefined;
    const requestedLimit = Number(req.query.limit ?? 20);
    const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(Math.floor(requestedLimit), 50)) : 20;

    try {
      const products = await storage.getProducts({ search, category, brand, limit });
      res.json({
        resource: RESOURCE,
        scope: payload.scope,
        products: toPublicProducts(products),
      });
    } catch (error) {
      console.error("Agent catalog read failed:", error);
      res.status(500).json({ error: "catalog_unavailable" });
    }
  });

  return router;
}
