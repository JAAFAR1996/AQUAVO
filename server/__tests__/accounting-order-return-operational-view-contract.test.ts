import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ORDER_RETURN_EVENT_STATUSES } from "../../shared/accounting.js";

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

const ordersManagement = read("client/src/components/admin/orders-management.tsx");
const financeReturnEvents = read("client/src/components/admin/finance-return-events.tsx");
const accountingRoute = read("server/routes/accounting.ts");
const returnIntegrityMigration = read("migrations/0053_accounting_expenses_returns.sql");

function sliceBetween(source: string, start: string, end: string): string {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  expect(startIndex, `missing start marker: ${start}`).toBeGreaterThanOrEqual(0);
  expect(endIndex, `missing end marker: ${end}`).toBeGreaterThan(startIndex);
  return source.slice(startIndex, endIndex);
}

describe("operational order return-event visibility contract", () => {
  it("uses the current state machine and treats verified as the only confirmed return status", () => {
    expect(ORDER_RETURN_EVENT_STATUSES).toEqual(["recorded", "verified", "disputed"]);

    const statusUpdateBlock = sliceBetween(
      accountingRoute,
      'router.patch("/return-events/:id/status"',
      'router.delete("/return-events/:id"',
    );
    expect(statusUpdateBlock).toContain('"verified" is the only status that hits P&L');
  });

  it("requests verified returns only for operational order details", () => {
    const refreshBlock = sliceBetween(
      ordersManagement,
      "const refreshDetailEvents = (orderId: string) => {",
      "const voidDetailMutation = useMutation",
    );

    expect(refreshBlock).toContain("orderId=${orderId}&period=year&status=verified");
    expect(refreshBlock).not.toContain("status=disputed");
    expect(refreshBlock).not.toContain("status=recorded");
    expect(ordersManagement).not.toContain("preserved as disputed legacy record");
  });

  it("keeps the operational count tied to the server-filtered verified list", () => {
    expect(ordersManagement).toContain("const detailReturnCount = detailReturnEvents.length;");
    expect(ordersManagement).toContain("تعديلات الفاتورة / الراجعات ({detailReturnEvents.length})");
    expect(ordersManagement).toContain("يوجد {detailReturnCount} تعديل/راجع على هذه الفاتورة");
  });

  it("applies the requested status filter in the backend query before returning operational data", () => {
    const getRoute = sliceBetween(
      accountingRoute,
      'router.get("/return-events"',
      'router.patch("/return-events/:id/status"',
    );

    expect(getRoute).toContain('const statusFilter = typeof req.query.status === "string" ? req.query.status : undefined;');
    expect(getRoute).toContain("if (statusFilter) conditions.push(eq(orderReturnEvents.status, statusFilter));");
    expect(getRoute).toContain(".where(conditions.length > 0 ? and(...conditions) : undefined)");
  });

  it("does not mutate or delete disputed legacy records from the operational GET path", () => {
    const getRoute = sliceBetween(
      accountingRoute,
      'router.get("/return-events"',
      'router.patch("/return-events/:id/status"',
    );

    expect(getRoute).not.toMatch(/\.update\s*\(/);
    expect(getRoute).not.toMatch(/\.delete\s*\(/);
    expect(getRoute).not.toMatch(/\.insert\s*\(/);

    expect(returnIntegrityMigration).toContain("prevent_return_event_hard_delete");
    expect(returnIntegrityMigration).toContain("RETURN_EVENT_IMMUTABLE: mark disputed/void; do not hard delete");
  });

  it("keeps the accounting audit/history view able to request disputed records", () => {
    expect(financeReturnEvents).toContain('if (statusFilter) params.set("status", statusFilter);');
    expect(financeReturnEvents).toContain('fetch(`/api/admin/accounting/return-events?${params}`');
    expect(financeReturnEvents).toContain('fetch("/api/admin/accounting/return-events", { credentials: "include" })');
    expect(financeReturnEvents).not.toContain('params.set("status", "verified")');
  });
});
