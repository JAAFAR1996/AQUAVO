// posthog-js is loaded lazily inside initPostHog() to keep it out of the initial bundle.
// Events fired before init are queued and flushed once the library loads.

import { attributionProperties } from "./attribution";

const KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const HOST = import.meta.env.VITE_POSTHOG_HOST as string | undefined;
const DEV = import.meta.env.DEV as boolean | undefined;

interface MinimalPostHog {
  init(key: string, options: Record<string, unknown>): void;
  capture(event: string, properties?: Record<string, unknown>): void;
}

let phInstance: MinimalPostHog | null = null;
let initialized = false;
let initStarted = false;

type QueuedEvent = { name: string; props: Record<string, unknown> };
const queue: QueuedEvent[] = [];

export function initPostHog(): void {
  if (initStarted || !KEY || typeof window === "undefined") return;
  initStarted = true;

  void import("posthog-js").then(({ default: posthog }) => {
    phInstance = posthog as unknown as MinimalPostHog;
    posthog.init(KEY, {
      api_host: HOST ?? "https://us.i.posthog.com",
      person_profiles: "identified_only",
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
    });
    initialized = true;
    if (DEV) console.info("[PostHog] initialized — host:", HOST ?? "https://us.i.posthog.com");
    // Flush events that fired before init resolved
    for (const { name, props } of queue) {
      try {
        posthog.capture(name, props);
        if (DEV) console.info("[PostHog] flushed queued event:", name);
      } catch (_) { /* never block */ }
    }
    queue.length = 0;
  });
}

function capture(name: string, props: Record<string, unknown>): void {
  if (DEV) console.info("[PostHog] event:", name);
  // Acquisition identity travels with EVERY event, not just the three that used to spread it by hand.
  //
  // Verified in production 2026-08-14: `aq_sid` and the `aq_*` campaign ids reached PostHog on
  // InitiateCheckout, Purchase and WhatsAppClick only. $pageview, ViewContent, AddToCart, CategoryClick,
  // Search and NotificationClicked carried none of it — which are precisely the highest-volume events
  // (768 ViewContent and 217 AddToCart in 30 days against 1 WhatsAppClick). A funnel keyed on aq_sid
  // could therefore see the conversion steps but not the steps leading to them, which is the wrong half.
  //
  // Merged here, at the single chokepoint, rather than registered as posthog super-properties: super
  // properties are captured once and go stale, and last-touch attribution legitimately changes mid-visit
  // when a campaign-bearing URL is opened in an SPA without a reload. Reading it per event is a
  // localStorage read — cheap, and always current.
  //
  // Call-site props win on conflict, so the three events that already carried these values are
  // byte-identical to before. Note this covers AQUAVO's own events; posthog-js internals ($web_vitals,
  // $snapshot) do not route through here and remain without attribution.
  let merged: Record<string, unknown> = props;
  try {
    merged = { ...attributionProperties(), ...props };
  } catch (_) { /* attribution must never cost us the event */ }

  if (!initialized || !phInstance) {
    queue.push({ name, props: merged });
    return;
  }
  try {
    phInstance.capture(name, merged);
  } catch (_) { /* never block UX */ }
}

export function phTrackPageView(path: string): void {
  // Absolute, not a bare path. Verified in production 2026-08-14: $pageview stored `$current_url` as
  // "/products" while ViewContent and WhatsAppClick on the SAME page stored the full URL, so any filter
  // or join spanning pageviews and custom events silently mismatched, and PostHog web-analytics path
  // matching saw a different value than product analytics did.
  let absolute = path;
  try {
    if (typeof window !== "undefined") absolute = new URL(path, window.location.origin).href;
  } catch (_) { /* a malformed path is still worth a pageview */ }
  capture("$pageview", { $current_url: absolute });
}

export function phTrackViewContent(product: {
  id: number | string;
  name: string;
  category?: string;
  brand?: string;
  price: number | string;
  available: boolean;
}): void {
  capture("ViewContent", {
    product_id: product.id,
    product_name: product.name,
    category: product.category,
    brand: product.brand,
    price: Number(product.price),
    currency: "IQD",
    availability: product.available ? "in_stock" : "out_of_stock",
  });
}

export function phTrackAddToCart(product: {
  id: number | string;
  name: string;
  price: number | string;
  quantity: number;
  category?: string;
}): void {
  capture("AddToCart", {
    product_id: product.id,
    product_name: product.name,
    category: product.category,
    price: Number(product.price),
    currency: "IQD",
    quantity: product.quantity,
  });
}

/**
 * Emit an event at most once per browser session for a given key.
 *
 * The dedup lives HERE rather than at the call sites on purpose. `Purchase` is now fired from two
 * places — the checkout success path and the order-confirmation page — so that the event still lands if
 * a customer reaches confirmation directly or reloads it. Two call sites means double counting unless
 * something guarantees idempotence, and "remember to check first" is not a guarantee. A caller cannot
 * forget a rule it does not implement.
 *
 * sessionStorage backs the in-memory set so a page reload (React remount, a refresh on the success
 * screen) does not re-emit. Storage failures are swallowed: private mode must degrade to
 * possibly-double-counting, never to a thrown error inside a purchase flow.
 */
const emittedKeys = new Set<string>();

export function shouldEmitOnce(key: string): boolean {
  if (emittedKeys.has(key)) return false;
  emittedKeys.add(key);
  try {
    const storageKey = `aq_evt_once_${key}`;
    if (typeof sessionStorage !== "undefined") {
      if (sessionStorage.getItem(storageKey)) return false;
      sessionStorage.setItem(storageKey, "1");
    }
  } catch (_) { /* private mode / quota — fall back to the in-memory guard */ }
  return true;
}

/** Test seam: clears both guards. Not used by application code. */
export function __resetOnceGuardsForTests(): void {
  emittedKeys.clear();
  try {
    if (typeof sessionStorage !== "undefined") {
      for (const k of Object.keys(sessionStorage)) {
        if (k.startsWith("aq_evt_once_")) sessionStorage.removeItem(k);
      }
    }
  } catch (_) { /* ignore */ }
}

export function phTrackInitiateCheckout(data: {
  numItems: number;
  totalValue: number;
  /** Product ids only — never names entered by a customer, never contact details. */
  productIds?: string[];
  sourcePage?: string;
}): void {
  if (!shouldEmitOnce("initiate_checkout")) return;
  capture("InitiateCheckout", {
    num_items: data.numItems,
    total_value: data.totalValue,
    currency: "IQD",
    ...(data.productIds ? { product_ids: data.productIds } : {}),
    source_page: data.sourcePage ?? "checkout",
    ...attributionProperties(),
  });
}

export function phTrackPurchase(data: {
  orderId: number | string;
  totalValue: number;
  numItems: number;
  productIds?: string[];
  sourcePage?: string;
}): void {
  // Deduped on the ORDER, not on the session: two orders in one session must both be recorded, and one
  // order reaching this function twice must not be.
  if (!data.orderId || !shouldEmitOnce(`purchase_${data.orderId}`)) return;
  capture("Purchase", {
    order_id: data.orderId,
    total_value: data.totalValue,
    currency: "IQD",
    num_items: data.numItems,
    ...(data.productIds ? { product_ids: data.productIds } : {}),
    source_page: data.sourcePage ?? "checkout",
    ...attributionProperties(),
  });
}

export function phTrackCategoryClick(category: string): void {
  capture("CategoryClick", { category });
}

export function phTrackSearch(data: {
  queryLength: number;
  hasResults?: boolean;
}): void {
  capture("Search", {
    query_length: data.queryLength,
    has_results: data.hasResults,
  });
}

export function phTrackWhatsAppClick(data: {
  sourcePage: string;
  productId?: string;
  productName?: string;
  category?: string;
  orderNumber?: string;
  /** Length only. The prefilled text may contain anything the customer types next. */
  messageLength?: number;
}): void {
  capture("WhatsAppClick", {
    source_page: data.sourcePage,
    ...(data.productId ? { product_id: data.productId } : {}),
    ...(data.productName ? { product_name: data.productName } : {}),
    ...(data.category ? { category: data.category } : {}),
    ...(data.orderNumber ? { order_number: data.orderNumber } : {}),
    ...(typeof data.messageLength === "number" ? { message_length: data.messageLength } : {}),
    ...attributionProperties(),
  });
}

export function phTrackNotificationClicked(data: {
  type: string;
  hasTargetUrl: boolean;
  entityType?: string;
  source?: string;
}): void {
  capture("NotificationClicked", {
    notification_type: data.type,
    has_target_url: data.hasTargetUrl,
    entity_type: data.entityType,
    source: data.source ?? "notification_center",
  });
}
