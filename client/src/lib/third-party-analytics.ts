import { flushPendingTiktokEvents } from "./tiktok-pixel";
import { isTrackingAllowed } from "./tracking-environment";

declare global {
  interface Window {
    beTracker?: {
      t: (config: { hash: string }) => void;
    };
    TiktokAnalyticsObject?: string;
  }
}

let loaded = false;

function appendScript(src: string, onload?: () => void) {
  const script = document.createElement("script");
  script.src = src;
  script.async = true;
  if (onload) script.onload = onload;
  document.head.appendChild(script);
}

function loadMetricool() {
  appendScript("https://tracker.metricool.com/resources/be.js", () => {
    window.beTracker?.t({ hash: "1419e6135f967974d7d1a9ea8918c473" });
  });
}

function loadTikTokPixel() {
  const analyticsObject = "ttq";
  window.TiktokAnalyticsObject = analyticsObject;

  const ttq = ((window as any).ttq = (window as any).ttq || []);
  ttq.methods = [
    "page",
    "track",
    "identify",
    "instances",
    "debug",
    "on",
    "off",
    "once",
    "ready",
    "alias",
    "group",
    "enableCookie",
    "disableCookie",
    "holdConsent",
    "revokeConsent",
    "grantConsent",
  ];
  ttq.setAndDefer = (target: any, method: string) => {
    target[method] = (...args: unknown[]) => {
      target.push([method, ...args]);
    };
  };
  ttq.methods.forEach((method: string) => ttq.setAndDefer(ttq, method));
  ttq.instance = (id: string) => {
    const instance = ttq._i?.[id] || [];
    ttq.methods.forEach((method: string) => ttq.setAndDefer(instance, method));
    return instance;
  };
  ttq.load = (id: string, options?: Record<string, unknown>) => {
    const scriptUrl = "https://analytics.tiktok.com/i18n/pixel/events.js";
    ttq._i = ttq._i || {};
    ttq._i[id] = [];
    ttq._i[id]._u = scriptUrl;
    ttq._t = ttq._t || {};
    ttq._t[id] = Date.now();
    ttq._o = ttq._o || {};
    ttq._o[id] = options || {};
    appendScript(`${scriptUrl}?sdkid=${id}&lib=${analyticsObject}`);
  };

  // Pixel ID is configurable via env; fall back to the known AQUAVO pixel so
  // behavior is unchanged if the env var is unset.
  const tiktokPixelId =
    (import.meta.env.VITE_TIKTOK_PIXEL_ID as string | undefined) || "D7OD1FBC77U8CJLLA610";
  ttq.load(tiktokPixelId);
  // Replay early commerce events into the vendor's standard command queue.
  // The route hook may already have supplied the initial page view.
  if (!flushPendingTiktokEvents()) ttq.page();
}

export function loadThirdPartyAnalytics() {
  if (loaded || typeof document === "undefined" || !isTrackingAllowed()) return;
  loaded = true;
  loadMetricool();
  loadTikTokPixel();
}
