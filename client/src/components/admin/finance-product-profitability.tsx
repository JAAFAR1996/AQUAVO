import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AccountingProductProfitFull } from "../../../../shared/accounting.js";

type Period = "day" | "week" | "month" | "year";

interface Props {
  period: Period;
}

type SortKey = "name" | "unitsSold" | "revenue" | "grossProfit" | "grossMargin" | "netProfit" | "margin" | "stock" | "inventoryValueAtCost" | "potentialGrossProfitFromStock" | "returnedQty" | "returnFinancialImpact" | "adjustedNetProfit" | "returnRate";
type SortDir = "asc" | "desc";

type FilterKey = "all" | "profitable" | "weak" | "missing_cost" | "low_stock" | "coming_soon" | "no_sales";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "profitable", label: "مربح" },
  { key: "weak", label: "هامش ضعيف" },
  { key: "missing_cost", label: "كلفة ناقصة" },
  { key: "low_stock", label: "مخزون منخفض" },
  { key: "coming_soon", label: "قريباً جداً" },
  { key: "no_sales", label: "لا مبيعات" },
];

const LABEL_COLORS: Record<string, string> = {
  "جيد": "#22c55e",
  "هامش ضعيف": "#f59e0b",
  "كلفة ناقصة": "#ef4444",
  "لا يصلح للإعلان وحده": "#ef4444",
  "نفد المخزون": "#94a3b8",
  "مخزون منخفض": "#f59e0b",
  "قريباً جداً": "#6366f1",
  "لا مبيعات": "#64748b",
};

function fmt(n: number) {
  return n.toLocaleString("ar-IQ") + " د.ع";
}

function pct(n: number) {
  return n.toFixed(1) + "%";
}

function matchesFilter(p: AccountingProductProfitFull, filter: FilterKey): boolean {
  if (filter === "all") return true;
  if (filter === "coming_soon") return p.comingSoon;
  if (filter === "missing_cost") return !p.comingSoon && p.costPrice <= 0;
  if (filter === "low_stock") return !p.comingSoon && p.stock <= 10 && p.stock > 0;
  if (filter === "no_sales") return !p.comingSoon && p.unitsSold === 0;
  if (filter === "weak") return !p.comingSoon && p.costPrice > 0 && p.revenue > 0 && p.grossMargin < 20;
  if (filter === "profitable") return p.revenue > 0 && p.grossMargin >= 20;
  return true;
}

interface VariantBreakdownRow {
  variantId: string | null;
  variantLabel: string | null;
  grossQty: number;
  revenue: number;
}

interface DrillResult {
  productId: string;
  period: string;
  grossSoldQty: number;
  verifiedReturnedQty: number;
  netSoldQty: number;
  totalLinesInPeriod: number;
  variantBreakdown: VariantBreakdownRow[];
  orders: Array<{
    orderId: string;
    orderNumber: string | null;
    orderStatus: string | null;
    orderSource: string | null;
    orderCreatedAt: string;
    qty: number;
    priceAtPurchase: number;
    variantId: string | null;
    variantLabel: string | null;
    counted: boolean;
    exclusionReason: string | null;
  }>;
}

export function FinanceProductProfitability({ period }: Props) {
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "grossProfit", dir: "desc" });
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [drillProductId, setDrillProductId] = useState<string | null>(null);
  const [drillData, setDrillData] = useState<DrillResult | null>(null);
  const [drillLoading, setDrillLoading] = useState(false);

  async function openDrill(productId: string) {
    if (drillProductId === productId) { setDrillProductId(null); setDrillData(null); return; }
    setDrillProductId(productId);
    setDrillLoading(true);
    try {
      const res = await fetch(`/api/admin/accounting/product-sales-drill/${productId}?period=${period}`, { credentials: "include" });
      const json = await res.json();
      setDrillData(json.data ?? null);
    } catch { setDrillData(null); }
    setDrillLoading(false);
  }

  const { data, isLoading, error } = useQuery<{ success: boolean; data: AccountingProductProfitFull[] }>({
    queryKey: ["/api/admin/accounting/products", period],
    queryFn: async () => {
      const res = await fetch(`/api/admin/accounting/products?period=${period}`, { credentials: "include" });
      if (!res.ok) throw new Error("فشل تحميل البيانات");
      return res.json();
    },
  });

  const rows = data?.data ?? [];

  const kpis = useMemo(() => {
    const active = rows.filter((p) => !p.comingSoon);
    const withSales = active.filter((p) => p.unitsSold > 0);
    const totalRevenue = withSales.reduce((s, p) => s + p.revenue, 0);
    const totalGrossProfit = withSales.reduce((s, p) => s + p.grossProfit, 0);
    const totalInventoryAtCost = active.reduce((s, p) => s + p.inventoryValueAtCost, 0);
    const totalPotentialGross = active.reduce((s, p) => s + p.potentialGrossProfitFromStock, 0);
    const avgGrossMargin = totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0;
    const missingCost = active.filter((p) => p.costPrice <= 0).length;
    const lowStock = active.filter((p) => p.stock > 0 && p.stock <= 10).length;
    const outOfStock = active.filter((p) => p.stock === 0).length;
    return { totalRevenue, totalGrossProfit, avgGrossMargin, totalInventoryAtCost, totalPotentialGross, missingCost, lowStock, outOfStock, totalProducts: rows.length };
  }, [rows]);

  const filtered = useMemo(() => {
    let result = rows.filter((p) => matchesFilter(p, filter));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
    }
    result = [...result].sort((a, b) => {
      const av = a[sort.key] as number | string;
      const bv = b[sort.key] as number | string;
      if (typeof av === "string" && typeof bv === "string") {
        return sort.dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sort.dir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return result;
  }, [rows, filter, search, sort]);

  function toggleSort(key: SortKey) {
    setSort((prev) => prev.key === key ? { key, dir: prev.dir === "desc" ? "asc" : "desc" } : { key, dir: "desc" });
  }

  function sortIcon(key: SortKey) {
    if (sort.key !== key) return " ↕";
    return sort.dir === "desc" ? " ↓" : " ↑";
  }

  const th: React.CSSProperties = {
    padding: "8px 10px", textAlign: "right", fontSize: 11, fontWeight: 600,
    color: "#94a3b8", borderBottom: "1px solid #1e3a5f", cursor: "pointer",
    whiteSpace: "nowrap", userSelect: "none",
  };
  const td: React.CSSProperties = {
    padding: "9px 10px", fontSize: 12, color: "#e2e8f0",
    borderBottom: "1px solid #0d1f3c", whiteSpace: "nowrap",
  };

  if (isLoading) {
    return (
      <div style={{ color: "#94a3b8", fontSize: 13, padding: 40, textAlign: "center" }}>
        جارٍ التحميل...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ color: "#ef4444", fontSize: 13, padding: 40, textAlign: "center" }}>
        خطأ في تحميل البيانات
      </div>
    );
  }

  return (
    <div dir="rtl">
      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: "إجمالي الإيراد", value: fmt(kpis.totalRevenue), color: "#199bb8" },
          { label: "إجمالي الربح الخام", value: fmt(kpis.totalGrossProfit), color: "#22c55e" },
          { label: "متوسط الهامش الخام", value: pct(kpis.avgGrossMargin), color: "#22c55e" },
          { label: "قيمة المخزون بالكلفة", value: fmt(kpis.totalInventoryAtCost), color: "#6366f1" },
          { label: "الربح الإجمالي المحتمل من المخزون (تقديري)", value: fmt(kpis.totalPotentialGross), color: "#f59e0b" },
          { label: "منتجات بدون كلفة", value: kpis.missingCost.toString(), color: "#ef4444" },
          { label: "مخزون منخفض", value: kpis.lowStock.toString(), color: "#f59e0b" },
          { label: "نفد المخزون", value: kpis.outOfStock.toString(), color: "#94a3b8" },
        ].map((k) => (
          <div key={k.label} style={{ background: "#0d1f3c", border: "1px solid #1e3a5f", borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ color: "#64748b", fontSize: 10, marginBottom: 4 }}>{k.label}</div>
            <div style={{ color: k.color, fontSize: 18, fontWeight: 700 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Inventory estimate note */}
      <div style={{ background: "#0f1f0f", border: "1px solid #22c55e30", color: "#86efac", padding: "8px 14px", borderRadius: 8, fontSize: 11, marginBottom: 14, lineHeight: 1.7 }}>
        <strong>ملاحظة — الربح الإجمالي المحتمل من المخزون:</strong> هذا رقم تقديري إذا تم بيع المخزون الحالي بالسعر المسجل بالكامل. لا يشمل المصاريف التشغيلية أو الراجعات المستقبلية. الفورمولا: مخزون × (سعر بيع − كلفة − تغليف − insert).
      </div>

      {/* Filters + Search */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: "4px 12px", borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: "pointer",
                background: filter === f.key ? "#199bb8" : "#0d1f3c",
                border: filter === f.key ? "1.5px solid #199bb8" : "1.5px solid #1e3a5f",
                color: filter === f.key ? "#fff" : "#94a3b8",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث باسم المنتج أو الفئة..."
          style={{
            marginRight: "auto", padding: "5px 12px", borderRadius: 8, fontSize: 12,
            background: "#0d1f3c", border: "1px solid #1e3a5f", color: "#e2e8f0",
            outline: "none", minWidth: 200,
          }}
        />
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto", background: "#0d1f3c", borderRadius: 12, border: "1px solid #1e3a5f" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
          <thead>
            <tr>
              <th style={th} onClick={() => toggleSort("name")}>المنتج{sortIcon("name")}</th>
              <th style={th}>الفئة</th>
              <th style={th} onClick={() => toggleSort("unitsSold")}>المبيعات{sortIcon("unitsSold")}</th>
              <th style={th} onClick={() => toggleSort("revenue")}>الإيراد{sortIcon("revenue")}</th>
              <th style={th} onClick={() => toggleSort("grossProfit")}>ربح خام{sortIcon("grossProfit")}</th>
              <th style={th} onClick={() => toggleSort("grossMargin")}>هامش خام{sortIcon("grossMargin")}</th>
              <th style={th} onClick={() => toggleSort("netProfit")}>ربح إجمالي{sortIcon("netProfit")}</th>
              <th style={th} onClick={() => toggleSort("margin")}>هامش إجمالي{sortIcon("margin")}</th>
              <th style={th} onClick={() => toggleSort("stock")}>المخزون{sortIcon("stock")}</th>
              <th style={th} onClick={() => toggleSort("inventoryValueAtCost")}>قيمة المخزون{sortIcon("inventoryValueAtCost")}</th>
              <th style={th} onClick={() => toggleSort("potentialGrossProfitFromStock")} title="تقديري: المخزون × (سعر البيع − كلفة الوحدة − تغليف − insert). لا يشمل المصاريف أو الراجعات المستقبلية.">ربح مخزون (تقديري){sortIcon("potentialGrossProfitFromStock")}</th>
              <th style={{ ...th, borderRight: "1px solid #1e3a5f" }} onClick={() => toggleSort("returnedQty")}>الكمية الراجعة{sortIcon("returnedQty")}</th>
              <th style={th} onClick={() => toggleSort("returnFinancialImpact")}>خسارة الراجع{sortIcon("returnFinancialImpact")}</th>
              <th style={th} onClick={() => toggleSort("adjustedNetProfit")}>الربح بعد الراجع{sortIcon("adjustedNetProfit")}</th>
              <th style={th} onClick={() => toggleSort("returnRate")}>معدل الراجع{sortIcon("returnRate")}</th>
              <th style={th}>الحالة</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={16} style={{ ...td, textAlign: "center", color: "#64748b", padding: 32 }}>
                  لا توجد نتائج
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <React.Fragment key={p.productId}>
                <tr style={{ background: p.comingSoon ? "rgba(99,102,241,0.05)" : p.returnedQty > 0 ? "rgba(239,68,68,0.03)" : undefined }}>
                  <td style={{ ...td, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }} title={p.name}>
                    {p.name}
                    {!p.costsComplete && (
                      <span style={{ marginRight: 4, fontSize: 10, color: "#ef4444" }}>⚠</span>
                    )}
                  </td>
                  <td style={{ ...td, color: "#94a3b8" }}>{p.category}</td>
                  <td style={td}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {p.unitsSold.toLocaleString("ar-IQ")}
                      {p.unitsSold > 0 && (
                        <button
                          onClick={() => openDrill(p.productId)}
                          title="تدقيق — اعرف أي طلبات ساهمت في هذا الرقم"
                          style={{
                            background: drillProductId === p.productId ? "#199bb840" : "#0d1f3c",
                            border: "1px solid #1e3a5f",
                            color: "#64748b",
                            borderRadius: 4,
                            padding: "1px 6px",
                            fontSize: 10,
                            cursor: "pointer",
                          }}
                        >
                          تدقيق
                        </button>
                      )}
                    </span>
                  </td>
                  <td style={{ ...td, color: "#199bb8" }}>{p.revenue > 0 ? fmt(Math.round(p.revenue)) : "—"}</td>
                  <td style={{ ...td, color: p.grossProfit > 0 ? "#22c55e" : p.grossProfit < 0 ? "#ef4444" : "#64748b" }}>
                    {p.revenue > 0 ? fmt(Math.round(p.grossProfit)) : "—"}
                  </td>
                  <td style={{ ...td, color: p.grossMargin >= 20 ? "#22c55e" : p.grossMargin > 0 ? "#f59e0b" : "#64748b" }}>
                    {p.revenue > 0 ? pct(p.grossMargin) : "—"}
                  </td>
                  <td style={{ ...td, color: p.netProfit > 0 ? "#22c55e" : p.netProfit < 0 ? "#ef4444" : "#64748b" }}>
                    {p.revenue > 0 ? fmt(Math.round(p.netProfit)) : "—"}
                  </td>
                  <td style={{ ...td, color: p.margin >= 20 ? "#22c55e" : p.margin > 0 ? "#f59e0b" : "#64748b" }}>
                    {p.revenue > 0 ? pct(p.margin) : "—"}
                  </td>
                  <td style={{ ...td, color: p.stock === 0 ? "#94a3b8" : p.stock <= 10 ? "#f59e0b" : "#e2e8f0" }}>
                    {p.stock.toLocaleString("ar-IQ")}
                  </td>
                  <td style={td}>{p.inventoryValueAtCost > 0 ? fmt(Math.round(p.inventoryValueAtCost)) : "—"}</td>
                  <td style={{ ...td, color: p.potentialGrossProfitFromStock > 0 ? "#6366f1" : "#64748b" }}>
                    {p.potentialGrossProfitFromStock > 0 ? fmt(Math.round(p.potentialGrossProfitFromStock)) : "—"}
                  </td>
                  <td style={{ ...td, borderRight: "1px solid #1e3a5f", color: p.returnedQty > 0 ? "#ef4444" : "#64748b" }}>
                    {p.returnedQty > 0 ? p.returnedQty.toLocaleString("ar-IQ") : "—"}
                  </td>
                  <td style={{ ...td, color: p.returnFinancialImpact > 0 ? "#ef4444" : "#64748b" }}>
                    {p.returnFinancialImpact > 0 ? fmt(Math.round(p.returnFinancialImpact)) : "—"}
                  </td>
                  <td style={{ ...td, color: p.returnedQty > 0 ? (p.adjustedNetProfit >= 0 ? "#f59e0b" : "#ef4444") : "#64748b" }}>
                    {p.returnedQty > 0 ? fmt(Math.round(p.adjustedNetProfit)) : "—"}
                  </td>
                  <td style={{ ...td, color: p.returnRate > 0 ? "#f59e0b" : "#64748b" }}>
                    {p.returnRate > 0 ? `${p.returnRate}%` : "—"}
                  </td>
                  <td style={td}>
                    <span style={{
                      padding: "2px 8px", borderRadius: 5, fontSize: 10, fontWeight: 600,
                      background: "rgba(0,0,0,0.3)",
                      color: LABEL_COLORS[p.recommendationLabel] ?? "#94a3b8",
                      border: `1px solid ${LABEL_COLORS[p.recommendationLabel] ?? "#1e3a5f"}40`,
                    }}>
                      {p.recommendationLabel}
                    </span>
                  </td>
                </tr>
                {drillProductId === p.productId && (
                  <tr key={p.productId + "-drill"}>
                    <td colSpan={14} style={{ padding: "0 0 12px 0", background: "#010f22" }}>
                      <div style={{
                        margin: "0 12px",
                        background: "#0a1628",
                        border: "1px solid #199bb840",
                        borderRadius: 8,
                        padding: "12px 16px",
                      }}>
                        <div style={{ color: "#199bb8", fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
                          تدقيق مبيعات {p.name} — {p.unitsSold} وحدة
                          {drillLoading && <span style={{ color: "#64748b", fontWeight: 400, marginRight: 8 }}>(جاري التحميل...)</span>}
                        </div>
                        {/* Variant breakdown — shown when more than one variant exists */}
                        {!drillLoading && drillData && drillData.variantBreakdown.length > 1 && (
                          <div style={{ marginBottom: 12 }}>
                            <div style={{ background: "#0d1f3c", border: "1px solid #6366f140", borderRadius: 6, padding: "8px 12px", marginBottom: 6, fontSize: 11, color: "#a5b4fc" }}>
                              العدد الكلي يجمع كل الأنواع/الأحجام التابعة لنفس المنتج.
                            </div>
                            <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse", marginBottom: 4 }}>
                              <thead>
                                <tr style={{ color: "#64748b", borderBottom: "1px solid #1e3a5f" }}>
                                  <th style={{ textAlign: "right", padding: "3px 8px" }}>النوع / المقاس</th>
                                  <th style={{ textAlign: "right", padding: "3px 8px" }}>الكمية المبيعة</th>
                                  <th style={{ textAlign: "right", padding: "3px 8px" }}>الإيراد</th>
                                </tr>
                              </thead>
                              <tbody>
                                {drillData.variantBreakdown.map((v, i) => (
                                  <tr key={i} style={{ borderBottom: "1px solid #1e3a5f20" }}>
                                    <td style={{ padding: "3px 8px", color: "#c4b5fd" }}>{v.variantLabel ?? v.variantId ?? "—"}</td>
                                    <td style={{ padding: "3px 8px", color: "#e2e8f0", fontWeight: 700 }}>{v.grossQty}</td>
                                    <td style={{ padding: "3px 8px", color: "#94a3b8" }}>{v.revenue.toLocaleString("ar-IQ")} د.ع</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                        {/* Single variant or no variant — show note inline */}
                        {!drillLoading && drillData && drillData.variantBreakdown.length === 1 && drillData.variantBreakdown[0].variantLabel && (
                          <div style={{ fontSize: 11, color: "#a5b4fc", marginBottom: 8 }}>
                            النوع: {drillData.variantBreakdown[0].variantLabel}
                          </div>
                        )}
                        {!drillLoading && drillData && drillData.orders.length === 0 && (
                          <div style={{ color: "#64748b", fontSize: 11 }}>لا طلبات محددة في هذه الفترة</div>
                        )}
                        {!drillLoading && drillData && drillData.orders.length > 0 && (
                          <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
                            <thead>
                              <tr style={{ color: "#64748b", borderBottom: "1px solid #1e3a5f" }}>
                                <th style={{ textAlign: "right", padding: "4px 8px" }}>رقم الطلب</th>
                                <th style={{ textAlign: "right", padding: "4px 8px" }}>الحالة</th>
                                <th style={{ textAlign: "right", padding: "4px 8px" }}>النوع/المقاس</th>
                                <th style={{ textAlign: "right", padding: "4px 8px" }}>الكمية</th>
                                <th style={{ textAlign: "right", padding: "4px 8px" }}>سعر البيع</th>
                                <th style={{ textAlign: "right", padding: "4px 8px" }}>المصدر</th>
                                <th style={{ textAlign: "right", padding: "4px 8px" }}>محتسب؟</th>
                                <th style={{ textAlign: "right", padding: "4px 8px" }}>التاريخ</th>
                              </tr>
                            </thead>
                            <tbody>
                              {drillData.orders.map((o, i) => (
                                <tr key={i} style={{ borderBottom: "1px solid #1e3a5f20", opacity: o.counted ? 1 : 0.5 }}>
                                  <td style={{ padding: "4px 8px", color: "#199bb8" }}>{o.orderNumber ?? o.orderId.slice(0, 8) + "…"}</td>
                                  <td style={{ padding: "4px 8px", color: "#94a3b8" }}>{o.orderStatus}</td>
                                  <td style={{ padding: "4px 8px", color: "#c4b5fd" }}>{o.variantLabel ?? o.variantId ?? "—"}</td>
                                  <td style={{ padding: "4px 8px", color: "#e2e8f0", fontWeight: 700 }}>{o.qty}</td>
                                  <td style={{ padding: "4px 8px", color: "#94a3b8" }}>{o.priceAtPurchase.toLocaleString("ar-IQ")} د.ع</td>
                                  <td style={{ padding: "4px 8px", color: "#64748b" }}>{o.orderSource ?? "—"}</td>
                                  <td style={{ padding: "4px 8px" }}>
                                    {o.counted
                                      ? <span style={{ color: "#22c55e" }}>✓ محتسب</span>
                                      : <span style={{ color: "#f59e0b", fontSize: 10 }} title={o.exclusionReason ?? ""}>✗ مستبعد</span>
                                    }
                                  </td>
                                  <td style={{ padding: "4px 8px", color: "#64748b" }}>{new Date(o.orderCreatedAt).toLocaleDateString("ar-IQ")}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 10, color: "#64748b", fontSize: 11, textAlign: "left" }}>
        {filtered.length} نتيجة من {rows.length} منتج
      </div>
    </div>
  );
}
