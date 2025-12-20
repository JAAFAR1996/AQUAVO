import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { Product } from "@/types";
import { useAuth } from "./auth-context";

export interface WishlistItem {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  slug: string;
  brand: string;
  rating: number;
  category: string;
}

// Type for server favorite response
interface ServerFavorite {
  product: {
    id: string;
    name: string;
    price: string | number;
    originalPrice?: string | number;
    thumbnail?: string;
    images?: string[];
    slug: string;
    brand: string;
    rating: string | number;
    category: string;
  };
}

interface WishlistContextType {
  items: WishlistItem[];
  addItem: (product: Product) => void;
  removeItem: (id: string) => void;
  isInWishlist: (id: string) => boolean;
  clearWishlist: () => void;
  totalItems: number;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

const WISHLIST_STORAGE_KEY = "fish-web-wishlist-v2";

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load from LocalStorage on mount (for guest)
  useEffect(() => {
    if (!user && !isInitialized) {
      const stored = localStorage.getItem(WISHLIST_STORAGE_KEY);
      if (stored) {
        try {
          setItems(JSON.parse(stored));
        } catch (e) {
          console.error("Failed to parse wishlist", e);
        }
      }
      setIsInitialized(true);
    }
  }, [user, isInitialized]);

  // Sync with Server on Login
  useEffect(() => {
    if (user) {
      fetch("/api/favorites", { credentials: "include" })
        .then((res) => res.json())
        .then((favorites) => {
          if (Array.isArray(favorites)) {
            const mappedItems = favorites.map((fav: ServerFavorite) => ({
              id: fav.product.id,
              name: fav.product.name,
              price: Number(fav.product.price),
              originalPrice: fav.product.originalPrice ? Number(fav.product.originalPrice) : undefined,
              image: fav.product.thumbnail || fav.product.images?.[0] || '',
              slug: fav.product.slug,
              brand: fav.product.brand,
              rating: Number(fav.product.rating),
              category: fav.product.category,
            }));
            setItems(mappedItems);
          }
        })
        .catch((err) => console.error("Failed to fetch wishlist", err));
    }
  }, [user]);

  const saveWishlist = (newItems: WishlistItem[]) => {
    setItems(newItems);
    if (!user) {
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(newItems));
      window.dispatchEvent(new StorageEvent('storage', {
        key: WISHLIST_STORAGE_KEY,
        newValue: JSON.stringify(newItems),
      }));
    }
  };

  const addItem = async (product: Product) => {
    const existingItem = items.find((item) => item.id === product.id);
    if (existingItem) return;

    if (user) {
      try {
        const res = await fetch(`/api/favorites/${product.id}`, { method: "POST", credentials: "include" });
        if (res.ok) {
          // Optimistic Add
          const newItem: WishlistItem = {
            id: product.id,
            name: product.name,
            price: Number(product.price),
            originalPrice: product.originalPrice ? Number(product.originalPrice) : undefined,
            image: product.thumbnail || product.image || product.images?.[0] || '',
            slug: product.slug,
            brand: product.brand,
            rating: Number(product.rating || 0),
            category: product.category,
          };
          setItems([...items, newItem]);
        }
      } catch (err) {
        console.error("Failed to add to server wishlist", err);
      }
    } else {
      const newItem: WishlistItem = {
        id: product.id,
        name: product.name,
        price: Number(product.price),
        originalPrice: product.originalPrice ? Number(product.originalPrice) : undefined,
        image: product.thumbnail || product.image || product.images?.[0] || '',
        slug: product.slug,
        brand: product.brand,
        rating: Number(product.rating || 0),
        category: product.category,
      };
      saveWishlist([...items, newItem]);
    }
  };

  const removeItem = async (id: string) => {
    if (user) {
      try {
        await fetch(`/api/favorites/${id}`, { method: "DELETE", credentials: "include" });
        setItems(items.filter((item) => item.id !== id));
      } catch (err) {
        console.error("Failed to remove from server wishlist", err);
      }
    } else {
      saveWishlist(items.filter((item) => item.id !== id));
    }
  };

  const isInWishlist = (id: string): boolean => {
    return items.some((item) => item.id === id);
  };

  const clearWishlist = () => {
    saveWishlist([]);
  };

  const totalItems = items.length;

  return (
    <WishlistContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        isInWishlist,
        clearWishlist,
        totalItems,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
}
