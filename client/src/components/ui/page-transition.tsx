import { useState, useEffect, useRef } from "react";

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  const [mounted, setMounted] = useState(false);
  // After the entry finishes we MUST drop the transform back to `none`.
  // Any non-`none` transform on this wrapper creates a containing block, which
  // breaks `position: fixed` for every descendant (e.g. the floating compare
  // dock would anchor to the page bottom instead of the viewport).
  const [settled, setSettled] = useState(false);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(() => {
      timerRef.current = setTimeout(() => {
        setMounted(true);
        settleRef.current = setTimeout(() => setSettled(true), 320);
      }, 16);
    });

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      if (settleRef.current !== null) clearTimeout(settleRef.current);
    };
  }, []);

  return (
    <div
      className={className}
      style={{
        opacity: mounted ? 1 : 0,
        // Once settled, transform is fully removed so fixed children work.
        transform: settled
          ? "none"
          : mounted
            ? "translateY(0) scale(1)"
            : "translateY(12px) scale(0.994)",
        transition: settled
          ? "none"
          : "opacity 260ms cubic-bezier(0.2,0.8,0.2,1), transform 260ms cubic-bezier(0.2,0.8,0.2,1)",
        willChange: settled ? "auto" : "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}
