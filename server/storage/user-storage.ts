import { type User, type InsertUser, type InsertUserAddress, type UserAddress, users, userAddresses, passwordResetTokens, newsletterSubscriptions, type NewsletterSubscription, type InsertNewsletterSubscription } from "../../shared/schema.js";
import { eq, isNull, sql } from "drizzle-orm";
import { getDb } from "../db.js";

export class UserStorage {
    private db = getDb();

    private ensureDb() {
        if (!this.db) {
            throw new Error('Database not connected. Please configure DATABASE_URL in your .env file.');
        }
        return this.db;
    }

    async getUsers(): Promise<User[]> {
        const db = this.ensureDb();
        return await db.select().from(users).where(isNull(users.deletedAt));
    }

    async getUser(id: string): Promise<User | undefined> {
        const db = this.ensureDb();
        const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
        return result[0];
    }

    async getUserByEmail(email: string): Promise<User | undefined> {
        const db = this.ensureDb();
        const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
        return result[0];
    }

    async createUser(insertUser: InsertUser): Promise<User> {
        const db = this.ensureDb();
        const result = await db.insert(users).values({
            email: insertUser.email,
            passwordHash: insertUser.passwordHash,
            fullName: insertUser.fullName,
            role: insertUser.role || "user",
            phone: insertUser.phone,
        }).returning();
        return result[0];
    }

    async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
        const db = this.ensureDb();
        const result = await db.update(users).set({ ...updates, updatedAt: new Date() }).where(eq(users.id, id)).returning();
        return result[0];
    }

    // Address Methods
    async createUserAddress(address: InsertUserAddress): Promise<UserAddress> {
        const db = this.ensureDb();
        const result = await db.insert(userAddresses).values(address).returning();
        return result[0];
    }

    async getUserAddresses(userId: string): Promise<UserAddress[]> {
        const db = this.ensureDb();
        return await db.select().from(userAddresses).where(eq(userAddresses.userId, userId));
    }

    // Password Reset
    async createPasswordResetToken(userId: string, tokenHash: string, expiresAt: Date): Promise<string> {
        const db = this.ensureDb();
        // Invalidate existing tokens
        await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));

        await db.insert(passwordResetTokens).values({
            token: tokenHash,
            userId,
            expiresAt,
        });
        return tokenHash;
    }

    async verifyPasswordResetToken(tokenHash: string): Promise<{ userId: string; expiresAt: Date } | undefined> {
        const db = this.ensureDb();
        const result = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, tokenHash)).limit(1);
        return result[0];
    }

    async deletePasswordResetToken(tokenHash: string): Promise<void> {
        const db = this.ensureDb();
        await db.delete(passwordResetTokens).where(eq(passwordResetTokens.token, tokenHash));
    }

    // Newsletter Methods
    async getNewsletterSubscriptionByEmail(email: string): Promise<NewsletterSubscription | undefined> {
        const db = this.ensureDb();
        const result = await db.select().from(newsletterSubscriptions).where(eq(newsletterSubscriptions.email, email)).limit(1);
        return result[0];
    }

    async getNewsletterSubscriptions(): Promise<NewsletterSubscription[]> {
        const db = this.ensureDb();
        // Only active subscriptions
        return await db.select().from(newsletterSubscriptions).where(eq(newsletterSubscriptions.isActive, true));
    }

    async createNewsletterSubscription(subscription: InsertNewsletterSubscription): Promise<NewsletterSubscription> {
        const db = this.ensureDb();
        const result = await db.insert(newsletterSubscriptions).values(subscription).returning();
        return result[0];
    }

    async processPasswordReset(tokenHash: string, newPasswordHash: string): Promise<boolean> {
        const db = this.ensureDb();
        // Atomic operation: Delete token and update user in one go using CTE
        // This prevents race conditions where a token could be used multiple times
        const result = await db.execute(sql`
             WITH deleted_token AS (
                 DELETE FROM password_reset_tokens
                 WHERE token = ${tokenHash}
                 AND expires_at > NOW()
                 RETURNING user_id
             )
             UPDATE users
             SET password_hash = ${newPasswordHash}, updated_at = NOW()
             WHERE id = (SELECT user_id FROM deleted_token)
             RETURNING id
         `);
        // In neon-http, we might need to check rows array length instead of rowCount depending on version
        // But usually rows.length > 0 if RETURNING is used
        return result.rows.length > 0;
    }
}
