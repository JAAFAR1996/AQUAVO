import {
  AnimatePresence, motion, useReducedMotion, type HTMLMotionProps,
} from "framer-motion";
import {
  forwardRef, type Key, type ReactNode, useCallback,
  useImperativeHandle, useLayoutEffect, useRef, useState,
} from "react";
import { cn } from "@/lib/utils";

type ButtonWidth = "content" | "full";

export interface DynamicButtonProps extends Omit<HTMLMotionProps<"button">, "children" | "layout" | "transition" | "initial" | "animate" | "ref"> {
  children: string;
  icon?: ReactNode;
  stateKey?: Key;
  width?: ButtonWidth;
}

/** Dqnamo behavior: separately crossfade icons and text, and spring to the measured label width. */
export const DynamicButton = forwardRef<HTMLButtonElement, DynamicButtonProps>(
  function DynamicButton({
    children, icon, stateKey, width = "content",
    className, type = "button", ...props
  }, forwardedRef) {
    const reduced = useReducedMotion();
    const buttonRef = useRef<HTMLButtonElement>(null);
    const measureRef = useRef<HTMLSpanElement>(null);
    const [measuredWidth, setMeasuredWidth] = useState<number | null>(null);
    const contentWidth = width === "content";

    useImperativeHandle(forwardedRef, () => buttonRef.current as HTMLButtonElement);

    const syncWidth = useCallback(() => {
      const button = buttonRef.current;
      const measure = measureRef.current;
      if (!button || !measure || !contentWidth) return;
      const css = window.getComputedStyle(button);
      const outer = ["paddingLeft", "paddingRight", "borderLeftWidth", "borderRightWidth"]
        .reduce((acc, key) => acc + (Number.parseFloat(css.getPropertyValue(
          key.replace(/[A-Z]/g, (char) => "-" + char.toLowerCase())
        )) || 0), 0);
      const next = Math.ceil(measure.scrollWidth + outer);
      setMeasuredWidth((current) => current === next ? current : next);
    }, [contentWidth]);

    useLayoutEffect(() => {
      if (!contentWidth) {
        setMeasuredWidth(null);
        return;
      }
      syncWidth();
      const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(syncWidth);
      if (measureRef.current) observer?.observe(measureRef.current);
      window.addEventListener("resize", syncWidth);
      return () => {
        observer?.disconnect();
        window.removeEventListener("resize", syncWidth);
      };
    }, [syncWidth, contentWidth, children, stateKey, icon]);

    const start = reduced ? { opacity: 0, y: 0 } : { opacity: 0, y: 8 };
    const end = { opacity: 1, y: 0 };
    const exit = reduced ? { opacity: 0, y: 0 } : { opacity: 0, y: -8 };
    const transition = { duration: reduced ? 0.08 : 0.18, ease: [0.23, 1, 0.32, 1] as const };

    return (
      <motion.button
        {...props}
        aria-label={props["aria-label"] ?? children}
        ref={buttonRef}
        type={type}
        initial={false}
        animate={contentWidth ? { width: measuredWidth ?? "auto" } : undefined}
        transition={contentWidth ? { width: reduced ? { duration: 0 } : { type: "spring", bounce: 0, duration: 0.26 } } : undefined}
        className={cn(
          "relative inline-flex min-h-11 cursor-pointer items-center justify-center overflow-hidden whitespace-nowrap rounded-sm border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-foreground",
          "transition-[color,background-color,border-color,box-shadow,transform] duration-150 hover:bg-primary/90 active:scale-[.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          width === "full" && "w-full", className,
        )}
      >
        <span className="relative inline-flex min-w-0 items-center justify-center gap-2">
          {icon && (
            <span className="relative inline-grid h-4 w-4 shrink-0 overflow-hidden">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={stateKey ?? children}
                  initial={start}
                  animate={end}
                  exit={exit}
                  transition={transition}
                  className="col-start-1 row-start-1 inline-flex h-4 w-4 items-center justify-center [&_svg]:h-4 [&_svg]:w-4"
                  aria-hidden="true"
                >
                  {icon}
                </motion.span>
              </AnimatePresence>
            </span>
          )}
          <span className="relative inline-grid min-w-0 overflow-hidden">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={children}
                initial={start}
                animate={end}
                exit={exit}
                transition={transition}
                className="col-start-1 row-start-1 block whitespace-nowrap"
              >
                {children}
              </motion.span>
            </AnimatePresence>
          </span>
        </span>
        <span
          aria-hidden="true"
          ref={measureRef}
          className="pointer-events-none absolute inline-flex items-center gap-2 whitespace-nowrap opacity-0"
        >
          {icon && <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center [&_svg]:h-4 [&_svg]:w-4">{icon}</span>}
          <span>{children}</span>
        </span>
      </motion.button>
    );
  },
);
