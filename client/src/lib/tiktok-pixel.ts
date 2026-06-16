/**
 * TikTok Pixel Event Tracking for AQUAVO
 * Pixel ID: D7OD1FBC77U8CJLLA610
 * 
 * Events: ViewContent, AddToWishlist, Search, AddToCart,
 *         InitiateCheckout, AddPaymentInfo, PlaceAnOrder,
 *         CompleteRegistration, Purchase
 */

// TikTok Pixel global type declaration
declare global {
  interface Window {
    ttq?: {
      track: (event: string, params?: Record<string, unknown>) => void;
      identify: (params: Record<string, string>) => void;
      page: () => void;
      instance: (id: string) => unknown;
      load: (id: string) => void;
    };
  }
}

const CURRENCY = 'IQD';
const BRAND = 'AQUAVO';

// ----- Helpers -----

/** SHA-256 hash for PII data (email, phone, external_id) */
async function sha256(message: string): Promise<string> {
  if (!message || typeof window === 'undefined') return '';
  try {
    const msgBuffer = new TextEncoder().encode(message.trim().toLowerCase());
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return '';
  }
}

/** Check if TikTok Pixel SDK is loaded */
function isTtqAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.ttq;
}

/** Track a SPA route-change PageView (TikTok `page`). Safe no-op until SDK loads. */
export function ttqPage() {
  if (!isTtqAvailable() || typeof window.ttq!.page !== 'function') return;
  window.ttq!.page();
}

// ----- Identification -----

/**
 * Identify user with hashed PII data for enhanced matching.
 * Call this after login/register or whenever user info is available.
 */
export async function ttqIdentify(params: {
  email?: string;
  phone?: string;
  externalId?: string;
}) {
  if (!isTtqAvailable()) return;

  const identifyData: Record<string, string> = {};

  if (params.email) {
    identifyData.email = await sha256(params.email);
  }
  if (params.phone) {
    identifyData.phone_number = await sha256(params.phone);
  }
  if (params.externalId) {
    identifyData.external_id = await sha256(params.externalId);
  }

  if (Object.keys(identifyData).length > 0) {
    window.ttq!.identify(identifyData);
  }
}

// ----- Event Types -----

interface TtqContentItem {
  content_id: string;
  content_type: 'product' | 'product_group';
  content_name: string;
  content_category?: string;
  price?: number;
  num_items?: number;
  brand?: string;
}

interface TtqEventParams {
  contents: TtqContentItem[];
  value?: number;
  currency?: string;
  search_string?: string;
  description?: string;
  status?: string;
}

// ----- Core Track Function -----

function trackTtq(eventName: string, params: TtqEventParams) {
  if (!isTtqAvailable()) return;

  window.ttq!.track(eventName, {
    ...params,
    currency: params.currency || CURRENCY,
  });
}

// ----- E-Commerce Events -----

/** ViewContent — fired on product detail pages */
export function ttqViewContent(product: {
  id: string;
  name: string;
  category?: string;
  price: number;
  brand?: string;
  description?: string;
}) {
  trackTtq('ViewContent', {
    contents: [{
      content_id: String(product.id),
      content_type: 'product',
      content_name: product.name,
      content_category: product.category || '',
      price: product.price,
      num_items: 1,
      brand: product.brand || BRAND,
    }],
    value: product.price,
    description: product.description?.substring(0, 200),
  });
}

/** AddToWishlist — fired when user adds to wishlist */
export function ttqAddToWishlist(product: {
  id: string;
  name: string;
  price: number;
  category?: string;
}) {
  trackTtq('AddToWishlist', {
    contents: [{
      content_id: String(product.id),
      content_type: 'product',
      content_name: product.name,
      content_category: product.category,
    }],
    value: product.price,
  });
}

/** Search — fired when user searches */
export function ttqSearch(query: string, results?: Array<{
  id: string;
  name: string;
}>) {
  trackTtq('Search', {
    contents: (results || []).slice(0, 5).map(r => ({
      content_id: String(r.id),
      content_type: 'product' as const,
      content_name: r.name,
    })),
    search_string: query,
  });
}

/** AddToCart — fired when user adds product to cart */
export function ttqAddToCart(product: {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category?: string;
}) {
  trackTtq('AddToCart', {
    contents: [{
      content_id: String(product.id),
      content_type: 'product',
      content_name: product.name,
      content_category: product.category,
      price: product.price,
      num_items: product.quantity,
      brand: BRAND,
    }],
    value: product.price * product.quantity,
  });
}

/** InitiateCheckout — fired when checkout dialog opens */
export function ttqInitiateCheckout(items: Array<{
  id: string;
  name: string;
  price: number;
  quantity: number;
}>, totalValue: number) {
  trackTtq('InitiateCheckout', {
    contents: items.map(item => ({
      content_id: String(item.id),
      content_type: 'product' as const,
      content_name: item.name,
      price: item.price,
      num_items: item.quantity,
    })),
    value: totalValue,
  });
}

/** AddPaymentInfo — fired when user enters payment/delivery info */
export function ttqAddPaymentInfo(items: Array<{
  id: string;
  name: string;
  price: number;
  quantity: number;
}>, totalValue: number) {
  trackTtq('AddPaymentInfo', {
    contents: items.map(item => ({
      content_id: String(item.id),
      content_type: 'product' as const,
      content_name: item.name,
      price: item.price,
      num_items: item.quantity,
    })),
    value: totalValue,
  });
}

/** PlaceAnOrder — fired when user confirms order */
export function ttqPlaceAnOrder(items: Array<{
  id: string;
  name: string;
  price: number;
  quantity: number;
}>, totalValue: number) {
  trackTtq('PlaceAnOrder', {
    contents: items.map(item => ({
      content_id: String(item.id),
      content_type: 'product' as const,
      content_name: item.name,
      price: item.price,
      num_items: item.quantity,
    })),
    value: totalValue,
    status: 'submitted',
  });
}

/** CompleteRegistration — fired after successful registration */
export function ttqCompleteRegistration(params?: {
  value?: number;
  description?: string;
}) {
  trackTtq('CompleteRegistration', {
    contents: [{
      content_id: 'registration',
      content_type: 'product',
      content_name: 'AQUAVO Account',
    }],
    value: params?.value || 0,
    description: params?.description || 'New AQUAVO account registration',
  });
}

/** Purchase — fired on order confirmation page */
export function ttqPurchase(orderData: {
  orderId: string;
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  totalValue: number;
}) {
  // Dedup: fire once per real order ID (survives confirmation-page refresh via localStorage),
  // mirroring metaTrackPurchase. Without this, refreshes inflate TikTok Purchase + revenue.
  if (orderData.orderId && orderData.orderId !== 'unknown') {
    const dedupKey = `ttq_px_${orderData.orderId}`;
    try {
      if (localStorage.getItem(dedupKey)) return;
      localStorage.setItem(dedupKey, '1');
    } catch { /* private browsing — skip dedup, allow fire */ }
  }

  trackTtq('Purchase', {
    contents: orderData.items.map(item => ({
      content_id: String(item.id),
      content_type: 'product' as const,
      content_name: item.name,
      price: item.price,
      num_items: item.quantity,
    })),
    value: orderData.totalValue,
    status: 'completed',
    description: `Order ${orderData.orderId}`,
  });
}
