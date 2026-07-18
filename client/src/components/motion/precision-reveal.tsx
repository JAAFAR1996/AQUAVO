import { type ReactNode } from "react";

interface PrecisionRevealProps {
  children: ReactNode;
  className?: string;
  /** Retained for call-site API compatibility; no longer applies any motion. */
  stagger?: boolean;
}

/**
 * Static section wrapper. Entrance/viewport-triggered motion has been removed
 * site-wide, so content renders immediately with no animation, no scroll
 * observer and no visibility toggling.
 */
export function PrecisionReveal({ children, className = "" }: PrecisionRevealProps) {
  return <div className={className}>{children}</div>;
}
