import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, ChevronDown, ChevronUp, RotateCcw, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { addCsrfHeader } from "@/lib/csrf";
import {
  ORDER_RETURN_EVENT_TYPES,
  type OrderReturnEventType,
  type OrderReturnEventInput,
} from "@shared/accounting";

interface OrderItem {
  id?: string;
  orderItemId?: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  variantId?: string;
  variantLabel?: string;
}

interface Order {
  id: string;
  orderNumber?: string;
  customerName?: string;
  items: OrderItem[];
  total: number;
  totalAmount?: number;
  roundedTotal?: number;
  shippingCost?: number;
  status: string;
  createdAt: string;
}

interface Props {
  order: Order;
  open: boolean;
  onClose: () => void;
}

interface ItemState {
  qty: number;
  restocked: boolean;
  damaged: boolean;
  reason: string;
}

interface ExistingEvent {
  id: string;
  type: OrderReturnEventType;
  status: string;
  note: string | null;
  reason: string | null;
  refundAmount: number;
  deliveryCostLoss: number;
  returnShippingCost: number;
  packagingLoss: number;
  productWriteOffAmount: number;
  cogsLoss: number;
  createdAt: string;
}

const SCENARIO_META: Record<OrderReturnEventType, { label: string; deliveryCostLost: boolean; suggestRestocked: boolean }> = {
  rejected_delivery:         { label: "رفض الاستلام",              deliveryCostLost: true,  suggestRestocked: true  },
  partial_return:            { label: "راجع جزئي",                 deliveryCostLost: false, suggestRestocked: true  },
  customer_return:           { label: "استرجاع كامل",              deliveryCostLost: false, suggestRestocked: true  },
  damaged_return:            { label: "منتج تالف",                 deliveryCostLost: false, suggestRestocked: false },
  cancelled_before_shipping: { label: "إلغاء قبل الشحن",           deliveryCostLost: false, suggestRestocked: true  },
  failed_delivery:           { label: "فشل التوصيل",              deliveryCostLost: true,  suggestRestocked: true  },
  cancelled_after_shipping:  { label: "إلغاء بعد إرسال الشحن",    deliveryCostLost: true,  suggestRestocked: true  },
  lost_package:              { label: "طرد مفقود",                 deliveryCostLost: true,  suggestRestocked: false },
};

const PRIMARY_TYPES: OrderReturnEventType[] = [
  "rejected_delivery",
  "partial_return",
  "customer_return",
  "damaged_return",
  "cancelled_before_shipping",
];

const ADVANCED_TYPES: OrderReturnEventType[] = [
  "failed_delivery",
  "cancelled_after_shipping",
  "lost_package",
];

const STATUS_LABELS: Record<string, string> = {
  recorded: "قيد المراجعة",
  verified: "معتمدة",
  disputed: "مستبعدة",
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n) + " د.ع";

const errMsg = (e: unknown) =>
  e instanceof Error ? e.message : "خطأ غير معروف";

const orderLineKey = (item: OrderItem): string =>
  item.orderItemId ?? item.id ?? `${item.productId}::${item.variantId ?? "__none__"}`;

const orderLineLabel = (item: OrderItem): string => {
  const variant = item.variantLabel ?? item.variantId;
  return variant ? `${item.productName} (${variant})` : item.productName;
};

export function OrderReturnAdjustmentModal({ order, open, onClose }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [type, setType] = useState<OrderReturnEventType>("rejected_delivery");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [reason, setReason] = useState("");
  const [itemStates, setItemStates] = useState<Record<string, ItemState>>({});
  const [refundAmount, setRefundAmount] = useState(0);
  const [deliveryCostLoss, setDeliveryCostLoss] = useState(0);
  const [returnShippingCost, setReturnShippingCost] = useState(0);
  const [packagingLoss, setPackagingLoss] = useState(0);
  const [note, setNote] = useState("");
  const [voidConfirm, setVoidConfirm] = useState<{ id: string; fromStatus: string; note: string } | null>(null);

  useEffect(() => {
    if (open) {
      setStep(1);
      setType("rejected_delivery");
      setShowAdvanced(false);
      setReason("");
      setItemStates({});
      setRefundAmount(0);
      setDeliveryCostLoss(0);
      setReturnShippingCost(0);
      setPackagingLoss(0);
      setNote("");
      setVoidConfirm(null);
    }
  }, [open]);

  const { data: existingData } = useQuery({
    queryKey: ["return-events-for-order", order.id],
    queryFn: async () => {
      const r = await fetch(
        `/api/admin/accounting/return-events?orderId=${order.id}&period=year`,
        { credentials: "include" }
      );
      if (!r.ok) throw new Error("فشل تحميل الراجعات");
      return r.json() as Promise<{ data: ExistingEvent[]; summary: unknown }>;
    },
    enabled: open,
  });
  const existingEvents = existingData?.data ?? [];

  const computeSuggestions = (
    states: Record<string, ItemState>,
    eventType: OrderReturnEventType
  ) => {
    const scenario = SCENARIO_META[eventType];
    let totalRevenue = 0;

    order.items.forEach((item) => {
      const state = states[orderLineKey(item)];
      if ((state?.qty ?? 0) > 0) totalRevenue += state.qty * item.price;
    });

    setRefundAmount(Math.round(totalRevenue));
    setPackagingLoss(0);
    setDeliveryCostLoss(scenario.deliveryCostLost ? (order.shippingCost ?? 5000) : 0);
    setReturnShippingCost(0);
  };

  const goToStep2 = () => {
    const initStates: Record<string, ItemState> = {};
    order.items.forEach((i) => {
      initStates[orderLineKey(i)] = {
        qty: i.quantity,
        restocked: SCENARIO_META[type].suggestRestocked,
        damaged: type === "damaged_return",
        reason: "",
      };
    });
    setItemStates(initStates);
    computeSuggestions(initStates, type);
    setStep(2);
  };

  const updateItemState = (lineKey: string, patch: Partial<ItemState>) => {
    setItemStates((prev) => ({ ...prev, [lineKey]: { ...prev[lineKey], ...patch } }));
  };

  const resetItem = (lineKey: string) => {
    setItemStates((prev) => ({
      ...prev,
      [lineKey]: { qty: 0, restocked: false, damaged: false, reason: "" },
    }));
  };

  const voidMutation = useMutation({
    mutationFn: async ({ id, note: voidNote }: { id: string; note?: string }) => {
      const r = await fetch(`/api/admin/accounting/return-events/${id}/status`, {
        method: "PATCH",
        headers: addCsrfHeader({ "Content-Type": "application/json" }),
        credentials: "include",
        body: JSON.stringify({ status: "disputed", note: voidNote || "تم مسح التعديل من الأدمن" }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({})) as { message?: string };
        throw new Error(e.message ?? "فشل");
      }
      return r.json();
    },
    onSuccess: () => {
      toast({ title: "تم مسح التعديل", description: "التعديل أصبح مستبعداً ولن يدخل في الحسابات" });
      qc.invalidateQueries({ queryKey: ["return-events"] });
      qc.invalidateQueries({ queryKey: ["return-events-for-order", order.id] });
      setVoidConfirm(null);
    },
    onError: (e) => {
      toast({ title: "خطأ", description: errMsg(e), variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/admin/accounting/return-events/${id}`, {
        method: "DELETE",
        headers: addCsrfHeader({}),
        credentials: "include",
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({})) as { message?: string };
        throw new Error(e.message ?? "فشل الحذف");
      }
      return r.json();
    },
    onSuccess: () => {
      toast({ title: "تم الحذف", description: "تم حذف التعديل نهائياً" });
      qc.invalidateQueries({ queryKey: ["return-events"] });
      qc.invalidateQueries({ queryKey: ["return-events-for-order", order.id] });
    },
    onError: (e) => {
      toast({ title: "خطأ", description: errMsg(e), variant: "destructive" });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: OrderReturnEventInput) => {
      const r = await fetch("/api/admin/accounting/return-events", {
        method: "POST",
        headers: addCsrfHeader({ "Content-Type": "application/json" }),
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({})) as { message?: string };
        throw new Error(e.message ?? "فشل الحفظ");
      }
      return r.json();
    },
    onSuccess: () => {
      toast({ title: "تم التسجيل", description: "تم تسجيل التعديل (حالة: قيد المراجعة — لن يؤثر على الأرباح حتى التحقق)" });
      qc.invalidateQueries({ queryKey: ["return-events"] });
      qc.invalidateQueries({ queryKey: ["return-events-for-order", order.id] });
      onClose();
    },
    onError: (e) => {
      toast({ title: "خطأ", description: errMsg(e), variant: "destructive" });
    },
  });

  const handleConfirm = () => {
    const selectedItems = order.items.filter(
      (item) => (itemStates[orderLineKey(item)]?.qty ?? 0) > 0
    );
    const selectedStates = selectedItems.map(
      (item) => itemStates[orderLineKey(item)]
    );

    if (selectedStates.some((state) => state.restocked && state.damaged)) {
      toast({
        title: "حالة المنتج غير صالحة",
        description: "المنتج التالف لا يمكن إرجاعه للمخزون",
        variant: "destructive",
      });
      return;
    }

    if (new Set(selectedStates.map((state) => state.restocked)).size > 1) {
      toast({
        title: "افصل حالات الراجع",
        description: "سجل المنتجات الصالحة للبيع والتالفة كحدثين منفصلين حتى يبقى المخزون والحساب صحيحين",
        variant: "destructive",
      });
      return;
    }

    const affectedItems = selectedItems.map((item) => {
      const state = itemStates[orderLineKey(item)];
      return {
        productId: item.productId,
        orderItemId: item.orderItemId ?? item.id,
        variantId: item.variantId ?? null,
        qty: state.qty,
        priceAtPurchase: item.price,
        cogsAtTime: 0,
      };
    });

    const anyRestocked = selectedStates[0]?.restocked ?? false;
    const itemReasons = selectedItems
      .filter((item) => itemStates[orderLineKey(item)]?.reason?.trim())
      .map((item) => `${orderLineLabel(item)}: ${itemStates[orderLineKey(item)].reason.trim()}`)
      .join(" | ");
    const finalNote = [note.trim(), itemReasons].filter(Boolean).join(" — ") || undefined;

    createMutation.mutate({
      orderId: order.id,
      type,
      reason: reason.trim() || undefined,
      refundAmount,
      deliveryCostLoss,
      returnShippingCost,
      packagingLoss,
      productWriteOffAmount: 0,
      cogsLoss: 0,
      restocked: anyRestocked,
      affectedItems: affectedItems.length > 0 ? affectedItems : undefined,
      note: finalNote,
    });
  };

  const totalImpact =
    refundAmount + deliveryCostLoss + returnShippingCost + packagingLoss;

  const orderTotal = Number(order.roundedTotal ?? order.totalAmount ?? order.total);

  const STEP_LABELS = ["السيناريو", "التفاصيل", "مراجعة"];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>تعديل الفاتورة / راجع</DialogTitle>
          <DialogDescription>
            {order.orderNumber || order.id.slice(0, 8)}
            {existingEvents.length > 0 && ` — يوجد ${existingEvents.length} تعديل سابق`}
          </DialogDescription>
        </DialogHeader>

        {/* Order info bar */}
        <div className="grid grid-cols-2 gap-2 text-sm bg-muted/30 rounded-lg p-3 border mb-1">
          <div>
            <span className="text-muted-foreground text-xs block">رقم الطلب</span>
            <span className="font-mono font-bold text-primary">{order.orderNumber || order.id.slice(0, 8)}</span>
          </div>
          <div>
            <span className="text-muted-foreground text-xs block">العميل</span>
            <span className="font-medium">{order.customerName || "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground text-xs block">المبلغ الأصلي</span>
            <span className="font-bold">{fmt(orderTotal)}</span>
          </div>
          <div>
            <span className="text-muted-foreground text-xs block">الحالة</span>
            <span>{order.status}</span>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-3 text-xs mb-4">
          {STEP_LABELS.map((label, idx) => {
            const s = idx + 1;
            return (
              <span key={s} className="flex items-center gap-1">
                <span
                  className={`w-5 h-5 rounded-full text-center leading-5 text-xs font-bold ${
                    step >= s ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {s}
                </span>
                <span className={step >= s ? "text-primary font-semibold" : "text-muted-foreground"}>
                  {label}
                </span>
                {s < 3 && <span className="text-muted-foreground">‹</span>}
              </span>
            );
          })}
        </div>

        {/* ── STEP 1: Scenario ── */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm font-semibold">اختر نوع الراجع / التعديل:</p>

            <div className="grid grid-cols-1 gap-2">
              {PRIMARY_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`text-right px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                    type === t
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  }`}
                >
                  {SCENARIO_META[t].label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowAdvanced((v) => !v)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              خيارات متقدمة
            </button>

            {showAdvanced && (
              <div className="grid grid-cols-1 gap-2">
                {ADVANCED_TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`text-right px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                      type === t
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    }`}
                  >
                    {SCENARIO_META[t].label}
                  </button>
                ))}
              </div>
            )}

            <div>
              <label className="text-sm font-medium">سبب تفصيلي (اختياري)</label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="مثال: العميل رفض لأن الطلب تأخر..."
                className="mt-1"
              />
            </div>

            {/* Existing events section */}
            {existingEvents.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-orange-50 dark:bg-orange-950/20 border-b border-orange-200 dark:border-orange-800 px-3 py-2">
                  <p className="text-xs font-semibold text-orange-700 dark:text-orange-400">
                    التعديلات السابقة على هذا الطلب
                  </p>
                </div>
                <div className="divide-y">
                  {existingEvents.map((ev) => {
                    const evTotal = ev.refundAmount + ev.deliveryCostLoss + ev.returnShippingCost +
                      ev.packagingLoss + ev.productWriteOffAmount + ev.cogsLoss;
                    const canVoid = ev.status !== "disputed";
                    return (
                      <div key={ev.id} className="p-3 flex justify-between items-start gap-2 text-sm">
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{SCENARIO_META[ev.type]?.label ?? ev.type}</span>
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded ${
                                ev.status === "verified"
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                  : ev.status === "disputed"
                                  ? "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                                  : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                              }`}
                            >
                              {STATUS_LABELS[ev.status] ?? ev.status}
                            </span>
                          </div>
                          {evTotal > 0 && (
                            <p className="text-xs text-red-500">الأثر: -{fmt(evTotal)}</p>
                          )}
                          {ev.note && (
                            <p className="text-xs text-muted-foreground truncate max-w-xs">{ev.note}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {new Date(ev.createdAt).toLocaleDateString("ar-IQ")}
                          </p>
                        </div>
                        {canVoid ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="shrink-0 text-xs h-7 text-red-500 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/30"
                            onClick={() => setVoidConfirm({ id: ev.id, fromStatus: ev.status, note: "" })}
                          >
                            <RotateCcw className="h-3 w-3 ml-1" />
                            مسح التعديل
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="shrink-0 text-xs h-7 text-muted-foreground hover:text-red-500"
                            onClick={() => deleteMutation.mutate(ev.id)}
                            disabled={deleteMutation.isPending}
                            title="حذف نهائي (مستبعد فقط)"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>إلغاء</Button>
              <Button onClick={goToStep2}>التالي ←</Button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Items + Financial ── */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-semibold">المنتجات المتأثرة:</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => computeSuggestions(itemStates, type)}
                >
                  إعادة حساب المقترح
                </Button>
              </div>
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-right p-2 font-medium">المنتج</th>
                      <th className="text-center p-2 font-medium w-14">الكمية</th>
                      <th className="text-center p-2 font-medium w-20">كمية الراجع</th>
                      <th className="text-center p-2 font-medium w-24">السعر</th>
                      <th className="text-center p-2 font-medium w-24">الاسترداد</th>
                      <th className="text-center p-2 font-medium w-14">للمخزن</th>
                      <th className="text-center p-2 font-medium w-14">تالف</th>
                      <th className="text-right p-2 font-medium">السبب</th>
                      <th className="p-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item) => {
                      const s = itemStates[orderLineKey(item)] ?? { qty: 0, restocked: false, damaged: false, reason: "" };
                      const refund = s.qty * item.price;
                      return (
                        <tr key={orderLineKey(item)} className="border-t">
                          <td className="p-2 font-medium">
                            <span className="block">{item.productName}</span>
                            {(item.variantLabel ?? item.variantId) && (
                              <span className="block text-xs text-muted-foreground mt-0.5">
                                {item.variantLabel ?? item.variantId}
                              </span>
                            )}
                          </td>
                          <td className="text-center p-2">{item.quantity}</td>
                          <td className="text-center p-2">
                            <input
                              type="number"
                              min={0}
                              max={item.quantity}
                              value={s.qty}
                              onChange={(e) => {
                                const v = Math.min(item.quantity, Math.max(0, parseInt(e.target.value) || 0));
                                updateItemState(orderLineKey(item), { qty: v });
                              }}
                              className="w-16 text-center border rounded p-1 bg-background text-sm"
                            />
                          </td>
                          <td className="text-center p-2 text-muted-foreground text-xs">{fmt(item.price)}</td>
                          <td className="text-center p-2 text-xs font-medium">
                            {s.qty > 0 ? (
                              <span className="text-red-500">-{fmt(refund)}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="text-center p-2">
                            <input
                              type="checkbox"
                              checked={s.restocked}
                              onChange={(e) => updateItemState(orderLineKey(item), { restocked: e.target.checked })}
                              className="w-4 h-4 cursor-pointer"
                            />
                          </td>
                          <td className="text-center p-2">
                            <input
                              type="checkbox"
                              checked={s.damaged}
                              onChange={(e) => updateItemState(orderLineKey(item), { damaged: e.target.checked })}
                              className="w-4 h-4 cursor-pointer"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={s.reason}
                              onChange={(e) => updateItemState(orderLineKey(item), { reason: e.target.value })}
                              placeholder="اختياري..."
                              className="w-full border rounded p-1 bg-background text-xs"
                            />
                          </td>
                          <td className="p-2">
                            <button
                              onClick={() => resetItem(orderLineKey(item))}
                              title="مسح التعديل لهذا المنتج"
                              className="p-1 text-muted-foreground hover:text-red-500 transition-colors"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                المخزون لا يتغير عند الحفظ ويتحدث تلقائيا فقط بعد اعتماد الحدث من Snapshot الطلب الاصلي
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold mb-3">الأثر المالي (مقترح — قابل للتعديل):</p>
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    { label: "مبلغ الاسترداد للعميل", value: refundAmount, set: setRefundAmount, hint: "مجموع المنتجات المُرجعة" },
                    { label: "خسارة تكلفة التوصيل", value: deliveryCostLoss, set: setDeliveryCostLoss, hint: "رسوم الشحن المدفوعة" },
                    { label: "تكلفة إعادة الشحن", value: returnShippingCost, set: setReturnShippingCost, hint: "إذا وجدت" },
                    { label: "خسارة تغليف اضافية", value: packagingLoss, set: setPackagingLoss, hint: "ادخلها فقط اذا كانت كلفة جديدة غير تجهيز الطلب الاصلي" },
                  ] as Array<{ label: string; value: number; set: (v: number) => void; hint: string }>
                ).map(({ label, value, set, hint }) => (
                  <div key={label}>
                    <label className="text-xs font-medium text-muted-foreground">{label}</label>
                    <input
                      type="number"
                      min={0}
                      value={value}
                      onChange={(e) => set(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full border rounded p-2 mt-1 bg-background text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">ملاحظة داخلية (اختياري)</label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="ملاحظة للمراجع..."
                className="mt-1"
              />
            </div>

            <div className="flex justify-between items-center pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>→ السابق</Button>
              <Button onClick={() => setStep(3)}>مراجعة ←</Button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Preview + Confirm ── */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-muted/30 rounded-lg p-4 space-y-3 border">
              <h3 className="font-bold text-sm border-b pb-2">ملخص التعديل</h3>

              <div className="flex justify-between text-sm bg-muted/40 rounded px-2 py-1">
                <span className="text-muted-foreground font-medium">مجموع الفاتورة الأصلي:</span>
                <span className="font-bold">{fmt(orderTotal)}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">نوع الراجع:</span>
                <span className="font-semibold">{SCENARIO_META[type].label}</span>
              </div>

              {reason.trim() && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">السبب:</span>
                  <span>{reason}</span>
                </div>
              )}

              <div className="border-t pt-2 space-y-1">
                <p className="text-xs font-semibold text-muted-foreground mb-1">المنتجات:</p>
                {order.items.filter((i) => (itemStates[orderLineKey(i)]?.qty ?? 0) > 0).length === 0 ? (
                  <p className="text-sm text-muted-foreground">لا توجد منتجات محددة</p>
                ) : (
                  order.items
                    .filter((i) => (itemStates[orderLineKey(i)]?.qty ?? 0) > 0)
                    .map((item) => {
                      const s = itemStates[orderLineKey(item)];
                      return (
                        <div key={orderLineKey(item)} className="flex justify-between text-sm">
                          <span>
                            {orderLineLabel(item)} × {s.qty}
                            {s.damaged && <span className="text-red-400 mr-1 text-xs">(تالف)</span>}
                            {s.restocked && <span className="text-green-500 mr-1 text-xs">(للمخزن)</span>}
                          </span>
                          <span>{fmt(item.price * s.qty)}</span>
                        </div>
                      );
                    })
                )}
              </div>

              <div className="border-t pt-2 space-y-1">
                <p className="text-xs font-semibold text-muted-foreground mb-1">الأثر المالي:</p>
                {(
                  [
                    ["مبلغ الاسترداد", refundAmount],
                    ["خسارة التوصيل", deliveryCostLoss],
                    ["تكلفة إعادة الشحن", returnShippingCost],
                    ["خسارة تغليف اضافية", packagingLoss],
                  ] as Array<[string, number]>
                )
                  .filter(([, val]) => val > 0)
                  .map(([label, val]) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{label}:</span>
                      <span className="text-red-500">-{fmt(val)}</span>
                    </div>
                  ))}
                <div className="flex justify-between text-sm font-bold border-t pt-1 mt-1">
                  <span>إجمالي الأثر المالي:</span>
                  <span className={totalImpact > 0 ? "text-red-500" : "text-muted-foreground"}>
                    {totalImpact > 0 ? `-${fmt(totalImpact)}` : "لا يوجد"}
                  </span>
                </div>
              </div>

              {note.trim() && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">ملاحظة:</span>
                  <span>{note}</span>
                </div>
              )}

              <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded p-2 text-xs text-yellow-700 dark:text-yellow-400 mt-2 flex items-start gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>
                  الحالة: <strong>قيد المراجعة (recorded)</strong> — لن يؤثر على تقارير
                  الأرباح حتى يتم التحقق منه يدوياً من تبويب "الراجعات والخسائر".
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <Button variant="outline" onClick={() => setStep(2)}>→ السابق</Button>
              <Button
                onClick={handleConfirm}
                disabled={createMutation.isPending}
                className="bg-primary hover:bg-primary/90 text-white"
              >
                {createMutation.isPending ? "جاري الحفظ..." : "تأكيد وحفظ التعديل"}
              </Button>
            </div>
          </div>
        )}

        {/* ── Void Confirmation Overlay ── */}
        {voidConfirm && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[2000]">
            <div
              className="bg-background border rounded-xl p-6 w-96 max-w-[90vw] space-y-4"
              dir="rtl"
            >
              {voidConfirm.fromStatus === "verified" ? (
                <div className="space-y-2">
                  <h3 className="font-bold text-sm text-orange-500">تحذير: تعديل معتمد</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    هذا تعديل معتمد وداخل بالحسابات. سيتم استبعاده من الحسابات بدل حذفه.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <h3 className="font-bold text-sm">مسح التعديل</h3>
                  <p className="text-sm text-muted-foreground">
                    سيتم تغيير حالة التعديل إلى "مستبعد" ولن يدخل في الحسابات.
                  </p>
                </div>
              )}
              <div>
                <label className="text-xs text-muted-foreground block mb-1">ملاحظة (اختياري)</label>
                <input
                  type="text"
                  value={voidConfirm.note}
                  onChange={(e) =>
                    setVoidConfirm((p) => (p ? { ...p, note: e.target.value } : null))
                  }
                  placeholder="سبب المسح..."
                  className="w-full border rounded p-2 bg-background text-sm"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setVoidConfirm(null)}>
                  إلغاء
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={voidMutation.isPending}
                  onClick={() =>
                    voidMutation.mutate({
                      id: voidConfirm.id,
                      note: voidConfirm.note || undefined,
                    })
                  }
                >
                  {voidMutation.isPending ? "جاري..." : "تأكيد المسح"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
