import type { Product } from "@/types";
import { buildApiUrl } from "./config/env";
import { products as mockProducts } from "./mock-data";

async function getJson<T>(path: string, options?: RequestInit): Promise<T> {
  const targetUrl = buildApiUrl(path);
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
}

export async function fetchProducts(): Promise<{ products: Product[] }> {
  try {
    return await getJson<{ products: Product[] }>("/api/products");
  } catch (err) {
    console.warn("Falling back to bundled products because API call failed.", err);
    return { products: mockProducts };
  }
}

export async function fetchProduct(id: string): Promise<Product> {
  try {
    return await getJson<Product>(`/api/products/${id}`);
  } catch (err) {
    const fallback = mockProducts.find((p) => p.id === id);
    if (fallback) return fallback;
    throw err;
  }
}

export async function fetchProductBySlug(slug: string): Promise<Product> {
  try {
    return await getJson<Product>(`/api/products/slug/${slug}`);
  } catch (err) {
    const fallback = mockProducts.find((p) => p.slug === slug);
    if (fallback) return fallback;
    throw err;
  }
}
