import { useState, useEffect, useRef } from "react";
import { useInView } from "@/hooks/use-in-view";

interface RevealProps {
  children: React.ReactNode;
  delay?: number;
  direction?: "up" | "left" | "right";
  className?: string;
  once?: boolean;
}

const HIDDEN_TRANSFORM: Record<NonNullable<RevealProps["direction"]>, string> = {
  up: "translateY(12px)",
  left: "translateX(-12px)",
  right: "translateX(12px)",
};

export function Reveal({
  children,
  delay = 0,
  direction = "up",
  className,
  once = true,
}: RevealProps) {
  // Lower threshold so even partially-visible cards on mobile trigger
  const { ref, inView } = useInView({ once, threshold: 0.05, rootMargin: "0px 0px 0px 0px" });

  // Fallback: if observer never fires (e.g. element already in viewport on mount),
  // reveal after delay + 600ms so products never stay invisible
  const [fallback, setFallback] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => setFallback(true), delay + 600);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [delay]);

  const visible = inView || fallback;

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translate(0)" : HIDDEN_TRANSFORM[direction],
        transition: "opacity 380ms cubic-bezier(0.4, 0, 0.2, 1), transform 380ms cubic-bezier(0.4, 0, 0.2, 1)",
        transitionDelay: `${delay}ms`,
        willChange: "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}
