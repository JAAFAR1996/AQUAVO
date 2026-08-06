import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  path.resolve(process.cwd(), "migrations/0064_accounting_customer_credit_posting_links.sql"),
  "utf8",
);
const rollback = readFileSync(
  path.resolve(process.cwd(), "migrations/0064_accounting_customer_credit_posting_links_rollback.sql"),
  "utf8",
);
const refusalSql = readFileSync(
  path.resolve(process.cwd(), "migrations/0063_accounting_cod_refusal_and_store_credit.sql"),
  "utf8",
);
const warrantySql = readFileSync(
  path.resolve(process.cwd(), "migrations/0065_accounting_separate_warranty_from_cod_refusal.sql"),
  "utf8",
);

describe("migration 0064 customer-credit posting links", () => {
  it("removes mutable posting state from immutable business events", () => {
    expect(sql).toContain("DROP COLUMN IF EXISTS accounting_status");
    expect(sql).toContain("DROP COLUMN IF EXISTS journal_entry_id");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.customer_credit_accounting_links");
  });

  it("drops dependent balance views before columns or link tables", () => {
    const migrationDropView = sql.indexOf("DROP VIEW IF EXISTS public.v_customer_credit_balances");
    const migrationAlterTable = sql.indexOf("ALTER TABLE public.customer_credit_entries");
    expect(migrationDropView).toBeGreaterThanOrEqual(0);
    expect(migrationDropView).toBeLessThan(migrationAlterTable);

    const rollbackDropView = rollback.indexOf("DROP VIEW IF EXISTS public.v_customer_credit_balances");
    const rollbackDropLinks = rollback.indexOf("DROP TABLE IF EXISTS public.customer_credit_accounting_links");
    expect(rollbackDropView).toBeGreaterThanOrEqual(0);
    expect(rollbackDropView).toBeLessThan(rollbackDropLinks);
  });

  it("accepts a posting link only when account 2300 has the exact amount and side", () => {
    expect(sql).toContain("validate_customer_credit_accounting_link");
    expect(sql).toContain("l.account_code='2300'");
    expect(sql).toContain("v_direction='credit' AND l.credit=v_amount");
    expect(sql).toContain("v_direction='debit' AND l.debit=v_amount");
    expect(sql).toContain("CUSTOMER_CREDIT_JOURNAL_MISMATCH");
  });

  it("keeps both credit events and accounting links immutable", () => {
    expect(sql).toContain("customer_credit_links_no_update");
    expect(sql).toContain("customer_credit_links_no_delete");
    expect(sql).toContain("prevent_customer_credit_entry_mutation");
  });

  it("derives unposted counts and blocks closing their Baghdad month", () => {
    expect(sql).toContain("pending_accounting_entries");
    expect(sql).toContain("l.credit_entry_id IS NULL");
    expect(sql).toContain("trg_guard_customer_credit_period_close");
    expect(sql).toContain("PERIOD_CLOSE_BLOCKED: unposted customer-credit entries");
    expect(sql).toContain("AT TIME ZONE 'Asia/Baghdad'");
  });

  it("uses strict 64-character hexadecimal migration checksums", () => {
    const migrationFiles = [refusalSql, sql, warrantySql];
    for (const body of migrationFiles) {
      expect(body).not.toMatch(/'pending'\s*,\s*current_user/);
      expect(body).toMatch(/'[0-9a-f]{64}'\s*,\s*current_user/);
    }
  });

  it("has a structural rollback to the 0063 inline shape", () => {
    expect(rollback).toContain("ADD COLUMN IF NOT EXISTS accounting_status");
    expect(rollback).toContain("ADD COLUMN IF NOT EXISTS journal_entry_id");
    expect(rollback).toContain("customer_credit_entries_posted_link_chk");
  });
});
