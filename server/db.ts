import { drizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import * as schema from "../shared/schema.js";

type DbClient = NeonDatabase<typeof schema>;

const databaseUrl = process.env.DATABASE_URL;
let db: DbClient | null = null;

if (!databaseUrl) {
  if (process.env.NODE_ENV !== "test") {
    console.warn("DATABASE_URL is not set. Falling back to in-memory mock storage.");
  }
} else {
  // Configures Neon to use the 'ws' package for WebSockets, needed in Node.js environments
  neonConfig.webSocketConstructor = ws;

  const pool = new Pool({ connectionString: databaseUrl });
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
