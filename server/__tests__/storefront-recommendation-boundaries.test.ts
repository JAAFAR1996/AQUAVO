import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { getTableName } from "drizzle-orm";
import { getTableConfig, type PgTable } from "drizzle-orm/pg-core";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { products, aquariumDesigns, orders, orderItems, notificationLog, predictedNeeds } from "../../shared/schema.js";
import type { AquariumAdvisor } from "../services/aquarium-advisor.js";
import type { SmartNotifications } from "../services/smart-notifications.js";

const state = vi.hoisted(() => ({ db: null as unknown, send: vi.fn(), chat: vi.fn() }));
vi.mock("../db.js", () => ({ getDb: () => state.db, get db() { return state.db; } }));
vi.mock("../services/groq-client.js", () => ({ groqClient: { hasKeys: () => false, chatText: state.chat } }));
vi.mock("../services/ai-monitor.js", () => ({ aiMonitor: { log: vi.fn() } }));
vi.mock("web-push", () => ({ default: { setVapidDetails: vi.fn(), sendNotification: state.send } }));

let pg: PGlite;
let advisor: AquariumAdvisor;
let notifications: SmartNotifications;

function tableDdl(table: PgTable) {
  return `CREATE TABLE "${getTableName(table)}" (${getTableConfig(table).columns.map(column => `"${column.name}" ${column.getSQLType()}`).join(", ")})`;
}

beforeAll(async () => {
  // An isolated database fixture, with every network/message provider mocked.
  pg = new PGlite();
  await pg.exec([products, aquariumDesigns, orders, orderItems, notificationLog, predictedNeeds].map(tableDdl).join(";"));
  const db = drizzle(pg);
  state.db = db;
  const { AquariumAdvisor } = await import("../services/aquarium-advisor.js");
  const { SmartNotifications } = await import("../services/smart-notifications.js");
  advisor = new AquariumAdvisor();
  notifications = new SmartNotifications();
  const common = { brand: "Fixture", subcategory: "Parts", description: "Synthetic fixture", images: [], thumbnail: "", hasVariants: false };
  await db.insert(products).values([
    { ...common, id: "hidden", slug: "hidden", name: "Private Filter", category: "Equipment", price: "999", stock: 1, isStorefrontVisible: false, createdAt: new Date() },
    { ...common, id: "deleted", slug: "deleted", name: "Deleted Filter", category: "Equipment", price: "999", stock: 1, isStorefrontVisible: true, deletedAt: new Date(), createdAt: new Date() },
    { ...common, id: "visible", slug: "visible", name: "Public Filter", category: "Equipment", price: "100", stock: 1, isStorefrontVisible: true, createdAt: new Date() },
    { ...common, id: "incoming", slug: "incoming", name: "Upcoming Filter", category: "Equipment", price: "0", stock: 0, isStorefrontVisible: true, createdAt: new Date(), specifications: { __availabilityStatus: "coming_soon" } },
  ]);
  await pg.query("INSERT INTO aquarium_designs (id, selected_equipment) VALUES ($1, $2::jsonb)", ["fixture-design", JSON.stringify([
    { name: "Private Filter" }, { name: "Deleted Filter" }, { name: "Public Filter" }, { name: "Upcoming Filter" },
  ])]);
  await db.insert(orders).values({ id: "fixture-order", userId: "fixture-customer", total: "100", items: [] });
  await db.insert(orderItems).values({ id: "fixture-line", orderId: "fixture-order", productId: "visible", quantity: 1, priceAtPurchase: "100", totalPrice: "100" });
  await db.insert(predictedNeeds).values(["hidden", "deleted", "visible", "incoming"].map((productId, index) => ({
    id: `prediction-${productId}`, userId: `customer-${productId}`, productId,
    probability: String(99 - index), predictedDate: new Date("2026-11-21T00:00:00Z"),
    reason: "Synthetic replenishment", converted: false, notified: false,
  })));
});

afterAll(async () => { await pg.close(); });

describe("auxiliary storefront product selection", () => {
  it("does not attach hidden or deleted catalogue data to a generated shopping list", async () => {
    const shopping = await advisor.generateShoppingList("fixture-design");
    expect(shopping.items.filter(item => item.productId).map(item => item.productId)).toEqual(["visible", "incoming"]);
    expect(shopping.items.find(item => item.name === "Private Filter")).toMatchObject({ available: false });
    expect(shopping.items.find(item => item.name === "Deleted Filter")).toMatchObject({ available: false });
    expect(shopping.totalEstimate).toBe(100);
  });

  it("selects only visible, undeleted new products without changing the existing upcoming selection policy", async () => {
    // Inspect the read-only candidate step; never invoke the delivery engine.
    const candidateReader = notifications as unknown as {
      gatherNewProductCandidates(): Promise<Array<{ payload: { metadata?: Record<string, unknown> } }>>;
    };
    const candidates = await candidateReader.gatherNewProductCandidates();
    expect(candidates.map(candidate => candidate.payload.metadata?.productId).sort()).toEqual(["incoming", "visible"]);
    expect(state.send).not.toHaveBeenCalled();
  });

  it("excludes hidden and deleted replenishment products before generating any fresh message", async () => {
    const candidateReader = notifications as unknown as {
      gatherReplenishmentCandidates(): Promise<Array<{ payload: { url: string; metadata?: Record<string, unknown> } }>>;
      generateAIContent(type: string, context: Record<string, unknown>): Promise<{ title: string; body: string }>;
    };
    const generate = vi.spyOn(candidateReader, "generateAIContent").mockResolvedValue({ title: "Fixture", body: "Fixture" });
    try {
      const candidates = await candidateReader.gatherReplenishmentCandidates();
      expect(candidates.map(candidate => candidate.payload.metadata?.productId)).toEqual(["visible", "incoming"]);
      expect(candidates.map(candidate => candidate.payload.url)).toEqual(["/products/visible", "/products/incoming"]);
      expect(generate.mock.calls.map(([, context]) => context.productName)).toEqual(["Public Filter", "Upcoming Filter"]);
      expect(state.chat).not.toHaveBeenCalled();
      expect(state.send).not.toHaveBeenCalled();
    } finally {
      generate.mockRestore();
    }
  });
});
