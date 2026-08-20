import { Router, type Request, type Response } from "express";
import { requireAdmin } from "../middleware/auth.js";
import { loadDashboardTruth } from "../services/dashboard-truth.js";

const router = Router();

router.get("/dashboard-insights", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const data = await loadDashboardTruth();
    res.set("Cache-Control", "no-store, private");
    return res.json({ success: true, data });
  } catch (error) {
    console.error("[Pricing Truth] Dashboard verification failed:", error);
    return res.status(500).json({
      success: false,
      error: "تعذر التحقق من البيانات المباشرة؛ لم يتم عرض رقم قديم أو تقديري.",
    });
  }
});

router.post("/dashboard-chat", requireAdmin, async (req: Request, res: Response) => {
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  if (!message) return res.status(400).json({ success: false, error: "الرسالة مطلوبة" });

  try {
    const truth = await loadDashboardTruth();
    const normalized = message.toLowerCase();
    const asksInventory = ["مخزون", "تكلفة", "كلفة", "رأس المال", "راس المال"].some((term) => normalized.includes(term));
    const asksToday = ["اليوم", "مبيعات اليوم", "ايرادات اليوم", "إيرادات اليوم"].some((term) => normalized.includes(term));
    const asksWeek = ["الأسبوع", "الاسبوع", "هذا الأسبوع", "هذا الاسبوع"].some((term) => normalized.includes(term));
    const asksTop = ["أفضل منتج", "افضل منتج", "الأكثر مبيع", "الاكثر مبيع"].some((term) => normalized.includes(term));
    const asksRevenue = ["مبيعات", "ايراد", "إيراد", "ارباح", "أرباح", "ربح"].some((term) => normalized.includes(term));

    let response: string;
    if (asksInventory) {
      const missingUnits = truth.inventory.missingVariantCostUnits + truth.inventory.missingNonVariantCostUnits;
      const completeness = truth.inventory.purchaseCostComplete
        ? "وكل تكاليف الوحدات والخيارات الحالية موثقة."
        : `وهو مجموع موثّق جزئياً؛ ${missingUnits.toLocaleString("en-US")} وحدة ما زالت بلا تكلفة مثبتة.`;
      response =
        `تكلفة شراء المخزون المثبتة ${truth.inventory.purchaseCostValue.toLocaleString("en-US")} د.ع. ${completeness} ` +
        `المخزون المنخفض ${truth.inventory.lowStock} والنافد ${truth.inventory.outOfStock}.`;
    } else if (asksToday) {
      response =
        `إيراد اليوم المثبت ${truth.today.createdAndDeliveredRevenue.toLocaleString("en-US")} د.ع من ` +
        `${truth.today.createdAndDeliveredOrders} طلبات موصلة لها دليل دفع مكتمل.`;
    } else if (asksWeek) {
      response =
        `خلال آخر 7 أيام: ${truth.week.deliveredOrders} طلبات موصلة مثبتة الدفع بقيمة ` +
        `${truth.week.realizedRevenue.toLocaleString("en-US")} د.ع، ويوجد حالياً ${truth.orders.activeNow} طلب نشط.`;
    } else if (asksTop) {
      const top = truth.topProducts[0];
      response = top
        ? `الأكثر مبيعاً بآخر 30 يوم بين الطلبات الموصلة هو «${top.name}» بعدد ${top.units} وحدة.`
        : "ماكو بيانات موصلة كافية خلال آخر 30 يوم حتى نحدد المنتج الأكثر مبيعاً.";
    } else if (asksRevenue) {
      response =
        `الإيراد المثبت لآخر 30 يوم ${truth.orders.realizedRevenueInPeriod.toLocaleString("en-US")} د.ع من ` +
        `${truth.orders.financiallyVerifiedDeliveredInPeriod} طلبات موصلة لها دليل دفع مكتمل. ` +
        `${truth.orders.deliveredAwaitingPaymentEvidenceInPeriod} طلبات موصلة ما دخلت بالإيراد لعدم وجود إثبات قبض مكتمل.`;
    } else {
      response =
        `ملخص آخر 30 يوم: ${truth.orders.deliveredInPeriod} طلبات موصلة، ` +
        `${truth.orders.realizedRevenueInPeriod.toLocaleString("en-US")} د.ع إيراد مثبت، ` +
        `${truth.orders.activeNow} طلب نشط، ${truth.inventory.lowStock} مخزون منخفض و${truth.inventory.outOfStock} نافد.`;
    }

    return res.json({
      success: true,
      data: {
        response,
        generatedAt: truth.generatedAt,
        definitions: truth.definitions,
      },
      response,
      source: "verified_live_database",
      generatedAt: truth.generatedAt,
    });
  } catch (error) {
    console.error("[Pricing Truth] Chat verification failed:", error);
    return res.status(500).json({ success: false, error: "تعذر التحقق من البيانات؛ لم يتم إنشاء جواب تقديري." });
  }
});

export default router;
