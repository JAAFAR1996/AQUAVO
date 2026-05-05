import express, { type Request, type Response, type NextFunction } from "express";
import { invoiceStorage } from "../storage/invoice-storage.js";

const router = express.Router();

/** GET /api/invoice/:token — جلب الفاتورة للعميل */
router.get("/:token", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const inv = await invoiceStorage.getByToken(req.params.token);
    if (!inv) { res.status(404).json({ success: false, message: "الفاتورة غير موجودة أو انتهت صلاحيتها" }); return; }

    // Check expiry for sent invoices
    if (inv.status === "sent" && inv.expiresAt && new Date() > new Date(inv.expiresAt)) {
      res.status(410).json({ success: false, message: "انتهت صلاحية هذه الفاتورة", status: "expired" });
      return;
    }

    // Return public-safe fields (no admin-only data)
    res.json({
      success: true,
      data: {
        invoiceNo:       inv.invoiceNo,
        customerName:    inv.customerName,
        customerCity:    inv.customerCity,
        items:           inv.items,
        subtotal:        Number(inv.subtotal),
        discount:        Number(inv.discount),
        delivery:        Number(inv.delivery),
        total:           Number(inv.total),
        status:          inv.status,
        createdAt:       inv.createdAt,
        expiresAt:       inv.expiresAt,
        confirmedAt:     inv.confirmedAt,
        rejectedAt:      inv.rejectedAt,
        orderId:         inv.orderId,
      },
    });
  } catch (err) { next(err); }
});

/** POST /api/invoice/:token/confirm — تأكيد العميل */
router.post("/:token/confirm", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { invoice, orderId } = await invoiceStorage.confirm(req.params.token);
    res.json({
      success: true,
      message: "تم تأكيد طلبك بنجاح! شكراً لك 🎉",
      orderId,
      invoiceNo: invoice.invoiceNo,
    });
  } catch (err: any) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
});

/** POST /api/invoice/:token/reject — رفض العميل */
router.post("/:token/reject", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const inv = await invoiceStorage.reject(req.params.token);
    res.json({ success: true, message: "تم تسجيل رفضك. شكراً على ردك.", invoiceNo: inv.invoiceNo });
  } catch (err: any) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
});

export function createInvoiceRouter() {
  return router;
}
