import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Gradients appear only when actual content remains to scroll into view. */
export function ScrollFadeList({
  children,
  className,
  label,
  fadeHeight = 20,
}: {
  children: ReactNode;
  className?: string;
  label: string;
  fadeHeight?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ top: 0, bottom: 0 });
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    let frame = 0;
    const update = () => {
      const maxScroll = Math.max(0, node.scrollHeight - node.clientHeight);
      const top = Math.min(fadeHeight, Math.max(0, node.scrollTop));
      const bottom = Math.min(fadeHeight, Math.max(0, maxScroll - node.scrollTop));
      setEdges(previous => previous.top === top && previous.bottom === bottom ? previous : { top, bottom });
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    schedule();
    node.addEventListener("scroll", schedule, { passive: true });
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
    observer?.observe(node);
    if (node.firstElementChild) observer?.observe(node.firstElementChild);
    return () => {
      cancelAnimationFrame(frame);
      node.removeEventListener("scroll", schedule);
      observer?.disconnect();
    };
  }, [children, fadeHeight]);

  const mask = `linear-gradient(to bottom, transparent 0, black ${edges.top}px, black calc(100% - ${edges.bottom}px), transparent 100%)`;
  const style: CSSProperties = {
    maskImage: mask,
    WebkitMaskImage: mask,
  };

  return (
    <div
      ref={ref}
      tabIndex={0}
      role="region"
      aria-label={label}
      style={style}
      className={cn("max-h-32 overflow-y-auto overscroll-contain focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary", className)}
    >
      {children}
    </div>
  );
}
