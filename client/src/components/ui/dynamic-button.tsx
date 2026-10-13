import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A checkout-safe, accessible adaptation of the dynamic-label button pattern.
 * Keeps the established AQUAVO button styles and touch target.
 */
export interface DynamicButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  children: string;
  icon?: ReactNode;
  stateKey?: string;
}

export const DynamicButton = forwardRef<HTMLButtonElement, DynamicButtonProps>(
  function DynamicButton({ children, icon, stateKey, className, type = "button", ...props }, ref) {
    const reduced = useReducedMotion();
    return (
      <motion.button
        {...props}
        ref={ref}
        type={type}
        layout={reduced ? undefined : "size"}
        transition={{ layout: { duration: 0.22, ease: [0.23, 1, 0.32, 1] } }}
        className={cn(
          "relative inline-flex min-h-11 items-center justify-center overflow-hidden rounded-sm border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-foreground",
          "transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          className,
        )}
      >
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={stateKey ?? children}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: reduced ? 0.01 : 0.17, ease: "easeOut" }}
            className="inline-flex min-w-0 items-center justify-center gap-2 whitespace-nowrap"
          >
            {icon && <span aria-hidden="true" className="inline-flex shrink-0 items-center justify-center [&_svg]:size-4">{icon}</span>}
            <span>{children}</span>
          </motion.span>
        </AnimatePresence>
      </motion.button>
    );
  },
);
