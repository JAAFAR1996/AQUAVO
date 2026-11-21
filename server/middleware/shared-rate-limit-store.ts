import { createHash, randomInt } from "node:crypto";
import { and, eq, gt, inArray, lt, sql } from "drizzle-orm";
import type { Options, Store, IncrementResponse } from "express-rate-limit";
import { getDb } from "../db.js";
import { rateLimitBuckets } from "../../shared/schema.js";

/** Atomic PostgreSQL counters shared by all application workers. Raw IPs are
 * never persisted in this table. A DB failure fails the protected request closed.
 */
export class SharedRateLimitStore implements Store {
  readonly localKeys = false;
  readonly prefix: string;
  private windowMs = 60_000;

  constructor(namespace: string) {
    if (!/^[a-z0-9_-]{1,64}$/.test(namespace)) throw new Error("Invalid rate-limit namespace");
    this.prefix = namespace;
  }

  init(options: Options): void { this.windowMs = options.windowMs; }

  private bucketKey(key: string): string {
    return `${this.prefix}:${createHash("sha256").update(key).digest("hex")}`;
  }

  private db() {
    const db = getDb();
    if (!db) throw new Error("Rate-limit storage unavailable");
    return db;
  }

  async increment(key: string): Promise<IncrementResponse> {
    const db = this.db();
    const expiry = sql`now() + (${this.windowMs} * interval '1 millisecond')`;
    const [bucket] = await db.insert(rateLimitBuckets).values({
      key: this.bucketKey(key), hits: 1, expiresAt: expiry,
    }).onConflictDoUpdate({
      target: rateLimitBuckets.key,
      set: {
        hits: sql`CASE WHEN ${rateLimitBuckets.expiresAt} <= now() THEN 1 ELSE ${rateLimitBuckets.hits} + 1 END`,
        expiresAt: sql`CASE WHEN ${rateLimitBuckets.expiresAt} <= now() THEN ${expiry} ELSE ${rateLimitBuckets.expiresAt} END`,
      },
    }).returning({ totalHits: rateLimitBuckets.hits, resetTime: rateLimitBuckets.expiresAt });
    if (!bucket) throw new Error("Rate-limit counter update failed");
    // A probabilistic, bounded cleanup also runs across short-lived serverless
    // workers; a per-process counter might never reach its threshold there.
    if (randomInt(256) === 0) {
      try {
        const cutoff = new Date(Date.now() - 86_400_000);
        const expired = db.select({key:rateLimitBuckets.key}).from(rateLimitBuckets)
          .where(lt(rateLimitBuckets.expiresAt, cutoff)).limit(1000);
        // Recheck expiry on the locked row: an increment may renew the bucket
        // after the subquery's snapshot but before DELETE acquires its lock.
        await db.delete(rateLimitBuckets).where(and(
          inArray(rateLimitBuckets.key, expired), lt(rateLimitBuckets.expiresAt, cutoff),
        ));
      } catch { /* A housekeeping failure must not discard the consumed budget. */ }
    }
    return bucket;
  }

  async decrement(key: string): Promise<void> {
    await this.db().update(rateLimitBuckets).set({
      hits: sql`greatest(0, ${rateLimitBuckets.hits} - 1)`,
    }).where(and(eq(rateLimitBuckets.key, this.bucketKey(key)), gt(rateLimitBuckets.expiresAt, new Date())));
  }

  async resetKey(key: string): Promise<void> {
    await this.db().delete(rateLimitBuckets).where(eq(rateLimitBuckets.key, this.bucketKey(key)));
  }
}

export function createSharedRateLimitStore(namespace: string): SharedRateLimitStore {
  return new SharedRateLimitStore(namespace);
}
