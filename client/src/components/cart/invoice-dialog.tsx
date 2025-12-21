import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Fish, Phone, MapPin, Calendar, FileText, Printer, Share2, CheckCircle2, Download } from "lucide-react";
import { formatIQD, generateOrderNumber, formatDate, formatShortDate } from "@/lib/utils";
import { useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { clientEnv } from "@/lib/config/env";
import { CartItem } from "@/contexts/cart-context";

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
    items: CartItem[];
    total: number;
    orderNumber: string;
    orderDate: Date;
  } | null;
}

export function InvoiceDialog({ open, onOpenChange, orderData }: InvoiceDialogProps) {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  if (!orderData) return null;

  const deliveryFee = 5000;
  const grandTotal = orderData.total + deliveryFee;

  const handlePrint = () => {
    window.print();
  };

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



  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[95vh] overflow-y-auto p-0" aria-describedby="invoice-description">
        <VisuallyHidden>
          <DialogTitle>فاتورة الطلب</DialogTitle>
          <DialogDescription id="invoice-description">تفاصيل الفاتورة والطلب</DialogDescription>
        </VisuallyHidden>
        <div ref={invoiceRef} className="print:m-0">
          <div className="bg-gradient-to-br from-primary via-primary to-blue-600 text-primary-foreground p-6 rounded-t-lg print:rounded-none">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                  <img src="/logo_aquavo_icon.png" alt="Logo" className="h-10 w-10 object-contain" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">AQUAVO</h1>
                  <p className="text-sm opacity-80">تكنولوجيا الحياة المائية</p>
                </div>
              </div>
              <div className="text-left">
                <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                  <p className="text-xs opacity-80">رقم الفاتورة</p>
                  <p className="font-mono font-bold text-lg">{orderData.orderNumber}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="flex items-center justify-center gap-2 text-green-600 bg-green-50 dark:bg-green-950/30 rounded-lg py-3">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-semibold">تم استلام طلبك بنجاح!</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  معلومات الطلب
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDate(orderData.orderDate)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                  معلومات العميل
                </h3>
                <div className="space-y-2 text-sm">
                  <p className="font-medium">{orderData.customerInfo.name}</p>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span dir="ltr">{orderData.customerInfo.phone}</span>
                  </div>
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>{orderData.customerInfo.address}</span>
                  </div>
                </div>
              </div>
            </div>

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
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                            <span className="text-sm font-medium line-clamp-2">{item.name}</span>
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

            <div className="bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl p-5">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">المجموع الفرعي:</span>
                  <span>{formatIQD(orderData.total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">رسوم التوصيل:</span>
                  <span>{formatIQD(deliveryFee)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">المجموع الكلي:</span>
                  <div className="text-left">
                    <p className="text-2xl font-bold text-primary">{formatIQD(grandTotal)}</p>
                    <p className="text-xs text-muted-foreground">الدفع عند الاستلام</p>
                  </div>
                </div>
              </div>
            </div>

            {orderData.customerInfo.notes && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">ملاحظات الطلب:</p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">{orderData.customerInfo.notes}</p>
              </div>
            )}

            <div className="bg-primary/5 rounded-xl p-4 text-center space-y-2">
              <p className="text-sm text-muted-foreground">سيتم التواصل معك قريباً لتأكيد الطلب</p>
              <div className="flex items-center justify-center gap-2 text-primary">
                <Phone className="h-4 w-4" />
                <span className="font-semibold" dir="ltr">+964 770 123 4567</span>
              </div>
            </div>

            <div className="flex gap-3 print:hidden">
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

            <div className="text-center text-xs text-muted-foreground pt-4 border-t">
              <p>شكراً لتسوقكم من AQUAVO</p>
              <p className="mt-1">www.aquavo.iq</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
