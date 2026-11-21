import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { getTableConfig, type AnyPgTable } from "drizzle-orm/pg-core";
import * as schema from "../../shared/schema.js";
import { eq } from "drizzle-orm";
import { sessionHash } from "../services/checkout-security.js";
import { errorHandler } from "../middleware/error-handler.js";
import { renderReviewedLearnings } from "../services/learning-policy.js";
import { toPublicOrder } from "../../shared/public-order.js";
import { isPurchaseLifecycleEligible } from "../../shared/purchase-event-policy.js";

// Isolated PostgreSQL WASM + mocked providers: no production database or outbound messages.
const state = vi.hoisted(() => ({ db: undefined as unknown, groq: vi.fn(), vision: vi.fn(),
  chat: vi.fn(), stream: vi.fn(), journey: vi.fn(), semantic: vi.fn() }));
vi.mock("../db.js", () => ({ getDb: () => state.db, get db() { return state.db; } }));
vi.mock("../storage/index.js", () => ({ storage: { getUser: async (id: string) => ({ id, role: id === "admin" ? "admin" : "user", deletedAt: null }) } }));
vi.mock("../middleware/shared-rate-limit-store.js", async () => {
  const { MemoryStore } = await import("express-rate-limit");
  return { createSharedRateLimitStore: () => new MemoryStore() };
});
vi.mock("../services/gemini-ai.js", () => ({ sendMessage: state.chat, sendMessageStream: state.stream, recommendProductsForJourney: state.journey }));
vi.mock("../services/groq-client.js", () => ({ groqClient: { hasKeys: () => true, chatText: state.groq } }));
vi.mock("../services/gemini-client.js", () => ({ geminiClient: { executeWithFallback: state.vision } }));
vi.mock("../services/ai-monitor.js", () => ({ aiMonitor: { log: vi.fn(), logError: vi.fn() } }));
vi.mock("../services/vet-rag.js", () => ({ vetRAG: {} }));
vi.mock("../services/diagnostic-pipeline.js", () => ({ diagnosticPipeline: { execute: vi.fn() } }));
vi.mock("../cron/scheduled-jobs.js", () => ({ triggerJob: vi.fn(), getJobStatus: vi.fn() }));
vi.mock("../services/embedding-generator.js", () => ({ embeddingGenerator: {
  generateQueryEmbedding: async () => [1], semanticSearch: state.semantic,
} }));

let pg: PGlite;
let db: ReturnType<typeof drizzle<typeof schema>>;
let app: express.Express;
let visualAI: typeof import("../services/visual-ai.js").visualAI;
let feedbackRAG: typeof import("../services/feedback-rag.js").feedbackRAG;
let aiTools: InstanceType<typeof import("../services/ai-tools.js").AIToolsExecutor>;
let recommendations: InstanceType<typeof import("../services/recommendation-engine.js").RecommendationEngine>;
const tables: AnyPgTable[] = [schema.orders, schema.payments, schema.mutationReceipts, schema.fishPatients,
  schema.fishMedicalRecords, schema.imageAnalyses, schema.diagnosisCases, schema.diagnosisFeedback,
  schema.aiMonitoringLogs, schema.chatMessages, schema.aiLearnings, schema.products, schema.cartItems, schema.productInteractions,
  schema.predictedNeeds];
beforeAll(async () => {
  pg = new PGlite(); await pg.waitReady; await pg.exec("SET TIME ZONE 'UTC'"); db = drizzle(pg, { schema }); state.db = db;
  // Schema-shaped fixture tables, deliberately without production triggers or external dependencies.
  for (const table of tables) {
    const config = getTableConfig(table);
    const columns = config.columns.map(column => `"${column.name}" ${column.getSQLType()}${column.primary ? " PRIMARY KEY" : ""}${
      column.name === "id" && column.getSQLType() === "text" ? " DEFAULT gen_random_uuid()::text" :
        ["created_at", "updated_at", "timestamp"].includes(column.name) ? " DEFAULT now()" : ""}`);
    await pg.exec(`CREATE TABLE "${config.name}" (${columns.join(",")})`);
  }
  await pg.exec("ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_test boolean DEFAULT false");
  vi.stubEnv("META_PIXEL_ID", "synthetic-pixel"); vi.stubEnv("META_CAPI_TOKEN", "synthetic-token"); vi.stubEnv("VERCEL_ENV", "production");
  const [capi, fish, ai, learnings, vision, rag, advanced] = await Promise.all([
    import("../routes/capi.js"), import("../routes/fish-patients.js"), import("../routes/ai.js"),
    import("../routes/ai-learnings.js"), import("../services/visual-ai.js"), import("../services/feedback-rag.js"),
    import("../routes/ai-advanced.js"),
  ]);
  visualAI = vision.visualAI; feedbackRAG = rag.feedbackRAG;
  const tools = await import("../services/ai-tools.js"); aiTools = new tools.AIToolsExecutor();
  const engine = await import("../services/recommendation-engine.js"); recommendations = new engine.RecommendationEngine();
  app = express(); app.use(express.json());
  app.use((req, _res, next) => { Object.assign(req, {
    session: req.get("x-user") ? { userId: req.get("x-user") } : {}, sessionID: req.get("x-session") || "guest-session",
  }); next(); });
  app.use("/capi", capi.createCAPIRouter()); app.use("/fish-patients", fish.default);
  app.use("/ai", ai.default); app.use("/learnings", learnings.default); app.use("/advanced", advanced.default); app.use(errorHandler);
});
afterAll(async () => { await pg?.close(); vi.unstubAllEnvs(); });
beforeEach(async () => {
  await pg.exec(`TRUNCATE ${tables.map(table => `"${getTableConfig(table).name}"`).join(",")} RESTART IDENTITY`);
  state.groq.mockReset().mockResolvedValue(JSON.stringify({ correctedBehavior: "راجع المعلومات", rule: "اقتراح يحتاج مراجعة", severity: "high" }));
  state.vision.mockReset().mockResolvedValue(JSON.stringify({ detected: ["fish"], confidence: 0.8, suggestions: [], details: {} }));
  state.chat.mockReset().mockResolvedValue({ text: "synthetic response", products: [] });
  state.stream.mockReset().mockImplementation(async function* () { yield { type: "done", products: [] }; });
  state.journey.mockReset().mockResolvedValue(["product-public", "product-hidden", "product-deleted"].map(productId => ({ productId, reason: "fixture" })));
  state.semantic.mockReset().mockResolvedValue(["product-public", "product-hidden", "product-deleted"].map(id => ({ id, productId: id, similarity: 0.9 })));
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ events_received: 1 }), { status: 200 })));
});

describe("AI customer catalogue visibility", () => {
  beforeEach(async () => {
    const common = { name: "fixture food", description: "synthetic food", category: "fish-food", brand: "fixture", price: "10000", originalPrice: "20000", stock: 2, lowStockThreshold: 5 };
    await db.insert(schema.products).values([
      { ...common, id: "product-public", rating: "3", isStorefrontVisible: true },
      { ...common, id: "product-hidden", rating: "5", isStorefrontVisible: false },
      { ...common, id: "product-deleted", rating: "4", isStorefrontVisible: true, deletedAt: new Date() },
      { ...common, id: "product-soon", rating: "1", isStorefrontVisible: true, stock: 0, price: "0", originalPrice: null,
        specifications: { __availabilityStatus: "coming_soon" } },
    ]);
  });
  it("filters journey candidates before the model and rejects model-returned hidden IDs", async () => {
    const response = await request(app).post("/ai/journey-recommendations").send({ wizardData: { tankSize: 40 } });
    expect(response.status).toBe(200);
    expect(state.journey.mock.calls[0][1].map((product: { id: string }) => product.id)).toEqual(["product-public"]);
    expect(response.body.data.map((product: { id: string }) => product.id)).toEqual(["product-public"]);
  });
  it("keeps private products out of lexical/semantic tools, details, stock and cart writes", async () => {
    expect((await aiTools.searchProducts({ query: "fixture", limit: 1 })).data?.map(product => product.id)).toEqual(["product-public"]);
    expect((await aiTools.searchProducts({ query: "unmatched-semantic-fixture" })).data?.map(product => product.id)).toEqual(["product-public"]);
    expect((await aiTools.getDeals({})).data?.map(product => product.id)).toEqual(["product-public"]);
    expect((await aiTools.getRecommendations({})).data?.map(product => product.id).sort()).toEqual(["product-public", "product-soon"]);
    for (const productId of ["product-hidden", "product-deleted"]) {
      expect((await aiTools.getProductDetails({ productId })).success).toBe(false);
      expect((await aiTools.checkStock({ productId })).success).toBe(false);
      expect((await aiTools.addToCart({ userId: "owner", productId })).success).toBe(false);
    }
    expect(await db.select().from(schema.cartItems)).toHaveLength(0);
    expect((await aiTools.addToCart({ userId: "owner", productId: "product-public" })).success).toBe(true);
    expect(await db.select().from(schema.cartItems)).toHaveLength(1);
    expect((await aiTools.getProductDetails({ productId: "product-soon" })).data?.price).toBe("0");
  });
  it("limits guest chat counts to the visible catalogue in ordinary and streamed responses", async () => {
    expect((await request(app).post("/ai/chat").send({ message: "hello" })).status).toBe(200);
    expect(state.chat.mock.calls[0][2]).toMatchObject({ productsCount: 2, lowStockCount: 1 });
    expect((await request(app).post("/ai/chat/stream").send({ message: "hello" })).status).toBe(200);
    expect(state.stream.mock.calls[0][2]).toMatchObject({ productsCount: 2, lowStockCount: 1 });
  });
  it("filters similar-product candidates and final recommendation IDs, including historical interaction IDs", async () => {
    expect(await recommendations.getSimilarProducts("product-hidden", 5)).toEqual([]);
    await db.insert(schema.products).values({ id: "similar-public", name: "similar", description: "synthetic", category: "fish-food", price: "10000", stock: 1, isStorefrontVisible: true });
    expect(await recommendations.getSimilarProducts("product-public", 1)).toEqual(["similar-public"]);
    await db.insert(schema.productInteractions).values([
      { userId: "historic", productId: "product-hidden", interactionType: "purchase" },
      { userId: "historic", productId: "product-public", interactionType: "view" },
      { userId: "historic", productId: "product-deleted", interactionType: "purchase" },
    ]);
    expect((await recommendations.getPersonalizedRecommendations("new-user", 5)).productIds).toEqual(["product-public"]);
  });
  it("rechecks saved prediction visibility at read time and projects only public suggestion fields", async () => {
    const productIds = ["product-public", "product-hidden", "product-deleted", "product-soon", "product-missing"];
    await db.insert(schema.predictedNeeds).values(productIds.map((productId, index) => ({
      id: `prediction-${index}`, userId: "owner", productId, probability: String(0.9 - index / 10),
      predictedDate: new Date("2026-12-01T00:00:00Z"), category: "food", notified: false, converted: false,
      reason: `suggestion for ${productId}`, basedOn: { internal: "PRIVATE_SAVED_METADATA" },
    })));
    const read = await request(app).get("/advanced/predictions/owner").set("x-user", "owner");
    expect(read.status).toBe(200); expect(read.headers["cache-control"]).toBe("no-store");
    expect(read.body.count).toBe(2);
    expect(read.body.data.map((entry: { productId: string }) => entry.productId)).toEqual(["product-public", "product-soon"]);
    expect(Object.keys(read.body.data[0]).sort()).toEqual(["id", "productId", "probability", "predictedDate", "reason", "category", "notified"].sort());
    expect(read.text).not.toMatch(/product-hidden|product-deleted|product-missing|PRIVATE_SAVED_METADATA/);
    await db.update(schema.products).set({ isStorefrontVisible: false }).where(eq(schema.products.id, "product-public"));
    const refreshed = await request(app).get("/advanced/predictions/owner").set("x-user", "owner");
    expect(refreshed.body.count).toBe(1); expect(refreshed.body.data[0].productId).toBe("product-soon");
    expect(state.groq).not.toHaveBeenCalled(); expect(state.vision).not.toHaveBeenCalled();
  });
  it("preserves prediction ownership checks for unauthenticated and different customers", async () => {
    expect((await request(app).get("/advanced/predictions/owner")).status).toBe(401);
    expect((await request(app).get("/advanced/predictions/owner").set("x-user", "other")).status).toBe(403);
    const admin = await request(app).get("/advanced/predictions/owner").set("x-user", "admin");
    expect(admin.status).toBe(200); expect(admin.body).toMatchObject({ count: 0, data: [] });
  });
});

describe("record ownership and diagnosis learning", () => {
  beforeEach(async () => {
    await db.insert(schema.fishPatients).values([{ id: "fish-a", userId: "owner", name: "A" }, { id: "fish-b", userId: "other", name: "B" }]);
    await db.insert(schema.fishMedicalRecords).values([{ id: "record-a", fishPatientId: "fish-a", outcome: "unknown" }, { id: "record-b", fishPatientId: "fish-b", outcome: "unknown" }]);
    await db.insert(schema.imageAnalyses).values([{ id: "analysis-a", userId: "owner", imageUrl: "buffer://fixture", analysisType: "health", aiAnalysis: {} },
      { id: "analysis-b", userId: "other", imageUrl: "buffer://fixture", analysisType: "health", aiAnalysis: {} }]);
  });
  it("rejects foreign records and a mismatched parent fish without changing either record", async () => {
    for (const path of ["/fish-patients/fish-b/records/record-b", "/fish-patients/fish-a/records/record-b"]) {
      const result = await request(app).patch(path).set("x-user", "owner").send({ outcome: "recovered" });
      expect(result.status).toBe(404);
    }
    expect((await db.select().from(schema.fishMedicalRecords)).every(row => row.outcome === "unknown")).toBe(true);
    const own = await request(app).patch("/fish-patients/fish-a/records/record-a").set("x-user", "owner").send({ followUpCompleted: true });
    expect(own.status).toBe(200); expect(own.body.data.followUpCompleted).toBe(true);
  });
  it("accepts owner reports but never changes the case into a trusted diagnosis", async () => {
    await db.insert(schema.diagnosisCases).values({ id: "case-a", analysisId: "analysis-a", userId: "owner", disease: "original", verified: false });
    await expect(visualAI.submitFeedback({ analysisId: "analysis-b", userId: "owner", isCorrect: true })).rejects.toMatchObject({ statusCode: 404 });
    expect(await db.select().from(schema.diagnosisFeedback)).toHaveLength(0);
    await visualAI.submitFeedback({ analysisId: "analysis-a", userId: "owner", isCorrect: false, correctDisease: "caller correction", treatmentWorked: true });
    expect((await db.select().from(schema.diagnosisCases))[0]).toMatchObject({ disease: "original", verified: false });
    expect(await db.select().from(schema.diagnosisFeedback)).toHaveLength(1);
  });
  it("excludes legacy verified cases until explicit admin review and excludes customer notes from RAG", async () => {
    await db.insert(schema.diagnosisCases).values({ id: "legacy", analysisId: "analysis-a", disease: "reviewable", speciesName: "guppy", verified: true });
    await db.insert(schema.diagnosisFeedback).values({ analysisId: "analysis-a", userId: "owner", isCorrect: false, notes: "PRIVATE_UNTRUSTED_INSTRUCTION", correctDisease: "CALLER_OVERRIDE" });
    expect(await feedbackRAG.getSimilarCasesContext("guppy", [])).toBe("");
    await db.insert(schema.aiMonitoringLogs).values({ event: "diagnosis_case_reviewed", level: "info", userId: "admin", details: { caseId: "legacy" } });
    const context = await feedbackRAG.getSimilarCasesContext("guppy", []);
    expect(context).toContain("reviewable"); expect(context).not.toMatch(/PRIVATE_UNTRUSTED_INSTRUCTION|CALLER_OVERRIDE/);
    expect(await feedbackRAG.getFishHistory("fish-b", "owner")).toBe("");
  });
});

describe("feedback approval", () => {
  it("stores unverified guest suggestions as pending without spending model tokens", async () => {
    const result = await request(app).post("/ai/feedback").send({ type: "down", userMessage: "question", aiResponse: "made up answer" });
    expect(result.status).toBe(200); expect(state.groq).not.toHaveBeenCalled();
    expect((await db.select().from(schema.aiLearnings))[0]).toMatchObject({ applied: false, appliedAt: null });
  });
  it("keeps even high-severity verified feedback pending until an administrator approves", async () => {
    await db.insert(schema.chatMessages).values([{ conversationId: "conv", userId: "owner", role: "user", content: "question" },
      { conversationId: "conv", userId: "owner", role: "assistant", content: "answer" }]);
    expect((await request(app).post("/ai/feedback").set("x-user", "owner").send({ type: "down", userMessage: "question", aiResponse: "answer" })).status).toBe(200);
    let [learning] = await db.select().from(schema.aiLearnings);
    expect(learning).toMatchObject({ applied: false, severity: "high" });
    expect(renderReviewedLearnings([learning])).toBe("");
    expect((await request(app).patch(`/learnings/${learning.id}`).set("x-user", "owner").send({ applied: true })).status).toBe(403);
    expect((await request(app).patch(`/learnings/${learning.id}`).set("x-user", "admin").send({ applied: true, rule: "قاعدة راجعها المسؤول" })).status).toBe(200);
    [learning] = await db.select().from(schema.aiLearnings);
    expect(renderReviewedLearnings([learning])).toContain("قاعدة راجعها المسؤول");
    expect(renderReviewedLearnings([learning])).not.toContain("question");
  });
  it("does not treat historical auto-applied learning as active", async () => {
    await db.insert(schema.aiLearnings).values({ type: "negative_feedback", userMessage: "q", aiResponse: "a", applied: true, rule: "UNREVIEWED" });
    const result = await request(app).get("/learnings").set("x-user", "admin");
    expect(result.status).toBe(200); expect(result.body.data[0]).toMatchObject({ applied: false, requiresReview: true });
    expect(renderReviewedLearnings(await db.select().from(schema.aiLearnings))).toBe("");
    const [legacy] = await db.select().from(schema.aiLearnings);
    const edit = await request(app).patch(`/learnings/${legacy.id}`).set("x-user", "admin").send({ rule: "مسودة معدلة" });
    expect(edit.body.data.applied).toBe(false); // Editing a pending draft is not activation.
  });
});

describe("Visual AI recommendation boundary", () => {
  it("returns public product fields for both fresh and historical analysis", async () => {
    await db.insert(schema.products).values([
      { id: "product-public", name: "food", description: "fish food", category: "fish-food", price: "10000", stock: 2, isStorefrontVisible: true, costPrice: "999123", specifications: { supplierInvoice: "PRIVATE", dimensions: "10cm" } },
      { id: "product-hidden", name: "hidden", description: "hidden", category: "fish-food", price: "10000", stock: 2, isStorefrontVisible: false, costPrice: "999456" },
    ]);
    const fresh = await visualAI.analyzeImageBuffer(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), "image/png", "fish", "owner");
    const historical = await visualAI.getAnalysisById(fresh.id);
    for (const result of [fresh, historical]) {
      expect(result.recommendedProducts).toHaveLength(1); expect(result.recommendedProducts[0].id).toBe("product-public");
      expect(JSON.stringify(result.recommendedProducts)).not.toMatch(/costPrice|999123|999456|supplierInvoice|PRIVATE|product-hidden/);
    }
  });
});

const purchase = { event_name: "Purchase", event_id: "caller-random", custom_data: { order_id: "AQ-SYNTHETIC", value: 99999999, currency: "USD", content_ids: ["invented"], num_items: 999 } };
describe("CAPI canonical Purchase and receipt", () => {
  beforeEach(async () => {
    await db.insert(schema.orders).values({ id: "order-a", orderNumber: "AQ-SYNTHETIC", userId: "owner", status: "pending", paymentStatus: "pending", source: "website", total: "23010", roundedTotal: "23250", items: [{ productId: "product-real", quantity: 2, priceAtPurchase: 9000 }], checkoutSessionHash: sessionHash("guest-session") });
    await db.insert(schema.payments).values({ id: "payment-a", orderId: "order-a", amount: "23250", method: "cod", status: "pending" });
  });
  const post = () => request(app).post("/capi/event").set("x-user", "owner").send(purchase);
  it("rejects another owner or a bare guest order ID before provider calls", async () => {
    expect((await request(app).post("/capi/event").set("x-user", "other").send(purchase)).status).toBe(404);
    await db.update(schema.orders).set({ userId: null }).where(eq(schema.orders.id, "order-a"));
    expect((await request(app).post("/capi/event").set("x-session", "wrong").send(purchase)).status).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
    expect((await request(app).post("/capi/event").set("x-session", "guest-session").send(purchase)).body.events_received).toBe(1);
  });
  it("uses stored total/items, deterministic ID, and one durable receipt for duplicate requests", async () => {
    const results = await Promise.all([post(), post()]);

    expect(results.every(result => result.status === 200)).toBe(true); expect(fetch).toHaveBeenCalledTimes(1);
    const forwarded = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body)).data[0];
    expect(forwarded).toMatchObject({ event_id: "aquavo-purchase-AQ-SYNTHETIC", custom_data: { order_id: "AQ-SYNTHETIC", value: 14.53, currency: "USD", content_ids: ["product-real"], num_items: 2 } });
    expect(forwarded.user_data).not.toHaveProperty("ph");
    expect(await db.select().from(schema.mutationReceipts)).toHaveLength(1);
  });
  it.each(["provider rejection", "lost response"])("rolls back %s and retries using the same event ID", async failure => {
    const mockFetch = vi.mocked(fetch);
    if (failure === "provider rejection") mockFetch.mockResolvedValueOnce(new Response("{}", { status: 502 }));
    else mockFetch.mockRejectedValueOnce(new Error("network response lost"));
    expect((await post()).status).toBeGreaterThanOrEqual(500);
    expect(await db.select().from(schema.mutationReceipts)).toHaveLength(0);
    expect((await post()).status).toBe(200);
    const ids = mockFetch.mock.calls.map(call => JSON.parse(String(call[1]?.body)).data[0].event_id);
    expect(new Set(ids).size).toBe(1); expect(await db.select().from(schema.mutationReceipts)).toHaveLength(1);
  });
  it("keeps the test flag through the customer DTO so browser Purchase is suppressed too", () => {
    const output = toPublicOrder({ id: "test-order", isTest: true, status: "pending", createdAt: new Date(), items: [] });
    expect(output.isTest).toBe(true);
    expect(isPurchaseLifecycleEligible({ ...output, paymentMethod: "cod" })).toBe(false);
    expect(isPurchaseLifecycleEligible({ ...output, isTest: false, paymentMethod: "cod" })).toBe(true);
  });
  it("reports online purchases only after both canonical payment states are complete", async () => {
    await db.update(schema.payments).set({ method: "wayl", status: "completed" });
    await db.update(schema.orders).set({ paymentStatus: "paid" });
    expect((await post()).body.events_received).toBe(1);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("aborts a stalled provider within its bounded deadline and rolls back the receipt", async () => {
    vi.mocked(fetch).mockImplementationOnce((_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new Error("synthetic provider timeout")), { once: true });
    }));
    const result = await post();
    expect(result.status).toBe(500);
    expect(vi.mocked(fetch).mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(await db.select().from(schema.mutationReceipts)).toHaveLength(0);
  });
  it("does not report unpaid online, cancelled, old or test orders", async () => {
    await db.update(schema.payments).set({ method: "wayl" }); expect((await post()).body.reason).toBe("ineligible_order");
    await db.update(schema.payments).set({ method: "cod" }); await db.update(schema.orders).set({ status: "cancelled" });
    expect((await post()).body.reason).toBe("ineligible_order");
    await db.update(schema.orders).set({ status: "pending", createdAt: new Date(Date.now() - 2 * 86400_000) });
    expect((await post()).body.reason).toBe("ineligible_order");
    await pg.exec("UPDATE orders SET created_at=now(),is_test=true"); expect((await post()).body.reason).toBe("ineligible_order");
    expect(fetch).not.toHaveBeenCalled();
  });
});
