/**
 * BEHAVIOURAL tests for the tracking repair — the events themselves, not the wiring.
 *
 * `whatsapp-coverage.test.ts` proves every WhatsApp door calls the helper. This proves the helpers do
 * the right thing when called: fire once, carry the right context, refuse to carry PII, and — for
 * Purchase — never emit for an order that was not created.
 *
 * The captured payloads are inspected directly, because "an event fired" is not the claim worth
 * testing. The claim worth testing is what is IN it.
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";

const captured: { name: string; props: Record<string, unknown> }[] = [];

// Intercept at the posthog-js boundary: everything above it is real code under test.
vi.mock("posthog-js", () => ({
  default: {
    init: vi.fn(),
    capture: (name: string, props: Record<string, unknown>) => { captured.push({ name, props }); },
  },
}));

// posthog.ts reads VITE_POSTHOG_KEY at module scope and `capture()` QUEUES every event until
// initPostHog() has resolved its dynamic import. Without a key the queue is never flushed, so a
// statically-imported module under test would swallow everything and each assertion below would fail
// on an empty array — looking like broken instrumentation rather than a mis-set-up test. Stub the env
// first, then import, then let init resolve.
vi.stubEnv("VITE_POSTHOG_KEY", "phc_test_key");

// Bound in beforeAll rather than at module scope: a top-level `await import(...)` runs under vitest but
// `tsc` rejects it for this project's module target, and the repository typecheck is a release gate.
let phTrackInitiateCheckout: typeof import("../posthog").phTrackInitiateCheckout;
let phTrackPurchase: typeof import("../posthog").phTrackPurchase;
let phTrackWhatsAppClick: typeof import("../posthog").phTrackWhatsAppClick;
let __resetOnceGuardsForTests: typeof import("../posthog").__resetOnceGuardsForTests;
let initPostHog: typeof import("../posthog").initPostHog;
let captureAttributionFromUrl: typeof import("../attribution").captureAttributionFromUrl;
let getSessionId: typeof import("../attribution").getSessionId;
let orderAttributionPayload: typeof import("../attribution").orderAttributionPayload;
let __resetAttributionForTests: typeof import("../attribution").__resetAttributionForTests;
let buildWhatsAppUrl: typeof import("../whatsapp").buildWhatsAppUrl;
let trackWhatsAppHandoff: typeof import("../whatsapp").trackWhatsAppHandoff;
let AQUAVO_WHATSAPP_URL: string;

async function loadModulesUnderTest(): Promise<void> {
  const ph = await import("../posthog");
  phTrackInitiateCheckout = ph.phTrackInitiateCheckout;
  phTrackPurchase = ph.phTrackPurchase;
  phTrackWhatsAppClick = ph.phTrackWhatsAppClick;
  __resetOnceGuardsForTests = ph.__resetOnceGuardsForTests;
  initPostHog = ph.initPostHog;
  const attr = await import("../attribution");
  captureAttributionFromUrl = attr.captureAttributionFromUrl;
  getSessionId = attr.getSessionId;
  orderAttributionPayload = attr.orderAttributionPayload;
  __resetAttributionForTests = attr.__resetAttributionForTests;
  const wa = await import("../whatsapp");
  buildWhatsAppUrl = wa.buildWhatsAppUrl;
  trackWhatsAppHandoff = wa.trackWhatsAppHandoff;
  AQUAVO_WHATSAPP_URL = wa.AQUAVO_WHATSAPP_URL;
}

/**
 * Wait until `capture()` writes THROUGH to the mock instead of queueing.
 *
 * A single `await setTimeout(0)` after initPostHog() was enough when this file ran alone and not when it
 * ran inside the full suite, where the dynamic import of posthog-js resolves against a warmer or colder
 * module cache. That made the file order-dependent — passing in isolation, failing in CI — which is
 * indistinguishable from broken instrumentation when you read the output. Poll for readiness instead of
 * guessing a delay, and fail with a clear message if it never arrives.
 */
async function waitForPostHogPipeline(): Promise<void> {
  initPostHog();
  for (let attempt = 0; attempt < 50; attempt++) {
    captured.length = 0;
    phTrackWhatsAppClick({ sourcePage: "__probe__" });
    if (captured.some((c) => c.props.source_page === "__probe__")) {
      captured.length = 0;
      return;
    }
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error("posthog pipeline never initialised — events would queue and every assertion would read an empty array");
}

beforeAll(async () => {
  await loadModulesUnderTest();
  await waitForPostHogPipeline();
});

/** Field shapes that must never appear in an analytics payload. */
const PII = /phone|email|address|customer_name|message_text|full_name|governorate/i;
const PII_VALUE = /(?<![0-9a-fA-F])(?:\+?964|00964)?0?7[3-9]\d{8}(?![0-9a-fA-F])|@[a-z]+\.[a-z]{2,}/i;

function payloads(name: string) {
  return captured.filter((c) => c.name === name);
}

beforeEach(() => {
  captured.length = 0;
  __resetOnceGuardsForTests();
  __resetAttributionForTests();
  try { sessionStorage.clear(); localStorage.clear(); } catch { /* ignore */ }
});

describe("InitiateCheckout — fires once, on the live route", () => {
  it("emits exactly one event no matter how many times the effect runs", () => {
    for (let i = 0; i < 5; i++) {
      phTrackInitiateCheckout({ numItems: 3, totalValue: 45000, productIds: ["a", "b"], sourcePage: "checkout" });
    }
    expect(payloads("InitiateCheckout")).toHaveLength(1);
  });

  it("carries the values a funnel needs and nothing personal", () => {
    phTrackInitiateCheckout({ numItems: 3, totalValue: 45000, productIds: ["a", "b"], sourcePage: "checkout" });
    const p = payloads("InitiateCheckout")[0].props;
    expect(p.num_items).toBe(3);
    expect(p.total_value).toBe(45000);
    expect(p.currency).toBe("IQD");
    expect(p.source_page).toBe("checkout");
    expect(p.product_ids).toEqual(["a", "b"]);
    for (const key of Object.keys(p)) expect(key, `PII-shaped key ${key}`).not.toMatch(PII);
  });
});

describe("Purchase — only for a real order, and only once per order", () => {
  it("does not emit without an order id — a failed submission must be silent", () => {
    phTrackPurchase({ orderId: "", totalValue: 1000, numItems: 1 });
    // @ts-expect-error deliberately exercising the undefined case a failed fetch would produce
    phTrackPurchase({ orderId: undefined, totalValue: 1000, numItems: 1 });
    expect(payloads("Purchase")).toHaveLength(0);
  });

  it("deduplicates on the ORDER, so the checkout and confirmation call sites cannot double count", () => {
    phTrackPurchase({ orderId: "AQV-1001", totalValue: 50000, numItems: 2, sourcePage: "checkout" });
    phTrackPurchase({ orderId: "AQV-1001", totalValue: 50000, numItems: 2, sourcePage: "order_confirmation" });
    expect(payloads("Purchase")).toHaveLength(1);
    expect(payloads("Purchase")[0].props.source_page).toBe("checkout");
  });

  it("still records a SECOND, different order in the same session", () => {
    phTrackPurchase({ orderId: "AQV-1001", totalValue: 50000, numItems: 2 });
    phTrackPurchase({ orderId: "AQV-1002", totalValue: 12000, numItems: 1 });
    expect(payloads("Purchase")).toHaveLength(2);
  });

  it("writes a sessionStorage marker so a reload cannot re-emit the same order", () => {
    phTrackPurchase({ orderId: "AQV-2001", totalValue: 9000, numItems: 1 });
    expect(payloads("Purchase")).toHaveLength(1);
    // The marker is what survives a remount: on reload the in-memory Set starts empty, and this is
    // the only thing standing between a refreshed success page and a duplicated Purchase.
    expect(sessionStorage.getItem("aq_evt_once_purchase_AQV-2001")).toBe("1");
  });

  it("carries order value and item context, never the customer's phone", () => {
    phTrackPurchase({ orderId: "AQV-3001", totalValue: 75000, numItems: 3, productIds: ["p1"], sourcePage: "checkout" });
    const p = payloads("Purchase")[0].props;
    expect(p.order_id).toBe("AQV-3001");
    expect(p.total_value).toBe(75000);
    expect(p.num_items).toBe(3);
    expect(p.currency).toBe("IQD");
    for (const key of Object.keys(p)) expect(key).not.toMatch(PII);
    expect(JSON.stringify(p)).not.toMatch(PII_VALUE);
  });
});

describe("WhatsApp handoff", () => {
  it("records source and product context but never the message text", () => {
    trackWhatsAppHandoff({
      source: "product",
      productId: "yee-c4-1123-1a",
      productName: "فلتر",
      category: "الفلترة والتنقية",
      message: "مرحباً، أسأل عن فلتر — رقمي 07701234567",
    });
    const p = payloads("WhatsAppClick")[0].props;
    expect(p.source_page).toBe("product");
    expect(p.product_id).toBe("yee-c4-1123-1a");
    expect(p.category).toBe("الفلترة والتنقية");
    expect(p.message_length).toBeGreaterThan(0);
    // The message may contain anything the customer types next — including their own phone number.
    expect(JSON.stringify(p)).not.toContain("07701234567");
    expect(JSON.stringify(p)).not.toContain("أسأل عن");
    expect(Object.keys(p)).not.toContain("message");
  });

  it("builds the right URL and leaves it unchanged when there is no message", () => {
    expect(buildWhatsAppUrl({ source: "footer" })).toBe(AQUAVO_WHATSAPP_URL);
    const withMsg = buildWhatsAppUrl({ source: "contact", message: "hello there" });
    expect(withMsg).toContain(`${AQUAVO_WHATSAPP_URL}?text=`);
    expect(withMsg).toContain("hello%20there");
  });

  it("emits one event per click — WhatsApp is NOT once-per-session", () => {
    // A customer may legitimately message twice from two different pages; each is a real handoff.
    trackWhatsAppHandoff({ source: "footer" });
    trackWhatsAppHandoff({ source: "contact" });
    expect(payloads("WhatsAppClick")).toHaveLength(2);
    expect(payloads("WhatsAppClick").map((c) => c.props.source_page)).toEqual(["footer", "contact"]);
  });
});

describe("attribution — the durable join key", () => {
  it("mints a stable aq_sid and reuses it", () => {
    const first = getSessionId();
    expect(first).toBeTruthy();
    expect(getSessionId()).toBe(first);
  });

  it("captures campaign parameters from the landing URL and attaches them to events", () => {
    const url = new URL(window.location.href);
    url.search = "?utm_source=meta&utm_campaign=aug-awareness&fbclid=ABC123&aq_campaign_id=c-1&aq_hypothesis_id=HYP-9";
    window.history.replaceState({}, "", url.toString());
    captureAttributionFromUrl();

    phTrackWhatsAppClick({ sourcePage: "product" });
    const p = payloads("WhatsAppClick")[0].props;
    expect(p.utm_source).toBe("meta");
    expect(p.utm_campaign).toBe("aug-awareness");
    expect(p.fbclid).toBe("ABC123");
    expect(p.aq_campaign_id).toBe("c-1");
    expect(p.aq_hypothesis_id).toBe("HYP-9");
    expect(p.aq_sid).toBeTruthy();
  });

  it("keeps FIRST touch distinct from LAST touch", () => {
    const set = (qs: string) => {
      const u = new URL(window.location.href); u.search = qs;
      window.history.replaceState({}, "", u.toString());
      captureAttributionFromUrl();
    };
    set("?utm_source=meta&utm_campaign=first-campaign");
    set("?utm_source=instagram&utm_campaign=second-campaign");

    phTrackWhatsAppClick({ sourcePage: "footer" });
    const p = payloads("WhatsAppClick")[0].props;
    expect(p.utm_source).toBe("instagram");                  // last touch wins for the event
    expect(p.first_touch_utm_campaign).toBe("first-campaign"); // acquisition is not overwritten
  });

  it("the order payload is small, deliberate, and free of anything personal", () => {
    const u = new URL(window.location.href);
    u.search = "?utm_source=meta&fbclid=XYZ&aq_ad_id=ad-7";
    window.history.replaceState({}, "", u.toString());
    captureAttributionFromUrl();

    const payload = orderAttributionPayload();
    expect(payload.aq_sid).toBeTruthy();
    expect(payload.utm_source).toBe("meta");
    expect(payload.fbclid).toBe("XYZ");
    expect(payload.aq_ad_id).toBe("ad-7");
    for (const key of Object.keys(payload)) expect(key).not.toMatch(PII);
    expect(JSON.stringify(payload)).not.toMatch(PII_VALUE);
  });

  it("bounds an attacker-controlled parameter rather than storing it whole", () => {
    const u = new URL(window.location.href);
    u.search = `?utm_source=${"x".repeat(5000)}`;
    window.history.replaceState({}, "", u.toString());
    captureAttributionFromUrl();
    phTrackWhatsAppClick({ sourcePage: "links" });
    expect(String(payloads("WhatsAppClick")[0].props.utm_source).length).toBeLessThanOrEqual(200);
  });
});
