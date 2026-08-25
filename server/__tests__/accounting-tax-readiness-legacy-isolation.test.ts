/**
 * ACCOUNTING TAX READINESS + LEGACY SETTLEMENT ISOLATION (hotfix 2026-07-28).
 *
 * Three things this file locks down, each of which was wrong in production:
 *
 *   1. The carrier balance comes ONLY from reconciled `cash_settlements`, and a
 *      return refund is never deducted from it a second time.
 *   2. An estimated cost is never presented as a missing cost, and never as a
 *      tax-final one. `taxReportReady` stays false while any counted line is an
 *      estimate.
 *   3. The accountant path holds no runtime dependency on the legacy
 *      `shipping_settlements` table — enforced by reading the route source.
 */
import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import {
  calcOrderProfit,
  computeCarrierBalance,
  computeTaxReadiness,
  TAX_NOT_READY_WARNING_AR,
  TAX_READINESS_ENGINE_PENDING_AR,
  type CostResolver,
  type OrderRow,
} from "../services/accounting-engine";
import { COST_BASIS_UI_LABEL_AR, DRAFT_EXPORT_MARK } from "../../shared/accounting";

const ROOT = process.cwd();

// The production figures this hotfix was written against.
const RECONCILED = [
  { status: "reconciled", grossAmount: "1011085", feesAmount: "97500", netAmount: "913585" },
  { status: "reconciled", grossAmount: "1011085", feesAmount: "97500", netAmount: "913585" },
];

// ── 1. carrier outstanding ───────────────────────────────────────────────────

describe("carrier outstanding", () => {
  it("is 0 for the reconciled production figures", () => {
    const b = computeCarrierBalance(RECONCILED, 0);
    expect(b.grossCustomerCollections).toBe(2_022_170);
    expect(b.carrierFees).toBe(195_000);
    expect(b.netCashReceived).toBe(1_827_170);
    expect(b.outstanding).toBe(0);
    expect(b.fullySettled).toBe(true);
  });

  it("is UNCHANGED by a 10,000 return — the refund is not deducted twice", () => {
    const without = computeCarrierBalance(RECONCILED, 0);
    const withReturn = computeCarrierBalance(RECONCILED, 10_000);
    expect(withReturn.outstanding).toBe(0);
    expect(withReturn.outstanding).toBe(without.outstanding);
    // The return is still reported — as information, never as a deduction.
    expect(withReturn.documentedAdjustments).toBe(10_000);
    expect(withReturn.fullySettled).toBe(true);
  });

  it("ignores non-reconciled rows entirely", () => {
    const b = computeCarrierBalance(
      [...RECONCILED, { status: "draft", grossAmount: "500000", feesAmount: "50000", netAmount: "450000" }],
      0,
    );
    expect(b.grossCustomerCollections).toBe(2_022_170);
    expect(b.outstanding).toBe(0);
  });

  it("never reports the carrier's fee as a carrier receivable", () => {
    const b = computeCarrierBalance(RECONCILED, 0);
    expect(b.outstanding).not.toBe(b.carrierFees);
  });

  it("leaves a genuine shortfall visible rather than clamping to zero", () => {
    const b = computeCarrierBalance(
      [{ status: "reconciled", grossAmount: "2022170", feesAmount: "168998", netAmount: "142500" }],
      10_000,
    );
    expect(b.outstanding).toBe(1_710_672);
    expect(b.fullySettled).toBe(false);
  });
});

// ── 2. tax readiness ─────────────────────────────────────────────────────────

describe("tax readiness", () => {
  it("is false for the current book: 0 exact of 182 lines", () => {
    const r = computeTaxReadiness({
      exactCostLines: 0,
      estimatedHistoryLines: 39,
      estimatedReferenceLines: 143,
      unknownCostLines: 0,
    });
    expect(r.totalFinancialLines).toBe(182);
    expect(r.exactCostLines).toBe(0);
    expect(r.taxReportReady).toBe(false);
    expect(r.taxReadinessWarning).toBe(TAX_NOT_READY_WARNING_AR);
  });

  it("stays false when even ONE line of many is an estimate", () => {
    const r = computeTaxReadiness({
      exactCostLines: 181,
      estimatedHistoryLines: 1,
      estimatedReferenceLines: 0,
      unknownCostLines: 0,
    });
    expect(r.taxReportReady).toBe(false);
  });

  it("stays false when a line has no cost at all", () => {
    const r = computeTaxReadiness({
      exactCostLines: 181,
      estimatedHistoryLines: 0,
      estimatedReferenceLines: 0,
      unknownCostLines: 1,
    });
    expect(r.taxReportReady).toBe(false);
  });

  it("an EMPTY period is not ready — zero lines can never be a filed report", () => {
    const r = computeTaxReadiness({
      exactCostLines: 0, estimatedHistoryLines: 0, estimatedReferenceLines: 0, unknownCostLines: 0,
    });
    expect(r.totalFinancialLines).toBe(0);
    expect(r.taxReportReady).toBe(false);
  });

  it("reports full cost-snapshot coverage separately from tax readiness", () => {
    const r = computeTaxReadiness({
      exactCostLines: 182, estimatedHistoryLines: 0, estimatedReferenceLines: 0, unknownCostLines: 0,
    });
    // Cost coverage is complete — that much is true and is reported honestly.
    expect(r.costSnapshotsComplete).toBe(true);
    // ...but coverage is condition 8 of 23. RED TEAM M-10: before this pin,
    // the first fully-exact month would have flipped taxReportReady to true
    // and unlocked period close with no tax profile, no approved chart of
    // accounts, no fiscal year and no accountant approval.
    expect(r.taxReportReady).toBe(false);
    expect(r.taxReadinessWarning).toBe(TAX_READINESS_ENGINE_PENDING_AR);
  });

  it("distinguishes 'costs are estimates' from 'readiness engine not built'", () => {
    // A data problem the owner can fix with invoices...
    const estimated = computeTaxReadiness({
      exactCostLines: 0, estimatedHistoryLines: 39, estimatedReferenceLines: 143, unknownCostLines: 0,
    });
    expect(estimated.taxReadinessWarning).toBe(TAX_NOT_READY_WARNING_AR);
    // ...versus a system limitation the owner cannot. Collapsing the two into
    // one message would send the owner hunting for invoices that would not
    // help, or waiting on code that is not the binding constraint.
    const covered = computeTaxReadiness({
      exactCostLines: 10, estimatedHistoryLines: 0, estimatedReferenceLines: 0, unknownCostLines: 0,
    });
    expect(covered.taxReadinessWarning).toBe(TAX_READINESS_ENGINE_PENDING_AR);
    expect(estimated.taxReadinessWarning).not.toBe(covered.taxReadinessWarning);
  });

  it("cannot be made ready by any input — the pin is not data-dependent", () => {
    // Exhaustive over the shape of the input: no combination of counters may
    // produce a true. The only way to flip it is to ship the readiness engine
    // and change FULL_TAX_READINESS_ENGINE_IMPLEMENTED deliberately.
    for (const exact of [0, 1, 182, 10_000]) {
      for (const est of [0, 1, 39]) {
        for (const ref of [0, 143]) {
          for (const unk of [0, 1]) {
            const r = computeTaxReadiness({
              exactCostLines: exact,
              estimatedHistoryLines: est,
              estimatedReferenceLines: ref,
              unknownCostLines: unk,
            });
            expect(r.taxReportReady).toBe(false);
            expect(r.taxReadinessWarning).not.toBeNull();
          }
        }
      }
    }
  });
});

// ── 2b. an unknown cost stays unknown ────────────────────────────────────────

describe("unknown cost", () => {
  const noResolver: CostResolver = { getCurrent: () => undefined, getEffective: () => undefined };
  const unknownOrder = {
    id: "o1",
    status: "delivered",
    createdAt: new Date("2026-05-01"),
    roundedTotal: "30000",
    total: "30000",
    shippingCost: "5000",
    boxCost: "0",
    items: [{ productId: "p1", quantity: 1, priceAtPurchase: "25000" }],
  } as unknown as OrderRow;

  it("never becomes 0, and never yields a 100% margin", () => {
    const p = calcOrderProfit(unknownOrder, noResolver);
    expect(p.unknownCostLines).toBe(1);
    expect(p.exactCostLines).toBe(0);
    // The exact figures are NULL — an unknown cost cannot be read as exact.
    expect(p.exactCogs).toBeNull();
    expect(p.exactNetProfit).toBeNull();
    expect(p.items[0]!.unitCostPrice).toBeNull();
    // And it must not be laundered into a full-margin sale.
    expect(p.costsComplete).toBe(false);
    expect(computeTaxReadiness({
      exactCostLines: p.exactCostLines,
      estimatedHistoryLines: p.estimatedHistoryLines,
      estimatedReferenceLines: p.estimatedReferenceLines,
      unknownCostLines: p.unknownCostLines,
    }).taxReportReady).toBe(false);
  });
});

// ── 3. estimated lines are never labelled missing / unknown ──────────────────

describe("cost-basis wording", () => {
  it("names an estimate an estimate — never 'ناقصة', never 'غير متوفرة'", () => {
    for (const basis of ["estimated_history", "estimated_database_reference"] as const) {
      const label = COST_BASIS_UI_LABEL_AR[basis];
      expect(label).toContain("تقديرية");
      expect(label).not.toContain("ناقصة");
      expect(label).not.toContain("غير متوفرة");
    }
    expect(COST_BASIS_UI_LABEL_AR.estimated_history).toBe("كلفة تقديرية من تاريخ الكلفة");
    expect(COST_BASIS_UI_LABEL_AR.estimated_database_reference).toBe("كلفة تقديرية من مرجع قاعدة البيانات");
  });

  it("reserves 'كلفة غير متوفرة' for unknown alone", () => {
    expect(COST_BASIS_UI_LABEL_AR.unknown).toBe("كلفة غير متوفرة");
    const others = (["exact_snapshot", "estimated_history", "estimated_database_reference"] as const)
      .map((b) => COST_BASIS_UI_LABEL_AR[b]);
    expect(others).not.toContain("كلفة غير متوفرة");
  });
});

/** Every .ts/.tsx under client/src, so a "nowhere in the UI" claim means it. */
function clientSourceFiles(dir = join(ROOT, "client/src")): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...clientSourceFiles(full));
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

describe("the retired accountant panel stays retired", () => {
  // 618c1c2f ("make carton evidence canonical") deleted the 759-line
  // accounting-panel.tsx along with the legacy manual box-cost flows, and the
  // finance-*-v2 components took over. This block used to assert that panel's
  // source strings; those assertions cannot be satisfied by any current file,
  // so what is worth locking now is the removal itself. The carrier-balance
  // rules the panel used to display are still enforced above, against
  // computeCarrierBalance directly, which is the stronger place for them.
  it("does not reappear as a source file", () => {
    expect(existsSync(join(ROOT, "client/src/components/admin/accounting-panel.tsx"))).toBe(false);
  });

  it("leaves no import of it behind", () => {
    // Matches a module specifier only. Other suites legitimately name the file
    // as a string to assert this same removal, and those must not count.
    const importsPanel = /(?:from|import\()\s*["'][^"']*accounting-panel["']/;
    const importers = clientSourceFiles().filter((file) =>
      importsPanel.test(readFileSync(file, "utf8")),
    );
    expect(importers).toEqual([]);
  });

  it("takes the legacy carrier-balance projection out of the UI with it", () => {
    // The four figures were read straight off a client-side carrierBalance
    // object. Reintroducing that shape in a component would re-create the
    // projection this file exists to keep server-side and reconciled.
    const offenders = clientSourceFiles().filter((file) =>
      /carrierBalance\.(grossCustomerCollections|carrierFees|netCashReceived|outstanding)/.test(
        readFileSync(file, "utf8"),
      ),
    );
    expect(offenders).toEqual([]);
  });
});

describe("final close / export are disabled while not tax-ready", () => {
  const periodClose = readFileSync(join(ROOT, "client/src/components/admin/finance-period-close.tsx"), "utf8");
  const report = readFileSync(join(ROOT, "client/src/components/admin/finance-report.tsx"), "utf8");

  it("the period-close button is disabled unless taxReportReady", () => {
    expect(periodClose).toContain("taxReportReady");
    expect(periodClose).toMatch(/disabled=\{!taxReportReady/);
    // Unknown readiness must NOT read as ready.
    expect(periodClose).toContain("taxSummary?.taxReportReady === true");
  });

  it("the period-close endpoint refuses a close server-side too", () => {
    const route = readFileSync(join(ROOT, "server/routes/accounting.ts"), "utf8");
    expect(route).toContain("taxReadinessForRange");
    expect(route).toMatch(/if \(!readiness\.taxReportReady\)/);
  });

  it("the internal review export carries the DRAFT mark", () => {
    expect(report).toContain("DRAFT_EXPORT_MARK");
    expect(report).toContain("DRAFT-NOT-TAX-FINAL");
    expect(DRAFT_EXPORT_MARK).toBe("DRAFT / ESTIMATED / NOT TAX FINAL");
  });
});

// ── 4. no runtime dependency on shipping_settlements ─────────────────────────

describe("legacy shipping_settlements isolation", () => {
  const route = readFileSync(join(ROOT, "server/routes/accounting.ts"), "utf8");

  it("the accountant route neither imports nor queries shippingSettlements", () => {
    // Strip comments: the explanation of WHY it is absent may name it.
    const code = route
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("\n")
      .filter((l) => !l.trim().startsWith("//"))
      .join("\n");
    expect(code).not.toContain("shippingSettlements");
    expect(code).not.toContain("shipping_settlements");
  });

  it("reads carrier money from cash_settlements with status reconciled", () => {
    expect(route).toContain("cashSettlements");
    expect(route).toContain('"reconciled"');
  });

  it("does not use orders.shipping_cost as a settlement source", () => {
    // shippingCost is still legitimately used to derive per-order net revenue;
    // what must not exist is a settlement/received figure built from it.
    expect(route).not.toMatch(/totalReceived\s*=\s*[^;]*shippingCost/);
  });

  it("the legacy write endpoint fails closed instead of writing an ambiguous row", () => {
    expect(route).toMatch(/router\.post\("\/settlements"[\s\S]{0,600}?res\.status\(410\)/);
  });

  it("the AI finance auditor reads the same canonical source, not the legacy log", () => {
    const audit = readFileSync(join(ROOT, "server/services/groqFinanceAudit.ts"), "utf8");
    const code = audit
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("\n")
      .filter((l) => !l.trim().startsWith("//"))
      .join("\n");
    expect(code).not.toContain("shippingSettlements");
    expect(code).not.toContain("shipping_settlements");
    expect(code).toContain("cashSettlements");
    expect(code).toContain("computeCarrierBalance");
  });

  it("db:push cannot recreate the table in public", () => {
    const cfg = readFileSync(join(ROOT, "drizzle.config.ts"), "utf8");
    const managed = cfg
      .split("\n")
      .filter((l) => !l.trim().startsWith("//"))
      .join("\n");
    expect(managed).not.toContain('"shipping_settlements"');
    // The rest of the filter is untouched — this is a removal of one entry, not
    // a disabling of the filter.
    expect(managed).toContain('"product_cost_history"');
    expect(managed).toContain('"products"');
    expect(managed).toContain('"users"');
    // `orders` and the V2 accounting tables were later pulled out of the filter
    // on purpose (ed18c0ac): migration SQL is their sole DDL authority, so
    // db:push must never be able to propose dropping delivered_at, carrier_fee,
    // evidence columns, triggers, checks or foreign keys on them.
    for (const migrationOwned of ['"orders"', '"journal_lines"', '"order_accounting_facts"']) {
      expect(managed, migrationOwned).not.toContain(migrationOwned);
    }
  });
});

// ── 5. migration moves the table without losing a row ────────────────────────

describe("isolate_legacy_shipping_settlements migration", () => {
  const forward = readFileSync(join(ROOT, "migrations/isolate_legacy_shipping_settlements.sql"), "utf8");
  const rollback = readFileSync(join(ROOT, "migrations/isolate_legacy_shipping_settlements_rollback.sql"), "utf8");

  const BASE = `
    CREATE TABLE public.shipping_settlements (
      id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
      carrier text NOT NULL,
      amount numeric NOT NULL,
      notes text,
      covered_order_ids jsonb,
      created_at timestamp DEFAULT now() NOT NULL
    );
    INSERT INTO public.shipping_settlements (carrier, amount) VALUES
      ('carrier-a', 100000), ('carrier-a', 42500), ('carrier-b', 10000);
  `;

  async function count(db: PGlite, table: string): Promise<number> {
    const r = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM ${table}`);
    return r.rows[0]!.n;
  }
  async function exists(db: PGlite, qualified: string): Promise<boolean> {
    const r = await db.query<{ reg: string | null }>(`SELECT to_regclass('${qualified}')::text AS reg`);
    return r.rows[0]!.reg !== null;
  }

  it("moves every row to archive, deleting none", async () => {
    const db = new PGlite();
    await db.exec(BASE);
    const before = await count(db, "public.shipping_settlements");
    const sumBefore = (await db.query<{ s: string }>("SELECT sum(amount)::text AS s FROM public.shipping_settlements")).rows[0]!.s;

    await db.exec(forward);

    expect(await exists(db, "public.shipping_settlements")).toBe(false);
    expect(await exists(db, "archive.shipping_settlements")).toBe(true);
    expect(await count(db, "archive.shipping_settlements")).toBe(before);
    const sumAfter = (await db.query<{ s: string }>("SELECT sum(amount)::text AS s FROM archive.shipping_settlements")).rows[0]!.s;
    expect(Number(sumAfter)).toBe(Number(sumBefore));
    await db.close();
  });

  it("is idempotent — a second apply is a no-op", async () => {
    const db = new PGlite();
    await db.exec(BASE);
    await db.exec(forward);
    await expect(db.exec(forward)).resolves.toBeDefined();
    expect(await count(db, "archive.shipping_settlements")).toBe(3);
    await db.close();
  });

  it("is a no-op on a database that never had the table", async () => {
    const db = new PGlite();
    await expect(db.exec(forward)).resolves.toBeDefined();
    expect(await exists(db, "archive.shipping_settlements")).toBe(false);
    await db.close();
  });

  it("rolls back to public with the same rows", async () => {
    const db = new PGlite();
    await db.exec(BASE);
    await db.exec(forward);
    await db.exec(rollback);

    expect(await exists(db, "public.shipping_settlements")).toBe(true);
    expect(await exists(db, "archive.shipping_settlements")).toBe(false);
    expect(await count(db, "public.shipping_settlements")).toBe(3);
    await db.close();
  });

  it("rollback is idempotent", async () => {
    const db = new PGlite();
    await db.exec(BASE);
    await db.exec(forward);
    await db.exec(rollback);
    await expect(db.exec(rollback)).resolves.toBeDefined();
    expect(await count(db, "public.shipping_settlements")).toBe(3);
    await db.close();
  });

  it("refuses to overwrite an existing archive rather than merging money", async () => {
    const db = new PGlite();
    await db.exec(BASE);
    await db.exec(forward);
    // Recreate a public table while the archive still exists.
    await db.exec(BASE);
    await expect(db.exec(forward)).rejects.toThrow();
    // The migration raised inside its own BEGIN; end the aborted transaction
    // before inspecting. The abort is exactly the safety we are asserting.
    await db.exec("ROLLBACK");
    // Both survive untouched.
    expect(await count(db, "archive.shipping_settlements")).toBe(3);
    expect(await count(db, "public.shipping_settlements")).toBe(3);
    await db.close();
  });
});
