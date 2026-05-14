import express, { type Request, type Response, type NextFunction } from "express";
import { requireAdmin, getSession } from "../middleware/auth.js";
import { invoiceStorage } from "../storage/invoice-storage.js";
import { insertManualInvoiceSchema } from "../../shared/schema.js";
import { z } from "zod";

const router = express.Router();
router.use(requireAdmin);

/** GET /api/admin/invoices — قائمة كل الفواتير */
router.get("/", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const status = req.query.status as string | undefined;
    const invoices = await invoiceStorage.listInvoices(status as any);
    res.json({ success: true, data: invoices });
  } catch (err) { next(err); }
});

/** GET /api/admin/invoices/stats — إحصائيات */
router.get("/stats", async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const stats = await invoiceStorage.getStats();
    res.json({ success: true, data: stats });
  } catch (err) { next(err); }
});

/** GET /api/admin/invoices/:id — فاتورة واحدة */
router.get("/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const inv = await invoiceStorage.getById(req.params.id);
    if (!inv) { res.status(404).json({ success: false, message: "الفاتورة غير موجودة" }); return; }
    res.json({ success: true, data: inv });
  } catch (err) { next(err); }
});

/** POST /api/admin/invoices — إنشاء فاتورة جديدة */
router.post("/", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = insertManualInvoiceSchema.parse(req.body);
    const userId = getSession(req)?.userId;
    const inv = await invoiceStorage.create(data, userId);
    res.status(201).json({ success: true, data: inv });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      res.status(400).json({ success: false, message: "بيانات غير صحيحة", errors: err.errors });
      return;
    }
    next(err);
  }
});

/** PATCH /api/admin/invoices/:id — تعديل فاتورة (draft فقط) */
router.patch("/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const inv = await invoiceStorage.update(req.params.id, req.body);
    if (!inv) { res.status(400).json({ success: false, message: "لا يمكن تعديل هذه الفاتورة" }); return; }
    res.json({ success: true, data: inv });
  } catch (err) { next(err); }
});

/** POST /api/admin/invoices/:id/send — إرسال الفاتورة للعميل */
router.post("/:id/send", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const inv = await invoiceStorage.send(req.params.id);
    if (!inv) { res.status(400).json({ success: false, message: "لا يمكن إرسال هذه الفاتورة" }); return; }

    // رابط العميل
    const baseUrl = process.env.APP_URL || "https://www.aquavoiq.com";
    const customerLink = `${baseUrl}/invoice/${inv.token}`;

    // رسالة واتساب جاهزة
    const whatsappText = encodeURIComponent(
      `مرحباً ${inv.customerName} 👋\n\n` +
      `هذه فاتورتك من AQUAVO 🐟\n` +
      `رقم الفاتورة: ${inv.invoiceNo}\n` +
      `الإجمالي: ${Number(inv.total).toLocaleString("en-US")} د.ع\n\n` +
      `لمراجعة الفاتورة وتأكيد طلبك:\n${customerLink}\n\n` +
      `(الرابط صالح لمدة 48 ساعة)`
    );
    const whatsappUrl = `https://wa.me/${inv.customerPhone.replace(/[^0-9]/g, "")}?text=${whatsappText}`;

    res.json({ success: true, data: inv, customerLink, whatsappUrl });
  } catch (err) { next(err); }
});

/** POST /api/admin/invoices/:id/cancel — إلغاء فاتورة */
router.post("/:id/cancel", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const inv = await invoiceStorage.cancel(req.params.id);
    if (!inv) { res.status(400).json({ success: false, message: "لا يمكن إلغاء هذه الفاتورة" }); return; }
    res.json({ success: true, data: inv });
  } catch (err) { next(err); }
});

/** DELETE /api/admin/invoices/:id — حذف نهائي */
router.delete("/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const deleted = await invoiceStorage.deleteById(req.params.id);
    if (!deleted) {
      res.status(404).json({ success: false, message: "الفاتورة غير موجودة" });
      return;
    }
    res.json({ success: true });
  } catch (err) { next(err); }
});

export function createAdminInvoicesRouter() {
  return router;
}
