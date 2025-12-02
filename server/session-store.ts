import { Store } from "express-session";
import { getDb } from "./db.js";
import { sessions } from "../shared/schema.js";
import { and, eq, gte, isNotNull, lt, sql } from "drizzle-orm";

/**
 * PostgreSQL session store using Drizzle ORM
 * Provides persistent session storage across server restarts
 */
export class DrizzleSessionStore extends Store {
  private db = getDb();
  private cleanupInterval?: NodeJS.Timeout;
  private lastCleanupCheck = 0;
  private readonly cleanupIntervalMs = 1000 * 60 * 60; // 1 hour

  constructor() {
    super();
    if (!this.db) {
      throw new Error("DATABASE_URL is required for persistent session storage");
    }
  }

  startCleanupTimer(intervalMs = this.cleanupIntervalMs) {
    if (this.cleanupInterval) return;
    this.cleanupInterval = setInterval(() => {
      this.cleanup().catch((error) =>
        console.error("Session cleanup failed:", error),
      );
    }, intervalMs);
  }

  stopCleanupTimer() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }

  private async maybeCleanup() {
    const now = Date.now();
    if (now - this.lastCleanupCheck < this.cleanupIntervalMs) return;
    this.lastCleanupCheck = now;
    await this.cleanup();
  }

  /**
   * Get session by ID
   */
  async get(sid: string, callback: (err: any, session?: any) => void): Promise<void> {
    try {
      await this.maybeCleanup();

      const result = await this.db!
        .select()
        .from(sessions)
        .where(eq(sessions.sid, sid))
        .limit(1);

      if (result.length === 0 || !result[0]) {
        return callback(null, null);
      }

      const session = result[0];

      // Check if expired
      const expireDate = session.expire ? new Date(session.expire) : null;

      if (!expireDate || Number.isNaN(expireDate.getTime())) {
        // Rehydrate invalid or missing expiry to avoid throwing
        await this.touch(sid, session.sess);
      } else if (expireDate < new Date()) {
        await this.destroy(sid);
        return callback(null, null);
      }

      callback(null, session.sess);
    } catch (error) {
      callback(error);
    }
  }

  /**
   * Save/update session
   */
  async set(sid: string, session: any, callback?: (err?: any) => void): Promise<void> {
    try {
      await this.maybeCleanup();

      const expire = this.getExpireDate(session);

      // Upsert session
      await this.db!
        .insert(sessions)
        .values({
          sid,
          sess: session,
          expire,
        })
        .onConflictDoUpdate({
          target: sessions.sid,
          set: {
            sess: session,
            expire,
          },
        });

      if (callback) callback(null);
    } catch (error) {
      if (callback) callback(error);
    }
  }

  /**
   * Destroy session
   */
  async destroy(sid: string, callback?: (err?: any) => void): Promise<void> {
    try {
      await this.db!.delete(sessions).where(eq(sessions.sid, sid));
      if (callback) callback(null);
    } catch (error) {
      if (callback) callback(error);
    }
  }

  /**
   * Get all sessions (optional)
   */
  async all(callback: (err: any, obj?: any) => void): Promise<void> {
    try {
      await this.maybeCleanup();
      const now = new Date();
      const result = await this.db!
        .select({
          sid: sessions.sid,
          sess: sessions.sess,
        })
        .from(sessions)
        .where(
          and(
            isNotNull(sessions.expire), // defensive; expire should be set
            gte(sessions.expire, now),
          ),
        )
        .limit(500);

      const allSessions = result.reduce((acc, { sid, sess }) => {
        acc[sid] = sess;
        return acc;
      }, {} as Record<string, any>);

      callback(null, allSessions);
    } catch (error) {
      callback(error);
    }
  }

  /**
   * Get session count (optional)
   */
  async length(callback: (err: any, length?: number) => void): Promise<void> {
    try {
      await this.maybeCleanup();
      const now = new Date();
      const result = await this.db!
        .select({ value: sql<number>`count(*)` })
        .from(sessions)
        .where(
          and(
            isNotNull(sessions.expire),
            gte(sessions.expire, now),
          ),
        );
      const count = Number(result[0]?.value ?? 0);
      callback(null, count);
    } catch (error) {
      callback(error);
    }
  }

  /**
   * Clear all sessions (optional)
   */
  async clear(callback?: (err?: any) => void): Promise<void> {
    try {
      await this.maybeCleanup();
      await this.db!.delete(sessions);
      if (callback) callback(null);
    } catch (error) {
      if (callback) callback(error);
    }
  }

  /**
   * Touch session to update expiration (optional)
   */
  async touch(sid: string, session: any, callback?: (err?: any) => void): Promise<void> {
    try {
      await this.maybeCleanup();
      const expire = this.getExpireDate(session);

      await this.db!
        .update(sessions)
        .set({ expire })
        .where(eq(sessions.sid, sid));

      if (callback) callback(null);
    } catch (error) {
      if (callback) callback(error);
    }
  }

  /**
   * Cleanup expired sessions
   */
  async cleanup(): Promise<void> {
    try {
      await this.db!
        .delete(sessions)
        .where(
          and(
            isNotNull(sessions.expire),
            lt(sessions.expire, new Date()),
          ),
        );
    } catch (error) {
      console.error("Failed to cleanup expired sessions:", error);
    }
  }

  /**
   * Calculate expiration date from session
   */
  private getExpireDate(session: any): Date {
    let expire = new Date();

    if (session.cookie && session.cookie.maxAge) {
      expire = new Date(Date.now() + session.cookie.maxAge);
    } else {
      // Default to 24 hours if not specified
      expire = new Date(Date.now() + 1000 * 60 * 60 * 24);
    }

    return expire;
  }
}
