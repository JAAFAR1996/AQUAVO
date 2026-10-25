import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { useTranslation } from "react-i18next";
import { CheckCircle2 } from "lucide-react";
import { lazy, Suspense } from "react";

const SwipeToast = lazy(() => import("@/components/ui/swipe-toast"));

export function Toaster() {
  const { t, i18n } = useTranslation("common");
  const { toasts, dismiss } = useToast()

  const openCart = (toastId: string) => {
    dismiss(toastId)
    const cartTrigger = document.querySelector<HTMLElement>("[data-aqv-cart-target]")
    if (cartTrigger) {
      cartTrigger.click()
      return
    }
    window.location.assign("/?open-cart=1")
  }

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, cartAction, swipeCart, ...props }) {
        const standardToast = (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
            {action}
            {!action && (cartAction || swipeCart) ? (
              <ToastAction altText={t("toaster.s1")} className="border-primary/40 text-primary hover:bg-primary/10" onClick={() => openCart(id)}>
                {t("toaster.s1")}
              </ToastAction>
            ) : null}
            <ToastClose />
          </Toast>
        );
        if (swipeCart) {
          return (
            <div key={id} dir={i18n.dir()}>
              <Suspense fallback={standardToast}>
              <SwipeToast
                title={title}
                description={description}
                icon={<CheckCircle2 aria-hidden="true" />}
                actionLabel={t("toaster.s1")}
                onAction={() => openCart(id)}
                onClose={() => dismiss(id)}
                open={props.open !== false}
                background="#0B1E28"
                color="#F6F4EF"
                fuseColor="#0B93A6"
                width={356}
                radius={12}
                slideMs={400}
                settleBounce={0.2}
                swipeDistance={40}
                duration={4000}
                fuse="bottom"
                pauseOnHover
                closeButton
                closeLabel={t("toaster.close")}
              />
              </Suspense>
            </div>
          );
        }
        return standardToast;
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
