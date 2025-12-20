export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'expert';
export type ThemeOption = 'light' | 'dark' | 'system';

export interface EquipmentPart {
  id: string;
  name: string;
  imageUrl: string;
  description: string;
  x?: number; // Percentage from left
  y?: number; // Percentage from top
}

export interface Bundle {
  id: string;
  name: string;
  description: string;
  products: string[]; // Product IDs
  discountPercentage: number;
  totalPrice: number;
}

export interface JourneyStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  current: boolean;
}

// Proper type for product specifications instead of Record<string, any>
export interface ProductSpecification {
  [key: string]: string | number | boolean | null | undefined;
}

// Query parameters for fetching products
export interface ProductQueryParams {
  category?: string | string[];
  brand?: string | string[];
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  sort?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  isNew?: boolean;
  isBestSeller?: boolean;
}

// Gallery submission type
export interface GallerySubmission {
  id: string;
  userId: string;
  userName?: string;
  imageUrl: string;
  description?: string;
  likes: number;
  isWinner?: boolean;
  prizeCode?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string;
  price: number;
  originalPrice?: number;
  description?: string;
  rating: number;
  reviewCount: number;
  thumbnail: string;
  image?: string; // Shorthand for thumbnail or first image
  images: string[];
  category: string;
  subcategory?: string;
  specs?: string;
  specifications?: ProductSpecification;
  isNew?: boolean;
  isBestSeller?: boolean;
  isProductOfWeek?: boolean;
  stock?: number;
  lowStockThreshold?: number;

  // Phase 0 Updates
  difficulty?: DifficultyLevel;
  ecoFriendly?: boolean;
  videoUrl?: string;
  explodedViewParts?: EquipmentPart[];
  bundleProducts?: string[]; // IDs of products in bundle
  bundleDetails?: Bundle;
}

export interface FishFinderResult {
  tankSize: string;
  experienceLevel: string;
  fishType: string;
  recommendedProducts: Product[];
}

