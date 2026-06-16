// FILE: client/src/hooks/use-meta-pixel.ts
// React hooks for Meta Pixel initialization and page view tracking

import { useEffect } from "react";
import { useLocation } from "wouter";
import { initMetaPixel, trackMetaPageView } from "@/lib/meta-pixel";
import { ttqPage } from "@/lib/tiktok-pixel";

/**
 * Initialize Meta Pixel on app mount.
 * Call once in the root App component.
 */
export function useMetaPixelInit() {
  useEffect(() => {
    // Initialize immediately — deferred init causes ViewContent/AddToCart to fire
    // before fbq stub is set up and isPixelReady() returns false, dropping events.
    // The fbq stub queues events internally; fbevents.js loads async, no render blocking.
    initMetaPixel();
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
    // TikTok SPA PageView — keeps TikTok in sync with client-side route changes,
    // matching Meta. The initial load PageView is fired by loadTikTokPixel().
    ttqPage();
  }, [location]);
}
