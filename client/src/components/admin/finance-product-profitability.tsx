import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AccountingProductProfitFull } from "../../../../shared/accounting.js";

type Period = "day" | "week" | "month" | "year";

interface Props {
  period: Period;
}

type SortKey = "name" | "unitsSold" | "revenue" | "grossProfit" | "grossMargin" | "netProfit" | "margin" | "stock" | "inventoryValueAtCost" | "potentialGrossProfitFromStock";
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

export function FinanceProductProfitability({ period }: Props) {
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "grossProfit", dir: "desc" });
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");

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

  const toggleSort = useCallback((key: SortKey) => {
    setSort((prev) => prev.key === key ? { key, dir: prev.dir === "desc" ? "asc" : "desc" } : { key, dir: "desc" });
  }, []);

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
          { label: "الربح المحتمل من المخزون", value: fmt(kpis.totalPotentialGross), color: "#f59e0b" },
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
              <th style={th} onClick={() => toggleSort("netProfit")}>صافي الربح{sortIcon("netProfit")}</th>
              <th style={th} onClick={() => toggleSort("margin")}>هامش صافي{sortIcon("margin")}</th>
              <th style={th} onClick={() => toggleSort("stock")}>المخزون{sortIcon("stock")}</th>
              <th style={th} onClick={() => toggleSort("inventoryValueAtCost")}>قيمة المخزون{sortIcon("inventoryValueAtCost")}</th>
              <th style={th} onClick={() => toggleSort("potentialGrossProfitFromStock")}>ربح مخزون محتمل{sortIcon("potentialGrossProfitFromStock")}</th>
              <th style={th}>الحالة</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={12} style={{ ...td, textAlign: "center", color: "#64748b", padding: 32 }}>
                  لا توجد نتائج
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.productId} style={{ background: p.comingSoon ? "rgba(99,102,241,0.05)" : undefined }}>
                  <td style={{ ...td, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }} title={p.name}>
                    {p.name}
                    {!p.costsComplete && (
                      <span style={{ marginRight: 4, fontSize: 10, color: "#ef4444" }}>⚠</span>
                    )}
                  </td>
                  <td style={{ ...td, color: "#94a3b8" }}>{p.category}</td>
                  <td style={td}>{p.unitsSold.toLocaleString("ar-IQ")}</td>
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
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 10, color: "#64748b", fontSize: 11, textAlign: "left" }}>
        {filtered.length} منتج من {rows.length}
      </div>
    </div>
  );
}
