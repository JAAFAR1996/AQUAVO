import { drizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import * as coreSchema from "../shared/schema.js";
import * as operationsSchema from "../shared/operations-schema.js";

const NEON_COLD_START_PHRASES = [
  "high traffic",
  "try again in a minute",
  "starting up",
  "connection refused",
  "ECONNREFUSED",
];

function isNeonColdStart(err: unknown): boolean {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  return NEON_COLD_START_PHRASES.some((phrase) => msg.includes(phrase));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  { maxAttempts = 3, baseDelayMs = 1000 }: { maxAttempts?: number; baseDelayMs?: number } = {},
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isColdStart = isNeonColdStart(err);
      const isLastAttempt = attempt === maxAttempts;

      if (isColdStart && !isLastAttempt) {
        const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
        console.warn(
          `[DB] Neon cold-start detected — retrying in ${delayMs}ms (attempt ${attempt}/${maxAttempts})`,
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
      throw err;
    }
  }

  throw new Error("withRetry: exhausted all attempts");
}

export const appSchema = {
  ...coreSchema,
  ...operationsSchema,
};

type DbClient = NeonDatabase<typeof appSchema>;

const rawDbUrl = process.env.DATABASE_URL ?? "";
const databaseUrl = rawDbUrl.replace(/[&?]channel_binding=require/g, "") || undefined;
if (rawDbUrl) console.log("[DB] Connecting to configured database");

let db: DbClient | null = null;

if (!databaseUrl) {
  if (process.env.NODE_ENV !== "test") {
    console.warn("DATABASE_URL is not set. Falling back to in-memory mock storage.");
  }
} else {
  neonConfig.webSocketConstructor = ws;

  const pool = new Pool({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 5,
  });

  pool.on("error", (err) => {
    if (err.message?.includes("terminating connection due to administrator command")) {
      console.warn("[DB] Neon terminated idle connection — pool will reconnect automatically");
      return;
    }
    console.error("[DB] Unexpected pool error:", err.message);
  });

  db = drizzle(pool, { schema: appSchema });

  if (process.env.NODE_ENV !== "test") {
    setInterval(async () => {
      try {
        await pool.query("SELECT 1");
      } catch {
        // The pool reconnects on the next real request.
      }
    }, 4 * 60 * 1000);
  }
}

export function getDb(): DbClient | null {
  return db;
}

export { db };
