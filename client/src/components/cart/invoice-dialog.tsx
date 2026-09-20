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
import { WhatsAppLink } from "@/components/whatsapp-link";
import { useTranslation } from "react-i18next";
import { isolateNumericRanges as bidi, isolateNumericRangesInHtml } from "@shared/i18n/bidi";
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
    paymentStatus?: string;
    paymentMethod?: string;
    orderNumber: string;
    orderDate: Date;
  } | null;
}

export function InvoiceDialog({ open, onOpenChange, orderData }: InvoiceDialogProps) {
  const { t } = useTranslation("orders");
  const invoiceRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // الحسابات — حماية من null
  const grandTotal = orderData?.total ?? 0;
  const roundedTotal = orderData?.roundedTotal ?? grandTotal;
  const cashbackUsed = orderData?.cashbackUsed ?? 0;
  const pointsEarned = orderData?.pointsEarned ?? 0;
  const cashbackEarned = orderData?.cashbackEarned ?? 0;
  const orderStatus = orderData?.status ?? 'pending';
  const isOnlinePayment = orderData?.paymentMethod === 'alqaseh' || orderData?.paymentMethod === 'wayl';
  const paymentMethodLabel = isOnlinePayment ? t("invoice-dialog.s1") : t("invoice-dialog.s2");

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

  // المبلغ النهائي للفاتورة؛ طريقة الدفع تُعرض حسب الطلب الفعلي
  const actualPayAmount = roundedTotal;

  // طباعة الفاتورة فقط — صفحة واحدة نظيفة بدون خلفيات
  const handlePrint = useCallback(() => {
    if (!orderData) return;
    const printWindow = window.open('', '_blank', 'width=600,height=800');
    if (!printWindow) {
      toast({ title: t("invoice-dialog.s3"), variant: "destructive" });
      return;
    }

    // بناء HTML الفاتورة مباشرة — بدون أي خلفيات ملونة
    const itemsRows = orderData.items.map(item => {
      // The printed invoice is HTML, so the range is isolated as markup here rather
      // than with the control characters used for plain strings.
      const productName = isolateNumericRangesInHtml(
        item.variantLabel
          ? t("invoice-dialog.s4", { v0: item.name, v1: item.variantLabel })
          : item.name,
      );
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
    totalsHTML += t("invoice-dialog.s5", { v0: formatIQD(calculatedSubtotal) });
    // التوصيل
    if (deliveryFee > 0) {
      totalsHTML += t("invoice-dialog.s6", { v0: formatIQD(deliveryFee) });
    } else {
      totalsHTML += t("invoice-dialog.s7", { v0: formatIQD(0) });
    }
    // الخصم
    if (discount > 0) {
      totalsHTML += t("invoice-dialog.s8", { v0: formatIQD(discount) });
    }
    // الإجمالي (قبل الخصم والتقريب)
    totalsHTML += `<hr style="border:none;border-top:1px solid #e2e8f0;margin:6px 0;">`;
    totalsHTML += t("invoice-dialog.s9", { v0: formatIQD(grandTotal) });
    // مدفوع من الباقي
    if (cashbackUsed > 0) {
      totalsHTML += t("invoice-dialog.s10", { v0: formatIQD(cashbackUsed) });
    }
    // التقريب
    if (roundingDiff > 0) {
      totalsHTML += t("invoice-dialog.s11", { v0: formatIQD(roundingDiff) });
    }

    // مكافآت مكتسبة
    let rewardsHTML = '';
    if (pointsEarned > 0 || cashbackEarned > 0) {
      rewardsHTML = t("invoice-dialog.s12", { v0: pointsEarned > 0 ? `<div style="display:flex;justify-content:space-between;font-size:12px;color:#92400e;"><span>${t("invoice-dialog.s62")}</span><span style="font-weight:bold;">+${pointsEarned} ${t("invoice-dialog.s63")}</span></div>` : '', v1: cashbackEarned > 0 ? `<div style="display:flex;justify-content:space-between;font-size:12px;color:#92400e;"><span>${t("invoice-dialog.s64")}</span><span style="font-weight:bold;">+${formatIQD(cashbackEarned)}</span></div>` : '' });
    }

    const shortNum = orderData.orderNumber.length > 20 ? orderData.orderNumber.slice(0, 8).toUpperCase() : orderData.orderNumber;

    printWindow.document.write(t("invoice-dialog.s13", { v0: orderData.orderNumber, v1: shortNum, v2: formatDate(orderData.orderDate), v3: orderData.customerInfo.name ? `<p style="font-weight:600;">${orderData.customerInfo.name}</p>` : '', v4: orderData.customerInfo.phone ? `<p style="color:#64748b;direction:ltr;text-align:right;">📞 ${orderData.customerInfo.phone}</p>` : '', v5: orderData.customerInfo.address ? `<p style="color:#64748b;">📍 ${orderData.customerInfo.address}</p>` : '', v6: orderData.items.length, v7: itemsRows, v8: totalsHTML, v9: isOnlinePayment ? t("invoice-dialog.s65") : t("invoice-dialog.s66"), v10: formatIQD(actualPayAmount), v11: paymentMethodLabel, v12: rewardsHTML }));

    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
  }, [orderData, toast, grandTotal, roundedTotal, roundingDiff, calculatedSubtotal, deliveryFee, discount, cashbackUsed, pointsEarned, cashbackEarned, actualPayAmount]);

  // Early return AFTER all hooks
  if (!orderData) return null;

  const handleShare = async () => {
    const shareText = t("invoice-dialog.s14", { v0: orderData.orderNumber, v1: formatIQD(grandTotal), v2: orderData.customerInfo.name, v3: formatShortDate(orderData.orderDate), v4: clientEnv.siteUrl ? `${t("invoice-dialog.s67")} ${clientEnv.siteUrl}` : "" }).trim();

    if (navigator.share) {
      try {
        await navigator.share({
          title: `AQUAVO - ${orderData.orderNumber}`,
          text: shareText,
          url: clientEnv.siteUrl || undefined,
        });
      } catch {
        toast({ title: t("invoice-dialog.s15"), description: t("invoice-dialog.s16") });
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        toast({ title: t("invoice-dialog.s17"), description: t("invoice-dialog.s18") });
      } catch {
        toast({
          title: t("invoice-dialog.s19"),
          description: t("invoice-dialog.s20"),
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
          <DialogTitle>{t("invoice-dialog.s21")}</DialogTitle>
          <DialogDescription id="invoice-description">{t("invoice-dialog.s22")}</DialogDescription>
        </VisuallyHidden>
        <div ref={invoiceRef}>
          {/* Header */}
          <div className="invoice-header bg-gradient-to-br from-primary via-primary to-blue-600 text-primary-foreground p-6 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-card/20 p-2 rounded-lg backdrop-blur-sm">
                  <img src="/brand/aquavo-v2-icon.svg" alt="AQUAVO" className="h-10 w-10 object-contain" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">AQUAVO</h1>
                  <p className="text-sm opacity-80">{t("invoice-dialog.s23")}</p>
                </div>
              </div>
              <div className="text-left">
                <div className="invoice-number-box bg-card/20 backdrop-blur-sm rounded-lg px-4 py-2">
                  <p className="text-xs opacity-80">{t("invoice-dialog.s24")}</p>
                  <p className="font-mono font-bold text-sm">{shortOrderNumber}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Success */}
            <div className="success-bar flex items-center justify-center gap-2 text-green-600 bg-green-50 dark:bg-green-950/30 rounded-lg py-3">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-semibold">{t("invoice-dialog.s25")}</span>
            </div>

            {/* Customer & Order Info */}
            <div className="info-grid grid sm:grid-cols-2 gap-4">
              <div className="info-box bg-muted/30 rounded-xl p-4 space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                  {t("invoice-dialog.s26")}
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
                  {t("invoice-dialog.s27")}
                </h3>
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{formatDate(orderData.orderDate)}</span>
                  </div>
                  <div>
                    <span className="status-badge inline-block bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded-full px-3 py-0.5 text-xs font-medium">
                      {t("invoice-dialog.s28")}
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
                    {orderData.items.length} {t("invoice-dialog.s29")}
                  </span>
                </h3>
                <div className="border rounded-xl overflow-hidden">
                  <table role="table" className="w-full">
                    <caption className="sr-only">{t("invoice-dialog.s30")}</caption>
                    <thead className="bg-muted/50">
                      <tr>
                        <th scope="col" className="text-right py-3 px-4 text-sm font-semibold">{t("invoice-dialog.s31")}</th>
                        <th scope="col" className="text-center py-3 px-2 text-sm font-semibold">{t("invoice-dialog.s32")}</th>
                        <th scope="col" className="text-center py-3 px-2 text-sm font-semibold">{t("invoice-dialog.s33")}</th>
                        <th scope="col" className="text-left py-3 px-4 text-sm font-semibold">{t("invoice-dialog.s34")}</th>
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
                                <span className="block text-sm font-medium line-clamp-2">{bidi(item.name)}</span>
                                {item.variantLabel && (
                                  <span className="block text-xs text-muted-foreground mt-0.5">{t("invoice-dialog.s35")} {item.variantLabel}</span>
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
                {t("invoice-dialog.s36")}
              </h4>
              <div className="space-y-2">
                {/* المجموع الفرعي */}
                <div className="total-row flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("invoice-dialog.s37")}</span>
                  <span>{formatIQD(calculatedSubtotal)}</span>
                </div>

                {/* الشحن */}
                {deliveryFee > 0 ? (
                  <div className="total-row flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("invoice-dialog.s38")}</span>
                    <span>{formatIQD(deliveryFee)}</span>
                  </div>
                ) : (
                  <div className="total-row flex justify-between text-sm">
                    <span className="text-green-600">{t("invoice-dialog.s39")}</span>
                    <span className="text-green-600 font-medium">{t("invoice-dialog.s40")}</span>
                  </div>
                )}

                {/* الخصم (كوبون) */}
                {discount > 0 && (
                  <div className="total-row flex justify-between text-sm">
                    <span className="text-green-600">{t("invoice-dialog.s41")}</span>
                    <span className="text-green-600">-{formatIQD(discount)}</span>
                  </div>
                )}

                <Separator />

                {/* الإجمالي (قبل الخصم والتقريب) */}
                <div className="total-row flex justify-between text-sm font-medium">
                  <span>{t("invoice-dialog.s42")}</span>
                  <span>{formatIQD(grandTotal)}</span>
                </div>

                {/* مدفوع من الباقي */}
                {cashbackUsed > 0 && (
                  <div className="total-row flex justify-between text-sm">
                    <span className="text-orange-600">{t("invoice-dialog.s43")}</span>
                    <span className="text-orange-600">-{formatIQD(cashbackUsed)}</span>
                  </div>
                )}

                {/* التقريب */}
                {roundingDiff > 0 && (
                  <div className="total-row flex justify-between text-xs">
                    <span className="text-muted-foreground">{t("invoice-dialog.s44")}</span>
                    <span className="text-muted-foreground">+{formatIQD(roundingDiff)}</span>
                  </div>
                )}

                <Separator />

                {/* حالة وطريقة الدفع الفعلية */}
                <div className="total-row grand flex justify-between items-center">
                  <span className="text-lg font-semibold">{isOnlinePayment ? t("invoice-dialog.s45") : t("invoice-dialog.s46")}</span>
                  <div className="text-left">
                    <p className="text-2xl font-bold text-primary">{formatIQD(actualPayAmount)}</p>
                    <p className="payment-method text-xs text-muted-foreground">{paymentMethodLabel}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── المكافآت المكتسبة ── */}
            {(pointsEarned > 0 || cashbackEarned > 0) && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2 text-amber-800 dark:text-amber-300">
                  {t("invoice-dialog.s47")}
                </h4>
                {pointsEarned > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-amber-700 dark:text-amber-400">{t("invoice-dialog.s48")}</span>
                    <span className="font-bold text-amber-700 dark:text-amber-300">+{pointsEarned} {t("invoice-dialog.s49")}</span>
                  </div>
                )}
                {cashbackEarned > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-amber-700 dark:text-amber-400">{t("invoice-dialog.s50")}</span>
                    <span className="font-bold text-amber-700 dark:text-amber-300">+{formatIQD(cashbackEarned)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            {orderData.customerInfo.notes && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">{t("invoice-dialog.s51")}</p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">{orderData.customerInfo.notes}</p>
              </div>
            )}

            {/* Footer — dynamic based on status */}
            <div className="footer-contact bg-primary/5 rounded-xl p-4 text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                {orderStatus === 'delivered' ? t("invoice-dialog.s52") :
                 orderStatus === 'shipped' ? t("invoice-dialog.s53") :
                 orderStatus === 'cancelled' ? t("invoice-dialog.s54") :
                 t("invoice-dialog.s55")}
              </p>
              <div className="flex items-center justify-center gap-2 text-primary">
                <Phone className="h-4 w-4" />
                <span className="font-semibold" dir="ltr">+964 774 788 0673</span>
              </div>
            </div>

            {/* WhatsApp support — optional assistance, never order confirmation */}
            <WhatsAppLink
              source="invoice"
              orderNumber={shortOrderNumber}
              message={t("invoice-dialog.s56", { v0: shortOrderNumber })}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-6 py-3 text-base font-semibold text-foreground transition-colors hover:bg-muted no-print print:hidden"
            >
              <MessageCircle className="h-5 w-5" />
              {t("invoice-dialog.s57")}
            </WhatsAppLink>

            {/* Action Buttons - hidden in print */}
            <div className="flex gap-3 no-print print:hidden">
              <Button variant="outline" onClick={handlePrint} className="flex-1">
                <Printer className="h-4 w-4 ml-2" />
                {t("invoice-dialog.s58")}
              </Button>
              <Button variant="outline" onClick={handleShare} className="flex-1">
                <Share2 className="h-4 w-4 ml-2" />
                {t("invoice-dialog.s59")}
              </Button>
              <Button onClick={() => onOpenChange(false)} className="flex-1">
                <CheckCircle2 className="h-4 w-4 ml-2" />
                {t("invoice-dialog.s60")}
              </Button>
            </div>

            {/* Brand Footer */}
            <div className="brand-footer text-center text-xs text-muted-foreground pt-4 border-t">
              <p>{t("invoice-dialog.s61")}</p>
              <p className="mt-1">www.aquavoiq.com</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}