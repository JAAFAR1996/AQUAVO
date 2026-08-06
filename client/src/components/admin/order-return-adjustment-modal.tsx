import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, ChevronDown, ChevronUp, RotateCcw, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { addCsrfHeader } from "@/lib/csrf";
import {
  type OrderReturnEventInput,
  type OrderReturnEventType,
} from "@shared/accounting";

interface ReturnOrderLine {
  id: string;
  orderItemId: string;
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

const SCENARIO_META: Record<
  OrderReturnEventType,
  { label: string; deliveryCostLost: boolean; suggestRestocked: boolean }
> = {
  rejected_delivery: { label: "رفض الاستلام", deliveryCostLost: true, suggestRestocked: true },
  partial_return: { label: "راجع جزئي", deliveryCostLost: false, suggestRestocked: true },
  customer_return: { label: "استرجاع كامل", deliveryCostLost: false, suggestRestocked: true },
  damaged_return: { label: "منتج تالف", deliveryCostLost: false, suggestRestocked: false },
  cancelled_before_shipping: { label: "إلغاء قبل الشحن", deliveryCostLost: false, suggestRestocked: true },
  failed_delivery: { label: "فشل التوصيل", deliveryCostLost: true, suggestRestocked: true },
  cancelled_after_shipping: { label: "إلغاء بعد إرسال الشحن", deliveryCostLost: true, suggestRestocked: true },
  lost_package: { label: "طرد مفقود", deliveryCostLost: true, suggestRestocked: false },
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

const fmt = (value: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value) + " د.ع";

const errMsg = (error: unknown) =>
  error instanceof Error ? error.message : "خطأ غير معروف";

const lineLabel = (line: ReturnOrderLine): string => {
  const variant = line.variantLabel ?? line.variantId;
  return variant ? `${line.productName} (${variant})` : line.productName;
};

export function OrderReturnAdjustmentModal({ order, open, onClose }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [type, setType] = useState<OrderReturnEventType>("rejected_delivery");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [reason, setReason] = useState("");
  const [itemStates, setItemStates] = useState<Record<string, ItemState>>({});
  const [deliveryCostLoss, setDeliveryCostLoss] = useState(0);
  const [returnShippingCost, setReturnShippingCost] = useState(0);
  const [packagingLoss, setPackagingLoss] = useState(0);
  const [note, setNote] = useState("");
  const [voidConfirm, setVoidConfirm] = useState<{
    id: string;
    fromStatus: string;
    note: string;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setType("rejected_delivery");
    setShowAdvanced(false);
    setReason("");
    setItemStates({});
    setDeliveryCostLoss(0);
    setReturnShippingCost(0);
    setPackagingLoss(0);
    setNote("");
    setVoidConfirm(null);
  }, [open, order.id]);

  const {
    data: returnLinesData,
    isLoading: returnLinesLoading,
    error: returnLinesError,
  } = useQuery({
    queryKey: ["canonical-return-lines", order.id],
    queryFn: async () => {
      const response = await fetch(`/api/admin/orders/${order.id}/return-lines`, {
        credentials: "include",
      });
      const body = await response.json().catch(() => ({})) as {
        data?: ReturnOrderLine[];
        message?: string;
      };
      if (!response.ok) {
        throw new Error(body.message ?? "فشل تحميل سطور الطلب الأصلية");
      }
      return { data: body.data ?? [] };
    },
    enabled: open,
    retry: false,
  });
  const returnLines = returnLinesData?.data ?? [];

  const { data: existingData } = useQuery({
    queryKey: ["return-events-for-order", order.id],
    queryFn: async () => {
      const response = await fetch(
        `/api/admin/accounting/return-events?orderId=${order.id}&period=year`,
        { credentials: "include" },
      );
      if (!response.ok) throw new Error("فشل تحميل الراجعات");
      return response.json() as Promise<{ data: ExistingEvent[]; summary: unknown }>;
    },
    enabled: open,
  });
  const existingEvents = existingData?.data ?? [];

  const selectedLines = useMemo(
    () => returnLines.filter((line) => (itemStates[line.orderItemId]?.qty ?? 0) > 0),
    [itemStates, returnLines],
  );

  const refundAmount = useMemo(() => {
    if (type === "rejected_delivery") return 0;
    return Math.round(
      selectedLines.reduce(
        (total, line) => total + itemStates[line.orderItemId].qty * line.price,
        0,
      ),
    );
  }, [itemStates, selectedLines, type]);

  const totalImpact = refundAmount + deliveryCostLoss + returnShippingCost + packagingLoss;
  const orderTotal = Number(order.roundedTotal ?? order.totalAmount ?? order.total);

  const goToStep2 = () => {
    if (type !== "rejected_delivery") {
      if (returnLinesLoading) {
        toast({ title: "انتظر تحميل سطور الطلب" });
        return;
      }
      if (returnLinesError || returnLines.length === 0) {
        toast({
          title: "لا يمكن إنشاء راجع آمن",
          description: errMsg(returnLinesError),
          variant: "destructive",
        });
        return;
      }
    }

    const initial: Record<string, ItemState> = {};
    for (const line of returnLines) {
      initial[line.orderItemId] = {
        qty: line.quantity,
        restocked: SCENARIO_META[type].suggestRestocked,
        damaged: type === "damaged_return",
        reason: "",
      };
    }
    setItemStates(initial);
    setDeliveryCostLoss(
      SCENARIO_META[type].deliveryCostLost ? Number(order.shippingCost ?? 5000) : 0,
    );
    setReturnShippingCost(0);
    setPackagingLoss(0);
    setStep(2);
  };

  const updateItemState = (orderItemId: string, patch: Partial<ItemState>) => {
    setItemStates((previous) => ({
      ...previous,
      [orderItemId]: { ...previous[orderItemId], ...patch },
    }));
  };

  const resetItem = (orderItemId: string) => {
    setItemStates((previous) => ({
      ...previous,
      [orderItemId]: { qty: 0, restocked: false, damaged: false, reason: "" },
    }));
  };

  const voidMutation = useMutation({
    mutationFn: async ({ id, voidNote }: { id: string; voidNote?: string }) => {
      const response = await fetch(`/api/admin/accounting/return-events/${id}/status`, {
        method: "PATCH",
        headers: addCsrfHeader({ "Content-Type": "application/json" }),
        credentials: "include",
        body: JSON.stringify({
          status: "disputed",
          note: voidNote || "تم مسح التعديل من الأدمن",
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { message?: string };
        throw new Error(body.message ?? "فشل استبعاد التعديل");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "تم مسح التعديل",
        description: "التعديل أصبح مستبعداً ولن يدخل في الحسابات",
      });
      queryClient.invalidateQueries({ queryKey: ["return-events"] });
      queryClient.invalidateQueries({ queryKey: ["return-events-for-order", order.id] });
      setVoidConfirm(null);
    },
    onError: (error) => {
      toast({ title: "خطأ", description: errMsg(error), variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/accounting/return-events/${id}`, {
        method: "DELETE",
        headers: addCsrfHeader({}),
        credentials: "include",
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { message?: string };
        throw new Error(body.message ?? "فشل الحذف");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "تم الحذف", description: "تم حذف التعديل المستبعد نهائياً" });
      queryClient.invalidateQueries({ queryKey: ["return-events"] });
      queryClient.invalidateQueries({ queryKey: ["return-events-for-order", order.id] });
    },
    onError: (error) => {
      toast({ title: "خطأ", description: errMsg(error), variant: "destructive" });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: OrderReturnEventInput) => {
      const response = await fetch("/api/admin/accounting/return-events", {
        method: "POST",
        headers: addCsrfHeader({ "Content-Type": "application/json" }),
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { message?: string };
        throw new Error(body.message ?? "فشل الحفظ");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "تم التسجيل",
        description: "سُجل الحدث قيد المراجعة ولن يؤثر على الحسابات قبل اعتماده",
      });
      queryClient.invalidateQueries({ queryKey: ["return-events"] });
      queryClient.invalidateQueries({ queryKey: ["return-events-for-order", order.id] });
      onClose();
    },
    onError: (error) => {
      toast({ title: "خطأ", description: errMsg(error), variant: "destructive" });
    },
  });

  const handleConfirm = () => {
    if (type !== "rejected_delivery" && selectedLines.length === 0) {
      toast({
        title: "حدد منتجاً واحداً على الأقل",
        variant: "destructive",
      });
      return;
    }

    const selectedStates = selectedLines.map((line) => itemStates[line.orderItemId]);
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
        description: "سجل الصالح للبيع والتالف كحدثين منفصلين",
        variant: "destructive",
      });
      return;
    }

    const affectedItems = selectedLines.map((line) => {
      const state = itemStates[line.orderItemId];
      return {
        productId: line.productId,
        orderItemId: line.orderItemId,
        variantId: line.variantId ?? null,
        qty: state.qty,
        priceAtPurchase: line.price,
        cogsAtTime: 0,
      };
    });

    const itemReasons = selectedLines
      .filter((line) => itemStates[line.orderItemId].reason.trim())
      .map((line) => `${lineLabel(line)}: ${itemStates[line.orderItemId].reason.trim()}`)
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
      restocked: selectedStates[0]?.restocked ?? false,
      affectedItems: affectedItems.length > 0 ? affectedItems : undefined,
      note: finalNote,
    });
  };

  const stepLabels = ["السيناريو", "التفاصيل", "مراجعة"];
  const returnLinesUnavailable = Boolean(returnLinesError) || (!returnLinesLoading && returnLines.length === 0);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>تعديل الفاتورة / راجع</DialogTitle>
          <DialogDescription>
            {order.orderNumber || order.id.slice(0, 8)}
            {existingEvents.length > 0 && ` — يوجد ${existingEvents.length} تعديل سابق`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 text-sm bg-muted/30 rounded-lg p-3 border">
          <div>
            <span className="text-muted-foreground text-xs block">رقم الطلب</span>
            <span className="font-mono font-bold text-primary">
              {order.orderNumber || order.id.slice(0, 8)}
            </span>
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

        <div className="flex items-center gap-3 text-xs my-3">
          {stepLabels.map((label, index) => {
            const current = index + 1;
            return (
              <span key={label} className="flex items-center gap-1">
                <span className={`w-5 h-5 rounded-full text-center leading-5 font-bold ${
                  step >= current ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                }`}>
                  {current}
                </span>
                <span className={step >= current ? "text-primary font-semibold" : "text-muted-foreground"}>
                  {label}
                </span>
                {current < 3 && <span className="text-muted-foreground">‹</span>}
              </span>
            );
          })}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm font-semibold">اختر نوع الراجع / التعديل:</p>
            <div className="grid grid-cols-1 gap-2">
              {PRIMARY_TYPES.map((scenario) => (
                <button
                  key={scenario}
                  type="button"
                  onClick={() => setType(scenario)}
                  className={`text-right px-4 py-3 rounded-lg border text-sm font-medium ${
                    type === scenario
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  }`}
                >
                  {SCENARIO_META[scenario].label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowAdvanced((value) => !value)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              خيارات متقدمة
            </button>

            {showAdvanced && (
              <div className="grid grid-cols-1 gap-2">
                {ADVANCED_TYPES.map((scenario) => (
                  <button
                    key={scenario}
                    type="button"
                    onClick={() => setType(scenario)}
                    className={`text-right px-4 py-3 rounded-lg border text-sm font-medium ${
                      type === scenario
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    }`}
                  >
                    {SCENARIO_META[scenario].label}
                  </button>
                ))}
              </div>
            )}

            <div>
              <label className="text-sm font-medium">سبب تفصيلي (اختياري)</label>
              <Input
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="مثال: العميل أعاد جزءاً من الطلب"
                className="mt-1"
              />
            </div>

            {type !== "rejected_delivery" && returnLinesLoading && (
              <p className="text-xs text-muted-foreground">جاري تحميل سطور البيع الأصلية...</p>
            )}
            {type !== "rejected_delivery" && returnLinesUnavailable && (
              <div className="border border-red-200 bg-red-50 dark:bg-red-950/20 rounded p-3 text-xs text-red-700 dark:text-red-400">
                {errMsg(returnLinesError) || "لا توجد سطور بيع مالية لهذا الطلب"}
              </div>
            )}

            {existingEvents.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-orange-50 dark:bg-orange-950/20 border-b px-3 py-2">
                  <p className="text-xs font-semibold text-orange-700 dark:text-orange-400">
                    التعديلات السابقة على هذا الطلب
                  </p>
                </div>
                <div className="divide-y">
                  {existingEvents.map((event) => {
                    const eventTotal = event.refundAmount + event.deliveryCostLoss +
                      event.returnShippingCost + event.packagingLoss +
                      event.productWriteOffAmount + event.cogsLoss;
                    return (
                      <div key={event.id} className="p-3 flex justify-between items-start gap-2 text-sm">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">
                              {SCENARIO_META[event.type]?.label ?? event.type}
                            </span>
                            <span className="text-xs px-1.5 py-0.5 rounded bg-muted">
                              {STATUS_LABELS[event.status] ?? event.status}
                            </span>
                          </div>
                          {eventTotal > 0 && <p className="text-xs text-red-500">الأثر: -{fmt(eventTotal)}</p>}
                          {event.note && <p className="text-xs text-muted-foreground truncate max-w-xs">{event.note}</p>}
                        </div>
                        {event.status !== "disputed" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs text-red-500"
                            onClick={() => setVoidConfirm({ id: event.id, fromStatus: event.status, note: "" })}
                          >
                            <RotateCcw className="h-3 w-3 ml-1" />
                            مسح التعديل
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-muted-foreground hover:text-red-500"
                            onClick={() => deleteMutation.mutate(event.id)}
                            disabled={deleteMutation.isPending}
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
              <Button
                onClick={goToStep2}
                disabled={type !== "rejected_delivery" && (returnLinesLoading || returnLinesUnavailable)}
              >
                التالي ←
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div>
              <p className="text-sm font-semibold mb-2">المنتجات المتأثرة:</p>
              {returnLines.length === 0 ? (
                <div className="border rounded-lg p-4 text-sm text-muted-foreground">
                  رفض الاستلام يُدار من سجل الحيازة ولا يحتاج سطر راجع مالي.
                </div>
              ) : (
                <div className="border rounded-lg overflow-x-auto">
                  <table className="w-full text-sm min-w-[640px]">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-right p-2">المنتج</th>
                        <th className="text-center p-2">المباع</th>
                        <th className="text-center p-2">الراجع</th>
                        <th className="text-center p-2">السعر الأصلي</th>
                        <th className="text-center p-2">للمخزن</th>
                        <th className="text-center p-2">تالف</th>
                        <th className="text-right p-2">السبب</th>
                        <th className="p-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {returnLines.map((line) => {
                        const state = itemStates[line.orderItemId] ?? {
                          qty: 0,
                          restocked: false,
                          damaged: false,
                          reason: "",
                        };
                        return (
                          <tr key={line.orderItemId} className="border-t">
                            <td className="p-2 font-medium">
                              <span className="block">{line.productName}</span>
                              {(line.variantLabel ?? line.variantId) && (
                                <span className="block text-xs text-muted-foreground">
                                  {line.variantLabel ?? line.variantId}
                                </span>
                              )}
                            </td>
                            <td className="text-center p-2">{line.quantity}</td>
                            <td className="text-center p-2">
                              <input
                                type="number"
                                min={0}
                                max={line.quantity}
                                value={state.qty}
                                onChange={(event) => {
                                  const qty = Math.min(
                                    line.quantity,
                                    Math.max(0, Number.parseInt(event.target.value, 10) || 0),
                                  );
                                  updateItemState(line.orderItemId, { qty });
                                }}
                                className="w-16 text-center border rounded p-1 bg-background"
                              />
                            </td>
                            <td className="text-center p-2 text-xs">{fmt(line.price)}</td>
                            <td className="text-center p-2">
                              <input
                                type="checkbox"
                                checked={state.restocked}
                                onChange={(event) => updateItemState(line.orderItemId, { restocked: event.target.checked })}
                              />
                            </td>
                            <td className="text-center p-2">
                              <input
                                type="checkbox"
                                checked={state.damaged}
                                onChange={(event) => updateItemState(line.orderItemId, { damaged: event.target.checked })}
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={state.reason}
                                onChange={(event) => updateItemState(line.orderItemId, { reason: event.target.value })}
                                placeholder="اختياري"
                                className="w-full border rounded p-1 bg-background text-xs"
                              />
                            </td>
                            <td className="p-2">
                              <button
                                type="button"
                                onClick={() => resetItem(line.orderItemId)}
                                className="p-1 text-muted-foreground hover:text-red-500"
                                title="مسح السطر"
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
              )}
              <p className="text-xs text-muted-foreground mt-2">
                الهوية والسعر والكلفة تُعاد قراءتها من Snapshot سطر الطلب عند الاعتماد.
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold mb-3">الأثر المالي:</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    مبلغ الاسترداد للعميل
                  </label>
                  <input
                    type="number"
                    value={refundAmount}
                    disabled
                    className="w-full border rounded p-2 mt-1 bg-muted text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-0.5">
                    غير قابل للتعديل؛ PostgreSQL يعيد حسابه من سعر البيع الأصلي.
                  </p>
                </div>
                {([
                  {
                    label: "خسارة تكلفة التوصيل",
                    value: deliveryCostLoss,
                    setValue: setDeliveryCostLoss,
                    hint: "رسوم شحن مدفوعة فعلياً",
                  },
                  {
                    label: "تكلفة إعادة الشحن",
                    value: returnShippingCost,
                    setValue: setReturnShippingCost,
                    hint: "تدخل فقط عند وجود كلفة فعلية",
                  },
                  {
                    label: "خسارة تغليف إضافية",
                    value: packagingLoss,
                    setValue: setPackagingLoss,
                    hint: "لا تكرر كلفة تجهيز الطلب الأصلي",
                  },
                ] as Array<{
                  label: string;
                  value: number;
                  setValue: (value: number) => void;
                  hint: string;
                }>).map(({ label, value, setValue, hint }) => (
                  <div key={label}>
                    <label className="text-xs font-medium text-muted-foreground">{label}</label>
                    <input
                      type="number"
                      min={0}
                      value={value}
                      onChange={(event) => setValue(Math.max(0, Number(event.target.value) || 0))}
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
                onChange={(event) => setNote(event.target.value)}
                placeholder="ملاحظة للمراجع"
                className="mt-1"
              />
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>→ السابق</Button>
              <Button onClick={() => setStep(3)}>مراجعة ←</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-muted/30 rounded-lg p-4 space-y-3 border">
              <h3 className="font-bold text-sm border-b pb-2">ملخص التعديل</h3>
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
                <p className="text-xs font-semibold text-muted-foreground">المنتجات:</p>
                {selectedLines.length === 0 ? (
                  <p className="text-sm text-muted-foreground">لا توجد سطور راجع مالية</p>
                ) : selectedLines.map((line) => {
                  const state = itemStates[line.orderItemId];
                  return (
                    <div key={line.orderItemId} className="flex justify-between text-sm">
                      <span>
                        {lineLabel(line)} × {state.qty}
                        {state.damaged && <span className="text-red-500 mr-1 text-xs">(تالف)</span>}
                        {state.restocked && <span className="text-green-500 mr-1 text-xs">(للمخزن)</span>}
                      </span>
                      <span>{fmt(line.price * state.qty)}</span>
                    </div>
                  );
                })}
              </div>

              <div className="border-t pt-2 space-y-1">
                {([
                  ["مبلغ الاسترداد", refundAmount],
                  ["خسارة التوصيل", deliveryCostLoss],
                  ["تكلفة إعادة الشحن", returnShippingCost],
                  ["خسارة تغليف إضافية", packagingLoss],
                ] as Array<[string, number]>).filter(([, value]) => value > 0).map(([label, value]) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{label}:</span>
                    <span className="text-red-500">-{fmt(value)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm font-bold border-t pt-1">
                  <span>إجمالي الأثر المالي:</span>
                  <span className={totalImpact > 0 ? "text-red-500" : "text-muted-foreground"}>
                    {totalImpact > 0 ? `-${fmt(totalImpact)}` : "لا يوجد"}
                  </span>
                </div>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded p-2 text-xs text-yellow-700 dark:text-yellow-400 flex gap-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>
                  الحدث يبقى قيد المراجعة. عند الاعتماد تعيد قاعدة البيانات بناء الهوية والمبلغ والكلفة من Snapshot الأصلي.
                </span>
              </div>
            </div>

            <div className="flex justify-between pt-2">
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

        {voidConfirm && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[2000]">
            <div className="bg-background border rounded-xl p-6 w-96 max-w-[90vw] space-y-4" dir="rtl">
              <div className="space-y-2">
                <h3 className="font-bold text-sm text-orange-500">
                  {voidConfirm.fromStatus === "verified" ? "عكس تعديل معتمد" : "مسح التعديل"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  سيصبح الحدث مستبعداً، وإذا كان معتمداً ستنشأ قيود عكس بدلاً من حذف التاريخ.
                </p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">سبب العكس</label>
                <input
                  type="text"
                  value={voidConfirm.note}
                  onChange={(event) => setVoidConfirm((current) => current ? {
                    ...current,
                    note: event.target.value,
                  } : null)}
                  placeholder="سبب واضح"
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
                  onClick={() => voidMutation.mutate({
                    id: voidConfirm.id,
                    voidNote: voidConfirm.note || undefined,
                  })}
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
