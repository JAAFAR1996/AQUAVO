import express from "express";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import session from "express-session";
import helmet from "helmet";
import { createServer } from "http";
import type { IncomingMessage, ServerResponse } from "http";
import { registerRoutes } from "../server/routes.js";
import { buildSessionSecret, createSessionStore } from "../server/session-config.js";
import { corsConfig, sanitizeBody, securityHeaders } from "../server/middleware/security.js";

type RawBodyRequest = IncomingMessage & { rawBody?: Buffer };

async function buildApp() {
  console.log("🚀 Starting app initialization...");
  const app = express();
  const httpServer = createServer(app);

  // Trust proxy for Vercel/production deployments to correctly identify protocol (http vs https)
  app.set("trust proxy", 1);

  // Security: Helmet for comprehensive HTTP security headers
  app.use(helmet({
    contentSecurityPolicy: false, // Using custom CSP from securityHeaders middleware
    crossOriginEmbedderPolicy: false, // Allow embedding resources
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin resources
  }));

  // Security: Custom security headers with CSP
  app.use(securityHeaders);

  // Security: CORS configuration
  app.use(corsConfig);

  app.use(
    express.json({
      limit: '50mb',
      verify: (req: RawBodyRequest, _res: ServerResponse, buf: Buffer, _encoding: string) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Security: Request body sanitization (must be AFTER parsing)
  app.use(sanitizeBody);

  console.log("📦 Creating session store...");
  // Use persistent PostgreSQL session store in production
  const sessionStore = createSessionStore(process.env.NODE_ENV);
  console.log("✅ Session store created");

  app.use(
    session({
      store: sessionStore,
      secret: buildSessionSecret(),
      name: "sid", // Use generic cookie name for security
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        httpOnly: true, // Prevent JavaScript access (XSS protection)
        secure: process.env.NODE_ENV === "production", // HTTPS only in production
        sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax", // Strict in production for CSRF protection
        path: "/", // Cookie available for all paths
      },
    }),
  );
  console.log("✅ Session middleware configured");

  app.use((req: any, res: any, next: any) => {
    const start = Date.now();

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (req.path.startsWith("/api")) {
        let logLine = `${req.method} ${req.path} ${res.statusCode} in ${duration}ms`;
        console.log(logLine);
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
    if (!appPromise) {
      appPromise = buildApp();
    }
    const app = await appPromise;
    return (app as any)(req, res);
  } catch (error: any) {
    console.error("Handler error:", error);
    // Reset appPromise on error so next request tries again
    appPromise = null;
    res.status(500).json({
      message: "Server initialization error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
}

