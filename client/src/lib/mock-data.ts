import { mockProducts } from "@shared/mock-products";
import { Product, DifficultyLevel, EquipmentPart } from "@/types";

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
  thumbnail: product.thumbnail || product.images[0],
  images: product.images || [product.thumbnail],
  category: product.subcategory || product.category,
  specs: product.description,
  isNew: product.isNew,
  isBestSeller: product.isBestSeller,
  difficulty: product.specifications?.difficulty as DifficultyLevel | undefined,
  ecoFriendly: product.specifications?.ecoFriendly as boolean | undefined,
  videoUrl: product.specifications?.videoUrl as string | undefined,
  bundleProducts: product.specifications?.bundleProducts as string[] | undefined,
  explodedViewParts: product.specifications?.explodedViewParts as EquipmentPart[] | undefined,
}));

