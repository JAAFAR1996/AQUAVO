// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { productInteractions, cartSessions, productViews } from "../../shared/schema.js";

const state = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("../db.js", () => ({ getDb: () => state.db }));

const { AnalyticsTracker } = await import("../services/analytics-tracker.js");
let pg: PGlite;
let database: ReturnType<typeof drizzle>;
const tracker = new AnalyticsTracker();

beforeAll(async () => {
  // Only the three telemetry tables are needed. All writes are local; the
  // database module is mocked and no analytics/provider SDK is imported.
  pg = new PGlite();
  await pg.exec(`
    CREATE TABLE product_interactions (
      id text PRIMARY KEY DEFAULT gen_random_uuid(), user_id text, session_id text,
      product_id text NOT NULL, interaction_type text NOT NULL,
      duration integer, scroll_depth integer, metadata jsonb,
      created_at timestamp NOT NULL DEFAULT now()
    );
    CREATE TABLE cart_sessions (
      id text PRIMARY KEY DEFAULT gen_random_uuid(), user_id text,
      session_id text NOT NULL UNIQUE, status text NOT NULL DEFAULT 'active',
      total_value integer DEFAULT 0, created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    );
    CREATE TABLE product_views (
      id text PRIMARY KEY DEFAULT gen_random_uuid(), product_id text, user_id text,
      session_id text, referrer text, viewed_at timestamp NOT NULL DEFAULT now(),
      view_duration integer, source text
    );
  `);
  database = drizzle(pg);
  state.db = database;
});

beforeEach(async () => {
  state.db = database;
  await pg.exec("TRUNCATE product_interactions, cart_sessions, product_views");
});

afterAll(async () => { await pg.close(); });

describe("analytics tracker database integrity", () => {
  it("persists exit duration only on the latest matching product view, preserving the other rows and metadata", async () => {
    const common = { userId: "customer", sessionId: "cs_first", productId: "product-a", interactionType: "view", duration: 3, scrollDepth: 5, metadata: { from: "search" } };
    const rows = [
      { ...common, id: "older", createdAt: new Date("2026-11-21T10:00:00Z") },
      { ...common, id: "target", createdAt: new Date("2026-11-21T10:01:00Z") },
      { ...common, id: "other-session", sessionId: "cs_second", createdAt: new Date("2026-11-21T10:02:00Z") },
      { ...common, id: "other-product", productId: "product-b", createdAt: new Date("2026-11-21T10:03:00Z") },
      { ...common, id: "cart-event", interactionType: "cart_add", createdAt: new Date("2026-11-21T10:04:00Z") },
    ];
    await database.insert(productInteractions).values(rows);

    const exit = { userId: "customer", sessionId: "cs_first", productId: "product-a", duration: 47, scrollDepth: 83,
      email: "synthetic-private@example.invalid", metadata: { costPrice: "private-sentinel" } };
    await tracker.trackPageExit(exit);

    const persisted = await database.select().from(productInteractions);
    expect(persisted).toHaveLength(rows.length);
    for (const row of persisted) {
      expect(row.duration).toBe(row.id === "target" ? 47 : 3);
      expect(row.scrollDepth).toBe(row.id === "target" ? 83 : 5);
      expect(row.metadata).toEqual({ from: "search" });
    }
    expect(JSON.stringify(persisted)).not.toContain("private-sentinel");
    expect(JSON.stringify(persisted)).not.toContain(exit.email);
  });

  it("does not manufacture a view when an exit has no preceding matching view", async () => {
    await tracker.trackPageExit({ sessionId: "cs_no_view", productId: "product-a", duration: 47, scrollDepth: 83 });
    expect(await database.select().from(productInteractions)).toEqual([]);
  });

  it("preserves the established purchase/cart metadata and never copies arbitrary caller data", async () => {
    const input = { userId: "customer", sessionId: "cs_first", productId: "product-a", from: "product_page",
      quantity: 2, reason: "changed_mind", orderId: "synthetic-order", price: 1250,
      email: "synthetic-private@example.invalid", customerPhone: "private-phone-sentinel",
      costPrice: 991112, metadata: { privateInvoice: "private-invoice-sentinel" } };
    await tracker.trackProductView(input);
    await tracker.trackCartAdd(input);
    await tracker.trackCartRemove(input);
    await tracker.trackPurchase(input);
    await tracker.trackFavorite(input);

    const events = await database.select().from(productInteractions);
    const metadata = Object.fromEntries(events.map(event => [event.interactionType, event.metadata]));
    expect(metadata).toEqual({
      view: { from: "product_page" },
      cart_add: { quantity: 2, from: "product_page" },
      cart_remove: { reason: "changed_mind" },
      purchase: { orderId: "synthetic-order", quantity: 2, price: 1250 },
      favorite: {},
    });
    const serialized = JSON.stringify(events);
    for (const privateValue of [input.email, input.customerPhone, "991112", input.metadata.privateInvoice]) {
      expect(serialized).not.toContain(privateValue);
    }
    expect(await database.select().from(cartSessions)).toEqual([
      expect.objectContaining({ sessionId: "cs_first", userId: "customer", status: "active" }),
    ]);
    expect(await database.select().from(productViews)).toEqual([
      expect.objectContaining({ sessionId: "cs_first", productId: "product-a", referrer: "product_page" }),
    ]);
  });

  it("keeps the existing summary calculation when historical duration is null or zero", async () => {
    await database.insert(productInteractions).values([
      { id: "unknown", userId: "customer", productId: "product-a", interactionType: "view", duration: null },
      { id: "zero", userId: "customer", productId: "product-a", interactionType: "view", duration: 0 },
      { id: "known", userId: "customer", productId: "product-a", interactionType: "view", duration: 36 },
      { id: "purchase", userId: "customer", productId: "product-a", interactionType: "purchase", duration: null },
    ]);
    const summary = await tracker.getUserInteractionSummary("customer");
    expect(summary).toMatchObject({ totalViews: 3, totalPurchases: 1, avgViewDuration: 36, recentProducts: ["product-a"] });
    expect(summary?.conversionRate).toBeCloseTo(100 / 3);
  });

  it("remains best effort without a database and can write after the database becomes available", async () => {
    state.db = null;
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await expect(tracker.trackPageExit({ sessionId: "cs_first", productId: "product-a", duration: 2, scrollDepth: 3 })).resolves.toBeUndefined();
      state.db = database;
      await database.insert(productInteractions).values({ id: "recovered", sessionId: "cs_first", productId: "product-a", interactionType: "view" });
      await tracker.trackPageExit({ sessionId: "cs_first", productId: "product-a", duration: 2, scrollDepth: 3 });
      const [row] = await database.select().from(productInteractions).where(eq(productInteractions.id, "recovered"));
      expect(row).toMatchObject({ duration: 2, scrollDepth: 3 });
    } finally {
      state.db = database;
      error.mockRestore();
    }
  });
});
