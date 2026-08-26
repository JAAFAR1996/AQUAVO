import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Meta Pixel loading strategy.
 *
 * fbevents.js executes as one long uninterrupted main-thread task during the
 * initial load, inside the window LCP and TBT are measured over. The script is
 * now fetched later — but the setup around it is not, because that is where the
 * attribution lives:
 *
 *   - the fbq stub must exist immediately, so every fbq() call queues rather
 *     than being lost (a previous deferral attempt moved the stub too, and DID
 *     drop events);
 *   - _fbp / _fbc must exist immediately, because every CAPI call reads them
 *     and server/routes/capi.ts copies them into user_data. Deferring without
 *     seeding would send the server a null pair for early events.
 *
 * These tests pin both, plus the guarantee that the script always loads.
 */

const PIXEL_ID = "1688029972512451";

function clearCookies() {
  for (const row of document.cookie.split("; ")) {
    const name = row.split("=")[0];
    if (name) document.cookie = `${name}=; max-age=0; path=/`;
  }
}

async function freshModule() {
  vi.resetModules();
  vi.stubEnv("VITE_META_PIXEL_ID", PIXEL_ID);
  vi.doMock("../tracking-environment", () => ({ isTrackingAllowed: () => true }));
  return await import("../meta-pixel");
}

function scriptTags(): HTMLScriptElement[] {
  return [...document.querySelectorAll("script")].filter((s) =>
    (s.src || "").includes("fbevents.js"),
  );
}

/**
 * Each `freshModule()` gives a new module instance that registers its own
 * window listeners. `window` outlives the test, so without this the listeners
 * of every earlier instance also react to a dispatched event and each appends
 * its own script tag — which looks exactly like a bug in the code under test
 * and is not one. Recording and removing them keeps the assertions strict.
 */
const listeners: Array<[string, EventListenerOrEventListenerObject]> = [];
const realAdd = window.addEventListener.bind(window);

beforeEach(() => {
  vi.useFakeTimers();
  clearCookies();
  document.head.innerHTML = "";
  delete (window as unknown as Record<string, unknown>).fbq;
  delete (window as unknown as Record<string, unknown>)._fbq;
  Object.defineProperty(document, "readyState", { value: "loading", configurable: true });

  listeners.length = 0;
  window.addEventListener = ((type: string, fn: EventListenerOrEventListenerObject, opts?: unknown) => {
    listeners.push([type, fn]);
    return realAdd(type as keyof WindowEventMap, fn as EventListener, opts as AddEventListenerOptions);
  }) as typeof window.addEventListener;
});

afterEach(() => {
  for (const [type, fn] of listeners) window.removeEventListener(type, fn);
  listeners.length = 0;
  window.addEventListener = realAdd;
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.resetModules();
});

/** A cookie's value, or undefined. jsdom keeps cleared cookies as empty entries. */
function cookieValue(name: string): string | undefined {
  const raw = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.slice(name.length + 1);
  return raw ? raw : undefined;
}

describe("the setup that must not be deferred", () => {
  it("installs the fbq stub synchronously", async () => {
    const { initMetaPixel } = await freshModule();
    initMetaPixel();
    expect(typeof window.fbq).toBe("function");
  });

  it("queues events fired before the library arrives, rather than losing them", async () => {
    const { initMetaPixel } = await freshModule();
    initMetaPixel();

    // No fbevents.js yet — callMethod is undefined, so the stub must queue.
    window.fbq("track", "ViewContent", { value: 1 }, { eventID: "e1" });
    window.fbq("track", "AddToCart", { value: 2 }, { eventID: "e2" });

    const queue = (window.fbq as unknown as { queue: unknown[][] }).queue;
    const queued = queue.map((args) => args[1]);
    expect(queued).toContain("ViewContent");
    expect(queued).toContain("AddToCart");
    // init is queued too, and must come first so the events attach to a pixel.
    expect(queue[0][0]).toBe("init");
    expect(queue[0][1]).toBe(PIXEL_ID);
  });

  it("seeds _fbp immediately, so the first CAPI call carries it", async () => {
    const { initMetaPixel } = await freshModule();
    initMetaPixel();
    const fbp = cookieValue("_fbp");
    expect(fbp, "_fbp must exist before fbevents.js loads").toBeTruthy();
    // Meta's documented format: fb.<subdomainIndex>.<creationTime>.<random>
    expect(fbp).toMatch(/^fb\.1\.\d{13}\.\d+$/);
  });

  it("does not overwrite an _fbp Meta already set", async () => {
    document.cookie = "_fbp=fb.1.1700000000000.12345; path=/";
    const { initMetaPixel } = await freshModule();
    initMetaPixel();
    expect(document.cookie).toContain("_fbp=fb.1.1700000000000.12345");
  });

  it("captures _fbc from fbclid, so an ad click survives an early bounce", async () => {
    const url = new URL(window.location.href);
    url.searchParams.set("fbclid", "IwAR_test_click_id");
    window.history.replaceState({}, "", url);

    const { initMetaPixel } = await freshModule();
    initMetaPixel();

    const fbc = cookieValue("_fbc");
    expect(fbc).toMatch(/^fb\.1\.\d{13}\.IwAR_test_click_id$/);

    url.searchParams.delete("fbclid");
    window.history.replaceState({}, "", url);
  });

  it("invents no _fbc when the visitor did not come from an ad", async () => {
    const { initMetaPixel } = await freshModule();
    initMetaPixel();
    expect(cookieValue("_fbc")).toBeUndefined();
  });
});

describe("when the script is fetched", () => {
  it("is not fetched during init itself", async () => {
    const { initMetaPixel } = await freshModule();
    initMetaPixel();
    expect(scriptTags()).toHaveLength(0);
  });

  it("is fetched on the first user interaction", async () => {
    const { initMetaPixel } = await freshModule();
    initMetaPixel();
    window.dispatchEvent(new Event("pointerdown"));
    expect(scriptTags()).toHaveLength(1);
  });

  it("is fetched on a hard timeout even if nobody touches the page", async () => {
    const { initMetaPixel } = await freshModule();
    initMetaPixel();
    expect(scriptTags()).toHaveLength(0);
    // The guarantee: a queued PageView can never sit unsent forever.
    vi.advanceTimersByTime(4000);
    expect(scriptTags()).toHaveLength(1);
  });

  it("is fetched exactly once no matter how many triggers fire", async () => {
    const { initMetaPixel, ensureMetaPixelScript } = await freshModule();
    initMetaPixel();
    window.dispatchEvent(new Event("pointerdown"));
    window.dispatchEvent(new Event("keydown"));
    window.dispatchEvent(new Event("scroll"));
    ensureMetaPixelScript();
    ensureMetaPixelScript();
    vi.advanceTimersByTime(10000);
    expect(scriptTags()).toHaveLength(1);
  });

  it("loads it async, so it never blocks parsing", async () => {
    const { initMetaPixel } = await freshModule();
    initMetaPixel();
    vi.advanceTimersByTime(4000);
    expect(scriptTags()[0].async).toBe(true);
  });
});

describe("the conversion path does not wait for idle", () => {
  it("InitiateCheckout fetches the library immediately", async () => {
    const { initMetaPixel, metaTrackInitiateCheckout } = await freshModule();
    initMetaPixel();
    expect(scriptTags()).toHaveLength(0);

    metaTrackInitiateCheckout({ totalIQD: 25000, numItems: 2, productIds: ["a", "b"] });
    expect(scriptTags(), "checkout must not wait for an idle callback").toHaveLength(1);
  });

  it("Purchase fetches the library immediately, before the dedup check", async () => {
    const { initMetaPixel, metaTrackPurchase } = await freshModule();
    initMetaPixel();
    localStorage.setItem("meta_px_order-1", "1"); // already fired once

    // Even though this call returns early on dedup, the script is on its way.
    metaTrackPurchase({ orderId: "order-1", totalIQD: 30000, productIds: ["a"], numItems: 1 });
    expect(scriptTags()).toHaveLength(1);
    localStorage.removeItem("meta_px_order-1");
  });
});

describe("nothing loads when tracking is not allowed", () => {
  it("installs no stub, writes no cookie and fetches no script", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_META_PIXEL_ID", PIXEL_ID);
    vi.doMock("../tracking-environment", () => ({ isTrackingAllowed: () => false }));
    const { initMetaPixel, ensureMetaPixelScript } = await import("../meta-pixel");

    initMetaPixel();
    ensureMetaPixelScript();
    vi.advanceTimersByTime(10000);

    expect(window.fbq).toBeUndefined();
    expect(cookieValue("_fbp")).toBeUndefined();
    expect(scriptTags()).toHaveLength(0);
  });
});
