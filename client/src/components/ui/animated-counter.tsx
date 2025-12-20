import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";

interface AnimatedCounterProps {
  end: number;
  duration?: number;
  suffix?: string;
  className?: string;
  decimals?: number;
}

export function AnimatedCounter({
  end,
  duration = 2000,
  suffix = "",
  className,
  decimals = 0,
}: AnimatedCounterProps) {
  const [count, setCount] = useState(0);
  const previousEndRef = useRef(end);

  useEffect(() => {
    // Reset count if end value changed significantly
    if (previousEndRef.current !== end) {
      setCount(0);
      previousEndRef.current = end;
    }

    let startTime: number;
    let animationFrame: number;
    let isCancelled = false;

    const animate = (currentTime: number) => {
      if (isCancelled) return;

      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);

      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);

      setCount(end * easeOutQuart);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      isCancelled = true;
      cancelAnimationFrame(animationFrame);
    };
  }, [end, duration]);

  return (
    <span className={cn("tabular-nums", className)}>
      {count.toFixed(decimals)}
      {suffix}
    </span>
  );
}
