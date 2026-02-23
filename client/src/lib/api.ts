import type { Product, ProductQueryParams, GallerySubmission } from "@/types";
import { buildApiUrl } from "./config/env";
import { addCsrfHeader } from "./csrf";

// Default timeout for API requests (30 seconds)
const DEFAULT_TIMEOUT_MS = 30000;

/**
 * Fetch with timeout protection using AbortController
 * Prevents indefinite hanging requests
 */
async function fetchWithTimeout(
  url: string,
  options?: RequestInit,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function getJson<T>(path: string, options?: RequestInit, timeoutMs?: number): Promise<T> {
  const targetUrl = buildApiUrl(path);
  try {
    const res = await fetchWithTimeout(targetUrl, {
      credentials: "include",
      headers: addCsrfHeader({ "Content-Type": "application/json" }),
      ...options,
    }, timeoutMs);

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || res.statusText);
    }

    return res.json() as Promise<T>;
  } catch (e: unknown) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error("انتهت مهلة الطلب - يرجى المحاولة مرة أخرى");
    }
    const message = e instanceof Error ? e.message : "Unknown fetch error";
    throw new Error(message);
  }
}

// Core functions that throw errors (used by tests and internal logic)
export async function fetchProductsCore(params?: ProductQueryParams): Promise<{ products: Product[] }> {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => query.append(key, String(v)));
        } else {
          query.append(key, String(value));
        }
      }
    });
  }
  const queryString = query.toString() ? `?${query.toString()}` : "";
  return await getJson<{ products: Product[] }>(`/api/products${queryString}`);
}

export async function fetchProductCore(id: string): Promise<Product> {
  return await getJson<Product>(`/api/products/${id}`);
}

export async function fetchProductBySlugCore(slug: string): Promise<Product> {
  return await getJson<Product>(`/api/products/${slug}`);
}

// Production functions - NO fallback to mock data (real database only)
// Production functions - NO fallback to mock data (real database only)
export async function fetchProducts(params?: ProductQueryParams): Promise<{ products: Product[] }> {
  // Let errors propagate to useQuery
  return await fetchProductsCore(params);
}

export async function fetchProductAttributes(): Promise<{ categories: string[], brands: string[], minPrice: number, maxPrice: number }> {
  try {
    return await getJson<{ categories: string[]; brands: string[]; minPrice: number; maxPrice: number }>("/api/products/attributes");
  } catch (err) {
    console.warn("Failed to fetch product attributes", err);
    return { categories: [], brands: [], minPrice: 0, maxPrice: 0 }; // Fallback
  }
}

export async function fetchProduct(id: string): Promise<Product> {
  return await fetchProductCore(id);
}

export async function fetchProductBySlug(slug: string): Promise<Product> {
  return await fetchProductBySlugCore(slug);
}

/**
 * Fetch product variants (related sizes/power options)
 * e.g., for HYGGER HG978-18W, returns all HG978 variants (18W, 22W, 26W)
 */
export async function fetchProductVariants(slug: string): Promise<Product[]> {
  try {
    const response = await getJson<{ variants: Product[] }>(`/api/products/${slug}/variants`);
    return response.variants || [];
  } catch (err) {
    console.warn("Failed to fetch product variants:", err);
    return [];
  }
}


export async function fetchTopSellingProducts(): Promise<{
  productOfWeek: Product | null;
  bestSellers: Product[];
  hasRealSales: boolean;
}> {
  try {
    return await getJson<{
      productOfWeek: Product | null;
      bestSellers: Product[];
      hasRealSales: boolean;
    }>("/api/products/top-selling");
  } catch (err) {
    console.error("Failed to fetch top selling products:", err);
    return { productOfWeek: null, bestSellers: [], hasRealSales: false };
  }
}

export async function searchProducts(query: string): Promise<Product[]> {
  try {
    const res = await getJson<{ products: Product[] }>(`/api/products?search=${encodeURIComponent(query)}&limit=100`);
    return res.products;
  } catch (err) {
    console.error("Search API failed:", err);
    return [];
  }
}

export async function fetchPersonalizedProducts(): Promise<{ products: Product[]; personalized: boolean; method: string }> {
  try {
    return await getJson<{ products: Product[]; personalized: boolean; method: string }>("/api/products/personalized");
  } catch (err) {
    console.warn("Failed to fetch personalized products:", err);
    return { products: [], personalized: false, method: "error" };
  }
}

export async function fetchPredictedNeeds(): Promise<{
  predictions: Array<{ product: Product; probability: number; reason: string; predictedDate: string | null }>;
}> {
  try {
    return await getJson<{
      predictions: Array<{ product: Product; probability: number; reason: string; predictedDate: string | null }>;
    }>("/api/products/predicted-needs");
  } catch {
    return { predictions: [] };
  }
}

export async function fetchSmartSearch(query: string): Promise<{ products: Product[]; semantic: boolean }> {
  if (!query || query.trim().length < 2) return { products: [], semantic: false };
  try {
    return await getJson<{ products: Product[]; semantic: boolean }>(
      `/api/products/smart-search?q=${encodeURIComponent(query)}`
    );
  } catch {
    return { products: [], semantic: false };
  }
}

export async function fetchPersonalizedOrder(): Promise<{ boostIds: string[] }> {
  try {
    return await getJson<{ boostIds: string[] }>("/api/products/personalized-order");
  } catch {
    return { boostIds: [] };
  }
}

export async function fetchCartSuggestions(productIds: string[]): Promise<{ suggestions: Product[]; reason: string }> {
  if (productIds.length === 0) return { suggestions: [], reason: "" };
  try {
    return await getJson<{ suggestions: Product[]; reason: string }>(
      `/api/products/cart-suggestions?productIds=${productIds.join(",")}`
    );
  } catch (err) {
    console.warn("Failed to fetch cart suggestions:", err);
    return { suggestions: [], reason: "" };
  }
}

export async function fetchGallerySubmissions(): Promise<GallerySubmission[]> {
  try {
    return await getJson<GallerySubmission[]>("/api/gallery");
  } catch (err) {
    console.warn("Failed to fetch gallery submissions", err);
    return [];
  }
}

export async function voteGallerySubmission(id: string): Promise<{ success: boolean }> {
  try {
    return await getJson<{ success: boolean }>(`/api/gallery/${id}/like`, { method: "POST" });
  } catch (err) {
    console.error("Gallery vote failed:", err);
    return { success: false };
  }
}
