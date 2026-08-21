from pathlib import Path

engine_path = Path("server/services/accounting-engine.ts")
engine = engine_path.read_text()

anchor = '''/** Batch-load the relational cost snapshots for a set of orders. */\nexport async function buildRelationalLineResolver(db: Db, orderIds: Set<string>): Promise<RelationalLineResolver> {'''
helper = '''/**\n * Normalize a component from an immutable relational order-line snapshot.\n *\n * `exact` is evidence for the whole snapshot, including genuine zero ancillary\n * costs. Treating a 0 inside an exact row as ambiguous erased supplier packaging\n * and insert costs and incorrectly downgraded fully-costed orders to UNKNOWN.\n * Non-exact rows keep the conservative zero-is-unknown rule.\n */\nexport function resolveRelationalSnapshotComponent(\n  value: number | string | null | undefined,\n  status: CostSnapshotStatus | null,\n): number | null {\n  const zeroIsEvidence = status === "exact" || status === "verified_zero";\n  return resolveCostComponent(toMoneyOrNull(value), zeroIsEvidence ? "verified_zero" : null);\n}\n\n/** Batch-load the relational cost snapshots for a set of orders. */\nexport async function buildRelationalLineResolver(db: Db, orderIds: Set<string>): Promise<RelationalLineResolver> {'''
if anchor not in engine:
    raise SystemExit("accounting helper anchor not found")
engine = engine.replace(anchor, helper, 1)

old_components = '''      costPrice: resolveCostComponent(toMoneyOrNull(r.unitCostPrice), status === "verified_zero" ? "verified_zero" : null),\n      packagingCost: resolveCostComponent(toMoneyOrNull(r.unitPackagingCost), status === "verified_zero" ? "verified_zero" : null),\n      insertCost: resolveCostComponent(toMoneyOrNull(r.unitInsertCost), status === "verified_zero" ? "verified_zero" : null),'''
new_components = '''      costPrice: resolveRelationalSnapshotComponent(r.unitCostPrice, status),\n      packagingCost: resolveRelationalSnapshotComponent(r.unitPackagingCost, status),\n      insertCost: resolveRelationalSnapshotComponent(r.unitInsertCost, status),'''
if old_components not in engine:
    raise SystemExit("relational component block not found")
engine = engine.replace(old_components, new_components, 1)

old_legacy = '      legacyBoxCost: toMoneyOrNull(order.boxCost),'
new_legacy = '      legacyBoxCost: toMoneyOrNull(order.boxCost) === 0 ? null : toMoneyOrNull(order.boxCost),'
if old_legacy not in engine:
    raise SystemExit("legacy box cost line not found")
engine = engine.replace(old_legacy, new_legacy, 1)
engine_path.write_text(engine)

ui_path = Path("client/src/components/admin/fulfillment/fulfillment-profitability-panel.tsx")
ui = ui_path.read_text()

old_fulfillment = '''        <DrilldownRow\n          label="تكلفة تجهيز AQUAVO"\n          value={data.aquavoFulfillmentCost}\n          status={data.fulfillmentCostStatus}\n          open={open === "fulfillment"}\n          onToggle={() => toggle("fulfillment")}\n        >\n          <EventsDrilldown\n            events={contributingEvents(events, ["original", "reshipment", "return_handling", "replacement", "adjustment"])}\n            loading={eventsQuery.isLoading}\n          />\n        </DrilldownRow>\n\n        <DrilldownRow\n          label="الشحنة الأصلية"\n          value={data.originalShipmentCost}\n          open={open === "original"}\n          onToggle={() => toggle("original")}\n        >\n          <EventsDrilldown events={contributingEvents(events, ["original"])} loading={eventsQuery.isLoading} />\n        </DrilldownRow>\n\n        <DrilldownRow\n          label="إعادة الإرسال"\n          value={data.reshipmentCost}\n          open={open === "reshipment"}\n          onToggle={() => toggle("reshipment")}\n        >\n          <EventsDrilldown events={contributingEvents(events, ["reshipment"])} loading={eventsQuery.isLoading} />\n        </DrilldownRow>\n\n        <DrilldownRow\n          label="معالجة الإرجاع"\n          value={data.returnHandlingCost}\n          open={open === "return_handling"}\n          onToggle={() => toggle("return_handling")}\n        >\n          <EventsDrilldown events={contributingEvents(events, ["return_handling"])} loading={eventsQuery.isLoading} />\n        </DrilldownRow>\n\n        <DrilldownRow\n          label="الاستبدال"\n          value={data.replacementCost}\n          open={open === "replacement"}\n          onToggle={() => toggle("replacement")}\n        >\n          <EventsDrilldown events={contributingEvents(events, ["replacement"])} loading={eventsQuery.isLoading} />\n        </DrilldownRow>'''
new_fulfillment = '''        {data.aquavoFulfillmentCost != null && (\n          <DrilldownRow\n            label="تكلفة تجهيز AQUAVO"\n            value={data.aquavoFulfillmentCost}\n            status={data.fulfillmentCostStatus}\n            open={open === "fulfillment"}\n            onToggle={() => toggle("fulfillment")}\n          >\n            <EventsDrilldown\n              events={contributingEvents(events, ["original", "reshipment", "return_handling", "replacement", "adjustment"])}\n              loading={eventsQuery.isLoading}\n            />\n          </DrilldownRow>\n        )}'''
if old_fulfillment not in ui:
    raise SystemExit("fulfillment UI block not found")
ui = ui.replace(old_fulfillment, new_fulfillment, 1)

old_optional = '''        <DrilldownRow label="كلفة التوصيل" value={data.courierCost} />\n        <DrilldownRow label="العمولات" value={data.commissions} />\n        <DrilldownRow label="رسوم الدفع" value={data.paymentFees} />\n        <DrilldownRow label="تكاليف مباشرة أخرى" value={data.otherDirectCosts} />\n\n        <DrilldownRow label="إجمالي التكلفة المباشرة المعروفة" value={data.totalKnownDirectCost} emphasis />\n        <DrilldownRow label="الربح المباشر" value={data.contributionProfit} emphasis />'''
new_optional = '''        {data.courierCost != null && <DrilldownRow label="كلفة التوصيل" value={data.courierCost} />}\n        {data.commissions != null && <DrilldownRow label="العمولات" value={data.commissions} />}\n        {data.paymentFees != null && <DrilldownRow label="رسوم الدفع" value={data.paymentFees} />}\n        {data.otherDirectCosts != null && <DrilldownRow label="تكاليف مباشرة أخرى" value={data.otherDirectCosts} />}\n\n        {data.totalKnownDirectCost != null && (\n          <DrilldownRow label="إجمالي التكلفة المباشرة" value={data.totalKnownDirectCost} emphasis />\n        )}\n        {data.contributionProfit != null && (\n          <DrilldownRow label="الربح المباشر" value={data.contributionProfit} emphasis />\n        )}'''
if old_optional not in ui:
    raise SystemExit("optional direct-cost UI block not found")
ui = ui.replace(old_optional, new_optional, 1)

old_margin = '''      <div className="mt-2 flex items-center justify-between gap-2 px-2">\n        <span className="text-sm text-muted-foreground">هامش الربح المباشر</span>\n        <span data-testid="contribution-margin" className="text-sm font-semibold tabular-nums">\n          {formatMargin(data.contributionMargin)}\n        </span>\n      </div>'''
new_margin = '''      {data.contributionMargin != null ? (\n        <div className="mt-2 flex items-center justify-between gap-2 px-2">\n          <span className="text-sm text-muted-foreground">هامش الربح المباشر</span>\n          <span data-testid="contribution-margin" className="text-sm font-semibold tabular-nums">\n            {formatMargin(data.contributionMargin)}\n          </span>\n        </div>\n      ) : (\n        <div className="mt-3 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-200">\n          {data.productCogs == null\n            ? "الربح النهائي يظهر بعد اكتمال كلفة المنتجات."\n            : data.aquavoFulfillmentCost == null\n              ? "كلفة المنتجات واضحة. الربح النهائي يظهر بعد تثبيت كلفة تجهيز الطلب."\n              : "الربح النهائي ينتظر اكتمال بقية التكاليف المباشرة."}\n        </div>\n      )}'''
if old_margin not in ui:
    raise SystemExit("margin UI block not found")
ui = ui.replace(old_margin, new_margin, 1)
ui_path.write_text(ui)

test_path = Path("server/__tests__/profitability-truth-regression.test.ts")
test_path.write_text(r'''import { describe, expect, it } from "vitest";
import {
  buildOrderCostBreakdown,
  resolveRelationalSnapshotComponent,
} from "../services/accounting-engine.js";

describe("profitability truth regressions", () => {
  it("preserves genuine zero ancillary costs on an exact relational snapshot", () => {
    expect(resolveRelationalSnapshotComponent("0", "exact")).toBe(0);
    expect(resolveRelationalSnapshotComponent(0, "verified_zero")).toBe(0);
    expect(resolveRelationalSnapshotComponent("81", "exact")).toBe(81);
  });

  it("keeps ambiguous zero conservative on non-exact snapshots", () => {
    expect(resolveRelationalSnapshotComponent("0", "estimated")).toBeNull();
    expect(resolveRelationalSnapshotComponent(0, "unknown")).toBeNull();
    expect(resolveRelationalSnapshotComponent(null, "exact")).toBeNull();
  });

  it("reports the real AQUAVO order COGS and does not flag box_cost=0 as legacy residue", () => {
    const order = {
      id: "148d28d6-c180-48be-9f5f-e46e867dc481",
      orderNumber: "FH-260820-2E8CCB97",
      status: "pending",
      createdAt: new Date("2026-08-20T21:55:38.397Z"),
      total: "17960",
      roundedTotal: "18000",
      shippingCost: "5000",
      boxCost: "0",
    } as any;

    const profit = {
      revenue: 13000,
      costStatus: "exact",
      items: [
        { productId: "houyi-planting-ring", name: "حلقة تثبيت نباتات — سيراميك بركاني", qty: 4,
          priceAtPurchase: 740, unitCostPrice: 81, unitPackagingCost: 0, unitInsertCost: 0, costStatus: "exact" },
        { productId: "houyi-acrylic-pump-compartment", name: "حجرة فلتر أكريليك شفافة", qty: 1,
          priceAtPurchase: 10000, unitCostPrice: 4842, unitPackagingCost: 0, unitInsertCost: 0, costStatus: "exact" },
      ],
    } as any;

    const breakdown = buildOrderCostBreakdown(order, profit, undefined);
    expect(breakdown.productCogs).toBe(5166);
    expect(breakdown.supplierPackaging).toBe(0);
    expect(breakdown.unallocated.unknownProductLines).toBe(0);
    expect(breakdown.unallocated.legacyBoxCost).toBeNull();
    expect(breakdown.contributionProfit).toBeNull();
  });
});
''')
