/**
 * Regression tests for Phase A / P0-P1 boundary fix:
 * POST /api/coupons/validate was previously shadowed by an unvalidated
 * duplicate handler in users.ts (mounted at /api before /api/coupons).
 * These tests mount the routers in the exact order server/routes.ts uses
 * and assert only the validated handler (server/routes/coupons.ts) is reachable.
 */
import express from "express";
import request from "supertest";
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";

const mockGetCouponByCode = vi.fn();

vi.mock("../storage/index.js", () => ({
    storage: {
        getCouponByCode: (...args: unknown[]) => mockGetCouponByCode(...args),
    },
}));

// Minimal mocks for users.ts's other dependencies so the module can load.
vi.mock("../middleware/auth.js", () => ({
    requireAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
    getSession: () => undefined,
}));
vi.mock("../utils/email.js", () => ({ sendPasswordResetEmail: vi.fn() }));
vi.mock("../middleware/rate-limit.js", () => ({
    authLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
    passwordResetLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
}));
vi.mock("../utils/auth.js", () => ({
    hashPassword: vi.fn(),
    verifyPassword: vi.fn(),
}));
vi.mock("../storage/security-storage.js", () => ({
    SecurityStorage: class {},
}));
vi.mock("../db.js", () => ({ getDb: vi.fn() }));

// Import route modules once (in beforeAll) rather than per-test — the dynamic
// import + module graph resolution is comparatively expensive and, under
// full-suite disk/CPU contention, could push a single test past vitest's
// default 5s timeout if repeated on every `it()`. The Express app itself
// (built fresh per test below) is cheap and keeps tests isolated.
let createUserRouter: typeof import("../routes/users.js").createUserRouter;
let createCouponRouter: typeof import("../routes/coupons.js").createCouponRouter;

beforeAll(async () => {
    ({ createUserRouter } = await import("../routes/users.js"));
    ({ createCouponRouter } = await import("../routes/coupons.js"));
});

function buildApp() {
    const app = express();
    app.use(express.json());
    // Exact mount order from server/routes.ts: /api (users) before /api/coupons.
    app.use("/api", createUserRouter());
    app.use("/api/coupons", createCouponRouter());
    return app;
}

function makeCoupon(overrides: Partial<Record<string, unknown>> = {}) {
    const now = Date.now();
    return {
        id: "coupon-1",
        code: "SAVE20",
        type: "percentage",
        value: "20",
        isActive: true,
        startDate: new Date(now - 24 * 60 * 60 * 1000),
        endDate: new Date(now + 24 * 60 * 60 * 1000),
        minOrderAmount: null,
        maxUses: null,
        usedCount: 0,
        ...overrides,
    };
}

describe("POST /api/coupons/validate (route-shadowing fix)", () => {
    beforeEach(() => {
        mockGetCouponByCode.mockReset();
    });

    it("returns 404 with an Arabic message for an unknown coupon (proves the validated handler, not the removed shallow one, is reachable)", async () => {
        mockGetCouponByCode.mockResolvedValue(undefined);
        const app = buildApp();
        const res = await request(app)
            .post("/api/coupons/validate")
            .send({ code: "DOES_NOT_EXIST", totalAmount: 10000 });

        expect(res.status).toBe(404);
        expect(res.body.message).toBe("رمز الكوبون غير صحيح");
    });

    it("rejects an inactive coupon", async () => {
        mockGetCouponByCode.mockResolvedValue(makeCoupon({ isActive: false }));
        const app = buildApp();
        const res = await request(app)
            .post("/api/coupons/validate")
            .send({ code: "INACTIVE", totalAmount: 10000 });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe("هذا الكوبون غير فعال حالياً");
    });

    it("rejects an expired coupon", async () => {
        mockGetCouponByCode.mockResolvedValue(
            makeCoupon({ endDate: new Date(Date.now() - 24 * 60 * 60 * 1000) })
        );
        const app = buildApp();
        const res = await request(app)
            .post("/api/coupons/validate")
            .send({ code: "EXPIRED", totalAmount: 10000 });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe("انتهت صلاحية هذا الكوبون");
    });

    it("rejects a coupon that has not started yet", async () => {
        mockGetCouponByCode.mockResolvedValue(
            makeCoupon({ startDate: new Date(Date.now() + 24 * 60 * 60 * 1000) })
        );
        const app = buildApp();
        const res = await request(app)
            .post("/api/coupons/validate")
            .send({ code: "NOT_STARTED", totalAmount: 10000 });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe("هذا الكوبون لم يبدأ بعد");
    });

    it("rejects a coupon that reached maxUses (this check was previously entirely missing)", async () => {
        mockGetCouponByCode.mockResolvedValue(
            makeCoupon({ maxUses: 10, usedCount: 10 })
        );
        const app = buildApp();
        const res = await request(app)
            .post("/api/coupons/validate")
            .send({ code: "MAXED", totalAmount: 10000 });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe("تم استخدام هذا الكوبون بالكامل");
    });

    it("rejects when the order total is below the coupon's minimum order amount", async () => {
        mockGetCouponByCode.mockResolvedValue(
            makeCoupon({ minOrderAmount: "50000" })
        );
        const app = buildApp();
        const res = await request(app)
            .post("/api/coupons/validate")
            .send({ code: "MIN50K", totalAmount: 30000 });

        expect(res.status).toBe(400);
        expect(res.body.message).toContain("50000");
    });

    it("accepts a valid percentage coupon", async () => {
        mockGetCouponByCode.mockResolvedValue(makeCoupon({ type: "percentage", value: "20" }));
        const app = buildApp();
        const res = await request(app)
            .post("/api/coupons/validate")
            .send({ code: "SAVE20", totalAmount: 100000 });

        expect(res.status).toBe(200);
        expect(res.body.type).toBe("percentage");
        expect(res.body.value).toBe("20");
    });

    it("accepts a valid fixed coupon", async () => {
        mockGetCouponByCode.mockResolvedValue(makeCoupon({ type: "fixed", value: "5000" }));
        const app = buildApp();
        const res = await request(app)
            .post("/api/coupons/validate")
            .send({ code: "FLAT5K", totalAmount: 100000 });

        expect(res.status).toBe(200);
        expect(res.body.type).toBe("fixed");
        expect(res.body.value).toBe("5000");
    });

    it("accepts a valid free_shipping coupon", async () => {
        mockGetCouponByCode.mockResolvedValue(makeCoupon({ type: "free_shipping", value: "0" }));
        const app = buildApp();
        const res = await request(app)
            .post("/api/coupons/validate")
            .send({ code: "FREESHIP", totalAmount: 100000 });

        expect(res.status).toBe(200);
        expect(res.body.type).toBe("free_shipping");
    });

    it("never reaches an unvalidated fallback that accepts an invalid coupon merely because it exists", async () => {
        // Regression guard for the original bug: a coupon that exists but is
        // inactive AND expired AND exhausted must still be rejected, not
        // accepted just because getCouponByCode resolved a truthy value.
        mockGetCouponByCode.mockResolvedValue(
            makeCoupon({
                isActive: false,
                endDate: new Date(Date.now() - 1000),
                maxUses: 1,
                usedCount: 1,
            })
        );
        const app = buildApp();
        const res = await request(app)
            .post("/api/coupons/validate")
            .send({ code: "BROKEN", totalAmount: 10000 });

        expect(res.status).toBe(400);
        expect(res.status).not.toBe(200);
    });
});
