import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { GUIDE_PRODUCTS_HEADING, productCategoryForGuide } from "@shared/guide-links";
import { ProductCard } from "@/components/products/product-card";
import type { Product } from "@/types";

/**
 * The products a guide is about, under the guide.
 *
 * Guides earn most of the site's search impressions and used to link onward
 * only to a category listing. This shows up to three in-stock products of the
 * guide's category (shared/guide-links.ts decides which category), the same
 * three the server-rendered guide shows a crawler. Nothing when the guide has
 * no category or the category has no stock.
 */
export function GuideRelatedProducts() {
  const [location] = useLocation();
  const category = productCategoryForGuide(location.split("?")[0]);
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products", { category }],
    queryFn: async () => {
      const res = await fetch(`/api/products?category=${encodeURIComponent(category ?? "")}&limit=50`);
      if (!res.ok) throw new Error("Failed to fetch products");
      const data = await res.json();
      return data.products || [];
    },
    enabled: !!category,
  });
  const visible = products.filter((p) => Number(p.stock ?? 0) > 0 && Number(p.price ?? 0) > 0).slice(0, 3);
  if (!category || visible.length === 0) return null;

  return (
    <section className="container mx-auto px-4 pb-12" aria-labelledby="guide-products-title">
      <h2 id="guide-products-title" className="mb-4 text-right text-xl font-semibold text-foreground">{GUIDE_PRODUCTS_HEADING}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {visible.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
