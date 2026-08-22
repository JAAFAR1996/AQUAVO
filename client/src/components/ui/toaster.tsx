import { Link, useLocation } from "wouter"
import { ShoppingCart } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useCart } from "@/contexts/cart-context"
import { formatIQD } from "@/lib/utils"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()
  const { totalItems, totalPrice } = useCart()
  const [location] = useLocation()

  const showMobileCartBar =
    totalItems > 0 &&
    location !== "/checkout" &&
    !location.startsWith("/admin") &&
    !location.startsWith("/order-confirmation") &&
    !location.startsWith("/invoice/")

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport className={showMobileCartBar ? "bottom-20 md:bottom-0" : undefined} />

      {showMobileCartBar && (
        <div
          className="fixed inset-x-0 bottom-0 z-[90] border-t border-border bg-background/98 px-3 pt-2 shadow-[0_-8px_24px_rgba(0,0,0,0.10)] backdrop-blur-md md:hidden"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.5rem)" }}
          dir="rtl"
          role="region"
          aria-label="ملخص السلة وإكمال الطلب"
        >
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShoppingCart className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{totalItems} {totalItems === 1 ? "منتج" : "منتجات"} بالسلة</span>
              </div>
              <p className="mt-0.5 truncate text-sm font-bold text-foreground">{formatIQD(totalPrice)}</p>
            </div>
            <Link
              href="/checkout"
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label={`إكمال الطلب، المجموع ${formatIQD(totalPrice)}`}
            >
              إكمال الطلب
            </Link>
          </div>
        </div>
      )}
    </ToastProvider>
  )
}
