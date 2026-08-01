import { ArrowRight, Check, MessageCircle, Truck } from "lucide-react";

import { SurfaceBreak } from "@/components/motion/displacement";
import { Button } from "@/components/ui/button";
import { WHATSAPP_URL } from "@/lib/constants/shipping";

interface CheckoutSuccessFallbackProps {
  orderNumber: string;
  onHome: () => void;
  onTrack: () => void;
  headingRef?: React.RefObject<HTMLHeadingElement | null>;
}

export function CheckoutSuccessFallback({
  orderNumber,
  onHome,
  onTrack,
  headingRef,
}: CheckoutSuccessFallbackProps) {
  const assistanceUrl = `${WHATSAPP_URL}?text=${encodeURIComponent(`مرحباً، أحتاج مساعدة بخصوص طلبي رقم ${orderNumber}`)}`;

  return (
    <div className="min-h-screen bg-background px-4 py-10" dir="rtl" data-aqv-motion="order-success">
      <main className="mx-auto flex min-h-[70vh] max-w-lg items-center justify-center">
        <SurfaceBreak confirmed>
          <section className="w-full rounded-2xl border border-border bg-card p-6 text-center shadow-sm sm:p-8" aria-labelledby="checkout-success-title">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary">
              <Check className="h-8 w-8" aria-hidden="true" />
            </div>

            <h1
              id="checkout-success-title"
              ref={headingRef}
              tabIndex={-1}
              className="mt-5 text-2xl font-bold outline-none"
            >
              طلبك مسجّل
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              تم تسجيل الطلب بنجاح وما تحتاج تأكيد إضافي عبر واتساب.
            </p>

            <div className="mt-5 rounded-xl border border-primary/25 bg-primary/10 p-4">
              <p className="text-xs text-muted-foreground">رقم الطلب</p>
              <p className="mt-1 font-mono text-lg font-bold text-primary" dir="ltr">#{orderNumber}</p>
            </div>

            <div className="mt-5 rounded-xl border border-border bg-background p-4 text-right">
              <h2 className="text-sm font-bold">شنو يصير هسه؟</h2>
              <ol className="mt-2 space-y-1.5 text-sm leading-6 text-muted-foreground">
                <li>1. نراجع تفاصيل الطلب ونبدأ بتجهيزه.</li>
                <li>2. نتواصل وياك فقط إذا احتجنا توضيح عن العنوان أو المنتج.</li>
                <li>3. الدفع يكون نقداً عند الاستلام.</li>
              </ol>
            </div>

            <div className="mt-6 grid gap-2.5">
              <Button onClick={onTrack} className="h-11 gap-2 aqv-press">
                <Truck className="h-4 w-4" aria-hidden="true" />
                تتبع طلبك
              </Button>
              <Button variant="outline" onClick={onHome} className="h-11 gap-2 aqv-press">
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
                العودة للرئيسية
              </Button>
              <a
                href={assistanceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 items-center justify-center gap-2 rounded-md border border-border text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/45 hover:bg-primary/5 hover:text-foreground"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                تحتاج مساعدة؟ تواصل ويانا
              </a>
            </div>
          </section>
        </SurfaceBreak>
      </main>
    </div>
  );
}
