interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Static page wrapper. Entrance opacity/transform motion has been removed
 * site-wide, so routes render immediately with no fade/slide animation.
 */
export function PageTransition({ children, className }: PageTransitionProps) {
  return <div className={className}>{children}</div>;
}
