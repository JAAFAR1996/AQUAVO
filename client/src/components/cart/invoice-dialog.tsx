import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Phone, MapPin, Calendar, FileText, Printer, Share2, CheckCircle2, MessageCircle } from "lucide-react";
import { formatIQD, formatDate, formatShortDate } from "@/lib/utils";
import { useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { clientEnv } from "@/lib/config/env";
import { DELIVERY_FEE, WHATSAPP_URL } from "@/lib/constants/shipping";
// Local item type — simpler than CartItem, works for order history too
interface InvoiceItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  variantId?: string;
  variantLabel?: string;
}

interface CustomerInfo {
  name: string;
  phone: string;
  address: string;
  notes: string;
}

interface InvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderData: {
    customerInfo: CustomerInfo;
    items: InvoiceItem[];
    total: number;
    subtotal?: number;
    deliveryFee?: number;
    discount?: number;
    roundedTotal?: number;
    cashbackUsed?: number;
    pointsEarned?: number;
    cashbackEarned?: number;
    status?: string;
    orderNumber: string;
    orderDate: Date;
  } | null;
}

export function InvoiceDialog({ open, onOpenChange, orderData }: InvoiceDialogProps) {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // الحسابات — حماية من null
  const grandTotal = orderData?.total ?? 0;
  const roundedTotal = orderData?.roundedTotal ?? grandTotal;
  const cashbackUsed = orderData?.cashbackUsed ?? 0;
  const pointsEarned = orderData?.pointsEarned ?? 0;
  const cashbackEarned = orderData?.cashbackEarned ?? 0;
  const orderStatus = orderData?.status ?? 'pending';

  // ⚠️ roundedTotal من الباكند = ceil((grandTotal - cashbackUsed) / 250) * 250
  // لذلك الباقي = roundedTotal - (grandTotal - cashbackUsed)
  const baseAfterCashback = grandTotal - cashbackUsed;
  const roundingDiff = roundedTotal > baseAfterCashback ? roundedTotal - baseAfterCashback : 0;

  const calculatedSubtotal = orderData?.subtotal ?? (orderData?.items ?? []).reduce(
    (sum, item) => sum + (item.price * item.quantity), 0
  );

  const discount = orderData?.discount ?? 0;
  const inferredDeliveryFee = Math.max(0, grandTotal - calculatedSubtotal + discount);
  const fallbackDeliveryFee = DELIVERY_FEE;
  const deliveryFee = orderData?.deliveryFee ?? (inferredDeliveryFee > 0 ? inferredDeliveryFee : fallbackDeliveryFee);

  // المبلغ اللي يدفعه نقداً = roundedTotal مباشرة (الكاش باك مخصوم قبل التقريب)
  const actualPayAmount = roundedTotal;

  // طباعة الفاتورة فقط — صفحة واحدة نظيفة بدون خلفيات
  const handlePrint = useCallback(() => {
    if (!orderData) return;
    const printWindow = window.open('', '_blank', 'width=600,height=800');
    if (!printWindow) {
      toast({ title: "تعذر فتح نافذة الطباعة", variant: "destructive" });
      return;
    }

    // بناء HTML الفاتورة مباشرة — بدون أي خلفيات ملونة
    const itemsRows = orderData.items.map(item => {
      const productName = item.variantLabel
        ? `${item.name}<div style="font-size:11px;color:#64748b;margin-top:2px;">الخيار: ${item.variantLabel}</div>`
        : item.name;
      return (
      `<tr>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:13px;">${productName}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:13px;">${item.quantity}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:13px;">${formatIQD(item.price)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:left;font-size:13px;font-weight:600;">${formatIQD(item.price * item.quantity)}</td>
      </tr>`
      );
    }).join('');



    let totalsHTML = '';
    // مجموع المنتجات
    totalsHTML += `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;color:#64748b;"><span>مجموع المنتجات:</span><span>${formatIQD(calculatedSubtotal)}</span></div>`;
    // التوصيل
    if (deliveryFee > 0) {
      totalsHTML += `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;color:#64748b;"><span>🚚 التوصيل:</span><span>${formatIQD(deliveryFee)}</span></div>`;
    } else {
      totalsHTML += `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;color:#64748b;"><span>التوصيل:</span><span>${formatIQD(0)}</span></div>`;
    }
    // الخصم
    if (discount > 0) {
      totalsHTML += `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;color:#16a34a;"><span>🎁 خصم الكوبون:</span><span>-${formatIQD(discount)}</span></div>`;
    }
    // الإجمالي (قبل الخصم والتقريب)
    totalsHTML += `<hr style="border:none;border-top:1px solid #e2e8f0;margin:6px 0;">`;
    totalsHTML += `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:14px;font-weight:600;"><span>الإجمالي:</span><span>${formatIQD(grandTotal)}</span></div>`;
    // مدفوع من الباقي
    if (cashbackUsed > 0) {
      totalsHTML += `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;color:#ea580c;"><span>💰 مدفوع من رصيد الباقي:</span><span>-${formatIQD(cashbackUsed)}</span></div>`;
    }
    // التقريب
    if (roundingDiff > 0) {
      totalsHTML += `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px;color:#64748b;"><span>تقريب المبلغ:</span><span>+${formatIQD(roundingDiff)}</span></div>`;
    }

    // مكافآت مكتسبة
    let rewardsHTML = '';
    if (pointsEarned > 0 || cashbackEarned > 0) {
      rewardsHTML = `<div style="background:#fffbeb;padding:10px;border-radius:8px;border:1px solid #fde68a;margin-bottom:12px;">
        <p style="font-size:12px;font-weight:600;color:#92400e;margin-bottom:4px;">🎉 مكافآتك من هذا الطلب</p>
        ${pointsEarned > 0 ? `<div style="display:flex;justify-content:space-between;font-size:12px;color:#92400e;"><span>⭐ نقاط ولاء:</span><span style="font-weight:bold;">+${pointsEarned} نقطة</span></div>` : ''}
        ${cashbackEarned > 0 ? `<div style="display:flex;justify-content:space-between;font-size:12px;color:#92400e;"><span>💰 باقي مضاف:</span><span style="font-weight:bold;">+${formatIQD(cashbackEarned)}</span></div>` : ''}
      </div>`;
    }

    const shortNum = orderData.orderNumber.length > 20 ? orderData.orderNumber.slice(0, 8).toUpperCase() : orderData.orderNumber;

    printWindow.document.write(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>فاتورة AQUAVO - ${orderData.orderNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, sans-serif; direction: rtl; color: #1a1a1a; background: #fff; padding: 24px; font-size: 13px; }
    @media print { body { padding: 12px; } @page { margin: 10mm; size: A4; } }
  </style>
</head>
<body>
  <!-- Header -->
  <div style="border:2px solid #0ea5e9;border-radius:10px;padding:16px;display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
    <div>
      <h1 style="font-size:22px;font-weight:bold;color:#0ea5e9;">AQUAVO</h1>
      <p style="font-size:11px;color:#64748b;">حلول أحواض ومستلزمات الأحواض المائية</p>
    </div>
    <div style="text-align:left;">
      <p style="font-size:10px;color:#64748b;">رقم الطلب</p>
      <p style="font-weight:bold;font-family:monospace;font-size:14px;">${shortNum}</p>
      <p style="font-size:10px;color:#64748b;margin-top:4px;">${formatDate(orderData.orderDate)}</p>
    </div>
  </div>

  <!-- Customer Info -->
  <div style="display:flex;gap:12px;margin-bottom:16px;">
    <div style="flex:1;background:#f8fafc;padding:12px;border-radius:8px;border:1px solid #e2e8f0;">
      <p style="font-size:11px;color:#64748b;font-weight:600;margin-bottom:6px;">معلومات العميل</p>
      ${orderData.customerInfo.name ? `<p style="font-weight:600;">${orderData.customerInfo.name}</p>` : ''}
      ${orderData.customerInfo.phone ? `<p style="color:#64748b;direction:ltr;text-align:right;">📞 ${orderData.customerInfo.phone}</p>` : ''}
      ${orderData.customerInfo.address ? `<p style="color:#64748b;">📍 ${orderData.customerInfo.address}</p>` : ''}
    </div>
  </div>

  <!-- Products Table -->
  <p style="font-weight:600;margin-bottom:8px;">${orderData.items.length} منتجات</p>
  <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
    <thead>
      <tr style="background:#f1f5f9;">
        <th style="padding:8px 10px;text-align:right;font-size:12px;font-weight:600;color:#475569;">المنتج</th>
        <th style="padding:8px 10px;text-align:center;font-size:12px;font-weight:600;color:#475569;">الكمية</th>
        <th style="padding:8px 10px;text-align:center;font-size:12px;font-weight:600;color:#475569;">السعر</th>
        <th style="padding:8px 10px;text-align:left;font-size:12px;font-weight:600;color:#475569;">المجموع</th>
      </tr>
    </thead>
    <tbody>${itemsRows}</tbody>
  </table>

  <!-- Totals -->
  <div style="background:#f8fafc;padding:14px;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:12px;">
    ${totalsHTML}
    <hr style="border:none;border-top:2px solid #0ea5e9;margin:8px 0;">
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <span style="font-size:16px;font-weight:bold;">💵 تدفع نقداً:</span>
      <div style="text-align:left;">
        <p style="font-size:22px;font-weight:bold;color:#0ea5e9;">${formatIQD(actualPayAmount)}</p>
        <p style="font-size:10px;color:#64748b;">الدفع عند الاستلام</p>
      </div>
    </div>
  </div>

  ${rewardsHTML}

  <!-- Footer -->
  <div style="text-align:center;padding:10px;background:#f0f9ff;border-radius:8px;border:1px solid #bae6fd;">
    <p style="font-size:12px;color:#64748b;">للاستفسار عن طلبك تواصل معنا</p>
    <p style="font-weight:600;color:#0ea5e9;direction:ltr;">📞 +964 774 788 0673</p>
  </div>
  <p style="text-align:center;font-size:10px;color:#94a3b8;margin-top:12px;">شكراً لتسوقكم من AQUAVO — www.aquavoiq.com</p>
</body>
</html>`);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
  }, [orderData, toast, grandTotal, roundedTotal, roundingDiff, calculatedSubtotal, deliveryFee, discount, cashbackUsed, pointsEarned, cashbackEarned, actualPayAmount]);

  // Early return AFTER all hooks
  if (!orderData) return null;

  const handleShare = async () => {
    const shareText = `فاتورة AQUAVO
رقم الطلب: ${orderData.orderNumber}
المجموع: ${formatIQD(grandTotal)}
العميل: ${orderData.customerInfo.name}
التاريخ: ${formatShortDate(orderData.orderDate)}
${clientEnv.siteUrl ? `الرابط: ${clientEnv.siteUrl}` : ""}`.trim();

    if (navigator.share) {
      try {
        await navigator.share({
          title: `AQUAVO - ${orderData.orderNumber}`,
          text: shareText,
          url: clientEnv.siteUrl || undefined,
        });
      } catch {
        toast({ title: "تم إلغاء المشاركة", description: "لم نتمكن من مشاركة هذه الفاتورة." });
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        toast({ title: "تم النسخ", description: "تم نسخ تفاصيل الفاتورة للحافظة." });
      } catch {
        toast({
          title: "المشاركة غير متاحة",
          description: "النسخ للحافظة غير متاح في هذا المتصفح.",
          variant: "destructive",
        });
      }
    }
  };

  const shortOrderNumber = orderData.orderNumber.length > 20
    ? orderData.orderNumber.slice(0, 8).toUpperCase()
    : orderData.orderNumber;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[95vh] overflow-y-auto p-0" aria-describedby="invoice-description">
        <VisuallyHidden>
          <DialogTitle>فاتورة الطلب</DialogTitle>
          <DialogDescription id="invoice-description">تفاصيل الفاتورة والطلب</DialogDescription>
        </VisuallyHidden>
        <div ref={invoiceRef}>
          {/* Header */}
          <div className="invoice-header bg-gradient-to-br from-primary via-primary to-blue-600 text-primary-foreground p-6 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                  <img src="/logo_aquavo_icon.png" alt="Logo" className="h-10 w-10 object-contain" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">AQUAVO</h1>
                  <p className="text-sm opacity-80">حلول أحواض ومستلزمات الأحواض المائية</p>
                </div>
              </div>
              <div className="text-left">
                <div className="invoice-number-box bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                  <p className="text-xs opacity-80">رقم الطلب</p>
                  <p className="font-mono font-bold text-sm">{shortOrderNumber}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Success */}
            <div className="success-bar flex items-center justify-center gap-2 text-green-600 bg-green-50 dark:bg-green-950/30 rounded-lg py-3">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-semibold">تم استلام طلبك بنجاح!</span>
            </div>

            {/* Customer & Order Info */}
            <div className="info-grid grid sm:grid-cols-2 gap-4">
              <div className="info-box bg-muted/30 rounded-xl p-4 space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                  معلومات العميل
                </h3>
                <div className="space-y-1.5 text-sm">
                  {orderData.customerInfo.name && (
                    <p className="font-medium">{orderData.customerInfo.name}</p>
                  )}
                  {orderData.customerInfo.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      <span dir="ltr">{orderData.customerInfo.phone}</span>
                    </div>
                  )}
                  {orderData.customerInfo.address && (
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                      <span>{orderData.customerInfo.address}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="info-box bg-muted/30 rounded-xl p-4 space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  تفاصيل الطلب
                </h3>
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{formatDate(orderData.orderDate)}</span>
                  </div>
                  <div>
                    <span className="status-badge inline-block bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded-full px-3 py-0.5 text-xs font-medium">
                      قيد الانتظار
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Products Table */}
            {orderData.items.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <span className="bg-primary/10 text-primary rounded-full px-3 py-1 text-sm">
                    {orderData.items.length} منتجات
                  </span>
                </h3>
                <div className="border rounded-xl overflow-hidden">
                  <table role="table" className="w-full">
                    <caption className="sr-only">قائمة منتجات الفاتورة</caption>
                    <thead className="bg-muted/50">
                      <tr>
                        <th scope="col" className="text-right py-3 px-4 text-sm font-semibold">المنتج</th>
                        <th scope="col" className="text-center py-3 px-2 text-sm font-semibold">الكمية</th>
                        <th scope="col" className="text-center py-3 px-2 text-sm font-semibold">السعر</th>
                        <th scope="col" className="text-left py-3 px-4 text-sm font-semibold">المجموع</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {orderData.items.map((item, index) => (
                        <tr key={item.id} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              {item.image && (
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  className="w-10 h-10 rounded-lg object-cover"
                                />
                              )}
                              <div className="min-w-0">
                                <span className="block text-sm font-medium line-clamp-2">{item.name}</span>
                                {item.variantLabel && (
                                  <span className="block text-xs text-muted-foreground mt-0.5">الخيار: {item.variantLabel}</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="text-center py-3 px-2">
                            <span className="bg-muted rounded-full px-2 py-1 text-sm">{item.quantity}</span>
                          </td>
                          <td className="text-center py-3 px-2 text-sm">{formatIQD(item.price)}</td>
                          <td className="text-left py-3 px-4 font-medium text-sm">{formatIQD(item.price * item.quantity)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── تفاصيل الدفع ── */}
            <div className="totals-box bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl p-5">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                💳 تفاصيل الدفع
              </h4>
              <div className="space-y-2">
                {/* المجموع الفرعي */}
                <div className="total-row flex justify-between text-sm">
                  <span className="text-muted-foreground">مجموع المنتجات:</span>
                  <span>{formatIQD(calculatedSubtotal)}</span>
                </div>

                {/* الشحن */}
                {deliveryFee > 0 ? (
                  <div className="total-row flex justify-between text-sm">
                    <span className="text-muted-foreground">🚚 التوصيل:</span>
                    <span>{formatIQD(deliveryFee)}</span>
                  </div>
                ) : (
                  <div className="total-row flex justify-between text-sm">
                    <span className="text-green-600">التوصيل:</span>
                    <span className="text-green-600 font-medium">مجاني</span>
                  </div>
                )}

                {/* الخصم (كوبون) */}
                {discount > 0 && (
                  <div className="total-row flex justify-between text-sm">
                    <span className="text-green-600">🎁 خصم الكوبون:</span>
                    <span className="text-green-600">-{formatIQD(discount)}</span>
                  </div>
                )}

                <Separator />

                {/* الإجمالي (قبل الخصم والتقريب) */}
                <div className="total-row flex justify-between text-sm font-medium">
                  <span>الإجمالي:</span>
                  <span>{formatIQD(grandTotal)}</span>
                </div>

                {/* مدفوع من الباقي */}
                {cashbackUsed > 0 && (
                  <div className="total-row flex justify-between text-sm">
                    <span className="text-orange-600">💰 مدفوع من رصيد الباقي:</span>
                    <span className="text-orange-600">-{formatIQD(cashbackUsed)}</span>
                  </div>
                )}

                {/* التقريب */}
                {roundingDiff > 0 && (
                  <div className="total-row flex justify-between text-xs">
                    <span className="text-muted-foreground">تقريب المبلغ:</span>
                    <span className="text-muted-foreground">+{formatIQD(roundingDiff)}</span>
                  </div>
                )}

                <Separator />

                {/* المطلوب دفعه نقداً */}
                <div className="total-row grand flex justify-between items-center">
                  <span className="text-lg font-semibold">💵 تدفع نقداً:</span>
                  <div className="text-left">
                    <p className="text-2xl font-bold text-primary">{formatIQD(actualPayAmount)}</p>
                    <p className="payment-method text-xs text-muted-foreground">الدفع عند الاستلام</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── المكافآت المكتسبة ── */}
            {(pointsEarned > 0 || cashbackEarned > 0) && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2 text-amber-800 dark:text-amber-300">
                  🎉 مكافآتك من هذا الطلب
                </h4>
                {pointsEarned > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-amber-700 dark:text-amber-400">⭐ نقاط ولاء مكتسبة:</span>
                    <span className="font-bold text-amber-700 dark:text-amber-300">+{pointsEarned} نقطة</span>
                  </div>
                )}
                {cashbackEarned > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-amber-700 dark:text-amber-400">💰 باقي مضاف لرصيدك:</span>
                    <span className="font-bold text-amber-700 dark:text-amber-300">+{formatIQD(cashbackEarned)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            {orderData.customerInfo.notes && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">ملاحظات الطلب:</p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">{orderData.customerInfo.notes}</p>
              </div>
            )}

            {/* Footer — dynamic based on status */}
            <div className="footer-contact bg-primary/5 rounded-xl p-4 text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                {orderStatus === 'delivered' ? 'شكراً لك! تم توصيل طلبك بنجاح 🎉' :
                 orderStatus === 'shipped' ? 'طلبك بالطريق إليك! 🚚' :
                 orderStatus === 'cancelled' ? 'تم إلغاء هذا الطلب' :
                 'للاستفسار عن طلبك تواصل معنا'}
              </p>
              <div className="flex items-center justify-center gap-2 text-primary">
                <Phone className="h-4 w-4" />
                <span className="font-semibold" dir="ltr">+964 774 788 0673</span>
              </div>
            </div>

            {/* WhatsApp Confirmation — CTA الأساسي بعد الطلب */}
            <a
              href={`${WHATSAPP_URL}?text=${encodeURIComponent(`مرحباً، أريد تأكيد طلبي رقم ${shortOrderNumber}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors text-base no-print print:hidden"
            >
              <MessageCircle className="h-5 w-5" />
              أكد طلبك عبر واتساب
            </a>

            {/* Action Buttons - hidden in print */}
            <div className="flex gap-3 no-print print:hidden">
              <Button variant="outline" onClick={handlePrint} className="flex-1">
                <Printer className="h-4 w-4 ml-2" />
                طباعة
              </Button>
              <Button variant="outline" onClick={handleShare} className="flex-1">
                <Share2 className="h-4 w-4 ml-2" />
                مشاركة
              </Button>
              <Button onClick={() => onOpenChange(false)} className="flex-1">
                <CheckCircle2 className="h-4 w-4 ml-2" />
                تم
              </Button>
            </div>

            {/* Brand Footer */}
            <div className="brand-footer text-center text-xs text-muted-foreground pt-4 border-t">
              <p>شكراً لتسوقكم من AQUAVO</p>
              <p className="mt-1">www.aquavoiq.com</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
