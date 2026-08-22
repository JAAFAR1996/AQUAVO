import { Link } from "wouter"
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

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        const isCartAddToast = title === "تمت الإضافة"

        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action || (isCartAddToast && (
              <ToastAction altText="إكمال الطلب" asChild>
                <Link
                  href="/checkout"
                  className="border-primary/40 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  إكمال الطلب
                </Link>
              </ToastAction>
            ))}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
