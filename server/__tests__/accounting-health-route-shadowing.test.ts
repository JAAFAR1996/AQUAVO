import express, { type NextFunction, type Request, type Response } from "express";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mockExecute = vi.fn();

vi.mock("../db.js", () => ({
  getDb: () => ({
    execute: (...args: unknown[]) => mockExecute(...args),
  }),
}));

vi.mock("../middleware/accounting-auth-v2.js", () => ({
  requireAccountingAdmin: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

vi.mock("../services/accounting-auto-close-v2.js", () => ({
  runAutomaticPeriodClose: vi.fn(),
}));

vi.mock("../services/accountingAuditTrail.js", () => ({
  actorFromRequest: vi.fn(),
}));

let createAccountingV2Router: typeof import("../routes/accounting-v2.js").createAccountingV2Router;

beforeAll(async () => {
  ({ createAccountingV2Router } = await import("../routes/accounting-v2.js"));
});

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/admin/accounting", createAccountingV2Router());
  app.use((error: { status?: number; statusCode?: number; message?: string }, _req: Request, res: Response, _next: NextFunction) => {
    res.status(error.status ?? error.statusCode ?? 500).json({ message: error.message ?? "Internal server error" });
  });
  return app;
}

describe("GET /api/admin/accounting/v2/health route ownership", () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  it("fails closed instead of returning ready when migrations 0063 through 0066 are not represented by the 0066 gate", async () => {
    mockExecute.mockResolvedValue({
      rows: [{
        facts: true,
        journal: true,
        readiness: true,
        companies: true,
        positions: true,
        live_balances: true,
        auto_close: true,
        migration_0066: false,
      }],
    });

    const response = await request(buildApp()).get("/api/admin/accounting/v2/health");

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ message: "ACCOUNTING_V2_MIGRATIONS_0051_TO_0066_REQUIRED" });
    expect(response.body.ready).not.toBe(true);
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });

  it("reports migration 0066 only after every fail-closed health check passes", async () => {
    mockExecute.mockResolvedValue({
      rows: [{
        facts: true,
        journal: true,
        readiness: true,
        companies: true,
        positions: true,
        live_balances: true,
        auto_close: true,
        migration_0066: true,
      }],
    });

    const response = await request(buildApp()).get("/api/admin/accounting/v2/health");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ ready: true, migrationsThrough: "0066" });
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });
});
