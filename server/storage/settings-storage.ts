import { eq, sql } from "drizzle-orm";
import { getDb } from "../db.js";
import { settings, type Setting } from "../../shared/schema.js";

export class SettingsStorage {
    private db = getDb();

    private ensureDb() {
        if (!this.db) {
            const error = new Error('Database service unavailable. Please try again later.');
            (error as any).status = 503;
            throw error;
        }
        return this.db;
    }

    /**
     * Get all settings as a key-value object
     */
    async getAllSettings(): Promise<Record<string, string>> {
        const db = this.ensureDb();
        const allSettings = await db.select().from(settings);

        const result: Record<string, string> = {};
        for (const setting of allSettings) {
            result[setting.key] = setting.value;
        }
        return result;
    }

    /**
     * Get a single setting by key
     */
    async getSetting(key: string): Promise<string | null> {
        const db = this.ensureDb();
        const result = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
        return result[0]?.value ?? null;
    }

    /**
     * Update a single setting
     */
    async updateSetting(key: string, value: string): Promise<void> {
        const db = this.ensureDb();
        await db.insert(settings)
            .values({ key, value } as any)
            .onConflictDoUpdate({
                target: settings.key,
                set: { value, updatedAt: sql`now()` }
            });
    }

    /**
     * Update multiple settings at once
     */
    async updateAllSettings(settingsData: Record<string, string>): Promise<void> {
        const db = this.ensureDb();

        for (const [key, value] of Object.entries(settingsData)) {
            await db.insert(settings)
                .values({ key, value } as any)
                .onConflictDoUpdate({
                    target: settings.key,
                    set: { value, updatedAt: sql`now()` }
                });
        }
    }
}
