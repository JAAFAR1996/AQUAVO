import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { addCsrfHeader } from "@/lib/csrf";
import {
  ORDER_RETURN_EVENT_TYPES,
  ORDER_RETURN_EVENT_STATUSES,
  type OrderReturnEventStatus,
  type OrderReturnEventType,
} from "@shared/accounting";

// ── Local types ────────────────────────────────────────────────────────────────

interface ReturnEventEnriched {
  id: string;
  orderId: string;
  orderNumber: string | null;
  orderStatus: string | null;
  orderCreatedAt: string | null;
  orderRoundedTotal: number | null;
  orderShippingCost: number | null;
  orderBoxCost: number | null;
  type: OrderReturnEventType;
  reason: string | null;
  refundAmount: number;
  deliveryCostLoss: number;
  returnShippingCost: number;
  packagingLoss: number;
  productWriteOffAmount: number;
  cogsLoss: number;
  restocked: boolean;
  restockedAt: string | null;
  affectedItems: unknown;
  status: OrderReturnEventStatus;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ReturnEventsSummary {
  totalEvents: number;
  recordedEvents: number;
  verifiedEvents: number;
  disputedEvents: number;
  totalRefundAmount: number;
  totalDeliveryCostLoss: number;
  totalReturnShippingCost: number;
  totalPackagingLoss: number;
  totalProductWriteOffAmount: number;
  totalCogsLoss: number;
  totalFinancialImpactAll: number;
  totalFinancialImpactVerified: number;
}

interface ReturnEventsApiResponse {
  success: boolean;
  data: ReturnEventEnriched[];
  summary: ReturnEventsSummary;
}

// ── Labels ────────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<OrderReturnEventType, string> = {
  rejected_delivery: "رفض عند التوصيل",
  failed_delivery: "فشل التوصيل",
  customer_return: "إرجاع من الزبون",
  cancelled_before_shipping: "إلغاء قبل الشحن",
  cancelled_after_shipping: "إلغاء بعد الشحن",
  damaged_return: "راجع تالف",
  partial_return: "إرجاع جزئي",
  lost_package: "طرد ضائع",
};

const STATUS_LABELS: Record<OrderReturnEventStatus, string> = {
  recorded: "قيد المراجعة",
  verified: "معتمدة",
  disputed: "مستبعدة",
};

const STATUS_COLORS: Record<OrderReturnEventStatus, string> = {
  recorded: "#f59e0b",
  verified: "#22c55e",
  disputed: "#6b7280",
};

const PERIOD_OPTIONS = [
  { value: "all", label: "الكل" },
  { value: "day", label: "اليوم" },
  { value: "week", label: "الأسبوع" },
  { value: "month", label: "الشهر" },
  { value: "year", label: "السنة" },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtIqd = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n) + " د.ع";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ar-IQ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function eventActualReturnLoss(e: ReturnEventEnriched): number {
  const opLoss = e.deliveryCostLoss + e.returnShippingCost + e.packagingLoss;
  const writeOff = e.productWriteOffAmount;
  const productCost = e.restocked !== true ? e.cogsLoss : 0;
  return opLoss + writeOff + productCost;
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "خطأ غير معروف";
}

// ── Styles ────────────────────────────────────────────────────────────────────

const S = {
  input: {
    background: "#010611",
    border: "1px solid #1e3a5f",
    color: "#e2e8f0",
    borderRadius: 8,
    padding: "6px 10px",
    fontSize: 13,
    boxSizing: "border-box" as const,
  } as React.CSSProperties,
  inputErr: {
    background: "#010611",
    border: "1px solid #ef4444",
    color: "#e2e8f0",
    borderRadius: 8,
    padding: "6px 10px",
    fontSize: 13,
    boxSizing: "border-box" as const,
  } as React.CSSProperties,
  label: {
    color: "#94a3b8",
    fontSize: 11,
    marginBottom: 4,
    display: "block",
  } as React.CSSProperties,
  errText: { color: "#ef4444", fontSize: 11, marginTop: 2 } as React.CSSProperties,
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
    padding: "8px 10px",
    fontSize: 12,
    color: "#e2e8f0",
    borderBottom: "1px solid #0a1628",
    verticalAlign: "top" as const,
    whiteSpace: "nowrap" as const,
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
  btnGhost: {
    background: "#0d1f3c",
    color: "#94a3b8",
    border: "1px solid #1e3a5f",
    borderRadius: 8,
    padding: "7px 18px",
    cursor: "pointer",
    fontSize: 13,
  } as React.CSSProperties,
  btnDisabled: {
    background: "#1e3a5f",
    color: "#475569",
    border: "none",
    borderRadius: 8,
    padding: "7px 18px",
    cursor: "not-allowed",
    fontSize: 13,
    fontWeight: 600,
  } as React.CSSProperties,
  overlay: {
    position: "fixed" as const,
    inset: 0,
    background: "rgba(0,0,0,0.75)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  } as React.CSSProperties,
  modal: {
    background: "#0d1f3c",
    border: "1px solid #1e3a5f",
    borderRadius: 12,
    padding: 24,
    width: 520,
    maxWidth: "92vw",
    maxHeight: "90vh",
    overflowY: "auto" as const,
  } as React.CSSProperties,
  modalSm: {
    background: "#0d1f3c",
    border: "1px solid #1e3a5f",
    borderRadius: 12,
    padding: 24,
    width: 380,
    maxWidth: "92vw",
  } as React.CSSProperties,
};

// ── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, color = "#199bb8", sub,
}: {
  label: string; value: string | number; color?: string; sub?: string;
}) {
  return (
    <div style={{
      background: "#0d1f3c",
      border: `1px solid ${color}30`,
      borderRadius: 12,
      padding: "14px 16px",
    }}>
      <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 4 }}>{label}</div>
      <div style={{ color, fontSize: 18, fontWeight: 700, lineHeight: 1.2 }}>{value}</div>
      {sub && <div style={{ color: "#64748b", fontSize: 11, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

// ── Create form types + validation ────────────────────────────────────────────

interface CreateForm {
  orderId: string;
  type: OrderReturnEventType | "";
  reason: string;
  refundAmount: string;
  deliveryCostLoss: string;
  returnShippingCost: string;
  packagingLoss: string;
  productWriteOffAmount: string;
  cogsLoss: string;
  restocked: boolean;
  note: string;
}

const MONEY_FIELDS = [
  "refundAmount",
  "deliveryCostLoss",
  "returnShippingCost",
  "packagingLoss",
  "productWriteOffAmount",
  "cogsLoss",
] as const;
type MoneyField = (typeof MONEY_FIELDS)[number];

const MONEY_LABELS: Record<MoneyField, string> = {
  refundAmount: "مبلغ الاسترداد",
  deliveryCostLoss: "خسارة رسوم التوصيل",
  returnShippingCost: "تكلفة شحن الإرجاع",
  packagingLoss: "خسارة التغليف",
  productWriteOffAmount: "شطب المنتج",
  cogsLoss: "خسارة COGS",
};

const defaultCreateForm: CreateForm = {
  orderId: "",
  type: "",
  reason: "",
  refundAmount: "0",
  deliveryCostLoss: "0",
  returnShippingCost: "0",
  packagingLoss: "0",
  productWriteOffAmount: "0",
  cogsLoss: "0",
  restocked: false,
  note: "",
};

function validateCreate(f: CreateForm): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!f.orderId.trim()) errors.orderId = "رقم / معرّف الطلب مطلوب";
  if (!f.type) errors.type = "نوع الحدث مطلوب";
  for (const key of MONEY_FIELDS) {
    const v = Number(f[key]);
    if (f[key] === "" || isNaN(v) || v < 0) errors[key] = "يجب أن تكون >= 0";
  }
  return errors;
}

// ── Status modal state ────────────────────────────────────────────────────────

interface StatusModalState {
  id: string;
  fromStatus: OrderReturnEventStatus;
  toStatus: OrderReturnEventStatus;
  note: string;
}

// ── Main component ────────────────────────────────────────────────────────────

export function FinanceReturnEvents() {
  const { toast } = useToast();
  const qc = useQueryClient();

  // Filters
  const [period, setPeriod] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(defaultCreateForm);
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});

  // Status change modal
  const [statusModal, setStatusModal] = useState<StatusModalState | null>(null);

  // ── Data query ──────────────────────────────────────────────────────────────

  const { data, isLoading, error } = useQuery<ReturnEventsApiResponse>({
    queryKey: ["return-events", period, typeFilter, statusFilter, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (period !== "all") params.set("period", period);
      if (typeFilter) params.set("type", typeFilter);
      if (statusFilter) params.set("status", statusFilter);
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/admin/accounting/return-events?${params}`, {
        credentials: "include",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.message ?? `خطأ ${res.status}`);
      return json as ReturnEventsApiResponse;
    },
    staleTime: 30_000,
  });

  const events = data?.data ?? [];
  const summary = data?.summary;

  // All-time count — used only to improve empty-state message when a period filter is active
  const { data: allTimeData } = useQuery<ReturnEventsApiResponse>({
    queryKey: ["return-events-alltime"],
    queryFn: async () => {
      const res = await fetch("/api/admin/accounting/return-events", { credentials: "include" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.message ?? `خطأ ${res.status}`);
      return json as ReturnEventsApiResponse;
    },
    staleTime: 60_000,
    enabled: period !== "all",
  });
  const allTimeTotal = allTimeData?.summary?.totalEvents ?? 0;

  // ── Create mutation ─────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch("/api/admin/accounting/return-events", {
        method: "POST",
        credentials: "include",
        headers: addCsrfHeader({ "Content-Type": "application/json" }),
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.message ?? `خطأ ${res.status}`);
      return json;
    },
    onSuccess: () => {
      toast({ title: "تم تسجيل الحدث", description: "تم حفظ حدث الإرجاع / الخسارة بنجاح" });
      qc.invalidateQueries({ queryKey: ["return-events"] });
      setShowCreate(false);
      setCreateForm(defaultCreateForm);
      setCreateErrors({});
    },
    onError: (e) => {
      toast({ title: "خطأ في الحفظ", description: errMsg(e), variant: "destructive" });
    },
  });

  // ── Status change mutation ──────────────────────────────────────────────────

  const statusMutation = useMutation({
    mutationFn: async ({ id, status, note }: { id: string; status: string; note?: string }) => {
      const body: Record<string, string> = { status };
      if (note?.trim()) body.note = note.trim();
      const res = await fetch(`/api/admin/accounting/return-events/${id}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: addCsrfHeader({ "Content-Type": "application/json" }),
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.message ?? `خطأ ${res.status}`);
      return json;
    },
    onSuccess: (_, vars) => {
      toast({
        title: "تم تحديث الحالة",
        description: `الحالة الجديدة: ${STATUS_LABELS[vars.status as OrderReturnEventStatus] ?? vars.status}`,
      });
      qc.invalidateQueries({ queryKey: ["return-events"] });
      setStatusModal(null);
    },
    onError: (e) => {
      toast({ title: "خطأ في تحديث الحالة", description: errMsg(e), variant: "destructive" });
    },
  });

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleCreateFieldChange(key: keyof CreateForm, value: string | boolean) {
    setCreateForm((prev) => ({ ...prev, [key]: value }));
    if (typeof value === "string" && createErrors[key]) {
      setCreateErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  function handleCreateSubmit() {
    const errors = validateCreate(createForm);
    if (Object.keys(errors).length > 0) {
      setCreateErrors(errors);
      return;
    }
    createMutation.mutate({
      orderId: createForm.orderId.trim(),
      type: createForm.type,
      reason: createForm.reason.trim() || undefined,
      refundAmount: Number(createForm.refundAmount),
      deliveryCostLoss: Number(createForm.deliveryCostLoss),
      returnShippingCost: Number(createForm.returnShippingCost),
      packagingLoss: Number(createForm.packagingLoss),
      productWriteOffAmount: Number(createForm.productWriteOffAmount),
      cogsLoss: Number(createForm.cogsLoss),
      restocked: createForm.restocked,
      note: createForm.note.trim() || undefined,
    });
  }

  function handleStatusSelectChange(
    id: string,
    fromStatus: OrderReturnEventStatus,
    toStatus: OrderReturnEventStatus,
  ) {
    if (toStatus === fromStatus) return;
    setStatusModal({ id, fromStatus, toStatus, note: "" });
  }

  function handleStatusConfirm() {
    if (!statusModal) return;
    statusMutation.mutate({
      id: statusModal.id,
      status: statusModal.toStatus,
      note: statusModal.note || undefined,
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div dir="rtl">

      {/* ── Safety warning ── */}
      <div style={{
        background: "#1a130d",
        border: "1px solid #f59e0b40",
        color: "#fde68a",
        padding: "10px 16px",
        borderRadius: 10,
        fontSize: 12,
        lineHeight: 1.7,
        marginBottom: 8,
      }}>
        <strong>تنبيه:</strong> هذا التبويب يسجّل الأثر المالي للراجعات والرفض.
        لا يغيّر الطلبات ولا المخزون تلقائياً.
        <br />
        <strong>مهم:</strong> فقط الأحداث بحالة <span style={{ color: "#22c55e", fontWeight: 700 }}>معتمدة (verified)</span> تدخل في الحسابات المالية المعتمدة.
      </div>

      {/* ── Stock update warning (persistent) ── */}
      <div style={{
        background: "#0a0a1a",
        border: "1px solid #3b82f660",
        color: "#93c5fd",
        padding: "9px 14px",
        borderRadius: 8,
        fontSize: 11,
        lineHeight: 1.7,
        marginBottom: 16,
      }}>
        <strong>تذكير المخزون:</strong> تسجيل الراجع <strong>لا يحدّث المخزون تلقائياً</strong>.
        إذا رجعت البضاعة صالحة للبيع، يجب تحديث كمية المخزون يدوياً من صفحة المنتجات.
        الأحداث التي عمود "للمخزن" فيها <span style={{ color: "#64748b", fontWeight: 700 }}>لا</span> تحتاج مراجعة يدوية.
      </div>

      {/* ── Summary cards ── */}
      {summary && (
        <>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 10,
            marginBottom: 12,
          }}>
            <KpiCard label="إجمالي الأحداث" value={summary.totalEvents} color="#199bb8" />
            <KpiCard label="قيد المراجعة" value={summary.recordedEvents} color="#f59e0b" />
            <KpiCard label="معتمدة" value={summary.verifiedEvents} color="#22c55e" />
            <KpiCard label="مستبعدة" value={summary.disputedEvents} color="#6b7280" />
            <KpiCard
              label="إجمالي الأثر المالي (الكل)"
              value={fmtIqd(summary.totalFinancialImpactAll)}
              color="#ef4444"
              sub="يشمل جميع الحالات"
            />
            <KpiCard
              label="الأثر المالي المعتمد فقط"
              value={fmtIqd(summary.totalFinancialImpactVerified)}
              color="#22c55e"
              sub="verified فقط — يدخل بالحسابات"
            />
          </div>

          {/* Verified-only notice */}
          <div style={{
            background: "#0a1628",
            border: "1px solid #22c55e30",
            color: "#86efac",
            padding: "8px 14px",
            borderRadius: 8,
            fontSize: 12,
            marginBottom: 16,
          }}>
            فقط الأحداث بحالة "معتمدة" ستدخل في تقارير الربحية والخسائر المستقبلية
          </div>
        </>
      )}

      {/* ── Filters + create button ── */}
      <div style={{
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        marginBottom: 16,
        alignItems: "flex-end",
      }}>
        {/* Period */}
        <div>
          <label style={S.label}>الفترة</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            style={{ ...S.input, minWidth: 100 }}
          >
            {PERIOD_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div>
          <label style={S.label}>الحالة</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ ...S.input, minWidth: 120 }}
          >
            <option value="">الكل</option>
            {ORDER_RETURN_EVENT_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>

        {/* Type */}
        <div>
          <label style={S.label}>النوع</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ ...S.input, minWidth: 160 }}
          >
            <option value="">الكل</option>
            {ORDER_RETURN_EVENT_TYPES.map((t) => (
              <option key={t} value={t}>{TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div>
          <label style={S.label}>بحث بالطلب</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="رقم الطلب أو ID..."
            style={{ ...S.input, minWidth: 180 }}
          />
        </div>

        {/* Create button */}
        <div style={{ marginRight: "auto" }}>
          <button
            onClick={() => setShowCreate(true)}
            style={{ ...S.btnPrimary, marginTop: 16 }}
          >
            + تسجيل خسارة / راجع
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      {isLoading && (
        <div style={{ color: "#94a3b8", fontSize: 13, padding: "20px 0", textAlign: "center" }}>
          جاري التحميل...
        </div>
      )}

      {error && (
        <div style={{ color: "#ef4444", fontSize: 13, padding: "12px 16px", background: "#1a0d0d", borderRadius: 8, marginBottom: 12 }}>
          خطأ في التحميل: {errMsg(error)}
        </div>
      )}

      {!isLoading && !error && events.length === 0 && (
        <div style={{
          padding: "32px 24px",
          textAlign: "center",
          background: "#0d1f3c",
          borderRadius: 10,
          border: "1px solid #1e3a5f",
        }}>
          {period !== "all" && allTimeTotal > 0 ? (
            <>
              <div style={{ color: "#f59e0b", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                لا توجد مرتجعات ضمن الفترة الحالية
              </div>
              <div style={{ color: "#94a3b8", fontSize: 12 }}>
                لكن توجد {allTimeTotal} حدث مسجّل كل الوقت — غيّر الفترة إلى "الكل" لعرضها
              </div>
            </>
          ) : (
            <div style={{ color: "#64748b", fontSize: 13 }}>
              لا توجد أحداث إرجاع / خسائر مسجّلة
            </div>
          )}
        </div>
      )}

      {!isLoading && events.length > 0 && (
        <div style={{ overflowX: "auto", background: "#0d1f3c", borderRadius: 10, border: "1px solid #1e3a5f" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={S.th}>رقم الطلب</th>
                <th style={S.th}>حالة الطلب</th>
                <th style={S.th}>النوع</th>
                <th style={S.th}>الحالة</th>
                <th style={S.th}>السبب</th>
                <th style={S.th}>استرداد</th>
                <th style={S.th}>خسارة توصيل</th>
                <th style={S.th}>شحن إرجاع</th>
                <th style={S.th}>خسارة تغليف</th>
                <th style={S.th}>شطب منتج</th>
                <th style={S.th}>COGS</th>
                <th style={{ ...S.th, color: "#f97316" }}>خصم تسوية COD</th>
                <th style={{ ...S.th, color: "#ef4444" }}>خسارة فعلية</th>
                <th style={S.th}>للمخزن</th>
                <th style={S.th}>تاريخ التسجيل</th>
                <th style={S.th}>ملاحظة</th>
                <th style={S.th}>تغيير الحالة</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => {
                const actualLoss = eventActualReturnLoss(e);
                return (
                  <tr key={e.id} style={{ background: e.status === "disputed" ? "#0d0d0d" : undefined }}>
                    <td style={S.td}>
                      <span style={{ fontFamily: "monospace", fontSize: 11 }}>
                        {e.orderNumber ?? e.orderId.slice(0, 10) + "…"}
                      </span>
                    </td>
                    <td style={S.td}>
                      <span style={{ color: "#94a3b8" }}>{e.orderStatus ?? "—"}</span>
                    </td>
                    <td style={S.td}>{TYPE_LABELS[e.type] ?? e.type}</td>
                    <td style={S.td}>
                      <span style={{
                        color: STATUS_COLORS[e.status],
                        fontWeight: 700,
                        fontSize: 11,
                        background: `${STATUS_COLORS[e.status]}18`,
                        padding: "2px 8px",
                        borderRadius: 6,
                        border: `1px solid ${STATUS_COLORS[e.status]}40`,
                      }}>
                        {STATUS_LABELS[e.status]}
                      </span>
                    </td>
                    <td style={{ ...S.td, maxWidth: 180, whiteSpace: "normal", color: "#94a3b8" }}>
                      {e.reason ?? "—"}
                    </td>
                    <td style={S.td}>{e.deliveryCostLoss > 0 ? fmtIqd(e.deliveryCostLoss) : "—"}</td>
                    <td style={S.td}>{e.returnShippingCost > 0 ? fmtIqd(e.returnShippingCost) : "—"}</td>
                    <td style={S.td}>{e.packagingLoss > 0 ? fmtIqd(e.packagingLoss) : "—"}</td>
                    <td style={S.td}>{e.productWriteOffAmount > 0 ? fmtIqd(e.productWriteOffAmount) : "—"}</td>
                    <td style={S.td}>
                      {e.cogsLoss > 0 ? (
                        <span style={{ color: e.restocked ? "#64748b" : "#ef4444" }}>
                          {fmtIqd(e.cogsLoss)}{e.restocked ? " (متجاهل)" : ""}
                        </span>
                      ) : "—"}
                    </td>
                    <td style={{ ...S.td, color: e.refundAmount > 0 ? "#f97316" : "#64748b", fontWeight: 700 }}>
                      {e.refundAmount > 0 ? fmtIqd(e.refundAmount) : "—"}
                    </td>
                    <td style={{ ...S.td, color: actualLoss > 0 ? "#ef4444" : "#64748b", fontWeight: 700 }}>
                      {actualLoss > 0 ? fmtIqd(actualLoss) : "—"}
                    </td>
                    <td style={S.td}>
                      {e.restocked ? (
                        <span style={{ color: "#22c55e" }}>نعم</span>
                      ) : (
                        <span style={{
                          color: "#f59e0b",
                          fontWeight: 700,
                          fontSize: 10,
                          background: "#f59e0b18",
                          border: "1px solid #f59e0b40",
                          padding: "1px 6px",
                          borderRadius: 4,
                        }}>
                          لا — راجع يدوياً
                        </span>
                      )}
                    </td>
                    <td style={S.td}>{fmtDate(e.createdAt)}</td>
                    <td style={{ ...S.td, maxWidth: 160, whiteSpace: "normal", color: "#94a3b8" }}>
                      {e.note ?? "—"}
                    </td>
                    <td style={S.td}>
                      <select
                        value={e.status}
                        onChange={(ev) =>
                          handleStatusSelectChange(
                            e.id,
                            e.status,
                            ev.target.value as OrderReturnEventStatus,
                          )
                        }
                        style={{
                          background: "#010611",
                          border: `1px solid ${STATUS_COLORS[e.status]}60`,
                          color: STATUS_COLORS[e.status],
                          borderRadius: 6,
                          padding: "4px 8px",
                          fontSize: 11,
                          cursor: "pointer",
                        }}
                      >
                        {ORDER_RETURN_EVENT_STATUSES.map((s) => (
                          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Create event modal ── */}
      {showCreate && (
        <div style={S.overlay}>
          <div style={S.modal} dir="rtl">
            <h3 style={{ color: "#fff", fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
              تسجيل خسارة / راجع
            </h3>
            <p style={{ color: "#64748b", fontSize: 11, marginBottom: 20 }}>
              الحدث يُسجَّل بحالة "قيد المراجعة" ولا يؤثر على الطلب أو المخزون
            </p>

            {/* orderId */}
            <div style={{ marginBottom: 12 }}>
              <label style={S.label}>رقم الطلب أو معرّفه *</label>
              <input
                type="text"
                value={createForm.orderId}
                onChange={(e) => handleCreateFieldChange("orderId", e.target.value)}
                placeholder="مثال: FH-260512-0001 أو UUID..."
                style={createErrors.orderId ? S.inputErr : { ...S.input, width: "100%" }}
              />
              {createErrors.orderId && <div style={S.errText}>{createErrors.orderId}</div>}
              <div style={{ color: "#64748b", fontSize: 11, marginTop: 4 }}>
                اكتب رقم الطلب مثل FH-260512-0001 أو اختر الطلب من صفحة الطلبات
              </div>
            </div>

            {/* type */}
            <div style={{ marginBottom: 12 }}>
              <label style={S.label}>نوع الحدث *</label>
              <select
                value={createForm.type}
                onChange={(e) => handleCreateFieldChange("type", e.target.value)}
                style={{
                  ...(createErrors.type ? S.inputErr : S.input),
                  width: "100%",
                }}
              >
                <option value="">اختر النوع...</option>
                {ORDER_RETURN_EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                ))}
              </select>
              {createErrors.type && <div style={S.errText}>{createErrors.type}</div>}
            </div>

            {/* reason */}
            <div style={{ marginBottom: 12 }}>
              <label style={S.label}>السبب (اختياري)</label>
              <textarea
                value={createForm.reason}
                onChange={(e) => handleCreateFieldChange("reason", e.target.value)}
                rows={2}
                placeholder="وصف مختصر للسبب..."
                style={{ ...S.input, width: "100%", resize: "vertical" }}
              />
            </div>

            {/* Money fields grid */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              marginBottom: 12,
            }}>
              {MONEY_FIELDS.map((key) => (
                <div key={key}>
                  <label style={S.label}>{MONEY_LABELS[key]} (د.ع)</label>
                  <input
                    type="number"
                    min={0}
                    value={createForm[key]}
                    onChange={(e) => handleCreateFieldChange(key, e.target.value)}
                    style={createErrors[key] ? S.inputErr : { ...S.input, width: "100%" }}
                  />
                  {createErrors[key] && <div style={S.errText}>{createErrors[key]}</div>}
                </div>
              ))}
            </div>

            {/* restocked */}
            <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                id="create-restocked"
                checked={createForm.restocked}
                onChange={(e) => handleCreateFieldChange("restocked", e.target.checked)}
                style={{ width: 16, height: 16, cursor: "pointer" }}
              />
              <label htmlFor="create-restocked" style={{ ...S.label, marginBottom: 0, cursor: "pointer" }}>
                تم إرجاع المنتج للمخزن
              </label>
            </div>

            {/* note */}
            <div style={{ marginBottom: 16 }}>
              <label style={S.label}>ملاحظة (اختياري)</label>
              <textarea
                value={createForm.note}
                onChange={(e) => handleCreateFieldChange("note", e.target.value)}
                rows={2}
                placeholder="ملاحظات إضافية..."
                style={{ ...S.input, width: "100%", resize: "vertical" }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={() => {
                  setShowCreate(false);
                  setCreateForm(defaultCreateForm);
                  setCreateErrors({});
                }}
                style={S.btnGhost}
              >
                إلغاء
              </button>
              <button
                onClick={handleCreateSubmit}
                disabled={createMutation.isPending}
                style={createMutation.isPending ? S.btnDisabled : S.btnPrimary}
              >
                {createMutation.isPending ? "جاري الحفظ..." : "حفظ الحدث"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Status change modal ── */}
      {statusModal && (
        <div style={S.overlay}>
          <div style={S.modalSm} dir="rtl">
            {statusModal.toStatus === "verified" ? (
              <>
                <h3 style={{ color: "#22c55e", fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
                  تأكيد الاعتماد
                </h3>
                <p style={{ color: "#fde68a", fontSize: 13, lineHeight: 1.7, marginBottom: 20, background: "#1a1a0d", border: "1px solid #f59e0b40", borderRadius: 8, padding: "10px 14px" }}>
                  تأكيد: هذا الحدث راح يدخل بالتقارير المالية المعتمدة
                  <br />
                  <span style={{ color: "#94a3b8", fontSize: 11 }}>
                    الأثر المالي له سيُحتسب ضمن الخسائر الفعلية المعتمدة
                  </span>
                </p>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button onClick={() => setStatusModal(null)} style={S.btnGhost}>إلغاء</button>
                  <button
                    onClick={handleStatusConfirm}
                    disabled={statusMutation.isPending}
                    style={{ ...S.btnPrimary, background: "#22c55e" }}
                  >
                    {statusMutation.isPending ? "جاري..." : "نعم، اعتماد"}
                  </button>
                </div>
              </>
            ) : statusModal.toStatus === "disputed" ? (
              <>
                <h3 style={{ color: "#6b7280", fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
                  استبعاد الحدث
                </h3>
                <p style={{ color: "#94a3b8", fontSize: 12, marginBottom: 12 }}>
                  الحدث المستبعد لن يدخل في الحسابات المالية.
                </p>
                <div style={{ marginBottom: 16 }}>
                  <label style={S.label}>سبب الاستبعاد (اختياري)</label>
                  <textarea
                    value={statusModal.note}
                    onChange={(e) =>
                      setStatusModal((prev) => prev ? { ...prev, note: e.target.value } : null)
                    }
                    rows={2}
                    placeholder="مثلاً: اختبار فقط، بيانات غلط، مكرر..."
                    style={{ ...S.input, width: "100%", resize: "vertical" }}
                  />
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button onClick={() => setStatusModal(null)} style={S.btnGhost}>إلغاء</button>
                  <button
                    onClick={handleStatusConfirm}
                    disabled={statusMutation.isPending}
                    style={{ ...S.btnPrimary, background: "#6b7280" }}
                  >
                    {statusMutation.isPending ? "جاري..." : "استبعاد"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 style={{ color: "#f59e0b", fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
                  رجوع لقيد المراجعة
                </h3>
                <p style={{ color: "#94a3b8", fontSize: 12, marginBottom: 20 }}>
                  الحدث سيكون بحالة "قيد المراجعة" ولن يدخل الحسابات حتى يُعتمد.
                </p>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button onClick={() => setStatusModal(null)} style={S.btnGhost}>إلغاء</button>
                  <button
                    onClick={handleStatusConfirm}
                    disabled={statusMutation.isPending}
                    style={{ ...S.btnPrimary, background: "#f59e0b" }}
                  >
                    {statusMutation.isPending ? "جاري..." : "تأكيد"}
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
