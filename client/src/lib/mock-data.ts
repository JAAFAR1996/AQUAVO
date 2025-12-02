import { mockProducts } from "@shared/mock-products";
import { Product } from "@/types";

export const products: Product[] = mockProducts.map((product) => ({
  id: product.id,
  slug: product.slug,
  name: product.name,
  brand: product.brand,
  price: Number(product.price),
  originalPrice: product.originalPrice ? Number(product.originalPrice) : undefined,
  rating: Number(product.rating),
  reviewCount: product.reviewCount,
  image: product.thumbnail || product.images[0],
  category: product.subcategory || product.category,
  specs: product.description,
  isNew: product.isNew,
  isBestSeller: product.isBestSeller,
  difficulty: (product.specifications as any)?.difficulty,
  ecoFriendly: (product.specifications as any)?.ecoFriendly,
  videoUrl: (product.specifications as any)?.videoUrl,
  bundleProducts: (product.specifications as any)?.bundleProducts,
  explodedViewParts: (product.specifications as any)?.explodedViewParts,
}));
