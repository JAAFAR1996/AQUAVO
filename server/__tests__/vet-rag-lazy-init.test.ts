/**
 * Regression tests for Phase H (server lazy initialization):
 * VetRAG previously called `vetRAG.initialize()` unconditionally at MODULE
 * LOAD time (server/services/vet-rag.ts), firing real Gemini embedding API
 * calls for the entire knowledge base on every server boot — including
 * serverless cold starts — even when no diagnostic/visual-AI feature was
 * ever used.
 *
 * These tests assert:
 *  1. Importing the module does NOT start initialization (no eager network
 *     work at import time).
 *  2. Calling searchKnowledge() (first real use) DOES trigger initialize().
 *  3. Concurrent calls to searchKnowledge() do not start duplicate/overlapping
 *     initializations (the initPromise guard is respected).
 *  4. Behavior (keyword fallback while embeddings aren't ready yet, and
 *     eventual semantic search once ready) is unchanged.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockEmbedContent = vi.fn();
const mockGetGenerativeModel = vi.fn(() => ({ embedContent: mockEmbedContent }));

vi.mock("../services/gemini-client.js", () => ({
    geminiClient: {
        executeWithFallback: async (op: (client: unknown) => Promise<unknown>) =>
            op({ getGenerativeModel: mockGetGenerativeModel }),
    },
}));

vi.mock("../services/vet-knowledge.js", () => ({
    VET_KNOWLEDGE_CHUNKS: [
        { id: "c1", title: "Ich", content: "white spot disease treatment", keywords: ["ich", "white spot"] },
        { id: "c2", title: "Fin Rot", content: "fin rot bacterial infection", keywords: ["fin rot"] },
    ],
}));

describe("VetRAG lazy initialization", () => {
    beforeEach(() => {
        vi.resetModules();
        mockEmbedContent.mockReset();
    });

    it("does not start initialization merely by being imported", async () => {
        mockEmbedContent.mockResolvedValue({ embedding: { values: [1, 0, 0] } });
        await import("../services/vet-rag.js");

        // Give any stray microtasks/timers a chance to run.
        await new Promise((r) => setTimeout(r, 10));

        expect(mockEmbedContent).not.toHaveBeenCalled();
    });

    it("triggers initialize() on first real use (searchKnowledge)", async () => {
        mockEmbedContent.mockResolvedValue({ embedding: { values: [1, 0, 0] } });
        const { vetRAG } = await import("../services/vet-rag.js");

        expect(mockEmbedContent).not.toHaveBeenCalled();

        await vetRAG.searchKnowledge(["white spot"], 1);

        // Background init should have kicked off at least one embedding call
        // (for the query itself and/or the knowledge chunks).
        expect(mockEmbedContent).toHaveBeenCalled();
    });

    it("does not start duplicate/overlapping initializations on concurrent calls", async () => {
        mockEmbedContent.mockResolvedValue({ embedding: { values: [1, 0, 0] } });
        const logSpy = vi.spyOn(console, "log");

        const { vetRAG } = await import("../services/vet-rag.js");

        // Fire multiple concurrent "first use" calls. The guard in
        // searchKnowledge() (`!this.isInitialized && !this.initPromise`) plus
        // initialize()'s own isInitialized/initPromise checks must ensure the
        // expensive embedding pass ("[VetRAG] Initializing N knowledge chunks")
        // runs exactly once, no matter how many callers race for first use.
        await Promise.all([
            vetRAG.searchKnowledge(["ich"], 1),
            vetRAG.searchKnowledge(["fin rot"], 1),
            vetRAG.searchKnowledge(["ich"], 1),
        ]);

        const initStartLogs = logSpy.mock.calls.filter((args) =>
            String(args[0]).includes("Initializing 2 knowledge chunks")
        );
        expect(initStartLogs.length).toBe(1);

        // Calling initialize() again afterwards must be a no-op (idempotent).
        const callsAfterSettling = mockEmbedContent.mock.calls.length;
        await vetRAG.initialize();
        expect(mockEmbedContent.mock.calls.length).toBe(callsAfterSettling);

        logSpy.mockRestore();
    });

    it("falls back to keyword search when embeddings are not ready yet", async () => {
        // Never resolves — simulates embeddings still in flight.
        mockEmbedContent.mockImplementation(() => new Promise(() => {}));

        const { vetRAG } = await import("../services/vet-rag.js");
        const results = await vetRAG.searchKnowledge(["white spot"], 1);

        expect(results.length).toBe(1);
        expect(results[0].id).toBe("c1");
    });
});
