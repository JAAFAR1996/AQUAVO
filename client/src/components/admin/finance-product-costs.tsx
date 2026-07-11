import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { addCsrfHeader } from "@/lib/csrf";
import type { Product } from "@/types";

const EXCHANGE_RATE = 1420;

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n) + " د.ع";
}

function fmtPct(n: number) {
  return (n > 0 ? "+" : "") + n.toFixed(1) + "%";
}

interface InputRow {
  purchaseUsd: string;
  shippingIqd: string;
  woodCost: string;
}

type RowState = "idle" | "preview" | "saving" | "saved" | "error";

interface Preview {
  oldCost: number;
  newCost: number;
  diff: number;
  salePrice: number;
  oldGrossMargin: number;
  newGrossMargin: number;
  abovePrice: boolean;
}

function computeCost(row: InputRow): number | null {
  const usd = parseFloat(row.purchaseUsd);
  if (isNaN(usd) || usd <= 0) return null;
  const ship = parseFloat(row.shippingIqd) || 0;
  const wood = parseFloat(row.woodCost) || 0;
  return Math.round(usd * EXCHANGE_RATE + ship + wood);
}

function buildPreview(p: Product, newCost: number): Preview {
  const oldCost = parseFloat(String(p.costPrice ?? "0")) || 0;
  const salePrice = parseFloat(String(p.price ?? "0")) || 0;
  const oldGrossMargin = salePrice > 0 && oldCost > 0
    ? ((salePrice - oldCost) / salePrice) * 100 : 0;
  const newGrossMargin = salePrice > 0
    ? ((salePrice - newCost) / salePrice) * 100 : 0;
  return {
    oldCost,
    newCost,
    diff: newCost - oldCost,
    salePrice,
    oldGrossMargin,
    newGrossMargin,
    abovePrice: salePrice > 0 && newCost > salePrice,
  };
}

const inp: React.CSSProperties = {
  background: "#0B1E28",
  border: "1px solid #1e3a5f",
  color: "#e2e8f0",
  borderRadius: 6,
  padding: "5px 8px",
  width: "100%",
  fontSize: 12,
  boxSizing: "border-box",
};

const btn = (variant: "primary" | "ghost" | "danger", disabled = false): React.CSSProperties => ({
  background: disabled ? "#1e3a5f" : variant === "primary" ? "#0B93A6" : variant === "danger" ? "#7f1d1d" : "#0d1f3c",
  color: disabled ? "#64748b" : "#e2e8f0",
  border: `1px solid ${variant === "danger" ? "#ef444440" : "#1e3a5f"}`,
  borderRadius: 6,
  padding: "5px 12px",
  fontSize: 11,
  fontWeight: 600,
  cursor: disabled ? "not-allowed" : "pointer",
  whiteSpace: "nowrap",
});

export function FinanceProductCosts() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [inputs, setInputs] = useState<Record<string, InputRow>>({});
  const [states, setStates] = useState<Record<string, RowState>>({});
  const [previews, setPreviews] = useState<Record<string, Preview>>({});
  const [search, setSearch] = useState("");

  const { data: productsData, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products/all-costs"],
    queryFn: async () => {
      const res = await fetch("/api/products?limit=500", { credentials: "include" });
      if (!res.ok) throw new Error("فشل تحميل المنتجات");
      const json = await res.json();
      return Array.isArray(json) ? json : (json.products ?? json.data ?? []);
    },
  });

  const products = productsData ?? [];

  useEffect(() => {
    if (!products.length) return;
    setInputs(prev => {
      const next = { ...prev };
      for (const p of products) {
        if (!next[p.id]) next[p.id] = { purchaseUsd: "", shippingIqd: "", woodCost: "" };
      }
      return next;
    });
  }, [products]);

  function setInput(id: string, field: keyof InputRow, value: string) {
    setInputs(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
    setStates(prev => ({ ...prev, [id]: "idle" }));
    setPreviews(prev => { const n = { ...prev }; delete n[id]; return n; });
  }

  function requestPreview(p: Product) {
    const row = inputs[p.id];
    const cost = computeCost(row);
    if (cost === null) { toast({ title: "أدخل سعر الشراء بالدولار أولاً", variant: "destructive" }); return; }
    setPreviews(prev => ({ ...prev, [p.id]: buildPreview(p, cost) }));
    setStates(prev => ({ ...prev, [p.id]: "preview" }));
  }

  function cancelPreview(id: string) {
    setStates(prev => ({ ...prev, [id]: "idle" }));
    setPreviews(prev => { const n = { ...prev }; delete n[id]; return n; });
  }

  async function confirmSave(p: Product) {
    const preview = previews[p.id];
    if (!preview) return;
    const row = inputs[p.id];
    setStates(prev => ({ ...prev, [p.id]: "saving" }));
    try {
      const res = await fetch(`/api/admin/accounting/costs/${p.id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...addCsrfHeader() },
        body: JSON.stringify({
          costPrice: preview.newCost,
          packagingCost: 0,
          insertCost: 0,
          note: `USD:${row.purchaseUsd} شحن:${row.shippingIqd || 0} خشب:${row.woodCost || 0} صرف:${EXCHANGE_RATE} → ${preview.newCost} د.ع`,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message ?? "فشل الحفظ");
      }
      setStates(prev => ({ ...prev, [p.id]: "saved" }));
      qc.invalidateQueries({ queryKey: ["/api/admin/accounting/products"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/accounting/cost-history"] });
      qc.invalidateQueries({ queryKey: ["/api/products/all-costs"] });
    } catch (e) {
      setStates(prev => ({ ...prev, [p.id]: "error" }));
      toast({ title: "فشل الحفظ", description: e instanceof Error ? e.message : "خطأ", variant: "destructive" });
    }
  }

  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <div style={{ color: "#64748b", padding: 40, textAlign: "center" }}>جاري التحميل...</div>;

  return (
    <div dir="rtl">
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ color: "#e2e8f0", fontSize: 15, fontWeight: 700, margin: "0 0 4px" }}>تكاليف المنتجات</h2>
        <p style={{ color: "#64748b", fontSize: 11, margin: 0 }}>
          يغيّر <strong>costPrice</strong> فقط — لا يمس سعر البيع أبداً &nbsp;|&nbsp;
          الكلفة = دولار × {EXCHANGE_RATE} + شحن + خشب
        </p>
      </div>

      {/* Search */}
      <input
        placeholder="بحث عن منتج..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ ...inp, width: 260, marginBottom: 14 }}
      />

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ color: "#64748b", borderBottom: "1px solid #1e3a5f" }}>
              <th style={{ textAlign: "right", padding: "6px 10px" }}>المنتج</th>
              <th style={{ textAlign: "right", padding: "6px 10px" }}>الكلفة الحالية</th>
              <th style={{ textAlign: "right", padding: "6px 10px" }}>سعر البيع</th>
              <th style={{ textAlign: "right", padding: "6px 10px" }}>شراء ($)</th>
              <th style={{ textAlign: "right", padding: "6px 10px" }}>شحن بغداد (د.ع)</th>
              <th style={{ textAlign: "right", padding: "6px 10px" }}>خشب (د.ع)</th>
              <th style={{ textAlign: "right", padding: "6px 10px" }}>كلفة جديدة</th>
              <th style={{ textAlign: "right", padding: "6px 10px" }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const row = inputs[p.id] ?? { purchaseUsd: "", shippingIqd: "", woodCost: "" };
              const state = states[p.id] ?? "idle";
              const preview = previews[p.id];
              const newCost = computeCost(row);
              const currentCost = parseFloat(String(p.costPrice ?? "0")) || 0;
              const salePrice = parseFloat(String(p.price ?? "0")) || 0;

              return (
                <>
                  <tr key={p.id} style={{ borderBottom: "1px solid #0d1f3c" }}>
                    <td style={{ padding: "8px 10px" }}>
                      <div style={{ color: "#e2e8f0", fontWeight: 600 }}>{p.name}</div>
                      {p.category && <div style={{ color: "#475569", fontSize: 10 }}>{p.category}</div>}
                    </td>
                    <td style={{ padding: "8px 10px", color: currentCost > 0 ? "#94a3b8" : "#ef4444" }}>
                      {currentCost > 0 ? fmt(currentCost) : "غير محدد"}
                    </td>
                    <td style={{ padding: "8px 10px", color: "#64748b" }}>
                      {salePrice > 0 ? fmt(salePrice) : "—"}
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      <input type="number" min="0" step="0.01" placeholder="12.5" value={row.purchaseUsd}
                        onChange={e => setInput(p.id, "purchaseUsd", e.target.value)} style={{ ...inp, width: 90 }} />
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      <input type="number" min="0" step="500" placeholder="3000" value={row.shippingIqd}
                        onChange={e => setInput(p.id, "shippingIqd", e.target.value)} style={{ ...inp, width: 90 }} />
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      <input type="number" min="0" step="500" placeholder="0" value={row.woodCost}
                        onChange={e => setInput(p.id, "woodCost", e.target.value)} style={{ ...inp, width: 80 }} />
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      {newCost !== null ? (
                        <span style={{
                          color: newCost > salePrice && salePrice > 0 ? "#ef4444" : "#4ade80",
                          fontWeight: 700,
                        }}>
                          {fmt(newCost)}
                          {newCost > salePrice && salePrice > 0 && (
                            <span style={{ color: "#ef4444", fontSize: 10, marginRight: 4 }}>⚠ أعلى من السعر</span>
                          )}
                        </span>
                      ) : <span style={{ color: "#475569" }}>—</span>}
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      {state === "saved" ? (
                        <span style={{ color: "#4ade80", fontSize: 11, fontWeight: 600 }}>محفوظ</span>
                      ) : state === "saving" ? (
                        <span style={{ color: "#64748b", fontSize: 11 }}>...</span>
                      ) : state === "error" ? (
                        <span style={{ color: "#ef4444", fontSize: 11 }}>خطأ</span>
                      ) : state === "preview" ? (
                        <div style={{ display: "flex", gap: 4 }}>
                          <button onClick={() => confirmSave(p)} style={btn("primary")}>تأكيد</button>
                          <button onClick={() => cancelPreview(p.id)} style={btn("ghost")}>إلغاء</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => requestPreview(p)}
                          disabled={newCost === null}
                          style={btn("ghost", newCost === null)}
                        >
                          معاينة
                        </button>
                      )}
                    </td>
                  </tr>

                  {/* Preview row */}
                  {state === "preview" && preview && (
                    <tr key={p.id + "-preview"} style={{ background: "#050e1a" }}>
                      <td colSpan={8} style={{ padding: "0 10px 10px" }}>
                        <div style={{
                          background: preview.abovePrice ? "#1a0505" : "#0B1E28",
                          border: `1px solid ${preview.abovePrice ? "#ef444460" : "#0B93A640"}`,
                          borderRadius: 8,
                          padding: "10px 16px",
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 24,
                          alignItems: "center",
                        }}>
                          <Cell label="الكلفة القديمة" value={preview.oldCost > 0 ? fmt(preview.oldCost) : "غير محدد"} />
                          <span style={{ color: "#0B93A6", fontSize: 18 }}>→</span>
                          <Cell label="الكلفة الجديدة" value={fmt(preview.newCost)} color="#4ade80" />
                          <Cell
                            label="الفرق"
                            value={(preview.diff >= 0 ? "+" : "") + fmt(preview.diff)}
                            color={preview.diff > 0 ? "#f97316" : preview.diff < 0 ? "#4ade80" : "#64748b"}
                          />
                          <Cell label="سعر البيع" value={preview.salePrice > 0 ? fmt(preview.salePrice) : "—"} />
                          <Cell
                            label="هامش قديم"
                            value={preview.oldCost > 0 && preview.salePrice > 0 ? fmtPct(preview.oldGrossMargin) : "—"}
                            color={preview.oldGrossMargin >= 20 ? "#22c55e" : "#f59e0b"}
                          />
                          <Cell
                            label="هامش جديد"
                            value={preview.salePrice > 0 ? fmtPct(preview.newGrossMargin) : "—"}
                            color={preview.newGrossMargin >= 20 ? "#22c55e" : preview.newGrossMargin > 0 ? "#f59e0b" : "#ef4444"}
                          />
                          {preview.abovePrice && (
                            <div style={{
                              background: "#7f1d1d60",
                              border: "1px solid #ef444480",
                              borderRadius: 6,
                              padding: "6px 12px",
                              color: "#fca5a5",
                              fontSize: 11,
                              fontWeight: 600,
                            }}>
                              ⚠ الكلفة أعلى من سعر البيع — سيكون هامش سالب. تأكد من الأرقام.
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div style={{ color: "#64748b", textAlign: "center", padding: 40 }}>لا توجد منتجات</div>
      )}

      <div style={{ marginTop: 20, padding: "10px 14px", background: "#0d1f3c", borderRadius: 8, border: "1px solid #1e3a5f", fontSize: 11, color: "#64748b" }}>
        المعادلة: <span style={{ color: "#0B93A6", fontWeight: 700 }}>الكلفة = (شراء$ × {EXCHANGE_RATE}) + شحن + خشب</span>
        &nbsp;— هذا التبويب يغيّر <strong style={{ color: "#e2e8f0" }}>costPrice فقط</strong> ولا يمس price أبداً.
        كل تغيير يُسجَّل في سجل الكلف.
      </div>
    </div>
  );
}

function Cell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div style={{ color: "#64748b", fontSize: 10, marginBottom: 2 }}>{label}</div>
      <div style={{ color: color ?? "#e2e8f0", fontSize: 13, fontWeight: 700 }}>{value}</div>
    </div>
  );
}
