import { Children, type ReactNode } from "react";

import { Membrane } from "@/components/motion/displacement";

interface PrecisionRevealProps {
  children: ReactNode;
  className?: string;
  stagger?: boolean;
}

/**
 * AQUAVO membrane reveal. The public API remains unchanged so every existing
 * homepage call site receives the new motion language without structural edits.
 * Content is readable before the effect runs, and reduced-motion users see the
 * final state immediately.
 */
export function PrecisionReveal({ children, className = "", stagger = false }: PrecisionRevealProps) {
  if (!stagger) {
    return <Membrane className={className}>{children}</Membrane>;
  }

  return (
    <div className={className} data-aqv-motion="membrane-stagger">
      {Children.map(children, (child) => <Membrane>{child}</Membrane>)}
    </div>
  );
}
