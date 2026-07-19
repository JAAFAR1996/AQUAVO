import "./loaders.css";

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Route content wrapper with a subtle entrance fade (opacity 0 -> 1) on mount.
 * The motion lives in the .aqv-page-enter CSS class and is disabled under
 * prefers-reduced-motion, where content renders plainly at full opacity.
 * Content is in the DOM immediately (only opacity animates), so there is no
 * layout shift and no impact on SEO/content availability.
 */
export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <div className={className ? `aqv-page-enter ${className}` : "aqv-page-enter"}>
      {children}
    </div>
  );
}
