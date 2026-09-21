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

export function Toaster() {
  const { t } = useTranslation("common");
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
      {toasts.map(function ({ id, title, description, action, cartAction, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            {!action && cartAction ? (
              <ToastAction
                altText={t("toaster.s1")}
                className="border-primary/40 text-primary hover:bg-primary/10"
                onClick={() => openCart(id)}
              >
                {t("toaster.s1")}
              </ToastAction>
            ) : null}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
