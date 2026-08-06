import express, { type NextFunction, type Request, type Response } from "express";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const { mockExecute } = vi.hoisted(() => ({
  mockExecute: vi.fn(),
}));

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

// Every column the single surviving gate selects. The route is only allowed to
// answer "ready" when ALL of them are true, so flipping any one of them to
// false must fail closed — that is the whole point of collapsing the duplicate
// routers into one owner.
const HEALTHY_ROW = {
  facts: true,
  journal: true,
  readiness: true,
  companies: true,
  positions: true,
  live_balances: true,
  auto_close: true,
  migration_0071: true,
  delivery_readiness_function: true,
  ledger_balance_function: true,
  return_verifier_function: true,
  delivery_readiness_guard: true,
  return_verification_lock_guard: true,
  return_verification_guard: true,
  return_line_identity_guard: true,
  return_refund_snapshot_guard: true,
} as const;

  it.each(Object.keys(HEALTHY_ROW))(
    "fails closed instead of returning ready when the P0 chain check %s is not satisfied",
    async (missing) => {
      mockExecute.mockResolvedValue({ rows: [{ ...HEALTHY_ROW, [missing]: false }] });

      const response = await request(buildApp()).get("/api/admin/accounting/v2/health");

      expect(response.status).toBe(503);
      expect(response.body.message).toContain("ACCOUNTING_V2_MIGRATIONS_0051_TO_0071_REQUIRED");
      expect(response.body.ready).not.toBe(true);
      expect(mockExecute).toHaveBeenCalledTimes(1);
    },
  );

  it("reports migrations through 0071 only after every fail-closed health check passes", async () => {
    mockExecute.mockResolvedValue({ rows: [{ ...HEALTHY_ROW }] });

    const response = await request(buildApp()).get("/api/admin/accounting/v2/health");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ ready: true, migrationsThrough: "0071" });
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });
});
