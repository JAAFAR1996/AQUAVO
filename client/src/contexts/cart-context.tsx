import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { Product } from "@/types";
import { useAuth } from "./auth-context";
import { toast } from "@/hooks/use-toast";
import { addCsrfHeader } from "@/lib/csrf";
import { syncStorage } from "@/lib/secure-storage";
import { ttqAddToCart } from "@/lib/tiktok-pixel";

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  slug: string;
  variantId?: string;
  variantLabel?: string;
}

// Type for server cart item response
interface ServerCartItem {
  id: string;
  productId: string;
  variantId?: string;
  variantLabel?: string;
  variantPrice?: string | number;
  product: {
    id: string;
    name: string;
    price: string | number;
    thumbnail?: string;
    images?: string[];
    slug: string;
  };
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, quantity?: number) => void;
  addItems: (products: Product[]) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  refetchCart: () => Promise<void>;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "cart-v2"; // syncStorage automatically adds 'aquavo_' prefix

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load from LocalStorage on mount (for guest)
  useEffect(() => {
    if (!user && !isInitialized) {
      const stored = syncStorage.getItem<CartItem[]>(CART_STORAGE_KEY);
      if (stored) {
        try {
          setItems(stored);
        } catch (e) {
          console.error("Failed to parse cart", e);
        }
      }
      setIsInitialized(true);
    }
  }, [user, isInitialized]);

  // Sync with Server on Login - MERGE local cart with server cart
  useEffect(() => {
    if (user) {
      const mergeGuestCartWithServer = async () => {
        try {
          // 1. Get local cart BEFORE we replace it
          const localItems: CartItem[] = syncStorage.getItem<CartItem[]>(CART_STORAGE_KEY) || [];

          // 2. If we have local items, push them to server first
          if (localItems.length > 0) {
            const pushPromises = localItems.map(item =>
              fetch("/api/cart", {
                method: "POST",
                headers: addCsrfHeader({ "Content-Type": "application/json" }),
                credentials: "include",
                body: JSON.stringify({
                  productId: item.productId,
                  quantity: item.quantity,
                  variantId: item.variantId,
                  variantLabel: item.variantLabel,
                  variantPrice: item.price
                }),
              }).catch(err => {
                console.error(`Failed to push item ${item.id} to server:`, err);
                return null; // Don't fail the whole merge
              })
            );

            await Promise.all(pushPromises);

            // Clear local storage after successful push
            syncStorage.removeItem(CART_STORAGE_KEY);

            toast({
              title: "تم دمج سلتك ✨",
              description: `تمت إضافة ${localItems.length} منتج من سلتك السابقة`,
            });
          }

          // 3. Fetch the merged cart from server
          const cartRes = await fetch("/api/cart", { credentials: "include" });
          if (cartRes.ok) {
            const serverItems = await cartRes.json();
            if (Array.isArray(serverItems)) {
              const mappedItems = serverItems.map((item: ServerCartItem) => ({
                id: item.id,
                productId: item.productId,
                name: item.product.name,
                price: Number(item.product.price),
                quantity: item.quantity,
                image: item.product.thumbnail || item.product.images?.[0] || '',
                slug: item.product.slug,
                variantId: item.variantId,
                variantLabel: item.variantLabel,
              }));
              setItems(mappedItems);
            }
          }
        } catch (err) {
          console.error("Failed to merge cart:", err);
          // On error, try to at least fetch server cart
          try {
            const cartRes = await fetch("/api/cart", { credentials: "include" });
            if (cartRes.ok) {
              const serverItems = await cartRes.json();
              if (Array.isArray(serverItems)) {
                const mappedItems = serverItems.map((item: ServerCartItem) => ({
                  id: item.id,
                  productId: item.productId,
                  name: item.product.name,
                  price: Number(item.product.price),
                  quantity: item.quantity,
                  image: item.product.thumbnail || item.product.images?.[0] || '',
                  slug: item.product.slug,
                  variantId: item.variantId,
                  variantLabel: item.variantLabel,
                }));
                setItems(mappedItems);
              }
            }
          } catch (e) {
            console.error("Failed to fetch cart:", e);
          }
        }
      };

      mergeGuestCartWithServer();
    }
  }, [user]);

  // Persist changes
  const saveCart = async (newItems: CartItem[]) => {
    setItems(newItems);

    if (user) {
      // If logged in, we should ideally sync each change. 
      // But passing the whole cart on every change is heavy.
      // The API is granular (add/remove). 
      // So this state-based save is tricky without a diff.
      // We will rely on the add/remove functions to call API directly.
    } else {
      syncStorage.setItem(CART_STORAGE_KEY, newItems);
      window.dispatchEvent(new StorageEvent('storage', {
        key: CART_STORAGE_KEY,
        newValue: JSON.stringify(newItems),
      }));
    }
  };

  const addItem = async (product: Product, quantity: number = 1) => {
    // Only block products with no price set (coming soon)
    const productPrice = Number(product.price);
    if (!productPrice || productPrice <= 0) {
      toast({
        title: "قريباً! 🐠",
        description: "هذا المنتج غير متوفر حالياً — سيتوفر قريباً إن شاء الله.",
        variant: "destructive",
      });
      return;
    }
    if (user) {
      // Server Side
      try {
        const res = await fetch("/api/cart", {
          method: "POST",
          headers: addCsrfHeader({ "Content-Type": "application/json" }),
          credentials: "include",
          body: JSON.stringify({
            productId: product.id,
            quantity,
            // _variantId is set in product-details.tsx when a variant is selected
            // Always send variantPrice when it's a variant product
            variantPrice: (product as any)._variantId
              ? Number(product.price)
              : undefined,
            variantLabel: (product as any)._variantLabel ?? undefined,
            variantId: (product as any)._variantId ?? undefined,
          }),
        });
        if (res.ok) {
          const newItem = await res.json();
          // Ideally rely on the response for the new state, but refreshing full cart ensures sync
          const cartRes = await fetch("/api/cart", { credentials: "include" });
          const serverItems = await cartRes.json();
          const mappedItems = serverItems.map((item: ServerCartItem) => ({
            id: item.id,
            productId: item.productId,
            name: item.product.name,
            price: Number(item.product.price),
            quantity: item.quantity,
            image: item.product.thumbnail || item.product.images?.[0] || '',
            slug: item.product.slug,
            variantId: item.variantId,
            variantLabel: item.variantLabel,
          }));
          setItems(mappedItems);
        } else {
          try {
            if (res.status === 401) {
              toast({
                title: "جلسة منتهية",
                description: "يرجى تسجيل الدخول مرة أخرى لإضافة المنتجات.",
                variant: "destructive",
              });
            } else {
              throw new Error("Server responded with " + res.status);
            }
          } catch (e) {
            throw e;
          }
        }
      } catch (err) {
        console.error("Failed to add to server cart", err);
        toast({
          title: "أوبس! 🦐",
          description: "الجمبري أكل الكيبل! حاول مرة ثانية.",
          variant: "destructive",
        });
      }
    } else {
      // Client Side
      const variantId = (product as any)._variantId;
      const cartItemId = `${product.id}-${variantId || 'default'}`;
      
      const existingItem = items.find((item) => item.id === cartItemId);
      let newItems;
      if (existingItem) {
        newItems = items.map((item) =>
          item.id === cartItemId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        const newItem: CartItem = {
          id: cartItemId,
          productId: product.id,
          name: product.name,
          price: Number(product.price),
          quantity: quantity,
          image: product.thumbnail || product.image || product.images?.[0] || '',
          slug: product.slug,
          variantId: variantId ?? undefined,
          variantLabel: (product as any)._variantLabel ?? undefined,
        };
        newItems = [...items, newItem];
      }
      saveCart(newItems);
    }
  };

  const addItems = async (products: Product[]) => {
    // Filter: only products with a price can be added
    const purchasableProducts = products.filter(p => Number(p.price) > 0);
    if (purchasableProducts.length === 0) {
      toast({
        title: "قريباً! 🐠",
        description: "هذه المنتجات غير متوفرة حالياً.",
        variant: "destructive",
      });
      return;
    }
    if (purchasableProducts.length < products.length) {
      toast({
        title: "تنبيه",
        description: `تم إضافة ${purchasableProducts.length} منتج فقط — البقية قريباً.`,
      });
    }
    if (user) {
      // Server Side: Add all concurrently then update state
      try {
        const promises = purchasableProducts.map(product =>
          fetch("/api/cart", {
            method: "POST",
            headers: addCsrfHeader({ "Content-Type": "application/json" }),
            credentials: "include",
            body: JSON.stringify({ productId: product.id, quantity: 1 }),
          })
        );

        await Promise.all(promises);

        // Refresh cart once
        const cartRes = await fetch("/api/cart", { credentials: "include" });
        if (cartRes.ok) {
          const serverItems = await cartRes.json();
          const mappedItems = serverItems.map((item: ServerCartItem) => ({
            id: item.id,
            productId: item.productId,
            name: item.product.name,
            price: Number(item.product.price),
            quantity: item.quantity,
            image: item.product.thumbnail || item.product.images?.[0] || '',
            slug: item.product.slug,
            variantId: item.variantId,
            variantLabel: item.variantLabel,
          }));
          setItems(mappedItems);
        }
      } catch (err) {
        console.error("Failed to add items batch", err);
        toast({
          title: "خطأ",
          description: "حدث خطأ أثناء إضافة المنتجات",
          variant: "destructive"
        });
      }
    } else {
      // Client Side: Compute new state in one go
      let currentItems = [...items]; // Copy current state (might be stale? better use functional if possible, but here we can't easily access functional setter inside this logic without refactor. BUT for guest, this function 'addItems' will run once. The problem with 'addItem' loop was re-renders not happening fast enough.)
      // Wait, inside this function 'items' is const. We should use setItems(prev => ...) to be safe.

      setItems(prev => {
        let newItems = [...prev];
        purchasableProducts.forEach((product: any) => {
          const variantId = product._variantId;
          const cartItemId = `${product.id}-${variantId || 'default'}`;
          
          const existingIndex = newItems.findIndex(i => i.id === cartItemId);
          if (existingIndex > -1) {
            newItems[existingIndex] = {
              ...newItems[existingIndex],
              quantity: newItems[existingIndex].quantity + 1
            };
          } else {
            newItems.push({
              id: cartItemId,
              productId: product.id,
              name: product.name,
              price: Number(product.price),
              quantity: 1,
              image: product.thumbnail || product.image || product.images?.[0] || '',
              slug: product.slug,
              variantId: variantId ?? undefined,
              variantLabel: product._variantLabel ?? undefined,
            });
          }
        });

        // Side effect: Save to local storage
        syncStorage.setItem(CART_STORAGE_KEY, newItems);
        window.dispatchEvent(new StorageEvent('storage', {
          key: CART_STORAGE_KEY,
          newValue: JSON.stringify(newItems),
        }));

        return newItems;
      });
    }
  };

  const removeItem = useCallback(async (id: string) => {
    if (user) {
      // Optimistic update first
      setItems(prev => prev.filter((item) => item.id !== id));

      try {
        const res = await fetch(`/api/cart/${id}`, {
          method: "DELETE",
          headers: addCsrfHeader(),
          credentials: "include"
        });
        if (!res.ok) {
          // Rollback on failure - refetch from server
          const cartRes = await fetch("/api/cart", { credentials: "include" });
          const serverItems = await cartRes.json();
          if (Array.isArray(serverItems)) {
            const mappedItems = serverItems.map((item: ServerCartItem) => ({
              id: item.id,
              productId: item.productId,
              name: item.product.name,
              price: Number(item.product.price),
              quantity: item.quantity,
              image: item.product.thumbnail || item.product.images?.[0] || '',
              slug: item.product.slug,
              variantId: item.variantId,
              variantLabel: item.variantLabel,
            }));
            setItems(mappedItems);
          }
          toast({
            title: "فشل حذف المنتج",
            description: "يرجى المحاولة مرة أخرى",
            variant: "destructive",
          });
        }
      } catch (err) {
        console.error("Failed to remove from server cart", err);
        toast({
          title: "فشل حذف المنتج",
          variant: "destructive",
        });
      }
    } else {
      // Use functional update to avoid stale closure
      setItems(prev => {
        const newItems = prev.filter((item) => item.id !== id);
        syncStorage.setItem(CART_STORAGE_KEY, newItems);
        window.dispatchEvent(new StorageEvent('storage', {
          key: CART_STORAGE_KEY,
          newValue: JSON.stringify(newItems),
        }));
        return newItems;
      });
    }
  }, [user]);

  const updateQuantity = useCallback(async (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }

    // Store old quantity for potential rollback
    let oldQuantity = 0;

    // Optimistic update using functional form
    setItems(prev => {
      const item = prev.find(i => i.id === id);
      if (item) oldQuantity = item.quantity;
      return prev.map((item) =>
        item.id === id ? { ...item, quantity } : item
      );
    });

    if (user) {
      try {
        const res = await fetch(`/api/cart/${id}`, {
          method: "PUT",
          headers: addCsrfHeader({ "Content-Type": "application/json" }),
          credentials: "include",
          body: JSON.stringify({ quantity }),
        });

        if (!res.ok) {
          // Rollback on failure
          setItems(prev => prev.map((item) =>
            item.id === id ? { ...item, quantity: oldQuantity } : item
          ));
          toast({
            title: "فشل تحديث الكمية",
            variant: "destructive",
          });
        }
      } catch (err) {
        console.error("Failed to update server cart", err);
        // Rollback on error
        setItems(prev => prev.map((item) =>
          item.id === id ? { ...item, quantity: oldQuantity } : item
        ));
        toast({
          title: "فشل تحديث الكمية",
          variant: "destructive",
        });
      }
    } else {
      // For guest users, persist to localStorage
      setItems(prev => {
        const newItems = prev.map((item) =>
          item.id === id ? { ...item, quantity } : item
        );
        syncStorage.setItem(CART_STORAGE_KEY, newItems);
        window.dispatchEvent(new StorageEvent('storage', {
          key: CART_STORAGE_KEY,
          newValue: JSON.stringify(newItems),
        }));
        return newItems;
      });
    }
  }, [user, removeItem]);

  const refetchCart = useCallback(async () => {
    if (!user) return;
    try {
      const cartRes = await fetch("/api/cart", { credentials: "include" });
      if (cartRes.ok) {
        const serverItems = await cartRes.json();
        if (Array.isArray(serverItems)) {
          const mappedItems = serverItems.map((item: ServerCartItem) => ({
            id: item.id,
            productId: item.productId,
            name: item.product.name,
            price: Number(item.product.price),
            quantity: item.quantity,
            image: item.product.thumbnail || item.product.images?.[0] || '',
            slug: item.product.slug,
            variantId: item.variantId,
            variantLabel: item.variantLabel,
          }));
          setItems(mappedItems);
        }
      }
    } catch (err) {
      console.error("Failed to refetch cart:", err);
    }
  }, [user]);

  const clearCart = async () => {
    if (user) {
      try {
        await fetch("/api/cart", {
          method: "DELETE",
          headers: addCsrfHeader(),
          credentials: "include"
        });
        setItems([]);
      } catch (err) {
        console.error("Failed to clear server cart", err);
      }
    } else {
      saveCart([]);
    }
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        addItems,
        removeItem,
        updateQuantity,
        clearCart,
        refetchCart,
        totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
        totalPrice: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
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
