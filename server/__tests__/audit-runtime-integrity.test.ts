import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { SQL, eq } from "drizzle-orm";
import { getTableConfig, PgDialect, type PgTable } from "drizzle-orm/pg-core";
import type { Options } from "express-rate-limit";
import { readFileSync } from "node:fs";
import { createHash, randomInt } from "node:crypto";
import * as schema from "../../shared/schema.js";
import { getDb } from "../db.js";
import { createExpenseOnce } from "../services/expense-creation.js";
import { SharedRateLimitStore } from "../middleware/shared-rate-limit-store.js";
import { OrderStorage } from "../storage/order-storage.js";
import { LoyaltyStorage } from "../storage/loyalty-storage.js";
import { WinbackEngine } from "../storage/winback-engine.js";
import { transitionAdminOrderStatus } from "../routes/admin-orders-v2.js";
import { applyPackagingLifecycle } from "../services/packaging-lifecycle-runner.js";

vi.mock("../db.js", () => ({ getDb: vi.fn() }));
vi.mock("node:crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:crypto")>();
  const mockedRandomInt = vi.fn(actual.randomInt);
  return { ...actual, randomInt: mockedRandomInt, default: { ...actual, randomInt: mockedRandomInt } };
});
vi.mock("../services/packaging-lifecycle-runner.js", () => ({applyPackagingLifecycle:vi.fn()}));
vi.mock("../services/order-return-automation-v2.js", () => ({syncAutomaticReturnLifecycle:vi.fn().mockResolvedValue({eventId:null,action:"none"})}));
let pg: PGlite;
let testDb: ReturnType<typeof drizzle<typeof schema>>;
type RuntimeDb = NonNullable<ReturnType<typeof getDb>>;

// These are isolated PostgreSQL fixtures, never the runtime application DB.
// Include every selected column to catch mismatches between typed reads and DDL.
function tableDdl(table: PgTable): string {
  const config = getTableConfig(table);
  const dialect = new PgDialect();
  const columns = config.columns.map(column => {
    let value = `"${column.name}" ${column.getSQLType()}`;
    if (column.primary) value += " PRIMARY KEY";
    if (column.notNull) value += " NOT NULL";
    const fallback = column.default;
    if (fallback !== undefined) {
      const literal = fallback instanceof SQL ? dialect.sqlToQuery(fallback).sql
        : fallback === null ? "NULL"
        : typeof fallback === "number" || typeof fallback === "boolean" ? String(fallback)
        : `'${(typeof fallback === "string" ? fallback : JSON.stringify(fallback)).replace(/'/g, "''")}'`;
      value += ` DEFAULT ${literal}`;
    }
    return value;
  });
  return `CREATE TABLE "${config.name}" (${columns.join(",")});`;
}

beforeAll(async () => {
  pg = new PGlite();
  await pg.waitReady;
  await pg.exec("SET TIME ZONE 'UTC'");
  for (const table of [schema.expenses, schema.accountingAuditTrail, schema.users, schema.orders,
    schema.products, schema.gallerySubmissions, schema.galleryVotes, schema.loyaltyTransactions,
    schema.loyaltyCoupons, schema.reviews]) await pg.exec(tableDdl(table));
  await pg.exec("ALTER TABLE orders ADD COLUMN IF NOT EXISTS carrier_fee numeric, ADD COLUMN IF NOT EXISTS client_ip text; CREATE TABLE delivery_companies(id text PRIMARY KEY,name text,default_fee numeric,active boolean,is_default boolean);");
  await pg.exec("CREATE TABLE schema_migrations(version text primary key, checksum text, notes text);");
  const migration = readFileSync("migrations/0107_audit_runtime_integrity.sql", "utf8");
  await pg.query("SELECT set_config('aquavo.migration_checksum',$1,false)", [createHash("sha256").update(migration).digest("hex")]);
  await pg.exec(migration);
  testDb = drizzle(pg, { schema });
  vi.mocked(getDb).mockReturnValue(testDb as unknown as RuntimeDb);
});

beforeEach(async () => {
  await pg.exec("TRUNCATE expenses, accounting_audit_trail, mutation_receipts, rate_limit_buckets, users, orders, gallery_submissions, gallery_votes, loyalty_transactions, loyalty_coupons, reviews;");
  vi.mocked(applyPackagingLifecycle).mockReset().mockResolvedValue({action:"none",detail:"no_fulfillment_event",reasonAr:"Synthetic fixture"});
});
afterAll(async () => { await pg?.close(); });

const expenseInput = { category: "other" as const, amount: 2500, expenseDate: "2026-11-21", description: "Synthetic fixture", isRecurring:false };
const actor = { id: "test-admin", name: "Test operator" };
const key = "59e075be-bdba-4dab-8104-b862463e1a99";
const runtimeDb = () => testDb as unknown as RuntimeDb;

describe("atomic expense writes and retries", () => {
  it("reuses the same expense and audit entry for simultaneous retries", async () => {
    const results = await Promise.all(Array.from({length:4}, () => createExpenseOnce(runtimeDb(), expenseInput, actor, key)));
    expect(new Set(results.map(result => result.expense.id)).size).toBe(1);
    expect(results.filter(result => !result.replayed)).toHaveLength(1);
    expect(await testDb.select().from(schema.expenses)).toHaveLength(1);
    expect(await testDb.select().from(schema.accountingAuditTrail)).toHaveLength(1);
  });
  it("rejects a changed payload under an existing key and scopes keys by actor", async () => {
    await createExpenseOnce(runtimeDb(), expenseInput, actor, key);
    await expect(createExpenseOnce(runtimeDb(), {...expenseInput, amount:5000}, actor, key)).rejects.toMatchObject({statusCode:409});
    await createExpenseOnce(runtimeDb(), expenseInput, {...actor, id:"another-admin"}, key);
    expect(await testDb.select().from(schema.expenses)).toHaveLength(2);
  });
  it("rolls back expense and receipt if the audit write fails, then permits a safe retry", async () => {
    await pg.exec(`CREATE FUNCTION reject_audit_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic audit failure'; END $$;
      CREATE TRIGGER reject_audit_test BEFORE INSERT ON accounting_audit_trail FOR EACH ROW EXECUTE FUNCTION reject_audit_test();`);
    try {
      await expect(createExpenseOnce(runtimeDb(), expenseInput, actor, key)).rejects.toBeTruthy();
      expect(await testDb.select().from(schema.expenses)).toHaveLength(0);
      expect(await testDb.select().from(schema.mutationReceipts)).toHaveLength(0);
    } finally { await pg.exec("DROP TRIGGER reject_audit_test ON accounting_audit_trail; DROP FUNCTION reject_audit_test();"); }
    expect((await createExpenseOnce(runtimeDb(), expenseInput, actor, key)).replayed).toBe(false);
  });
});

describe("shared abuse budgets", () => {
  const store = (namespace = "test") => { const result = new SharedRateLimitStore(namespace); result.init({windowMs:60000} as Options); return result; };
  it("cleans old expired buckets while retaining active and newly incremented counters", async () => {
    await testDb.insert(schema.rateLimitBuckets).values([
      { key: "old-fixture", hits: 3, expiresAt: new Date(Date.now() - 3 * 86_400_000) },
      { key: "active-fixture", hits: 7, expiresAt: new Date(Date.now() + 60_000) },
    ]);
    vi.mocked(randomInt).mockReturnValueOnce(0);
    expect((await store().increment("synthetic-session")).totalHits).toBe(1);
    const remaining = await testDb.select().from(schema.rateLimitBuckets);
    expect(remaining).toHaveLength(2);
    expect(remaining.some(row => row.key === "old-fixture")).toBe(false);
    expect(remaining.find(row => row.key === "active-fixture")?.hits).toBe(7);
  });
  it("shares atomic counters between new store instances and stores no raw IP", async () => {
    const a = store(), b = store();
    const results = await Promise.all(Array.from({length:12}, (_,index) => (index % 2 ? a : b).increment("203.0.113.8")));
    expect(results.map(result => result.totalHits).sort((x,y) => x-y)).toEqual(Array.from({length:12}, (_,i) => i+1));
    const [row] = await testDb.select().from(schema.rateLimitBuckets);
    expect(row.key).not.toContain("203.0.113.8");
    expect(row.expiresAt.getTime() - Date.now()).toBeGreaterThan(55000);
  });
  it("resets expired windows, isolates namespaces and never decrements below zero", async () => {
    const a = store(), b = store("another");
    await a.increment("account");
    expect((await b.increment("account")).totalHits).toBe(1);
    await pg.exec("UPDATE rate_limit_buckets SET expires_at=now()-interval '1 second' WHERE key LIKE 'test:%'");
    expect((await a.increment("account")).totalHits).toBe(1);
    await a.decrement("account"); await a.decrement("account");
    expect((await a.increment("account")).totalHits).toBe(1);
  });
  it("fails closed when shared storage is unavailable", async () => {
    vi.mocked(getDb).mockReturnValueOnce(null);
    await expect(store().increment("account")).rejects.toThrow("unavailable");
  });
});

describe("gallery vote integrity", () => {
  it("accepts one vote per entry/identity and updates the counter in the same transaction", async () => {
    await testDb.insert(schema.gallerySubmissions).values({id:"entry",customerName:"Fixture",imageUrl:"https://example.invalid/photo.png",isApproved:true});
    const storage = new OrderStorage();
    const votes = await Promise.all(Array.from({length:5}, () => storage.voteGallerySubmission("entry","203.0.113.8","owner")));
    expect(votes.filter(Boolean)).toHaveLength(1);
    expect(await testDb.select().from(schema.galleryVotes)).toHaveLength(1);
    const [entry] = await testDb.select().from(schema.gallerySubmissions);
    expect(entry.likes).toBe(1);
    expect(await storage.voteGallerySubmission("entry","203.0.113.9","owner")).toBe(false);
  });
  it("rejects unapproved and missing entries", async () => {
    await testDb.insert(schema.gallerySubmissions).values({id:"entry",customerName:"Fixture",imageUrl:"https://example.invalid/photo.png",isApproved:false});
    const storage = new OrderStorage();
    expect(await storage.voteGallerySubmission("entry","203.0.113.8")).toBe(false);
    expect(await storage.voteGallerySubmission("missing","203.0.113.8")).toBe(false);
  });
});

async function insertUser() {
  await testDb.insert(schema.users).values({id:"member",email:"fixture@example.invalid",passwordHash:"not-a-real-password"});
}
describe("reward balances and ledger", () => {
  it("issues only one winback coupon for an absence period", async () => {
    await insertUser();
    await testDb.insert(schema.orders).values({id:"past-order",userId:"member",total:"10000",items:[],status:"delivered",createdAt:new Date(Date.now()-100*86400000)});
    const engine = new WinbackEngine();
    const responses = await Promise.all([engine.checkWinback("member"),engine.checkWinback("member")]);
    expect(responses.filter(result => result.type === "discount")).toHaveLength(1);
    expect(await testDb.select().from(schema.loyaltyCoupons)).toHaveLength(1);
    expect(await testDb.select().from(schema.loyaltyTransactions)).toHaveLength(1);
  });
  it("grants welcome and profile points once even for repeated requests", async () => {
    await insertUser(); const loyalty = new LoyaltyStorage();
    const welcomes = await Promise.all([loyalty.awardWelcomeBonus("member"),loyalty.awardWelcomeBonus("member")]);
    expect(welcomes.reduce((sum,n) => sum+n,0)).toBe(20);
    const profile = {tankSize:"small",fishType:"freshwater",mainProblem:"feeding",tankAge:"new"};
    const quizzes = await Promise.all([loyalty.saveAquariumProfile("member",profile),loyalty.saveAquariumProfile("member",profile)]);
    expect(quizzes.reduce((sum,r) => sum+r.points,0)).toBe(30);
    const [user] = await testDb.select().from(schema.users);
    expect(user.loyaltyPoints).toBe(50);
    expect(await testDb.select().from(schema.loyaltyTransactions)).toHaveLength(2);
  });
  it("does not consume a once-only reward when its ledger insert fails", async () => {
    await insertUser(); const loyalty = new LoyaltyStorage();
    await pg.exec("ALTER TABLE loyalty_transactions ADD CONSTRAINT synthetic_ledger_failure CHECK (amount=0)");
    try {
      await expect(loyalty.awardWelcomeBonus("member")).rejects.toBeTruthy();
      const [user] = await testDb.select().from(schema.users);
      expect(user.welcomeBonusClaimed).toBe(false); expect(user.loyaltyPoints).toBe(0);
    } finally { await pg.exec("ALTER TABLE loyalty_transactions DROP CONSTRAINT synthetic_ledger_failure"); }
    expect(await loyalty.awardWelcomeBonus("member")).toBe(20);
  });
  it("shares the AI cooldown and preserves the granting operator", async () => {
    await insertUser(); const winback = new WinbackEngine();
    const grants = await Promise.all([winback.awardAIBonus("member","Documented action","admin"),winback.awardAIBonus("member","Documented action","admin")]);
    expect(grants.filter(grant => grant.awarded)).toHaveLength(1);
    const [transaction] = await testDb.select().from(schema.loyaltyTransactions);
    expect(transaction.amount).toBe(15); expect(transaction.metadata).toMatchObject({grantedBy:"admin"});
  });
  it("ties order bonuses to the delivered order owner and grants once", async () => {
    await insertUser(); const loyalty = new LoyaltyStorage();
    await testDb.insert(schema.orders).values({id:"order",userId:"member",total:"8549",roundedTotal:"8750",items:[],status:"pending"});
    expect(await loyalty.generateOrderBonus("member","order")).toBe(null);
    await testDb.update(schema.orders).set({status:"delivered"}).where(eq(schema.orders.id,"order"));
    expect(await loyalty.generateOrderBonus("someone-else","order")).toBe(null);
    vi.spyOn(Math,"random").mockReturnValue(0.1);
    try {
      const rewards = await Promise.all([loyalty.generateOrderBonus("member","order"),loyalty.generateOrderBonus("member","order")]);
      expect(rewards.filter(Boolean)).toHaveLength(1);
      expect((await testDb.select().from(schema.orders))[0].roundedTotal).toBe("8750");
      expect((await testDb.select().from(schema.users))[0].loyaltyPoints).toBe(5);
    } finally { vi.mocked(Math.random).mockRestore(); }
  });
});

describe("shared HTTP and MCP operator transitions", () => {
  it("prevents fulfillment of an unpaid electronic order", async () => {
    await testDb.insert(schema.orders).values({id:"unpaid",total:"8750",items:[],status:"pending_payment"});
    await expect(transitionAdminOrderStatus(runtimeDb(),"unpaid",{status:"processing"},actor)).rejects.toMatchObject({statusCode:409});
    expect((await testDb.select().from(schema.orders))[0].status).toBe("pending_payment");
    expect(await testDb.select().from(schema.accountingAuditTrail)).toHaveLength(0);
    expect(applyPackagingLifecycle).not.toHaveBeenCalled();
  });
  it("requires a carrier and an actual confirmed carton before shipping", async () => {
    await testDb.insert(schema.orders).values({id:"shipment",total:"8750",items:[],status:"processing"});
    await expect(transitionAdminOrderStatus(runtimeDb(),"shipment",{status:"shipped"},actor)).rejects.toMatchObject({statusCode:400});
    await pg.exec("INSERT INTO delivery_companies VALUES('test-carrier','Fixture carrier',5000,true,false)");
    await expect(transitionAdminOrderStatus(runtimeDb(),"shipment",{status:"shipped",deliveryCompanyId:"test-carrier"},actor)).rejects.toMatchObject({statusCode:409});
    expect((await testDb.select().from(schema.orders))[0].status).toBe("processing");
    expect(await testDb.select().from(schema.accountingAuditTrail)).toHaveLength(0);
  });
  it("records a permitted transition without altering the amount", async () => {
    await testDb.insert(schema.orders).values({id:"accepted",total:"8549",roundedTotal:"8750",items:[],status:"pending"});
    const result = await transitionAdminOrderStatus(runtimeDb(),"accepted",{status:"confirmed"},actor);
    expect(result.order.status).toBe("confirmed");
    expect(result.order.roundedTotal).toBe("8750");
    expect((await testDb.select().from(schema.accountingAuditTrail))[0]).toMatchObject({performedBy:actor.id,action:"status_change",entityId:"accepted"});
  });
  it("keeps MCP writes on the canonical transaction paths", () => {
    const source = readFileSync("server/routes/mcp.ts","utf8");
    const transition = source.split('case "update_order_status":')[1].split('case "update_product":')[0];
    const expense = source.split('case "add_expense":')[1].split('case "soft_delete_product":')[0];
    expect(transition).toContain("transitionAdminOrderStatus"); expect(transition).not.toContain("db.update");
    expect(expense).toContain("createExpenseOnce"); expect(expense).not.toContain("db.insert");
  });
});

describe("additive migration", () => {
  it("refuses rollback without losing an existing financial receipt or its ledger", async () => {
    await createExpenseOnce(runtimeDb(), expenseInput, actor, key);
    try {
      await expect(pg.exec(readFileSync("migrations/0107_audit_runtime_integrity_rollback.sql", "utf8")))
        .rejects.toThrow("0107_KEEP_WRITE_RECEIPTS_ROLL_BACK_APP_ONLY");
    } finally { await pg.exec("ROLLBACK"); }
    expect(await testDb.select().from(schema.mutationReceipts)).toHaveLength(1);
    expect(await testDb.select().from(schema.expenses)).toHaveLength(1);
    expect(await testDb.select().from(schema.accountingAuditTrail)).toHaveLength(1);
    expect((await pg.query("SELECT version FROM schema_migrations WHERE version='0107_audit_runtime_integrity'")).rows).toHaveLength(1);
  });
  it("is repeatable without resetting a hidden product", async () => {
    await pg.exec("INSERT INTO products(id,slug,name,brand,category,subcategory,description,price,is_storefront_visible,images,thumbnail,specifications) VALUES('hidden','hidden','Fixture','Fixture','test','test','Fixture',0,false,'[]','fixture','{}')");
    await pg.exec(readFileSync("migrations/0107_audit_runtime_integrity.sql","utf8"));
    expect((await testDb.select({visible:schema.products.isStorefrontVisible}).from(schema.products).where(eq(schema.products.id,"hidden")))[0].visible).toBe(false);
  });
});
