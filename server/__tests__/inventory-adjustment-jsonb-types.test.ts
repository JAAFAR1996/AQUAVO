import { describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import { setCanonicalProductStock } from "../services/inventory-adjustment-service.js";

const dialect = new PgDialect();

function fakeTransaction(options: {
  hasVariants?: boolean;
  variantId?: string | null;
  previousStock?: number;
} = {}) {
  const statements: Array<{ sql: string; params: unknown[] }> = [];
  const previousStock = options.previousStock ?? 0;
  const execute = vi.fn(async (query: unknown): Promise<unknown> => {
    const compiled = dialect.sqlToQuery(query as any);
    statements.push({ sql: compiled.sql, params: compiled.params });
    if (compiled.sql.includes("FROM products")) {
      return { rows: [{
        id: "aquavo-driftwood-dw-11",
        name: "DW-11",
        has_variants: options.hasVariants ?? false,
        variants: options.hasVariants
          ? [{ id: options.variantId, stock: previousStock }]
          : null,
      }] };
    }
    if (compiled.sql.includes("FROM inventory_locations")) {
      return { rows: [{ id: "main-warehouse" }] };
    }
    if (compiled.sql.includes("FROM inventory_movements")) {
      return { rows: [{ qty: previousStock }] };
    }
    return { rows: [] };
  });
  return { execute, statements };
}

describe("canonical stock adjustment metadata SQL", () => {
  it("types all 5 polymorphic JSONB values and supports a NULL base variant", async () => {
    const tx = fakeTransaction();
    const result = await setCanonicalProductStock(
      tx,
      { clientId: "admin-test-id", mode: "admin" },
      "aquavo-driftwood-dw-11",
      1,
      null,
    );
    expect(result).toMatchObject({
      previous_stock: 0,
      new_stock: 1,
      adjustment: 1,
      changed: true,
    });
    const insert = tx.statements.at(-1);
    expect(insert).toBeDefined();
    const sql = insert!.sql;
    expect(sql).toContain("INSERT INTO inventory_movements");
    expect(sql).toMatch(/'client_id',\s*\$8::text/);
    expect(sql).toMatch(/'auth_mode',\s*\$9::text/);
    expect(sql).toMatch(/'target_stock',\s*\$10::integer/);
    expect(sql).toMatch(/'previous_stock',\s*\$11::integer/);
    expect(sql).toMatch(/'variant_id',\s*\$12::text/);
    expect(insert!.params[9]).toBe(1);
    expect(insert!.params[10]).toBe(0);
    expect(insert!.params[11]).toBeNull();
    expect(sql).not.toMatch(/UPDATE\s+products\s+SET\s+stock/i);
  });

  it("preserves the variant ID and absolute stock semantics", async () => {
    const tx = fakeTransaction({
      hasVariants: true, variantId: "variant-123", previousStock: 2,
    });
    const result = await setCanonicalProductStock(
      tx, { clientId: "admin-test-id", mode: "admin" },
      "aquavo-driftwood-dw-11", 4, "variant-123",
    );
    expect(result).toMatchObject({
      variant_id: "variant-123",
      previous_stock: 2,
      new_stock: 4,
      adjustment: 2,
    });
    expect(tx.statements.at(-1)?.sql).toMatch(/'variant_id',\s*\$12::text/);
    expect(tx.statements.at(-1)?.params[11]).toBe("variant-123");
  });

  it("does not write a movement when ledger stock already equals the target", async () => {
    const tx = fakeTransaction({ previousStock: 1 });
    const result = await setCanonicalProductStock(
      tx, { clientId: "admin-test-id", mode: "admin" },
      "aquavo-driftwood-dw-11", 1, null,
    );
    expect(result.changed).toBe(false);
    expect(tx.statements.every((statement) =>
      !statement.sql.includes("INSERT INTO inventory_movements"),
    )).toBe(true);
  });
});
