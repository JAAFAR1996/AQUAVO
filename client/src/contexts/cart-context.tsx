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
import { useTranslation } from "react-i18next";
import { getClientSessionId } from "@/lib/client-session";

// Single source of truth for AddToCart tracking. Fires Meta Pixel (+CAPI),
// TikTok, GA4 and PostHog — ONLY after a successful add. Centralizing here
// guarantees every surface (cards, PDP, quick-view, suggestions, bundles…)
// tracks identically and that we never fire on a failed/blocked add.
function fireCartLifecycleAnalytics(
  action: "add" | "remove" | "touch",
  productId: string,
  quantity: number = 1,
): void {
  try {
    void fetch("/api/analytics/cart-event", {
      method: "POST",
      headers: addCsrfHeader({ "Content-Type": "application/json" }),
      credentials: "include",
      keepalive: true,
      body: JSON.stringify({
        action,
        productId,
        quantity,
        clientSessionId: getClientSessionId(),
      }),
    }).catch(() => {});
  } catch {
    // Analytics can never block cart UX.
  }
}

/**
 * Guest carts are stored locally, so the server cannot infer their monetary
 * subtotal from a product-id event. Send an anonymous, non-authoritative
 * snapshot after cart state settles; never include personal data.
 */
function fireCartValueSnapshot(items: CartItem[]): void {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  if (!Number.isSafeInteger(subtotal) || subtotal < 0 || subtotal > 100_000_000) return;
  try {
    void fetch("/api/analytics/cart-value", {
      method: "POST",
      headers: addCsrfHeader({ "Content-Type": "application/json" }),
      credentials: "include",
      keepalive: true,
      body: JSON.stringify({ subtotal, clientSessionId: getClientSessionId() }),
    }).catch(() => {});
  } catch {
    // Observability must never block commerce.
  }
}

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
  /**
   * Known available stock for this exact line (variant stock when this is a
   * variant, base-product stock otherwise). `undefined` means "unknown" —
   * the client never invents a cap and defers enforcement to the server,
   * matching the existing addItem() semantics.
   */
  stock?: number;
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
    stock?: number | string | null;
    variants?: Array<{ id: string; stock?: number | string | null }> | null;
  };
  quantity: number;
}

type CartPreflightLine = {
  productId: string;
  variantId?: string | null;
  quantity: number;
  name?: string;
  slug?: string;
  thumbnail?: string | null;
  variantLabel?: string | null;
  price?: number | null;
  stock: number;
  valid: boolean;
  reason?: string | null;
};

async function preflightGuestCartItems(items: CartItem[]): Promise<CartItem[]> {
  if (items.length === 0) return items;

  try {
    const response = await fetch("/api/cart/preflight", {
      method: "POST",
      headers: addCsrfHeader({ "Content-Type": "application/json" }),
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify({
        items: items.map(({ productId, variantId, quantity }) => ({
          productId,
          ...(variantId ? { variantId } : {}),
          quantity,
        })),
      }),
    });
    if (!response.ok) return items;

    const payload = await response.json() as { items?: CartPreflightLine[] };
    if (!Array.isArray(payload.items)) return items;

    const key = (productId: string, variantId?: string | null) =>
      `${productId}::${variantId ?? ""}`;
    const currentByKey = new Map(
      payload.items.map((line) => [key(line.productId, line.variantId), line]),
    );

    return items.map((item) => {
      const current = currentByKey.get(key(item.productId, item.variantId));
      if (!current) return item;

      const identityStillValid = ![
        "PRODUCT_NOT_FOUND",
        "VARIANT_REQUIRED",
        "VARIANT_INVALID",
        "NOT_PURCHASABLE",
      ].includes(String(current.reason ?? ""));

      return {
        ...item,
        name: current.name ?? item.name,
        slug: current.slug ?? item.slug,
        image: current.thumbnail ?? item.image,
        variantLabel: current.variantLabel ?? item.variantLabel,
        price: identityStillValid && current.price != null
          ? Number(current.price)
          : item.price,
        stock: Number.isFinite(Number(current.stock))
          ? Math.max(0, Number(current.stock))
          : 0,
      };
    });
  } catch {
    return items;
  }
}

interface CartContextType {
  items: CartItem[];
  /** True only after auth resolution and the correct guest/server cart has been hydrated. */
  isReady: boolean;
  /** Resolves true when the item was added, false when blocked (e.g. out of stock). */
  addItem: (product: Product, quantity?: number) => Promise<boolean>;
  /** Adds each product through the same validated path as addItem; returns count successfully added. */
  addItems: (products: Product[]) => Promise<number>;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  refetchCart: () => Promise<CartItem[]>;
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

// Resolves the KNOWN stock cap for a server-sourced cart line: variant stock
// when the line has a variant, base-product stock otherwise. Returns
// `undefined` when the source value is missing/non-numeric — "unknown" defers
// enforcement to the server rather than inventing a limit.
const resolveServerCartItemStock = (
  product: ServerCartItem["product"],
  variantId: string | undefined
): number | undefined => {
  if (variantId && Array.isArray(product.variants)) {
    const variant = product.variants.find((v) => v.id === variantId);
    if (variant && variant.stock != null && Number.isFinite(Number(variant.stock))) {
      return Number(variant.stock);
    }
    return undefined;
  }
  if (product.stock != null && Number.isFinite(Number(product.stock))) {
    return Number(product.stock);
  }
  return undefined;
};

const mapServerCartItem = (item: ServerCartItem): CartItem => {
  const variantLabel = item.variantLabel || undefined;
  const variantId = item.variantId || undefined;
  return {
    id: item.id,
    productId: item.productId,
    name: normalizeCartItemName(item.product.name, variantLabel),
    price: Number(item.variantPrice ?? item.product.price),
    quantity: item.quantity,
    image: item.product.thumbnail || item.product.images?.[0] || '',
    slug: item.product.slug,
    variantId,
    variantLabel,
    stock: resolveServerCartItemStock(item.product, variantId),
  };
};

export function CartProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation("common");
  const { user, isLoading: isAuthLoading } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const hadCartItemsForAnalytics = React.useRef(false);

  // Debounced post-hydration cart snapshot. The zero-value snapshot after
  // clearing a previously non-empty cart prevents a stale abandoned-cart total.
  // Never create sessions for visitors who have not put anything in a cart.
  useEffect(() => {
    if (isAuthLoading || !isInitialized) return;
    if (items.length > 0) hadCartItemsForAnalytics.current = true;
    if (!hadCartItemsForAnalytics.current) return;
    const timer = window.setTimeout(() => fireCartValueSnapshot(items), 250);
    return () => window.clearTimeout(timer);
  }, [items, isAuthLoading, isInitialized]);



  // Load from LocalStorage on mount (for guest)
  useEffect(() => {
    if (!isAuthLoading && !user && !isInitialized) {
      const stored = syncStorage.getItem<CartItem[]>(CART_STORAGE_KEY);
      if (stored) {
        try {
          const normalized = stored.map((item) => ({
            ...item,
            name: normalizeCartItemName(item.name, item.variantLabel),
          }));
          setItems(normalized);

          // localStorage is only a convenience snapshot. Reconcile it against
          // current public catalogue truth immediately so guest users do not
          // browse or enter checkout with obsolete price/stock information.
          void preflightGuestCartItems(normalized).then((freshItems) => {
            setItems(freshItems);
            syncStorage.setItem(CART_STORAGE_KEY, freshItems);
          });
        } catch (e) {
          console.error("Failed to parse cart", e);
        }
      }
      setIsInitialized(true);
    }
  }, [user, isAuthLoading, isInitialized]);

  // Sync with Server on Login - MERGE local cart with server cart
  useEffect(() => {
    if (!isAuthLoading && user) {
      setIsInitialized(false);
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
                  variantPrice: item.price,
                  clientSessionId: getClientSessionId(),
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
              title: t("cart-context.s1"),
              description: t("cart-context.s2", { v0: localItems.length }),
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

      void mergeGuestCartWithServer().finally(() => setIsInitialized(true));
    }
  }, [user, isAuthLoading]);

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
        title: t("cart-context.s3"),
        description: t("cart-context.s4"),
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
            clientSessionId: getClientSessionId(),
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
          return true;
        }

        if (res.status === 401) {
          toast({
            title: t("cart-context.s5"),
            description: t("cart-context.s6"),
            variant: "destructive",
          });
          return false;
        }

        // Out-of-stock / validation → surface the server's clean Arabic message.
        let description = t("cart-context.s7");
        try {
          const data = await res.json();
          if (data?.message && typeof data.message === "string") description = data.message;
        } catch { /* keep default Arabic message */ }
        toast({ title: t("cart-context.s8"), description, variant: "destructive" });
        return false;
      } catch (err) {
        console.warn("Failed to add to server cart", err);
        toast({
          title: t("cart-context.s9"),
          description: t("cart-context.s10"),
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
    // Cap stored on the cart line itself so later quantity increments (e.g. the
    // "+" button in the cart drawer) can enforce it without re-deriving stock.
    const itemStock = stockKnown ? Number(rawStock) : undefined;
    const currentQty = items.find((item) => item.id === cartItemId)?.quantity ?? 0;

    if (stockKnown && available <= 0) {
      toast({ title: t("cart-context.s8"), description: t("cart-context.s11"), variant: "destructive" });
      return false;
    }
    if (currentQty + quantity > available) {
      toast({
        title: t("cart-context.s8"),
        description: currentQty >= available ? t("cart-context.s12") : t("cart-context.s7"),
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
            ? { ...item, quantity: item.quantity + quantity, stock: itemStock }
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
          stock: itemStock,
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
    fireCartLifecycleAnalytics("add", product.id, quantity);
    return true;
  };

  const addItems = async (products: Product[]): Promise<number> => {
    if (products.length === 0) return 0;

    // Deliberately reuse addItem() instead of maintaining a second cart path.
    // This keeps stock/variant validation, server error handling, guest caps and
    // analytics identical for single-add and batch-add surfaces.
    let addedCount = 0;
    for (const product of products) {
      if (await addItem(product, 1)) addedCount += 1;
    }

    if (addedCount === 0) {
      toast({
        title: t("cart-context.s13"),
        description: t("cart-context.s14"),
        variant: "destructive",
      });
    } else if (addedCount < products.length) {
      toast({
        title: t("cart-context.s15"),
        description: t("cart-context.s16", { v0: addedCount }),
      });
    }

    return addedCount;
  };

  const removeItem = useCallback(async (id: string) => {
    const removedItem = items.find((item) => item.id === id);
    if (user) {
      // Optimistic update first
      setItems(prev => prev.filter((item) => item.id !== id));

      try {
        const res = await fetch(`/api/cart/${id}`, {
          method: "DELETE",
          headers: addCsrfHeader(),
          credentials: "include"
        });
        if (res.ok && removedItem) {
          fireCartLifecycleAnalytics("remove", removedItem.productId, removedItem.quantity);
        }
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
            title: t("cart-context.s19"),
            description: t("cart-context.s20"),
            variant: "destructive",
          });
        }
      } catch (err) {
        console.warn("Failed to remove from server cart", err);
        toast({
          title: t("cart-context.s19"),
          variant: "destructive",
        });
      }
    } else {
      if (removedItem) {
        fireCartLifecycleAnalytics("remove", removedItem.productId, removedItem.quantity);
      }
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
  }, [user, items]);

  const updateQuantity = useCallback(async (id: string, quantity: number) => {
    // Never auto-remove — user must use the trash button explicitly
    if (quantity <= 0) {
      quantity = 1;
    }

    // Enforce the KNOWN stock cap client-side (variant stock for variant
    // lines, base-product stock otherwise) so the "+" control can't push the
    // quantity past what we know is available. Unknown stock (undefined)
    // means we never saw a stock number for this line — defer entirely to
    // the server, which remains the final authority either way.
    const currentItem = items.find((item) => item.id === id);
    const knownStock = currentItem?.stock;
    if (knownStock != null && Number.isFinite(knownStock) && quantity > knownStock) {
      toast({
        title: t("cart-context.s8"),
        description: knownStock <= 0 ? t("cart-context.s11") : t("cart-context.s12"),
        variant: "destructive",
      });
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

        if (res.ok && currentItem) {
          fireCartLifecycleAnalytics("touch", currentItem.productId, quantity);
        }
        if (!res.ok) {
          // Rollback on failure
          setItems(prev => prev.map((item) =>
            item.id === id ? { ...item, quantity: oldQuantity } : item
          ));
          toast({
            title: t("cart-context.s21"),
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
          title: t("cart-context.s21"),
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
      if (currentItem) {
        fireCartLifecycleAnalytics("touch", currentItem.productId, quantity);
      }
    }
  }, [user, removeItem, items]);

  const refetchCart = useCallback(async (): Promise<CartItem[]> => {
    if (!user) {
      const freshItems = await preflightGuestCartItems(items);
      setItems(freshItems);
      syncStorage.setItem(CART_STORAGE_KEY, freshItems);
      return freshItems;
    }
    try {
      const cartRes = await fetch("/api/cart", { credentials: "include" });
      if (cartRes.ok) {
        const serverItems = await cartRes.json();
        if (Array.isArray(serverItems)) {
          const mappedItems = serverItems.map(mapServerCartItem);
          setItems(mappedItems);
          return mappedItems;
        }
      }
    } catch (err) {
      console.warn("Failed to refetch cart:", err);
    }
    return items;
  }, [user, items]);

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
        isReady: !isAuthLoading && isInitialized,
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