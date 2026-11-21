import { z } from "zod";
import express, { type Request, type Response, type NextFunction } from "express";
import { requireAdmin, getSession } from "../middleware/auth.js";
import { invoiceStorage } from "../storage/invoice-storage.js";
import { insertManualInvoiceSchema, updateManualInvoiceSchema } from "../../shared/schema.js";
import { manualInvoiceShare } from "../services/manual-invoice-share.js";
import { storage } from "../storage/index.js";
import { toInvoiceProductDisplay } from "../../shared/public-product.js";

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

/** GET /api/admin/invoices/product-search — أسماء المنتجات بالعربي دائماً.
 * Search all supported catalogue languages; return public-safe canonical rows only.
 */
router.get("/product-search", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (!query || query.length > 100) {
      res.status(400).json({ products: [], message: "اكتب كلمة بحث صحيحة" });
      return;
    }
    const products = await storage.getProducts({ search: query, searchAllLocales: true, limit: 15 });
    res.set("Cache-Control", "no-store, private");
    // This router is admin-only: private invoice stock remains selectable,
    // while cost fields still never enter the picker response.
    res.json({ products: products.map(toInvoiceProductDisplay).filter(Boolean) });
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
    const key = z.string().uuid().optional().parse(req.get("Idempotency-Key"));
    const inv = await invoiceStorage.create(data, userId, key);
    res.status(201).json({ success: true, data: inv });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      res.status(400).json({ success: false, message: "بيانات غير صحيحة", errors: err.issues });
      return;
    }
    next(err);
  }
});

/** PATCH /api/admin/invoices/:id — تعديل فاتورة (draft فقط) */
router.patch("/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = updateManualInvoiceSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: "بيانات غير صحيحة", errors: parsed.error.issues });
      return;
    }
    const inv = await invoiceStorage.update(req.params.id, parsed.data);
    if (!inv) { res.status(400).json({ success: false, message: "لا يمكن تعديل هذه الفاتورة" }); return; }
    res.json({ success: true, data: inv });
  } catch (err) { next(err); }
});

/** POST /api/admin/invoices/:id/send — إرسال الفاتورة للعميل */
router.post("/:id/send", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const inv = await invoiceStorage.send(req.params.id);
    if (!inv) { res.status(400).json({ success: false, message: "لا يمكن إرسال هذه الفاتورة" }); return; }

    const { customerLink, whatsappUrl } = manualInvoiceShare(inv, process.env.APP_URL || "https://www.aquavoiq.com");
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
