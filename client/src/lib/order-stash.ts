// Bridges the just-completed checkout into the order-confirmation page.
//
// Why this exists: after a purchase we navigate to /order-confirmation/:id, but
// for guests the authoritative `/api/orders/:id` endpoint returns 401 (the public
// tracking fallback omits prices). Stashing the full order we already have in hand
// at checkout time lets the confirmation page render a complete invoice for every
// user — logged-in or guest — without an extra round-trip.
//
// sessionStorage (not localStorage): scoped to the tab, auto-cleared on close, and
// never meant to outlive the confirmation view it feeds.

export interface StashedOrderItem {
  productId: string;
  productName?: string;
  quantity: number;
  priceAtPurchase?: string | number;
  variantId?: string;
  variantLabel?: string;
  image?: string;
}

export interface StashedOrder {
  id: string;
  orderNumber?: string;
  total: number;
  status?: string;
  items?: StashedOrderItem[];
  shippingAddress?: string;
  customerName?: string;
  customerPhone?: string;
  shippingCost?: string | number;
  discountTotal?: string | number;
  createdAt?: string;
  loyalty?: {
    pointsEarned: number;
    cashbackEarned: number;
    cashbackUsed: number;
    roundedTotal: number;
    tier: string;
    tierUpgraded: boolean;
  };
}

const keyFor = (id: string) => `aquavo_order_${id}`;

export function stashOrder(order: StashedOrder): void {
  if (!order?.id) return;
  try {
    sessionStorage.setItem(keyFor(order.id), JSON.stringify(order));
  } catch {
    // sessionStorage can throw in private mode / when full — the confirmation
    // page still works via the API, so this is best-effort only.
  }
}

export function readStashedOrder(id: string | undefined): StashedOrder | undefined {
  if (!id) return undefined;
  try {
    const raw = sessionStorage.getItem(keyFor(id));
    if (!raw) return undefined;
    return JSON.parse(raw) as StashedOrder;
  } catch {
    return undefined;
  }
}
