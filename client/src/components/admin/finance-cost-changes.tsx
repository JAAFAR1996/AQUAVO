import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { addCsrfHeader } from "@/lib/csrf";
import {
  accountingCostHistoryResponseSchema,
  type AccountingCostHistoryEntry,
} from "@shared/accounting";
import type { Product } from "@/types";

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n) + " د.ع";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

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

// ── Styles ─────────────────────────────────────────────────────────────────────

const S = {
  card: {
    background: "#0d1f3c",
    border: "1px solid #0B93A620",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  } as React.CSSProperties,
  label: {
    color: "#94a3b8",
    fontSize: 11,
    marginBottom: 4,
    display: "block",
  } as React.CSSProperties,
  input: {
    background: "#0B1E28",
    border: "1px solid #1e3a5f",
    color: "#e2e8f0",
    borderRadius: 8,
    padding: "6px 10px",
    width: "100%",
    fontSize: 13,
    boxSizing: "border-box" as const,
  } as React.CSSProperties,
  inputError: {
    background: "#0B1E28",
    border: "1px solid #ef4444",
    color: "#e2e8f0",
    borderRadius: 8,
    padding: "6px 10px",
    width: "100%",
    fontSize: 13,
    boxSizing: "border-box" as const,
  } as React.CSSProperties,
  btnPrimary: {
    background: "#0B93A6",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "8px 20px",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
  } as React.CSSProperties,
  btnDisabled: {
    background: "#1e3a5f",
    color: "#64748b",
    border: "none",
    borderRadius: 8,
    padding: "8px 20px",
    cursor: "not-allowed",
    fontSize: 13,
    fontWeight: 600,
  } as React.CSSProperties,
  errorText: {
    color: "#ef4444",
    fontSize: 11,
    marginTop: 2,
  } as React.CSSProperties,
  th: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: 600,
    padding: "8px 10px",
    borderBottom: "1px solid #1e3a5f",
    textAlign: "right" as const,
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
  warningBox: {
    background: "#1a1a0d",
    border: "1px solid #f59e0b40",
    color: "#fde68a",
    padding: "10px 14px",
    borderRadius: 8,
    fontSize: 12,
    lineHeight: 1.6,
    marginBottom: 16,
  } as React.CSSProperties,
  costBadge: {
    display: "inline-block",
    background: "#0B1E28",
    border: "1px solid #0B93A620",
    color: "#e2e8f0",
    borderRadius: 6,
    padding: "2px 8px",
    fontSize: 12,
    fontWeight: 600,
  } as React.CSSProperties,
  missingBadge: {
    display: "inline-block",
    background: "#1a0d0d",
    border: "1px solid #ef444440",
    color: "#fca5a5",
    borderRadius: 6,
    padding: "2px 8px",
    fontSize: 12,
    fontWeight: 600,
  } as React.CSSProperties,
};

// ── Form state ─────────────────────────────────────────────────────────────────

interface FormState {
  costPrice: string;
  packagingCost: string;
  insertCost: string;
  effectiveFrom: string;
  note: string;
}

interface FormErrors {
  costPrice?: string;
  packagingCost?: string;
  insertCost?: string;
  effectiveFrom?: string;
}

function emptyForm(product?: Product): FormState {
  return {
    costPrice: product?.costPrice ? String(Math.round(Number(product.costPrice))) : "",
    packagingCost: product?.packagingCost
      ? String(Math.round(Number(product.packagingCost)))
      : "",
    insertCost: product?.insertCost ? String(Math.round(Number(product.insertCost))) : "",
    effectiveFrom: todayStr(),
    note: "",
  };
}

function validateForm(f: FormState): FormErrors {
  const errors: FormErrors = {};
  const cp = Number(f.costPrice);
  const pk = Number(f.packagingCost);
  const ic = Number(f.insertCost);
  if (f.costPrice === "" || isNaN(cp) || cp < 0)
    errors.costPrice = "قيمة غير صالحة (يجب أن تكون >= 0)";
  if (f.packagingCost === "" || isNaN(pk) || pk < 0)
    errors.packagingCost = "قيمة غير صالحة (يجب أن تكون >= 0)";
  if (f.insertCost === "" || isNaN(ic) || ic < 0)
    errors.insertCost = "قيمة غير صالحة (يجب أن تكون >= 0)";
  if (!f.effectiveFrom) errors.effectiveFrom = "تاريخ التفعيل مطلوب";
  return errors;
}

// ── Main component ─────────────────────────────────────────────────────────────

export function FinanceCostChanges() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // ── Product search ──────────────────────────────────────────────────────────

  const { data: productsData, isLoading: loadingProducts } = useQuery<{
    products: Product[];
  }>({
    queryKey: ["products-search-costs", search],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "30" });
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/products?${params}`, { credentials: "include" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message ?? `خطأ ${res.status}`);
      return json;
    },
    staleTime: 30_000,
  });

  const products = productsData?.products ?? [];

  // ── Cost history ────────────────────────────────────────────────────────────

  const {
    data: history,
    isLoading: loadingHistory,
    error: historyError,
  } = useQuery<AccountingCostHistoryEntry[]>({
    queryKey: ["cost-history", selectedProduct?.id],
    queryFn: async () => {
      const res = await fetch(
        `/api/admin/accounting/cost-history/${selectedProduct!.id}`,
        { credentials: "include" },
      );
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.message ?? `خطأ ${res.status}`);
      return accountingCostHistoryResponseSchema.parse(json.data);
    },
    enabled: !!selectedProduct,
  });

  // ── Submit mutation ─────────────────────────────────────────────────────────

  const mutation = useMutation({
    mutationFn: async (body: {
      costPrice: number;
      packagingCost: number;
      insertCost: number;
      effectiveFrom: string;
      note?: string;
    }) => {
      const res = await fetch(
        `/api/admin/accounting/costs/${selectedProduct!.id}`,
        {
          method: "POST",
          credentials: "include",
          headers: addCsrfHeader({ "Content-Type": "application/json" }),
          body: JSON.stringify(body),
        },
      );
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.message ?? `خطأ ${res.status}`);
      return json;
    },
    onSuccess: () => {
      toast({ title: "تم حفظ التغيير", description: "تم تسجيل تغيير الكلفة بنجاح" });
      queryClient.invalidateQueries({ queryKey: ["cost-history", selectedProduct?.id] });
      queryClient.invalidateQueries({ queryKey: ["products-search-costs"] });
    },
    onError: (e) => {
      toast({ title: "خطأ في الحفظ", description: errMsg(e), variant: "destructive" });
    },
  });

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleSelectProduct(p: Product) {
    setSelectedProduct(p);
    setForm(emptyForm(p));
    setFormErrors({});
  }

  function handleField(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function handleSubmit() {
    const errors = validateForm(form);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    mutation.mutate({
      costPrice: Number(form.costPrice),
      packagingCost: Number(form.packagingCost),
      insertCost: Number(form.insertCost),
      effectiveFrom: form.effectiveFrom,
      note: form.note.trim() || undefined,
    });
  }

  const costMissing =
    selectedProduct && Number(selectedProduct.costPrice) === 0;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div dir="rtl">
      {/* Safety warning */}
      <div style={S.warningBox}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>تنبيه مهم</div>
        <div>هذا التغيير يطبق من تاريخ التفعيل فقط ولا يغيّر الطلبات القديمة.</div>
        <div style={{ marginTop: 2 }}>
          أي طلب سابق يبقى محسوب حسب السجل الفعّال بتاريخ الطلب.
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(240px, 1fr) minmax(320px, 1.5fr)",
          gap: 16,
          alignItems: "start",
        }}
      >
        {/* Left: Product selector */}
        <div>
          <div style={S.sectionTitle}>اختيار المنتج</div>
          <div style={S.card}>
            <label style={S.label}>بحث عن منتج</label>
            <input
              style={S.input}
              placeholder="اسم المنتج أو ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {loadingProducts && (
              <div style={{ color: "#64748b", fontSize: 12, marginTop: 10 }}>
                جاري التحميل...
              </div>
            )}

            <div style={{ marginTop: 10, maxHeight: 340, overflowY: "auto" }}>
              {products.map((p) => {
                const isSelected = selectedProduct?.id === p.id;
                const hasCost = Number(p.costPrice) > 0;
                return (
                  <div
                    key={p.id}
                    onClick={() => handleSelectProduct(p)}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 8,
                      marginBottom: 4,
                      cursor: "pointer",
                      background: isSelected ? "#0d2a3f" : "transparent",
                      border: isSelected
                        ? "1px solid #0B93A640"
                        : "1px solid transparent",
                    }}
                  >
                    <div
                      style={{
                        color: "#e2e8f0",
                        fontSize: 12,
                        fontWeight: isSelected ? 700 : 400,
                        lineHeight: 1.4,
                      }}
                    >
                      {p.name}
                    </div>
                    <div style={{ color: "#64748b", fontSize: 10, marginTop: 3 }}>
                      {p.id}&nbsp;|&nbsp;
                      <span style={hasCost ? S.costBadge : S.missingBadge}>
                        {hasCost ? fmt(Number(p.costPrice)) : "كلفة غير محددة"}
                      </span>
                    </div>
                  </div>
                );
              })}
              {!loadingProducts && products.length === 0 && (
                <div style={{ color: "#64748b", fontSize: 12 }}>لا توجد نتائج</div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Form + current costs */}
        <div>
          {selectedProduct ? (
            <>
              {/* Current costs display */}
              <div style={S.sectionTitle}>الكلف الحالية — {selectedProduct.name}</div>
              <div style={{ ...S.card, marginBottom: 12 }}>
                {costMissing && (
                  <div
                    style={{
                      background: "#1a0d0d",
                      border: "1px solid #ef444440",
                      color: "#fca5a5",
                      borderRadius: 6,
                      padding: "6px 10px",
                      fontSize: 11,
                      marginBottom: 10,
                    }}
                  >
                    تحذير: هذا المنتج لا يحتوي على كلفة محددة — أرقام الربح غير دقيقة
                  </div>
                )}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 8,
                  }}
                >
                  {(
                    [
                      { label: "كلفة المنتج", val: selectedProduct.costPrice },
                      { label: "تغليف", val: selectedProduct.packagingCost },
                      { label: "إنسيرت", val: selectedProduct.insertCost },
                    ] as { label: string; val: string | number | null | undefined }[]
                  ).map(({ label, val }) => (
                    <div key={label} style={{ textAlign: "center" }}>
                      <div style={{ color: "#64748b", fontSize: 10, marginBottom: 4 }}>
                        {label}
                      </div>
                      <div style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 700 }}>
                        {Number(val) > 0 ? (
                          fmt(Number(val))
                        ) : (
                          <span style={{ color: "#ef4444" }}>—</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cost change form */}
              <div style={S.sectionTitle}>تسجيل تغيير الكلفة</div>
              <div style={S.card}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 10,
                    marginBottom: 12,
                  }}
                >
                  {(
                    ["costPrice", "packagingCost", "insertCost"] as const
                  ).map((key) => {
                    const labels: Record<typeof key, string> = {
                      costPrice: "كلفة المنتج (د.ع)",
                      packagingCost: "تغليف (د.ع)",
                      insertCost: "إنسيرت (د.ع)",
                    };
                    return (
                      <div key={key}>
                        <label style={S.label}>{labels[key]}</label>
                        <input
                          type="number"
                          min="0"
                          style={formErrors[key] ? S.inputError : S.input}
                          value={form[key]}
                          onChange={(e) => handleField(key, e.target.value)}
                        />
                        {formErrors[key] && (
                          <div style={S.errorText}>{formErrors[key]}</div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                    marginBottom: 16,
                  }}
                >
                  <div>
                    <label style={S.label}>تاريخ التفعيل *</label>
                    <input
                      type="date"
                      style={formErrors.effectiveFrom ? S.inputError : S.input}
                      value={form.effectiveFrom}
                      onChange={(e) => handleField("effectiveFrom", e.target.value)}
                    />
                    {formErrors.effectiveFrom && (
                      <div style={S.errorText}>{formErrors.effectiveFrom}</div>
                    )}
                  </div>
                  <div>
                    <label style={S.label}>ملاحظة (اختياري)</label>
                    <input
                      type="text"
                      maxLength={200}
                      style={S.input}
                      placeholder="سبب التغيير..."
                      value={form.note}
                      onChange={(e) => handleField("note", e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button
                    style={mutation.isPending ? S.btnDisabled : S.btnPrimary}
                    disabled={mutation.isPending}
                    onClick={handleSubmit}
                  >
                    {mutation.isPending ? "جاري الحفظ..." : "حفظ التغيير"}
                  </button>
                  {mutation.isError && (
                    <span style={{ color: "#ef4444", fontSize: 12 }}>
                      {errMsg(mutation.error)}
                    </span>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div
              style={{
                color: "#64748b",
                fontSize: 13,
                padding: "40px 0",
                textAlign: "center",
              }}
            >
              اختر منتجاً من القائمة لعرض كلفته وتسجيل تغيير
            </div>
          )}
        </div>
      </div>

      {/* History timeline */}
      {selectedProduct && (
        <div style={{ marginTop: 8 }}>
          <div style={S.sectionTitle}>
            سجل تغييرات الكلفة — {selectedProduct.name}
          </div>
          <div style={S.card}>
            {loadingHistory && (
              <div style={{ color: "#64748b", fontSize: 12 }}>
                جاري تحميل السجل...
              </div>
            )}
            {historyError && (
              <div style={{ color: "#ef4444", fontSize: 12 }}>
                {errMsg(historyError)}
              </div>
            )}
            {history && history.length === 0 && (
              <div style={{ color: "#64748b", fontSize: 12 }}>
                لا يوجد سجل تغييرات لهذا المنتج
              </div>
            )}
            {history && history.length > 0 && (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {[
                        "تاريخ التفعيل",
                        "كلفة المنتج",
                        "تغليف",
                        "إنسيرت",
                        "ملاحظة",
                        "وقت الإدخال",
                      ].map((h) => (
                        <th key={h} style={S.th}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((row, i) => (
                      <tr
                        key={row.id}
                        style={{
                          background: i === 0 ? "#0d2a3f" : "transparent",
                        }}
                      >
                        <td style={S.td}>
                          {row.effectiveFrom.slice(0, 10)}
                          {i === 0 && (
                            <span
                              style={{
                                marginRight: 6,
                                background: "#0B93A620",
                                color: "#0B93A6",
                                fontSize: 9,
                                fontWeight: 700,
                                padding: "1px 5px",
                                borderRadius: 4,
                              }}
                            >
                              الأحدث
                            </span>
                          )}
                        </td>
                        <td style={S.td}>{fmt(row.costPrice)}</td>
                        <td style={S.td}>{fmt(row.packagingCost)}</td>
                        <td style={S.td}>{fmt(row.insertCost)}</td>
                        <td style={{ ...S.td, color: "#94a3b8", maxWidth: 200 }}>
                          {row.note ?? "—"}
                        </td>
                        <td style={{ ...S.td, color: "#64748b", fontSize: 11 }}>
                          {formatDatetime(row.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
