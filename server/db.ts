import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "../shared/schema.js";

type DbClient = NeonHttpDatabase<typeof schema>;

const databaseUrl = process.env.DATABASE_URL;
let db: DbClient | null = null;

if (!databaseUrl) {
  if (process.env.NODE_ENV !== "test") {
    console.warn("DATABASE_URL is not set. Falling back to in-memory mock storage.");
  }
} else {
  const neonClient = neon(databaseUrl);
  db = drizzle(neonClient, { schema });
}

export function getDb(): DbClient | null {
  return db;
}
