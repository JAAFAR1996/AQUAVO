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
import { getDb } from "../server/db.js";
import { sql } from "drizzle-orm";

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
      limit: '10mb',
      verify: (req: RawBodyRequest, _res: ServerResponse, buf: Buffer, _encoding: string) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use(express.urlencoded({ limit: '10mb', extended: true }));

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

  app.use((req: Request, res: Response, next: NextFunction) => {
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

  const db = getDb();
  if (db) {
    // One-time: rename yff-049 to remove banned "نباتات مائية" (CLAUDE.md §CRITICAL rules)
    // Idempotent — only fires when the old name is still in the DB.
    db.execute(sql`
      UPDATE products
      SET name = 'تربة حوض مخصّبة — تغذية بيولوجية'
      WHERE slug = 'yff-049'
        AND name LIKE '%نباتات%'
    `).then(() => console.log("[Migration] yff-049 name fix: applied (no-op if already clean)"))
      .catch(err => console.warn("[Migration] yff-049 name fix failed:", err.message));

    // Smart Finance Center: create expenses table if it doesn't exist yet.
    // Safe to re-run — IF NOT EXISTS makes it idempotent.
    db.execute(sql`
      CREATE TABLE IF NOT EXISTS expenses (
        id          TEXT        PRIMARY KEY DEFAULT gen_random_uuid(),
        category    TEXT        NOT NULL,
        amount      NUMERIC     NOT NULL,
        description TEXT,
        expense_date TIMESTAMP  NOT NULL,
        is_recurring BOOLEAN    NOT NULL DEFAULT FALSE,
        recurring_period TEXT,
        created_at  TIMESTAMP   NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMP   NOT NULL DEFAULT NOW()
      )
    `).then(() =>
      db.execute(sql`
        CREATE INDEX IF NOT EXISTS expenses_category_idx     ON expenses (category);
        CREATE INDEX IF NOT EXISTS expenses_expense_date_idx ON expenses (expense_date);
      `)
    ).then(() => console.log("[Migration] expenses table: ready"))
      .catch(err => console.warn("[Migration] expenses table creation failed:", err.message));

    // Effective-date accounting: add audit columns to product_cost_history.
    // Safe to re-run — ADD COLUMN IF NOT EXISTS is idempotent.
    db.execute(sql`
      ALTER TABLE product_cost_history
        ADD COLUMN IF NOT EXISTS note        TEXT,
        ADD COLUMN IF NOT EXISTS changed_by  TEXT
    `).then(() => console.log("[Migration] product_cost_history: note+changed_by ready"))
      .catch(err => console.warn("[Migration] product_cost_history columns:", err.message));

    // Finance Returns: create order_return_events table if it doesn't exist yet.
    // Safe to re-run — IF NOT EXISTS makes it idempotent.
    db.execute(sql`
      CREATE TABLE IF NOT EXISTS order_return_events (
        id                      TEXT        PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id                TEXT        NOT NULL REFERENCES orders(id),
        type                    TEXT        NOT NULL,
        reason                  TEXT,
        refund_amount           NUMERIC     NOT NULL DEFAULT 0,
        delivery_cost_loss      NUMERIC     NOT NULL DEFAULT 0,
        return_shipping_cost    NUMERIC     NOT NULL DEFAULT 0,
        packaging_loss          NUMERIC     NOT NULL DEFAULT 0,
        product_write_off_amount NUMERIC    NOT NULL DEFAULT 0,
        cogs_loss               NUMERIC     NOT NULL DEFAULT 0,
        restocked               BOOLEAN     NOT NULL DEFAULT FALSE,
        restocked_at            TIMESTAMP,
        affected_items          JSONB,
        status                  TEXT        NOT NULL DEFAULT 'recorded',
        note                    TEXT,
        created_by              TEXT        REFERENCES users(id),
        created_at              TIMESTAMP   NOT NULL DEFAULT NOW(),
        updated_at              TIMESTAMP   NOT NULL DEFAULT NOW()
      )
    `).then(() =>
      db.execute(sql`
        CREATE INDEX IF NOT EXISTS order_return_events_order_idx      ON order_return_events (order_id);
        CREATE INDEX IF NOT EXISTS order_return_events_type_idx       ON order_return_events (type);
        CREATE INDEX IF NOT EXISTS order_return_events_status_idx     ON order_return_events (status);
        CREATE INDEX IF NOT EXISTS order_return_events_created_at_idx ON order_return_events (created_at);
      `)
    ).then(() => console.log("[Migration] order_return_events table: ready"))
      .catch(err => console.warn("[Migration] order_return_events table creation failed:", err.message));
  }

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

