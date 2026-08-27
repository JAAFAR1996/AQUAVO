// FILE: client/src/lib/meta-pixel.ts
// AQUAVO — Meta Pixel + Conversions API client helper
// Hybrid tracking: Browser Pixel + Server-side CAPI with event deduplication
import { isTrackingAllowed } from "./tracking-environment";

declare global {
  interface Window {
    fbq: (...args: unknown[]) => void;
    _fbq: unknown;
  }
}

const PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID;

// ─── fbevents.js loading ─────────────────────────────────────────────────────
//
// Executing fbevents.js costs a long uninterrupted block of main thread, and it
// was being paid during the initial load, inside the window LCP and TBT are
// measured over. Moving that execution later is the largest single performance
// lever on the product page.
//
// Deferring the SCRIPT is safe. Deferring the SETUP is not, and two things
// therefore still happen immediately in initMetaPixel below:
//
//  1. The fbq stub. Meta's official snippet queues every fbq() call in
//     `n.queue` until the real library installs `callMethod`, then replays
//     them — so a queued event is a delayed event, never a lost one. And
//     `isPixelReady()` only tests that `window.fbq` exists, which the stub
//     satisfies. An earlier attempt at deferral moved the stub as well, which
//     did drop events; the comment in use-meta-pixel.ts records that.
//
//  2. The _fbp / _fbc cookies. These are normally written BY fbevents.js, and
//     every CAPI call reads them (server/routes/capi.ts copies them into
//     `user_data`). Deferring the script without seeding them would hand the
//     server a null pair for any event fired before the script loaded, quietly
//     degrading match quality on exactly the early events that matter most.
//     seedFbCookies() writes them first-party instead — which additionally
//     captures an `fbc` for a visitor who bounces before the pixel ever runs,
//     something the current eager setup does not manage.
//
// The script is then requested at the earliest of: a real user interaction,
// browser idle after load, a hard timeout, or a conversion-critical event.

const FBEVENTS_SRC = "https://connect.facebook.net/en_US/fbevents.js";

/** The longest we will ever wait, even on a page nobody touches. */
const PIXEL_LOAD_TIMEOUT_MS = 4000;

let scriptRequested = false;

/**
 * Request fbevents.js now. Idempotent — the first caller wins and every later
 * call is a no-op, so wiring it to several triggers is safe.
 */
export function ensureMetaPixelScript(): void {
  if (scriptRequested) return;
  if (typeof document === "undefined") return;
  if (!isTrackingAllowed() || !PIXEL_ID) return;
  scriptRequested = true;

  const script = document.createElement("script");
  script.async = true;
  script.src = FBEVENTS_SRC;
  document.head.appendChild(script);
}

/**
 * Load at the first of: user interaction, idle after load, or a hard timeout.
 *
 * The timeout is the guarantee. A visitor who reads a page without touching it
 * still gets the pixel, so a queued PageView can never sit unsent.
 */
function scheduleMetaPixelScript(): void {
  if (typeof window === "undefined") return;

  const load = () => ensureMetaPixelScript();

  const events: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "touchstart", "scroll"];
  const onInteraction = () => {
    events.forEach((event) => window.removeEventListener(event, onInteraction));
    load();
  };
  events.forEach((event) =>
    window.addEventListener(event, onInteraction, { once: true, passive: true }),
  );

  const afterLoad = () => {
    const idle = (
      window as Window & {
        requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => void;
      }
    ).requestIdleCallback;
    if (idle) idle(load, { timeout: 2000 });
    else window.setTimeout(load, 1000);
  };
  if (document.readyState === "complete") afterLoad();
  else window.addEventListener("load", afterLoad, { once: true });

  window.setTimeout(load, PIXEL_LOAD_TIMEOUT_MS);
}

/**
 * Write the _fbp / _fbc cookies ourselves, in Meta's documented format, when
 * they are not already present.
 *
 * fbevents.js reuses an existing _fbp rather than replacing it, so this is
 * additive: the value written here is the value Meta goes on using. `fb.1.` is
 * the standard prefix (1 = one subdomain level, i.e. www.aquavoiq.com).
 *
 * `_fbc` is written only when the visitor genuinely arrived from an ad — it is
 * derived from the `fbclid` query parameter and is never invented.
 */
function seedFbCookies(): void {
  if (typeof document === "undefined") return;

  const has = (name: string) =>
    document.cookie.split("; ").some((row) => row.startsWith(`${name}=`));

  // 90 days, matching Meta's own cookie lifetime.
  const write = (name: string, value: string) => {
    document.cookie = `${name}=${value}; max-age=${90 * 24 * 60 * 60}; path=/; SameSite=Lax`;
  };

  const now = Date.now();

  if (!has("_fbp")) {
    // fb.<subdomainIndex>.<creationTime>.<random>
    write("_fbp", `fb.1.${now}.${Math.floor(Math.random() * 2_147_483_647)}`);
  }

  if (!has("_fbc")) {
    try {
      const fbclid = new URLSearchParams(window.location.search).get("fbclid");
      if (fbclid) write("_fbc", `fb.1.${now}.${fbclid}`);
    } catch {
      /* a malformed query string is not worth failing init over */
    }
  }
}

// ─── Initialize Pixel ────────────────────────────────────────────────────────
export function initMetaPixel() {
  if (!isTrackingAllowed() || !PIXEL_ID) return;
  if (typeof window.fbq === "function") return; // already loaded

  // Inject fbq stub (official Meta pattern)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const n: any = function (...args: unknown[]) {
    n.callMethod ? n.callMethod(...args) : n.queue.push(args);
  };
  n.push = n;
  n.loaded = true;
  n.version = "2.0";
  n.queue = [] as unknown[];
  window.fbq = n;
  if (!window._fbq) window._fbq = n;

  // Before init, so even the very first CAPI call already carries the pair.
  seedFbCookies();

  window.fbq("init", PIXEL_ID);
  // PageView is handled by useMetaPageView hook on every route change (including mount).
  // Do not fire here — would cause a double PageView on first load.

  scheduleMetaPixelScript();
}

// ─── Track PageView (on route change) ───────────────────────────────────────
export function trackMetaPageView() {
  if (typeof window === "undefined" || !window.fbq) return;
  window.fbq("track", "PageView");
}

// ─── Generate Event ID (dedup between Pixel + CAPI) ─────────────────────────
export function generateEventId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ─── Get fbc / fbp cookies ───────────────────────────────────────────────────
function getFbCookies() {
  if (typeof document === "undefined") return { fbc: null, fbp: null };

  const getCookie = (name: string) =>
    document.cookie
      .split("; ")
      .find((r) => r.startsWith(`${name}=`))
      ?.split("=")[1] ?? null;

  return {
    fbc: getCookie("_fbc"),
    fbp: getCookie("_fbp"),
  };
}

// ─── Check if Pixel is available ─────────────────────────────────────────────
function isPixelReady(): boolean {
  return isTrackingAllowed() && !!window.fbq && !!PIXEL_ID;
}

// ─── Standard E-Commerce Events ─────────────────────────────────────────────

/** صفحة منتج — ViewContent */
export function metaTrackViewContent(params: {
  productId: string;
  productName: string;
  priceIQD: number;
  category?: string;
}) {
  const eventId = generateEventId();
  const { fbc, fbp } = getFbCookies();

  // Browser Pixel
  if (isPixelReady()) {
    window.fbq("track", "ViewContent", {
      content_ids: [params.productId],
      content_name: params.productName,
      content_type: "product",
      content_category: params.category || "",
      value: params.priceIQD,
      currency: "IQD",
    }, { eventID: eventId });
  }

  // Server CAPI
  sendCAPI({
    event_name: "ViewContent",
    event_id: eventId,
    fbc,
    fbp,
    custom_data: {
      content_ids: [params.productId],
      content_name: params.productName,
      content_type: "product",
      content_category: params.category || "",
      value: params.priceIQD,
      currency: "IQD",
    },
  });
}

/** إضافة للسلة — AddToCart */
export function metaTrackAddToCart(params: {
  productId: string;
  productName: string;
  priceIQD: number;
  quantity: number;
  category?: string;
}) {
  const eventId = generateEventId();
  const { fbc, fbp } = getFbCookies();

  if (isPixelReady()) {
    window.fbq("track", "AddToCart", {
      content_ids: [params.productId],
      content_name: params.productName,
      content_type: "product",
      value: params.priceIQD * params.quantity,
      currency: "IQD",
      num_items: params.quantity,
    }, { eventID: eventId });
  }

  sendCAPI({
    event_name: "AddToCart",
    event_id: eventId,
    fbc,
    fbp,
    custom_data: {
      content_ids: [params.productId],
      content_name: params.productName,
      value: params.priceIQD * params.quantity,
      currency: "IQD",
      num_items: params.quantity,
    },
  });
}

/** بداية الدفع — InitiateCheckout */
export function metaTrackInitiateCheckout(params: {
  totalIQD: number;
  numItems: number;
  productIds: string[];
}) {
  // The purchase path keeps the old eager behaviour exactly. Everything before
  // checkout can afford to wait for idle; from here on the visitor is minutes
  // from converting and may close the tab at any moment, so the library is
  // fetched now rather than on the next idle callback.
  ensureMetaPixelScript();
  const eventId = generateEventId();
  const { fbc, fbp } = getFbCookies();

  if (isPixelReady()) {
    window.fbq("track", "InitiateCheckout", {
      content_ids: params.productIds,
      value: params.totalIQD,
      currency: "IQD",
      num_items: params.numItems,
    }, { eventID: eventId });
  }

  sendCAPI({
    event_name: "InitiateCheckout",
    event_id: eventId,
    fbc,
    fbp,
    custom_data: {
      content_ids: params.productIds,
      value: params.totalIQD,
      currency: "IQD",
      num_items: params.numItems,
    },
  });
}

/** إتمام الطلب — Purchase (الأهم للـ ROAS) */
export function metaTrackPurchase(params: {
  orderId: string;
  totalIQD: number;
  productIds: string[];
  numItems: number;
  phone?: string;
}) {
  // The money event: fetch the library immediately, before anything else, so a
  // queued Purchase has the shortest possible wait even if the visitor closes
  // the tab on the confirmation screen. Deliberately placed BEFORE the dedup
  // check — a repeat call returns early, and by then the script is already on
  // its way from the first one.
  ensureMetaPixelScript();

  // Dedup: fire once per real order ID (survives page refresh via localStorage)
  if (params.orderId && params.orderId !== "unknown") {
    const dedupKey = `meta_px_${params.orderId}`;
    try {
      if (localStorage.getItem(dedupKey)) return;
      localStorage.setItem(dedupKey, "1");
    } catch { /* private browsing — skip dedup, allow fire */ }
  }

  const eventId = generateEventId();
  const { fbc, fbp } = getFbCookies();

  if (isPixelReady()) {
    window.fbq("track", "Purchase", {
      content_ids: params.productIds,
      content_type: "product",
      value: params.totalIQD,
      currency: "IQD",
      num_items: params.numItems,
      order_id: params.orderId,
    }, { eventID: eventId });
  }

  sendCAPI({
    event_name: "Purchase",
    event_id: eventId,
    fbc,
    fbp,
    phone: params.phone,
    custom_data: {
      content_ids: params.productIds,
      content_type: "product",
      value: params.totalIQD,
      currency: "IQD",
      num_items: params.numItems,
      order_id: params.orderId,
    },
  });
}

/** بحث — Search */
export function metaTrackSearch(query: string) {
  const eventId = generateEventId();
  const { fbc, fbp } = getFbCookies();

  if (isPixelReady()) {
    window.fbq("track", "Search", { search_string: query }, { eventID: eventId });
  }

  sendCAPI({
    event_name: "Search",
    event_id: eventId,
    fbc,
    fbp,
    custom_data: { search_string: query },
  });
}

/** تسجيل حساب — CompleteRegistration */
export function metaTrackCompleteRegistration() {
  const eventId = generateEventId();
  const { fbc, fbp } = getFbCookies();

  if (isPixelReady()) {
    window.fbq("track", "CompleteRegistration", {}, { eventID: eventId });
  }

  sendCAPI({
    event_name: "CompleteRegistration",
    event_id: eventId,
    fbc,
    fbp,
    custom_data: {},
  });
}

/** إضافة للمفضلة — AddToWishlist */
export function metaTrackAddToWishlist(params: {
  productId: string;
  productName: string;
  priceIQD: number;
  category?: string;
}) {
  const eventId = generateEventId();
  const { fbc, fbp } = getFbCookies();

  if (isPixelReady()) {
    window.fbq("track", "AddToWishlist", {
      content_ids: [params.productId],
      content_name: params.productName,
      content_type: "product",
      value: params.priceIQD,
      currency: "IQD",
    }, { eventID: eventId });
  }

  sendCAPI({
    event_name: "AddToWishlist",
    event_id: eventId,
    fbc,
    fbp,
    custom_data: {
      content_ids: [params.productId],
      content_name: params.productName,
      content_type: "product",
      value: params.priceIQD,
      currency: "IQD",
    },
  });
}

// ─── Internal: Send to CAPI backend ─────────────────────────────────────────
interface CAPIPayload {
  event_name: string;
  event_id: string;
  fbc?: string | null;
  fbp?: string | null;
  phone?: string;
  custom_data?: Record<string, unknown>;
}

function sendCAPI(payload: CAPIPayload) {
  if (!isTrackingAllowed()) return;
  // Don't send if no pixel is configured
  if (!PIXEL_ID) return;

  const body = JSON.stringify({
    ...payload,
    event_time: Math.floor(Date.now() / 1000),
    event_source_url: window.location.href,
    user_agent: navigator.userAgent,
  });

  // Use sendBeacon for reliability (works even when page is closing)
  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon("/api/capi/event", blob);
  } else {
    fetch("/api/capi/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {}); // silent fail — pixel is backup
  }
}
