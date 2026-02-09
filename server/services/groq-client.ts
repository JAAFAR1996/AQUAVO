/**
 * Groq AI Client with Multi-API Key Fallback
 * =============================================
 * Ultra-fast AI inference with automatic key rotation
 *
 * Features:
 * - Multiple API keys support (3-5 keys)
 * - Automatic failover on errors
 * - Rate limiting awareness
 * - Key health tracking
 * - Tool/Function calling support
 */

import Groq from "groq-sdk";

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

// Flexible ChatMessage type supporting tool calls
type ChatMessage =
    | { role: "system"; content: string }
    | { role: "user"; content: string }
    | { role: "assistant"; content: string | null; tool_calls?: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }> }
    | { role: "tool"; content: string; tool_call_id: string };

interface ToolDefinition {
    type: "function";
    function: {
        name: string;
        description?: string;
        parameters?: Record<string, unknown>;
    };
}

interface ChatOptions {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
    tools?: ToolDefinition[];
    tool_choice?: "none" | "auto" | "required";
}

class GroqClientManager {
    private apiKeys: ApiKeyStatus[] = [];
    private currentKeyIndex: number = 0;
    private clients: Map<string, Groq> = new Map();

    // Available Groq models
    public static readonly MODELS = {
        LLAMA_70B: "llama-3.3-70b-versatile",
        LLAMA_8B: "llama-3.1-8b-instant",
        GEMMA: "gemma2-9b-it",
    };

    constructor() {
        this.initializeApiKeys();
    }

    private initializeApiKeys(): void {
        const keyEnvVars = [
            "GROQ_API_KEY",
            "GROQ_API_KEY_2",
            "GROQ_API_KEY_3",
            "GROQ_API_KEY_4",
            "GROQ_API_KEY_5"
        ];

        for (const envVar of keyEnvVars) {
            const key = process.env[envVar];
            if (key && key.trim() !== "") {
                this.apiKeys.push({
                    key: key.trim(),
                    isHealthy: true
                });
                this.clients.set(key.trim(), new Groq({ apiKey: key.trim() }));
            }
        }

        if (this.apiKeys.length === 0) {
            console.warn("⚠️ No Groq API keys found in environment variables!");
            console.warn("Please set at least one of: GROQ_API_KEY, GROQ_API_KEY_2, etc.");
        } else {
            console.log(`✅ Loaded ${this.apiKeys.length} Groq API key(s)`);
        }
    }

    /**
     * Get the current healthy API client
     */
    public getClient(): Groq | null {
        if (this.apiKeys.length === 0) {
            return null;
        }

        let attempts = 0;
        while (attempts < this.apiKeys.length) {
            const keyStatus = this.apiKeys[this.currentKeyIndex];

            if (keyStatus.isHealthy && (!keyStatus.cooldownUntil || Date.now() > keyStatus.cooldownUntil)) {
                return this.clients.get(keyStatus.key) || null;
            }

            if (keyStatus.cooldownUntil && Date.now() > keyStatus.cooldownUntil) {
                keyStatus.isHealthy = true;
                keyStatus.cooldownUntil = undefined;
                return this.clients.get(keyStatus.key) || null;
            }

            this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
            attempts++;
        }

        // All keys are unhealthy, try the first one anyway
        this.apiKeys[0].isHealthy = true;
        this.currentKeyIndex = 0;
        return this.clients.get(this.apiKeys[0].key) || null;
    }

    /**
     * Mark current key as failed and switch to next
     */
    public markCurrentKeyFailed(error: Error): Groq | null {
        if (this.apiKeys.length === 0) return null;

        const currentKey = this.apiKeys[this.currentKeyIndex];
        const errorMessage = error.message.toLowerCase();

        let cooldownMs = 60000; // Default: 1 minute

        if (errorMessage.includes("rate_limit") || errorMessage.includes("429")) {
            cooldownMs = 60 * 1000;
        } else if (errorMessage.includes("401") || errorMessage.includes("invalid")) {
            cooldownMs = 30 * 60 * 1000;
        }

        currentKey.isHealthy = false;
        currentKey.lastError = error.message;
        currentKey.lastErrorTime = Date.now();
        currentKey.cooldownUntil = Date.now() + cooldownMs;

        console.warn(`⚠️ Groq API Key ${this.currentKeyIndex + 1} failed: ${error.message}`);
        console.warn(`⏰ Key ${this.currentKeyIndex + 1} in cooldown for ${cooldownMs / 1000}s`);

        this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
        console.log(`🔄 Switching to Groq API Key ${this.currentKeyIndex + 1}`);

        return this.getClient();
    }

    public getKeyCount(): number {
        return this.apiKeys.length;
    }

    public hasKeys(): boolean {
        return this.apiKeys.length > 0;
    }

    /**
     * Send a chat completion request with full response (supports tool calling)
     */
    public async chat(
        messages: ChatMessage[],
        options: ChatOptions = {}
    ): Promise<Groq.Chat.Completions.ChatCompletion> {
        const {
            model = GroqClientManager.MODELS.LLAMA_70B,
            temperature = 0.7,
            maxTokens = 2048,
            systemPrompt,
            tools,
            tool_choice
        } = options;

        let lastError: Error | null = null;
        let retries = 0;
        const maxRetries = Math.min(3, this.apiKeys.length);

        while (retries < maxRetries) {
            const client = this.getClient();

            if (!client) {
                throw new Error("لا توجد مفاتيح Groq API مُعدة. يرجى إضافة GROQ_API_KEY");
            }

            try {
                const fullMessages = systemPrompt
                    ? [{ role: "system" as const, content: systemPrompt }, ...messages]
                    : messages;

                const createParams: any = {
                    model,
                    messages: fullMessages,
                    temperature,
                    max_tokens: maxTokens,
                };

                // Add tools if provided
                if (tools && tools.length > 0) {
                    createParams.tools = tools;
                    if (tool_choice) {
                        createParams.tool_choice = tool_choice;
                    }
                }

                const response = await client.chat.completions.create(createParams);
                return response;
            } catch (error: any) {
                lastError = error as Error;
                const errorMsg = (error?.message || "").toLowerCase();
                const errorCode = error?.error?.code || "";

                // tool_use_failed is a model issue, not a key issue - throw immediately
                if (errorCode === "tool_use_failed" || errorMsg.includes("failed to call a function")) {
                    throw error;
                }

                const isRetryable =
                    errorMsg.includes("rate_limit") ||
                    errorMsg.includes("429") ||
                    errorMsg.includes("500") ||
                    errorMsg.includes("503");

                if (isRetryable && this.apiKeys.length > 1) {
                    this.markCurrentKeyFailed(error as Error);
                    retries++;
                    console.log(`🔄 Retrying with different API key (attempt ${retries}/${maxRetries})`);
                    continue;
                }

                throw error;
            }
        }

        throw lastError || new Error("فشلت جميع محاولات الاتصال بـ Groq");
    }

    /**
     * Simple text-only chat (backward compatible - returns string)
     */
    public async chatText(
        messages: ChatMessage[],
        options: Omit<ChatOptions, 'tools' | 'tool_choice'> = {}
    ): Promise<string> {
        const response = await this.chat(messages, options);
        return response.choices[0]?.message?.content || "";
    }

    /**
     * Stream a chat completion (for real-time responses)
     */
    public async *chatStream(
        messages: ChatMessage[],
        options: {
            model?: string;
            temperature?: number;
            maxTokens?: number;
            systemPrompt?: string;
        } = {}
    ): AsyncGenerator<string, void, unknown> {
        const {
            model = GroqClientManager.MODELS.LLAMA_70B,
            temperature = 0.7,
            maxTokens = 2048,
            systemPrompt
        } = options;

        const client = this.getClient();

        if (!client) {
            throw new Error("لا توجد مفاتيح Groq API مُعدة");
        }

        const fullMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = systemPrompt
            ? [{ role: "system", content: systemPrompt }, ...messages as any]
            : messages as any;

        const stream = await client.chat.completions.create({
            model,
            messages: fullMessages,
            temperature,
            max_tokens: maxTokens,
            stream: true,
        });

        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
                yield content;
            }
        }
    }
}

// Singleton instance
export const groqClient = new GroqClientManager();

// Export for convenience
export { Groq };
export type { ChatMessage, ToolDefinition, ChatOptions };
