// FILE: client/src/lib/meta-pixel.ts
// AQUAVO — Meta Pixel + Conversions API client helper
// Hybrid tracking: Browser Pixel + Server-side CAPI with event deduplication

declare global {
  interface Window {
    fbq: (...args: unknown[]) => void;
    _fbq: unknown;
  }
}

const PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID;

// IQD→USD conversion rate (approximate, for Meta reporting)
const IQD_TO_USD_RATE = 1650;

// ─── Initialize Pixel ────────────────────────────────────────────────────────
export function initMetaPixel() {
  if (typeof window === "undefined" || !PIXEL_ID) return;
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

  // Load Meta Pixel script
  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);

  window.fbq("init", PIXEL_ID);
  window.fbq("track", "PageView");
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
  return typeof window !== "undefined" && !!window.fbq && !!PIXEL_ID;
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
      value: params.priceIQD / IQD_TO_USD_RATE,
      currency: "USD",
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
      value: params.priceIQD / IQD_TO_USD_RATE,
      currency: "USD",
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
      value: (params.priceIQD * params.quantity) / IQD_TO_USD_RATE,
      currency: "USD",
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
      value: (params.priceIQD * params.quantity) / IQD_TO_USD_RATE,
      currency: "USD",
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
  const eventId = generateEventId();
  const { fbc, fbp } = getFbCookies();

  if (isPixelReady()) {
    window.fbq("track", "InitiateCheckout", {
      content_ids: params.productIds,
      value: params.totalIQD / IQD_TO_USD_RATE,
      currency: "USD",
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
      value: params.totalIQD / IQD_TO_USD_RATE,
      currency: "USD",
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
  const eventId = generateEventId();
  const { fbc, fbp } = getFbCookies();

  if (isPixelReady()) {
    window.fbq("track", "Purchase", {
      content_ids: params.productIds,
      value: params.totalIQD / IQD_TO_USD_RATE,
      currency: "USD",
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
      value: params.totalIQD / IQD_TO_USD_RATE,
      currency: "USD",
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
      value: params.priceIQD / IQD_TO_USD_RATE,
      currency: "USD",
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
      value: params.priceIQD / IQD_TO_USD_RATE,
      currency: "USD",
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
