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

            const expiresAt = new Date(Date.now() + durationSeconds * 1000);

            // Upsert blocked IP
            await db.insert(blockedIPs)
                .values({
                    ipAddress,
                    reason: `تجاوز ${failedCount} محاولات دخول فاشلة - حظر ${durationSeconds < 60 ? durationSeconds + ' ثانية' : Math.floor(durationSeconds / 60) + ' دقيقة'}`,
                    failedAttempts: failedCount,
                    expiresAt,
                    isActive: true,
                })
                .onConflictDoUpdate({
                    target: blockedIPs.ipAddress,
                    set: {
                        failedAttempts: failedCount,
                        expiresAt,
                        isActive: true,
                        blockedAt: new Date(),
                    },
                });
        }
    }

    // Check if IP is blocked
    async isIPBlocked(ipAddress: string): Promise<boolean> {
        const db = this.ensureDb();

        const [blocked] = await db
            .select()
            .from(blockedIPs)
            .where(
                and(
                    eq(blockedIPs.ipAddress, ipAddress),
                    eq(blockedIPs.isActive, true)
                )
            )
            .limit(1);

        if (!blocked) return false;

        // Check if block has expired
        if (blocked.expiresAt && blocked.expiresAt < new Date()) {
            // Unblock expired IP
            await db.update(blockedIPs)
                .set({ isActive: false })
                .where(eq(blockedIPs.id, blocked.id));
            return false;
        }

        return true;
    }

    // Get all blocked IPs
    async getBlockedIPs(): Promise<BlockedIP[]> {
        const db = this.ensureDb();
        return await db
            .select()
            .from(blockedIPs)
            .where(eq(blockedIPs.isActive, true))
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

        // Blocked IPs count
        const [blockedResult] = await db
            .select({ count: count() })
            .from(blockedIPs)
            .where(eq(blockedIPs.isActive, true));

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
