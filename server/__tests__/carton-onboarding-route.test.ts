import express from "express";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  allowAdmin: true,
  setup: vi.fn(),
}));

vi.mock("../db.js", () => ({ getDb: () => ({ transaction: vi.fn() }) }));
vi.mock("../middleware/auth.js", () => ({
  requireAdmin: (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!state.allowAdmin) {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    (req as express.Request & { session: Record<string, string> }).session = {
      userId: "owner-1",
      userName: "المالك",
    };
    next();
  },
}));
vi.mock("../services/carton-onboarding-service.js", () => ({
  setupCartonAtomically: state.setup,
}));

let app: express.Express;
let businessDateInBaghdad: (now?: Date) => string;

const validBody = {
  name: "كارتونة وسط",
  sku: "BOX-M",
  notes: "اختبار",
  internalLengthCm: 27,
  internalWidthCm: 20,
  internalHeightCm: 14,
  maxWeightKg: 8,
  lowStockThreshold: 5,
  openingQuantity: 20,
  unitCostIqd: 1000,
  costEffectiveDate: "2026-08-02",
  costSource: "فاتورة المورد",
  idempotencyKey: "carton-setup-test-key-0001",
};

beforeAll(async () => {
  const module = await import("../routes/carton-onboarding.js");
  businessDateInBaghdad = module.businessDateInBaghdad;
  app = express();
  app.use(express.json());
  app.use("/api/admin/packaging", module.default);
});

beforeEach(() => {
  state.allowAdmin = true;
  state.setup.mockReset();
  state.setup.mockResolvedValue({
    cartonId: "carton-1",
    costRecordId: "cost-1",
    openingMovementId: "movement-1",
    replayed: false,
  });
});

function post(body: unknown, csrf = "csrf-token-1234567890") {
  return request(app)
    .post("/api/admin/packaging/cartons/setup")
    .set("X-CSRF-Token", csrf)
    .set("Idempotency-Key", validBody.idempotencyKey)
    .send(body);
}

describe("carton onboarding route", () => {
  it("rejects a non-admin before any write", async () => {
    state.allowAdmin = false;
    const response = await post(validBody);
    expect(response.status).toBe(403);
    expect(state.setup).not.toHaveBeenCalled();
  });

  it("requires the CSRF signal", async () => {
    const response = await request(app)
      .post("/api/admin/packaging/cartons/setup")
      .send(validBody);
    expect(response.status).toBe(403);
    expect(response.body.error).toBe("CSRF_REQUIRED");
    expect(state.setup).not.toHaveBeenCalled();
  });

  it("rejects a negative quantity", async () => {
    const response = await post({ ...validBody, openingQuantity: -1 });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe("VALIDATION_INVALID");
    expect(state.setup).not.toHaveBeenCalled();
  });

  it("rejects zero or negative dimensions and weight", async () => {
    for (const field of ["internalLengthCm", "internalWidthCm", "internalHeightCm", "maxWeightKg"] as const) {
      const response = await post({ ...validBody, [field]: 0 });
      expect(response.status).toBe(400);
    }
    expect(state.setup).not.toHaveBeenCalled();
  });

  it("rejects non-integer quantity and IQD cost", async () => {
    expect((await post({ ...validBody, openingQuantity: 1.5 })).status).toBe(400);
    expect((await post({ ...validBody, unitCostIqd: 10.5 })).status).toBe(400);
    expect((await post({ ...validBody, unitCostIqd: -1 })).status).toBe(400);
    expect((await post({ ...validBody, unitCostIqd: 0 })).status).toBe(400);
  });

  it("uses the Baghdad business date instead of the UTC calendar date", () => {
    expect(businessDateInBaghdad(new Date("2026-08-01T21:30:00.000Z"))).toBe("2026-08-02");
  });

  it("rejects a future cost date so the cost cannot activate early", async () => {
    const response = await post({ ...validBody, costEffectiveDate: "2099-01-01" });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe("VALIDATION_INVALID");
    expect(state.setup).not.toHaveBeenCalled();
  });

  it("calls the atomic service once for valid input", async () => {
    const response = await post(validBody);
    expect(response.status).toBe(201);
    expect(state.setup).toHaveBeenCalledTimes(1);
    expect(response.body.messages).toEqual([
      "تم إنشاء الكارتونة.",
      "تم تسجيل العدد المتوفر.",
      "تم تسجيل كلفة الوحدة وتاريخ سريانها.",
    ]);
  });
});
