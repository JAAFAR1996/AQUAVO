import "../server/suppress.js";
import express, { Request, Response, NextFunction } from "express";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import session from "express-session";
import helmet from "helmet";
import { createServer } from "http";
import type { IncomingMessage, ServerResponse } from "http";
import { registerRoutes } from "../server/routes.js";
import { buildSessionSecret, createSessionStore } from "../server/session-config.js";
import { corsConfig, sanitizeBody, securityHeaders } from "../server/middleware/security.js";
import sitemapIndexHandler from "./sitemap-index.js";
import sitemapPagesHandler from "./sitemap-pages.js";
import sitemapProductsHandler from "./sitemap-products.js";
import sitemapGuidesHandler from "./sitemap-guides.js";

type RawBodyRequest = IncomingMessage & { rawBody?: Buffer };

const CSRF_SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function getRealRoute(req: Request): string {
  const raw =
    req.get("x-invoke-path") ||
    req.get("x-vercel-original-url") ||
    req.get("x-original-url") ||
    req.get("x-forwarded-uri") ||
    req.originalUrl ||
    req.path;
  try {
    const path = raw.startsWith("http://") || raw.startsWith("https://")
      ? new URL(raw).pathname
      : raw;
    const normalized = path.startsWith("/") ? path : `/${path}`;
    return normalized.split("?")[0] || "/";
  } catch {
    const normalized = raw.startsWith("/") ? raw : `/${raw}`;
    return normalized.split("?")[0] || "/";
  }
}

function getVercelRoute(req: VercelRequest): string {
  const firstHeader = (value: string | string[] | undefined): string | undefined =>
    Array.isArray(value) ? value[0] : value;
  const raw =
    firstHeader(req.headers["x-invoke-path"]) ||
    firstHeader(req.headers["x-vercel-original-url"]) ||
    firstHeader(req.headers["x-original-url"]) ||
    firstHeader(req.headers["x-forwarded-uri"]) ||
    req.url ||
    "/";
  try {
    const pathname = raw.startsWith("http://") || raw.startsWith("https://")
      ? new URL(raw).pathname
      : raw.split("?", 1)[0];
    return pathname.startsWith("/") ? pathname : `/${pathname}`;
  } catch {
    return "/";
  }
}

function getSourceOrigin(req: Request): string | undefined {
  const origin = req.get("origin");
  if (origin) return origin;

  return req.get("referer");
}

function getTargetHost(req: Request): string | undefined {
  return req.get("x-forwarded-host") || req.get("host");
}

function csrfOriginProtection(req: Request, res: Response, next: NextFunction) {
  if (CSRF_SAFE_METHODS.has(req.method)) {
    return next();
  }

  if (process.env.NODE_ENV !== "production") {
    return next();
  }

  const realRoute = getRealRoute(req);

  // OAuth 2.1 endpoints are server-to-server and use their own protections.
  if (realRoute.startsWith("/oauth")) {
    return next();
  }

  // MCP endpoints use Bearer token auth, not cookies.
  if (realRoute.startsWith("/api/mcp") || realRoute.startsWith("/mcp")) {
    return next();
  }

  // Meta sends WhatsApp webhooks server-to-server without a browser Origin.
  // This exact callback route authenticates POST bodies with X-Hub-Signature-256
  // and META_APP_SECRET, so browser-origin CSRF validation does not apply here.
  if (realRoute === "/api/webhooks/whatsapp" || realRoute === "/api/webhooks/whatsapp/") {
    return next();
  }

  const sourceOrigin = getSourceOrigin(req);
  const targetHost = getTargetHost(req);

  if (!sourceOrigin || !targetHost) {
    console.warn(`[Security] Blocked mutating request with missing origin: ${req.method} ${realRoute}`);
    return res.status(403).json({ message: "Forbidden" });
  }

  try {
    const sourceHost = new URL(sourceOrigin).host;
    if (sourceHost !== targetHost) {
      console.warn(`[Security] Blocked cross-origin mutating request: ${req.method} ${realRoute}`);
      return res.status(403).json({ message: "Forbidden" });
    }
  } catch {
    console.warn(`[Security] Blocked mutating request with invalid origin: ${req.method} ${realRoute}`);
    return res.status(403).json({ message: "Forbidden" });
  }

  return next();
}

async function buildApp() {
  console.log("🚀 Starting app initialization...");
  const app = express();
  const httpServer = createServer(app);

  app.set("trust proxy", 1);

  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }));

  app.use(securityHeaders);
  app.use(corsConfig);

  app.use(
    express.json({
      limit: "10mb",
      verify: (req: RawBodyRequest, _res: ServerResponse, buf: Buffer, _encoding: string) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use(express.urlencoded({ limit: "10mb", extended: true }));
  app.use(sanitizeBody);
  app.use(csrfOriginProtection);

  console.log("📦 Creating session store...");
  const sessionStore = createSessionStore(process.env.NODE_ENV);
  console.log("✅ Session store created");

  app.use(
    session({
      store: sessionStore,
      secret: buildSessionSecret(),
      name: "sid",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
        path: "/",
      },
    }),
  );
  console.log("✅ Session middleware configured");

  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (req.path.startsWith("/api")) {
        console.log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
      }
    });

    next();
  });

  console.log("📝 Registering routes...");
  await registerRoutes(httpServer, app);
  console.log("✅ All routes registered successfully");

  return app;
}

let appPromise: Promise<express.Application> | null = null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Vercel rewrites the public sitemap URLs to /api/index. Intercept them
    // before booting Express so the canonical generators remain lightweight,
    // deterministic, and independent from stale route-local constants.
    switch (getVercelRoute(req)) {
      case "/sitemap.xml":
        return sitemapIndexHandler(req, res);
      case "/sitemap-pages.xml":
        return sitemapPagesHandler(req, res);
      case "/sitemap-products.xml":
        return sitemapProductsHandler(req, res);
      case "/sitemap-guides.xml":
        return sitemapGuidesHandler(req, res);
      default:
        break;
    }

    if (!appPromise) {
      appPromise = buildApp();
    }
    const app = await appPromise;
    return (app as any)(req, res);
  } catch (error: any) {
    console.error("Handler error:", error);
    appPromise = null;
    res.status(500).json({
      message: "Server initialization error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}
