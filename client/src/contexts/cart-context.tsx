import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from "react";
import { Product } from "@/types";
import { isVariantActive, isVariantComingSoon, isVariantPurchasable } from "@shared/variant-commerce";
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
        stock: identityStillValid && Number.isFinite(Number(current.stock))
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

type PendingCartLine = CartItem & { targetQuantity: number };

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
  const itemsRef = useRef<CartItem[]>([]);
  const setCartItems = useCallback((next: CartItem[]) => {
    itemsRef.current = next;
    setItems(next);
  }, []);
  const confirmedItems = useRef<CartItem[]>([]);
  const pendingEdits = useRef(new Map<symbol, (cart: CartItem[]) => CartItem[]>());
  const mutationQueue = useRef<Promise<void>>(Promise.resolve());
  const accountLoad = useRef<Promise<void>>(Promise.resolve());
  const renderAccountCart = useCallback(() => {
    let next = confirmedItems.current;
    for (const apply of pendingEdits.current.values()) next = apply(next);
    setCartItems(next);
  }, [setCartItems]);

  // Single notification source: no optimistic "added" before the cart accepts the item.
  const notifyCartAdded = (name: string, quantity: number) => {
    toast({
      title: t("toaster.added"),
      description: t("toaster.addedQty", { v0: quantity, v1: name }),
      swipeCart: true,
      cartAction: true,
    });
  };

  const userId = user?.id;
  const guestRefreshVersion = useRef(0);

  const refreshGuestCart = useCallback(async (snapshot: CartItem[]): Promise<CartItem[]> => {
    const version = ++guestRefreshVersion.current;
    const freshItems = await preflightGuestCartItems(snapshot);
    // Keep the current basket membership and quantities. A slow catalogue
    // response may arrive after a quantity change, removal or new addition.
    const current = syncStorage.getItem<CartItem[]>(CART_STORAGE_KEY);
    const latest = Array.isArray(current) ? current : itemsRef.current;
    if (version !== guestRefreshVersion.current || freshItems === snapshot) return latest;

    const freshById = new Map(freshItems.map(item => [item.id, item]));
    const updated = latest.map(item => {
      const fresh = freshById.get(item.id);
      return fresh ? { ...fresh, quantity: item.quantity } : item;
    });
    syncStorage.setItem(CART_STORAGE_KEY, updated);
    setCartItems(updated);
    return updated;
  }, [setCartItems]);

  // Restore the guest basket on initial load and whenever an account signs out.
  useEffect(() => {
    if (isAuthLoading || userId) return;
    const stored = syncStorage.getItem<CartItem[]>(CART_STORAGE_KEY);
    const normalized = Array.isArray(stored) ? stored
      .filter(item => item && typeof item.name === "string" && typeof item.id === "string")
      .map(item => ({ ...item, name: normalizeCartItemName(item.name, item.variantLabel) })) : [];
    setCartItems(normalized);
    setIsInitialized(true);
    if (normalized.length) void refreshGuestCart(normalized);
    return () => { ++guestRefreshVersion.current; };
  }, [userId, isAuthLoading, refreshGuestCart, setCartItems]);

  // Keep unconfirmed transfers tied to this account on shared devices.
  const activeAccountId = useRef(userId);
  activeAccountId.current = userId;
  const mergesInFlight = useRef(new Map<string, Promise<{ total: number; remaining: number }>>());

  // Apply user intents immediately, but send account writes in their original
  // order. Failed writes remove only their own intent, revealing the last
  // confirmed server state without undoing a later click.
  const mutateAccountCart = useCallback(async (
    apply: (cart: CartItem[]) => CartItem[],
    request: (cart: CartItem[]) => Promise<CartItem[]>,
  ): Promise<boolean> => {
    const accountId = activeAccountId.current;
    const editId = Symbol();
    pendingEdits.current.set(editId, apply);
    renderAccountCart();
    const operation = mutationQueue.current.then(async () => {
      await accountLoad.current;
      if (!accountId || activeAccountId.current !== accountId) {
        pendingEdits.current.delete(editId);
        return false;
      }
      try {
        const next = await request(confirmedItems.current);
        if (activeAccountId.current !== accountId) return false;
        confirmedItems.current = next;
        return true;
      } finally {
        pendingEdits.current.delete(editId);
        if (activeAccountId.current === accountId) renderAccountCart();
      }
    });
    mutationQueue.current = operation.then(() => undefined, () => undefined);
    return operation;
  }, [renderAccountCart]);

  useEffect(() => {
    if (isAuthLoading || !userId) return;
    let active = true;
    confirmedItems.current = [];
    pendingEdits.current.clear();
    setCartItems([]);
    setIsInitialized(false);
    const mergeKey = `${CART_STORAGE_KEY}-merge-${userId}`;
    const mergeGuestLines = async () => {
      const guest = syncStorage.getItem<CartItem[]>(CART_STORAGE_KEY) ?? [];
      const pending = syncStorage.getItem<PendingCartLine[]>(mergeKey) ?? [];
      if (!guest.length && !pending.length) return { total: 0, remaining: 0 };
      // Claim guest lines for this account before awaiting network I/O.
      const claimed = new Map(pending.map(line => [line.id, line]));
      for (const line of guest) {
        const previous = claimed.get(line.id);
        claimed.set(line.id, {
          ...line,
          quantity: line.quantity + (previous?.quantity ?? 0),
          targetQuantity: previous?.targetQuantity ? previous.targetQuantity + line.quantity : 0,
        });
      }
      const lines = [...claimed.values()];
      syncStorage.setItem(mergeKey, lines);
      syncStorage.removeItem(CART_STORAGE_KEY);

      const cartResponse = await fetch("/api/cart", { credentials: "include" });
      if (!cartResponse.ok || activeAccountId.current !== userId) return { total: lines.length, remaining: lines.length };
      const serverItems: ServerCartItem[] = await cartResponse.json();
      if (!Array.isArray(serverItems) || activeAccountId.current !== userId) return { total: lines.length, remaining: lines.length };
      const lineKey = (item: { productId: string; variantId?: string }) => JSON.stringify([item.productId, item.variantId ?? null]);
      const existingByKey = new Map(serverItems.map(item => [lineKey(item), item]));
      // Persist absolute targets first: if the server adds a line and its
      // response is lost, a later attempt can recognize it without doubling it.
      for (const item of lines) {
        if (!item.targetQuantity) {
          item.targetQuantity = (existingByKey.get(lineKey(item))?.quantity ?? 0) + item.quantity;
        }
      }
      syncStorage.setItem(mergeKey, lines);
      const results = await Promise.all(lines.map(async item => {
        const existing = existingByKey.get(lineKey(item));
        if (existing && existing.quantity >= item.targetQuantity) return true;
        try {
          const payload = existing ? { quantity: item.targetQuantity } : {
            productId: item.productId, quantity: item.targetQuantity,
            variantId: item.variantId, variantLabel: item.variantLabel,
            variantPrice: item.price, clientSessionId: getClientSessionId(),
          };
          const response = await fetch(existing ? `/api/cart/${existing.id}` : "/api/cart", {
            method: existing ? "PUT" : "POST", credentials: "include",
            headers: addCsrfHeader({ "Content-Type": "application/json" }),
            body: JSON.stringify(payload),
          });
          return response.ok;
        } catch {
          return false;
        }
      }));
      const remaining = lines.filter((_, index) => !results[index]);
      if (remaining.length) syncStorage.setItem(mergeKey, remaining);
      else syncStorage.removeItem(mergeKey);
      return { total: lines.length, remaining: remaining.length };
    };

    const syncAccountCart = async () => {
      try {
        let merge = mergesInFlight.current.get(userId);
        if (!merge) {
          merge = mergeGuestLines().finally(() => mergesInFlight.current.delete(userId));
          mergesInFlight.current.set(userId, merge);
        }
        const { total, remaining } = await merge;
        if (!active) return;
        if (remaining) {
          toast({ title: t("cart-context.s15"), description: t("cart-context.mergeIncomplete", { count: remaining }), variant: "destructive" });
        } else if (total) {
          toast({ title: t("cart-context.s1"), description: t("cart-context.s2", { v0: total }) });
        }
        const response = await fetch("/api/cart", { credentials: "include" });
        if (response.ok) {
          const serverItems = await response.json();
          if (active && Array.isArray(serverItems)) {
            confirmedItems.current = serverItems.map(mapServerCartItem);
            renderAccountCart();
          }
        }
      } catch (error) {
        console.error("Failed to load account cart", error);
      } finally {
        if (active) setIsInitialized(true);
      }
    };
    accountLoad.current = syncAccountCart();
    return () => { active = false; };
  }, [userId, isAuthLoading, setCartItems, renderAccountCart]);

  // Persist changes
  const saveGuestCart = useCallback((newItems: CartItem[]) => {
    setCartItems(newItems);
    syncStorage.setItem(CART_STORAGE_KEY, newItems);
    window.dispatchEvent(new StorageEvent('storage', {
      key: CART_STORAGE_KEY,
      newValue: JSON.stringify(newItems),
    }));
  }, [setCartItems]);

  const addItem = async (product: Product, quantity: number = 1, notifySuccess = true): Promise<boolean> => {
    if (!Number.isInteger(quantity) || quantity <= 0) return false;
    let { variantId, variantLabel } = getCartVariantMeta(product);

    // Safety net for "quick add" surfaces (suggestions, frequently-bought,
    // comparison, personalized…) that pass a variant product without choosing an
    // option. Variant products usually have base price 0, which would otherwise be
    // rejected below as "unavailable". Auto-pick the cheapest in-stock variant so
    // the add always succeeds; the detail page still passes an explicit choice.
    // Tracks the selected variant's stock when it is a known number (undefined
    // means "unknown" — we then defer stock validation to the server/checkout).
    let chosenVariantStock: number | undefined;
    if (!variantId && product.hasVariants) {
      const available = (product.variants ?? []).filter(variant => isVariantPurchasable(variant, quantity));
      const chosen = available.sort((a, b) => Number(a.price) - Number(b.price))[0];
      if (!chosen) {
        toast({ title: t("cart-context.s8"), description: t("cart-context.s7"), variant: "destructive" });
        return false;
      }
      product = { ...product, price: Number(chosen.price) };
      variantId = chosen.id;
      variantLabel = chosen.label;
      chosenVariantStock = Number(chosen.stock);
    } else if (variantId && product.variants?.length) {
      const selected = product.variants.find(variant => variant.id === variantId);
      if (!selected || !isVariantActive(selected) || isVariantComingSoon(selected) || selected.priceStatus === "pending") {
        toast({ title: t("cart-context.s8"), description: t("cart-context.s7"), variant: "destructive" });
        return false;
      }
      if (selected.stock != null) chosenVariantStock = Number(selected.stock);
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
      try {
        const added = await mutateAccountCart(cart => cart, async cart => {
          const res = await fetch("/api/cart", {
            method: "POST",
            headers: addCsrfHeader({ "Content-Type": "application/json" }),
            credentials: "include",
            body: JSON.stringify({
              productId: product.id, quantity,
              variantPrice: variantId ? Number(product.price) : undefined,
              variantLabel, variantId, clientSessionId: getClientSessionId(),
            }),
          });
          if (!res.ok) {
            let description = res.status === 401 ? t("cart-context.s6") : t("cart-context.s7");
            const data = await res.json().catch(() => null) as { message?: string } | null;
            if (typeof data?.message === "string") description = data.message;
            throw new Error(description);
          }
          const saved = await res.json() as { id: string; quantity: number; variantPrice?: string | number | null };
          const existing = cart.find(item => item.productId === product.id && item.variantId === variantId);
          const line: CartItem = {
            id: saved.id, productId: product.id,
            name: normalizeCartItemName(product.name, variantLabel),
            price: Number(saved.variantPrice ?? product.price),
            quantity: saved.quantity,
            image: product.thumbnail || product.image || product.images?.[0] || '',
            slug: product.slug, variantId, variantLabel,
            stock: chosenVariantStock ?? existing?.stock ?? (product.stock == null ? undefined : Number(product.stock)),
          };
          const acknowledged = existing
            ? cart.map(item => item.id === existing.id ? line : item)
            : [...cart, line];
          // The POST acknowledgement is enough to show the added line. A failed
          // optional refresh must never turn an accepted add into a retry prompt.
          try {
            const refresh = await fetch("/api/cart", { credentials: "include" });
            if (refresh.ok) {
              const rows = await refresh.json() as ServerCartItem[];
              if (Array.isArray(rows)) return rows.map(mapServerCartItem);
            }
          } catch { /* keep the acknowledged mutation */ }
          return acknowledged;
        });
        if (!added) return false;
        fireAddToCartAnalytics({ id: product.id, name: displayName, price: productPrice, quantity, category: product.category });
        if (notifySuccess) notifyCartAdded(displayName, quantity);
        return true;
      } catch (error) {
        toast({
          title: t("cart-context.s9"),
          description: error instanceof Error ? error.message : t("cart-context.s10"),
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
    const currentQty = itemsRef.current.find((item) => item.id === cartItemId)?.quantity ?? 0;

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

    const previous = itemsRef.current;
    const existingItem = previous.find(item => item.id === cartItemId);
    const next = existingItem
      ? previous.map(item => item.id === cartItemId
        ? { ...item, quantity: item.quantity + quantity, stock: itemStock } : item)
      : [...previous, {
        id: cartItemId, productId: product.id, name: product.name,
        price: productPrice, quantity,
        image: product.thumbnail || product.image || product.images?.[0] || '',
        slug: product.slug, variantId, variantLabel, stock: itemStock,
      }];
    // Persistence and notifications run once per accepted action, outside React
    // state updaters, which may be evaluated more than once in concurrent mode.
    saveGuestCart(next);

    fireAddToCartAnalytics({ id: product.id, name: displayName, price: productPrice, quantity, category: product.category });
    fireCartLifecycleAnalytics("add", product.id, quantity);
    if (notifySuccess) notifyCartAdded(displayName, quantity);
    return true;
  };

  const addItems = async (products: Product[]): Promise<number> => {
    if (products.length === 0) return 0;

    // Deliberately reuse addItem() instead of maintaining a second cart path.
    // This keeps stock/variant validation, server error handling, guest caps and
    // analytics identical for single-add and batch-add surfaces.
    let addedCount = 0;
    for (const product of products) {
      if (await addItem(product, 1, false)) addedCount += 1;
    }

    if (addedCount === products.length && addedCount > 0) {
      toast({
        title: t("toaster.added"),
        description: t("toaster.addedMany", { v0: addedCount }),
        cartAction: true,
        swipeCart: true,
      });
    } else if (addedCount === 0) {
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
    const removedItem = itemsRef.current.find(item => item.id === id);
    if (!removedItem) return;
    const remove = (cart: CartItem[]) => cart.filter(item => item.id !== id);
    if (user) {
      try {
        const removed = await mutateAccountCart(remove, async cart => {
          const response = await fetch(`/api/cart/${id}`, {
            method: "DELETE", headers: addCsrfHeader(), credentials: "include",
          });
          if (!response.ok) throw new Error("Cart removal failed");
          return remove(cart);
        });
        if (!removed) return;
      } catch {
        toast({ title: t("cart-context.s19"), description: t("cart-context.s20"), variant: "destructive" });
        return;
      }
    } else {
      saveGuestCart(remove(itemsRef.current));
    }
    fireCartLifecycleAnalytics("remove", removedItem.productId, removedItem.quantity);
  }, [user, mutateAccountCart, saveGuestCart, t]);

  const updateQuantity = useCallback(async (id: string, requested: number) => {
    if (!Number.isFinite(requested)) return;
    const quantity = Math.max(1, Math.floor(requested));
    const currentItem = itemsRef.current.find(item => item.id === id);
    if (!currentItem) return;
    const knownStock = currentItem.stock;
    if (knownStock != null && Number.isFinite(knownStock) && quantity > knownStock) {
      toast({
        title: t("cart-context.s8"),
        description: knownStock <= 0 ? t("cart-context.s11") : t("cart-context.s12"),
        variant: "destructive",
      });
      return;
    }
    const update = (cart: CartItem[]) => cart.map(item => item.id === id ? { ...item, quantity } : item);
    if (user) {
      try {
        const updated = await mutateAccountCart(update, async cart => {
          const response = await fetch(`/api/cart/${id}`, {
            method: "PUT", credentials: "include",
            headers: addCsrfHeader({ "Content-Type": "application/json" }),
            body: JSON.stringify({ quantity }),
          });
          if (!response.ok) throw new Error("Cart quantity update failed");
          return update(cart);
        });
        if (!updated) return;
      } catch {
        toast({ title: t("cart-context.s21"), variant: "destructive" });
        return;
      }
    } else {
      saveGuestCart(update(itemsRef.current));
    }
    fireCartLifecycleAnalytics("touch", currentItem.productId, quantity);
  }, [user, mutateAccountCart, saveGuestCart, t]);

  const refetchCart = useCallback(async (): Promise<CartItem[]> => {
    if (!user) return refreshGuestCart(itemsRef.current);
    const accountId = activeAccountId.current;
    await accountLoad.current;
    // Wait for all writes already accepted by the UI before checkout snapshots
    // the basket. New clicks remain overlaid if they arrive during this read.
    const queued = mutationQueue.current;
    await queued;
    try {
      const response = await fetch("/api/cart", { credentials: "include" });
      if (!response.ok) throw new Error("Cart refresh failed");
      const rows = await response.json() as ServerCartItem[];
      if (!Array.isArray(rows)) throw new Error("Invalid cart response");
      if (activeAccountId.current !== accountId) return itemsRef.current;
      if (queued !== mutationQueue.current) {
        await mutationQueue.current;
        return itemsRef.current;
      }
      confirmedItems.current = rows.map(mapServerCartItem);
      renderAccountCart();
      return itemsRef.current;
    } catch {
      return itemsRef.current;
    }
  }, [user, refreshGuestCart, renderAccountCart]);

  const clearCart = async () => {
    if (!user) {
      saveGuestCart([]);
      return;
    }
    try {
      await mutateAccountCart(() => [], async () => {
        const response = await fetch("/api/cart", {
          method: "DELETE", headers: addCsrfHeader(), credentials: "include",
        });
        if (!response.ok) throw new Error("Cart clear failed");
        return [];
      });
    } catch {
      toast({ title: t("cart-context.s19"), description: t("cart-context.s20"), variant: "destructive" });
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
