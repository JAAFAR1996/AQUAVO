import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

// ── Types ────────────────────────────────────────────────────────────────────

interface AuditTrailEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  fieldName: string | null;
  oldValue: unknown;
  newValue: unknown;
  reason: string | null;
  performedBy: string | null;
  performedByName: string | null;
  createdAt: string;
}

// ── Label maps ───────────────────────────────────────────────────────────────

const ENTITY_LABELS: Record<string, string> = {
  order: "طلب",
  expense: "مصروف",
  settlement: "تسوية شحن",
  return_event: "حدث إرجاع",
  manual_invoice: "فاتورة يدوية",
  product_cost: "كلفة منتج",
};

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  create: { label: "إنشاء", color: "#22c55e" },
  update: { label: "تعديل", color: "#f59e0b" },
  delete: { label: "حذف", color: "#ef4444" },
  status_change: { label: "تغيير حالة", color: "#0B93A6" },
};

const FIELD_LABELS: Record<string, string> = {
  boxCost: "كلفة الكارتونة",
  financiallyCounted: "محسوب مالياً",
  total: "الإجمالي",
  amount: "المبلغ",
  status: "الحالة",
};

const ENTITY_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "الكل" },
  { value: "order", label: "الطلبات" },
  { value: "expense", label: "المصاريف" },
  { value: "settlement", label: "التسويات" },
  { value: "return_event", label: "الإرجاعات" },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "خطأ غير معروف";
}

function formatDatetime(iso: string): string {
  return new Date(iso).toLocaleString("ar-IQ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  if (typeof v === "boolean") return v ? "نعم" : "لا";
  return String(v);
}

// ── Styles ───────────────────────────────────────────────────────────────────

const S = {
  card: {
    background: "#0d1f3c",
    border: "1px solid #0B93A620",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  } as React.CSSProperties,
  th: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: 600,
    padding: "8px 10px",
    borderBottom: "1px solid #1e3a5f",
    textAlign: "right" as const,
    whiteSpace: "nowrap" as const,
  } as React.CSSProperties,
  td: {
    padding: "10px 10px",
    fontSize: 12,
    color: "#e2e8f0",
    borderBottom: "1px solid #0d1f3c",
    verticalAlign: "top" as const,
  } as React.CSSProperties,
  sectionTitle: {
    color: "#0B93A6",
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 10,
  } as React.CSSProperties,
  infoBox: {
    background: "#0d1a2a",
    border: "1px solid #0B93A640",
    color: "#cbd5e1",
    padding: "10px 14px",
    borderRadius: 8,
    fontSize: 12,
    lineHeight: 1.7,
    marginBottom: 16,
  } as React.CSSProperties,
  filterBtn: (active: boolean): React.CSSProperties => ({
    padding: "5px 14px",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    background: active ? "#0B93A6" : "#0d1f3c",
    border: active ? "1.5px solid #0B93A6" : "1.5px solid #1e3a5f",
    color: active ? "#fff" : "#94a3b8",
  }),
};

// ── Main component ───────────────────────────────────────────────────────────

export function FinanceAuditTrail() {
  const [entityType, setEntityType] = useState("");

  const { data, isLoading, error } = useQuery<AuditTrailEntry[]>({
    queryKey: ["finance-audit-trail", entityType],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "300" });
      if (entityType) params.set("entityType", entityType);
      const res = await fetch(`/api/admin/accounting/audit-trail?${params}`, {
        credentials: "include",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.message ?? `خطأ ${res.status}`);
      return json.data as AuditTrailEntry[];
    },
    staleTime: 15_000,
  });

  const rows = data ?? [];

  return (
    <div dir="rtl">
      <div style={S.infoBox}>
        <div style={{ fontWeight: 700, marginBottom: 4, color: "#0B93A6" }}>سجل التدقيق المالي</div>
        <div>
          كل تعديل على أي رقم مالي (كلفة كارتونة، احتساب طلب، مصروف، تسوية، حالة إرجاع) يُسجَّل هنا
          بقيمته قبل وبعد، ومَن نفّذه، والسبب. السجل غير قابل للتعديل أو الحذف — لا يتغيّر أي رقم بصمت.
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {ENTITY_FILTERS.map((f) => (
          <button
            key={f.value}
            style={S.filterBtn(entityType === f.value)}
            onClick={() => setEntityType(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div style={S.card}>
        {isLoading && <div style={{ color: "#64748b", fontSize: 12 }}>جاري تحميل السجل...</div>}
        {error && <div style={{ color: "#ef4444", fontSize: 12 }}>{errMsg(error)}</div>}
        {!isLoading && !error && rows.length === 0 && (
          <div style={{ color: "#64748b", fontSize: 12 }}>لا توجد سجلات بعد</div>
        )}

        {rows.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["الوقت", "النوع", "الإجراء", "الحقل", "قبل", "بعد", "السبب", "المنفّذ"].map((h) => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const action = ACTION_LABELS[row.action] ?? { label: row.action, color: "#94a3b8" };
                  return (
                    <tr key={row.id}>
                      <td style={{ ...S.td, color: "#64748b", fontSize: 11, whiteSpace: "nowrap" }}>
                        {formatDatetime(row.createdAt)}
                      </td>
                      <td style={S.td}>{ENTITY_LABELS[row.entityType] ?? row.entityType}</td>
                      <td style={S.td}>
                        <span style={{
                          background: `${action.color}20`,
                          color: action.color,
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 4,
                          whiteSpace: "nowrap",
                        }}>
                          {action.label}
                        </span>
                      </td>
                      <td style={{ ...S.td, color: "#94a3b8" }}>
                        {row.fieldName ? (FIELD_LABELS[row.fieldName] ?? row.fieldName) : "—"}
                      </td>
                      <td style={{ ...S.td, color: "#fca5a5", maxWidth: 160, wordBreak: "break-word" }}>
                        {renderValue(row.oldValue)}
                      </td>
                      <td style={{ ...S.td, color: "#86efac", maxWidth: 160, wordBreak: "break-word" }}>
                        {renderValue(row.newValue)}
                      </td>
                      <td style={{ ...S.td, color: "#cbd5e1", maxWidth: 200, wordBreak: "break-word" }}>
                        {row.reason ?? "—"}
                      </td>
                      <td style={{ ...S.td, color: "#64748b", fontSize: 11 }}>
                        {row.performedByName ?? row.performedBy ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
