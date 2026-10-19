/** Exercises real service implementations and PostgreSQL semantics with synthetic data.
 * Does not contact payment providers or claim multi-connection contention coverage.
 */
import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { OAuthGrantStore, canonicalScopes, narrowedScopes, validPkce } from "../services/oauth-grant-store.js";
import { assertCheckoutReplay, commercialRequestHash, persistCheckoutBinding } from "../services/checkout-request-binding.js";
import { applyUnpaidWaylObservation } from "../services/wayl-state-transition.js";
import { lockEligibleCoupon, couponAmounts } from "../services/coupon-policy.js";
import { projectNewOrderCosts } from "../services/order-cost-projection.js";
import { sessionProof, sessionMatchesUser } from "../security/session-proof.js";
import { buildProductCostSnapshot } from "../services/product-cost-snapshot.js";
import { toCustomerOrder } from "../../shared/public-order.js";
import { normalizeCheckoutItems } from "../../shared/checkout-items.js";
import { reconcileOrderLines, type RelationalLineSnapshot } from "../services/accounting-engine.js";
import type { SecurityDatabase } from "../services/security-db.js";
let pg: PGlite;
let db: SecurityDatabase;
const verifier = "v".repeat(64);
const challenge = createHash("sha256").update(verifier).digest("base64url");
const resource = "https://example.invalid/api/mcp";
const redirectUri = "https://client.example.invalid/callback";
const migration = readFileSync("migrations/0101_security_commerce_boundaries.sql", "utf8");
const checksum = createHash("sha256").update(migration).digest("hex");
const issue = async (scope = "mcp:read") => {
  const store = new OAuthGrantStore(db);
  const code = await store.issueCode({ clientId: "client-a", redirectUri, challenge, scope, resource });
  return { store, code, input: { code, clientId: "client-a", redirectUri, verifier, resource } };
};
const read = async (query: string) => (await pg.query<Record<string, any>>(query)).rows;
beforeAll(async () => {
  pg = new PGlite();
  db = drizzle(pg) as unknown as SecurityDatabase;
  await pg.exec(`
    CREATE TABLE users(id text PRIMARY KEY,password_hash text NOT NULL,role text NOT NULL,deleted_at timestamptz);
    CREATE TABLE sessions(sid text PRIMARY KEY,sess jsonb NOT NULL,expire timestamptz);
    CREATE TABLE orders(id text PRIMARY KEY,user_id text,total numeric DEFAULT 1000,rounded_total numeric DEFAULT 1000,
      status text DEFAULT 'pending',payment_status text DEFAULT 'pending',coupon_id text,items jsonb DEFAULT '[]',
      is_test boolean DEFAULT false,updated_at timestamptz DEFAULT now());
    CREATE TABLE payments(id text PRIMARY KEY,order_id text,method text DEFAULT 'wayl',status text DEFAULT 'pending',
      transaction_id text,amount numeric DEFAULT 1000,currency text DEFAULT 'IQD',provider_response jsonb DEFAULT '{}',updated_at timestamptz);
    CREATE TABLE payment_events(order_id text,method text,event_type text,status text,amount numeric);
    CREATE TABLE payment_stock_reservations(order_id text,status text DEFAULT 'active',release_reason text,updated_at timestamptz);
    CREATE TABLE coupons(id text PRIMARY KEY,code text,discount_type text,discount_value numeric,user_id text,
      used_count integer DEFAULT 0,max_uses integer,max_uses_per_user integer,min_order_amount numeric,
      is_active boolean DEFAULT true,start_date timestamptz,end_date timestamptz);
    CREATE TABLE order_items_relational(id text PRIMARY KEY,order_id text,product_id text,quantity integer,price_at_purchase numeric,
      metadata jsonb,unit_cost_price numeric,unit_packaging_cost numeric,unit_insert_cost numeric,cost_snapshot_status text,cost_snapshot_source text);
    CREATE TABLE schema_migrations(version text PRIMARY KEY,checksum text,notes text,rolled_back_at timestamptz,applied_at timestamptz DEFAULT now());
    BEGIN;
    SET LOCAL aquavo.migration_checksum='${checksum}';
  `);
  await pg.exec(migration);
  await pg.exec("COMMIT");
});
afterAll(async () => { await pg.close(); });
beforeEach(async () => {
  vi.stubEnv("SESSION_SECRET", "synthetic-unit-test-secret-not-a-live-credential");
  await pg.exec("TRUNCATE oauth_token_grants,oauth_authorizations,commerce_request_bindings,order_items_relational,payment_events,payment_stock_reservations,payments,orders,coupons,sessions,users CASCADE");
});
describe("persistent OAuth consent boundaries", () => {
  it("keeps read-only scope when another process rotates refresh", async () => {
    const { store, input } = await issue(); const first = await store.exchangeCode(input);
    const next = await new OAuthGrantStore(db).rotateRefresh({ token: first.refreshToken, clientId: "client-a", resource });
    expect(next.scope).toBe("mcp:read"); expect(next.refreshToken).not.toBe(first.refreshToken);
    expect(await store.isActive(next.grantId, "client-a", next.scope, resource)).toBe(true);
  });
  it("cannot broaden a read-only refresh into mcp write", async () => {
    const { store, input } = await issue(); const first = await store.exchangeCode(input);
    await expect(store.rotateRefresh({ token: first.refreshToken, clientId: "client-a", scope: "mcp" })).rejects.toThrow("invalid_scope");
    expect((await store.rotateRefresh({ token: first.refreshToken, clientId: "client-a" })).scope).toBe("mcp:read");
  });
  it("narrowing survives subsequent refreshes", async () => {
    const { store, input } = await issue("mcp"); const first = await store.exchangeCode(input);
    const narrow = await store.rotateRefresh({ token: first.refreshToken, clientId: "client-a", scope: "mcp:read" });
    await expect(store.rotateRefresh({ token: narrow.refreshToken, clientId: "client-a", scope: "mcp:write" })).rejects.toThrow("invalid_scope");
    expect((await store.rotateRefresh({ token: narrow.refreshToken, clientId: "client-a" })).scope).toBe("mcp:read");
  });
  it.each(["client", "resource", "redirect", "verifier"])("rejects wrong %s without consuming valid code", async (field) => {
    const { store, input } = await issue(); const bad = { ...input };
    if (field === "client") bad.clientId = "client-b";
    if (field === "resource") bad.resource = "https://other.invalid";
    if (field === "redirect") bad.redirectUri += "/other";
    if (field === "verifier") bad.verifier = "wrong".repeat(12);
    await expect(store.exchangeCode(bad)).rejects.toThrow("invalid_grant");
    expect((await store.exchangeCode(input)).scope).toBe("mcp:read");
  });
  it("commits family revocation on consumed refresh replay", async () => {
    const { store, input } = await issue(); const first = await store.exchangeCode(input);
    const next = await store.rotateRefresh({ token: first.refreshToken, clientId: "client-a" });
    await expect(store.rotateRefresh({ token: first.refreshToken, clientId: "client-a" })).rejects.toThrow("invalid_grant");
    expect(await store.isActive(next.grantId, "client-a", next.scope, resource)).toBe(false);
    await expect(store.rotateRefresh({ token: next.refreshToken, clientId: "client-a" })).rejects.toThrow("invalid_grant");
  });
  it("stores hashes, never raw codes or refresh credentials", async () => {
    const { store, code, input } = await issue(); const token = await store.exchangeCode(input);
    const rows = await read("SELECT token_hash,data FROM oauth_token_grants");
    expect(JSON.stringify(rows)).not.toContain(code); expect(JSON.stringify(rows)).not.toContain(token.refreshToken);
    expect(rows.every((row) => /^[0-9a-f]{64}$/.test(row.token_hash))).toBe(true);
  });
  it("expired codes and revoked grants remain invalid", async () => {
    const { store, input } = await issue(); await pg.exec("UPDATE oauth_token_grants SET expires_at=now()-interval '1 second'");
    await expect(store.exchangeCode(input)).rejects.toThrow("invalid_grant");
    const other = await issue(); const token = await other.store.exchangeCode(other.input);
    await other.store.revoke(token.refreshToken, "client-a");
    expect(await store.isActive(token.grantId, "client-a", token.scope, resource)).toBe(false);
  });
  it("validates scopes and requires PKCE S256", () => {
    expect(canonicalScopes(undefined)).toBe("mcp:read"); expect(() => canonicalScopes("mcp:admin")).toThrow();
    expect(() => narrowedScopes("mcp:read", "mcp:write")).toThrow();
    expect(validPkce(verifier, challenge)).toBe(true); expect(validPkce("short", "short")).toBe(false);
  });
});
describe("session revocation", () => {
  const user = { id: "admin-a", passwordHash: "hash-a", role: "admin", deletedAt: null };
  it("binds proof to password, role and active identity", () => {
    const session = { userId: user.id, authProof: sessionProof(user) };
    expect(sessionMatchesUser(session, user)).toBe(true);
    expect(sessionMatchesUser(session, { ...user, passwordHash: "hash-b" })).toBe(false);
    expect(sessionMatchesUser(session, { ...user, role: "user" })).toBe(false);
    expect(sessionMatchesUser(session, { ...user, deletedAt: new Date() })).toBe(false);
    expect(sessionMatchesUser({ userId: user.id }, user)).toBe(false);
  });
  it.each(["password_hash='new-hash'", "role='user'", "deleted_at=now()"])("atomically removes sessions on %s", async (change) => {
    await pg.exec(`INSERT INTO users VALUES('admin-a','old-hash','admin',NULL);
      INSERT INTO sessions VALUES('synthetic-session','{"userId":"admin-a"}',now()+interval '1 hour');
      UPDATE users SET ${change} WHERE id='admin-a';`);
    expect(await read("SELECT sid FROM sessions")).toHaveLength(0);
  });
});
describe("idempotency and public projection", () => {
  const payload = { items: [{ productId: "p", variantId: "small", quantity: 1 }], customerInfo: { name: "Synthetic customer", phone: "0000000000", address: "Synthetic address" } };
  const binding = { principalHash: "a".repeat(64), requestHash: commercialRequestHash(payload) };
  it("replays only identical principal and commercial request", async () => {
    await pg.exec("INSERT INTO orders(id) VALUES('own-order')");
    await db.transaction((tx) => persistCheckoutBinding(tx, "own-order", binding));
    await expect(assertCheckoutReplay(db, "own-order", binding)).resolves.toBeUndefined();
    await expect(assertCheckoutReplay(db, "own-order", { ...binding, principalHash: "b".repeat(64) })).rejects.toThrow();
    await expect(assertCheckoutReplay(db, "own-order", { ...binding, requestHash: "b".repeat(64) })).rejects.toThrow();
    await expect(assertCheckoutReplay(db, "legacy-order", binding)).rejects.toThrow();
  });
  it("normalizes ordering but not changed quantities or consent", () => {
    const a = { ...payload, items: [{ productId: "b", quantity: 1 }, { productId: "a", quantity: 2 }] };
    expect(commercialRequestHash(a)).toBe(commercialRequestHash({ ...a, items: [...a.items].reverse(), attribution: { ignored: "x" } }));
    expect(commercialRequestHash(a)).not.toBe(commercialRequestHash({ ...a, whatsappMarketingOptIn: true }));
    expect(() => normalizeCheckoutItems([{ productId: "a", quantity: 80 }, { productId: "a", quantity: 80 }])).toThrow();
  });
  it("does not serialize internal costs, IP or private metadata", () => {
    const out = toCustomerOrder({ id: "o", customerName: "Synthetic", clientIp: "private", costPrice: 123,
      items: [{ productId: "p", quantity: 1, priceAtPurchase: 1000, costPrice: 345, packagingCost: 6, metadata: { secret: "private" } }],
      shippingAddress: { addressLine1: "Synthetic address", internalNotes: "private" } });
    expect(out.id).toBe("o"); expect(JSON.stringify(out)).not.toMatch(/costPrice|packagingCost|internalNotes|clientIp|metadata/);
  });
});
describe("shared coupon boundary", () => {
  const add = async (extras = "") => pg.exec(`INSERT INTO coupons(id,code,discount_type,discount_value,user_id,max_uses,max_uses_per_user)
    VALUES('c','PRIVATE','percentage',3,'owner',1,1); ${extras}`);
  it("rejects another account or guest for private coupons", async () => {
    await add();
    await expect(db.transaction((tx) => lockEligibleCoupon(tx, "PRIVATE", "other", 10000))).rejects.toThrow();
    await expect(db.transaction((tx) => lockEligibleCoupon(tx, "PRIVATE", null, 10000))).rejects.toThrow();
    expect((await db.transaction((tx) => lockEligibleCoupon(tx, "private", "owner", 10000))).id).toBe("c");
  });
  it("reserves last redemption for an outstanding online quote", async () => {
    await add("INSERT INTO orders(id,coupon_id,user_id,status) VALUES('quote','c','owner','pending_payment')");
    await expect(db.transaction((tx) => lockEligibleCoupon(tx, "PRIVATE", "owner", 10000))).rejects.toThrow();
  });
  it("enforces per-account limit on unlimited public coupons", async () => {
    await add("UPDATE coupons SET max_uses=NULL,user_id=NULL; INSERT INTO orders(id,coupon_id,user_id,status) VALUES('old','c','owner','delivered')");
    await expect(db.transaction((tx) => lockEligibleCoupon(tx, "PRIVATE", "owner", 10000))).rejects.toThrow();
    expect((await db.transaction((tx) => lockEligibleCoupon(tx, "PRIVATE", "new", 10000))).id).toBe("c");
  });
  it("bounds discounts to merchandise and rejects invalid percentages", async () => {
    await add("UPDATE coupons SET discount_value=101");
    await expect(db.transaction((tx) => lockEligibleCoupon(tx, "PRIVATE", "owner", 10000))).rejects.toThrow();
    expect(couponAmounts({ id: "x", code: "x", type: "fixed", value: "9000", minOrderAmount: null }, 1000, 5000)).toEqual({ discount: 1000, shipping: 5000 });
  });
});
describe("late payment observations", () => {
  const seed = async (paid = false) => {
    await pg.exec(`INSERT INTO orders(id,status,payment_status) VALUES('o','pending','${paid ? "paid" : "pending"}');
      INSERT INTO payments(id,order_id,transaction_id,status,provider_response) VALUES('pay','o','o','${paid ? "completed" : "pending"}','{"attempts":[{"referenceId":"o","status":"Pending"}]}');
      INSERT INTO payment_stock_reservations(order_id) VALUES('o');`);
    if (paid) await pg.exec("INSERT INTO payment_events VALUES('o','wayl','capture','completed',1000)");
  };
  const obs = { orderId: "o", referenceId: "o", amount: 1000, currency: "IQD", providerStatus: "Pending", mappedStatus: "pending" as const };
  it("late pending cannot overwrite a completed capture", async () => {
    await seed(true); expect(await applyUnpaidWaylObservation(db, obs)).toMatchObject({ paymentStatus: "paid", applied: false });
    expect((await read("SELECT status FROM payments"))[0].status).toBe("completed");
  });
  it("late failure cannot release a paid reservation", async () => {
    await seed(true); await applyUnpaidWaylObservation(db, { ...obs, mappedStatus: "failed", providerStatus: "Rejected" });
    expect((await read("SELECT status FROM payment_stock_reservations"))[0].status).toBe("active");
  });
  it("fresh nonpaid result updates and releases atomically", async () => {
    await seed(); expect((await applyUnpaidWaylObservation(db, { ...obs, mappedStatus: "failed", providerStatus: "Rejected" })).applied).toBe(true);
    expect((await read("SELECT payment_status FROM orders"))[0].payment_status).toBe("failed");
    expect((await read("SELECT status FROM payment_stock_reservations"))[0].status).toBe("released");
  });
  it("ignores older payment attempts", async () => {
    await seed(); await pg.exec("UPDATE payments SET transaction_id='o#r1'");
    expect((await applyUnpaidWaylObservation(db, obs)).applied).toBe(false);
  });
  it("rejects changed amount without mutating state", async () => {
    await seed(); await expect(applyUnpaidWaylObservation(db, { ...obs, amount: 1 })).rejects.toThrow("mismatch");
    expect((await read("SELECT status FROM payments"))[0].status).toBe("pending");
  });
  it("database guards prevent paid state regression", async () => {
    await seed(true);
    await expect(pg.exec("UPDATE payments SET status='pending'")).rejects.toThrow("CANNOT_REGRESS");
    await expect(pg.exec("UPDATE orders SET payment_status='pending'")).rejects.toThrow("CANNOT_REGRESS");
  });
  it("documented refunds stay terminal", async () => {
    await seed(true); await pg.exec("UPDATE payments SET status='refunded'; UPDATE orders SET payment_status='refunded'");
    expect((await applyUnpaidWaylObservation(db, obs)).paymentStatus).toBe("refunded");
    await expect(pg.exec("UPDATE payments SET status='completed'")).rejects.toThrow("CANNOT_REGRESS");
    await expect(pg.exec("UPDATE orders SET payment_status='paid'")).rejects.toThrow("CANNOT_REGRESS");
  });
  it("does not apply Wayl state rules to COD corrections", async () => {
    await seed(true); await pg.exec("UPDATE payments SET method='cash_on_delivery'; UPDATE orders SET payment_status='pending'");
    expect((await read("SELECT payment_status FROM orders"))[0].payment_status).toBe("pending");
  });
});
describe("new-order cost projection", () => {
  const product = { costPrice: 436, packagingCost: 0, insertCost: 0, costPriceResolution: "known", packagingCostResolution: "verified_zero", insertCostResolution: "verified_zero", variants: [{ id: "small", costPrice: 50, costStatus: "verified_derived" }] };
  it("uses selected option cost and never fabricates unknown zero", () => {
    expect(buildProductCostSnapshot(product, new Date(), "small").costPrice).toBe(50);
    expect(buildProductCostSnapshot({ costPrice: 0, costPriceResolution: "unresolved" }).costPrice).toBeNull();
  });
  it("projects new lines but refuses historical mutation", async () => {
    await pg.exec(`INSERT INTO orders(id,status) VALUES('o','pending');
      INSERT INTO order_items_relational VALUES('l','o','p',1,100,'{"variantId":"small"}',50,0,0,'exact','product_current');`);
    const order = { id: "o", items: [{ productId: "p", variantId: "small", quantity: 1, priceAtPurchase: 100, costPrice: 436 }] };
    await db.transaction((tx) => projectNewOrderCosts(tx, order)); expect(order.items[0].costPrice).toBe(50);
    await pg.exec("UPDATE orders SET status='delivered'");
    await expect(db.transaction((tx) => projectNewOrderCosts(tx, order))).rejects.toThrow("historical");
    expect((await read("SELECT items FROM orders"))[0].items[0].costPrice).toBe(50);
  });
});
describe("cost identity independent of row order", () => {
  const row = (variantId: string, costPrice: number): RelationalLineSnapshot => ({ orderId: "o", productId: "p", variantId, quantity: 1, priceAtPurchase: 1000, costPrice, packagingCost: 0, insertCost: 0, costStatus: "exact", costSource: "product_current" });
  const json = ["small", "large"].map((variantId) => ({ productId: "p", variantId, quantity: 1, priceAtPurchase: 1000 }));
  it("pairs reversed option rows by identity", () => {
    const out = reconcileOrderLines(json, [row("large", 800), row("small", 100)]);
    expect(out.reconciled).toBe(true); expect(out.items.map((line) => line.costPrice)).toEqual([100, 800]);
  });
  it("flags ambiguous legacy options instead of inventing matches", () => {
    const out = reconcileOrderLines(json, [row("", 800), row("", 100)]);
    expect(out.reconciled).toBe(false); expect(out.sourceOfTruth).toBe("jsonb");
  });
});
