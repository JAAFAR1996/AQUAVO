import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import express from "express";
import request from "supertest";
import * as schema from "../../shared/schema.js";
import { getDb } from "../db.js";
import { errorHandler } from "../middleware/error-handler.js";
import { createAccountEmailVerificationRouter } from "../routes/account-email-verification.js";
import { sendEmail } from "../utils/email.js";
import { storage } from "../storage/index.js";
import { UserStorage } from "../storage/user-storage.js";
import { createFishRouter } from "../routes/fish.js";

vi.mock("../db.js", () => ({ getDb: vi.fn() }));
vi.mock("../utils/email.js", () => ({ sendEmail: vi.fn() }));
vi.mock("../storage/index.js", () => ({ storage: { getUser: vi.fn() } }));

let pg: PGlite;
let db: ReturnType<typeof drizzle<typeof schema>>;
type RuntimeDb = NonNullable<ReturnType<typeof getDb>>;
function makeApp() {
  const result = express(); result.use(express.json());
  result.use((req, _res, next) => { Object.assign(req, { session: { userId: req.get("x-user") } }); next(); });
  result.use("/verify", createAccountEmailVerificationRouter()); result.use(errorHandler);
  return result;
}
const app = makeApp();
const replica = makeApp();
const post = (path: string, body: object = {}, user = "owner", target = app) => request(target).post(`/verify/${path}`).set("x-user", user).send(body);
const row = async () => (await db.select().from(schema.users).where(eq(schema.users.id, "owner")))[0];
const code = () => {
  const text = vi.mocked(sendEmail).mock.calls.at(-1)?.[0].text;
  const value = text?.match(/\b[0-9]{8}\b/)?.[0];
  if (!value) throw new Error("Synthetic email did not contain its eight-digit verification code");
  return value;
};

beforeAll(async () => {
  pg = new PGlite(); await pg.waitReady; await pg.exec("SET TIME ZONE 'UTC'");
  for (const table of [schema.users, schema.rateLimitBuckets]) {
    const config = getTableConfig(table);
    const columns = config.columns.map(column => `"${column.name}" ${column.getSQLType()}${column.primary ? " PRIMARY KEY" : ""}`);
    await pg.exec(`CREATE TABLE "${config.name}" (${columns.join(",")})`);
  }
  db = drizzle(pg, { schema });
  vi.mocked(getDb).mockImplementation(() => db as unknown as RuntimeDb);
  vi.mocked(storage.getUser).mockImplementation(async id => (await db.select().from(schema.users).where(eq(schema.users.id, id)))[0]);
  vi.stubEnv("EMAIL_VERIFICATION_SECRET", "synthetic-test-secret-longer-than-thirty-two-characters");
});
beforeEach(async () => {
  await pg.exec("TRUNCATE users, rate_limit_buckets");
  await db.insert(schema.users).values([
    { id: "owner", email: "owner@example.test", emailVerified: false, passwordHash: "synthetic", role: "user" },
    { id: "other", email: "other@example.test", emailVerified: false, passwordHash: "synthetic", role: "user" },
  ]);
  vi.mocked(sendEmail).mockReset().mockResolvedValue(true);
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());
afterAll(async () => { await pg?.close(); vi.unstubAllEnvs(); });

describe("account email verification via its real HTTP router and shared database budgets", () => {
  it("requires an account, reads status without sending, and rejects caller-chosen recipients", async () => {
    expect((await request(app).post("/verify/request").send({})).status).toBe(401);
    expect((await request(app).get("/verify").set("x-user", "owner")).body).toEqual({ verified: false });
    expect((await post("request", { email: "victim@example.test", userId: "other", html: "untrusted" })).status).toBe(400);
    expect(sendEmail).not.toHaveBeenCalled();
    expect((await row()).verificationToken).toBeNull();
  });

  it("stores only a keyed digest and consumes the correct account's code once under concurrent confirmation", async () => {
    const issued = await post("request");
    expect(issued.status).toBe(200); expect(issued.body).toEqual({ verified: false, expiresInSeconds: 600, retryAfterSeconds: 60 });
    const secretCode = code();
    const pending = await request(app).get("/verify").set("x-user", "owner");
    expect(pending.body).toMatchObject({ verified: false, codePending: true });
    expect(pending.headers["cache-control"]).toBe("private, no-store");
    expect(pending.text).not.toContain(secretCode);
    expect((await row()).verificationToken).toMatch(/^account-email-v1:[0-9a-f]{32}:[0-9a-f]{64}$/);
    expect((await row()).verificationToken).not.toContain(`:${secretCode}`);
    expect((await row()).emailVerified).toBe(false);
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "owner@example.test", sensitive: true }));
    expect(issued.text).not.toContain(secretCode);
    const results = await Promise.all([post("confirm", { code: secretCode }), post("confirm", { code: secretCode }, "owner", replica)]);
    expect(results.map(result => result.status).sort()).toEqual([200, 400]);
    expect(await row()).toMatchObject({ emailVerified: true, verificationToken: null, verificationTokenExpiresAt: null });
    expect((await post("confirm", { code: secretCode })).status).toBe(400);
    expect((await request(app).get("/verify").set("x-user", "owner")).body).toEqual({ verified: true });
  });

  it.each(["other account", "expired code", "changed email"])("rejects %s without marking either account as verified", async scenario => {
    expect((await post("request")).status).toBe(200); const secretCode = code();
    if (scenario === "expired code") await db.update(schema.users).set({ verificationTokenExpiresAt: new Date(Date.now() - 1) }).where(eq(schema.users.id, "owner"));
    if (scenario === "changed email") await db.update(schema.users).set({ email: "replacement@example.test" }).where(eq(schema.users.id, "owner"));
    expect((await post("confirm", { code: secretCode }, scenario === "other account" ? "other" : "owner")).status).toBe(400);
    expect((await db.select().from(schema.users)).every(user => user.emailVerified === false)).toBe(true);
  });

  it.each(["false result", "exception"])("clears the unused token and reports failed delivery on %s", async failure => {
    if (failure === "false result") vi.mocked(sendEmail).mockResolvedValueOnce(false);
    else vi.mocked(sendEmail).mockRejectedValueOnce(new Error("SENSITIVE_PROVIDER_BODY"));
    const result = await post("request");
    expect(result.status).toBe(503); expect(result.body.verified).not.toBe(true);
    expect(await row()).toMatchObject({ emailVerified: false, verificationToken: null, verificationTokenExpiresAt: null });
    expect(result.text).not.toMatch(/SENSITIVE_PROVIDER_BODY|account-email-v1/);
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("SENSITIVE_PROVIDER_BODY");
  });

  it("limits confirmation attempts per account across app instances without resetting on a new request", async () => {
    await post("request"); const secretCode = code(); const wrong = secretCode === "00000000" ? "11111111" : "00000000";
    for (let index = 0; index < 5; index++) expect((await post("confirm", { code: wrong }, "owner", index % 2 ? app : replica)).status).toBe(400);
    expect((await post("confirm", { code: secretCode })).status).toBe(429);
    expect((await row()).emailVerified).toBe(false);
    const buckets = await db.select().from(schema.rateLimitBuckets);
    expect(buckets.some(bucket => bucket.key.startsWith("email-verification-confirm-account:") && bucket.hits === 6)).toBe(true);
    expect(JSON.stringify(buckets)).not.toContain("owner@example.test");
  });

  it("revokes verified state and outstanding codes on every explicit storage email write", async () => {
    await post("request"); const oldCode = code();
    await post("confirm", { code: oldCode });
    expect((await row()).emailVerified).toBe(true);
    const users = new UserStorage();
    await users.updateUser("owner", { fullName: "Updated name" });
    expect((await row()).emailVerified).toBe(true); // An unrelated profile edit preserves proof.
    await users.updateUser("owner", { email: "replacement@example.test", emailVerified: true,
      verificationToken: "CALLER_SUPPLIED_TOKEN", verificationTokenExpiresAt: new Date(Date.now() + 600_000) });
    expect(await row()).toMatchObject({ email: "replacement@example.test", emailVerified: false,
      verificationToken: null, verificationTokenExpiresAt: null });
    expect((await post("confirm", { code: oldCode })).status).toBe(400);
    expect((await request(app).get("/verify").set("x-user", "owner")).body).toEqual({ verified: false });
  });

  it("enforces cooldown and hourly account/IP send budgets before any further mail", async () => {
    expect((await post("request")).status).toBe(200);
    expect((await post("request")).status).toBe(429); // One-minute resend cooldown.
    await db.update(schema.users).set({ verificationTokenExpiresAt: new Date(Date.now() + 8 * 60_000) }).where(eq(schema.users.id, "owner"));
    expect((await post("request")).status).toBe(200);
    expect((await post("request")).status).toBe(429); // Three attempts consume the account's hour.
    expect(sendEmail).toHaveBeenCalledTimes(2);
    expect((await row()).emailVerified).toBe(false);
    expect((await db.select().from(schema.rateLimitBuckets)).some(bucket => bucket.key.startsWith("email-verification-request-ip:") && bucket.hits === 4)).toBe(true);
  });

  it("preserves another active verification-token purpose and fails closed without a strong secret", async () => {
    await db.update(schema.users).set({ verificationToken: "legacy-purpose:opaque", verificationTokenExpiresAt: new Date(Date.now() + 60_000) }).where(eq(schema.users.id, "owner"));
    expect((await post("request")).status).toBe(409);
    expect((await row()).verificationToken).toBe("legacy-purpose:opaque");
    await db.update(schema.users).set({ verificationToken: null, verificationTokenExpiresAt: null }).where(eq(schema.users.id, "owner"));
    vi.stubEnv("EMAIL_VERIFICATION_SECRET", "short");
    try { expect((await post("request")).status).toBe(503); }
    finally { vi.stubEnv("EMAIL_VERIFICATION_SECRET", "synthetic-test-secret-longer-than-thirty-two-characters"); }
    expect((await row()).verificationToken).toBeNull(); expect(sendEmail).not.toHaveBeenCalled();
  });

  it("unlocks plan delivery only after confirmation through the mounted customer URLs", async () => {
    const site = express(); site.use(express.json());
    site.use((req, _res, next) => { Object.assign(req, { session: { userId: "owner" } }); next(); });
    site.use("/api/fish", createFishRouter(storage)); site.use(errorHandler);
    const plan = { speciesId: "guppy", inputData: { pairs: 1, startDate: "2026-11-21", temp: 26, ph: 7 } };
    expect((await request(site).post("/api/fish/breeding-plan/email").send(plan)).status).toBe(403);
    expect(sendEmail).not.toHaveBeenCalled();
    expect((await request(site).post("/api/fish/breeding-plan/email/verification/request").send({})).status).toBe(200);
    expect((await request(site).post("/api/fish/breeding-plan/email/verification/confirm").send({ code: code() })).status).toBe(200);
    expect(sendEmail).toHaveBeenCalledTimes(1); // Confirmation itself never sends a plan.
    expect((await request(site).post("/api/fish/breeding-plan/email").send(plan)).body).toEqual({ success: true });
    expect(sendEmail).toHaveBeenCalledTimes(2);
    expect(vi.mocked(sendEmail).mock.calls[1][0]).toMatchObject({ to: "owner@example.test" });
  });
});
