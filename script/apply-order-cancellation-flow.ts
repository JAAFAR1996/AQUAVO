import { readFile, writeFile } from "node:fs/promises";

function replaceOnce(source: string, oldValue: string, newValue: string, label: string): string {
  const first = source.indexOf(oldValue);
  const last = source.lastIndexOf(oldValue);
  if (first === -1 || first !== last) {
    throw new Error(`${label}: expected exactly one source match`);
  }
  return source.replace(oldValue, newValue);
}

function replacePattern(source: string, pattern: RegExp, replacement: string, label: string): string {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  const matches = source.match(new RegExp(pattern.source, flags)) ?? [];
  if (matches.length !== 1) {
    throw new Error(`${label}: expected exactly one pattern match, found ${matches.length}`);
  }
  return source.replace(pattern, replacement);
}

/**
 * Transitional source patch for the admin order screen.
 *
 * The production database keeps audited orders immutable and owns canonical,
 * idempotent inventory reversal when an order enters `cancelled`. This patch
 * replaces destructive deletion with a validated pre-shipping cancellation and
 * records the cancellation event in the same database transaction.
 *
 * Idempotent: once the source is patched, later builds leave it unchanged.
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
    api.includes("orderReturnEvents") &&
    api.includes("const { statusReason, ...updates } = parsedUpdates");

  if (!uiAlreadyPatched) {
    ui = replaceOnce(
      ui,
      'import { Package, Search, Eye, AlertTriangle, Trash2, ReceiptText, RotateCcw } from "lucide-react";',
      'import { Package, Search, Eye, AlertTriangle, XCircle, ReceiptText, RotateCcw } from "lucide-react";',
      "lucide import",
    );

    ui = replaceOnce(ui, "  AlertDialogAction,\n  AlertDialogCancel,\n", "", "delete dialog imports");

    ui = replaceOnce(
      ui,
      `  const [rejectOrderId, setRejectOrderId] = useState<string | null>(null);\n  const [rejectStep, setRejectStep] = useState(0);\n  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);\n`,
      `  const [rejectOrderId, setRejectOrderId] = useState<string | null>(null);\n  const [rejectStep, setRejectStep] = useState(0);\n  const [cancelOrder, setCancelOrder] = useState<Order | null>(null);\n  const [cancelReason, setCancelReason] = useState("");\n  const [cancelSubmitting, setCancelSubmitting] = useState(false);\n`,
      "cancellation state",
    );

    ui = replacePattern(
      ui,
      /  const handleDeleteOrder = async \(\) => \{[\s\S]*?\n  \};\n\n  \/\/ Triple confirmation rejection/,
      `  const handleCancelOrder = async () => {\n    if (!cancelOrder) return;\n    const reason = cancelReason.trim();\n    if (reason.length < 3) {\n      toast({ title: "السبب مطلوب", description: "اكتب سبب الإلغاء بثلاثة أحرف على الأقل", variant: "destructive" });\n      return;\n    }\n\n    setCancelSubmitting(true);\n    try {\n      const response = await fetch(\`/api/admin/orders/\${cancelOrder.id}\`, {\n        method: "PUT",\n        headers: addCsrfHeader({ "Content-Type": "application/json" }),\n        credentials: "include",\n        body: JSON.stringify({ status: "cancelled", statusReason: reason }),\n      });\n\n      const payload = await response.json().catch(() => ({}));\n      if (!response.ok) {\n        throw new Error(typeof payload.message === "string" ? payload.message : "فشل إلغاء الطلب");\n      }\n\n      toast({ title: "تم إلغاء الطلب", description: "انحفظ السبب ورجعت الكمية للمخزون" });\n      setCancelOrder(null);\n      setCancelReason("");\n      await fetchOrders();\n    } catch (error: unknown) {\n      const message = error instanceof Error ? error.message : "فشل إلغاء الطلب";\n      toast({ title: "خطأ", description: message, variant: "destructive" });\n    } finally {\n      setCancelSubmitting(false);\n    }\n  };\n\n  // Triple confirmation rejection`,
      "delete handler",
    );

    ui = replacePattern(
      ui,
      /                        <Button\n                          variant="ghost"[\s\S]*?onClick=\{\(\) => setDeleteOrderId\(order\.id\)\}[\s\S]*?<\/Button>\n/,
      `                        {["pending", "confirmed", "processing"].includes(order.status) && (\n                          <Button\n                            variant="outline"\n                            size="sm"\n                            className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950/30"\n                            title="إلغاء الطلب قبل الشحن"\n                            onClick={() => { setCancelOrder(order); setCancelReason(""); }}\n                          >\n                            <XCircle className="h-4 w-4 ml-1" />\n                            إلغاء الطلب\n                          </Button>\n                        )}\n`,
      "delete button",
    );

    ui = replaceOnce(
      ui,
      `                        {order.status === 'returned' && (\n                          <span className="text-purple-600 font-bold px-3 py-1 border border-purple-200 rounded-md bg-purple-50">تم الاسترجاع 📦</span>\n                        )}\n`,
      `                        {order.status === 'returned' && (\n                          <span className="text-purple-600 font-bold px-3 py-1 border border-purple-200 rounded-md bg-purple-50">تم الاسترجاع</span>\n                        )}\n\n                        {order.status === 'cancelled' && (\n                          <span className="text-gray-600 font-bold px-3 py-1 border border-gray-200 rounded-md bg-gray-50">ملغي بطلب الزبون</span>\n                        )}\n`,
      "cancelled row label",
    );

    ui = replacePattern(
      ui,
      /      \{\/\* Delete Order AlertDialog \*\/\}[\s\S]*?      \{\/\* Return Adjustment Modal \*\/\}/,
      `      {/* Cancel Order AlertDialog — preserves the order and audit trail */}\n      <AlertDialog open={!!cancelOrder} onOpenChange={(open) => {\n        if (!open && !cancelSubmitting) { setCancelOrder(null); setCancelReason(""); }\n      }}>\n        <AlertDialogContent dir="rtl" className="bg-[#0d1f3c] border-[#1e3a5f]">\n          <AlertDialogHeader>\n            <AlertDialogTitle className="text-white">إلغاء الطلب قبل الشحن</AlertDialogTitle>\n            <AlertDialogDescription className="text-gray-300 text-base leading-relaxed">\n              الطلب يبقى محفوظ بالسجل، وما ينحسب ضمن المبيعات أو الربح. الكمية ترجع للمخزون تلقائياً.\n            </AlertDialogDescription>\n          </AlertDialogHeader>\n          <div className="space-y-2">\n            <label className="text-sm font-medium text-white">سبب الإلغاء</label>\n            <Input\n              value={cancelReason}\n              onChange={(e) => setCancelReason(e.target.value)}\n              placeholder="مثال: الزبون اتصل وكال ما يريد الطلب"\n              disabled={cancelSubmitting}\n              autoFocus\n              className="bg-[#102746] border-[#1e3a5f] text-white placeholder:text-gray-500"\n            />\n            <p className="text-xs text-gray-400">السبب ينحفظ بسجل الطلب.</p>\n          </div>\n          <AlertDialogFooter className="flex gap-2">\n            <Button\n              variant="outline"\n              disabled={cancelSubmitting}\n              onClick={() => { setCancelOrder(null); setCancelReason(""); }}\n              className="border-[#1e3a5f] text-gray-200"\n            >\n              رجوع\n            </Button>\n            <Button\n              variant="destructive"\n              disabled={cancelSubmitting || cancelReason.trim().length < 3}\n              onClick={handleCancelOrder}\n            >\n              {cancelSubmitting ? "جاري الإلغاء..." : "تأكيد الإلغاء"}\n            </Button>\n          </AlertDialogFooter>\n        </AlertDialogContent>\n      </AlertDialog>\n\n      {/* Return Adjustment Modal */}`,
      "delete dialog",
    );

    await writeFile(uiPath, ui, "utf8");
  }

  if (!apiAlreadyPatched) {
    api = replaceOnce(
      api,
      'import { sql, eq, desc, gte, and, count, sum } from "drizzle-orm";',
      'import { sql, eq, desc, gte, and, count, sum, inArray } from "drizzle-orm";',
      "drizzle import",
    );

    api = replaceOnce(
      api,
      `    favorites, reviews, churnPredictions, customerProfiles, products,\n} from "../../shared/schema.js";`,
      `    favorites, reviews, churnPredictions, customerProfiles, products, orderReturnEvents,\n} from "../../shared/schema.js";`,
      "return-event schema import",
    );

    api = replaceOnce(
      api,
      `    financiallyCounted: z.boolean().nullable().optional(),\n}).strip();`,
      `    financiallyCounted: z.boolean().nullable().optional(),\n    statusReason: z.string().trim().min(3).max(500).optional(),\n}).strip();`,
      "status reason schema",
    );

    api = replaceOnce(
      api,
      `            const { id } = req.params as { id: string };\n            const updates = adminOrderUpdateSchema.parse(req.body);\n            const previousOrder = await storage.getOrder(id);\n            const order = await storage.updateOrder(id, updates);\n`,
      `            const { id } = req.params as { id: string };\n            const parsedUpdates = adminOrderUpdateSchema.parse(req.body);\n            const { statusReason, ...updates } = parsedUpdates;\n            const previousOrder = await storage.getOrder(id);\n\n            if (!previousOrder) {\n                res.status(404).json({ message: "الطلب غير موجود" });\n                return;\n            }\n\n            let order: Awaited<ReturnType<typeof storage.updateOrder>>;\n            if (updates.status === "cancelled") {\n                if (!statusReason) {\n                    res.status(400).json({ message: "سبب إلغاء الطلب مطلوب" });\n                    return;\n                }\n                if (!["pending", "confirmed", "processing"].includes(previousOrder.status)) {\n                    res.status(409).json({\n                        message: "الإلغاء المباشر مسموح فقط قبل الشحن. بعد الشحن استخدم رفض الاستلام أو الاسترجاع.",\n                    });\n                    return;\n                }\n\n                const db = getDb();\n                if (!db) {\n                    res.status(503).json({ message: "قاعدة البيانات غير مهيأة" });\n                    return;\n                }\n\n                order = await db.transaction(async (tx) => {\n                    const [updated] = await tx\n                        .update(orders)\n                        .set({ status: "cancelled", updatedAt: new Date() })\n                        .where(and(\n                            eq(orders.id, id),\n                            inArray(orders.status, ["pending", "confirmed", "processing"]),\n                        ))\n                        .returning();\n\n                    if (!updated) return undefined;\n\n                    await tx.insert(orderReturnEvents).values({\n                        orderId: id,\n                        type: "cancelled_before_shipping",\n                        reason: statusReason,\n                        refundAmount: "0",\n                        deliveryCostLoss: "0",\n                        returnShippingCost: "0",\n                        packagingLoss: "0",\n                        productWriteOffAmount: "0",\n                        cogsLoss: "0",\n                        restocked: true,\n                        affectedItems: null,\n                        status: "recorded",\n                        note: \`إلغاء بطلب الزبون: \${statusReason}\`,\n                        createdBy: (req as Request & { session?: { userId?: string } }).session?.userId ?? null,\n                    });\n\n                    return updated;\n                });\n\n                if (!order) {\n                    res.status(409).json({ message: "حالة الطلب تغيرت. حدّث الصفحة وحاول مرة ثانية." });\n                    return;\n                }\n            } else {\n                order = await storage.updateOrder(id, updates);\n            }\n`,
      "atomic cancellation route",
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
