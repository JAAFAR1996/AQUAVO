import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { Product } from "@/types";
import { useAuth } from "./auth-context";
import { toast } from "@/hooks/use-toast";
import { addCsrfHeader } from "@/lib/csrf";
import { syncStorage } from "@/lib/secure-storage";
import { metaTrackAddToCart } from "@/lib/meta-pixel";
import { ttqAddToCart } from "@/lib/tiktok-pixel";
import { trackAddToCart as gaTrackAddToCart } from "@/lib/analytics";
import { phTrackAddToCart } from "@/lib/posthog";
import { emitAddToCartPreview } from "@/lib/commerce-motion/preview-flags";

// Single source of truth for AddToCart tracking. Fires Meta Pixel (+CAPI),
// TikTok, GA4 and PostHog — ONLY after a successful add. Centralizing here
// guarantees every surface (cards, PDP, quick-view, suggestions, bundles…)
// tracks identically and that we never fire on a failed/blocked add.
function fireAddToCartAnalytics(args: {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category?: string;
}): void {
  if (!(args.price > 0)) return;
  const { id, name, price, quantity, category } = args;
  try { metaTrackAddToCart({ productId: id, productName: name, priceIQD: price, quantity, category }); } catch { /* tracking must never break UX */ }
  try { ttqAddToCart({ id, name, price, quantity, category }); } catch { /* noop */ }
  try { gaTrackAddToCart({ id, name, price, quantity }); } catch { /* noop */ }
  try { phTrackAddToCart({ id, name, price, quantity, category }); } catch { /* noop */ }
}

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
  /** Resolves true when the item was added, false when blocked (e.g. out of stock). */
  addItem: (product: Product, quantity?: number) => Promise<boolean>;
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

type ProductWithCartVariant = Product & {
  _variantId?: string;
  _variantLabel?: string;
};

const normalizeCartItemName = (name: string, variantLabel?: string): string => {
  if (!variantLabel) return name;

  const suffixes = [` (${variantLabel})`, ` — ${variantLabel}`, ` - ${variantLabel}`];
  for (const suffix of suffixes) {
    if (name.endsWith(suffix)) {
      return name.slice(0, -suffix.length);
    }
  }

  return name;
};

const getCartVariantMeta = (product: Product | ProductWithCartVariant) => {
  const variantSource = product as ProductWithCartVariant;
  return {
    variantId: variantSource._variantId || undefined,
    variantLabel: variantSource._variantLabel || undefined,
  };
};

const mapServerCartItem = (item: ServerCartItem): CartItem => {
  const variantLabel = item.variantLabel || undefined;
  return {
    id: item.id,
    productId: item.productId,
    name: normalizeCartItemName(item.product.name, variantLabel),
    price: Number(item.variantPrice ?? item.product.price),
    quantity: item.quantity,
    image: item.product.thumbnail || item.product.images?.[0] || '',
    slug: item.product.slug,
    variantId: item.variantId || undefined,
    variantLabel,
  };
};

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
          setItems(stored.map((item) => ({
            ...item,
            name: normalizeCartItemName(item.name, item.variantLabel),
          })));
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
              title: "تم دمج سلتك",
              description: `تمت إضافة ${localItems.length} منتج من سلتك السابقة`,
            });
          }

          // 3. Fetch the merged cart from server
          const cartRes = await fetch("/api/cart", { credentials: "include" });
          if (cartRes.ok) {
            const serverItems = await cartRes.json();
            if (Array.isArray(serverItems)) {
              const mappedItems = serverItems.map(mapServerCartItem);
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
                const mappedItems = serverItems.map(mapServerCartItem);
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

  const addItem = async (product: Product, quantity: number = 1): Promise<boolean> => {
    let { variantId, variantLabel } = getCartVariantMeta(product);

    // Safety net for "quick add" surfaces (suggestions, frequently-bought,
    // comparison, personalized…) that pass a variant product without choosing an
    // option. Variant products usually have base price 0, which would otherwise be
    // rejected below as "unavailable". Auto-pick the cheapest in-stock variant so
    // the add always succeeds; the detail page still passes an explicit choice.
    // Tracks the selected variant's stock when it is a known number (undefined
    // means "unknown" — we then defer stock validation to the server/checkout).
    let chosenVariantStock: number | undefined;
    if (!variantId && product.hasVariants && product.variants?.length) {
      const inStock = product.variants.filter((v) => (v.stock ?? 0) > 0 && Number(v.price) > 0);
      const pool = inStock.length > 0 ? inStock : product.variants.filter((v) => Number(v.price) > 0);
      const chosen = pool.slice().sort((a, b) => Number(a.price) - Number(b.price))[0];
      if (chosen) {
        product = { ...product, price: Number(chosen.price) } as Product;
        variantId = chosen.id;
        variantLabel = chosen.label;
        if (chosen.stock != null) chosenVariantStock = Number(chosen.stock);
      }
    } else if (variantId && product.variants?.length) {
      const selected = product.variants.find((v) => v.id === variantId);
      if (selected && selected.stock != null) chosenVariantStock = Number(selected.stock);
    }

    // Only block products with no price set (coming soon)
    const productPrice = Number(product.price);
    if (!productPrice || productPrice <= 0) {
      toast({
        title: "غير متوفر حالياً",
        description: "هذا المنتج غير متوفر حالياً — سيتوفر قريباً.",
        variant: "destructive",
      });
      return false;
    }

    // Display name carries the variant label so analytics + cart match the PDP.
    const displayName = variantLabel ? `${product.name} (${variantLabel})` : product.name;

    if (user) {
      // Server Side — the server is the source of truth for stock.
      try {
        const res = await fetch("/api/cart", {
          method: "POST",
          headers: addCsrfHeader({ "Content-Type": "application/json" }),
          credentials: "include",
          body: JSON.stringify({
            productId: product.id,
            quantity,
            variantPrice: variantId ? Number(product.price) : undefined,
            variantLabel,
            variantId,
          }),
        });
        if (res.ok) {
          await res.json();
          // Refresh full cart to ensure sync with server state
          const cartRes = await fetch("/api/cart", { credentials: "include" });
          if (cartRes.ok) {
            const serverItems = await cartRes.json();
            const mappedItems = serverItems.map(mapServerCartItem);
            setItems(mappedItems);
          }
          // If cartRes is not ok, item was still added — optimistic local state is already correct
          fireAddToCartAnalytics({ id: product.id, name: displayName, price: productPrice, quantity, category: product.category });
          emitAddToCartPreview({ id: product.id, name: product.name, variantLabel, quantity, price: productPrice, image: product.thumbnail || product.image || product.images?.[0] });
          return true;
        }

        if (res.status === 401) {
          toast({
            title: "جلسة منتهية",
            description: "يرجى تسجيل الدخول مرة أخرى لإضافة المنتجات.",
            variant: "destructive",
          });
          return false;
        }

        // Out-of-stock / validation → surface the server's clean Arabic message.
        let description = "الكمية المطلوبة غير متوفرة حالياً";
        try {
          const data = await res.json();
          if (data?.message && typeof data.message === "string") description = data.message;
        } catch { /* keep default Arabic message */ }
        toast({ title: "غير متوفر", description, variant: "destructive" });
        return false;
      } catch (err) {
        console.warn("Failed to add to server cart", err);
        toast({
          title: "حدث خطأ",
          description: "لم نتمكن من إضافة المنتج — حاول مرة ثانية.",
          variant: "destructive",
        });
        return false;
      }
    }

    // Guest (client-side) — validate against the product's stock before adding so
    // a guest can never oversell (the old bug: checkout later threw a raw error).
    const cartItemId = `${product.id}-${variantId || 'default'}`;
    // Only enforce a limit when stock is a KNOWN number. Unknown stock
    // (undefined/null) defers validation to the server + checkout, so we never
    // wrongly block a product whose stock field wasn't included on this surface.
    const rawStock = chosenVariantStock !== undefined
      ? chosenVariantStock
      : (product.stock ?? null);
    const stockKnown = rawStock != null && Number.isFinite(Number(rawStock));
    const available = stockKnown ? Number(rawStock) : Infinity;
    const currentQty = items.find((item) => item.id === cartItemId)?.quantity ?? 0;

    if (stockKnown && available <= 0) {
      toast({ title: "غير متوفر", description: "نفذت الكمية", variant: "destructive" });
      return false;
    }
    if (currentQty + quantity > available) {
      toast({
        title: "غير متوفر",
        description: currentQty >= available ? "وصلت للكمية المتوفرة" : "الكمية المطلوبة غير متوفرة حالياً",
        variant: "destructive",
      });
      return false;
    }

    // Use a functional update so rapid successive clicks never read a stale
    // `items` snapshot (the old "had to click add twice" bug).
    setItems((prev) => {
      const existingItem = prev.find((item) => item.id === cartItemId);
      let newItems: CartItem[];
      if (existingItem) {
        newItems = prev.map((item) =>
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
          variantLabel,
        };
        newItems = [...prev, newItem];
      }

      // Persist to localStorage + notify other tabs/components.
      syncStorage.setItem(CART_STORAGE_KEY, newItems);
      window.dispatchEvent(new StorageEvent('storage', {
        key: CART_STORAGE_KEY,
        newValue: JSON.stringify(newItems),
      }));

      return newItems;
    });

    fireAddToCartAnalytics({ id: product.id, name: displayName, price: productPrice, quantity, category: product.category });
    emitAddToCartPreview({ id: product.id, name: product.name, variantLabel, quantity, price: productPrice, image: product.thumbnail || product.image || product.images?.[0] });
    return true;
  };

  const addItems = async (products: Product[]) => {
    // Filter: only products with a price can be added
    const purchasableProducts = products.filter(p => Number(p.price) > 0);
    if (purchasableProducts.length === 0) {
      toast({
        title: "غير متوفرة حالياً",
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
        const promises = purchasableProducts.map(product => {
          const { variantId, variantLabel } = getCartVariantMeta(product);
          return fetch("/api/cart", {
            method: "POST",
            headers: addCsrfHeader({ "Content-Type": "application/json" }),
            credentials: "include",
            body: JSON.stringify({
              productId: product.id,
              quantity: 1,
              variantPrice: variantId ? Number(product.price) : undefined,
              variantLabel,
              variantId,
            }),
          });
        });

        await Promise.all(promises);

        // Refresh cart once
        const cartRes = await fetch("/api/cart", { credentials: "include" });
        if (cartRes.ok) {
          const serverItems = await cartRes.json();
          const mappedItems = serverItems.map(mapServerCartItem);
          setItems(mappedItems);
        }

        purchasableProducts.forEach((product) => {
          fireAddToCartAnalytics({ id: product.id, name: product.name, price: Number(product.price), quantity: 1, category: product.category });
        });
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
      setItems(prev => {
        let newItems = [...prev];
        purchasableProducts.forEach((product) => {
          const { variantId, variantLabel } = getCartVariantMeta(product);
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
              variantLabel,
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

      purchasableProducts.forEach((product) => {
        fireAddToCartAnalytics({ id: product.id, name: product.name, price: Number(product.price), quantity: 1, category: product.category });
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
          if (cartRes.ok) {
            const serverItems = await cartRes.json();
            if (Array.isArray(serverItems)) {
              const mappedItems = serverItems.map(mapServerCartItem);
              setItems(mappedItems);
            }
          }
          toast({
            title: "فشل حذف المنتج",
            description: "يرجى المحاولة مرة أخرى",
            variant: "destructive",
          });
        }
      } catch (err) {
        console.warn("Failed to remove from server cart", err);
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
    // Never auto-remove — user must use the trash button explicitly
    if (quantity <= 0) {
      quantity = 1;
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
        console.warn("Failed to update server cart", err);
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
          const mappedItems = serverItems.map(mapServerCartItem);
          setItems(mappedItems);
        }
      }
    } catch (err) {
      console.warn("Failed to refetch cart:", err);
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
        console.warn("Failed to clear server cart", err);
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
