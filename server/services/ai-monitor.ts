/**
 * AI Monitoring Service — مراقبة كل عمليات الذكاء الاصطناعي
 * Logs every AI event to the database for the admin dashboard
 */

import { getDb } from "../db.js";
import { aiMonitoringLogs, users } from "../../shared/schema.js";
import { desc, gte, eq, and, count, avg, sql } from "drizzle-orm";

export interface AiEvent {
    event: "chat" | "tool_call" | "error" | "timeout" | "fallback" | "key_rotated" |
           "search" | "sentiment" | "embedding" | "recommendation" | "cart_add" | "compound_search" |
           "blog_generated" | "notification_sent" | "prediction" | "churn_analysis" | "cron_job" |
           "visual_analysis" | "price_suggestion" | "fraud_check" | "email_campaign" |
           "aquarium_design" | "content_generated" | "dashboard_insights" |
           "inventory_optimization" | "returns_analysis" | "customer_analysis";
    level?: "info" | "warning" | "error" | "critical";
    model?: string;
    userId?: string;
    sessionId?: string;
    responseTimeMs?: number;
    success?: boolean;
    errorCode?: string;
    errorMessage?: string;
    tokenCount?: number;
    toolsUsed?: string[];
    productsFound?: number;
    fallbackUsed?: boolean;
    webSearchUsed?: boolean;
    messageLength?: number;
    details?: Record<string, any>;
}

class AiMonitorService {
    // In-memory buffer to avoid writing every tiny event to DB
    private buffer: AiEvent[] = [];
    private flushInterval: NodeJS.Timeout | null = null;
    private readonly BUFFER_SIZE = 20;
    private readonly FLUSH_INTERVAL_MS = 5000; // 5 seconds

    constructor() {
        // Auto-flush buffer every 5 seconds
        this.flushInterval = setInterval(() => {
            this.flush().catch(() => {});
        }, this.FLUSH_INTERVAL_MS);
    }

    /** Log an AI event — fire and forget, never throws */
    log(event: AiEvent): void {
        try {
            const normalized: AiEvent = {
                level: "info",
                success: true,
                ...event,
            };
            this.buffer.push(normalized);
            if (this.buffer.length >= this.BUFFER_SIZE) {
                this.flush().catch(() => {});
            }
        } catch {
            // Monitoring must NEVER crash the main app
        }
    }

    /** Log an error — always critical */
    logError(errorMessage: string, details?: Record<string, any>, context?: Partial<AiEvent>): void {
        this.log({
            event: "error",
            level: "error",
            success: false,
            errorMessage,
            details,
            ...context,
        });
    }

    /** Flush buffer to database */
    private async flush(): Promise<void> {
        if (this.buffer.length === 0) return;
        const db = getDb();
        if (!db) return;

        const toInsert = this.buffer.splice(0, this.buffer.length);
        try {
            await db.insert(aiMonitoringLogs).values(
                toInsert.map(e => ({
                    event: e.event,
                    level: e.level ?? "info",
                    model: e.model ?? null,
                    userId: e.userId ?? null,
                    sessionId: e.sessionId ?? null,
                    responseTimeMs: e.responseTimeMs ?? null,
                    success: e.success ?? true,
                    errorCode: e.errorCode ?? null,
                    errorMessage: e.errorMessage ?? null,
                    tokenCount: e.tokenCount ?? null,
                    toolsUsed: e.toolsUsed ?? null,
                    productsFound: e.productsFound ?? null,
                    fallbackUsed: e.fallbackUsed ?? false,
                    webSearchUsed: e.webSearchUsed ?? false,
                    messageLength: e.messageLength ?? null,
                    details: e.details ?? null,
                }))
            );
        } catch {
            // If DB write fails, drop events rather than crash
        }
    }

    /** Get stats for admin dashboard */
    async getStats(hoursBack: number = 24) {
        const db = getDb();
        if (!db) return null;

        const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

        const [totalRow] = await db
            .select({ total: count() })
            .from(aiMonitoringLogs)
            .where(gte(aiMonitoringLogs.timestamp, since));

        const [errorRow] = await db
            .select({ errors: count() })
            .from(aiMonitoringLogs)
            .where(and(
                gte(aiMonitoringLogs.timestamp, since),
                eq(aiMonitoringLogs.success, false)
            ));

        const [fallbackRow] = await db
            .select({ fallbacks: count() })
            .from(aiMonitoringLogs)
            .where(and(
                gte(aiMonitoringLogs.timestamp, since),
                eq(aiMonitoringLogs.fallbackUsed, true)
            ));

        const [avgRow] = await db
            .select({ avgMs: avg(aiMonitoringLogs.responseTimeMs) })
            .from(aiMonitoringLogs)
            .where(and(
                gte(aiMonitoringLogs.timestamp, since),
                eq(aiMonitoringLogs.event, "chat"),
                eq(aiMonitoringLogs.success, true)
            ));

        const [chatRow] = await db
            .select({ chats: count() })
            .from(aiMonitoringLogs)
            .where(and(
                gte(aiMonitoringLogs.timestamp, since),
                eq(aiMonitoringLogs.event, "chat")
            ));

        const [webSearchRow] = await db
            .select({ searches: count() })
            .from(aiMonitoringLogs)
            .where(and(
                gte(aiMonitoringLogs.timestamp, since),
                eq(aiMonitoringLogs.webSearchUsed, true)
            ));

        const total = Number(totalRow?.total ?? 0);
        const errors = Number(errorRow?.errors ?? 0);

        return {
            total,
            errors,
            errorRate: total > 0 ? Math.round((errors / total) * 100) : 0,
            fallbacks: Number(fallbackRow?.fallbacks ?? 0),
            avgResponseMs: Math.round(Number(avgRow?.avgMs ?? 0)),
            chatCount: Number(chatRow?.chats ?? 0),
            webSearchCount: Number(webSearchRow?.searches ?? 0),
            hoursBack,
        };
    }

    /** Get recent logs for admin table — includes user name via LEFT JOIN */
    async getLogs(limit: number = 100, level?: string) {
        const db = getDb();
        if (!db) return [];

        const conditions = level && level !== "all"
            ? eq(aiMonitoringLogs.level, level)
            : undefined;

        return db
            .select({
                id: aiMonitoringLogs.id,
                timestamp: aiMonitoringLogs.timestamp,
                event: aiMonitoringLogs.event,
                level: aiMonitoringLogs.level,
                model: aiMonitoringLogs.model,
                userId: aiMonitoringLogs.userId,
                sessionId: aiMonitoringLogs.sessionId,
                responseTimeMs: aiMonitoringLogs.responseTimeMs,
                success: aiMonitoringLogs.success,
                errorCode: aiMonitoringLogs.errorCode,
                errorMessage: aiMonitoringLogs.errorMessage,
                tokenCount: aiMonitoringLogs.tokenCount,
                toolsUsed: aiMonitoringLogs.toolsUsed,
                productsFound: aiMonitoringLogs.productsFound,
                fallbackUsed: aiMonitoringLogs.fallbackUsed,
                webSearchUsed: aiMonitoringLogs.webSearchUsed,
                messageLength: aiMonitoringLogs.messageLength,
                details: aiMonitoringLogs.details,
                // User info from JOIN
                userFullName: users.fullName,
                userEmail: users.email,
                userPhone: users.phone,
            })
            .from(aiMonitoringLogs)
            .leftJoin(users, eq(aiMonitoringLogs.userId, users.id))
            .where(conditions)
            .orderBy(desc(aiMonitoringLogs.timestamp))
            .limit(limit);
    }

    /** Get recent errors */
    async getErrors(limit: number = 50) {
        const db = getDb();
        if (!db) return [];

        return db
            .select()
            .from(aiMonitoringLogs)
            .where(eq(aiMonitoringLogs.success, false))
            .orderBy(desc(aiMonitoringLogs.timestamp))
            .limit(limit);
    }

    /** Get hourly breakdown for chart */
    async getHourlyChart(hoursBack: number = 24) {
        const db = getDb();
        if (!db) return [];

        const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

        const rows = await db
            .select({
                hour: sql<string>`date_trunc('hour', ${aiMonitoringLogs.timestamp})`,
                total: count(),
                errors: sql<number>`sum(case when ${aiMonitoringLogs.success} = false then 1 else 0 end)`,
            })
            .from(aiMonitoringLogs)
            .where(gte(aiMonitoringLogs.timestamp, since))
            .groupBy(sql`date_trunc('hour', ${aiMonitoringLogs.timestamp})`)
            .orderBy(sql`date_trunc('hour', ${aiMonitoringLogs.timestamp})`);

        return rows;
    }

    /** Get per-feature breakdown (all event types, last N hours) */
    async getFeatureBreakdown(hoursBack: number = 168) {
        const db = getDb();
        if (!db) return [];

        const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

        return db
            .select({
                event: aiMonitoringLogs.event,
                total: count(),
                errors: sql<number>`sum(case when ${aiMonitoringLogs.success} = false then 1 else 0 end)`,
                avgMs: avg(aiMonitoringLogs.responseTimeMs),
                lastRun: sql<string>`max(${aiMonitoringLogs.timestamp})`,
            })
            .from(aiMonitoringLogs)
            .where(gte(aiMonitoringLogs.timestamp, since))
            .groupBy(aiMonitoringLogs.event)
            .orderBy(desc(count()));
    }

    /** Get cron job history */
    async getCronJobHistory(limit: number = 30) {
        const db = getDb();
        if (!db) return [];

        return db
            .select()
            .from(aiMonitoringLogs)
            .where(eq(aiMonitoringLogs.event, "cron_job"))
            .orderBy(desc(aiMonitoringLogs.timestamp))
            .limit(limit);
    }

    /** Get model usage breakdown */
    async getModelUsage(hoursBack: number = 24) {
        const db = getDb();
        if (!db) return [];

        const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

        return db
            .select({
                model: aiMonitoringLogs.model,
                total: count(),
                errors: sql<number>`sum(case when ${aiMonitoringLogs.success} = false then 1 else 0 end)`,
                avgMs: avg(aiMonitoringLogs.responseTimeMs),
            })
            .from(aiMonitoringLogs)
            .where(and(
                gte(aiMonitoringLogs.timestamp, since),
                eq(aiMonitoringLogs.event, "chat"),
            ))
            .groupBy(aiMonitoringLogs.model)
            .orderBy(desc(count()));
    }
}

export const aiMonitor = new AiMonitorService();
