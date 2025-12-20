import { type Product } from "@/types";
import { apiRequest } from "./queryClient";

// Type for raw server response
interface ServerProduct {
    id: string;
    slug: string;
    name: string;
    brand: string;
    price: string | number;
    originalPrice?: string | number;
    description?: string;
    rating?: string | number;
    reviewCount?: string | number;
    thumbnail: string;
    image?: string;
    images: string[];
    category: string;
    subcategory?: string;
    specifications?: Record<string, unknown>;
    stock?: string | number;
    lowStockThreshold?: string | number;
    isNew?: boolean;
    isBestSeller?: boolean;
    isProductOfWeek?: boolean;
}

function mapToClientProduct(p: ServerProduct): Product {
    return {
        ...p,
        price: Number(p.price),
        originalPrice: p.originalPrice ? Number(p.originalPrice) : undefined,
        rating: Number(p.rating || 0),
        reviewCount: Number(p.reviewCount || 0),
        stock: Number(p.stock || 0),
        lowStockThreshold: Number(p.lowStockThreshold || 0),
        specs: p.specifications ? JSON.stringify(p.specifications) : p.description || "", // Fallback
        specifications: p.specifications as Record<string, unknown>
    };
}

export async function fetchTrendingProducts(): Promise<Product[]> {
    const res = await apiRequest("GET", "/api/products/info/trending");
    const data = await res.json();
    return data.map(mapToClientProduct);
}

export async function fetchFrequentlyBoughtTogether(productId: string): Promise<Product[]> {
    const res = await apiRequest("GET", `/api/products/${productId}/frequently-bought-together`);
    const data = await res.json();
    return data.map(mapToClientProduct);
}

export async function fetchSimilarProducts(productId: string): Promise<Product[]> {
    const res = await apiRequest("GET", `/api/products/${productId}/similar`);
    const data = await res.json();
    return data.map(mapToClientProduct);
}
