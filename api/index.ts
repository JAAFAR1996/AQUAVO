import express from "express";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import session from "express-session";
import { createServer } from "http";
import type { IncomingMessage, ServerResponse } from "http";
import { registerRoutes } from "../server/routes.js";
import { buildSessionSecret, createSessionStore } from "../server/session-config.js";

type RawBodyRequest = IncomingMessage & { rawBody?: Buffer };

async function buildApp() {
  const app = express();
  const httpServer = createServer(app);

  app.use(
    express.json({
      verify: (req: RawBodyRequest, _res: ServerResponse, buf: Buffer, _encoding: string) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use(express.urlencoded({ extended: false }));

  // Use persistent PostgreSQL session store in production
  const sessionStore = createSessionStore(process.env.NODE_ENV);

  app.use(
    session({
      store: sessionStore,
      secret: buildSessionSecret(),
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
    }),
  );

  app.use((req, res, next) => {
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

  await registerRoutes(httpServer, app);
  return app;
}

let appPromise: Promise<express.Application> | null = null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!appPromise) {
    appPromise = buildApp();
  }
  const app = await appPromise;
  return (app as any)(req, res);
}
