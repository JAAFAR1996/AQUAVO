import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { AccountingCostAuditEntry, CostAuditRiskStatus } from "../../../../shared/accounting.js";

interface BaselineForm {
  effectiveFrom: string;
  costPrice: string;
  packagingCost: string;
  insertCost: string;
  note: string;
}

const DEFAULT_NOTE = "Baseline historical cost entered by admin";

const RISK_LABELS: Record<CostAuditRiskStatus, string> = {
  "OK": "مكتمل",
  "Needs baseline": "يحتاج baseline",
  "Missing cost": "كلفة ناقصة",
  "No sales yet": "لا مبيعات",
};

const RISK_COLORS: Record<CostAuditRiskStatus, string> = {
  "OK": "#22c55e",
  "Needs baseline": "#f59e0b",
  "Missing cost": "#ef4444",
  "No sales yet": "#64748b",
};

const FILTER_OPTIONS: { key: CostAuditRiskStatus | "all"; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "Needs baseline", label: "يحتاج baseline" },
  { key: "Missing cost", label: "كلفة ناقصة" },
  { key: "OK", label: "مكتمل" },
  { key: "No sales yet", label: "لا مبيعات" },
];

function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ar-IQ", { year: "numeric", month: "short", day: "numeric" });
}

function fmtIqd(n: number) {
  return n.toLocaleString("ar-IQ") + " د.ع";
}

export function FinanceCostAudit() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<CostAuditRiskStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [openBaseline, setOpenBaseline] = useState<string | null>(null); // productId
  const [form, setForm] = useState<BaselineForm>({
    effectiveFrom: new Date().toISOString().slice(0, 10),
    costPrice: "",
    packagingCost: "",
    insertCost: "",
    note: DEFAULT_NOTE,
  });
  const [confirmPending, setConfirmPending] = useState(false);

  const { data, isLoading, error } = useQuery<{ success: boolean; data: (AccountingCostAuditEntry & { salePrice: number })[] }>({
    queryKey: ["/api/admin/accounting/cost-history-audit"],
    queryFn: async () => {
      const res = await fetch("/api/admin/accounting/cost-history-audit", { credentials: "include" });
      if (!res.ok) throw new Error("فشل تحميل التدقيق");
      return res.json();
    },
  });

  const addBaselineMutation = useMutation({
    mutationFn: async ({ productId, body }: { productId: string; body: object }) => {
      const res = await fetch(`/api/admin/accounting/cost-history/${productId}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message ?? "فشل حفظ الـ baseline");
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/accounting/cost-history-audit"] });
      setOpenBaseline(null);
      setConfirmPending(false);
      setForm({ effectiveFrom: new Date().toISOString().slice(0, 10), costPrice: "", packagingCost: "", insertCost: "", note: DEFAULT_NOTE });
    },
  });

  const rows = data?.data ?? [];

  const summary = useMemo(() => {
    const counts: Record<CostAuditRiskStatus, number> = { "OK": 0, "Needs baseline": 0, "Missing cost": 0, "No sales yet": 0 };
    for (const r of rows) counts[r.riskStatus]++;
    return counts;
  }, [rows]);

  const filtered = useMemo(() => {
    let result = filter === "all" ? rows : rows.filter((r) => r.riskStatus === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((r) => r.name.toLowerCase().includes(q) || r.slug.toLowerCase().includes(q));
    }
    return result;
  }, [rows, filter, search]);

  const selectedProduct = openBaseline ? rows.find((r) => r.productId === openBaseline) : null;

  function openBaselineFor(productId: string) {
    const product = rows.find((r) => r.productId === productId);
    if (!product) return;
    setForm({
      effectiveFrom: product.firstDeliveredOrderDate
        ? new Date(product.firstDeliveredOrderDate).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      costPrice: product.costPrice > 0 ? String(product.costPrice) : "",
      packagingCost: product.packagingCost > 0 ? String(product.packagingCost) : "",
      insertCost: product.insertCost > 0 ? String(product.insertCost) : "",
      note: DEFAULT_NOTE,
    });
    setConfirmPending(false);
    setOpenBaseline(productId);
  }

  function handleSubmit() {
    if (!openBaseline) return;
    const costPrice = parseFloat(form.costPrice);
    const packagingCost = parseFloat(form.packagingCost || "0");
    const insertCost = parseFloat(form.insertCost || "0");
    if (!form.effectiveFrom || isNaN(costPrice) || costPrice <= 0) return;
    addBaselineMutation.mutate({
      productId: openBaseline,
      body: { effectiveFrom: form.effectiveFrom, costPrice, packagingCost, insertCost, note: form.note.trim() || DEFAULT_NOTE },
    });
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "6px 10px", borderRadius: 8, fontSize: 12,
    background: "#0B1E28", border: "1px solid #1e3a5f", color: "#e2e8f0",
    outline: "none", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = { color: "#94a3b8", fontSize: 11, marginBottom: 4, display: "block" };
  const td: React.CSSProperties = { padding: "9px 10px", fontSize: 12, color: "#e2e8f0", borderBottom: "1px solid #0d1f3c", whiteSpace: "nowrap" };
  const th: React.CSSProperties = { padding: "8px 10px", textAlign: "right", fontSize: 11, fontWeight: 600, color: "#94a3b8", borderBottom: "1px solid #1e3a5f", whiteSpace: "nowrap" };

  if (isLoading) return <div style={{ color: "#94a3b8", fontSize: 13, padding: 40, textAlign: "center" }}>جارٍ التحميل...</div>;
  if (error) return <div style={{ color: "#ef4444", fontSize: 13, padding: 40, textAlign: "center" }}>خطأ في تحميل البيانات</div>;

  return (
    <div dir="rtl">
      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12, marginBottom: 20 }}>
        {(["Needs baseline", "Missing cost", "OK", "No sales yet"] as CostAuditRiskStatus[]).map((status) => (
          <div key={status} style={{ background: "#0d1f3c", border: `1px solid ${RISK_COLORS[status]}40`, borderRadius: 10, padding: "12px 14px", cursor: "pointer" }} onClick={() => setFilter(status)}>
            <div style={{ color: "#64748b", fontSize: 10, marginBottom: 4 }}>{RISK_LABELS[status]}</div>
            <div style={{ color: RISK_COLORS[status], fontSize: 24, fontWeight: 700 }}>{summary[status]}</div>
          </div>
        ))}
        <div style={{ background: "#0d1f3c", border: "1px solid #1e3a5f", borderRadius: 10, padding: "12px 14px" }}>
          <div style={{ color: "#64748b", fontSize: 10, marginBottom: 4 }}>إجمالي المنتجات</div>
          <div style={{ color: "#e2e8f0", fontSize: 24, fontWeight: 700 }}>{rows.length}</div>
        </div>
      </div>

      {/* Filters + search */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {FILTER_OPTIONS.map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              style={{
                padding: "4px 12px", borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: "pointer",
                background: filter === f.key ? "#0B93A6" : "#0d1f3c",
                border: filter === f.key ? "1.5px solid #0B93A6" : "1.5px solid #1e3a5f",
                color: filter === f.key ? "#fff" : "#94a3b8",
              }}
            >{f.label}</button>
          ))}
        </div>
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث باسم المنتج أو slug..."
          style={{ ...inputStyle, marginRight: "auto", minWidth: 200, border: "1px solid #1e3a5f" }}
        />
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto", background: "#0d1f3c", borderRadius: 12, border: "1px solid #1e3a5f" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
          <thead>
            <tr>
              <th style={th}>المنتج</th>
              <th style={th}>الفئة</th>
              <th style={th}>الكلفة الحالية</th>
              <th style={th}>أول طلبية موصّلة</th>
              <th style={th}>عدد التوصيلات</th>
              <th style={th}>أقدم تاريخ كلفة</th>
              <th style={th}>الحالة</th>
              <th style={th}>إجراء</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ ...td, textAlign: "center", color: "#64748b", padding: 32 }}>لا توجد نتائج</td></tr>
            ) : filtered.map((r) => (
              <tr key={r.productId}>
                <td style={{ ...td, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis" }} title={r.name}>
                  <div style={{ fontWeight: 600 }}>{r.name}</div>
                  <div style={{ color: "#64748b", fontSize: 10 }}>{r.slug}</div>
                </td>
                <td style={{ ...td, color: "#94a3b8" }}>{r.category}</td>
                <td style={td}>
                  {r.costPrice > 0
                    ? <div>{fmtIqd(r.costPrice)}<div style={{ color: "#64748b", fontSize: 10 }}>+ {fmtIqd(r.packagingCost + r.insertCost)}</div></div>
                    : <span style={{ color: "#ef4444" }}>غير مدخلة</span>}
                </td>
                <td style={{ ...td, color: r.firstDeliveredOrderDate ? "#e2e8f0" : "#64748b" }}>{fmt(r.firstDeliveredOrderDate)}</td>
                <td style={{ ...td, color: r.deliveredOrderCount > 0 ? "#0B93A6" : "#64748b" }}>{r.deliveredOrderCount.toLocaleString("ar-IQ")}</td>
                <td style={{ ...td, color: r.hasCostHistory ? "#22c55e" : "#64748b" }}>{fmt(r.earliestEffectiveFrom)}</td>
                <td style={td}>
                  <span style={{
                    padding: "2px 8px", borderRadius: 5, fontSize: 10, fontWeight: 600,
                    background: "rgba(0,0,0,0.3)",
                    color: RISK_COLORS[r.riskStatus],
                    border: `1px solid ${RISK_COLORS[r.riskStatus]}40`,
                  }}>{RISK_LABELS[r.riskStatus]}</span>
                </td>
                <td style={td}>
                  {(r.riskStatus === "Needs baseline" || r.riskStatus === "Missing cost") && (
                    <button onClick={() => openBaselineFor(r.productId)}
                      style={{
                        padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer",
                        background: "#0d1f3c", border: "1.5px solid #0B93A6", color: "#0B93A6",
                      }}>
                      إضافة baseline
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 10, color: "#64748b", fontSize: 11, textAlign: "left" }}>
        {filtered.length} نتيجة من {rows.length} منتج
      </div>

      {/* Baseline modal */}
      {openBaseline && selectedProduct && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.7)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        }}>
          <div style={{ background: "#0d1f3c", border: "1px solid #1e3a5f", borderRadius: 14, padding: 24, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ color: "#fff", fontSize: 15, fontWeight: 700, marginBottom: 4 }}>إضافة baseline للكلفة</div>
            <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 16 }}>{selectedProduct.name}</div>

            {!confirmPending ? (
              <>
                <div style={{ display: "grid", gap: 12 }}>
                  <div>
                    <label style={labelStyle}>تاريخ البدء (effectiveFrom) *</label>
                    <input type="date" value={form.effectiveFrom}
                      onChange={(e) => setForm((p) => ({ ...p, effectiveFrom: e.target.value }))}
                      style={inputStyle} />
                    {selectedProduct.firstDeliveredOrderDate && (
                      <div style={{ color: "#f59e0b", fontSize: 10, marginTop: 4 }}>
                        أول طلبية موصّلة: {fmt(selectedProduct.firstDeliveredOrderDate)} — اختر تاريخاً قبلها أو مساوياً
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={labelStyle}>كلفة المنتج (د.ع) *</label>
                    <input type="number" min="0" step="250" value={form.costPrice}
                      onChange={(e) => setForm((p) => ({ ...p, costPrice: e.target.value }))}
                      placeholder="مثال: 5000" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>كلفة التغليف (د.ع)</label>
                    <input type="number" min="0" step="250" value={form.packagingCost}
                      onChange={(e) => setForm((p) => ({ ...p, packagingCost: e.target.value }))}
                      placeholder="0" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>كلفة الإدراج (د.ع)</label>
                    <input type="number" min="0" step="250" value={form.insertCost}
                      onChange={(e) => setForm((p) => ({ ...p, insertCost: e.target.value }))}
                      placeholder="0" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>ملاحظة</label>
                    <input type="text" value={form.note}
                      onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
                      style={inputStyle} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "flex-end" }}>
                  <button onClick={() => setOpenBaseline(null)}
                    style={{ padding: "7px 16px", borderRadius: 8, fontSize: 12, cursor: "pointer", background: "transparent", border: "1px solid #1e3a5f", color: "#94a3b8" }}>
                    إلغاء
                  </button>
                  <button
                    disabled={!form.effectiveFrom || !form.costPrice || parseFloat(form.costPrice) <= 0}
                    onClick={() => setConfirmPending(true)}
                    style={{
                      padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                      background: "#0B93A6", border: "none", color: "#fff",
                      opacity: (!form.effectiveFrom || !form.costPrice || parseFloat(form.costPrice) <= 0) ? 0.5 : 1,
                    }}>
                    مراجعة
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ background: "#0B1E28", border: "1px solid #f59e0b40", borderRadius: 10, padding: 14, marginBottom: 16 }}>
                  <div style={{ color: "#f59e0b", fontSize: 12, fontWeight: 600, marginBottom: 8 }}>تأكيد — هذا الإجراء سيُضيف سجل تاريخ كلفة دائم</div>
                  <div style={{ color: "#94a3b8", fontSize: 11, lineHeight: 1.7 }}>
                    <div>المنتج: <span style={{ color: "#e2e8f0" }}>{selectedProduct.name}</span></div>
                    <div>التاريخ: <span style={{ color: "#e2e8f0" }}>{form.effectiveFrom}</span></div>
                    <div>الكلفة: <span style={{ color: "#e2e8f0" }}>{fmtIqd(parseFloat(form.costPrice) || 0)}</span></div>
                    <div>التغليف: <span style={{ color: "#e2e8f0" }}>{fmtIqd(parseFloat(form.packagingCost) || 0)}</span></div>
                    <div>الإدراج: <span style={{ color: "#e2e8f0" }}>{fmtIqd(parseFloat(form.insertCost) || 0)}</span></div>
                    <div>الملاحظة: <span style={{ color: "#e2e8f0" }}>{form.note}</span></div>
                  </div>
                  <div style={{ color: "#64748b", fontSize: 10, marginTop: 8 }}>الطلبيات القديمة لن تتغير — هذا السجل يؤثر على حسابات الربحية التاريخية فقط.</div>
                </div>
                {addBaselineMutation.isError && (
                  <div style={{ color: "#ef4444", fontSize: 11, marginBottom: 12 }}>{String(addBaselineMutation.error)}</div>
                )}
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button onClick={() => setConfirmPending(false)}
                    style={{ padding: "7px 16px", borderRadius: 8, fontSize: 12, cursor: "pointer", background: "transparent", border: "1px solid #1e3a5f", color: "#94a3b8" }}>
                    تعديل
                  </button>
                  <button onClick={handleSubmit} disabled={addBaselineMutation.isPending}
                    style={{
                      padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                      background: "#f59e0b", border: "none", color: "#000",
                      opacity: addBaselineMutation.isPending ? 0.6 : 1,
                    }}>
                    {addBaselineMutation.isPending ? "جارٍ الحفظ..." : "تأكيد وحفظ"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
