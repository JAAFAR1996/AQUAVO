import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { createHash } from "node:crypto";

const state = vi.hoisted(() => ({
  uploadImage: vi.fn(), uploadDocument: vi.fn(), accountingUser: { id: "admin", role: "admin", email: "admin@example.test", fullName: "Admin" },
}));
vi.mock("../storage/index.js", () => ({ storage: { getUser: async (id: string) => ({ id, role: id.includes("admin") ? "admin" : "user", deletedAt: null }) } }));
vi.mock("../db.js", () => ({ getDb: () => ({ select: () => ({ from: () => ({ where: () => ({ limit: async () => [state.accountingUser] }) }) }) }) }));
vi.mock("../middleware/shared-rate-limit-store.js", async () => {
  const { MemoryStore } = await import("express-rate-limit");
  return { createSharedRateLimitStore: () => new MemoryStore() };
});
vi.mock("../utils/cloudinary.js", () => ({ uploadImage: state.uploadImage, uploadAccountingDocument: state.uploadDocument }));
import { createUploadRouter } from "../routes/upload.js";
import { createAccountingEvidenceUploadV2Router } from "../routes/accounting-evidence-upload-v2.js";
import { errorHandler } from "../middleware/error-handler.js";
import { MAX_ACCOUNTING_DOCUMENT_BYTES } from "../middleware/accounting-document-upload.js";

let app: express.Express;
const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0]);
const pdf = Buffer.from("%PDF-1.7\n% synthetic fixture\n%%EOF\n");
beforeAll(() => {
  app = express();
  app.use((req, _res, next) => { Object.assign(req, { session: req.get("x-user") ? { userId: req.get("x-user") } : {} }); next(); });
  app.use("/legacy", createUploadRouter()); app.use("/isolated", createAccountingEvidenceUploadV2Router());
  app.use(errorHandler);
});
beforeEach(() => {
  vi.clearAllMocks(); state.accountingUser.role = "admin";
  state.uploadImage.mockResolvedValue("https://media.example.test/image.png");
  state.uploadDocument.mockResolvedValue({ secureUrl: "https://media.example.test/document.pdf", publicId: "synthetic", resourceType: "raw", format: "pdf", bytes: pdf.length });
});

describe("accounting evidence route boundary", () => {
  it.each(["legacy", "isolated"])("keeps %s evidence behind admin before provider calls", async surface => {
    expect((await request(app).post(`/${surface}/accounting-evidence`).attach("document", pdf, { filename: "receipt.pdf", contentType: "application/pdf" })).status).toBe(401);
    state.accountingUser.role = "user";
    expect((await request(app).post(`/${surface}/accounting-evidence`).set("x-user", "customer").attach("document", pdf, { filename: "receipt.pdf", contentType: "application/pdf" })).status).toBe(403);
    expect(state.uploadDocument).not.toHaveBeenCalled();
  });
  it.each(["legacy", "isolated"])("rejects SVG, spoofed PDF and MIME mismatch on %s", async surface => {
    for (const [bytes, mime, name] of [
      [Buffer.from('<svg onload="alert(1)"></svg>'), "image/svg+xml", "image.svg"],
      [Buffer.from("<html>active document</html>"), "application/pdf", "fake.pdf"],
      [png, "application/pdf", "wrong.pdf"],
    ] as const) {
      expect((await request(app).post(`/${surface}/accounting-evidence`).set("x-user", "admin").attach("document", bytes, { filename: name, contentType: mime })).status).toBe(400);
    }
    expect(state.uploadDocument).not.toHaveBeenCalled();
  });
  it("preserves supported original PDF bytes and their SHA-256", async () => {
    const result = await request(app).post("/isolated/accounting-evidence").set("x-user", "admin").attach("document", pdf, { filename: "receipt.pdf", contentType: "application/pdf" });
    expect(result.status).toBe(201); expect(result.body.sha256).toBe(createHash("sha256").update(pdf).digest("hex"));
    expect(state.uploadDocument).toHaveBeenCalledWith(`data:application/pdf;base64,${pdf.toString("base64")}`, "receipt.pdf");
  });
  it("rejects excessive size and unexpected fields before uploading", async () => {
    const tooLarge = Buffer.concat([pdf, Buffer.alloc(MAX_ACCOUNTING_DOCUMENT_BYTES)]);
    expect((await request(app).post("/isolated/accounting-evidence").set("x-user", "admin").attach("document", tooLarge, { filename: "large.pdf", contentType: "application/pdf" })).status).toBe(413);
    expect((await request(app).post("/isolated/accounting-evidence").set("x-user", "admin").field("extra", "unexpected").attach("document", pdf, { filename: "receipt.pdf", contentType: "application/pdf" })).status).toBe(400);
    expect(state.uploadDocument).not.toHaveBeenCalled();
  });
  it("shares the account budget across both routes", async () => {
    for (let index = 0; index < 30; index++) {
      const route = index % 2 ? "legacy" : "isolated";
      expect((await request(app).post(`/${route}/accounting-evidence`).set("x-user", "budget-admin").attach("document", png, { filename: "receipt.png", contentType: "image/png" })).status).toBe(201);
    }
    expect((await request(app).post("/isolated/accounting-evidence").set("x-user", "budget-admin").attach("document", png, { filename: "receipt.png", contentType: "image/png" })).status).toBe(429);
    expect(state.uploadDocument).toHaveBeenCalledTimes(30);
  });
  it("checks every image in a batch before the first provider call", async () => {
    const result = await request(app).post("/legacy/images").set("x-user", "customer")
      .attach("images", png, { filename: "good.png", contentType: "image/png" })
      .attach("images", Buffer.from("not an image"), { filename: "bad.png", contentType: "image/png" });
    expect(result.status).toBe(400); expect(state.uploadImage).not.toHaveBeenCalled();
  });
});
