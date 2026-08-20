import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("realized return integrity migration", () => {
  const migration = read("migrations/0083_accounting_realized_return_integrity.sql");
  const rollback = read("migrations/0083_accounting_realized_return_integrity_rollback.sql");

  it("restores inventory for direct delivered to returned transitions", () => {
    expect(migration).toContain("OLD.status IN ('delivered','rejected','rejected_carrier','rejected_returned')");
    expect(migration).toContain("'post_delivery_return',OLD.status='delivered'");
    expect(migration).toContain("'order_reversal:'||NEW.id||':'||item_row.id");
    expect(migration).toContain("ON CONFLICT(idempotency_key) DO NOTHING");
  });

  it("requires a return event at transaction end instead of before the admin route can create it", () => {
    expect(migration).toContain("CREATE CONSTRAINT TRIGGER orders_realized_return_event_integrity_guard");
    expect(migration).toContain("DEFERRABLE INITIALLY DEFERRED");
    expect(migration).toContain("FROM public.order_return_events e");
    expect(migration).toContain("e.status IN ('recorded','verified')");
    expect(migration).toContain("COALESCE(e.restocked,false)=true");
    expect(migration).toContain("ORDER_RETURN_EVENT_REQUIRED");
  });

  it("surfaces historical inconsistencies without fabricating a financial return", () => {
    expect(migration).toContain("return_lifecycle_integrity");
    expect(migration).toContain("JOIN public.order_accounting_facts f");
    expect(migration).toContain("NOT EXISTS(");
    expect(migration).toContain("reconstruct the actual return lifecycle from evidence");
    expect(migration).not.toMatch(/INSERT INTO public\.order_return_events/i);
  });

  it("keeps a rollback path", () => {
    expect(rollback).toContain("DROP TRIGGER IF EXISTS orders_realized_return_event_integrity_guard");
    expect(rollback).toContain("DROP FUNCTION IF EXISTS public.enforce_realized_return_event_integrity");
    expect(rollback).toContain("rolled_back_at=now()");
  });
});

describe("admin return transaction wiring", () => {
  it("updates order state and records the automatic return in the same DB transaction", () => {
    const route = read("server/routes/admin-orders-v2.ts");
    expect(route).toContain("db.transaction(async (tx)");
    expect(route).toContain("tx.update(orders)");
    expect(route).toContain("syncAutomaticReturnLifecycle(tx");
  });
});
