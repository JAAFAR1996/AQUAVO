import {
    type LoginAttempt,
    type InsertLoginAttempt,
    type BlockedIP,
    loginAttempts,
    blockedIPs,
    users,
    products,
    orders
} from "../../shared/schema.js";
import { eq, and, sql, desc, gte, count } from "drizzle-orm";
import { getDb } from "../db.js";

// Constants
const MAX_FAILED_ATTEMPTS = 5; // عدد المحاولات الفاشلة قبل الحظر
const BLOCK_DURATION_MINUTES = 30; // مدة الحظر بالدقائق

export class SecurityStorage {
    private db = getDb();

    private ensureDb() {
        if (!this.db) {
            throw new Error('Database not connected.');
        }
        return this.db;
    }

    // ========================================
    // Login Attempts
    // ========================================

    // Record a login attempt
    async recordLoginAttempt(attempt: InsertLoginAttempt): Promise<LoginAttempt> {
        const db = this.ensureDb();

        const [record] = await db.insert(loginAttempts)
            .values(attempt)
            .returning();

        // Check if we need to block this IP
        if (!attempt.success && attempt.ipAddress) {
            await this.checkAndBlockIP(attempt.ipAddress);
        }

        return record;
    }

    // Get recent login attempts
    async getLoginAttempts(options: {
        limit?: number;
        offset?: number;
        successOnly?: boolean;
        email?: string;
    } = {}): Promise<{ attempts: LoginAttempt[]; total: number }> {
        const db = this.ensureDb();
        const { limit = 50, offset = 0, successOnly, email } = options;

        // Build where conditions
        const conditions = [];
        if (successOnly !== undefined) {
            conditions.push(eq(loginAttempts.success, successOnly));
        }
        if (email) {
            conditions.push(eq(loginAttempts.email, email));
        }

        const whereClause = conditions.length > 0
            ? and(...conditions)
            : undefined;

        // Get total count
        const [totalResult] = await db
            .select({ count: count() })
            .from(loginAttempts)
            .where(whereClause);

        // Get attempts
        const attempts = await db
            .select()
            .from(loginAttempts)
            .where(whereClause)
            .orderBy(desc(loginAttempts.createdAt))
            .limit(limit)
            .offset(offset);

        return {
            attempts,
            total: totalResult?.count || 0,
        };
    }

    // Get failed attempts for an IP in the last hour
    async getRecentFailedAttempts(ipAddress: string): Promise<number> {
        const db = this.ensureDb();
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

        const [result] = await db
            .select({ count: count() })
            .from(loginAttempts)
            .where(
                and(
                    eq(loginAttempts.ipAddress, ipAddress),
                    eq(loginAttempts.success, false),
                    gte(loginAttempts.createdAt, oneHourAgo)
                )
            );

        return result?.count || 0;
    }

    // ========================================
    // Blocked IPs
    // ========================================

    // Check and block IP if needed - Progressive lockout like Apple
    private async checkAndBlockIP(ipAddress: string): Promise<void> {
        const failedCount = await this.getRecentFailedAttempts(ipAddress);

        if (failedCount >= MAX_FAILED_ATTEMPTS) {
            const db = this.ensureDb();

            // Progressive lockout durations (in seconds) - like Apple
            // 3 attempts = 30s, 4 = 60s, 5 = 5min, 6 = 15min, 7+ = 30min
            const lockoutDurations = [
                0,      // 0 attempts - no lockout
                0,      // 1 attempt
                0,      // 2 attempts
                30,     // 3 attempts - 30 seconds
                60,     // 4 attempts - 1 minute
                300,    // 5 attempts - 5 minutes
                900,    // 6 attempts - 15 minutes
                1800,   // 7+ attempts - 30 minutes
            ];

            const durationSeconds = failedCount >= lockoutDurations.length
                ? lockoutDurations[lockoutDurations.length - 1]
                : lockoutDurations[failedCount];

            // F-8: the expiry instant is computed by the DATABASE clock
            // (now() + N seconds), never `new Date(Date.now() + …)`. A skewed
            // server clock must not be able to lengthen (or shorten) a block —
            // duration semantics belong to one authoritative clock, the DB's.
            const expiresAtSql = sql`now() + make_interval(secs => ${durationSeconds})`;

            // Upsert blocked IP
            await db.insert(blockedIPs)
                .values({
                    ipAddress,
                    reason: `تجاوز ${failedCount} محاولات دخول فاشلة - حظر ${durationSeconds < 60 ? durationSeconds + ' ثانية' : Math.floor(durationSeconds / 60) + ' دقيقة'}`,
                    failedAttempts: failedCount,
                    expiresAt: expiresAtSql,
                    isActive: true,
                })
                .onConflictDoUpdate({
                    target: blockedIPs.ipAddress,
                    set: {
                        failedAttempts: failedCount,
                        expiresAt: expiresAtSql,
                        isActive: true,
                        blockedAt: sql`now()`,
                    },
                });
        }
    }

    // ── Canonical "is this block still in force?" predicate ───────────────────
    // The SINGLE source of truth shared by the middleware read-path, getBlockInfo,
    // getBlockedIPs and the cleanup job. Evaluated by Postgres against now():
    //   • expires_at IS NULL  → PERMANENT block, always in force
    //   • expires_at > now()  → temporary block, still active
    //   • expires_at <= now() → expired, no longer in force
    // Using now() (DB clock) means no JS/server clock and no tz interpretation
    // can ever change the outcome.
    private stillBlockedPredicate() {
        return sql`(${blockedIPs.expiresAt} IS NULL OR ${blockedIPs.expiresAt} > now())`;
    }

    // Check if IP is blocked. The active/expired decision is made by Postgres
    // against now() — the app never compares timestamps on the JS clock.
    async isIPBlocked(ipAddress: string): Promise<boolean> {
        const db = this.ensureDb();

        const [blocked] = await db
            .select({ id: blockedIPs.id })
            .from(blockedIPs)
            .where(
                and(
                    eq(blockedIPs.ipAddress, ipAddress),
                    eq(blockedIPs.isActive, true),
                    this.stillBlockedPredicate()
                )
            )
            .limit(1);

        if (!blocked) {
            // Self-heal: flip any now-expired row for this IP to inactive so the
            // admin list and stats stay truthful. Same rule as the read above.
            await this.deactivateExpiredBlocks(ipAddress);
            return false;
        }

        return true;
    }

    // Get block info with expiry time for countdown timer. remainingSeconds is
    // computed in-DB (extract(epoch from expires_at - now())) so the countdown
    // reflects the same clock that decides the block, never the client's.
    async getBlockInfo(ipAddress: string): Promise<{ isBlocked: boolean; expiresAt: Date | null; remainingSeconds: number } | null> {
        const db = this.ensureDb();

        const [blocked] = await db
            .select({
                expiresAt: blockedIPs.expiresAt,
                remainingSeconds: sql<number>`GREATEST(0, CEIL(EXTRACT(EPOCH FROM (${blockedIPs.expiresAt} - now()))))::int`,
            })
            .from(blockedIPs)
            .where(
                and(
                    eq(blockedIPs.ipAddress, ipAddress),
                    eq(blockedIPs.isActive, true),
                    this.stillBlockedPredicate()
                )
            )
            .limit(1);

        if (!blocked) {
            await this.deactivateExpiredBlocks(ipAddress);
            return null;
        }

        return {
            isBlocked: true,
            expiresAt: blocked.expiresAt,
            // NULL expires_at (permanent) yields NULL from the extract → 0.
            remainingSeconds: blocked.remainingSeconds ?? 0,
        };
    }

    // Deactivate expired blocks. Applies the EXACT same rule the middleware uses
    // (expires_at <= now(); permanent NULL rows are never touched). Callable for
    // a single IP (self-heal) or, with no argument, as the periodic cleanup job.
    // Returns the number of rows lifted. PERMANENT blocks (expires_at IS NULL)
    // are excluded by construction — they can only be lifted by an explicit
    // unblockIP().
    async deactivateExpiredBlocks(ipAddress?: string): Promise<number> {
        const db = this.ensureDb();
        const conditions = [
            eq(blockedIPs.isActive, true),
            sql`${blockedIPs.expiresAt} IS NOT NULL`,
            sql`${blockedIPs.expiresAt} <= now()`,
        ];
        if (ipAddress) conditions.push(eq(blockedIPs.ipAddress, ipAddress));

        const lifted = await db.update(blockedIPs)
            .set({ isActive: false })
            .where(and(...conditions))
            .returning({ id: blockedIPs.id });

        return lifted.length;
    }

    // Get all blocked IPs currently in force (temporary-not-yet-expired OR
    // permanent). Expired-but-still-flagged rows are excluded by the predicate.
    async getBlockedIPs(): Promise<BlockedIP[]> {
        const db = this.ensureDb();
        return await db
            .select()
            .from(blockedIPs)
            .where(
                and(
                    eq(blockedIPs.isActive, true),
                    this.stillBlockedPredicate()
                )
            )
            .orderBy(desc(blockedIPs.blockedAt));
    }

    // Unblock an IP
    async unblockIP(ipAddress: string): Promise<void> {
        const db = this.ensureDb();
        await db.update(blockedIPs)
            .set({ isActive: false })
            .where(eq(blockedIPs.ipAddress, ipAddress));
    }

    // ========================================
    // Security Stats
    // ========================================

    async getSecurityStats(): Promise<{
        totalLoginAttempts: number;
        failedAttempts24h: number;
        successfulAttempts24h: number;
        blockedIPsCount: number;
        recentSuspiciousIPs: { ip: string; attempts: number }[];
    }> {
        const db = this.ensureDb();
        const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

        // Total attempts
        const [totalResult] = await db
            .select({ count: count() })
            .from(loginAttempts);

        // Failed attempts in last 24h
        const [failedResult] = await db
            .select({ count: count() })
            .from(loginAttempts)
            .where(
                and(
                    eq(loginAttempts.success, false),
                    gte(loginAttempts.createdAt, last24Hours)
                )
            );

        // Successful attempts in last 24h
        const [successResult] = await db
            .select({ count: count() })
            .from(loginAttempts)
            .where(
                and(
                    eq(loginAttempts.success, true),
                    gte(loginAttempts.createdAt, last24Hours)
                )
            );

        // Blocked IPs count — same in-force rule as getBlockedIPs so the number
        // and the list can never disagree (an expired row is not "blocked").
        const [blockedResult] = await db
            .select({ count: count() })
            .from(blockedIPs)
            .where(and(eq(blockedIPs.isActive, true), this.stillBlockedPredicate()));

        // Suspicious IPs (multiple failed attempts)
        const suspiciousIPs = await db
            .select({
                ip: loginAttempts.ipAddress,
                attempts: count(),
            })
            .from(loginAttempts)
            .where(
                and(
                    eq(loginAttempts.success, false),
                    gte(loginAttempts.createdAt, last24Hours)
                )
            )
            .groupBy(loginAttempts.ipAddress)
            .having(sql`count(*) >= 3`)
            .orderBy(desc(count()))
            .limit(10);

        return {
            totalLoginAttempts: totalResult?.count || 0,
            failedAttempts24h: failedResult?.count || 0,
            successfulAttempts24h: successResult?.count || 0,
            blockedIPsCount: blockedResult?.count || 0,
            recentSuspiciousIPs: suspiciousIPs.map(s => ({
                ip: s.ip || 'Unknown',
                attempts: s.attempts,
            })),
        };
    }

    // ========================================
    // Backup
    // ========================================

    async getBackupData(): Promise<{
        users: { id: string; email: string; fullName: string | null; createdAt: Date }[];
        products: { id: string; name: string; price: string; stock: number }[];
        orders: { id: string; orderNumber: string | null; total: string; status: string; createdAt: Date }[];
        exportedAt: string;
    }> {
        const db = this.ensureDb();

        // Get users (without passwords)
        const usersData = await db
            .select({
                id: users.id,
                email: users.email,
                fullName: users.fullName,
                createdAt: users.createdAt,
            })
            .from(users)
            .limit(1000);

        // Get products
        const productsData = await db
            .select({
                id: products.id,
                name: products.name,
                price: products.price,
                stock: products.stock,
            })
            .from(products)
            .limit(1000);

        // Get orders
        const ordersData = await db
            .select({
                id: orders.id,
                orderNumber: orders.orderNumber,
                total: orders.total,
                status: orders.status,
                createdAt: orders.createdAt,
            })
            .from(orders)
            .orderBy(desc(orders.createdAt))
            .limit(1000);

        return {
            users: usersData,
            products: productsData,
            orders: ordersData,
            exportedAt: new Date().toISOString(),
        };
    }
}
