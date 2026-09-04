export interface ShippingAddressShape {
  addressLine1?: unknown;
  city?: unknown;
  country?: unknown;
  governorate?: unknown;
  address?: unknown;
  street?: unknown;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Convert every shipping-address shape seen in production into printable text.
 *
 * Production contains both JSONB strings and JSONB objects. Older/manual paths
 * can also carry JSON serialized into a string. Customer-facing React must never
 * receive a plain object as a child, so all display paths go through this helper.
 */
export function formatShippingAddress(value: unknown): string {
  if (value == null) return "";

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";

    // Some legacy rows/clients can hand us serialized JSON instead of the JSONB
    // object itself. Parse it only when it looks like an object and otherwise
    // preserve ordinary address text byte-for-byte apart from whitespace.
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed: unknown = JSON.parse(trimmed);
        const formatted = formatShippingAddress(parsed);
        return formatted || trimmed;
      } catch {
        return trimmed;
      }
    }

    return trimmed;
  }

  if (typeof value !== "object" || Array.isArray(value)) return "";

  const address = value as ShippingAddressShape;
  const city = text(address.city) || text(address.governorate);
  const addressLine = text(address.addressLine1) || text(address.address) || text(address.street);
  const country = text(address.country);
  const parts = [city, addressLine].filter((part) => part.length > 0);

  // The storefront normally has city + address. Country is useful only as a
  // last-resort display value for incomplete legacy data.
  if (parts.length === 0 && country) parts.push(country);

  return parts.join(" - ");
}

function normalizeOrder(order: unknown): unknown {
  if (!order || typeof order !== "object" || Array.isArray(order)) return order;

  const record = order as Record<string, unknown>;
  if (!("shippingAddress" in record)) return order;

  return {
    ...record,
    shippingAddress: formatShippingAddress(record.shippingAddress),
  };
}

/**
 * Normalize only the authenticated customer order endpoints consumed by the
 * storefront. Admin and public tracking contracts stay untouched.
 */
export function normalizeCustomerOrderResponse(url: string, payload: unknown): unknown {
  const [rawPath = ""] = url.split(/[?#]/, 1);
  const path = rawPath.replace(/\/+$/, "") || "/";

  if (path === "/api/orders") {
    return Array.isArray(payload) ? payload.map(normalizeOrder) : payload;
  }

  const segments = path.split("/").filter(Boolean);
  const isCustomerOrderDetail =
    segments.length === 3 &&
    segments[0] === "api" &&
    segments[1] === "orders" &&
    segments[2] !== "track";

  return isCustomerOrderDetail ? normalizeOrder(payload) : payload;
}
