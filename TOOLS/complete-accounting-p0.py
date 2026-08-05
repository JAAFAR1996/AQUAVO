from pathlib import Path
import re


def sub(path: Path, pattern: str, replacement: str, expected: int = 1, flags: int = 0) -> None:
    text = path.read_text(encoding="utf-8")
    text, count = re.subn(pattern, replacement, text, flags=flags)
    if count != expected:
        raise RuntimeError(f"{path}: expected {expected} substitutions, got {count}: {pattern}")
    path.write_text(text, encoding="utf-8")


# Preserve exact order-line and variant identity through Zod.
shared = Path("shared/accounting.ts")
sub(
    shared,
    r"const affectedItemSchema = z\.object\(\{\n\s*productId: z\.string\(\)\.min\(1\),\n\s*qty: z\.number\(\)\.int\(\)\.positive\(\),\n\s*priceAtPurchase: z\.number\(\)\.min\(0\),\n\s*cogsAtTime: z\.number\(\)\.min\(0\),\n\s*\}\);",
    """const affectedItemSchema = z.object({
  productId: z.string().min(1),
  orderItemId: z.string().min(1).optional(),
  variantId: z.string().min(1).nullable().optional(),
  qty: z.number().int().positive(),
  priceAtPurchase: z.number().min(0),
  cogsAtTime: z.number().min(0),
});""",
)

# Return UI: one state per sale line/variant, database-owned COGS, and no mixed
# sellable/non-sellable items inside an event-level restocked flag.
modal = Path("client/src/components/admin/order-return-adjustment-modal.tsx")
sub(
    modal,
    r"interface OrderItem \{\n.*?\n\}",
    """interface OrderItem {
  id?: string;
  orderItemId?: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  variantId?: string;
  variantLabel?: string;
}""",
    flags=re.S,
)
sub(
    modal,
    r"const errMsg = \(e: unknown\) =>\n\s*e instanceof Error \? e\.message : \"خطأ غير معروف\";",
    """const errMsg = (e: unknown) =>
  e instanceof Error ? e.message : "خطأ غير معروف";

const orderLineKey = (item: OrderItem): string =>
  item.orderItemId ?? item.id ?? `${item.productId}::${item.variantId ?? "__none__"}`;

const orderLineLabel = (item: OrderItem): string => {
  const variant = item.variantLabel ?? item.variantId;
  return variant ? `${item.productName} (${variant})` : item.productName;
};""",
)
text = modal.read_text(encoding="utf-8")
text = re.sub(r"\n\s*const \[productWriteOffAmount, setProductWriteOffAmount\] = useState\(0\);", "", text)
text = re.sub(r"\n\s*const \[cogsLoss, setCogsLoss\] = useState\(0\);", "", text)
text = re.sub(r"\n\s*setProductWriteOffAmount\(0\);", "", text)
text = re.sub(r"\n\s*setCogsLoss\(0\);", "", text)
modal.write_text(text, encoding="utf-8")
sub(
    modal,
    r"\n\s*const productIds = order\.items\.map\(.*?\n\s*const computeSuggestions = \(",
    "\n\n  const computeSuggestions = (",
    flags=re.S,
)
sub(
    modal,
    r"  const computeSuggestions = \(.*?\n  const goToStep2 = \(\) => \{",
    """  const computeSuggestions = (
    states: Record<string, ItemState>,
    eventType: OrderReturnEventType
  ) => {
    const scenario = SCENARIO_META[eventType];
    let totalRevenue = 0;

    order.items.forEach((item) => {
      const state = states[orderLineKey(item)];
      if ((state?.qty ?? 0) > 0) totalRevenue += state.qty * item.price;
    });

    setRefundAmount(Math.round(totalRevenue));
    setPackagingLoss(0);
    setDeliveryCostLoss(scenario.deliveryCostLost ? (order.shippingCost ?? 5000) : 0);
    setReturnShippingCost(0);
  };

  const goToStep2 = () => {""",
    flags=re.S,
)
text = modal.read_text(encoding="utf-8").replace("initStates[i.productId]", "initStates[orderLineKey(i)]")
text, count = re.subn(
    r"  const updateItemState = \(.*?\n  const voidMutation = useMutation",
    """  const updateItemState = (lineKey: string, patch: Partial<ItemState>) => {
    setItemStates((prev) => ({ ...prev, [lineKey]: { ...prev[lineKey], ...patch } }));
  };

  const resetItem = (lineKey: string) => {
    setItemStates((prev) => ({
      ...prev,
      [lineKey]: { qty: 0, restocked: false, damaged: false, reason: "" },
    }));
  };

  const voidMutation = useMutation""",
    text,
    count=1,
    flags=re.S,
)
if count != 1:
    raise RuntimeError("modal update/reset block not found")
for old, new in {
    "itemStates[item.productId]": "itemStates[orderLineKey(item)]",
    "itemStates[i.productId]": "itemStates[orderLineKey(i)]",
    "key={item.productId}": "key={orderLineKey(item)}",
    "updateItemState(item.productId": "updateItemState(orderLineKey(item)",
    "resetItem(item.productId)": "resetItem(orderLineKey(item))",
}.items():
    text = text.replace(old, new)
modal.write_text(text, encoding="utf-8")
sub(
    modal,
    r"  const handleConfirm = \(\) => \{.*?\n  const totalImpact =",
    """  const handleConfirm = () => {
    const selectedItems = order.items.filter(
      (item) => (itemStates[orderLineKey(item)]?.qty ?? 0) > 0
    );
    const selectedStates = selectedItems.map(
      (item) => itemStates[orderLineKey(item)]
    );

    if (selectedStates.some((state) => state.restocked && state.damaged)) {
      toast({
        title: "حالة المنتج غير صالحة",
        description: "المنتج التالف لا يمكن إرجاعه للمخزون",
        variant: "destructive",
      });
      return;
    }

    if (new Set(selectedStates.map((state) => state.restocked)).size > 1) {
      toast({
        title: "افصل حالات الراجع",
        description: "سجل المنتجات الصالحة للبيع والتالفة كحدثين منفصلين حتى يبقى المخزون والحساب صحيحين",
        variant: "destructive",
      });
      return;
    }

    const affectedItems = selectedItems.map((item) => {
      const state = itemStates[orderLineKey(item)];
      return {
        productId: item.productId,
        orderItemId: item.orderItemId ?? item.id,
        variantId: item.variantId ?? null,
        qty: state.qty,
        priceAtPurchase: item.price,
        cogsAtTime: 0,
      };
    });

    const anyRestocked = selectedStates[0]?.restocked ?? false;
    const itemReasons = selectedItems
      .filter((item) => itemStates[orderLineKey(item)]?.reason?.trim())
      .map((item) => `${orderLineLabel(item)}: ${itemStates[orderLineKey(item)].reason.trim()}`)
      .join(" | ");
    const finalNote = [note.trim(), itemReasons].filter(Boolean).join(" — ") || undefined;

    createMutation.mutate({
      orderId: order.id,
      type,
      reason: reason.trim() || undefined,
      refundAmount,
      deliveryCostLoss,
      returnShippingCost,
      packagingLoss,
      productWriteOffAmount: 0,
      cogsLoss: 0,
      restocked: anyRestocked,
      affectedItems: affectedItems.length > 0 ? affectedItems : undefined,
      note: finalNote,
    });
  };

  const totalImpact =""",
    flags=re.S,
)
sub(
    modal,
    r"  const totalImpact =\n.*?;\n\n  const orderTotal",
    """  const totalImpact =
    refundAmount + deliveryCostLoss + returnShippingCost + packagingLoss;

  const orderTotal""",
    flags=re.S,
)
text = modal.read_text(encoding="utf-8")
text = text.replace(
    '<td className="p-2 font-medium">{item.productName}</td>',
    """<td className="p-2 font-medium">
                            <span className="block">{item.productName}</span>
                            {(item.variantLabel ?? item.variantId) && (
                              <span className="block text-xs text-muted-foreground mt-0.5">
                                {item.variantLabel ?? item.variantId}
                              </span>
                            )}
                          </td>""",
    1,
)
text = text.replace(
    "ملاحظة: التغييرات هنا لا تُحدّث المخزون تلقائياً — للتسجيل فقط",
    "المخزون لا يتغير عند الحفظ ويتحدث تلقائيا فقط بعد اعتماد الحدث من Snapshot الطلب الاصلي",
)
text, count = re.subn(
    r'\{ label: "خسارة التغليف".*?\n\s*\{ label: "خسارة COGS".*?\},',
    '{ label: "خسارة تغليف اضافية", value: packagingLoss, set: setPackagingLoss, hint: "ادخلها فقط اذا كانت كلفة جديدة غير تجهيز الطلب الاصلي" },',
    text,
    count=1,
    flags=re.S,
)
if count != 1:
    raise RuntimeError("modal loss inputs not found")
text = text.replace("{item.productName} × {s.qty}", "{orderLineLabel(item)} × {s.qty}")
text, count = re.subn(
    r'\["خسارة التغليف", packagingLoss\],\n\s*\["شطب المنتج".*?\n\s*\["خسارة COGS".*?\],',
    '["خسارة تغليف اضافية", packagingLoss],',
    text,
    count=1,
    flags=re.S,
)
if count != 1:
    raise RuntimeError("modal preview loss rows not found")
modal.write_text(text, encoding="utf-8")
modal_text = modal.read_text(encoding="utf-8")
for token in ["itemStates[item.productId]", "itemStates[i.productId]", "key={item.productId}", "costMap["]:
    if token in modal_text:
        raise RuntimeError(f"stale unsafe modal token: {token}")
for token in ["variantId: item.variantId ?? null", "orderItemId: item.orderItemId ?? item.id", "cogsAtTime: 0", "new Set(selectedStates.map((state) => state.restocked)).size > 1"]:
    if token not in modal_text:
        raise RuntimeError(f"missing modal token: {token}")

# Migration runner and runtime health gate must require the full chain through 0070.
runner = Path("script/apply-accounting-v2-migrations.ts")
text = runner.read_text(encoding="utf-8")
if '"0070_accounting_ledger_backed_views.sql"' not in text:
    text = text.replace(
        '  "0066_accounting_reassert_refusal_inventory_after_0062.sql",',
        '  "0066_accounting_reassert_refusal_inventory_after_0062.sql",\n  "0067_orders_client_ip_schema_drift.sql",\n  "0068_accounting_delivery_readiness_guard.sql",\n  "0069_accounting_return_integrity.sql",\n  "0070_accounting_ledger_backed_views.sql",',
        1,
    )
text = text.replace("APPLY_0051_TO_0066", "APPLY_0051_TO_0070")
marker = "        EXISTS(SELECT 1 FROM public.schema_migrations WHERE version='0066_accounting_reassert_refusal_inventory_after_0062' AND rolled_back_at IS NULL) AS migration_0066,"
if "AS migration_0070" not in text:
    text = text.replace(
        marker,
        marker + "\n"
        + "        EXISTS(SELECT 1 FROM public.schema_migrations WHERE version='0067_orders_client_ip_schema_drift' AND rolled_back_at IS NULL) AS migration_0067,\n"
        + "        EXISTS(SELECT 1 FROM public.schema_migrations WHERE version='0068_accounting_delivery_readiness_guard' AND rolled_back_at IS NULL) AS migration_0068,\n"
        + "        EXISTS(SELECT 1 FROM public.schema_migrations WHERE version='0069_accounting_return_integrity' AND rolled_back_at IS NULL) AS migration_0069,\n"
        + "        EXISTS(SELECT 1 FROM public.schema_migrations WHERE version='0070_accounting_ledger_backed_views' AND rolled_back_at IS NULL) AS migration_0070,\n"
        + "        to_regprocedure('public.assert_order_ready_for_accounting_delivery(text)') IS NOT NULL AS delivery_readiness_function,\n"
        + "        to_regprocedure('public.accounting_period_account_balance(text,text)') IS NOT NULL AS ledger_balance_function,\n"
        + "        EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='orders_accounting_delivery_readiness_guard' AND NOT tgisinternal) AS delivery_readiness_guard,",
        1,
    )
runner.write_text(text, encoding="utf-8")

route = Path("server/routes/accounting-v2.ts")
text = route.read_text(encoding="utf-8")
text, count = re.subn(
    r"EXISTS\(\n\s*SELECT 1 FROM public\.schema_migrations\n\s*WHERE version='0066_accounting_reassert_refusal_inventory_after_0062'.*?\n\s*\) AS migration_0066",
    """EXISTS(
        SELECT 1 FROM public.schema_migrations
        WHERE version='0070_accounting_ledger_backed_views' AND rolled_back_at IS NULL
      ) AS migration_0070,
      to_regprocedure('public.assert_order_ready_for_accounting_delivery(text)') IS NOT NULL AS delivery_readiness_function,
      to_regprocedure('public.accounting_period_account_balance(text,text)') IS NOT NULL AS ledger_balance_function,
      EXISTS(
        SELECT 1 FROM pg_trigger
        WHERE tgname='orders_accounting_delivery_readiness_guard' AND NOT tgisinternal
      ) AS delivery_readiness_guard""",
    text,
    count=1,
    flags=re.S,
)
if count != 1:
    raise RuntimeError("Accounting V2 migration health block not found")
text = text.replace("ACCOUNTING_V2_MIGRATIONS_0051_TO_0066_REQUIRED", "ACCOUNTING_V2_MIGRATIONS_0051_TO_0070_REQUIRED")
text = text.replace('migrationsThrough: "0066"', 'migrationsThrough: "0070"')
route.write_text(text, encoding="utf-8")

vercel = Path("vercel.json")
vercel.write_text(vercel.read_text(encoding="utf-8").replace("APPLY_0051_TO_0066", "APPLY_0051_TO_0070"), encoding="utf-8")

# Node 24-safe contract tests and current deployment contract expectations.
for filename in [
    "accounting-cod-refusal-migration-contract.test.ts",
    "accounting-customer-credit-posting-links.test.ts",
    "accounting-warranty-refusal-separation.test.ts",
]:
    path = Path("server/__tests__") / filename
    text = path.read_text(encoding="utf-8")
    if 'import { join } from "node:path";' not in text:
        text = text.replace('import { readFileSync } from "node:fs";\n', 'import { readFileSync } from "node:fs";\nimport { join } from "node:path";\n', 1)
    text, count = re.subn(r'new URL\("\.\./\.\./migrations/([^\"]+)", import\.meta\.url\)', r'join(process.cwd(), "migrations", "\1")', text)
    if count == 0:
        raise RuntimeError(f"{filename}: no migration URL replaced")
    path.write_text(text, encoding="utf-8")

review = Path("server/__tests__/accounting-v2-review-fixes-contract.test.ts")
text = review.read_text(encoding="utf-8")
text = text.replace("لا توجد بيانات جاهزية لهذه الفترة", "لا توجد بيانات جاهزية محاسبية لهذه الفترة")
text = text.replace("retains the 0061 carrier guard while the main V2 router requires 0062", "retains the carrier guard while the main V2 router requires the P0 chain through 0070")
text = text.replace('expect(reports).toContain("migration_0062");', 'expect(reports).toContain("migration_0070");')
text = text.replace("ACCOUNTING_V2_MIGRATIONS_0051_TO_0062_REQUIRED", "ACCOUNTING_V2_MIGRATIONS_0051_TO_0070_REQUIRED")
text = text.replace("APPLY_0051_TO_0062", "APPLY_0051_TO_0070")
text = text.replace('"0062_accounting_automation_opening_balances.sql"', '"0070_accounting_ledger_backed_views.sql"')
review.write_text(text, encoding="utf-8")

Path("server/__tests__/return-variant-id-contract.test.ts").write_text('''import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { orderReturnEventInputSchema } from "../../shared/accounting";

const root = process.cwd();
const source = () => readFileSync(join(root, "client/src/components/admin/order-return-adjustment-modal.tsx"), "utf8");

describe("return variant and disposition contract", () => {
  it("preserves order line and variant identity through Zod", () => {
    const parsed = orderReturnEventInputSchema.parse({
      orderId: "order-1",
      type: "partial_return",
      affectedItems: [{ productId: "p", orderItemId: "line", variantId: "v", qty: 1, priceAtPurchase: 100, cogsAtTime: 0 }],
    });
    expect(parsed.affectedItems?.[0]).toMatchObject({ orderItemId: "line", variantId: "v" });
  });

  it("uses order-line keys and sends exact variant identity", () => {
    expect(source()).toContain("const orderLineKey = (item: OrderItem)");
    expect(source()).toContain("orderItemId: item.orderItemId ?? item.id");
    expect(source()).toContain("variantId: item.variantId ?? null");
    expect(source()).not.toContain("itemStates[item.productId]");
  });

  it("does not trust current cost and rejects mixed disposition", () => {
    expect(source()).toContain("cogsAtTime: 0");
    expect(source()).not.toContain("costMap[");
    expect(source()).toContain("new Set(selectedStates.map((state) => state.restocked)).size > 1");
  });
});
''', encoding="utf-8")

# Write the permanent CI definition. The temporary completion job disappears in
# the commit produced by the workflow that invokes this script.
Path(".github/workflows/accounting-v2-ci.yml").write_text('''name: Accounting V2 CI

on:
  push:
    branches:
      - main
      - agent/accounting-cod-august-fix-20260802
    paths: &accounting_paths
      - "server/middleware/accounting-auth-v2.ts"
      - "server/routes/accounting-health-v2.ts"
      - "server/routes/accounting-v2.ts"
      - "server/routes/accounting-automatic-returns-v2.ts"
      - "server/routes/accounting-monthly-position-v2.ts"
      - "server/routes/accounting-setup-v2.ts"
      - "server/routes/accounting-smart-carrier-v2.ts"
      - "server/routes/accounting-carrier-correction-v2.ts"
      - "server/routes/accounting-operations-v2.ts"
      - "server/routes/accounting-evidence-upload-v2.ts"
      - "server/routes/admin-orders-v2.ts"
      - "server/routes/invoice-v2.ts"
      - "server/routes/cron.ts"
      - "server/routes/upload.ts"
      - "server/services/accounting-auto-close-v2.ts"
      - "server/services/order-return-automation-v2.ts"
      - "server/utils/cloudinary.ts"
      - "server/__tests__/accounting-*.test.ts"
      - "server/__tests__/return-variant-id-contract.test.ts"
      - "server/__tests__/cod-refusal-policy.test.ts"
      - "shared/accounting.ts"
      - "shared/accounting-schema-v2.ts"
      - "shared/cod-accounting.ts"
      - "shared/cod-refusal-policy.ts"
      - "shared/order-financials.ts"
      - "client/src/lib/accountant-pdf-v2.ts"
      - "client/src/components/admin/order-return-adjustment-modal.tsx"
      - "client/src/components/admin/finance-accounting-*.tsx"
      - "client/src/components/admin/finance-smart-carrier-center-v2.tsx"
      - "client/src/components/admin/finance-automatic-returns-v2.tsx"
      - "client/src/components/admin/finance-carrier-position-v2.tsx"
      - "client/src/pages/admin/finance.tsx"
      - "migrations/005*.sql"
      - "migrations/006*.sql"
      - "migrations/007*.sql"
      - "script/apply-accounting-v2-migrations.ts"
      - "tsconfig.accounting.json"
      - ".github/workflows/accounting-v2-ci.yml"
  pull_request:
    paths: *accounting_paths

permissions:
  contents: read

concurrency:
  group: accounting-v2-${{ github.ref }}
  cancel-in-progress: true

jobs:
  verify:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Enable Corepack
        run: corepack enable
      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10.0.0
          run_install: false
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      - name: Strict accounting typecheck
        run: pnpm check:accounting
      - name: Accounting contract and migration tests
        run: >-
          pnpm exec vitest run
          server/__tests__/accounting-cod-v2-contract.test.ts
          server/__tests__/accounting-v2-wiring-contract.test.ts
          server/__tests__/accounting-v2-operating-defaults-contract.test.ts
          server/__tests__/accounting-v2-review-fixes-contract.test.ts
          server/__tests__/accounting-smart-carrier-v2-contract.test.ts
          server/__tests__/accounting-v2-automation-contract.test.ts
          server/__tests__/accounting-v2-migration-0062-execution.test.ts
          server/__tests__/accounting-v2-p0-migration-contract.test.ts
          server/__tests__/return-variant-id-contract.test.ts
          server/__tests__/accounting-cod-refusal-migration-contract.test.ts
          server/__tests__/accounting-customer-credit-posting-links.test.ts
          server/__tests__/accounting-warranty-refusal-separation.test.ts
          server/__tests__/cod-refusal-policy.test.ts
      - name: Migration ledger governance
        run: pnpm check:migrations
      - name: Production build
        run: pnpm build
''', encoding="utf-8")

# Temporary workflow is no longer needed once the existing Accounting V2 CI job
# commits this patch.
Path(".github/workflows/one-off-return-variant-patch.yml").unlink(missing_ok=True)
