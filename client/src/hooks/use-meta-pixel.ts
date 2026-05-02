// FILE: client/src/hooks/use-meta-pixel.ts
// React hooks for Meta Pixel initialization and page view tracking

import { useEffect } from "react";
import { useLocation } from "wouter";
import { initMetaPixel, trackMetaPageView } from "@/lib/meta-pixel";

/**
 * Initialize Meta Pixel on app mount.
 * Call once in the root App component.
 */
export function useMetaPixelInit() {
  useEffect(() => {
    // Defer pixel init to after first idle to reduce TBT (same pattern as GA)
    if ("requestIdleCallback" in window) {
      (window as any).requestIdleCallback(() => initMetaPixel(), { timeout: 3000 });
    } else {
      setTimeout(() => initMetaPixel(), 2000);
    }
  }, []);
}

/**
 * Track Meta Pixel PageView on every route change.
 * Call once in the root App component.
 */
export function useMetaPageView() {
  const [location] = useLocation();

  useEffect(() => {
    trackMetaPageView();
  }, [location]);
}
