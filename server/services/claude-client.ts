/**
 * Claude AI Client (Anthropic)
 * =============================================
 * Powered by claude-sonnet-4-6 — نفس ذكاء Claude Code
 *
 * Features:
 * - Multiple API keys (ANTHROPIC_API_KEY, ANTHROPIC_API_KEY_2, ANTHROPIC_API_KEY_3)
 * - Auto-failover between keys with cooldown
 * - Non-streaming (chat) + streaming (chatStream) support
 * - System prompt extraction from messages array (compatible with existing code)
 */

import Anthropic from "@anthropic-ai/sdk";

interface ApiKeyStatus {
    key: string;
    isHealthy: boolean;
    cooldownUntil?: number;
}

export type ClaudeMessage =
    | { role: "system"; content: string }
    | { role: "user"; content: string }
    | { role: "assistant"; content: string };

class ClaudeClientManager {
    private apiKeys: ApiKeyStatus[] = [];
    private currentKeyIndex = 0;
    private clients: Map<string, Anthropic> = new Map();

    public static readonly MODELS = {
        SONNET: "claude-sonnet-4-6",          // Most intelligent — same as Claude Code
        HAIKU: "claude-haiku-4-5-20251001",   // Faster & lighter
    };

    constructor() {
        this.initializeKeys();
    }

    private initializeKeys(): void {
        const envVars = [
            "ANTHROPIC_API_KEY",
            "ANTHROPIC_API_KEY_2",
            "ANTHROPIC_API_KEY_3",
        ];
        for (const envVar of envVars) {
            const key = process.env[envVar];
            if (key?.trim()) {
                this.apiKeys.push({ key: key.trim(), isHealthy: true });
                this.clients.set(key.trim(), new Anthropic({ apiKey: key.trim() }));
            }
        }
        if (this.apiKeys.length === 0) {
            console.warn("⚠️  No Anthropic API keys found. Add ANTHROPIC_API_KEY to .env");
        } else {
            console.log(`✅ Loaded ${this.apiKeys.length} Anthropic (Claude) API key(s)`);
        }
    }

    public hasKeys(): boolean { return this.apiKeys.length > 0; }
    public getKeyCount(): number { return this.apiKeys.length; }

    private getClient(): Anthropic | null {
        if (this.apiKeys.length === 0) return null;
        let attempts = 0;
        while (attempts < this.apiKeys.length) {
            const ks = this.apiKeys[this.currentKeyIndex];
            if (ks.isHealthy && (!ks.cooldownUntil || Date.now() > ks.cooldownUntil)) {
                if (ks.cooldownUntil) {
                    ks.isHealthy = true;
                    ks.cooldownUntil = undefined;
                }
                return this.clients.get(ks.key) || null;
            }
            this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
            attempts++;
        }
        // All unhealthy — reset first key and try anyway
        this.apiKeys[0].isHealthy = true;
        this.currentKeyIndex = 0;
        return this.clients.get(this.apiKeys[0].key) || null;
    }

    public markKeyFailed(error: Error): void {
        if (!this.apiKeys.length) return;
        const current = this.apiKeys[this.currentKeyIndex];
        const msg = error.message.toLowerCase();
        // Rate limit: 60s cooldown; other errors: 2 min
        const cooldown = (msg.includes("429") || msg.includes("rate")) ? 60000 : 120000;
        current.isHealthy = false;
        current.cooldownUntil = Date.now() + cooldown;
        console.warn(`⚠️  Claude Key ${this.currentKeyIndex + 1} failed: ${error.message.slice(0, 80)}`);
        this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
        console.log(`🔄 Switching to Claude Key ${this.currentKeyIndex + 1}`);
    }

    /**
     * Extract system prompt and normalize messages for Anthropic API.
     * Handles: system role extraction, alternating user/assistant enforcement.
     */
    private prepareMessages(messages: ClaudeMessage[]): {
        system: string;
        chatMessages: Anthropic.Messages.MessageParam[];
    } {
        let system = "";
        const chatMessages: Anthropic.Messages.MessageParam[] = [];

        for (const msg of messages) {
            if (msg.role === "system") {
                system = msg.content;
            } else {
                chatMessages.push({
                    role: msg.role as "user" | "assistant",
                    content: msg.content,
                });
            }
        }

        // Anthropic requires messages to start with "user"
        if (chatMessages.length === 0 || chatMessages[0].role !== "user") {
            chatMessages.unshift({ role: "user", content: "هلا" });
        }

        // Merge consecutive same-role messages (Anthropic requires alternating roles)
        const merged: Anthropic.Messages.MessageParam[] = [];
        for (const msg of chatMessages) {
            if (merged.length > 0 && merged[merged.length - 1].role === msg.role) {
                const prev = merged[merged.length - 1];
                if (typeof prev.content === "string" && typeof msg.content === "string") {
                    prev.content = prev.content + "\n" + msg.content;
                }
            } else {
                merged.push({ ...msg });
            }
        }

        return { system, chatMessages: merged };
    }

    /**
     * Non-streaming chat — returns response text directly.
     * Accepts mixed messages array (system role extracted automatically).
     */
    public async chat(
        messages: ClaudeMessage[],
        options: {
            model?: string;
            temperature?: number;
            maxTokens?: number;
        } = {}
    ): Promise<string> {
        const {
            model = ClaudeClientManager.MODELS.SONNET,
            temperature = 0.45,
            maxTokens = 2048,
        } = options;

        const { system, chatMessages } = this.prepareMessages(messages);
        const maxRetries = Math.min(2, this.apiKeys.length);

        let lastError: Error | null = null;
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            const client = this.getClient();
            if (!client) throw new Error("No Anthropic API keys configured. Add ANTHROPIC_API_KEY to .env");

            try {
                const response = await client.messages.create({
                    model,
                    max_tokens: maxTokens,
                    temperature,
                    ...(system && { system }),
                    messages: chatMessages,
                });

                const textBlock = response.content.find(b => b.type === "text");
                return textBlock?.type === "text" ? textBlock.text : "";
            } catch (err: any) {
                lastError = err as Error;
                const errMsg = (err?.message || "").toLowerCase();
                const isRetryable =
                    errMsg.includes("429") || errMsg.includes("rate") ||
                    errMsg.includes("500") || errMsg.includes("503") ||
                    errMsg.includes("overloaded");

                if (isRetryable && this.apiKeys.length > 1) {
                    this.markKeyFailed(err as Error);
                    continue;
                }
                throw err;
            }
        }

        throw lastError || new Error("All Claude API attempts failed");
    }

    /**
     * Streaming chat — yields text chunks as they arrive (word by word).
     * Uses Anthropic's MessageStream for real-time streaming.
     */
    public async *chatStream(
        messages: ClaudeMessage[],
        options: {
            model?: string;
            temperature?: number;
            maxTokens?: number;
        } = {}
    ): AsyncGenerator<string, void, unknown> {
        const {
            model = ClaudeClientManager.MODELS.SONNET,
            temperature = 0.45,
            maxTokens = 2048,
        } = options;

        const client = this.getClient();
        if (!client) throw new Error("No Anthropic API keys configured.");

        const { system, chatMessages } = this.prepareMessages(messages);

        const stream = client.messages.stream({
            model,
            max_tokens: maxTokens,
            temperature,
            ...(system && { system }),
            messages: chatMessages,
        });

        for await (const text of stream.textStream) {
            yield text;
        }
    }
}

// Singleton instance
export const claudeClient = new ClaudeClientManager();
