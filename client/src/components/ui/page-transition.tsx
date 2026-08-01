import "./loaders.css";

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * A direct navigation gets one restrained clarify entrance. When Flow Gate is
 * already handling the route swap, render settled so two transitions never
 * stack on the same destination.
 */
export function PageTransition({ children, className }: PageTransitionProps) {
  const flowGateActive =
    typeof document !== "undefined" && document.querySelector("[data-aqv-flowgate]") !== null;
  const motionClass = flowGateActive ? "aqv-page-settled" : "aqv-page-enter";
  const classes = className ? `${motionClass} ${className}` : motionClass;

  return <div className={classes}>{children}</div>;
}
