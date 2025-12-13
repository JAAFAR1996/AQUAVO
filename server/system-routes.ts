import type { Application } from "express";
import { storage } from "./storage/index.js";
import { getDb } from "./db.js";
import { sql } from "drizzle-orm";
// import { getSession } from "./utils/auth-helpers"; // Ensure this path is valid

export function registerSystemRoutes(app: Application) {

    // Seed Database Endpoint
    app.post("/api/system/seed", async (_req, res) => {
        try {
            console.log("Starting manual database seed...");
            await storage.seedProductsIfNeeded();
            await storage.seedFishSpeciesIfNeeded();
            res.json({ message: "Database seeded successfully" });
        } catch (error: any) {
            console.error("Seeding failed:", error);
            res.status(500).json({ message: "Seeding failed", error: error.message });
        }
    });

    // Fish Encyclopedia Endpoint (kept here as requested or moved to product? 
    // It was in the block I identified as 'system' kind of)
    // The user actually said "Move system routes". 
    // I will move Seed, Debug, and Health. Fish seems like Product domain.
    // I'll leave Fish in routes.ts or move it to a product router if one exists.
    // Let's stick to Seed, Health, Debug.

    app.get("/api/health", (_req, res) => {
        res.json({ status: "ok", timestamp: Date.now() });
    });

    // Debug endpoint to check session configuration
    app.get("/api/debug/session", (req: any, res) => {
        // We need getSession logic. 
        // If it's just req.session, let's use that.
        const sess = req.session;
        const hasSessionSecret = Boolean(process.env.SESSION_SECRET || process.env.JWT_SECRET);
        const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
        const cookieHeader = req.headers.cookie || "none";
        const hasConnectSid = cookieHeader.includes("connect.sid");

        res.json({
            environment: process.env.NODE_ENV || "development",
            sessionSecretConfigured: hasSessionSecret,
            databaseUrlConfigured: hasDatabaseUrl,
            cookieReceived: hasConnectSid,
            cookieHeader: hasConnectSid ? "present (hidden for security)" : "not present",
            sessionExists: Boolean(sess),
            sessionUserId: sess?.userId ? "present (hidden)" : "not set",
            timestamp: new Date().toISOString(),
        });
    });

    // Debug endpoint to check database schema status
    app.get("/api/debug/db-schema", async (_req, res) => {
        try {
            const db = getDb();
            if (!db) {
                return res.json({ status: "mock-storage", message: "Using in-memory storage (no DB)" });
            }

            // Check existing tables in information_schema
            const tablesResult = await db.execute(sql.raw(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `));

            const tableNames = tablesResult.rows.map((row: any) => row.table_name);

            res.json({
                timestamp: new Date().toISOString(),
                tables: tableNames,
                connection: 'connected'
            });
        } catch (err: any) {
            res.status(500).json({ error: err.message, stack: err.stack });
        }
    });
}
