import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ── Types ────────────────────────────────────────────────────────────────────

interface Adjustment {
  id: string;
  entityType: string;
  entityId: string;
  fieldName: string;
  oldValueJson: unknown;
  newValueJson: unknown;
  reason: string;
  status: "pending" | "approved" | "rejected" | "applied";
  createdBy: string;
  approvedBy: string | null;
  createdAt: string;
  approvedAt: string | null;
  appliedAt: string | null;
  note: string | null;
}

interface ReviewFlag {
  id: string;
  category: string;
  severity: string;
  entityType: string;
  entityId: string;
  title: string;
  description: string;
  detectedValueJson: unknown;
  suggestedValueJson: unknown;
  status: "open" | "resolved" | "ignored";
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  approved: "#22c55e",
  rejected: "#ef4444",
  applied: "#6366f1",
  open: "#f59e0b",
  resolved: "#22c55e",
  ignored: "#64748b",
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#f59e0b",
  low: "#22c55e",
};

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      padding: "2px 8px", borderRadius: 5, fontSize: 10, fontWeight: 600,
      background: color + "22", color, border: `1px solid ${color}44`,
    }}>
      {label}
    </span>
  );
}

function jsonDisplay(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

// ── New Adjustment Form ───────────────────────────────────────────────────────

const ENTITY_TYPES = [
  "product", "order", "order_item", "invoice", "return_event",
  "settlement", "expense", "inventory", "product_variant",
] as const;

const COMMON_FIELDS: Record<string, string[]> = {
  product: ["purchaseUsd", "exchangeRate", "shippingPerUnitIqd", "woodCostIqd", "costPrice", "packagingCost", "insertCost", "stock", "lowStockThreshold"],
  order: ["status", "paymentStatus", "source", "deliveryStatus", "financiallyCounted", "shippingCost", "roundedTotal"],
  order_item: ["productId", "variantName", "quantity", "priceAtPurchase", "financiallyCounted"],
  invoice: ["status", "financiallyCounted", "linkedOrderId"],
  return_event: ["status", "restocked", "sellable", "actualReturnLoss", "refundAmount", "returnedQty", "writeOff"],
  settlement: ["amount", "carrier", "receivedDate", "notes"],
  expense: ["amount", "category", "date", "note"],
  inventory: ["stock", "lowStockThreshold"],
  product_variant: ["variantId", "variantLabel", "productId"],
};

interface NewAdjForm {
  entityType: string;
  entityId: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
  reason: string;
  note: string;
}

function NewAdjustmentForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState<NewAdjForm>({
    entityType: "product",
    entityId: "",
    fieldName: "",
    oldValue: "",
    newValue: "",
    reason: "",
    note: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fields = COMMON_FIELDS[form.entityType] ?? [];

  async function submit() {
    if (!form.entityId.trim()) { setError("ID الكيان مطلوب"); return; }
    if (!form.fieldName.trim()) { setError("اسم الحقل مطلوب"); return; }
    if (!form.newValue.trim()) { setError("القيمة الجديدة مطلوبة"); return; }
    if (form.reason.trim().length < 3) { setError("السبب مطلوب — لا يمكن التعديل بدون سبب"); return; }
    if (form.entityType === "product" && form.fieldName === "price") {
      setError("سعر البيع محمي — استخدم تبويب التكاليف مع adminConfirm.");
      return;
    }

    let newValueJson: unknown = form.newValue;
    try { newValueJson = JSON.parse(form.newValue); } catch { /* keep as string */ }
    let oldValueJson: unknown = form.oldValue || undefined;
    if (oldValueJson) try { oldValueJson = JSON.parse(form.oldValue); } catch { /* keep as string */ }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/accounting/manual-adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          entityType: form.entityType,
          entityId: form.entityId.trim(),
          fieldName: form.fieldName.trim(),
          oldValueJson,
          newValueJson,
          reason: form.reason.trim(),
          note: form.note.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message ?? `خطأ ${res.status}`);
      setForm({ entityType: "product", entityId: "", fieldName: "", oldValue: "", newValue: "", reason: "", note: "" });
      onSuccess();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "خطأ غير معروف");
    }
    setSubmitting(false);
  }

  const inp: React.CSSProperties = {
    background: "#0a1628", border: "1px solid #1e3a5f", color: "#e2e8f0",
    borderRadius: 7, padding: "6px 10px", fontSize: 12, width: "100%", outline: "none",
  };
  const sel: React.CSSProperties = { ...inp };

  return (
    <div style={{ background: "#0d1f3c", border: "1px solid #1e3a5f", borderRadius: 10, padding: "16px 18px", marginBottom: 20 }}>
      <div style={{ color: "#199bb8", fontWeight: 700, fontSize: 13, marginBottom: 12 }}>إنشاء تعديل يدوي جديد</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
        <div>
          <div style={{ color: "#64748b", fontSize: 11, marginBottom: 3 }}>نوع الكيان</div>
          <select style={sel} value={form.entityType} onChange={(e) => setForm({ ...form, entityType: e.target.value, fieldName: "" })}>
            {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <div style={{ color: "#64748b", fontSize: 11, marginBottom: 3 }}>ID الكيان</div>
          <input style={inp} value={form.entityId} onChange={(e) => setForm({ ...form, entityId: e.target.value })} placeholder="product-id أو order-id..." />
        </div>
        <div>
          <div style={{ color: "#64748b", fontSize: 11, marginBottom: 3 }}>الحقل المراد تعديله</div>
          <select style={sel} value={form.fieldName} onChange={(e) => setForm({ ...form, fieldName: e.target.value })}>
            <option value="">— اختر —</option>
            {fields.map((f) => <option key={f} value={f}>{f}</option>)}
            <option value="__custom__">حقل مخصص...</option>
          </select>
          {form.fieldName === "__custom__" && (
            <input style={{ ...inp, marginTop: 4 }} placeholder="اسم الحقل..." onChange={(e) => setForm({ ...form, fieldName: e.target.value })} />
          )}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <div>
          <div style={{ color: "#64748b", fontSize: 11, marginBottom: 3 }}>القيمة القديمة (اختياري)</div>
          <input style={inp} value={form.oldValue} onChange={(e) => setForm({ ...form, oldValue: e.target.value })} placeholder="القيمة الحالية للتوثيق..." />
        </div>
        <div>
          <div style={{ color: "#64748b", fontSize: 11, marginBottom: 3 }}>القيمة الجديدة *</div>
          <input style={inp} value={form.newValue} onChange={(e) => setForm({ ...form, newValue: e.target.value })} placeholder='مثال: 14500 أو "delivered" أو true' />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <div>
          <div style={{ color: "#64748b", fontSize: 11, marginBottom: 3 }}>السبب * (إلزامي)</div>
          <input style={{ ...inp, borderColor: form.reason.length > 0 && form.reason.length < 3 ? "#ef4444" : "#1e3a5f" }}
            value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="سبب التعديل — لماذا؟" />
        </div>
        <div>
          <div style={{ color: "#64748b", fontSize: 11, marginBottom: 3 }}>ملاحظة إضافية</div>
          <input style={inp} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="تفاصيل إضافية..." />
        </div>
      </div>
      {error && <div style={{ color: "#ef4444", fontSize: 11, marginBottom: 8 }}>⚠ {error}</div>}
      <button
        onClick={submit}
        disabled={submitting}
        style={{
          background: "#199bb8", border: "none", color: "#fff", borderRadius: 7,
          padding: "7px 20px", fontSize: 12, fontWeight: 600, cursor: "pointer",
          opacity: submitting ? 0.6 : 1,
        }}
      >
        {submitting ? "جاري الإرسال..." : "إرسال للمراجعة"}
      </button>
      <span style={{ marginRight: 10, color: "#64748b", fontSize: 11 }}>
        سيبقى pending حتى يعتمده المدير
      </span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

type SubTab = "pending" | "flags" | "log" | "new";

export function FinanceManualCorrections() {
  const [subTab, setSubTab] = useState<SubTab>("pending");
  const [flagFilter, setFlagFilter] = useState<"all" | "open" | "resolved" | "ignored">("open");
  const qc = useQueryClient();

  const { data: adjData, isLoading: adjLoading } = useQuery<{ success: boolean; data: Adjustment[] }>({
    queryKey: ["/api/admin/accounting/manual-adjustments"],
    queryFn: async () => {
      const res = await fetch("/api/admin/accounting/manual-adjustments", { credentials: "include" });
      if (!res.ok) throw new Error("فشل تحميل التعديلات");
      return res.json();
    },
    staleTime: 30_000,
  });

  const { data: flagData, isLoading: flagLoading } = useQuery<{ success: boolean; data: ReviewFlag[] }>({
    queryKey: ["/api/admin/accounting/review-flags"],
    queryFn: async () => {
      const res = await fetch("/api/admin/accounting/review-flags", { credentials: "include" });
      if (!res.ok) throw new Error("فشل تحميل الـ flags");
      return res.json();
    },
    staleTime: 30_000,
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/admin/accounting/manual-adjustments/${id}/approve`, { method: "PATCH", credentials: "include" }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/accounting/manual-adjustments"] }),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/admin/accounting/manual-adjustments/${id}/reject`, { method: "PATCH", credentials: "include" }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/accounting/manual-adjustments"] }),
  });

  const flagStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      fetch(`/api/admin/accounting/review-flags/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/accounting/review-flags"] }),
  });

  const adjustments = adjData?.data ?? [];
  const flags = flagData?.data ?? [];

  const pending = adjustments.filter((a) => a.status === "pending");
  const openFlags = flags.filter((f) => f.status === "open");

  const th: React.CSSProperties = {
    padding: "7px 10px", textAlign: "right", fontSize: 11, fontWeight: 600,
    color: "#94a3b8", borderBottom: "1px solid #1e3a5f", whiteSpace: "nowrap",
  };
  const td: React.CSSProperties = { padding: "8px 10px", fontSize: 11, color: "#e2e8f0", borderBottom: "1px solid #0d1f3c" };

  function tabBtn(value: SubTab, label: string, badge?: number) {
    return (
      <button
        key={value}
        onClick={() => setSubTab(value)}
        style={{
          padding: "5px 14px", borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: "pointer",
          background: subTab === value ? "#199bb8" : "#0d1f3c",
          border: subTab === value ? "1.5px solid #199bb8" : "1.5px solid #1e3a5f",
          color: subTab === value ? "#fff" : "#94a3b8",
          position: "relative",
        }}
      >
        {label}
        {badge != null && badge > 0 && (
          <span style={{
            position: "absolute", top: -6, right: -6, background: "#ef4444",
            color: "#fff", borderRadius: "50%", fontSize: 9, fontWeight: 700,
            minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px",
          }}>
            {badge}
          </span>
        )}
      </button>
    );
  }

  return (
    <div dir="rtl">
      {/* Header + sub-tabs */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: "#fff", fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
          مركز التصحيح اليدوي
        </div>
        <div style={{ color: "#64748b", fontSize: 11, marginBottom: 12 }}>
          كل تعديل يتطلب سبباً ويمر بموافقة المدير. AI لا يمكنه تطبيق أي تعديل.
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {tabBtn("pending", "بانتظار الموافقة", pending.length)}
          {tabBtn("flags", "تنبيهات مراجعة", openFlags.length)}
          {tabBtn("log", "سجل التعديلات")}
          {tabBtn("new", "تعديل جديد")}
        </div>
      </div>

      {/* ── Pending approvals ── */}
      {subTab === "pending" && (
        <div>
          {adjLoading && <div style={{ color: "#94a3b8", fontSize: 13, padding: 20 }}>جاري التحميل...</div>}
          {!adjLoading && pending.length === 0 && (
            <div style={{ color: "#64748b", fontSize: 13, padding: "32px 0", textAlign: "center" }}>
              لا توجد تعديلات بانتظار الموافقة
            </div>
          )}
          {pending.length > 0 && (
            <div style={{ overflowX: "auto", background: "#0d1f3c", borderRadius: 10, border: "1px solid #1e3a5f" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
                <thead>
                  <tr>
                    <th style={th}>الكيان</th>
                    <th style={th}>ID</th>
                    <th style={th}>الحقل</th>
                    <th style={th}>القيمة القديمة</th>
                    <th style={th}>القيمة الجديدة</th>
                    <th style={th}>السبب</th>
                    <th style={th}>التاريخ</th>
                    <th style={th}>الإجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map((a) => (
                    <tr key={a.id}>
                      <td style={{ ...td, color: "#c4b5fd" }}>{a.entityType}</td>
                      <td style={{ ...td, color: "#64748b", fontSize: 10 }}>{a.entityId.slice(0, 12)}…</td>
                      <td style={{ ...td, color: "#f59e0b", fontWeight: 600 }}>{a.fieldName}</td>
                      <td style={{ ...td, color: "#94a3b8" }}>{jsonDisplay(a.oldValueJson)}</td>
                      <td style={{ ...td, color: "#22c55e", fontWeight: 700 }}>{jsonDisplay(a.newValueJson)}</td>
                      <td style={{ ...td, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }} title={a.reason}>{a.reason}</td>
                      <td style={{ ...td, color: "#64748b" }}>{new Date(a.createdAt).toLocaleDateString("ar-IQ")}</td>
                      <td style={{ ...td }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            onClick={() => approveMutation.mutate(a.id)}
                            style={{ padding: "4px 10px", borderRadius: 5, fontSize: 10, fontWeight: 700, background: "#22c55e20", border: "1px solid #22c55e", color: "#22c55e", cursor: "pointer" }}
                          >
                            اعتماد
                          </button>
                          <button
                            onClick={() => rejectMutation.mutate(a.id)}
                            style={{ padding: "4px 10px", borderRadius: 5, fontSize: 10, fontWeight: 700, background: "#ef444420", border: "1px solid #ef4444", color: "#ef4444", cursor: "pointer" }}
                          >
                            رفض
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Review Flags ── */}
      {subTab === "flags" && (
        <div>
          <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
            {(["all", "open", "resolved", "ignored"] as const).map((s) => (
              <button key={s}
                onClick={() => setFlagFilter(s)}
                style={{
                  padding: "4px 12px", borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: "pointer",
                  background: flagFilter === s ? "#1e3a5f" : "#0d1f3c",
                  border: flagFilter === s ? "1.5px solid #199bb8" : "1.5px solid #1e3a5f",
                  color: flagFilter === s ? "#e2e8f0" : "#64748b",
                }}
              >
                {s === "all" ? "الكل" : s === "open" ? "مفتوح" : s === "resolved" ? "محلول" : "مُتجاهل"}
              </button>
            ))}
          </div>
          {flagLoading && <div style={{ color: "#94a3b8", fontSize: 13, padding: 20 }}>جاري التحميل...</div>}
          {!flagLoading && flags.filter((f) => flagFilter === "all" || f.status === flagFilter).length === 0 && (
            <div style={{ color: "#64748b", fontSize: 13, padding: "32px 0", textAlign: "center" }}>
              لا توجد تنبيهات مراجعة
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {flags
              .filter((f) => flagFilter === "all" || f.status === flagFilter)
              .map((f) => (
                <div key={f.id} style={{
                  background: "#0d1f3c", border: `1px solid ${SEVERITY_COLORS[f.severity] ?? "#1e3a5f"}44`,
                  borderRadius: 8, padding: "12px 14px",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div>
                      <span style={{ color: SEVERITY_COLORS[f.severity] ?? "#e2e8f0", fontWeight: 700, fontSize: 12 }}>{f.title}</span>
                      <span style={{ marginRight: 8 }}><Badge label={f.severity} color={SEVERITY_COLORS[f.severity] ?? "#94a3b8"} /></span>
                      <span style={{ marginRight: 4 }}><Badge label={f.status} color={STATUS_COLORS[f.status] ?? "#94a3b8"} /></span>
                    </div>
                    <span style={{ color: "#64748b", fontSize: 10 }}>{new Date(f.createdAt).toLocaleDateString("ar-IQ")}</span>
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 4 }}>{f.description}</div>
                  <div style={{ color: "#64748b", fontSize: 10, marginTop: 3 }}>
                    {f.entityType}: {f.entityId.slice(0, 16)}…
                    {f.detectedValueJson != null && <> — مكتشف: <span style={{ color: "#f59e0b" }}>{jsonDisplay(f.detectedValueJson)}</span></>}
                    {f.suggestedValueJson != null && <> — مقترح: <span style={{ color: "#22c55e" }}>{jsonDisplay(f.suggestedValueJson)}</span></>}
                  </div>
                  {f.status === "open" && (
                    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                      <button
                        onClick={() => flagStatusMutation.mutate({ id: f.id, status: "resolved" })}
                        style={{ padding: "3px 10px", borderRadius: 5, fontSize: 10, background: "#22c55e20", border: "1px solid #22c55e", color: "#22c55e", cursor: "pointer" }}
                      >
                        تم الحل
                      </button>
                      <button
                        onClick={() => flagStatusMutation.mutate({ id: f.id, status: "ignored" })}
                        style={{ padding: "3px 10px", borderRadius: 5, fontSize: 10, background: "#1e3a5f", border: "1px solid #1e3a5f", color: "#64748b", cursor: "pointer" }}
                      >
                        تجاهل
                      </button>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ── Audit Log ── */}
      {subTab === "log" && (
        <div>
          {adjLoading && <div style={{ color: "#94a3b8", fontSize: 13, padding: 20 }}>جاري التحميل...</div>}
          {!adjLoading && adjustments.length === 0 && (
            <div style={{ color: "#64748b", fontSize: 13, padding: "32px 0", textAlign: "center" }}>
              لا توجد تعديلات مسجّلة
            </div>
          )}
          {adjustments.length > 0 && (
            <div style={{ overflowX: "auto", background: "#0d1f3c", borderRadius: 10, border: "1px solid #1e3a5f" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
                <thead>
                  <tr>
                    <th style={th}>الكيان</th>
                    <th style={th}>ID</th>
                    <th style={th}>الحقل</th>
                    <th style={th}>من</th>
                    <th style={th}>إلى</th>
                    <th style={th}>السبب</th>
                    <th style={th}>الحالة</th>
                    <th style={th}>معتمد بواسطة</th>
                    <th style={th}>التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {adjustments.map((a) => (
                    <tr key={a.id}>
                      <td style={{ ...td, color: "#c4b5fd" }}>{a.entityType}</td>
                      <td style={{ ...td, color: "#64748b", fontSize: 10 }}>{a.entityId.slice(0, 12)}…</td>
                      <td style={{ ...td, color: "#f59e0b" }}>{a.fieldName}</td>
                      <td style={{ ...td, color: "#94a3b8" }}>{jsonDisplay(a.oldValueJson)}</td>
                      <td style={{ ...td, color: "#22c55e", fontWeight: 700 }}>{jsonDisplay(a.newValueJson)}</td>
                      <td style={{ ...td, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" }} title={a.reason}>{a.reason}</td>
                      <td style={td}><Badge label={a.status} color={STATUS_COLORS[a.status] ?? "#94a3b8"} /></td>
                      <td style={{ ...td, color: "#64748b", fontSize: 10 }}>{a.approvedBy ? a.approvedBy.slice(0, 8) + "…" : "—"}</td>
                      <td style={{ ...td, color: "#64748b" }}>{new Date(a.createdAt).toLocaleDateString("ar-IQ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── New Adjustment ── */}
      {subTab === "new" && (
        <div>
          <div style={{ background: "#0a1628", border: "1px solid #f59e0b40", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 11, color: "#fbbf24" }}>
            <strong>تذكير:</strong> كل تعديل يدخل بحالة "pending" ويحتاج موافقة المدير قبل التطبيق.
            سعر البيع <strong>محمي</strong> — لا يمكن تعديله من هنا.
            AI لا يمكنه إنشاء أو تطبيق أي تعديل.
          </div>
          <NewAdjustmentForm onSuccess={() => {
            qc.invalidateQueries({ queryKey: ["/api/admin/accounting/manual-adjustments"] });
            setSubTab("pending");
          }} />

          {/* Quick reference */}
          <div style={{ background: "#0d1f3c", border: "1px solid #1e3a5f", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ color: "#94a3b8", fontWeight: 600, fontSize: 12, marginBottom: 10 }}>أمثلة سريعة</div>
            {[
              { title: "تصحيح كلفة منتج", entity: "product", field: "costPrice", example: "6.28 × 1420 + 6188 = 15105.6 → مدخل كـ 15106" },
              { title: "تصحيح مرتجع سليم", entity: "return_event", field: "restocked + sellable", example: "restocked=true, sellable=true → actualReturnLoss=0" },
              { title: "فاتورة واتساب غير مسلمة", entity: "invoice", field: "financiallyCounted", example: "false — سبب: بانتظار التسليم" },
              { title: "تصحيح ربط variant", entity: "product_variant", field: "variantId", example: "coarse3 → تابع لـ yee-07509" },
            ].map((ex) => (
              <div key={ex.title} style={{ borderBottom: "1px solid #1e3a5f", padding: "8px 0", display: "flex", gap: 10 }}>
                <span style={{ color: "#199bb8", fontWeight: 600, fontSize: 11, minWidth: 180 }}>{ex.title}</span>
                <span style={{ color: "#64748b", fontSize: 11 }}>{ex.entity} → {ex.field}</span>
                <span style={{ color: "#94a3b8", fontSize: 11, marginRight: "auto" }}>{ex.example}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
