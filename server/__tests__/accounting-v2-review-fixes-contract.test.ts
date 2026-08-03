import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("Accounting V2 reviewed fixes", () => {
  it("validates order money through Zod instead of throwing inside transform", () => {
    const source = read("server/routes/admin-orders-v2.ts");
    expect(source).toContain(".refine((amount) => Number.isFinite(amount) && amount >= 0");
    expect(source).not.toContain('throw new Error("قيمة مالية غير صالحة")');
  });

  it("matches settlement request sets uniquely and preserves SQL null", () => {
    const source = read("server/routes/accounting-operations-v2.ts");
    expect(source).toContain("EXISTS(");
    expect(source).toContain("AS already_settled");
    expect(source).toContain("const foundIds = new Set");
    expect(source).toContain("orderIds.some((id) => !foundIds.has(id))");
    expect(source).toContain("fact.payment_event_id == null ? null : String(fact.payment_event_id)");
    expect(source).not.toContain("LEFT JOIN public.order_accounting_settlements s ON s.order_fact_id=f.id\n          WHERE f.order_id IN");
  });

  it("prevents close-state regressions at both API and database layers", () => {
    const api = read("server/routes/accounting-v2.ts");
    expect(api).toContain("WHERE public.accounting_period_closes.status <> 'tax_final'");
    expect(api).toContain("WHERE period_key=${periodKey} AND status='closed'");
    expect(api).toContain("لا توجد بيانات جاهزية لهذه الفترة");
    expect(api).toContain("لا يمكن إغلاق الشهر قبل معالجة الموانع");

    const migration = read("migrations/0060_accounting_close_state_machine.sql");
    expect(migration).toContain("IF NOT FOUND THEN");
    expect(migration).toContain("CLOSE_BLOCKED: readiness row missing");
    expect(migration).toContain("TAX_FINALIZATION_BLOCKED: tax profile missing");
    expect(migration).toContain("tax-final period % is immutable");
    expect(migration).toContain("only a closed period can be reopened");
  });

  it("ships migration 0060 with a safety-preserving rollback", () => {
    expect(existsSync(join(root, "migrations/0060_accounting_close_state_machine.sql"))).toBe(true);
    expect(existsSync(join(root, "migrations/0060_accounting_close_state_machine_rollback.sql"))).toBe(true);
    const rollback = read("migrations/0060_accounting_close_state_machine_rollback.sql");
    expect(rollback).toContain("0060_ROLLBACK_BLOCKED: tax-final periods exist");
    expect(rollback).toContain("CLOSE_BLOCKED: readiness row missing");
    expect(rollback).toContain("TAX_FINALIZATION_BLOCKED: tax profile missing");
  });

  it("makes early rollback files dependency-safe", () => {
    const foundationRollback = read("migrations/0051_accounting_august_foundation_rollback.sql");
    expect(foundationRollback).toContain("DROP CONSTRAINT IF EXISTS expenses_paid_from_account_fk");
    expect(foundationRollback).toContain("DROP CONSTRAINT IF EXISTS expenses_evidence_file_id_fkey");
    expect(foundationRollback).toContain("DROP COLUMN IF EXISTS evidence_file_id");

    const cod = read("migrations/0052_accounting_cod_delivery_settlements.sql");
    expect(cod).toContain("to_regprocedure('public.post_order_fulfillment_journal(text)') IS NOT NULL");
    const codRollback = read("migrations/0052_accounting_cod_delivery_settlements_rollback.sql");
    expect(codRollback).toContain("0052_ROLLBACK_BLOCKED: roll back 0059 through 0053 first");
    expect(codRollback).toContain("post_order_fulfillment_journal(text)");
  });

  it("requires health through migration 0060", () => {
    const health = read("server/routes/accounting-health-v2.ts");
    expect(health).toContain("migration_0060");
    expect(health).toContain("close_state_guard");
    expect(health).toContain("migrationsThrough: \"0060\"");
    expect(health).toContain("ACCOUNTING_V2_MIGRATIONS_0051_TO_0060_REQUIRED");
  });
});
