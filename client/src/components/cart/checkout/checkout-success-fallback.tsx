import { ArrowRight, Check, MessageCircle, Truck } from "lucide-react";

import { SurfaceBreak } from "@/components/motion/displacement";
import { Button } from "@/components/ui/button";
import { WHATSAPP_URL } from "@/lib/constants/shipping";
import { WhatsAppLink } from "@/components/whatsapp-link";
import { useTranslation } from "react-i18next";
import { ArrowBack } from "@/components/ui/directional-icons";

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
  const { t } = useTranslation("checkout");
  const assistanceMessage = t("success.assistance", { orderNumber });

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
              data-aqv-order-success
              ref={headingRef}
              tabIndex={-1}
              className="mt-5 text-2xl font-bold outline-none"
            >
              {t("success.title")}
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {t("success.description")}
            </p>

            <div className="mt-5 rounded-xl border border-primary/25 bg-primary/10 p-4">
              <p className="text-xs text-muted-foreground">{t("success.orderNumber")}</p>
              <p className="mt-1 font-mono text-lg font-bold text-primary" dir="ltr">#{orderNumber}</p>
            </div>

            <div className="mt-5 rounded-xl border border-border bg-background p-4 text-start">
              <h2 className="text-sm font-bold">{t("success.whatNext")}</h2>
              <ol className="mt-2 space-y-1.5 text-sm leading-6 text-muted-foreground">
                <li>{t("success.step1")}</li>
                <li>{t("success.step2")}</li>
                <li>{t("success.step3")}</li>
              </ol>
            </div>

            <div className="mt-6 grid gap-2.5">
              <Button onClick={onTrack} className="h-11 gap-2 aqv-press">
                <Truck className="h-4 w-4" aria-hidden="true" />
                {t("success.track")}
              </Button>
              <Button variant="outline" onClick={onHome} className="h-11 gap-2 aqv-press">
                <ArrowBack className="h-4 w-4" aria-hidden="true" />
                {t("success.home")}
              </Button>
              <WhatsAppLink
                source="checkout_success_fallback"
                message={assistanceMessage}
                orderNumber={orderNumber}
                className="flex min-h-11 items-center justify-center gap-2 rounded-md border border-border text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/45 hover:bg-primary/5 hover:text-foreground"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                {t("success.help")}
              </WhatsAppLink>
            </div>
          </section>
        </SurfaceBreak>
      </main>
    </div>
  );
}
