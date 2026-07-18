import "./suppress.js";
import "./env.js";

import * as Sentry from "@sentry/node";

// Initialize Sentry before any Express setup so instrumentation is complete
Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  environment: process.env.NODE_ENV ?? "development",
  // 10% of transactions sampled — enough for production insight without volume cost
  tracesSampleRate: 0.1,
  beforeSend(event, hint) {
    const err = hint?.originalException;
    const msg = err instanceof Error ? err.message : String(err ?? "");
    // Suppress expected Neon idle-connection noise so it doesn't pollute Sentry
    if (msg.includes("terminating connection due to administrator command")) {
      return null;
    }
    // Never forward raw DB connection strings or secrets in extra context
    if (event.extra) {
      delete (event.extra as Record<string, unknown>)["DATABASE_URL"];
    }
    return event;
  },
});

import dotenv from 'dotenv';
import http from "http";
import express, { Request, Response, NextFunction } from "express";
import session from "express-session";
import helmet from "helmet";
import compression from "compression";
import { registerRoutes } from "./routes.js";
import { serveStatic } from "./static.js";
import { createSessionStore, buildSessionSecret } from "./session-config.js";
import { corsConfig, sanitizeBody, securityLogger, securityHeaders } from "./middleware/security.js";
import { errorHandler } from "./middleware/error-handler.js";
import { verifyEmailConnection } from "./utils/email.js";
import { getDb } from "./db.js";
import { sql } from "drizzle-orm";
import { initializeScheduledJobs } from "./cron/scheduled-jobs.js";

// Global error handlers to prevent silent crashes
process.on('uncaughtException', (error) => {
  console.error('[FATAL] Uncaught Exception:', error);

  // Ignore Neon idle connection timeout errors which are thrown globally by the driver
  if (error instanceof Error && error.message.includes('terminating connection due to administrator command')) {
    console.warn('[WARN] Ignoring Neon WebSocket connection termination');
    return;
  }

  Sentry.captureException(error, { tags: { type: "uncaughtException" } });
  // Give time for Sentry flush + logs
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled Rejection:', reason);
  Sentry.captureException(reason instanceof Error ? reason : new Error(String(reason)), {
    tags: { type: "unhandledRejection" },
  });
  // Don't exit immediately - just log
});

// Extend express Request type for rawBody
declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}

const app = express();
const httpServer = http.createServer(app);

// Initialize WebSocket Server
import { setupWebSocket } from "./ws-server.js";
setupWebSocket(httpServer);

// Trust proxy for Vercel/production deployments
// Required for secure cookies to work behind a reverse proxy
// Trust proxy for Vercel/production/dev tunnels
// Required for secure cookies to work behind a reverse proxy
app.set("trust proxy", 1);

// Performance: Gzip/Brotli compression for all responses
app.use(compression({
  level: 6,
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    // Don't compress server-sent events
    if (req.headers['accept'] === 'text/event-stream') return false;
    return compression.filter(req, res);
  },
}));

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

// Performance: Only apply body parsing, sanitization, and security logging to API routes
// Static file requests skip these entirely to avoid unnecessary overhead
const getRealRoute = (req: Request) => req.headers['x-invoke-path']?.toString() || req.originalUrl || req.path;

const apiOnly = (fn: any) => (req: Request, res: Response, next: NextFunction) => {
  const realRoute = getRealRoute(req);
  // Exclude oauth from apiOnly because Vercel rewrites both to /api/index
  if (!realRoute.startsWith("/api") || realRoute.startsWith("/oauth")) return next();
  return fn(req, res, next);
};

app.use(apiOnly(
  express.json({
    limit: '5mb',
    verify: (req: any, _res: any, buf: Buffer) => {
      req.rawBody = buf;
    },
  }),
));

app.use(apiOnly(express.urlencoded({ extended: true, limit: '5mb' })));

// OAuth 2.1 endpoints need their own body parsing (not under /api/)
const oauthOnly = (fn: any) => (req: Request, res: Response, next: NextFunction) => {
  const realRoute = getRealRoute(req);
  if (!realRoute.startsWith("/oauth")) return next();
  return fn(req, res, next);
};
app.use(oauthOnly(express.json({ limit: '1mb' })));
app.use(oauthOnly(express.urlencoded({ extended: false, limit: '1mb' })));

// Security: Request body sanitization (must be AFTER parsing)
app.use(apiOnly(sanitizeBody));

// Security: Log suspicious activity
app.use(apiOnly(securityLogger));

// Health check endpoint - BEFORE session middleware
// This allows the hosting platform to verify the app is running without hitting the database
app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    port: process.env.PORT || "5000",
    env: process.env.NODE_ENV || "development",
    dbConfigured: !!process.env.DATABASE_URL,
  });
});

// Database health check
app.get("/health/db", async (_req, res) => {
  try {
    const db = getDb();
    if (!db) {
      return res.status(503).json({ status: "error", message: "Database not configured" });
    }
    // Simple query to test connection with timeout
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Database timeout after 5s")), 5000)
    );
    const queryPromise = db.execute(sql`SELECT 1 as test`);
    await Promise.race([queryPromise, timeoutPromise]);
    res.status(200).json({ status: "ok", database: "connected" });
  } catch (error: any) {
    console.error("Database health check failed:", error.message);
    res.status(503).json({
      status: "error",
      message: process.env.NODE_ENV === "production" ? "Database health check failed" : error.message,
    });
  }
});

// Security: CSRF Protection (Strict Origin Validation) - API only
app.use(apiOnly((req: Request, res: Response, next: NextFunction) => {
  // Skip for non-state-changing methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const pathToCheck = req.headers['x-invoke-path']?.toString() || req.originalUrl || req.path;

  // Skip for MCP endpoint — uses Bearer token auth (OAuth JWT or static token), not cookies
  if (pathToCheck.startsWith("/api/mcp") || pathToCheck.startsWith("/mcp")) return next();

  // Skip for OAuth 2.1 endpoints — these are server-to-server calls (RFC 7591 DCR,
  // RFC 6749 token endpoint) that have no browser Origin header by design.
  // Security is enforced via PKCE + admin password on the consent screen.
  if (pathToCheck.startsWith("/oauth")) return next();

  // Skip for webhooks if any (e.g. Stripe) - add check here if needed

  const origin = req.headers.origin || req.headers.referer;

  // In production, enforce strict origin check
  if (process.env.NODE_ENV === 'production') {
    if (!origin) {
      // Log warning but maybe block? For now block to address "Missing CSRF Protection"
      log(`Blocked request with no Origin/Referer: ${req.method} ${req.path}`, 'security', 'warn');
      return res.status(403).json({ message: "Forbidden - Missing Origin/Referer" });
    }

    const host = req.headers.host;
    try {
      const originHost = new URL(origin).host;
      // Allow request if origin matches host (Same Origin)
      if (originHost !== host) {
        // Check allowlist for expected external origins (if any)
        // If not matched, block
        log(`Blocked CSRF attempt: Origin ${originHost} does not match Host ${host}`, 'security', 'warn');
        return res.status(403).json({ message: "Forbidden - Cross Origin Request Blocked" });
      }
    } catch (e) {
      return res.status(403).json({ message: "Forbidden - Invalid Origin" });
    }
  }

  next();
}));

// Session configuration
const sessionStore = createSessionStore(process.env.NODE_ENV, { enableCleanupTimer: true });

// Log session store type
if (process.env.NODE_ENV === "production" && process.env.DATABASE_URL) {
  console.log("Using PostgreSQL session store for persistence");
} else {
  console.log("Using in-memory session store (development mode)");
}

const sessionMiddleware = session({
  store: sessionStore,
  secret: buildSessionSecret(),
  resave: false,
  saveUninitialized: false,
  rolling: false, // Don't rewrite session cookie on every request
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    path: "/", // Explicit path for all routes
    sameSite: "lax", // "lax" is preferred for same-origin (frontend served by backend)
    secure: process.env.NODE_ENV === "production", // Only send over HTTPS in production
    httpOnly: true, // Cookie not accessible via JavaScript (security)
  },
});
// Only run session for API routes (static files don't need DB session lookup)
app.use(apiOnly(sessionMiddleware));

type LogLevel = "info" | "warn" | "error" | "debug";

interface HttpError extends Error {
  status?: number;
  statusCode?: number;
  expose?: boolean;
}

export function log(message: string, source = "express", level: LogLevel = "info") {
  const formattedTime = new Date().toISOString();
  const logMessage = JSON.stringify({
    timestamp: formattedTime,
    level,
    source,
    message,
    env: process.env.NODE_ENV,
  });

  // In production, use structured logging
  if (process.env.NODE_ENV === "production") {
    switch (level) {
      case "error":
        console.error(String(logMessage).replace(/\n|\r/g, ""));
        break;
      case "warn":
        console.warn(String(logMessage).replace(/\n|\r/g, ""));
        break;
      default:
        console.log(String(logMessage).replace(/\n|\r/g, ""));
    }
  } else {
    // In development, use readable format
    const time = new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
    console.log(`${time} [${level.toUpperCase()}] [${source}] ${message}`);
  }
}

app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json.bind(res);
  res.json = function (bodyJson: any) {
    capturedJsonResponse = bodyJson;
    return originalResJson(bodyJson);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        const keys =
          typeof capturedJsonResponse === "object" && capturedJsonResponse !== null
            ? Object.keys(capturedJsonResponse).slice(0, 5)
            : [];
        const totalKeys =
          typeof capturedJsonResponse === "object" && capturedJsonResponse !== null
            ? Object.keys(capturedJsonResponse).length
            : keys.length;
        logLine += ` :: bodyKeys=${keys.join(",") || "none"}${totalKeys > keys.length ? "+" : ""}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  // Sentry Express error handler must come BEFORE the custom error handler
  // so it can capture unhandled exceptions thrown inside route handlers
  Sentry.setupExpressErrorHandler(app);

  // Use professional error handler from middleware
  app.use(errorHandler);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);

  // Verify Email Connection on Startup
  verifyEmailConnection().catch(err => console.error("Email verification error:", err));

  // Initialize Scheduled Jobs (Cron)
  if (process.env.DISABLE_SCHEDULED_JOBS === "true") {
    console.log("Scheduled jobs disabled by DISABLE_SCHEDULED_JOBS");
  } else {
    initializeScheduledJobs();
  }

  httpServer.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();
