import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { formatIQD } from "@/lib/utils";

type ReceiptLine = {
  productId: string;
  productName?: string;
  variantLabel?: string;
  quantity: number;
  priceAtPurchase?: string;
};

interface OrderReceiptPrinterProps {
  orderNumber: string;
  items: ReceiptLine[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  paymentLabel: string;
  dateLabel?: string;
}

const strings = {
  ar: { receipt: "إيصال الطلب", confirmed: "تم تسجيل الطلب", number: "رقم الطلب", items: "المنتجات", subtotal: "المجموع الفرعي", delivery: "التوصيل", discount: "الخصم", total: "الإجمالي", payment: "طريقة الدفع / الحالة", thanks: "شكرا لتسوقك من AQUAVO" },
  en: { receipt: "Order receipt", confirmed: "Order received", number: "Order number", items: "Items", subtotal: "Subtotal", delivery: "Delivery", discount: "Discount", total: "Total", payment: "Payment method / status", thanks: "Thank you for shopping with AQUAVO" },
  ckb: { receipt: "پسووڵەی داواکاری", confirmed: "داواکارییەکەت تۆمار کرا", number: "ژمارەی داواکاری", items: "بەرهەمەکان", subtotal: "کۆی سەرەتایی", delivery: "گەیاندن", discount: "داشکاندن", total: "کۆی گشتی", payment: "شێواز / دۆخی پارەدان", thanks: "سوپاس بۆ کڕین لە AQUAVO" },
} as const;

/**
 * Visual receipt animation is triggered only for an order that already exists.
 * Never calls payment/order APIs, and never claims COD orders have been paid.
 */
export function OrderReceiptPrinter({
  orderNumber, items, subtotal, deliveryFee, discount, total, paymentLabel, dateLabel,
}: OrderReceiptPrinterProps) {
  const { i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage ?? i18n.language ?? "ar").split("-")[0];
  const s = strings[lang as keyof typeof strings] ?? strings.ar;
  const reduced = useReducedMotion();

  return (
    <section className="mx-auto w-full max-w-sm" aria-label={s.receipt} data-aqv-receipt>
      <div className="relative rounded-t-3xl border border-[#0B1E28] bg-[#0B1E28] px-5 pb-5 pt-4 text-[#F6F4EF] shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="text-xs font-semibold tracking-wide" dir="ltr">AQUAVO</span>
          <span className="text-xs text-[#F6F4EF]/80">{s.confirmed}</span>
        </div>
        <div className="rounded-lg border border-[#F6F4EF]/15 bg-[#152F3C] px-4 py-3 text-center">
          <p className="text-sm font-semibold">{s.receipt}</p>
          <p className="mt-1 text-xs text-[#F6F4EF]/75" dir="ltr">{orderNumber}</p>
        </div>
        <div aria-hidden="true" className="absolute bottom-1 left-[9%] right-[9%] h-2 rounded-full border border-black/40 bg-black/65 shadow-inner" />
      </div>
      <div className="relative mx-4 overflow-hidden px-1 pb-3">
        <motion.article
          initial={reduced ? false : { y: "-90%", opacity: 0.7 }}
          animate={{ y: "0%", opacity: 1 }}
          transition={{ duration: reduced ? 0 : 1.2, ease: [0.22, 1, 0.36, 1] }}
          className="relative -mt-1 bg-[#F6F4EF] px-5 pb-8 pt-6 text-[#0B1E28] shadow-[0_8px_20px_rgba(11,30,40,.12)]"
          style={{ clipPath: "polygon(0 0,100% 0,100% calc(100% - 5px),97% 100%,94% calc(100% - 5px),91% 100%,88% calc(100% - 5px),85% 100%,82% calc(100% - 5px),79% 100%,76% calc(100% - 5px),73% 100%,70% calc(100% - 5px),67% 100%,64% calc(100% - 5px),61% 100%,58% calc(100% - 5px),55% 100%,52% calc(100% - 5px),49% 100%,46% calc(100% - 5px),43% 100%,40% calc(100% - 5px),37% 100%,34% calc(100% - 5px),31% 100%,28% calc(100% - 5px),25% 100%,22% calc(100% - 5px),19% 100%,16% calc(100% - 5px),13% 100%,10% calc(100% - 5px),7% 100%,4% calc(100% - 5px),0 100%)" }}
        >
          <div className="mb-4 border-b border-dashed border-[#0B1E28]/30 pb-4 text-center">
            <strong className="block text-lg font-bold" dir="ltr">AQUAVO</strong>
            <p className="mt-1 text-xs">{s.number}: <bdi dir="ltr">{orderNumber}</bdi></p>
            {dateLabel && <p className="mt-1 text-xs text-[#0B1E28]/70">{dateLabel}</p>}
          </div>
          <p className="mb-2 text-xs font-bold">{s.items}</p>
          <div className="space-y-2 border-b border-dashed border-[#0B1E28]/30 pb-4">
            {items.map((item, index) => (
              <div key={`${item.productId}-${item.variantLabel ?? index}`} className="flex items-start justify-between gap-3 text-xs">
                <div className="min-w-0 flex-1">
                  <p className="break-words leading-5">{item.productName || item.productId}</p>
                  {item.variantLabel && <p className="text-[#0B1E28]/65">{item.variantLabel}</p>}
                  <p dir="ltr" className="text-start text-[#0B1E28]/65">× {item.quantity}</p>
                </div>
                <bdi className="shrink-0 whitespace-nowrap font-semibold">{formatIQD(Number(item.priceAtPurchase || 0) * item.quantity)}</bdi>
              </div>
            ))}
          </div>
          <div className="space-y-2 border-b border-dashed border-[#0B1E28]/30 py-4 text-xs">
            <div className="flex justify-between gap-2"><span>{s.subtotal}</span><bdi>{formatIQD(subtotal)}</bdi></div>
            <div className="flex justify-between gap-2"><span>{s.delivery}</span><bdi>{formatIQD(deliveryFee)}</bdi></div>
            {discount > 0 && <div className="flex justify-between gap-2"><span>{s.discount}</span><bdi>-{formatIQD(discount)}</bdi></div>}
          </div>
          <div className="flex justify-between gap-3 py-4 text-sm font-bold"><span>{s.total}</span><bdi>{formatIQD(total)}</bdi></div>
          <p className="text-xs font-semibold">{s.payment}</p>
          <p className="mt-1 text-xs leading-5">{paymentLabel}</p>
          <p className="mt-5 text-center text-xs text-[#0B1E28]/70">{s.thanks}</p>
        </motion.article>
      </div>
    </section>
  );
}
