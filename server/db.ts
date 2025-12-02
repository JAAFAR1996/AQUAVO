import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

type DbClient = NeonHttpDatabase<Record<string, unknown>>;

const databaseUrl = process.env.DATABASE_URL;
let db: DbClient | null = null;

if (!databaseUrl) {
  if (process.env.NODE_ENV !== "test") {
    console.warn("DATABASE_URL is not set. Falling back to in-memory mock storage.");
  }
} else {
  const neonClient = neon(databaseUrl);
  db = drizzle(neonClient);
}

export function getDb(): DbClient | null {
  return db;
}
