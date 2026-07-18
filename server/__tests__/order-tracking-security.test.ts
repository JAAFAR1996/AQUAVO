import express from "express";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
    buildPublicOrderTrackingResponse,
    createOrderRouter,
    normalizePhoneDigits,
    verifyOrderTrackingPhone,
} from "../routes/orders.js";
import { storage } from "../storage/index.js";

afterEach(() => vi.restoreAllMocks());

describe("public order tracking security", () => {
    it("normalizes Iraqi phone formatting and Arabic digits", () => {
        expect(normalizePhoneDigits("+964 774 788 ٠٦٧٣")).toBe("9647747880673");
        expect(normalizePhoneDigits("۰۷۷۴-۷۸۸-۰۶۷۳")).toBe("07747880673");
    });

    it("requires an exact last-four match and rejects missing legacy phone data", () => {
        expect(verifyOrderTrackingPhone("+964 774 788 0673", "0673")).toBe(true);
        expect(verifyOrderTrackingPhone("0774 788 0673", "0674")).toBe(false);
        expect(verifyOrderTrackingPhone(null, "0000")).toBe(false);
    });

    it("returns only minimum tracking fields without PII, totals, IDs, or items", () => {
        const response = buildPublicOrderTrackingResponse({
            orderNumber: "FH-260713-ABC12345",
            status: "processing",
            createdAt: new Date("2026-07-13T08:00:00.000Z"),
            updatedAt: new Date("2026-07-13T09:00:00.000Z"),
        });

        expect(Object.keys(response).sort()).toEqual([
            "createdAt",
            "estimatedDelivery",
            "orderNumber",
            "status",
            "updatedAt",
        ]);
        expect(response).not.toHaveProperty("id");
        expect(response).not.toHaveProperty("total");
        expect(response).not.toHaveProperty("items");
        expect(response).not.toHaveProperty("customerPhone");
        expect(response).not.toHaveProperty("shippingAddress");
    });

    it("closes the legacy GET lookup without querying an order", async () => {
        const getOrder = vi.spyOn(storage, "getOrder");
        const app = express().use(express.json()).use("/api/orders", createOrderRouter());

        const response = await request(app).get("/api/orders/track/FH-260713-ABC12345");

        expect(response.status).toBe(404);
        expect(response.body).toEqual({
            message: "تعذر التحقق من الطلب. تأكد من المعلومات وحاول مرة ثانية.",
        });
        expect(getOrder).not.toHaveBeenCalled();
    });

    it("uses one generic failure for a missing order and a wrong verifier", async () => {
        const getOrder = vi.spyOn(storage, "getOrder")
            .mockResolvedValueOnce(undefined)
            .mockResolvedValueOnce({ customerPhone: "07747880673" } as Awaited<ReturnType<typeof storage.getOrder>>);
        const app = express().use(express.json()).use("/api/orders", createOrderRouter());

        const missing = await request(app)
            .post("/api/orders/track/FH-MISSING")
            .send({ phoneLast4: "1234" });
        const wrongVerifier = await request(app)
            .post("/api/orders/track/FH-260713-ABC12345")
            .send({ phoneLast4: "9999" });

        expect(missing.status).toBe(404);
        expect(wrongVerifier.status).toBe(404);
        expect(missing.body).toEqual(wrongVerifier.body);
    });

    it("returns the minimal response only after successful verification", async () => {
        vi.spyOn(storage, "getOrder").mockResolvedValue({
            orderNumber: "FH-260713-ABC12345",
            customerPhone: "+964 774 788 0673",
            status: "processing",
            createdAt: new Date("2026-07-13T08:00:00.000Z"),
            updatedAt: new Date("2026-07-13T09:00:00.000Z"),
        } as Awaited<ReturnType<typeof storage.getOrder>>);
        const app = express().use(express.json()).use("/api/orders", createOrderRouter());

        const response = await request(app)
            .post("/api/orders/track/FH-260713-ABC12345")
            .send({ phoneLast4: "0673" });

        expect(response.status).toBe(200);
        expect(Object.keys(response.body).sort()).toEqual([
            "createdAt",
            "estimatedDelivery",
            "orderNumber",
            "status",
            "updatedAt",
        ]);
    });
});
