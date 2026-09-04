import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { addCsrfHeader } from "@/lib/csrf";

// Default timeout for API requests (30 seconds)
const DEFAULT_TIMEOUT_MS = 30000;

// ── Neon cold-start: smart 503 retry ─────────────────────────────────────────
// When Neon's serverless DB is waking up the server returns 503 + Retry-After.
// We transparently wait and retry instead of throwing an error to the user.
async function fetchWithRetryOn503(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
    // If 503 and not last attempt → honour Retry-After and retry
    if (res.status === 503 && attempt < maxRetries) {
      const retryAfter = parseInt(res.headers.get('Retry-After') ?? '3', 10);
      const waitMs = (isNaN(retryAfter) ? 3 : retryAfter) * 1000;
      console.warn(`[API] 503 received — retrying in ${waitMs}ms (attempt ${attempt}/${maxRetries})`);
      await new Promise(r => setTimeout(r, waitMs));
      continue;
    }
    return res;
  }
  // Unreachable — TypeScript
  throw new Error('fetchWithRetryOn503: exhausted retries');
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

/**
 * The authenticated order API returns `shippingAddress` in its canonical DB
 * shape (`{ addressLine1, city, country }`), while the customer confirmation UI
 * consumes a printable string. A logged-in customer therefore used to hand a
 * plain object to React as text, which throws "Objects are not valid as a React
 * child" and drops the whole confirmation route into ErrorBoundary.
 *
 * Keep the server contract canonical and adapt only the customer order-detail
 * response at the query boundary. Guest checkout stashes already contain a
 * string, so they pass through unchanged.
 */
export function normalizeOrderDetailResponse(url: string, payload: unknown): unknown {
  // Match `/api/orders/:id` only. Do not touch the list endpoint or public
  // tracking routes such as `/api/orders/track/:orderNumber`.
  if (!/^\/api\/orders\/[^/?#]+(?:[?#].*)?$/.test(url)) return payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return payload;

  const order = payload as Record<string, unknown>;
  const rawAddress = order.shippingAddress;
  if (rawAddress == null || typeof rawAddress === "string") return payload;

  if (typeof rawAddress !== "object" || Array.isArray(rawAddress)) {
    return { ...order, shippingAddress: "" };
  }

  const address = rawAddress as Record<string, unknown>;
  const asText = (value: unknown): string => typeof value === "string" ? value.trim() : "";
  const city = asText(address.city) || asText(address.governorate);
  const addressLine = asText(address.addressLine1) || asText(address.address) || asText(address.street);
  const country = asText(address.country);
  const parts = [city, addressLine].filter(Boolean);

  // Country is only useful as a last-resort display value; Iraqi checkout
  // normally has both city and addressLine1.
  if (parts.length === 0 && country) parts.push(country);

  return {
    ...order,
    shippingAddress: parts.join(" - "),
  };
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  timeoutMs?: number,
): Promise<Response> {
  try {
    const res = await fetchWithRetryOn503(url, {
      method,
      headers: data ? addCsrfHeader({ "Content-Type": "application/json" }) : addCsrfHeader(),
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    await throwIfResNotOk(res);
    return res;
  } catch (e: unknown) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error("انتهت مهلة الطلب - يرجى المحاولة مرة أخرى");
    }
    throw e;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
    async ({ queryKey }) => {
      try {
        const url = queryKey.join("/") as string;
        const res = await fetchWithRetryOn503(url, {
          credentials: "include",
        });

        if (unauthorizedBehavior === "returnNull" && res.status === 401) {
          return null;
        }

        await throwIfResNotOk(res);
        const payload = await res.json();
        return normalizeOrderDetailResponse(url, payload) as T;
      } catch (e: unknown) {
        if (e instanceof Error && e.name === 'AbortError') {
          throw new Error("انتهت مهلة الطلب - يرجى المحاولة مرة أخرى");
        }
        throw e;
      }
    };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes (was Infinity)
      retry: 2, // Retry twice on failure
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1, // Retry once on failure
    },
  },
});
