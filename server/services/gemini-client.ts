/**
 * Gemini AI Client with Multi-API Key Fallback
 * =============================================
 * This module provides a centralized, resilient Gemini AI client
 * that automatically rotates between multiple API keys when one fails.
 * 
 * Features:
 * - Multiple API keys support (3-5 keys)
 * - Automatic failover on 403/quota errors
 * - Rate limiting awareness
 * - Key health tracking
 */

import { GoogleGenerativeAI, GenerativeModel, FunctionCallingMode } from "@google/generative-ai";

// ============================================================
// API KEY MANAGEMENT
// ============================================================

interface ApiKeyStatus {
    key: string;
    isHealthy: boolean;
    lastError?: string;
    lastErrorTime?: number;
    cooldownUntil?: number;
}

class GeminiClientManager {
    private apiKeys: ApiKeyStatus[] = [];
    private currentKeyIndex: number = 0;
    private clients: Map<string, GoogleGenerativeAI> = new Map();

    constructor() {
        this.initializeApiKeys();
    }

    private initializeApiKeys(): void {
        // Load all API keys from environment variables
        const keyEnvVars = [
            "GEMINI_API_KEY",
            "GEMINI_API_KEY_2",
            "GEMINI_API_KEY_3",
            "GEMINI_API_KEY_4",
            "GEMINI_API_KEY_5"
        ];

        for (const envVar of keyEnvVars) {
            const key = process.env[envVar];
            if (key && key.trim() !== "") {
                this.apiKeys.push({
                    key: key.trim(),
                    isHealthy: true
                });
                this.clients.set(key.trim(), new GoogleGenerativeAI(key.trim()));
            }
        }

        if (this.apiKeys.length === 0) {
            console.warn("⚠️ No Gemini API keys found in environment variables!");
            console.warn("Please set at least one of: GEMINI_API_KEY, GEMINI_API_KEY_2, GEMINI_API_KEY_3, GEMINI_API_KEY_4, GEMINI_API_KEY_5");
        } else {
            console.log(`✅ Loaded ${this.apiKeys.length} Gemini API key(s)`);
        }
    }

    /**
     * Get the current healthy API client
     */
    public getClient(): GoogleGenerativeAI | null {
        if (this.apiKeys.length === 0) {
            return null;
        }

        // Find a healthy key
        let attempts = 0;
        while (attempts < this.apiKeys.length) {
            const keyStatus = this.apiKeys[this.currentKeyIndex];

            // Check if key is healthy and not in cooldown
            if (keyStatus.isHealthy && (!keyStatus.cooldownUntil || Date.now() > keyStatus.cooldownUntil)) {
                return this.clients.get(keyStatus.key) || null;
            }

            // Reset cooldown if expired
            if (keyStatus.cooldownUntil && Date.now() > keyStatus.cooldownUntil) {
                keyStatus.isHealthy = true;
                keyStatus.cooldownUntil = undefined;
                return this.clients.get(keyStatus.key) || null;
            }

            // Try next key
            this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
            attempts++;
        }

        // All keys are unhealthy, try the first one anyway (might have recovered)
        this.apiKeys[0].isHealthy = true;
        this.currentKeyIndex = 0;
        return this.clients.get(this.apiKeys[0].key) || null;
    }

    /**
     * Mark current key as failed and switch to next
     */
    public markCurrentKeyFailed(error: Error): GoogleGenerativeAI | null {
        if (this.apiKeys.length === 0) return null;

        const currentKey = this.apiKeys[this.currentKeyIndex];
        const errorMessage = error.message.toLowerCase();

        // Determine cooldown based on error type
        let cooldownMs = 60000; // Default: 1 minute

        if (errorMessage.includes("quota") || errorMessage.includes("rate_limit")) {
            cooldownMs = 5 * 60 * 1000; // 5 minutes for quota errors
        } else if (errorMessage.includes("403") || errorMessage.includes("forbidden")) {
            cooldownMs = 10 * 60 * 1000; // 10 minutes for 403 errors
        } else if (errorMessage.includes("invalid") || errorMessage.includes("api_key")) {
            cooldownMs = 30 * 60 * 1000; // 30 minutes for invalid key errors
        }

        currentKey.isHealthy = false;
        currentKey.lastError = error.message;
        currentKey.lastErrorTime = Date.now();
        currentKey.cooldownUntil = Date.now() + cooldownMs;

        console.warn(`⚠️ API Key ${this.currentKeyIndex + 1} failed: ${error.message}`);
        console.warn(`⏰ Key ${this.currentKeyIndex + 1} in cooldown for ${cooldownMs / 1000}s`);

        // Switch to next key
        this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;

        console.log(`🔄 Switching to API Key ${this.currentKeyIndex + 1}`);

        return this.getClient();
    }

    /**
     * Get total number of API keys configured
     */
    public getKeyCount(): number {
        return this.apiKeys.length;
    }

    /**
     * Get health status of all keys
     */
    public getHealthStatus(): { index: number; healthy: boolean; cooldownRemaining?: number }[] {
        return this.apiKeys.map((key, index) => ({
            index: index + 1,
            healthy: key.isHealthy,
            cooldownRemaining: key.cooldownUntil ? Math.max(0, key.cooldownUntil - Date.now()) : undefined
        }));
    }

    /**
     * Create a generative model with fallback support
     */
    public getModel(
        modelName: string = "gemini-2.5-flash",
        config?: {
            tools?: any[];
            toolConfig?: any;
            generationConfig?: any;
        }
    ): GenerativeModel | null {
        const client = this.getClient();
        if (!client) return null;

        return client.getGenerativeModel({
            model: modelName,
            ...config
        });
    }

    /**
     * Execute an AI operation with automatic failover
     */
    public async executeWithFallback<T>(
        operation: (client: GoogleGenerativeAI) => Promise<T>,
        maxRetries: number = 3
    ): Promise<T> {
        let lastError: Error | null = null;
        let retries = 0;

        while (retries < maxRetries && retries < this.apiKeys.length) {
            const client = this.getClient();

            if (!client) {
                throw new Error("No Gemini API keys configured. Please set GEMINI_API_KEY environment variable.");
            }

            try {
                return await operation(client);
            } catch (error) {
                lastError = error as Error;
                const errorMessage = (error as Error).message.toLowerCase();

                // Check if error is retryable (key-related)
                const isRetryable =
                    errorMessage.includes("403") ||
                    errorMessage.includes("forbidden") ||
                    errorMessage.includes("quota") ||
                    errorMessage.includes("rate_limit") ||
                    errorMessage.includes("api_key") ||
                    errorMessage.includes("unregistered");

                if (isRetryable && this.apiKeys.length > 1) {
                    this.markCurrentKeyFailed(error as Error);
                    retries++;
                    console.log(`🔄 Retrying with different API key (attempt ${retries}/${maxRetries})`);
                    continue;
                }

                // Non-retryable error, throw immediately
                throw error;
            }
        }

        throw lastError || new Error("All API keys exhausted");
    }
}

// Singleton instance
export const geminiClient = new GeminiClientManager();

// Export for backwards compatibility
export function getGeminiClient(): GoogleGenerativeAI | null {
    return geminiClient.getClient();
}

export function getGeminiModel(
    modelName: string = "gemini-2.5-flash",
    config?: any
): GenerativeModel | null {
    return geminiClient.getModel(modelName, config);
}

// Re-export for convenience
export { GoogleGenerativeAI, FunctionCallingMode };
