import express, { type NextFunction, type Request, type Response } from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { productCostHistory, productCostHistoryPreMigrationColumns } from "../../shared/schema.js";
import { createAccountingRouter } from "../routes/accounting.js";

const { select } = vi.hoisted(() => ({ select: vi.fn() }));
vi.mock("../db.js", () => ({ getDb: () => ({ select }) }));
vi.mock("../middleware/auth.js", () => ({
  requireAdmin: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

describe("read-only accounting cost history routes", () => {
  it("queries the compatible history projection for product history and its audit", async () => {
    const timestamp = new Date("2026-11-15T00:00:00Z");
    const row = { id: "h1", productId: "p1", costPrice: "2800", packagingCost: "250", insertCost: "0",
      effectiveFrom: timestamp, createdAt: timestamp, note: null, changedBy: null };
    select.mockImplementation(columns => ({
      from: (table: unknown) => {
        if (table === productCostHistory) {
          expect(columns).toEqual(productCostHistoryPreMigrationColumns);
          const orderBy = async () => [row];
          return { where: () => ({ orderBy }), orderBy };
        }
        return { where: async () => [] };
      },
    }));
    const app = express();
    app.use("/accounting", createAccountingRouter());
    const history = await request(app).get("/accounting/cost-history/p1").expect(200);
    expect(history.body.data).toEqual([expect.objectContaining({ id: "h1", productId: "p1", costPrice: 2800 })]);
    const audit = await request(app).get("/accounting/cost-history-audit").expect(200);
    expect(audit.body).toEqual({ success: true, data: [] });
    expect(select.mock.calls.filter(([columns]) => columns === productCostHistoryPreMigrationColumns)).toHaveLength(2);
  });
});
