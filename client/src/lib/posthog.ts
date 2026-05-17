// posthog-js is loaded lazily inside initPostHog() to keep it out of the initial bundle.
// Events fired before init are queued and flushed once the library loads.

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
  if (!initialized || !phInstance) {
    queue.push({ name, props });
    return;
  }
  try {
    phInstance.capture(name, props);
  } catch (_) { /* never block UX */ }
}

export function phTrackPageView(path: string): void {
  capture("$pageview", { $current_url: path });
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

export function phTrackInitiateCheckout(data: {
  numItems: number;
  totalValue: number;
}): void {
  capture("InitiateCheckout", {
    num_items: data.numItems,
    total_value: data.totalValue,
    currency: "IQD",
  });
}

export function phTrackPurchase(data: {
  orderId: number | string;
  totalValue: number;
  numItems: number;
}): void {
  capture("Purchase", {
    order_id: data.orderId,
    total_value: data.totalValue,
    currency: "IQD",
    num_items: data.numItems,
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
  productName?: string;
}): void {
  capture("WhatsAppClick", {
    source_page: data.sourcePage,
    product_name: data.productName,
  });
}
