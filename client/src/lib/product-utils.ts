import { Product } from "@/types";

/** Returns true for Coming Soon / unavailable products (price=0, out of stock, or status=coming_soon) */
export function isComingSoon(product: Pick<Product, "price" | "stock">): boolean {
  return (product.price ?? 0) <= 0 || (product.stock ?? 0) <= 0;
}
