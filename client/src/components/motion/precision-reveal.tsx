import { type ReactNode, useEffect, useRef, useState } from "react";

interface PrecisionRevealProps {
  children: ReactNode;
  className?: string;
  stagger?: boolean;
}

/** One-shot, viewport-triggered entrance for meaningful page sections only. */
export function PrecisionReveal({ children, className = "", stagger = false }: PrecisionRevealProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [motionReady, setMotionReady] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || visible) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }
    setMotionReady(true);

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setVisible(true);
      observer.disconnect();
    }, { rootMargin: "0px 0px -8%", threshold: 0.08 });

    observer.observe(element);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <div
      ref={elementRef}
      className={`aq-precision-reveal${stagger ? " aq-precision-stagger" : ""} ${className}`.trim()}
      data-visible={visible ? "true" : "false"}
      data-motion-ready={motionReady ? "true" : "false"}
    >
      {children}
    </div>
  );
}
