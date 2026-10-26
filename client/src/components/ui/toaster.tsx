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
      {toasts.map(({ id, title, description, action, cartAction, swipeCart, ...props }) => (
        <Toast
          key={id}
          {...props}
          dir={i18n.dir()}
          data-testid="notification-toast"
          className="flex-wrap gap-3 space-x-0 p-4 pe-12"
        >
          <div className="grid min-w-0 flex-1 basis-full gap-1 break-words">
            {title && <ToastTitle>{title}</ToastTitle>}
            {description && <ToastDescription>{description}</ToastDescription>}
          </div>
          {action}
          {!action && (cartAction || swipeCart) ? (
            <ToastAction
              altText={t("toaster.s1")}
              className="min-h-11 whitespace-normal border-primary/40 text-primary hover:bg-primary/10"
              onClick={() => openCart(id)}
            >
              {t("toaster.s1")}
            </ToastAction>
          ) : null}
          <ToastClose
            aria-label={t("toaster.close")}
            className="start-auto end-1 top-1 flex h-11 w-11 items-center justify-center opacity-100"
          />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  )
}
