// Google Analytics 4 Integration
// To use: Add VITE_GA_ID to your .env file
import { isTrackingAllowed } from "./tracking-environment";

// Cart item interface for analytics
interface AnalyticsCartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

declare global {
  interface Window {
    gtag?: (
      command: 'config' | 'event' | 'js',
      targetId: string | Date,
      config?: Record<string, unknown>
    ) => void;
    dataLayer?: unknown[];
  }
}

const GA_ID = import.meta.env.VITE_GA_ID;

// Initialize Google Analytics
export function initGA() {
  if (!GA_ID || !isTrackingAllowed()) return;

  // Load gtag script
  const script = document.createElement('script');
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  script.async = true;
  document.head.appendChild(script);

  // Initialize dataLayer
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer?.push(arguments);
  };

  window.gtag('js', new Date());
  window.gtag('config', GA_ID, {
    page_path: window.location.pathname,
    send_page_view: false, // We'll send manually
  });
}

// Track page views
export function trackPageView(url: string) {
  if (!GA_ID || !isTrackingAllowed() || !window.gtag) return;

  window.gtag('config', GA_ID, {
    page_path: url,
  });
}

// Track custom events
export function trackEvent(
  action: string,
  category: string,
  label?: string,
  value?: number
) {
  if (!GA_ID || !isTrackingAllowed() || !window.gtag) return;

  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
  });
}

// E-commerce events
export function trackAddToCart(product: {
  id: string;
  name: string;
  price: number;
  quantity: number;
}) {
  if (!GA_ID || !isTrackingAllowed() || !window.gtag) return;

  window.gtag('event', 'add_to_cart', {
    currency: 'IQD',
    value: product.price * product.quantity,
    items: [
      {
        item_id: product.id,
        item_name: product.name,
        price: product.price,
        quantity: product.quantity,
      },
    ],
  });
}

export function trackRemoveFromCart(product: {
  id: string;
  name: string;
  price: number;
  quantity: number;
}) {
  if (!GA_ID || !isTrackingAllowed() || !window.gtag) return;

  window.gtag('event', 'remove_from_cart', {
    currency: 'IQD',
    value: product.price * product.quantity,
    items: [
      {
        item_id: product.id,
        item_name: product.name,
        price: product.price,
        quantity: product.quantity,
      },
    ],
  });
}

export function trackBeginCheckout(cartItems: AnalyticsCartItem[], total: number) {
  if (!GA_ID || !isTrackingAllowed() || !window.gtag) return;

  window.gtag('event', 'begin_checkout', {
    currency: 'IQD',
    value: total,
    items: cartItems.map((item) => ({
      item_id: item.id,
      item_name: item.name,
      price: item.price,
      quantity: item.quantity,
    })),
  });
}

export function trackViewCart(cartItems: AnalyticsCartItem[], total: number) {
  if (!GA_ID || !isTrackingAllowed() || !window.gtag) return;
  window.gtag('event', 'view_cart', {
    currency: 'IQD', value: total, items: toGAItems(cartItems),
  });
}

export function trackAddShippingInfo(cartItems: AnalyticsCartItem[], total: number) {
  if (!GA_ID || !isTrackingAllowed() || !window.gtag) return;
  window.gtag('event', 'add_shipping_info', {
    currency: 'IQD', value: total, shipping_tier: 'Iraq delivery', items: toGAItems(cartItems),
  });
}

export function trackViewItemList(products: Array<AnalyticsCartItem & { category?: string }>, listName: string) {
  if (!GA_ID || !isTrackingAllowed() || !window.gtag || products.length === 0) return;
  window.gtag('event', 'view_item_list', {
    item_list_name: listName,
    items: products.map((item, index) => ({ ...toGAItem(item), index, item_category: item.category })),
  });
}

export function trackSelectItem(product: AnalyticsCartItem & { category?: string }, listName = 'products') {
  if (!GA_ID || !isTrackingAllowed() || !window.gtag) return;
  window.gtag('event', 'select_item', {
    item_list_name: listName,
    items: [{ ...toGAItem(product), item_category: product.category }],
  });
}

function toGAItem(item: AnalyticsCartItem) {
  return { item_id: item.id, item_name: item.name, price: item.price, quantity: item.quantity };
}

function toGAItems(items: AnalyticsCartItem[]) {
  return items.map(toGAItem);
}

export function trackPurchase(orderData: {
  orderId: string;
  total: number;
  items: AnalyticsCartItem[];
}) {
  if (!GA_ID || !isTrackingAllowed() || !window.gtag) return;

  window.gtag('event', 'purchase', {
    transaction_id: orderData.orderId,
    currency: 'IQD',
    value: orderData.total,
    items: orderData.items.map((item) => ({
      item_id: item.id,
      item_name: item.name,
      price: item.price,
      quantity: item.quantity,
    })),
  });
}

export function trackSearch(searchQuery: string) {
  if (!GA_ID || !isTrackingAllowed() || !window.gtag) return;

  window.gtag('event', 'search', {
    search_term: searchQuery,
  });
}

export function trackViewItem(product: {
  id: string;
  name: string;
  price: number;
  category?: string;
}) {
  if (!GA_ID || !isTrackingAllowed() || !window.gtag) return;

  window.gtag('event', 'view_item', {
    currency: 'IQD',
    value: product.price,
    items: [
      {
        item_id: product.id,
        item_name: product.name,
        item_category: product.category,
        price: product.price,
      },
    ],
  });
}

export function trackAddToWishlist(product: {
  id: string;
  name: string;
  price: number;
}) {
  if (!GA_ID || !isTrackingAllowed() || !window.gtag) return;

  window.gtag('event', 'add_to_wishlist', {
    currency: 'IQD',
    value: product.price,
    items: [
      {
        item_id: product.id,
        item_name: product.name,
        price: product.price,
      },
    ],
  });
}

// User engagement events
export function trackSignUp(method: string) {
  if (!GA_ID || !isTrackingAllowed() || !window.gtag) return;

  window.gtag('event', 'sign_up', {
    method: method,
  });
}

export function trackLogin(method: string) {
  if (!GA_ID || !isTrackingAllowed() || !window.gtag) return;

  window.gtag('event', 'login', {
    method: method,
  });
}

// CRO tracking events
export function trackWhatsAppClick(page: string, productName?: string) {
  trackEvent('whatsapp_click', 'CRO', productName ? `${page}:${productName}` : page);
}

export function trackCartOpen(cartItems?: AnalyticsCartItem[], total?: number) {
  trackEvent('cart_open', 'CRO');
  if (cartItems && typeof total === 'number') trackViewCart(cartItems, total);
}

// Custom AQUAVO events
export function trackEasterEggFound(eggName: string) {
  trackEvent('easter_egg_found', 'Gamification', eggName);
}

export function trackShrimpInteraction(mood: string) {
  trackEvent('shrimp_interaction', 'Gamification', mood);
}

export function trackFishFinderUsed() {
  trackEvent('fish_finder_used', 'Features', 'AI Fish Finder');
}

export function trackFishDoctorUsed() {
  trackEvent('fish_doctor_used', 'Features', 'Fish Health Diagnosis');
}

export function trackBioLinkClick(linkId: string) {
  trackEvent('bio_link_click', 'Links Page', linkId);
}
