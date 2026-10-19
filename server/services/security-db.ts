import type { SQL } from "drizzle-orm";
import { getDb } from "../db.js";
export interface SecurityExecutor { execute(query: SQL): Promise<unknown> }
export interface SecurityDatabase extends SecurityExecutor {
  transaction<T>(work: (tx: SecurityExecutor) => Promise<T>): Promise<T>;
}
export function securityDb(): SecurityDatabase {
  const db = getDb();
  if (!db) throw Object.assign(new Error("Security storage unavailable"), { status: 503 });
  return db;
}
export function rowsOf<T extends Record<string, unknown>>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  const rows = (result as { rows?: unknown } | null)?.rows;
  return Array.isArray(rows) ? rows as T[] : [];
}
