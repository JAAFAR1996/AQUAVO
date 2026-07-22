import { drizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// ── Neon cold-start retry ────────────────────────────────────────────────────
// When Neon's serverless compute wakes from sleep it briefly returns:
//   "Our servers are experiencing high traffic right now, please try again"
// Instead of surfacing that to users we transparently retry with backoff.
const NEON_COLD_START_PHRASES = [
  'high traffic',
  'try again in a minute',
  'starting up',
  'connection refused',
  'ECONNREFUSED',
];

function isNeonColdStart(err: unknown): boolean {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  return NEON_COLD_START_PHRASES.some(phrase => msg.includes(phrase));
}

/**
 * Wraps any async DB operation with automatic retry on Neon cold-start errors.
 * Usage: const result = await withRetry(() => db.select()...)
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  { maxAttempts = 3, baseDelayMs = 1000 }: { maxAttempts?: number; baseDelayMs?: number } = {}
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isColdStart = isNeonColdStart(err);
      const isLastAttempt = attempt === maxAttempts;

      if (isColdStart && !isLastAttempt) {
        const delayMs = baseDelayMs * Math.pow(2, attempt - 1); // 1s → 2s → 4s
        console.warn(`[DB] Neon cold-start detected — retrying in ${delayMs}ms (attempt ${attempt}/${maxAttempts})`);
        await new Promise(r => setTimeout(r, delayMs));
        continue;
      }
      throw err;
    }
  }
  // TypeScript: unreachable, but satisfies return type
  throw new Error('withRetry: exhausted all attempts');
}
import * as schema from "../shared/schema.js";

type DbClient = NeonDatabase<typeof schema>;

const rawDbUrl = process.env.DATABASE_URL ?? "";
const databaseUrl = rawDbUrl.replace(/[&?]channel_binding=require/g, "") || undefined;
if (rawDbUrl) console.log("[DB] Connecting to configured database");
let db: DbClient | null = null;

if (!databaseUrl) {
  if (process.env.NODE_ENV !== "test") {
    console.warn("DATABASE_URL is not set. Falling back to in-memory mock storage.");
  }
} else {
  // Configures Neon to use the 'ws' package for WebSockets, needed in Node.js environments
  neonConfig.webSocketConstructor = ws;

  const pool = new Pool({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 10000,  // 10s connection timeout
    idleTimeoutMillis: 30000,        // 30s idle timeout (well under Neon's 5min auto-suspend)
    max: 5,                          // Limit pool size for serverless
  });

  // CRITICAL: Handle Pool-level errors to prevent process crash.
  // When Neon auto-suspends and terminates idle connections, the Pool emits
  // an 'error' event. Without this handler, Node.js treats it as an
  // uncaught exception and crashes with exit code 129 (SIGHUP).
  pool.on('error', (err: Error) => {
    if (err.message?.includes('terminating connection due to administrator command')) {
      console.warn('[DB] Neon terminated idle connection — pool will reconnect automatically');
      return;
    }
    console.error('[DB] Unexpected pool error:', err.message);
  });

  db = drizzle(pool, { schema });

  // Keep Neon serverless DB warm — Neon idles after ~5 min inactivity causing
  // 500ms-2s cold start penalty on the next request. Ping every 4 minutes.
  if (process.env.NODE_ENV !== "test") {
    setInterval(async () => {
      try {
        await pool.query("SELECT 1");
      } catch {
        // Silently ignore — Neon will reconnect on next real query
      }
    }, 4 * 60 * 1000);
  }
}

export function getDb(): DbClient | null {
  return db;
}

// Export db directly for services
export { db };
