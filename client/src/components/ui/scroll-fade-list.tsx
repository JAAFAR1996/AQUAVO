import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ScrollFadeListProps {
  children: ReactNode;
  label: string;
  className?: string;
  fadeHeight?: number;
}

/** Fade overlays track distance to both scroll edges, as on the reference demo. */
export function ScrollFadeList({
  children, label, className, fadeHeight = 76,
}: ScrollFadeListProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ top: 0, bottom: 0 });

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    let frame = 0;
    const update = () => {
      const maxScroll = Math.max(0, node.scrollHeight - node.clientHeight);
      const top = Math.min(fadeHeight, Math.max(0, node.scrollTop));
      const bottom = Math.min(fadeHeight, Math.max(0, maxScroll - node.scrollTop));
      setEdges((prev) => prev.top === top && prev.bottom === bottom ? prev : { top, bottom });
    };
    const schedule = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(update);
    };
    update();
    node.addEventListener("scroll", schedule, { passive: true });
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
    observer?.observe(node);
    if (node.firstElementChild) observer?.observe(node.firstElementChild);
    return () => {
      window.cancelAnimationFrame(frame);
      node.removeEventListener("scroll", schedule);
      observer?.disconnect();
    };
  }, [children, fadeHeight]);

  return (
    <div ref={frameRef} className="relative isolate overflow-hidden">
      <div
        ref={scrollRef}
        role="region"
        aria-label={label}
        tabIndex={0}
        className={cn(
          "max-h-32 overflow-y-auto overscroll-contain [scrollbar-gutter:stable] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
          className,
        )}
      >
        {children}
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-10"
        style={{
          height: edges.top,
          background: "linear-gradient(to bottom, hsl(var(--background)) 0%, transparent 100%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10"
        style={{
          height: edges.bottom,
          background: "linear-gradient(to top, hsl(var(--background)) 0%, transparent 100%)",
        }}
      />
    </div>
  );
}
