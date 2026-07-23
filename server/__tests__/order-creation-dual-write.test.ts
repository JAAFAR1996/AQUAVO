import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * REGRESSION GUARD — every order-creation path must write BOTH line-item stores
 * (orders.items JSONB *and* order_items_relational) inside ONE transaction.
 *
 * Why this test exists
 * --------------------
 * Between ~2026-05-12 and ~2026-06-17 the storefront checkout wrote only
 * orders.items and never populated order_items_relational, leaving 12 production
 * orders (73 lines) with no relational rows. Commit f1b85d4 (2026-06-19,
 * "fix(orders): persist line items into order_items_relational on every order")
 * added the missing insert. Nothing prevented that regression, and nothing
 * prevented it recurring — this test does.
 *
 * This is a STRUCTURAL guard over the real source files, not a DB integration
 * test: it fails if a relational write is deleted, or moved outside the
 * transaction (tx.insert → db.insert). The behavioural counterpart lives in
 * orderitem-backfill-migration.test.ts, which exercises real SQL over PGlite.
 */

const ROOT = process.cwd();
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

/**
 * Extract a function body by brace-matching. Skips past the parameter list first
 * so we open on the BODY brace, not an object literal inside the signature.
 */
function fnBody(src: string, marker: string): string {
  const start = src.indexOf(marker);
  if (start === -1) throw new Error(`marker not found: ${marker}`);

  // 1. Walk the parameter list to its closing paren.
  let i = src.indexOf("(", start);
  if (i === -1) throw new Error(`no parameter list after: ${marker}`);
  let paren = 0;
  for (; i < src.length; i++) {
    if (src[i] === "(") paren++;
    else if (src[i] === ")") { paren--; if (paren === 0) { i++; break; } }
  }

  // 2. Skip any return-type annotation. A generic type can itself contain braces
  //    (e.g. `: Promise<{ processed: number }>`), so only a `{` seen at
  //    angle-bracket depth 0 opens the real function body.
  let angle = 0;
  let open = -1;
  for (; i < src.length; i++) {
    const ch = src[i];
    if (ch === "<") angle++;
    else if (ch === ">") { if (angle > 0) angle--; }
    else if (ch === "{") {
      if (angle === 0) { open = i; break; }
      // brace inside a type literal — skip its matched pair
      let d = 0;
      for (; i < src.length; i++) {
        if (src[i] === "{") d++;
        else if (src[i] === "}") { d--; if (d === 0) break; }
      }
    }
  }
  if (open === -1) throw new Error(`no body brace after: ${marker}`);

  let depth = 0;
  for (let k = open; k < src.length; k++) {
    if (src[k] === "{") depth++;
    else if (src[k] === "}") { depth--; if (depth === 0) return src.slice(open, k + 1); }
  }
  throw new Error(`unbalanced braces after: ${marker}`);
}

describe("order creation writes BOTH line-item stores transactionally", () => {
  const orderStorage = read("server/storage/order-storage.ts");
  const invoiceStorage = read("server/storage/invoice-storage.ts");

  describe("website / storefront checkout (order-storage.ts createOrderSecure)", () => {
    const body = fnBody(orderStorage, "async createOrderSecure");

    it("writes orders.items (JSONB)", () => {
      expect(body).toMatch(/tx\s*\.?\s*insert\(orders\)/);
      expect(body).toMatch(/items:\s*orderItemsData/);
    });

    it("ALSO writes order_items_relational — the f1b85d4 fix", () => {
      expect(body).toMatch(/tx\s*\.?\s*insert\(orderItems\)/);
    });

    it("both writes use the SAME transaction handle (tx, never db)", () => {
      expect(body).toMatch(/tx\.insert\(orderItems\)/);
      // a bare db.insert(orderItems) here would escape the transaction
      expect(body).not.toMatch(/\bdb\.insert\(orderItems\)/);
    });

    it("freezes cost as NULL when unknown — never 0", () => {
      expect(body).toMatch(/unitCostPrice:\s*line\.costPrice\s*==\s*null\s*\?\s*null/);
      expect(body).toMatch(/costSnapshotStatus:\s*line\.costStatus\s*\?\?\s*"unknown"/);
    });
  });

  describe("admin / WhatsApp invoice conversion (invoice-storage.ts)", () => {
    const body = fnBody(invoiceStorage, "private async createOrderFromInvoice");

    it("writes orders.items (JSONB) and tags source=whatsapp", () => {
      expect(body).toMatch(/items:\s*\(invoice\.items/);
      expect(body).toMatch(/source:\s*"whatsapp"/);
    });

    it("ALSO writes order_items_relational", () => {
      expect(body).toMatch(/tx\.insert\(orderItems\)/);
    });

    it("both writes use the SAME transaction handle (tx, never db)", () => {
      expect(body).not.toMatch(/\bdb\.insert\(orderItems\)/);
    });
  });

  it("legacy createOrder() is DISABLED — it throws instead of writing a broken order", () => {
    // Previously it performed a bare db.insert(orders): no transaction, no
    // order_items_relational write — exactly the shape that caused the 12-order
    // gap. Merely proving it unrouted was insufficient, so it now fails closed.
    const legacy = fnBody(orderStorage, "async createOrder(_order:");
    expect(legacy).toMatch(/throw new Error\(/);
    expect(legacy).toMatch(/createOrderSecure/);
    // the unsafe implementation is gone, not merely unreachable
    expect(legacy).not.toMatch(/db\.insert\(orders\)/);
    expect(legacy).not.toMatch(/insert\(orderItems\)/);
  });

  it("legacy createOrder() is marked @deprecated on the storage interface", () => {
    const iface = read("server/storage/index.ts");
    expect(iface).toMatch(/@deprecated[\s\S]{0,200}createOrderSecure/);
  });

  it("no route, job or service calls the disabled createOrder()", () => {
    const routes = read("server/routes/orders.ts");
    expect(routes).toMatch(/storage\.createOrderSecure\(/);
    expect(routes).not.toMatch(/storage\.createOrder\(/);
  });

  it("auto-order-processor write path is QUARANTINED — throws before any write", () => {
    // It referenced columns that do not exist (totalAmount / priceAtTime /
    // shippingMethod), wrote no orders.items, and inserted outside any
    // transaction. Asserting it was merely dead code was insufficient.
    const body = fnBody(read("server/services/auto-order-processor.ts"), "async processScheduledOrders");
    expect(body).toMatch(/QUARANTINED/);
    // the throw precedes every write in the function body
    const throwAt = body.indexOf("throw new Error(");
    const insertAt = body.indexOf("db.insert(");
    expect(throwAt).toBeGreaterThan(-1);
    expect(insertAt === -1 || throwAt < insertAt).toBe(true);
  });

  it("nothing schedules or routes the quarantined auto-order write path", () => {
    const wired = read("server/routes/ai-advanced.ts");
    expect(wired).not.toMatch(/processScheduledOrders/);
  });
});
