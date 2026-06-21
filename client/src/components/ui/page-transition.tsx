import { useState, useEffect, useRef } from "react";

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  const [mounted, setMounted] = useState(false);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(() => {
      timerRef.current = setTimeout(() => {
        setMounted(true);
      }, 16);
    });

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div
      className={className}
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0) scale(1)" : "translateY(12px) scale(0.994)",
        transition:
          "opacity 260ms cubic-bezier(0.2,0.8,0.2,1), transform 260ms cubic-bezier(0.2,0.8,0.2,1)",
        willChange: "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}
