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

  it("prevents close-state regressions at API and database layers", () => {
    const api = read("server/routes/accounting-v2.ts");
    expect(api).toContain("WHERE public.accounting_period_closes.status='reopened'");
    expect(api).toContain("WHERE period_key=${periodKey} AND status='closed'");
    expect(api).toContain("لا توجد بيانات جاهزية محاسبية لهذه الفترة");
    expect(api).toContain("لا يمكن إغلاق الشهر قبل معالجة الموانع");
    expect(api).toContain("runAutomaticPeriodClose");

    const migration60 = read("migrations/0060_accounting_close_state_machine.sql");
    expect(migration60).toContain("IF NOT FOUND THEN");
    expect(migration60).toContain("CLOSE_BLOCKED: readiness row missing");
    expect(migration60).toContain("TAX_FINALIZATION_BLOCKED: tax profile missing");
    expect(migration60).toContain("tax-final period % is immutable");
    expect(migration60).toContain("only a closed period can be reopened");

    const migration62 = read("migrations/0062_accounting_automation_opening_balances.sql");
    expect(migration62).toContain("journal_entries_closed_period_guard");
    expect(migration62).toContain("journal_lines_immutable_guard");
    expect(migration62).toContain("CLOSED_PERIOD_JOURNAL_BLOCKED");
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
    expect(codRollback).toContain("0052_ROLLBACK_BLOCKED: roll back 0060 through 0053 first");
    expect(codRollback).toContain("post_order_fulfillment_journal(text)");
    expect(codRollback).toContain("trg_guard_accounting_period_tax_finalization");
  });

  it("registers one fail-closed V2 health router through migration 0066", () => {
    const routes = read("server/routes.ts");
    expect(routes).not.toContain("accounting-health-v2.js");
    expect(routes).not.toContain("createAccountingHealthV2Router");
    expect(routes.match(/createAccountingV2Router\(\)/g) ?? []).toHaveLength(1);
    expect(existsSync(join(root, "server/routes/accounting-health-v2.ts"))).toBe(false);

    const reports = read("server/routes/accounting-v2.ts");
    expect(reports).toContain('router.get("/v2/health"');
    expect(reports).toContain("migration_0066");
    expect(reports).toContain("ACCOUNTING_V2_MIGRATIONS_0051_TO_0066_REQUIRED");
    expect(reports).toContain('migrationsThrough: "0066"');
  });

  it("keeps the default carrier active during status-only updates", () => {
    expect(existsSync(join(root, "migrations/0061_accounting_default_carrier_status_guard.sql"))).toBe(true);
    expect(existsSync(join(root, "migrations/0061_accounting_default_carrier_status_guard_rollback.sql"))).toBe(true);
    const migration = read("migrations/0061_accounting_default_carrier_status_guard.sql");
    expect(migration).toContain("BEFORE INSERT OR UPDATE OF carrier,status ON public.orders");
  });

  it("runs exact migration files before production deploy and skips previews", () => {
    const runner = read("script/apply-accounting-v2-migrations.ts");
    expect(runner).toContain('CONFIRM_ACCOUNTING_PRODUCTION !== "APPLY_0051_TO_0066"');
    expect(runner).toContain("pg_advisory_lock");
    expect(runner).toContain("await client.query(body)");
    expect(runner).toContain("createHash(\"sha256\")");
    expect(runner).toContain("runner-verified file sha256");
    expect(runner).toContain('"0062_accounting_automation_opening_balances.sql"');
    expect(runner).toContain('"0066_accounting_reassert_refusal_inventory_after_0062.sql"');

    const vercel = read("vercel.json");
    expect(vercel).toContain('if [ \\"$VERCEL_ENV\\" = \\"production\\" ]');
    expect(vercel).toContain("CONFIRM_ACCOUNTING_PRODUCTION=APPLY_0051_TO_0066");
    expect(vercel).toContain("script/apply-accounting-v2-migrations.ts");
  });
});
