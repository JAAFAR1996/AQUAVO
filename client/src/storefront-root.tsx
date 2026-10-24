import { useEffect } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import App from "./App";
import { FirstDiveIntro } from "./components/effects/first-dive-intro";
import { DisplacementRuntime } from "./components/motion/displacement-runtime";

export function mountStorefront(container: HTMLElement, onReady: () => void) {
  const hasInitialShell = container.dataset.aqSsr === "home";
  const app = <StorefrontRoot hasInitialShell={hasInitialShell} onReady={onReady} />;
  // A hero-only shell cannot be hydrated as a complete application.
  if (hasInitialShell) return hydrateRoot(container, app);
  const root = createRoot(container);
  root.render(app);
  return root;
}

/** The same tree is used by the home prerender and the browser hydration. */
export function StorefrontRoot({ hasInitialShell = false, onReady }: {
  hasInitialShell?: boolean;
  onReady?: () => void;
}) {
  useEffect(() => {
    document.getElementById("root")?.setAttribute("data-aq-client-ready", "true");
    document.getElementById("seo-root")?.remove();
    onReady?.();
  }, [onReady]);

  return <>
    <App hasInitialShell={hasInitialShell} />
    <FirstDiveIntro />
    <DisplacementRuntime />
  </>;
}
