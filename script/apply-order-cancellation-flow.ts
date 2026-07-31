import { readFile, writeFile } from "node:fs/promises";

function replaceOnce(source: string, oldValue: string, newValue: string, label: string): string {
  const first = source.indexOf(oldValue);
  const last = source.lastIndexOf(oldValue);
  if (first === -1 || first !== last) {
    throw new Error(`${label}: expected exactly one source match`);
  }
  return source.replace(oldValue, newValue);
}

/**
 * Transitional source patch for the admin order screen.
 *
 * The production database keeps audited orders immutable and already owns the
 * canonical inventory reversal when an order enters `cancelled`. This patch
 * removes the destructive delete UX, requires a cancellation reason, records a
 * cancellation event, and rejects cancellation after shipping.
 *
 * Idempotent: once the source is patched, later local builds leave it unchanged.
 */
export async function applyOrderCancellationFlow(): Promise<void> {
  const uiPath = "client/src/components/admin/orders-management.tsx";
  const apiPath = "server/routes/admin.ts";

  let ui = await readFile(uiPath, "utf8");
  let api = await readFile(apiPath, "utf8");

  const uiAlreadyPatched = ui.includes("const handleCancelOrder = async () =>") &&
    ui.includes("statusReason: reason") &&
    !ui.includes("setDeleteOrderId");
  const apiAlreadyPatched = api.includes("الإلغاء المباشر مسموح فقط قبل الشحن") &&
    api.includes("statusReason ? { ...updates, statusReason } : updates");

  if (!uiAlreadyPatched) {
    ui = replaceOnce(
      ui,
      'import { Package, Search, Eye, AlertTriangle, Trash2, ReceiptText, RotateCcw } from "lucide-react";',
      'import { Package, Search, Eye, AlertTriangle, XCircle, ReceiptText, RotateCcw } from "lucide-react";',
      "lucide import",
    );

    ui = replaceOnce(
      ui,
      "  AlertDialogAction,\n  AlertDialogCancel,\n",
      "",
      "delete dialog imports",
    );

    ui = replaceOnce(
      ui,
      `  const [rejectOrderId, setRejectOrderId] = useState<string | null>(null);\n  const [rejectStep, setRejectStep] = useState(0);\n  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);\n`,
      `  const [rejectOrderId, setRejectOrderId] = useState<string | null>(null);\n  const [rejectStep, setRejectStep] = useState(0);\n  const [cancelOrder, setCancelOrder] = useState<Order | null>(null);\n  const [cancelReason, setCancelReason] = useState("");\n  const [cancelSubmitting, setCancelSubmitting] = useState(false);\n`,
      "cancellation state",
    );

    ui = replaceOnce(
      ui,
      `  const handleDeleteOrder = async () => {\n    if (!deleteOrderId) return;\n    try {\n      const response = await fetch(\`/api/admin/orders/\${deleteOrderId}\`, {\n        method: "DELETE",\n        headers: addCsrfHeader({}),\n        credentials: "include",\n      });\n      if (!response.ok) throw new Error("فشل الحذف");\n      setOrders((prev) => prev.filter((o) => o.id !== deleteOrderId));\n      toast({ title: "تم الحذف", description: "تم حذف الطلب بنجاح" });\n    } catch {\n      toast({ title: "خطأ", description: "فشل حذف الطلب", variant: "destructive" });\n    } finally {\n      setDeleteOrderId(null);\n    }\n  };\n`,
      `  const handleCancelOrder = async () => {\n    if (!cancelOrder) return;\n    const reason = cancelReason.trim();\n    if (reason.length < 3) {\n      toast({ title: "السبب مطلوب", description: "اكتب سبب الإلغاء بثلاثة أحرف على الأقل", variant: "destructive" });\n      return;\n    }\n\n    setCancelSubmitting(true);\n    try {\n      const response = await fetch(\`/api/admin/orders/\${cancelOrder.id}\`, {\n        method: "PUT",\n        headers: addCsrfHeader({ "Content-Type": "application/json" }),\n        credentials: "include",\n        body: JSON.stringify({ status: "cancelled", statusReason: reason }),\n      });\n\n      if (!response.ok) {\n        const errData = await response.json().catch(() => ({}));\n        throw new Error(errData.message || "فشل إلغاء الطلب");\n      }\n\n      const eventResponse = await fetch("/api/admin/accounting/return-events", {\n        method: "POST",\n        headers: addCsrfHeader({ "Content-Type": "application/json" }),\n        credentials: "include",\n        body: JSON.stringify({\n          orderId: cancelOrder.id,\n          type: "cancelled_before_shipping",\n          reason,\n          refundAmount: 0,\n          deliveryCostLoss: 0,\n          returnShippingCost: 0,\n          packagingLoss: 0,\n          productWriteOffAmount: 0,\n          cogsLoss: 0,\n          restocked: true,\n          affectedItems: cancelOrder.items.map((item) => ({\n            productId: item.productId,\n            qty: item.quantity,\n            priceAtPurchase: Number(item.priceAtPurchase ?? item.price ?? 0),\n            cogsAtTime: 0,\n          })),\n          note: \`إلغاء بطلب الزبون: \${reason}\`,\n        }),\n      });\n\n      if (!eventResponse.ok) {\n        toast({\n          title: "تم إلغاء الطلب",\n          description: "أُلغي الطلب ورجع المخزون، لكن تعذر حفظ ملاحظة الإلغاء في سجل الراجعات",\n          variant: "destructive",\n        });\n      } else {\n        toast({ title: "تم إلغاء الطلب", description: "تم حفظ السبب وإرجاع الكمية للمخزون" });\n      }\n\n      setCancelOrder(null);\n      setCancelReason("");\n      await fetchOrders();\n    } catch (error: any) {\n      toast({ title: "خطأ", description: error.message || "فشل إلغاء الطلب", variant: "destructive" });\n    } finally {\n      setCancelSubmitting(false);\n    }\n  };\n`,
      "delete handler",
    );

    ui = replaceOnce(
      ui,
      `                        <Button\n                          variant="ghost"\n                          size="sm"\n                          className="text-red-400 hover:text-red-300 hover:bg-red-900/30"\n                          onClick={() => setDeleteOrderId(order.id)}\n                        >\n                          <Trash2 className="h-4 w-4" />\n                        </Button>\n`,
      `                        {["pending", "confirmed", "processing"].includes(order.status) && (\n                          <Button\n                            variant="outline"\n                            size="sm"\n                            className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950/30"\n                            title="إلغاء الطلب قبل الشحن"\n                            onClick={() => { setCancelOrder(order); setCancelReason(""); }}\n                          >\n                            <XCircle className="h-4 w-4 ml-1" />\n                            إلغاء الطلب\n                          </Button>\n                        )}\n`,
      "delete button",
    );

    ui = replaceOnce(
      ui,
      `                        {order.status === 'returned' && (\n                          <span className="text-purple-600 font-bold px-3 py-1 border border-purple-200 rounded-md bg-purple-50">تم الاسترجاع 📦</span>\n                        )}\n`,
      `                        {order.status === 'returned' && (\n                          <span className="text-purple-600 font-bold px-3 py-1 border border-purple-200 rounded-md bg-purple-50">تم الاسترجاع 📦</span>\n                        )}\n\n                        {order.status === 'cancelled' && (\n                          <span className="text-gray-600 font-bold px-3 py-1 border border-gray-200 rounded-md bg-gray-50">ملغي بطلب الزبون</span>\n                        )}\n`,
      "cancelled row label",
    );

    ui = replaceOnce(
      ui,
      `      {/* Delete Order AlertDialog */}\n      <AlertDialog open={!!deleteOrderId} onOpenChange={(open) => { if (!open) setDeleteOrderId(null); }}>\n        <AlertDialogContent className="bg-[#0d1f3c] border-[#1e3a5f]">\n          <AlertDialogHeader>\n            <AlertDialogTitle className="text-white">تأكيد حذف الطلب</AlertDialogTitle>\n            <AlertDialogDescription className="text-gray-400">\n              هل تريد حذف هذا الطلب نهائياً؟ هذا الإجراء لا يمكن التراجع عنه.\n            </AlertDialogDescription>\n          </AlertDialogHeader>\n          <AlertDialogFooter>\n            <AlertDialogCancel className="border-[#1e3a5f] text-gray-300">إلغاء</AlertDialogCancel>\n            <AlertDialogAction\n              className="bg-red-600 hover:bg-red-700 text-white"\n              onClick={handleDeleteOrder}\n            >\n              حذف نهائي\n            </AlertDialogAction>\n          </AlertDialogFooter>\n        </AlertDialogContent>\n      </AlertDialog>\n`,
      `      {/* Cancel Order AlertDialog — preserves the order and audit trail */}\n      <AlertDialog open={!!cancelOrder} onOpenChange={(open) => {\n        if (!open && !cancelSubmitting) { setCancelOrder(null); setCancelReason(""); }\n      }}>\n        <AlertDialogContent dir="rtl">\n          <AlertDialogHeader>\n            <AlertDialogTitle className="text-red-600">إلغاء الطلب قبل الشحن</AlertDialogTitle>\n            <AlertDialogDescription className="text-base leading-relaxed">\n              الطلب سيبقى محفوظاً كسجل، ولن يدخل ضمن المبيعات أو الأرباح. الكمية المحجوزة ستعود للمخزون تلقائياً.\n            </AlertDialogDescription>\n          </AlertDialogHeader>\n          <div className="space-y-2">\n            <label className="text-sm font-medium">سبب الإلغاء</label>\n            <Input\n              value={cancelReason}\n              onChange={(e) => setCancelReason(e.target.value)}\n              placeholder="مثال: الزبون اتصل وطلب إلغاء الطلب"\n              disabled={cancelSubmitting}\n              autoFocus\n            />\n            <p className="text-xs text-muted-foreground">السبب يُحفظ ضمن سجل الطلب والراجعات.</p>\n          </div>\n          <AlertDialogFooter className="flex gap-2">\n            <Button\n              variant="outline"\n              disabled={cancelSubmitting}\n              onClick={() => { setCancelOrder(null); setCancelReason(""); }}\n            >\n              تراجع\n            </Button>\n            <Button\n              variant="destructive"\n              disabled={cancelSubmitting || cancelReason.trim().length < 3}\n              onClick={handleCancelOrder}\n            >\n              {cancelSubmitting ? "جاري الإلغاء..." : "تأكيد إلغاء الطلب"}\n            </Button>\n          </AlertDialogFooter>\n        </AlertDialogContent>\n      </AlertDialog>\n`,
      "delete dialog",
    );

    await writeFile(uiPath, ui, "utf8");
  }

  if (!apiAlreadyPatched) {
    api = replaceOnce(
      api,
      `            const { id } = req.params as { id: string };\n            const updates = adminOrderUpdateSchema.parse(req.body);\n            const previousOrder = await storage.getOrder(id);\n            const order = await storage.updateOrder(id, updates);\n`,
      `            const { id } = req.params as { id: string };\n            const updates = adminOrderUpdateSchema.parse(req.body);\n            const statusReason = typeof (req.body as any)?.statusReason === "string"\n                ? (req.body as any).statusReason.trim()\n                : "";\n            const previousOrder = await storage.getOrder(id);\n\n            if (!previousOrder) {\n                res.status(404).json({ message: "الطلب غير موجود" });\n                return;\n            }\n\n            if (updates.status === "cancelled") {\n                if (statusReason.length < 3) {\n                    res.status(400).json({ message: "سبب إلغاء الطلب مطلوب" });\n                    return;\n                }\n                if (!["pending", "confirmed", "processing"].includes(previousOrder.status)) {\n                    res.status(409).json({\n                        message: "الإلغاء المباشر مسموح فقط قبل الشحن. بعد الشحن استخدم رفض الاستلام أو الاسترجاع.",\n                    });\n                    return;\n                }\n            }\n\n            const order = await storage.updateOrder(id, updates);\n`,
      "admin cancellation guard",
    );

    api = replaceOnce(
      api,
      "                    changes: updates\n",
      "                    changes: statusReason ? { ...updates, statusReason } : updates\n",
      "audit cancellation reason",
    );

    api = replaceOnce(
      api,
      `        } catch (err) {\n            next(err);\n        }\n    });\n\n    // Users\n`,
      `        } catch (err) {\n            const message = err instanceof Error ? err.message : "";\n            if (message.includes("is audited") || message.includes("cannot be removed or detached")) {\n                res.status(409).json({\n                    success: false,\n                    message: "لا يمكن حذف هذا الطلب لأنه مرتبط بسجلات المخزون أو المحاسبة. استخدم إلغاء الطلب بدلاً من الحذف.",\n                });\n                return;\n            }\n            next(err);\n        }\n    });\n\n    // Users\n`,
      "hard-delete conflict response",
    );

    await writeFile(apiPath, api, "utf8");
  }

  console.log("Applied safe order cancellation flow.");
}
