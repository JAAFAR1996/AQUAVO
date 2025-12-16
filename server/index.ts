import dotenv from 'dotenv';
// Load .env.local first (if it exists), then .env
dotenv.config({ path: '.env.local' });
dotenv.config();
import http from "http";
import express from "express";
import session from "express-session";
import helmet from "helmet";
import { registerRoutes } from "./routes.js";
import { serveStatic } from "./static.js";
import { createSessionStore, buildSessionSecret } from "./session-config.js";
import { corsConfig, sanitizeBody, securityLogger } from "./middleware/security.js";
import { verifyEmailConnection } from "./utils/email.js";
import { getDb } from "./db.js";
import { sql } from "drizzle-orm";

// Global error handlers to prevent silent crashes
process.on('uncaughtException', (error) => {
  console.error('[FATAL] Uncaught Exception:', error);
  // Give time for logs to flush
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
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

// Trust proxy for Vercel/production deployments
// Required for secure cookies to work behind a reverse proxy
// Trust proxy for Vercel/production/dev tunnels
// Required for secure cookies to work behind a reverse proxy
app.set("trust proxy", 1);

// Security: Helmet for comprehensive HTTP security headers
app.use(helmet({
  contentSecurityPolicy: false, // Using custom CSP if needed
  crossOriginEmbedderPolicy: false, // Allow embedding resources
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin resources
}));

// Security: CORS configuration
// Security: CORS configuration
app.use(corsConfig);

app.use(
  express.json({
    limit: '20mb', // Increase limit for base64 images - set to 20mb to be safe
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Security: Request body sanitization (must be AFTER parsing)
app.use(sanitizeBody);

// Security: Log suspicious activity
app.use(securityLogger);

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
    res.status(503).json({ status: "error", message: error.message });
  }
});

// Security: CSRF Protection (Strict Origin Validation)
app.use((req, res, next) => {
  // Skip for non-state-changing methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

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
});

// Session configuration
const sessionStore = createSessionStore(process.env.NODE_ENV, { enableCleanupTimer: true });

// Log session store type
if (process.env.NODE_ENV === "production" && process.env.DATABASE_URL) {
  console.log("Using PostgreSQL session store for persistence");
} else {
  console.log("Using in-memory session store (development mode)");
}

app.use(
  session({
    store: sessionStore,
    secret: buildSessionSecret(),
    resave: false,
    saveUninitialized: false,
    rolling: true, // Extend session on every request
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      path: "/", // Explicit path for all routes
      sameSite: "lax", // "lax" is preferred for same-origin (frontend served by backend)
      secure: process.env.NODE_ENV === "production", // Only send over HTTPS in production
      httpOnly: true, // Cookie not accessible via JavaScript (security)
    },
  }),
);

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

app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
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
        const size = JSON.stringify(capturedJsonResponse).length;
        const totalKeys =
          typeof capturedJsonResponse === "object" && capturedJsonResponse !== null
            ? Object.keys(capturedJsonResponse).length
            : keys.length;
        logLine += ` :: bodyKeys=${keys.join(",") || "none"}${totalKeys > keys.length ? "+" : ""} size=${size}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const httpError = err as HttpError;
    const status =
      typeof httpError.status === "number"
        ? httpError.status
        : typeof httpError.statusCode === "number"
          ? httpError.statusCode
          : 500;
    const message =
      httpError.expose === true
        ? httpError.message
        : httpError.message || "Internal Server Error";

    // Log error with context
    const errorContext = {
      error: httpError.message,
      stack: process.env.NODE_ENV === "development" ? httpError.stack : undefined,
      method: req.method,
      path: req.path,
      statusCode: status,
      userAgent: req.get("user-agent"),
      ip: req.ip,
    };

    log(JSON.stringify(errorContext), "error-handler", "error");
    res.status(status).json({ message });
  });

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

  httpServer.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();
