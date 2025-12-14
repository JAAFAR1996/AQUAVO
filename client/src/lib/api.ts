import type { Product } from "@/types";
import { buildApiUrl } from "./config/env";
import { products as mockProducts } from "./mock-data";

async function getJson<T>(path: string, options?: RequestInit): Promise<T> {
  const targetUrl = buildApiUrl(path);
  try {
    const res = await fetch(targetUrl, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      ...options,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || res.statusText);
    }

    return res.json() as Promise<T>;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown fetch error";
    throw new Error(message);
  }
}

// Core functions that throw errors (used by tests and internal logic)
export async function fetchProductsCore(params?: Record<string, any>): Promise<{ products: Product[] }> {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        // Handle arrays (like categories) if backend supports it, but currently backend expects single values for simple filters
        // If backend supports ?category=a&category=b, append multiple. 
        // Our backend filter logic in product-storage checks `req.query.category as string`. So single value.
        // We will assume single value for now or comma separated if needed.
        query.append(key, String(value));
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

// Production functions with fallback to mock data
export async function fetchProducts(params?: Record<string, any>): Promise<{ products: Product[] }> {
  try {
    return await fetchProductsCore(params);
  } catch (err) {
    console.warn("Falling back to bundled products because API call failed.", err);
    return { products: mockProducts };
  }
}

export async function fetchProductAttributes(): Promise<{ categories: string[]; brands: string[] }> {
  try {
    return await getJson<{ categories: string[]; brands: string[] }>("/api/products/attributes");
  } catch (err) {
    console.warn("Failed to fetch product attributes", err);
    return { categories: [], brands: [] }; // Fallback
  }
}

export async function fetchProduct(id: string): Promise<Product> {
  try {
    return await fetchProductCore(id);
  } catch (err) {
    const fallback = mockProducts.find((p) => p.id === id);
    if (fallback) return fallback;
    throw err;
  }
}

export async function fetchProductBySlug(slug: string): Promise<Product> {
  try {
    return await fetchProductBySlugCore(slug);
  } catch (err) {
    const fallback = mockProducts.find((p) => p.slug === slug);
    if (fallback) return fallback;
    throw err;
  }
}


export async function fetchTopSellingProducts(): Promise<{
  productOfWeek: Product | null;
  bestSellers: Product[];
}> {
  try {
    return await getJson<{
      productOfWeek: Product | null;
      bestSellers: Product[];
    }>("/api/products/top-selling");
  } catch (err) {
    console.warn("Falling back to local calculation for top selling products", err);
    // Local fallback logic
    const productOfWeek = mockProducts.find((p) => p.isProductOfWeek) || mockProducts[0];
    const bestSellers = mockProducts.filter((p) => p.isBestSeller).slice(0, 4);
    return { productOfWeek, bestSellers };
  }
}

export async function searchProducts(query: string): Promise<Product[]> {
  try {
    // Calling /api/products?search=...&limit=100
    // We fetch a larger limit to allow client-side mixing/sorting for now,
    // but filtered by search term on server.
    const res = await getJson<{ products: Product[] }>(`/api/products?search=${encodeURIComponent(query)}&limit=100`);
    return res.products;
  } catch (err) {
    console.warn("Search API failed, falling back to local filter", err);
    // Fallback: filter mock products
    const lower = query.toLowerCase();
    return mockProducts.filter(p =>
      p.name.toLowerCase().includes(lower) ||
      p.description?.toLowerCase().includes(lower)
    );
  }
}

export async function fetchGallerySubmissions(): Promise<any[]> {
  try {
    return await getJson<any[]>("/api/gallery");
  } catch (err) {
    console.warn("Failed to fetch gallery submissions", err);
    return [];
  }
}

export async function voteGallerySubmission(id: string): Promise<{ success: boolean }> {
  return await getJson<{ success: boolean }>(`/api/gallery/${id}/like`, { method: "POST" });
}
