import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { Product } from "@/types";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  slug: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "fish-web-cart";

function loadCartFromStorage(): CartItem[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Failed to load cart from localStorage:", error);
  }
  return [];
}

function saveCartToStorage(items: CartItem[]): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    // Dispatch a custom event to notify other tabs
    window.dispatchEvent(new StorageEvent('storage', {
      key: CART_STORAGE_KEY,
      newValue: JSON.stringify(items),
    }));
  } catch (error) {
    console.error("Failed to save cart to localStorage:", error);
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadCartFromStorage);

  const handleStorageChange = useCallback((event: StorageEvent) => {
    if (event.key === CART_STORAGE_KEY && event.newValue) {
      try {
        const newItems = JSON.parse(event.newValue);
        setItems(newItems);
      } catch (error) {
        console.error("Failed to parse cart data from storage event:", error);
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [handleStorageChange]);

  const syncAndSetItems = (newItems: CartItem[] | ((prevItems: CartItem[]) => CartItem[])) => {
    const updatedItems = typeof newItems === 'function' ? newItems(items) : newItems;
    setItems(updatedItems);
    saveCartToStorage(updatedItems);
  };


  const addItem = (product: Product) => {
    syncAndSetItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.id === product.id);

      if (existingItem) {
        return currentItems.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      const newItem: CartItem = {
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        image: product.image,
        slug: product.slug,
      };
      return [...currentItems, newItem];
    });
  };

  const removeItem = (id: string) => {
    syncAndSetItems((currentItems) => currentItems.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    syncAndSetItems((currentItems) => {
      if (quantity <= 0) {
        return currentItems.filter((item) => item.id !== id);
      }
      return currentItems.map((item) =>
        item.id === id ? { ...item, quantity } : item
      );
    });
  };

  const clearCart = () => {
    syncAndSetItems([]);
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
