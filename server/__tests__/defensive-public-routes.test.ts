import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express, { type Request } from "express";
import request from "supertest";
import type { IStorage } from "../storage/index.js";
import { MemoryStore } from "express-rate-limit";

const state = vi.hoisted(() => ({
  user: { id: "owner", role: "user", email: "owner@example.test", emailVerified: true, deletedAt: null },
  getUser: vi.fn(), sendEmail: vi.fn(), getGallerySubmissions: vi.fn(), getReview: vi.fn(), getProduct: vi.fn(),
  getReviews: vi.fn(), updateReview: vi.fn(), createReview: vi.fn(), updateProductRating: vi.fn(),
}));
vi.mock("../storage/index.js", () => ({ storage: state }));
vi.mock("../middleware/shared-rate-limit-store.js", () => ({ createSharedRateLimitStore: () => new MemoryStore() }));
vi.mock("../middleware/rate-limit.js", () => ({ reviewLimiter: (_req: unknown, _res: unknown, next: () => void) => next() }));
vi.mock("../utils/email.js", () => ({ sendEmail: state.sendEmail }));
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { errorHandler, OperationalError } from "../middleware/error-handler.js";
import { createGalleryRouter } from "../routes/gallery.js";
import { createReviewsRouter } from "../routes/reviews.js";
import { createFishRouter } from "../routes/fish.js";
import { breedingPlanEmailInput, buildBreedingPlanEmail, escapeEmailHtml } from "../services/breeding-plan-email.js";

let app: express.Express;
beforeAll(() => {
  app = express(); app.use(express.json());
  app.use((req, _res, next) => { Object.assign(req, { session: req.get("x-synthetic-user") ? { userId: "owner" } : {} }); next(); });
  app.get("/auth", requireAuth, (_req, res) => res.json({ ok: true }));
  app.get("/admin", requireAdmin, (_req, res) => res.json({ ok: true }));
  app.get("/error", (_req, _res, next) => next(new OperationalError("password=secret db host internal", 500)));
  app.use("/gallery", createGalleryRouter()); app.use("/reviews", createReviewsRouter());
  app.use("/fish", createFishRouter(state as unknown as IStorage));
  app.use(errorHandler);
});
beforeEach(() => {
  vi.clearAllMocks(); state.getUser.mockResolvedValue(state.user); state.sendEmail.mockResolvedValue(true);
  state.getProduct.mockResolvedValue({ id: "product", isStorefrontVisible: true, deletedAt: null });
  state.getReviews.mockResolvedValue([]); state.getReview.mockResolvedValue({ id: "review", productId: "product", userId: "owner" });
  state.createReview.mockImplementation(async (data: unknown) => data); state.updateReview.mockImplementation(async (_id: string, data: unknown) => data);
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("defensive HTTP boundaries", () => {
  it("forwards async auth failures and never exposes database error text", async () => {
    state.getUser.mockRejectedValue(new Error("password=secret db host internal"));
    for (const path of ["/auth", "/admin"]) {
      const result = await request(app).get(path).set("x-synthetic-user", "owner");
      expect(result.status).toBe(500); expect(result.body.requestId).toBeTruthy();
      expect(JSON.stringify(result.body)).not.toMatch(/secret|internal|password/);
    }
    expect((await request(app).get("/auth")).status).toBe(401);
    expect((await request(app).get("/error")).text).not.toContain("password");
  });
  it("projects private gallery fields out of both public aliases", async () => {
    state.getGallerySubmissions.mockResolvedValue([{ id: "entry", customerName: "Synthetic", imageUrl: "/image.png", likes: 2,
      customerPhone: "PRIVATE_PHONE", userId: "PRIVATE_USER", couponCode: "PRIVATE_COUPON", hasSeenCelebration: false, futureSecret: "PRIVATE_FUTURE" }]);
    for (const path of ["/gallery", "/gallery/submissions"]) {
      const result = await request(app).get(path); expect(result.status).toBe(200);
      expect(result.body[0]).toMatchObject({ id: "entry", customerName: "Synthetic", likes: 2 });
      expect(result.text).not.toContain("PRIVATE_"); expect(result.body[0]).not.toHaveProperty("hasSeenCelebration");
    }
  });
  it.each([{ rating: 3.5 }, { rating: "5" }, { rating: 8 }, { images: ["https://outside.test/payload.svg"] }, { title: "x".repeat(121) }])("rejects invalid review edits %j before writes", async body => {
    const result = await request(app).put("/reviews/reviews/review").set("x-synthetic-user", "owner").send(body);
    expect(result.status).toBe(400); expect(state.updateReview).not.toHaveBeenCalled();
  });
  it("cleans the same allowed fields on review creation and update", async () => {
    const body = { rating: 5, title: "<good>\u0001", comment: "useful", images: ["/images/review.png"] };
    const create = await request(app).post("/reviews/reviews").send({ ...body, productId: "product", guestName: "Guest" });
    const update = await request(app).put("/reviews/reviews/review").set("x-synthetic-user", "owner").send(body);
    expect(create.status).toBe(201); expect(update.status).toBe(200);
    expect(create.body.title).toBe("good"); expect(update.body.title).toBe("good");
    expect(update.body).not.toHaveProperty("productId");
  });
  it.each([
    undefined,
    { id: "product", isStorefrontVisible: false, deletedAt: null },
    { id: "product", isStorefrontVisible: true, deletedAt: new Date() },
  ])("does not expose or create reviews for an unavailable public product %j", async product => {
    state.getProduct.mockResolvedValue(product);
    const read = await request(app).get("/reviews/reviews/product");
    const create = await request(app).post("/reviews/reviews").send({ productId: "product", rating: 5, guestName: "Guest" });
    expect(read.status).toBe(404); expect(read.headers["cache-control"]).toBe("no-store");
    expect(create.status).toBe(404);
    expect(state.getReviews).not.toHaveBeenCalled(); expect(state.createReview).not.toHaveBeenCalled();
  });
  it("keeps public reviews available for visible coming-soon products without changing their price or status", async () => {
    state.getProduct.mockResolvedValue({ id: "product", isStorefrontVisible: true, deletedAt: null, price: "0", stock: 0, specifications: { __availabilityStatus: "coming_soon" } });
    state.getReviews.mockResolvedValue([{ id: "review", productId: "product", status: "approved", comment: "fixture", guestName: "Guest", ipAddress: "PRIVATE_IP" }]);
    const read = await request(app).get("/reviews/reviews/product");
    expect(read.status).toBe(200); expect(read.body).toHaveLength(1);
    expect(read.body[0]).toMatchObject({ id: "review", comment: "fixture", author: "Guest" });
    expect(read.text).not.toContain("PRIVATE_IP");
  });
});

const plan = { email: "owner@example.test", speciesId: "guppy", inputData: { pairs: 1, startDate: "2026-11-21", temp: 26, ph: 7 } };
describe("breeding plan email", () => {
  it("rejects anonymous requests before delivery", async () => {
    expect((await request(app).post("/fish/breeding-plan/email").send(plan)).status).toBe(401);
    expect(state.sendEmail).not.toHaveBeenCalled();
  });
  it("does not let a signed-in caller choose another recipient", async () => {
    const result = await request(app).post("/fish/breeding-plan/email").set("x-synthetic-user", "owner").send({ ...plan, email: "other@example.test" });
    expect(result.status).toBe(403); expect(state.sendEmail).not.toHaveBeenCalled();
  });
  it("ignores injected descriptive HTML and returns failure when the provider did not send", async () => {
    state.sendEmail.mockResolvedValue(false);
    const result = await request(app).post("/fish/breeding-plan/email").set("x-synthetic-user", "owner").send({
      ...plan, speciesData: { arabicName: '<img src="https://evil.test">' }, timeline: [{ eventAr: "INJECTED" }], yearlyProduction: 99999999,
    });
    expect(result.status).toBe(503); expect(result.body.success).not.toBe(true);
    const sent = state.sendEmail.mock.calls[0][0]; expect(sent.to).toBe("owner@example.test");
    expect(sent.html).toContain("غوبي"); expect(sent.html).not.toMatch(/evil\.test|INJECTED|99999999/);
  });
  it("validates dates/numeric ranges and escapes every HTML delimiter", () => {
    expect(breedingPlanEmailInput.safeParse({ ...plan, inputData: { ...plan.inputData, startDate: "2026-02-31" } }).success).toBe(false);
    expect(breedingPlanEmailInput.safeParse({ ...plan, inputData: { ...plan.inputData, pairs: -1 } }).success).toBe(false);
    expect(escapeEmailHtml('<a x="1">&\'' )).toBe("&lt;a x=&quot;1&quot;&gt;&amp;&#39;");
    expect(() => buildBreedingPlanEmail({ ...plan, speciesId: "nonexistent" })).toThrow();
  });
});
