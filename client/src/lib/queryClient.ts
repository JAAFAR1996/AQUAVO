import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { addCsrfHeader } from "@/lib/csrf";
import { normalizeCustomerOrderResponse } from "@/lib/shipping-address";
import { i18next } from "@/i18n";

// Default timeout for API requests (30 seconds)
const DEFAULT_TIMEOUT_MS = 30000;

// ── Neon cold-start: smart 503 retry ─────────────────────────────────────────
// When Neon's serverless DB is waking up the server returns 503 + Retry-After.
// We transparently wait and retry instead of throwing an error to the user.
export async function fetchWithRetryOn503(
  url: string,
  options: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxAttempts = 3,
): Promise<Response> {
  const budget = Number.isFinite(timeoutMs) && timeoutMs > 0
    ? timeoutMs : DEFAULT_TIMEOUT_MS;
  const deadline = Date.now() + budget;
  // Replaying an unkeyed write after a 503 can duplicate a successful mutation.
  // A caller that owns an idempotency contract may retry explicitly with its key.
  const method = (options.method ?? "GET").toUpperCase();
  const attempts = method === "GET" || method === "HEAD" ? maxAttempts : 1;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const remaining = deadline - Date.now();
    if (remaining <= 0 || options.signal?.aborted) {
      throw new DOMException("Request timed out or was cancelled", "AbortError");
    }
    const controller = new AbortController();
    const cancel = () => controller.abort();
    options.signal?.addEventListener("abort", cancel, { once: true });
    const timeoutId = setTimeout(cancel, remaining);
    let res: Response;
    try {
      res = await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
      options.signal?.removeEventListener("abort", cancel);
    }
    // If 503 and not last attempt → honour Retry-After and retry
    if (res.status === 503 && attempt < attempts) {
      const retryAfter = Number(res.headers.get("Retry-After") ?? "3");
      const waitMs = Math.min(5000, Math.max(0, Number.isFinite(retryAfter) ? retryAfter * 1000 : 3000));
      if (waitMs >= deadline - Date.now()) return res;
      await res.body?.cancel();
      await new Promise<void>((resolve, reject) => {
        const onAbort = () => {
          clearTimeout(timer);
          reject(new DOMException("Request cancelled", "AbortError"));
        };
        const timer = setTimeout(() => {
          options.signal?.removeEventListener("abort", onAbort);
          resolve();
        }, waitMs);
        if (options.signal?.aborted) onAbort();
        else options.signal?.addEventListener("abort", onAbort, { once: true });
      });
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
    }, timeoutMs);

    await throwIfResNotOk(res);
    return res;
  } catch (e: unknown) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error(i18next.t("errors:timeout"));
    }
    throw e;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";

export function getQueryFn<T>(options: {
  on401: UnauthorizedBehavior;
}): QueryFunction<T> {
  return async ({ queryKey, signal }) => {
    try {
      const url = queryKey.join("/") as string;
      const res = await fetchWithRetryOn503(url, {
        credentials: "include",
        signal,
      });

      if (options.on401 === "returnNull" && res.status === 401) {
        return null as T;
      }

      await throwIfResNotOk(res);
      const payload: unknown = await res.json();
      return normalizeCustomerOrderResponse(url, payload) as T;
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'AbortError') {
        throw new Error(i18next.t("errors:timeout"));
      }
      throw e;
    }
  };
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes (was Infinity)
      // The shared GET fetcher already owns a bounded retry budget. Do not
      // multiply it with another QueryClient retry loop.
      retry: false,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      // Unkeyed writes must never be repeated automatically.
      retry: false,
    },
  },
});
