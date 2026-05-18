# Finance Scenario Calculator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a read-only "حاسبة السيناريوهات" tab to /admin/finance — a pure-frontend simulator that lets admins model pricing, cost, and ad scenarios without touching any database data.

**Architecture:** One new component `finance-scenario-calculator.tsx` handles all logic (product search, simulation fields, live calculations, presets, formula explanation). The existing `finance.tsx` page gets one new `<TabsTrigger>` and `<TabsContent>`. Zero backend changes. Zero writes.

**Tech Stack:** React 19 + TanStack Query (read-only) + inline styles (matching existing finance style) + `@/types Product` interface

---

### Task 1: Create the scenario calculator component

**Files:**
- Create: `client/src/components/admin/finance-scenario-calculator.tsx`

- [ ] Create the file with full implementation (product selector, sim fields, live calculations, presets, comparison, labels, formula section)

```tsx
import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Product } from "@/types";

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n) + " د.ع";

const fmtPct = (n: number) =>
  n.toFixed(1) + "%";

function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const S = {
  card: {
    background: "#0d1f3c",
    border: "1px solid #199bb820",
    borderRadius: 12,
    padding: "18px 20px",
    marginBottom: 16,
  } as React.CSSProperties,
  sectionTitle: {
    color: "#199bb8",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase" as const,
    marginBottom: 14,
    borderBottom: "1px solid #199bb820",
    paddingBottom: 8,
  } as React.CSSProperties,
  label: {
    color: "#94a3b8",
    fontSize: 11,
    marginBottom: 4,
    display: "block",
  } as React.CSSProperties,
  input: {
    background: "#010611",
    border: "1px solid #1e3a5f",
    color: "#e2e8f0",
    borderRadius: 8,
    padding: "6px 10px",
    width: "100%",
    fontSize: 13,
    boxSizing: "border-box" as const,
    direction: "ltr" as const,
    textAlign: "right" as const,
  } as React.CSSProperties,
  row: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  } as React.CSSProperties,
  row3: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 12,
  } as React.CSSProperties,
  kpiCard: (color: string) => ({
    background: "#010611",
    border: `1px solid ${color}30`,
    borderRadius: 10,
    padding: "12px 14px",
  } as React.CSSProperties),
  kpiLabel: {
    color: "#64748b",
    fontSize: 10,
    marginBottom: 4,
  } as React.CSSProperties,
  kpiValue: (color: string) => ({
    color,
    fontSize: 16,
    fontWeight: 700,
  } as React.CSSProperties),
  kpiSub: {
    color: "#475569",
    fontSize: 10,
    marginTop: 2,
  } as React.CSSProperties,
  badge: (bg: string, color: string) => ({
    display: "inline-block",
    background: bg,
    color,
    fontSize: 11,
    fontWeight: 600,
    padding: "3px 10px",
    borderRadius: 6,
    marginLeft: 6,
    marginBottom: 4,
  } as React.CSSProperties),
  presetBtn: (active: boolean) => ({
    padding: "5px 12px",
    borderRadius: 7,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    background: active ? "#199bb820" : "#0d1f3c",
    border: active ? "1.5px solid #199bb8" : "1.5px solid #1e3a5f",
    color: active ? "#199bb8" : "#94a3b8",
  } as React.CSSProperties),
  warnBox: {
    background: "#78350f20",
    border: "1px solid #d97706",
    borderRadius: 8,
    padding: "8px 12px",
    color: "#fbbf24",
    fontSize: 12,
    marginBottom: 12,
  } as React.CSSProperties,
  errBox: {
    background: "#450a0a20",
    border: "1px solid #ef4444",
    borderRadius: 8,
    padding: "8px 12px",
    color: "#fca5a5",
    fontSize: 12,
    marginBottom: 12,
  } as React.CSSProperties,
  infoBox: {
    background: "#0f2a1a",
    border: "1px solid #199bb840",
    borderRadius: 8,
    padding: "8px 14px",
    color: "#94a3b8",
    fontSize: 12,
    marginBottom: 16,
    lineHeight: 1.6,
  } as React.CSSProperties,
};

// ── Simulation fields type ─────────────────────────────────────────────────────

interface SimFields {
  salePrice: string;
  costPrice: string;
  packagingCost: string;
  insertCost: string;
  deliveryFee: string;
  actualDeliveryCost: string;
  discountAmount: string;
  adCostPerOrder: string;
  expectedQty: string;
  returnRate: string;
  extraExpense: string;
}

function defaultSim(p: Product | null): SimFields {
  return {
    salePrice: p ? String(toNum(p.price)) : "",
    costPrice: p ? String(toNum(p.costPrice)) : "",
    packagingCost: p ? String(toNum(p.packagingCost)) : "",
    insertCost: p ? String(toNum(p.insertCost)) : "",
    deliveryFee: "5000",
    actualDeliveryCost: "3500",
    discountAmount: "0",
    adCostPerOrder: "0",
    expectedQty: "10",
    returnRate: "15",
    extraExpense: "0",
  };
}

type PresetKey =
  | "no_ad"
  | "light_ad"
  | "medium_ad"
  | "discount_10"
  | "qty_10"
  | "heavy_delivery"
  | "new_price";

// ── Calculations ───────────────────────────────────────────────────────────────

interface SimResult {
  grossRevenue: number;
  deliveryCollected: number;
  productCostTotal: number;
  packagingTotal: number;
  insertTotal: number;
  actualDeliveryTotal: number;
  discountTotal: number;
  adSpendTotal: number;
  extraExpensesTotal: number;
  grossProfit: number;
  estimatedNetProfit: number;
  grossMargin: number;
  netMargin: number;
  profitPerOrder: number;
  breakEvenPrice: number;
  maxSafeAdCost: number;
  inventoryValueAtCost: number;
  potentialRevenue: number;
  potentialGrossProfit: number;
  effectiveQty: number;
}

function calculate(f: SimFields, stock: number): SimResult {
  const salePrice = toNum(f.salePrice);
  const costPrice = toNum(f.costPrice);
  const packagingCost = toNum(f.packagingCost);
  const insertCost = toNum(f.insertCost);
  const deliveryFee = toNum(f.deliveryFee);
  const actualDeliveryCost = toNum(f.actualDeliveryCost);
  const discountAmount = toNum(f.discountAmount);
  const adCostPerOrder = toNum(f.adCostPerOrder);
  const expectedQty = Math.max(1, Math.round(toNum(f.expectedQty)));
  const returnRatePct = Math.min(100, Math.max(0, toNum(f.returnRate)));
  const extraExpense = toNum(f.extraExpense);

  // Effective delivered quantity after returns
  const returnRate = returnRatePct / 100;
  const effectiveQty = expectedQty * (1 - returnRate);

  // Revenue-side
  const grossRevenue = salePrice * expectedQty;
  const deliveryCollected = deliveryFee * expectedQty;

  // Cost-side (per delivered order only for returns, but costs incurred on all)
  const productCostTotal = costPrice * expectedQty;
  const packagingTotal = packagingCost * expectedQty;
  const insertTotal = insertCost * expectedQty;
  const actualDeliveryTotal = actualDeliveryCost * expectedQty;
  const discountTotal = discountAmount * expectedQty;
  const adSpendTotal = adCostPerOrder * expectedQty;
  const extraExpensesTotal = extraExpense * expectedQty;

  // Gross profit = revenue - direct product costs
  const grossProfit =
    grossRevenue - productCostTotal - packagingTotal - insertTotal;

  // Net profit: add delivery collected, subtract all other costs
  // For returned orders, sale revenue is lost but delivery cost & other costs already counted
  const returnedRevenueLoss = salePrice * expectedQty * returnRate;
  const estimatedNetProfit =
    grossProfit -
    returnedRevenueLoss +
    deliveryCollected -
    actualDeliveryTotal -
    discountTotal -
    adSpendTotal -
    extraExpensesTotal;

  const effectiveRevenue = salePrice * effectiveQty + deliveryCollected;

  const grossMargin =
    effectiveRevenue > 0
      ? ((grossRevenue - productCostTotal - packagingTotal - insertTotal) /
          grossRevenue) *
        100
      : 0;

  const netMargin =
    effectiveRevenue > 0
      ? (estimatedNetProfit / effectiveRevenue) * 100
      : 0;

  const profitPerOrder =
    effectiveQty > 0 ? estimatedNetProfit / effectiveQty : 0;

  // Break-even: total costs per order / qty (delivered)
  const totalCostPerOrder =
    effectiveQty > 0
      ? (productCostTotal +
          packagingTotal +
          insertTotal +
          actualDeliveryTotal +
          discountTotal +
          adSpendTotal +
          extraExpensesTotal) /
        effectiveQty
      : 0;

  const breakEvenPrice = totalCostPerOrder;

  // Max safe ad cost = profit per order before ad spend
  const profitBeforeAd =
    effectiveQty > 0
      ? estimatedNetProfit / effectiveQty + adCostPerOrder
      : 0;
  const maxSafeAdCost = Math.max(0, profitBeforeAd);

  // Inventory
  const inventoryValueAtCost = costPrice * stock;
  const potentialRevenue = salePrice * stock;
  const potentialGrossProfit =
    (salePrice - costPrice - packagingCost - insertCost) * stock;

  return {
    grossRevenue,
    deliveryCollected,
    productCostTotal,
    packagingTotal,
    insertTotal,
    actualDeliveryTotal,
    discountTotal,
    adSpendTotal,
    extraExpensesTotal,
    grossProfit,
    estimatedNetProfit,
    grossMargin,
    netMargin,
    profitPerOrder,
    breakEvenPrice,
    maxSafeAdCost,
    inventoryValueAtCost,
    potentialRevenue,
    potentialGrossProfit,
    effectiveQty,
  };
}

// ── Decision labels ────────────────────────────────────────────────────────────

interface DecisionLabel {
  text: string;
  type: "success" | "warn" | "error" | "info";
}

function getDecisionLabels(
  f: SimFields,
  result: SimResult,
  product: Product | null,
): DecisionLabel[] {
  const labels: DecisionLabel[] = [];
  const salePrice = toNum(f.salePrice);
  const costPrice = toNum(f.costPrice);
  const adCost = toNum(f.adCostPerOrder);
  const stock = toNum(product?.stock);
  const actualDelivery = toNum(f.actualDeliveryCost);

  if (salePrice <= 0) {
    labels.push({ text: "قريباً — غير قابل للبيع حالياً", type: "info" });
    return labels;
  }
  if (stock <= 0) {
    labels.push({ text: "نفد المخزون — غير متاح", type: "error" });
  }
  if (costPrice <= 0) {
    labels.push({
      text: "الكلفة ناقصة — القرار غير دقيق",
      type: "warn",
    });
  }
  if (result.estimatedNetProfit > 0 && result.netMargin >= 20) {
    labels.push({ text: "مربح", type: "success" });
  } else if (result.estimatedNetProfit > 0 && result.netMargin < 20) {
    labels.push({ text: "هامشه ضعيف", type: "warn" });
  } else if (result.estimatedNetProfit <= 0) {
    labels.push({ text: "خسارة — راجع الكلف", type: "error" });
  }
  if (adCost > 0 && result.maxSafeAdCost <= 0) {
    labels.push({ text: "لا يصلح للإعلان وحده", type: "error" });
  } else if (adCost > 0 && result.netMargin >= 15) {
    labels.push({ text: "مناسب للترويج", type: "success" });
  }
  if (actualDelivery > salePrice) {
    labels.push({ text: "التوصيل أعلى من قيمة المنتج", type: "error" });
  }
  if (stock > 0 && stock <= 5) {
    labels.push({ text: "مخزون قليل — لا تسوي عليه حملة قوية", type: "warn" });
  }

  return labels;
}

// ── Comparison block ───────────────────────────────────────────────────────────

interface ComparisonData {
  currentPrice: number;
  currentProfitPerOrder: number;
  currentMargin: number;
}

function getCurrentComparison(product: Product | null): ComparisonData | null {
  if (!product) return null;
  const price = toNum(product.price);
  if (price <= 0) return null;
  const cost =
    toNum(product.costPrice) +
    toNum(product.packagingCost) +
    toNum(product.insertCost);
  const deliveryNet = 5000 - 3500; // default delivery fee - default actual cost
  const profit = price - cost + deliveryNet;
  const margin = price > 0 ? (profit / price) * 100 : 0;
  return {
    currentPrice: price,
    currentProfitPerOrder: profit,
    currentMargin: margin,
  };
}

// ── Main component ─────────────────────────────────────────────────────────────

export function FinanceScenarioCalculator() {
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [sim, setSim] = useState<SimFields>(defaultSim(null));
  const [activePreset, setActivePreset] = useState<PresetKey | null>(null);
  const [formulaOpen, setFormulaOpen] = useState(false);

  // Product search
  const { data: productsData, isLoading: loadingProducts } = useQuery<{
    products: Product[];
  }>({
    queryKey: ["products-sim-search", search],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "30" });
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/products?${params}`, {
        credentials: "include",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message ?? `خطأ ${res.status}`);
      return json;
    },
    staleTime: 60_000,
  });

  const products = productsData?.products ?? [];
  const stock = toNum(selectedProduct?.stock);

  // Live calculations
  const result = useMemo(
    () => calculate(sim, selectedProduct ? stock : 0),
    [sim, selectedProduct, stock],
  );

  const decisionLabels = useMemo(
    () => getDecisionLabels(sim, result, selectedProduct),
    [sim, result, selectedProduct],
  );

  const comparison = useMemo(
    () => getCurrentComparison(selectedProduct),
    [selectedProduct],
  );

  const handleSelect = useCallback(
    (p: Product) => {
      setSelectedProduct(p);
      setSim(defaultSim(p));
      setActivePreset(null);
    },
    [],
  );

  const setSf = useCallback(
    (key: keyof SimFields, val: string) => {
      setSim((prev) => ({ ...prev, [key]: val }));
      setActivePreset(null);
    },
    [],
  );

  const applyPreset = useCallback(
    (key: PresetKey) => {
      setActivePreset(key);
      setSim((prev) => {
        const base = { ...prev };
        const price = toNum(prev.salePrice);
        switch (key) {
          case "no_ad":
            return { ...base, adCostPerOrder: "0", discountAmount: "0" };
          case "light_ad":
            return { ...base, adCostPerOrder: "1000" };
          case "medium_ad":
            return { ...base, adCostPerOrder: "3000" };
          case "discount_10":
            return {
              ...base,
              discountAmount: String(Math.round(price * 0.1)),
            };
          case "qty_10":
            return { ...base, expectedQty: "10" };
          case "heavy_delivery":
            return { ...base, actualDeliveryCost: "6000" };
          case "new_price":
            return {
              ...base,
              salePrice: String(Math.round(price * 1.1)),
            };
          default:
            return base;
        }
      });
    },
    [],
  );

  const salePrice = toNum(sim.salePrice);
  const costPrice = toNum(sim.costPrice);
  const isComingSoon = selectedProduct && toNum(selectedProduct.price) <= 0;
  const missingCost =
    selectedProduct && costPrice <= 0 && toNum(selectedProduct.costPrice) <= 0;

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      {/* Disclaimer */}
      <div style={S.infoBox}>
        هذه الحاسبة افتراضية فقط ولا تغيّر بيانات المنتجات أو الطلبات — كل
        الأرقام للتخطيط والدراسة فقط
      </div>

      {/* Product selector */}
      <div style={S.card}>
        <div style={S.sectionTitle}>اختيار المنتج</div>
        <input
          type="text"
          placeholder="ابحث عن منتج..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...S.input, marginBottom: 10 }}
        />
        {loadingProducts && (
          <div style={{ color: "#64748b", fontSize: 12 }}>جاري التحميل...</div>
        )}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            maxHeight: 180,
            overflowY: "auto",
          }}
        >
          {products.map((p) => (
            <button
              key={p.id}
              onClick={() => handleSelect(p)}
              style={{
                padding: "4px 10px",
                borderRadius: 6,
                fontSize: 11,
                cursor: "pointer",
                background:
                  selectedProduct?.id === p.id ? "#199bb820" : "#010611",
                border:
                  selectedProduct?.id === p.id
                    ? "1.5px solid #199bb8"
                    : "1.5px solid #1e3a5f",
                color:
                  selectedProduct?.id === p.id ? "#199bb8" : "#94a3b8",
                textAlign: "right",
              }}
            >
              {p.name}
            </button>
          ))}
        </div>

        {selectedProduct && (
          <div
            style={{
              marginTop: 12,
              padding: "10px 14px",
              background: "#010611",
              borderRadius: 8,
              border: "1px solid #1e3a5f",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 10,
            }}
          >
            {[
              { label: "المنتج", value: selectedProduct.name },
              { label: "الرابط", value: selectedProduct.slug },
              {
                label: "السعر الحالي",
                value: fmt(toNum(selectedProduct.price)),
              },
              {
                label: "كلفة المنتج",
                value: fmt(toNum(selectedProduct.costPrice)),
              },
              {
                label: "كلفة التغليف",
                value: fmt(toNum(selectedProduct.packagingCost)),
              },
              {
                label: "كلفة الإضافة",
                value: fmt(toNum(selectedProduct.insertCost)),
              },
              {
                label: "المخزون",
                value: String(stock) + " قطعة",
              },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={S.kpiLabel}>{label}</div>
                <div style={{ color: "#e2e8f0", fontSize: 12, fontWeight: 600 }}>
                  {value}
                </div>
              </div>
            ))}
            {isComingSoon && (
              <div
                style={{
                  gridColumn: "1/-1",
                  ...S.warnBox,
                  marginBottom: 0,
                }}
              >
                هذا المنتج قيد الإضافة (سعر = 0) — لا يُنصح بالترويج حالياً
              </div>
            )}
          </div>
        )}
      </div>

      {selectedProduct && (
        <>
          {/* Decision labels */}
          {decisionLabels.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              {decisionLabels.map((dl, i) => {
                const colors: Record<string, [string, string]> = {
                  success: ["#14532d30", "#4ade80"],
                  warn: ["#78350f30", "#fbbf24"],
                  error: ["#450a0a30", "#fca5a5"],
                  info: ["#0c2a4a30", "#93c5fd"],
                };
                const [bg, fg] = colors[dl.type] ?? colors.info;
                return (
                  <span key={i} style={S.badge(bg, fg)}>
                    {dl.text}
                  </span>
                );
              })}
            </div>
          )}

          {/* Warnings */}
          {missingCost && (
            <div style={S.warnBox}>
              كلفة المنتج غير مسجّلة — أدخلها يدوياً في الحاسبة للحصول على
              نتائج دقيقة
            </div>
          )}

          {/* Presets */}
          <div style={S.card}>
            <div style={S.sectionTitle}>سيناريوهات جاهزة</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {(
                [
                  ["no_ad", "بدون إعلان"],
                  ["light_ad", "إعلان خفيف (1,000 د.ع)"],
                  ["medium_ad", "إعلان متوسط (3,000 د.ع)"],
                  ["discount_10", "خصم 10%"],
                  ["qty_10", "طلب 10 قطع"],
                  ["heavy_delivery", "توصيل مكلف (6,000 د.ع)"],
                  ["new_price", "اختبار سعر +10%"],
                ] as [PresetKey, string][]
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => applyPreset(key)}
                  style={S.presetBtn(activePreset === key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Simulation fields */}
          <div style={S.card}>
            <div style={S.sectionTitle}>حقول المحاكاة — مؤقتة فقط</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {(
                [
                  ["salePrice", "سعر البيع (د.ع)"],
                  ["costPrice", "كلفة المنتج (د.ع)"],
                  ["packagingCost", "كلفة التغليف (د.ع)"],
                  ["insertCost", "كلفة الإضافة (د.ع)"],
                  ["deliveryFee", "رسوم التوصيل على الزبون (د.ع)"],
                  ["actualDeliveryCost", "كلفة التوصيل الفعلية (د.ع)"],
                  ["discountAmount", "مبلغ الخصم لكل طلب (د.ع)"],
                  ["adCostPerOrder", "كلفة الإعلان لكل طلب (د.ع)"],
                  ["expectedQty", "الكمية المتوقعة"],
                  ["returnRate", "نسبة الإرجاع / الفشل (%)"],
                  ["extraExpense", "مصاريف إضافية لكل طلب (د.ع)"],
                ] as [keyof SimFields, string][]
              ).map(([key, label]) => (
                <div key={key}>
                  <label style={S.label}>{label}</label>
                  <input
                    type="number"
                    min="0"
                    value={sim[key]}
                    onChange={(e) => setSf(key, e.target.value)}
                    style={S.input}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Results — per order / totals */}
          <div style={S.card}>
            <div style={S.sectionTitle}>نتائج المحاكاة</div>

            {/* Totals grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 10,
                marginBottom: 14,
              }}
            >
              {[
                ["الإيراد الإجمالي", result.grossRevenue, "#199bb8"],
                ["التوصيل المستلم", result.deliveryCollected, "#199bb8"],
                ["كلفة المنتج الكلية", result.productCostTotal, "#64748b"],
                ["كلفة التغليف الكلية", result.packagingTotal, "#64748b"],
                ["كلفة الإضافة الكلية", result.insertTotal, "#64748b"],
                ["كلفة التوصيل الفعلية", result.actualDeliveryTotal, "#64748b"],
                ["إجمالي الخصم", result.discountTotal, "#64748b"],
                ["إجمالي الإعلان", result.adSpendTotal, "#64748b"],
                ["المصاريف الإضافية", result.extraExpensesTotal, "#64748b"],
                ["الربح الإجمالي", result.grossProfit, result.grossProfit >= 0 ? "#4ade80" : "#fca5a5"],
                [
                  "الربح الصافي التقديري",
                  result.estimatedNetProfit,
                  result.estimatedNetProfit >= 0 ? "#4ade80" : "#fca5a5",
                ],
              ].map(([label, value, color]) => (
                <div key={label as string} style={S.kpiCard(color as string)}>
                  <div style={S.kpiLabel}>{label as string}</div>
                  <div style={S.kpiValue(color as string)}>{fmt(value as number)}</div>
                </div>
              ))}
            </div>

            {/* Margins + per-order */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 10,
                marginBottom: 14,
              }}
            >
              {[
                [
                  "هامش الربح الإجمالي",
                  fmtPct(result.grossMargin),
                  result.grossMargin >= 30 ? "#4ade80" : result.grossMargin >= 15 ? "#fbbf24" : "#fca5a5",
                ],
                [
                  "هامش الربح الصافي",
                  fmtPct(result.netMargin),
                  result.netMargin >= 20 ? "#4ade80" : result.netMargin >= 10 ? "#fbbf24" : "#fca5a5",
                ],
                [
                  "الربح لكل طلب مُسلَّم",
                  fmt(result.profitPerOrder),
                  result.profitPerOrder >= 0 ? "#4ade80" : "#fca5a5",
                ],
                ["سعر التعادل", fmt(result.breakEvenPrice), "#94a3b8"],
                ["أعلى كلفة إعلان آمنة", fmt(result.maxSafeAdCost), "#199bb8"],
              ].map(([label, value, color]) => (
                <div key={label as string} style={S.kpiCard(color as string)}>
                  <div style={S.kpiLabel}>{label as string}</div>
                  <div style={S.kpiValue(color as string)}>{value as string}</div>
                </div>
              ))}
            </div>

            {/* Inventory section */}
            <div style={{ ...S.sectionTitle, marginTop: 10 }}>
              المخزون الحالي ({stock} قطعة)
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 10,
              }}
            >
              {[
                ["قيمة المخزون بالكلفة", result.inventoryValueAtCost, "#94a3b8"],
                ["الإيراد المحتمل من المخزون", result.potentialRevenue, "#199bb8"],
                [
                  "الربح الإجمالي المحتمل",
                  result.potentialGrossProfit,
                  result.potentialGrossProfit >= 0 ? "#4ade80" : "#fca5a5",
                ],
              ].map(([label, value, color]) => (
                <div key={label as string} style={S.kpiCard(color as string)}>
                  <div style={S.kpiLabel}>{label as string}</div>
                  <div style={S.kpiValue(color as string)}>{fmt(value as number)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Current vs Simulated comparison */}
          {comparison && (
            <div style={S.card}>
              <div style={S.sectionTitle}>المقارنة — الحالي vs المحاكاة</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                {/* Current */}
                <div>
                  <div style={{ color: "#64748b", fontSize: 11, marginBottom: 10 }}>الحالي</div>
                  <div style={S.kpiCard("#199bb8")}>
                    <div style={S.kpiLabel}>السعر</div>
                    <div style={S.kpiValue("#199bb8")}>{fmt(comparison.currentPrice)}</div>
                  </div>
                  <div style={{ ...S.kpiCard(comparison.currentProfitPerOrder >= 0 ? "#4ade80" : "#fca5a5"), marginTop: 8 }}>
                    <div style={S.kpiLabel}>الربح التقديري / طلب</div>
                    <div style={S.kpiValue(comparison.currentProfitPerOrder >= 0 ? "#4ade80" : "#fca5a5")}>
                      {fmt(comparison.currentProfitPerOrder)}
                    </div>
                  </div>
                  <div style={{ ...S.kpiCard(comparison.currentMargin >= 20 ? "#4ade80" : "#fbbf24"), marginTop: 8 }}>
                    <div style={S.kpiLabel}>الهامش التقديري</div>
                    <div style={S.kpiValue(comparison.currentMargin >= 20 ? "#4ade80" : "#fbbf24")}>
                      {fmtPct(comparison.currentMargin)}
                    </div>
                  </div>
                </div>

                {/* Simulated */}
                <div>
                  <div style={{ color: "#64748b", fontSize: 11, marginBottom: 10 }}>المحاكاة</div>
                  <div style={S.kpiCard("#199bb8")}>
                    <div style={S.kpiLabel}>السعر</div>
                    <div style={S.kpiValue("#199bb8")}>{fmt(salePrice)}</div>
                  </div>
                  <div style={{ ...S.kpiCard(result.profitPerOrder >= 0 ? "#4ade80" : "#fca5a5"), marginTop: 8 }}>
                    <div style={S.kpiLabel}>الربح التقديري / طلب</div>
                    <div style={S.kpiValue(result.profitPerOrder >= 0 ? "#4ade80" : "#fca5a5")}>
                      {fmt(result.profitPerOrder)}
                    </div>
                  </div>
                  <div style={{ ...S.kpiCard(result.netMargin >= 20 ? "#4ade80" : result.netMargin >= 10 ? "#fbbf24" : "#fca5a5"), marginTop: 8 }}>
                    <div style={S.kpiLabel}>الهامش الصافي</div>
                    <div style={S.kpiValue(result.netMargin >= 20 ? "#4ade80" : result.netMargin >= 10 ? "#fbbf24" : "#fca5a5")}>
                      {fmtPct(result.netMargin)}
                    </div>
                  </div>
                </div>

                {/* Difference */}
                <div>
                  <div style={{ color: "#64748b", fontSize: 11, marginBottom: 10 }}>الفرق</div>
                  {(() => {
                    const priceDiff = salePrice - comparison.currentPrice;
                    const profitDiff =
                      result.profitPerOrder - comparison.currentProfitPerOrder;
                    const marginDiff =
                      result.netMargin - comparison.currentMargin;
                    const revDiff =
                      result.grossRevenue -
                      comparison.currentPrice * toNum(sim.expectedQty);
                    return (
                      <>
                        <div style={S.kpiCard(priceDiff >= 0 ? "#4ade80" : "#fca5a5")}>
                          <div style={S.kpiLabel}>فرق السعر</div>
                          <div style={S.kpiValue(priceDiff >= 0 ? "#4ade80" : "#fca5a5")}>
                            {priceDiff >= 0 ? "+" : ""}{fmt(priceDiff)}
                          </div>
                        </div>
                        <div style={{ ...S.kpiCard(profitDiff >= 0 ? "#4ade80" : "#fca5a5"), marginTop: 8 }}>
                          <div style={S.kpiLabel}>فرق الربح / طلب</div>
                          <div style={S.kpiValue(profitDiff >= 0 ? "#4ade80" : "#fca5a5")}>
                            {profitDiff >= 0 ? "+" : ""}{fmt(profitDiff)}
                          </div>
                        </div>
                        <div style={{ ...S.kpiCard(marginDiff >= 0 ? "#4ade80" : "#fca5a5"), marginTop: 8 }}>
                          <div style={S.kpiLabel}>فرق الهامش</div>
                          <div style={S.kpiValue(marginDiff >= 0 ? "#4ade80" : "#fca5a5")}>
                            {marginDiff >= 0 ? "+" : ""}{fmtPct(marginDiff)}
                          </div>
                        </div>
                        <div style={{ ...S.kpiCard(revDiff >= 0 ? "#4ade80" : "#fca5a5"), marginTop: 8 }}>
                          <div style={S.kpiLabel}>فرق الإيراد الكلي</div>
                          <div style={S.kpiValue(revDiff >= 0 ? "#4ade80" : "#fca5a5")}>
                            {revDiff >= 0 ? "+" : ""}{fmt(revDiff)}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Formula explanation */}
          <div style={S.card}>
            <button
              onClick={() => setFormulaOpen((v) => !v)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#199bb8",
                fontSize: 13,
                fontWeight: 700,
                padding: 0,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {formulaOpen ? "▲" : "▼"} شلون حسبناها؟
            </button>
            {formulaOpen && (
              <div
                style={{
                  marginTop: 14,
                  display: "grid",
                  gap: 10,
                  color: "#94a3b8",
                  fontSize: 12,
                  lineHeight: 1.8,
                }}
              >
                {[
                  ["الإيراد", "سعر البيع × الكمية"],
                  [
                    "الربح الإجمالي",
                    "الإيراد − كلفة المنتج − التغليف − كلفة الإضافة",
                  ],
                  [
                    "الربح الصافي التقديري",
                    "الربح الإجمالي + التوصيل المستلم − كلفة التوصيل الفعلية − الخسارة من الإرجاع − الخصم − الإعلان − المصاريف الإضافية",
                  ],
                  ["الهامش الإجمالي", "الربح الإجمالي ÷ الإيراد × 100"],
                  ["الهامش الصافي", "الربح الصافي ÷ الإيراد الفعلي × 100"],
                  [
                    "سعر التعادل",
                    "مجموع كل الكلف لكل طلب ÷ عدد الطلبات المُسلَّمة",
                  ],
                  [
                    "أعلى كلفة إعلان آمنة",
                    "الربح قبل خصم الإعلان (أي الحد الأقصى الذي يمكن إنفاقه على الإعلان دون خسارة)",
                  ],
                  [
                    "تأثير الإرجاع",
                    "خسارة الإيراد = سعر البيع × الكمية × نسبة الإرجاع — الكلف تُحسب على جميع الطلبات",
                  ],
                ].map(([title, formula]) => (
                  <div key={title}>
                    <span style={{ color: "#199bb8", fontWeight: 600 }}>
                      {title}:{" "}
                    </span>
                    {formula}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {!selectedProduct && (
        <div
          style={{
            textAlign: "center",
            color: "#475569",
            fontSize: 13,
            padding: "40px 0",
          }}
        >
          اختر منتجاً من القائمة أعلاه لبدء المحاكاة
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify the file compiles** — run type-check only (no build yet)

Run: `cd C:\Users\jaafa\Desktop\upload\FishWebClean && pnpm check`

---

### Task 2: Add the tab to finance.tsx

**Files:**
- Modify: `client/src/pages/admin/finance.tsx`

- [ ] Add import for the new component at the top of the file
- [ ] Add `<TabsTrigger value="simulator">حاسبة السيناريوهات</TabsTrigger>`
- [ ] Add `<TabsContent value="simulator"><FinanceScenarioCalculator /></TabsContent>`

- [ ] **Run full build:** `pnpm build`

---

### Task 3: Commit

- [ ] `git add client/src/components/admin/finance-scenario-calculator.tsx client/src/pages/admin/finance.tsx`
- [ ] `git commit -m "finance: add simulation-only scenario calculator"`
