import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as schema from "../../shared/schema.js";
import { inventoryOptimizer } from "../services/inventory-optimizer.js";

const state = vi.hoisted(() => ({ db: undefined as ReturnType<typeof drizzle<typeof schema>> | undefined }));
vi.mock("../db.js", () => ({ getDb: () => state.db }));
vi.mock("../services/groq-client.js", () => ({ groqClient: { hasKeys: () => false } }));
const client = new PGlite();

beforeAll(async () => {
    state.db = drizzle(client, { schema });
    const ddl = readFileSync("migrations/0003_tidy_swarm.sql", "utf8")
        .split("--> statement-breakpoint").find(part => part.includes('CREATE TABLE "inventory_recommendations"'));
    if (!ddl) throw new Error("Missing recommendations migration");
    await client.exec(ddl);
    await client.exec(`
        CREATE TABLE products(id text PRIMARY KEY, name text NOT NULL, stock int, deleted_at timestamp);
        CREATE TABLE orders(id text PRIMARY KEY, status text, created_at timestamp, is_test boolean,
            source text, order_number text, customer_name text, shipping_address jsonb);
        CREATE TABLE order_items_relational(order_id text, product_id text, quantity int);
        INSERT INTO products VALUES ('live','Live product',1,NULL),('archived','Archived',0,now());
        INSERT INTO orders (id,status,created_at,is_test,source) VALUES
            ('real','delivered',now(),false,'website'),('canceled','cancelled',now(),false,'website'),
            ('flagged','delivered',now(),true,'website'),('legacy','delivered',now(),false,'accounting_test');
        INSERT INTO order_items_relational VALUES ('real','live',30),('canceled','live',123),
            ('flagged','live',120),('legacy','live',99);
    `);
    await client.query("UPDATE orders SET created_at = $1", [new Date(Date.now() - 86400000).toISOString()]);
});
afterAll(() => client.close());

describe("inventory recommendation lifecycle", () => {
    it("persists actual delivered units, reports pending alerts and preserves dismissal across retries", async () => {
        expect(await inventoryOptimizer.analyzeAllProducts()).toMatchObject({ analyzed: 1, failed: 0, urgent: 1 });
        const [item] = await inventoryOptimizer.getUrgentRecommendations();
        expect(item).toMatchObject({ productId: "live", productName: "Live product", urgency: "critical",
            currentStock: 1, suggestedOrderQuantity: 29, recommendationType: "urgent" });
        expect(await inventoryOptimizer.dismissRecommendation(item.id)).toBe(true);
        expect(await inventoryOptimizer.dismissRecommendation(item.id)).toBe(false);
        await Promise.all([inventoryOptimizer.analyzeAllProducts(), inventoryOptimizer.analyzeAllProducts()]);
        expect(await inventoryOptimizer.getUrgentRecommendations()).toEqual([]);
        expect((await client.query("SELECT status FROM inventory_recommendations")).rows).toEqual([{ status: "dismissed" }]);
    });

    it("reports a failed write rather than counting it as a saved recommendation", async () => {
        await client.exec("ALTER TABLE inventory_recommendations ADD CONSTRAINT force_failure CHECK (current_stock > 1000) NOT VALID");
        expect(await inventoryOptimizer.analyzeAllProducts()).toMatchObject({ analyzed: 0, failed: 1, urgent: 0 });
    });
});
