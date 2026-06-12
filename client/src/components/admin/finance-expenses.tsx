import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { addCsrfHeader } from "@/lib/csrf";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  type ExpenseInput,
  type ExpenseResponse,
} from "@shared/accounting";

// ── Types ─────────────────────────────────────────────────────────────────────

type Period = "day" | "week" | "month" | "year";

interface CategoryTotal {
  category: string;
  total: number;
}

interface ExpensesData {
  list: ExpenseResponse[];
  totalExpenses: number;
  byCategory: CategoryTotal[];
  expensesComplete: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n) + " د.ع";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "خطأ غير معروف";
}

async function fetchExpenses(url: string): Promise<ExpensesData> {
  const res = await fetch(url, { credentials: "include" });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) throw new Error(json?.message ?? `خطأ ${res.status}`);
  return json.data as ExpensesData;
}

// ── Form state ────────────────────────────────────────────────────────────────

interface FormState {
  category: ExpenseInput["category"];
  amount: string;
  expenseDate: string;
  description: string;
  isRecurring: boolean;
  recurringPeriod: "monthly" | "weekly" | "yearly" | "";
}

interface FormErrors {
  amount?: string;
  expenseDate?: string;
  recurringPeriod?: string;
}

const emptyForm = (): FormState => ({
  category: "rent",
  amount: "",
  expenseDate: todayStr(),
  description: "",
  isRecurring: false,
  recurringPeriod: "",
});

const RECURRING_LABELS: Record<"monthly" | "weekly" | "yearly", string> = {
  monthly: "شهري",
  weekly: "أسبوعي",
  yearly: "سنوي",
};

// ── Styles ────────────────────────────────────────────────────────────────────

const S = {
  card: {
    background: "#0d1f3c",
    border: "1px solid #199bb820",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
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
    boxSizing: "border-box",
  } as React.CSSProperties,
  select: {
    background: "#010611",
    border: "1px solid #1e3a5f",
    color: "#e2e8f0",
    borderRadius: 8,
    padding: "6px 10px",
    width: "100%",
    fontSize: 13,
    boxSizing: "border-box",
  } as React.CSSProperties,
  btnPrimary: {
    background: "#199bb8",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "7px 18px",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
  } as React.CSSProperties,
  btnSecondary: {
    background: "transparent",
    color: "#64748b",
    border: "1px solid #1e3a5f",
    borderRadius: 8,
    padding: "7px 18px",
    cursor: "pointer",
    fontSize: 13,
  } as React.CSSProperties,
  btnDanger: {
    background: "transparent",
    color: "#ef4444",
    border: "1px solid #ef444440",
    borderRadius: 8,
    padding: "4px 10px",
    cursor: "pointer",
    fontSize: 12,
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
    paddingBottom: 8,
    borderBottom: "1px solid #1e3a5f",
    textAlign: "right",
    padding: "8px 8px",
  } as React.CSSProperties,
  td: {
    padding: "10px 8px",
    borderBottom: "1px solid #1e3a5f0a",
    color: "#e2e8f0",
    verticalAlign: "middle",
  } as React.CSSProperties,
};

// ── Component ─────────────────────────────────────────────────────────────────

export function FinanceExpenses({ period }: { period: Period }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [errors, setErrors] = useState<FormErrors>({});

  // ── Query ──────────────────────────────────────────────────────────────────

  const { data, isLoading, error } = useQuery<ExpensesData>({
    queryKey: ["expenses", period],
    queryFn: () => fetchExpenses(`/api/admin/expenses?period=${period}`),
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["expenses"] });

  const addMutation = useMutation({
    mutationFn: async (body: ExpenseInput) => {
      const res = await fetch("/api/admin/expenses", {
        method: "POST",
        credentials: "include",
        headers: addCsrfHeader({ "Content-Type": "application/json" }),
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.message ?? `خطأ ${res.status}`);
      return json.data as ExpenseResponse;
    },
    onSuccess: () => {
      toast({ title: "تم الحفظ" });
      invalidate();
      closeForm();
    },
    onError: (e) => toast({ title: errMsg(e), variant: "destructive" }),
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Partial<ExpenseInput> & { reason: string } }) => {
      const res = await fetch(`/api/admin/expenses/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: addCsrfHeader({ "Content-Type": "application/json" }),
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.message ?? `خطأ ${res.status}`);
      return json.data as ExpenseResponse;
    },
    onSuccess: () => {
      toast({ title: "تم الحفظ" });
      invalidate();
      closeForm();
    },
    onError: (e) => toast({ title: errMsg(e), variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await fetch(`/api/admin/expenses/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: addCsrfHeader({ "Content-Type": "application/json" }),
        body: JSON.stringify({ reason }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.message ?? `خطأ ${res.status}`);
    },
    onSuccess: () => {
      toast({ title: "تم الحذف" });
      invalidate();
    },
    onError: (e) => toast({ title: errMsg(e), variant: "destructive" }),
  });

  // ── Form helpers ───────────────────────────────────────────────────────────

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
    setErrors({});
  }

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm());
    setErrors({});
    setShowForm(true);
  }

  function openEdit(expense: ExpenseResponse) {
    setEditingId(expense.id);
    const safeCategory = (EXPENSE_CATEGORIES as readonly string[]).includes(expense.category)
      ? (expense.category as ExpenseInput["category"])
      : "other";
    setForm({
      category: safeCategory,
      amount: String(expense.amount),
      expenseDate: expense.expenseDate.slice(0, 10),
      description: expense.description ?? "",
      isRecurring: expense.isRecurring,
      recurringPeriod: (expense.recurringPeriod as FormState["recurringPeriod"]) ?? "",
    });
    setErrors({});
    setShowForm(true);
  }

  function validate(): boolean {
    const next: FormErrors = {};
    if (!form.amount || Number(form.amount) <= 0) {
      next.amount = "المبلغ يجب أن يكون أكبر من صفر";
    }
    if (!form.expenseDate) {
      next.expenseDate = "التاريخ مطلوب";
    }
    if (form.isRecurring && !form.recurringPeriod) {
      next.recurringPeriod = "يجب تحديد دورية التكرار";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    const body: ExpenseInput = {
      category: form.category,
      amount: Number(form.amount),
      expenseDate: form.expenseDate,
      description: form.description || undefined,
      isRecurring: form.isRecurring,
      recurringPeriod: form.isRecurring && form.recurringPeriod
        ? (form.recurringPeriod as "monthly" | "weekly" | "yearly")
        : undefined,
    };
    if (editingId) {
      const reason = window.prompt("سبب تعديل هذا المصروف؟ (مطلوب للسجل المالي)");
      if (reason === null) return;
      if (reason.trim().length < 3) {
        toast({ title: "سبب التعديل مطلوب (3 أحرف على الأقل)", variant: "destructive" });
        return;
      }
      editMutation.mutate({ id: editingId, body: { ...body, reason: reason.trim() } });
    } else {
      addMutation.mutate(body);
    }
  }

  function handleDelete(expense: ExpenseResponse) {
    const reason = window.prompt("سبب حذف هذا المصروف؟ (مطلوب للسجل المالي)");
    if (reason === null) return;
    if (reason.trim().length < 3) {
      toast({ title: "سبب الحذف مطلوب (3 أحرف على الأقل)", variant: "destructive" });
      return;
    }
    deleteMutation.mutate({ id: expense.id, reason: reason.trim() });
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Summary bar */}
      <div style={S.card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: data?.byCategory && data.byCategory.filter(c => c.total > 0).length > 0 ? 12 : 0 }}>
          <div style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 700 }}>
            {isLoading
              ? "جاري التحميل..."
              : data
              ? `إجمالي المصاريف: ${fmt(data.totalExpenses)}`
              : ""}
          </div>
          <button style={S.btnPrimary} onClick={openAdd}>
            إضافة مصروف
          </button>
        </div>
        {data && data.byCategory && data.byCategory.filter(c => c.total > 0).length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {data.byCategory
              .filter(c => c.total > 0)
              .map(c => (
                <span
                  key={c.category}
                  style={{
                    background: "#010611",
                    border: "1px solid #1e3a5f",
                    borderRadius: 6,
                    padding: "3px 10px",
                    fontSize: 11,
                    color: "#94a3b8",
                  }}
                >
                  {EXPENSE_CATEGORY_LABELS[c.category as keyof typeof EXPENSE_CATEGORY_LABELS] ?? c.category}
                  {": "}
                  {fmt(c.total)}
                </span>
              ))}
          </div>
        )}
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <div style={S.card}>
          <div style={{ color: "#199bb8", fontSize: 13, fontWeight: 700, marginBottom: 16 }}>
            {editingId ? "تعديل المصروف" : "إضافة مصروف جديد"}
          </div>

          <form onSubmit={e => { e.preventDefault(); handleSubmit(); }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
              {/* Category */}
              <div>
                <label style={S.label}>الفئة</label>
                <select
                  style={S.select}
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value as ExpenseInput["category"] }))}
                >
                  {EXPENSE_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>
                      {EXPENSE_CATEGORY_LABELS[cat]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label style={S.label}>المبلغ (د.ع)</label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  style={S.input}
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0"
                />
                {errors.amount && <div style={S.errorText}>{errors.amount}</div>}
              </div>

              {/* Date */}
              <div>
                <label style={S.label}>التاريخ</label>
                <input
                  type="date"
                  style={S.input}
                  value={form.expenseDate}
                  onChange={e => setForm(f => ({ ...f, expenseDate: e.target.value }))}
                />
                {errors.expenseDate && <div style={S.errorText}>{errors.expenseDate}</div>}
              </div>

              {/* Description */}
              <div>
                <label style={S.label}>الوصف (اختياري)</label>
                <input
                  type="text"
                  style={S.input}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
            </div>

            {/* Is Recurring */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14 }}>
              <input
                type="checkbox"
                id="isRecurring"
                checked={form.isRecurring}
                onChange={e => setForm(f => ({ ...f, isRecurring: e.target.checked, recurringPeriod: e.target.checked ? f.recurringPeriod : "" }))}
                style={{ accentColor: "#199bb8", width: 14, height: 14 }}
              />
              <label htmlFor="isRecurring" style={{ color: "#94a3b8", fontSize: 12, cursor: "pointer" }}>
                مصروف متكرر
              </label>
            </div>

            {/* Recurring period */}
            {form.isRecurring && (
              <div style={{ marginTop: 12, maxWidth: 220 }}>
                <label style={S.label}>دورية التكرار</label>
                <select
                  style={S.select}
                  value={form.recurringPeriod}
                  onChange={e => setForm(f => ({ ...f, recurringPeriod: e.target.value as FormState["recurringPeriod"] }))}
                >
                  <option value="">-- اختر --</option>
                  <option value="weekly">أسبوعي</option>
                  <option value="monthly">شهري</option>
                  <option value="yearly">سنوي</option>
                </select>
                {errors.recurringPeriod && <div style={S.errorText}>{errors.recurringPeriod}</div>}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
              <button
                type="submit"
                style={S.btnPrimary}
                disabled={addMutation.isPending || editMutation.isPending}
              >
                {addMutation.isPending || editMutation.isPending ? "جاري الحفظ..." : "حفظ"}
              </button>
              <button type="button" style={S.btnSecondary} onClick={closeForm}>
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Loading / Error / Empty */}
      {isLoading && !data && (
        <div style={{ color: "#94a3b8", fontSize: 13, padding: "16px 0" }}>
          جاري التحميل...
        </div>
      )}
      {error && (
        <div style={{ color: "#ef4444", fontSize: 13, padding: "12px 16px", background: "#1a0d0d", border: "1px solid #ef444440", borderRadius: 8, marginBottom: 16 }}>
          {errMsg(error)}
        </div>
      )}

      {/* Expense list */}
      {data && (
        <>
          {data.list.length === 0 ? (
            <div style={{ color: "#94a3b8", fontSize: 13, padding: 24, textAlign: "center" }}>
              لا توجد مصاريف في هذه الفترة
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={S.th}>التاريخ</th>
                    <th style={S.th}>الفئة</th>
                    <th style={S.th}>المبلغ</th>
                    <th style={S.th}>الوصف</th>
                    <th style={S.th}>متكرر</th>
                    <th style={S.th}>الدورية</th>
                    <th style={{ ...S.th, textAlign: "center" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {data.list.map(expense => (
                    <tr key={expense.id}>
                      <td style={S.td}>
                        {new Date(expense.expenseDate).toLocaleDateString("ar-IQ", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td style={S.td}>
                        <span
                          style={{
                            background: "#010611",
                            border: "1px solid #1e3a5f",
                            borderRadius: 5,
                            padding: "2px 8px",
                            fontSize: 11,
                            color: "#94a3b8",
                          }}
                        >
                          {EXPENSE_CATEGORY_LABELS[expense.category as keyof typeof EXPENSE_CATEGORY_LABELS] ?? expense.category}
                        </span>
                      </td>
                      <td style={{ ...S.td, color: "#fca5a5", fontWeight: 600 }}>
                        {fmt(expense.amount)}
                      </td>
                      <td style={{ ...S.td, color: "#64748b", maxWidth: 200 }}>
                        {expense.description ?? "—"}
                      </td>
                      <td style={{ ...S.td, textAlign: "center" }}>
                        {expense.isRecurring ? (
                          <span style={{ color: "#199bb8", fontSize: 11 }}>نعم</span>
                        ) : (
                          <span style={{ color: "#1e3a5f", fontSize: 11 }}>لا</span>
                        )}
                      </td>
                      <td style={S.td}>
                        {expense.recurringPeriod
                          ? (RECURRING_LABELS[expense.recurringPeriod] ?? expense.recurringPeriod)
                          : "—"}
                      </td>
                      <td style={{ ...S.td, textAlign: "center" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                          <button
                            style={{
                              background: "transparent",
                              color: "#199bb8",
                              border: "1px solid #199bb840",
                              borderRadius: 8,
                              padding: "4px 10px",
                              cursor: "pointer",
                              fontSize: 12,
                            }}
                            onClick={() => openEdit(expense)}
                            title="تعديل"
                          >
                            تعديل
                          </button>
                          <button
                            style={S.btnDanger}
                            onClick={() => handleDelete(expense)}
                            disabled={deleteMutation.isPending}
                            title="حذف"
                          >
                            حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
