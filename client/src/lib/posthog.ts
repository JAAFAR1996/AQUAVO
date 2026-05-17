import posthog from "posthog-js";

const KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const HOST = import.meta.env.VITE_POSTHOG_HOST as string | undefined;

let initialized = false;

export function initPostHog(): void {
  if (initialized || !KEY || typeof window === "undefined") return;
  initialized = true;
  posthog.init(KEY, {
    api_host: HOST ?? "https://us.posthog.com",
    person_profiles: "identified_only",
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
  });
}

function safe(fn: () => void): void {
  if (!initialized) return;
  try {
    fn();
  } catch (_) {
    // never block UX
  }
}

export function phTrackPageView(path: string): void {
  safe(() => posthog.capture("$pageview", { $current_url: path }));
}

export function phTrackViewContent(product: {
  id: number | string;
  name: string;
  category?: string;
  brand?: string;
  price: number | string;
  available: boolean;
}): void {
  safe(() =>
    posthog.capture("ViewContent", {
      product_id: product.id,
      product_name: product.name,
      category: product.category,
      brand: product.brand,
      price: Number(product.price),
      currency: "IQD",
      availability: product.available ? "in_stock" : "out_of_stock",
    }),
  );
}

export function phTrackAddToCart(product: {
  id: number | string;
  name: string;
  price: number | string;
  quantity: number;
  category?: string;
}): void {
  safe(() =>
    posthog.capture("AddToCart", {
      product_id: product.id,
      product_name: product.name,
      category: product.category,
      price: Number(product.price),
      currency: "IQD",
      quantity: product.quantity,
    }),
  );
}

export function phTrackInitiateCheckout(data: {
  numItems: number;
  totalValue: number;
}): void {
  safe(() =>
    posthog.capture("InitiateCheckout", {
      num_items: data.numItems,
      total_value: data.totalValue,
      currency: "IQD",
    }),
  );
}

export function phTrackPurchase(data: {
  orderId: number | string;
  totalValue: number;
  numItems: number;
}): void {
  safe(() =>
    posthog.capture("Purchase", {
      order_id: data.orderId,
      total_value: data.totalValue,
      currency: "IQD",
      num_items: data.numItems,
    }),
  );
}

export function phTrackCategoryClick(category: string): void {
  safe(() => posthog.capture("CategoryClick", { category }));
}

export function phTrackSearch(data: {
  queryLength: number;
  hasResults?: boolean;
}): void {
  safe(() =>
    posthog.capture("Search", {
      query_length: data.queryLength,
      has_results: data.hasResults,
    }),
  );
}

export function phTrackWhatsAppClick(data: {
  sourcePage: string;
  productName?: string;
}): void {
  safe(() =>
    posthog.capture("WhatsAppClick", {
      source_page: data.sourcePage,
      product_name: data.productName,
    }),
  );
}
