export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'expert';
export type ThemeOption = 'light' | 'dark' | 'neon-ocean' | 'pastel' | 'monochrome';

export interface EquipmentPart {
  id: string;
  name: string;
  imageUrl: string;
  description: string;
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

export interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  image: string;
  category: string;
  specs: string;
  isNew?: boolean;
  isBestSeller?: boolean;

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
