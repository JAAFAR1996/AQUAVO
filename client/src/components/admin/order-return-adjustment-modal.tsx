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
import { AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { addCsrfHeader } from "@/lib/csrf";
import {
  ORDER_RETURN_EVENT_TYPES,
  type OrderReturnEventType,
  type OrderReturnEventInput,
} from "@shared/accounting";

interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
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

const SCENARIO_META: Record<OrderReturnEventType, { label: string; deliveryCostLost: boolean; suggestRestocked: boolean }> = {
  rejected_delivery:         { label: "رفض الاستلام من العميل",          deliveryCostLost: true,  suggestRestocked: true  },
  failed_delivery:           { label: "فشل التوصيل (غياب / عدم رد)",    deliveryCostLost: true,  suggestRestocked: true  },
  customer_return:           { label: "استرجاع من العميل بعد التسليم",   deliveryCostLost: false, suggestRestocked: true  },
  cancelled_before_shipping: { label: "إلغاء قبل الشحن",                 deliveryCostLost: false, suggestRestocked: true  },
  cancelled_after_shipping:  { label: "إلغاء بعد إرسال الشحن",           deliveryCostLost: true,  suggestRestocked: true  },
  damaged_return:            { label: "راجع تالف أو مكسور",              deliveryCostLost: false, suggestRestocked: false },
  partial_return:            { label: "استرجاع جزئي",                    deliveryCostLost: false, suggestRestocked: true  },
  lost_package:              { label: "طرد مفقود",                       deliveryCostLost: true,  suggestRestocked: false },
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n) + " د.ع";

const errMsg = (e: unknown) =>
  e instanceof Error ? e.message : "خطأ غير معروف";

export function OrderReturnAdjustmentModal({ order, open, onClose }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [type, setType] = useState<OrderReturnEventType>("rejected_delivery");
  const [reason, setReason] = useState("");
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [refundAmount, setRefundAmount] = useState(0);
  const [deliveryCostLoss, setDeliveryCostLoss] = useState(0);
  const [returnShippingCost, setReturnShippingCost] = useState(0);
  const [packagingLoss, setPackagingLoss] = useState(0);
  const [productWriteOffAmount, setProductWriteOffAmount] = useState(0);
  const [cogsLoss, setCogsLoss] = useState(0);
  const [restocked, setRestocked] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) {
      setStep(1);
      setType("rejected_delivery");
      setReason("");
      setSelectedItems({});
      setRefundAmount(0);
      setDeliveryCostLoss(0);
      setReturnShippingCost(0);
      setPackagingLoss(0);
      setProductWriteOffAmount(0);
      setCogsLoss(0);
      setRestocked(false);
      setNote("");
    }
  }, [open]);

  // Existing return events for this order
  const { data: existingData } = useQuery({
    queryKey: ["return-events-for-order", order.id],
    queryFn: async () => {
      const r = await fetch(
        `/api/admin/accounting/return-events?orderId=${order.id}`,
        { credentials: "include" }
      );
      if (!r.ok) throw new Error("فشل تحميل الراجعات");
      return r.json() as Promise<{ events: unknown[] }>;
    },
    enabled: open,
  });
  const existingCount = existingData?.events?.length ?? 0;

  // Cost history for all order items (batch)
  const productIds = order.items.map((i) => i.productId);
  const { data: costMap = {} } = useQuery({
    queryKey: ["cost-history-batch", productIds.join(",")],
    queryFn: async () => {
      const results: Record<string, { costPrice: number; packagingCost: number; insertCost: number }> = {};
      await Promise.all(
        productIds.map(async (pid) => {
          try {
            const r = await fetch(`/api/admin/accounting/cost-history/${pid}`, { credentials: "include" });
            if (!r.ok) return;
            const data = await r.json() as Array<{ costPrice: number; packagingCost: number; insertCost: number }>;
            if (data.length > 0) {
              results[pid] = {
                costPrice: Number(data[0].costPrice),
                packagingCost: Number(data[0].packagingCost),
                insertCost: Number(data[0].insertCost),
              };
            }
          } catch { /* ignore per-product failures */ }
        })
      );
      return results;
    },
    enabled: open && productIds.length > 0,
  });

  const computeSuggestions = (
    items: Record<string, number>,
    eventType: OrderReturnEventType
  ) => {
    const scenario = SCENARIO_META[eventType];
    let totalRevenue = 0, totalCogs = 0, totalPackaging = 0;

    order.items.forEach((item) => {
      const qty = items[item.productId] ?? 0;
      if (qty > 0) {
        totalRevenue += qty * item.price;
        const cost = costMap[item.productId];
        if (cost) {
          totalCogs += qty * (cost.costPrice + cost.insertCost);
          totalPackaging += qty * cost.packagingCost;
        }
      }
    });

    setRefundAmount(Math.round(totalRevenue));
    setCogsLoss(Math.round(totalCogs));
    setPackagingLoss(Math.round(totalPackaging));
    setDeliveryCostLoss(scenario.deliveryCostLost ? (order.shippingCost ?? 5000) : 0);
    setRestocked(scenario.suggestRestocked);
    setProductWriteOffAmount(0);
    setReturnShippingCost(0);
  };

  const goToStep2 = () => {
    const allSelected: Record<string, number> = {};
    order.items.forEach((i) => { allSelected[i.productId] = i.quantity; });
    setSelectedItems(allSelected);
    computeSuggestions(allSelected, type);
    setStep(2);
  };

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
    const affectedItems = order.items
      .filter((item) => (selectedItems[item.productId] ?? 0) > 0)
      .map((item) => {
        const cost = costMap[item.productId];
        return {
          productId: item.productId,
          qty: selectedItems[item.productId],
          priceAtPurchase: item.price,
          cogsAtTime: cost
            ? cost.costPrice + cost.packagingCost + cost.insertCost
            : 0,
        };
      });

    createMutation.mutate({
      orderId: order.id,
      type,
      reason: reason.trim() || undefined,
      refundAmount,
      deliveryCostLoss,
      returnShippingCost,
      packagingLoss,
      productWriteOffAmount,
      cogsLoss,
      restocked,
      affectedItems: affectedItems.length > 0 ? affectedItems : undefined,
      note: note.trim() || undefined,
    });
  };

  const totalImpact =
    refundAmount + deliveryCostLoss + returnShippingCost +
    packagingLoss + productWriteOffAmount + cogsLoss;

  const STEP_LABELS = ["السيناريو", "التفاصيل", "مراجعة"];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>تعديل الفاتورة / راجع</DialogTitle>
          <DialogDescription>
            طلب:{" "}
            <span className="font-mono text-primary font-bold">
              {order.orderNumber || order.id.slice(0, 8)}
            </span>
            {existingCount > 0 && (
              <span className="mr-2 text-orange-500 font-semibold">
                — يوجد {existingCount} تعديل سابق على هذا الطلب
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-3 text-xs mb-4">
          {STEP_LABELS.map((label, idx) => {
            const s = idx + 1;
            return (
              <span key={s} className="flex items-center gap-1">
                <span
                  className={`w-5 h-5 rounded-full text-center leading-5 text-xs font-bold ${
                    step >= s
                      ? "bg-primary text-white"
                      : "bg-muted text-muted-foreground"
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
              {ORDER_RETURN_EVENT_TYPES.map((t) => {
                const sc = SCENARIO_META[t];
                return (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`text-right px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                      type === t
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    }`}
                  >
                    {sc.label}
                  </button>
                );
              })}
            </div>

            <div>
              <label className="text-sm font-medium">سبب تفصيلي (اختياري)</label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="مثال: العميل رفض لأن الطلب تأخر..."
                className="mt-1"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>إلغاء</Button>
              <Button onClick={goToStep2}>التالي ←</Button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Items + Financial ── */}
        {step === 2 && (
          <div className="space-y-5">
            {/* Items selector */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-semibold">المنتجات المتأثرة:</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => computeSuggestions(selectedItems, type)}
                >
                  إعادة حساب المقترح
                </Button>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-right p-2 font-medium">المنتج</th>
                      <th className="text-center p-2 font-medium">الكمية الكلية</th>
                      <th className="text-center p-2 font-medium">كمية الراجع</th>
                      <th className="text-left p-2 font-medium text-xs text-muted-foreground">COGS/وحدة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item) => {
                      const cost = costMap[item.productId];
                      const cogsUnit = cost
                        ? cost.costPrice + cost.packagingCost + cost.insertCost
                        : null;
                      return (
                        <tr key={item.productId} className="border-t">
                          <td className="p-2 font-medium">{item.productName}</td>
                          <td className="text-center p-2">{item.quantity}</td>
                          <td className="text-center p-2">
                            <input
                              type="number"
                              min={0}
                              max={item.quantity}
                              value={selectedItems[item.productId] ?? 0}
                              onChange={(e) => {
                                const v = Math.min(
                                  item.quantity,
                                  Math.max(0, parseInt(e.target.value) || 0)
                                );
                                setSelectedItems((prev) => ({ ...prev, [item.productId]: v }));
                              }}
                              className="w-16 text-center border rounded p-1 bg-background text-sm"
                            />
                          </td>
                          <td className="p-2 text-left text-muted-foreground text-xs">
                            {cogsUnit !== null ? fmt(cogsUnit) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial fields */}
            <div>
              <p className="text-sm font-semibold mb-3">الأثر المالي (مقترح — قابل للتعديل):</p>
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    { label: "مبلغ الاسترداد للعميل", value: refundAmount, set: setRefundAmount, hint: "مجموع المنتجات المُرجعة" },
                    { label: "خسارة تكلفة التوصيل", value: deliveryCostLoss, set: setDeliveryCostLoss, hint: "رسوم الشحن المدفوعة" },
                    { label: "تكلفة إعادة الشحن", value: returnShippingCost, set: setReturnShippingCost, hint: "إذا وجدت" },
                    { label: "خسارة التغليف", value: packagingLoss, set: setPackagingLoss, hint: "كلفة علب ومواد التغليف" },
                    { label: "شطب المنتج (تلف)", value: productWriteOffAmount, set: setProductWriteOffAmount, hint: "للمنتجات التالفة فقط" },
                    { label: "خسارة COGS", value: cogsLoss, set: setCogsLoss, hint: "تكلفة البضاعة المباعة" },
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">إعادة المخزون؟</label>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    id="restocked-chk"
                    checked={restocked}
                    onChange={(e) => setRestocked(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label htmlFor="restocked-chk" className="text-sm cursor-pointer">
                    نعم، أُعيد المنتج للمخزون
                  </label>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  ملاحظة: لن يُحدَّث المخزون تلقائياً — يُسجَّل للمراجعة فقط
                </p>
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

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">نوع الراجع:</span>
                <span className="font-semibold">
                  {SCENARIO_META[type].label}
                </span>
              </div>

              {reason.trim() && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">السبب:</span>
                  <span>{reason}</span>
                </div>
              )}

              <div className="border-t pt-2 space-y-1">
                <p className="text-xs font-semibold text-muted-foreground mb-1">المنتجات:</p>
                {order.items.filter((i) => (selectedItems[i.productId] ?? 0) > 0).length === 0 ? (
                  <p className="text-sm text-muted-foreground">لا توجد منتجات محددة</p>
                ) : (
                  order.items
                    .filter((i) => (selectedItems[i.productId] ?? 0) > 0)
                    .map((item) => (
                      <div key={item.productId} className="flex justify-between text-sm">
                        <span>
                          {item.productName} × {selectedItems[item.productId]}
                        </span>
                        <span>{fmt(item.price * selectedItems[item.productId])}</span>
                      </div>
                    ))
                )}
              </div>

              <div className="border-t pt-2 space-y-1">
                <p className="text-xs font-semibold text-muted-foreground mb-1">الأثر المالي:</p>
                {(
                  [
                    ["مبلغ الاسترداد", refundAmount],
                    ["خسارة التوصيل", deliveryCostLoss],
                    ["تكلفة إعادة الشحن", returnShippingCost],
                    ["خسارة التغليف", packagingLoss],
                    ["شطب المنتج", productWriteOffAmount],
                    ["خسارة COGS", cogsLoss],
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

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">إعادة مخزون:</span>
                <span>{restocked ? "نعم (للمراجعة)" : "لا"}</span>
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
      </DialogContent>
    </Dialog>
  );
}
