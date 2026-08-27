import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from "react";
import { Product } from "@/types";
import { useAuth } from "./auth-context";
import { toast } from "@/hooks/use-toast";
import { addCsrfHeader } from "@/lib/csrf";
import { syncStorage } from "@/lib/secure-storage";
import { metaTrackAddToCart } from "@/lib/meta-pixel";
import { ttqAddToCart } from "@/lib/tiktok-pixel";
import { trackAddToCart as gaTrackAddToCart } from "@/lib/analytics";
import { phTrackAddToCart } from "@/lib/posthog";

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
  /** Fresh known stock for this exact line. Guests no longer treat unknown stock
   * as permission to oversell: every mutation is revalidated against the server. */
  stock?: number;
}

export interface CartAvailabilityIssue {
  id: string;
  productId: string;
  variantId?: string;
  name: string;
  variantLabel?: string;
  previousQuantity: number;
  availableStock: number;
  action: "reduced" | "removed";
}

export interface CartAvailabilityResult {
  ok: boolean;
  changed: boolean;
  issues: CartAvailabilityIssue[];
  checkedAt?: string;
}

interface AvailabilityLine {
  productId: string;
  variantId: string | null;
  productName: string;
  variantLabel: string | null;
  requestedQuantity: number;
  availableStock: number;
  status: "available" | "limited" | "unavailable";
  reason: string | null;
}

interface AvailabilityResponse {
  items: AvailabilityLine[];
  checkedAt?: string;
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

interface CartContextType {
  items: CartItem[];
  /** Resolves true when the item was added, false when blocked (e.g. out of stock). */
  addItem: (product: Product, quantity?: number) => Promise<boolean>;
  addItems: (products: Product[]) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  updateQuantity: (id: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  refetchCart: () => Promise<void>;
  validateAvailability: (options?: { notify?: boolean }) => Promise<CartAvailabilityResult>;
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

const lineKey = (productId: string, variantId?: string | null): string =>
  `${productId}::${variantId || "default"}`;

const persistGuestCart = (newItems: CartItem[]) => {
  syncStorage.setItem(CART_STORAGE_KEY, newItems);
  window.dispatchEvent(new StorageEvent("storage", {
    key: CART_STORAGE_KEY,
    newValue: JSON.stringify(newItems),
  }));
};

async function requestAvailability(
  lines: Array<Pick<CartItem, "productId" | "variantId" | "quantity">>
): Promise<AvailabilityResponse> {
  if (lines.length === 0) return { items: [], checkedAt: new Date().toISOString() };

  const response = await fetch("/api/cart/availability", {
    method: "POST",
    headers: addCsrfHeader({ "Content-Type": "application/json" }),
    credentials: "include",
    cache: "no-store",
    body: JSON.stringify({
      items: lines.map(({ productId, variantId, quantity }) => ({
        productId,
        ...(variantId ? { variantId } : {}),
        quantity,
      })),
    }),
  });

  if (!response.ok) {
    throw new Error(`Availability check failed (${response.status})`);
  }

  const data = await response.json();
  if (!data || !Array.isArray(data.items)) {
    throw new Error("Invalid availability response");
  }
  return data as AvailabilityResponse;
}

function reconcileCartWithAvailability(
  currentItems: CartItem[],
  availability: AvailabilityLine[]
): { nextItems: CartItem[]; issues: CartAvailabilityIssue[]; changed: boolean } {
  const availabilityByKey = new Map(
    availability.map((line) => [lineKey(line.productId, line.variantId), line])
  );
  const issues: CartAvailabilityIssue[] = [];
  const nextItems: CartItem[] = [];

  for (const item of currentItems) {
    const line = availabilityByKey.get(lineKey(item.productId, item.variantId));
    // An incomplete response is treated as a failed check by the caller; do not
    // silently delete a customer's item merely because a response line is absent.
    if (!line) {
      nextItems.push(item);
      continue;
    }

    const availableStock = Math.max(0, Math.floor(Number(line.availableStock) || 0));
    if (availableStock <= 0) {
      issues.push({
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        name: line.productName || item.name,
        variantLabel: line.variantLabel || item.variantLabel,
        previousQuantity: item.quantity,
        availableStock: 0,
        action: "removed",
      });
      continue;
    }

    if (item.quantity > availableStock) {
      issues.push({
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        name: line.productName || item.name,
        variantLabel: line.variantLabel || item.variantLabel,
        previousQuantity: item.quantity,
        availableStock,
        action: "reduced",
      });
      nextItems.push({ ...item, quantity: availableStock, stock: availableStock });
      continue;
    }

    nextItems.push({ ...item, stock: availableStock });
  }

  return {
    nextItems,
    issues,
    changed: issues.length > 0,
  };
}

function availabilityToast(issueList: CartAvailabilityIssue[]): { title: string; description: string } {
  if (issueList.length === 1) {
    const issue = issueList[0];
    const label = issue.variantLabel ? `${issue.name} — ${issue.variantLabel}` : issue.name;
    if (issue.action === "reduced") {
      return {
        title: "حدّثنا الكمية المتوفرة",
        description: `بقيت ${issue.availableStock} قطعة فقط من «${label}». عدّلنا الكمية تلقائياً من ${issue.previousQuantity} إلى ${issue.availableStock}.`,
      };
    }
    return {
      title: "تغيّر توفر أحد المنتجات",
      description: `نفدت كمية «${label}»، لذلك أزلناها من السلة تلقائياً.`,
    };
  }

  return {
    title: "حدّثنا سلتك حسب المخزون",
    description: "تغيّرت الكمية المتوفرة لبعض المنتجات. حدّثنا السلة تلقائياً حسب المخزون الحالي.",
  };
}

// Resolves the known stock cap for a server-sourced cart line: variant stock
// when the line has a variant, base-product stock otherwise.
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
    image: item.product.thumbnail || item.product.images?.[0] || "",
    slug: item.product.slug,
    variantId,
    variantLabel,
    stock: resolveServerCartItemStock(item.product, variantId),
  };
};

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const guestInitialRevalidationDone = useRef(false);

  // Load from LocalStorage on mount (for guest). The snapshot is shown immediately
  // for a fast UI, then a fresh server reconciliation runs below before checkout.
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

  // Sync with Server on Login - MERGE local cart with server cart.
  useEffect(() => {
    if (user) {
      const mergeGuestCartWithServer = async () => {
        try {
          const localItems: CartItem[] = syncStorage.getItem<CartItem[]>(CART_STORAGE_KEY) || [];

          if (localItems.length > 0) {
            const results = await Promise.all(localItems.map(async (item) => {
              try {
                const response = await fetch("/api/cart", {
                  method: "POST",
                  headers: addCsrfHeader({ "Content-Type": "application/json" }),
                  credentials: "include",
                  body: JSON.stringify({
                    productId: item.productId,
                    quantity: item.quantity,
                    variantId: item.variantId,
                    variantLabel: item.variantLabel,
                    variantPrice: item.price,
                  }),
                });
                return response.ok;
              } catch (err) {
                console.error(`Failed to push item ${item.id} to server:`, err);
                return false;
              }
            }));

            syncStorage.removeItem(CART_STORAGE_KEY);
            const mergedCount = results.filter(Boolean).length;
            if (mergedCount === localItems.length) {
              toast({
                title: "تم دمج سلتك",
                description: `تمت إضافة ${mergedCount} منتج من سلتك السابقة`,
              });
            } else {
              toast({
                title: "حدّثنا سلتك بعد تسجيل الدخول",
                description: "بعض المنتجات أو الكميات القديمة لم تعد متوفرة، لذلك احتفظنا فقط بالكميات المتاحة.",
              });
            }
          }

          const cartRes = await fetch("/api/cart", { credentials: "include", cache: "no-store" });
          if (cartRes.ok) {
            const serverItems = await cartRes.json();
            if (Array.isArray(serverItems)) {
              setItems(serverItems.map(mapServerCartItem));
            }
          }
        } catch (err) {
          console.error("Failed to merge cart:", err);
          try {
            const cartRes = await fetch("/api/cart", { credentials: "include", cache: "no-store" });
            if (cartRes.ok) {
              const serverItems = await cartRes.json();
              if (Array.isArray(serverItems)) {
                setItems(serverItems.map(mapServerCartItem));
              }
            }
          } catch (e) {
            console.error("Failed to fetch cart:", e);
          }
        }
      };

      void mergeGuestCartWithServer();
    }
  }, [user]);

  const saveCart = async (newItems: CartItem[]) => {
    setItems(newItems);
    if (!user) persistGuestCart(newItems);
  };

  const addItem = async (product: Product, quantity: number = 1): Promise<boolean> => {
    let { variantId, variantLabel } = getCartVariantMeta(product);

    // Quick-add surfaces may omit a variant. Pick the cheapest currently-marked
    // in-stock variant, then verify it against the fresh availability endpoint.
    if (!variantId && product.hasVariants && product.variants?.length) {
      const inStock = product.variants.filter((v) => (v.stock ?? 0) > 0 && Number(v.price) > 0);
      const pool = inStock.length > 0 ? inStock : product.variants.filter((v) => Number(v.price) > 0);
      const chosen = pool.slice().sort((a, b) => Number(a.price) - Number(b.price))[0];
      if (chosen) {
        product = { ...product, price: Number(chosen.price) } as Product;
        variantId = chosen.id;
        variantLabel = chosen.label;
      }
    }

    const productPrice = Number(product.price);
    if (!productPrice || productPrice <= 0) {
      toast({
        title: "غير متوفر حالياً",
        description: "هذا المنتج غير متوفر حالياً — سيتوفر قريباً.",
        variant: "destructive",
      });
      return false;
    }

    const displayName = variantLabel ? `${product.name} (${variantLabel})` : product.name;

    if (user) {
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
          const cartRes = await fetch("/api/cart", { credentials: "include", cache: "no-store" });
          if (cartRes.ok) {
            const serverItems = await cartRes.json();
            if (Array.isArray(serverItems)) setItems(serverItems.map(mapServerCartItem));
          }
          fireAddToCartAnalytics({ id: product.id, name: displayName, price: productPrice, quantity, category: product.category });
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

    // Guest cart: ALWAYS ask the server for fresh stock before mutating browser
    // storage. Unknown/stale client stock is never interpreted as unlimited.
    const cartItemId = `${product.id}-${variantId || "default"}`;
    const currentQty = items.find((item) => item.id === cartItemId)?.quantity ?? 0;
    const requestedQuantity = currentQty + quantity;

    let liveLine: AvailabilityLine | undefined;
    try {
      const availability = await requestAvailability([{
        productId: product.id,
        variantId,
        quantity: requestedQuantity,
      }]);
      liveLine = availability.items[0];
    } catch (err) {
      console.warn("Failed to validate guest cart stock", err);
      toast({
        title: "تعذر التأكد من المخزون",
        description: "ما قدرنا نتأكد من الكمية المتوفرة الآن. حاول مرة ثانية بعد لحظات.",
        variant: "destructive",
      });
      return false;
    }

    if (!liveLine || liveLine.availableStock <= 0) {
      toast({
        title: "نفدت الكمية",
        description: variantLabel ? `الخيار «${variantLabel}» غير متوفر حالياً.` : "هذا المنتج غير متوفر حالياً.",
        variant: "destructive",
      });
      return false;
    }

    if (requestedQuantity > liveLine.availableStock) {
      toast({
        title: "وصلت للكمية المتوفرة",
        description: `المتوفر حالياً ${liveLine.availableStock} فقط من هذا المنتج.`,
        variant: "destructive",
      });
      return false;
    }

    const liveStock = liveLine.availableStock;
    setItems((prev) => {
      const existingItem = prev.find((item) => item.id === cartItemId);
      let newItems: CartItem[];
      if (existingItem) {
        // The min() is a second client-side race guard: even two very fast clicks
        // that validate concurrently cannot push localStorage beyond live stock.
        const nextQuantity = Math.min(existingItem.quantity + quantity, liveStock);
        if (nextQuantity === existingItem.quantity) return prev;
        newItems = prev.map((item) =>
          item.id === cartItemId
            ? { ...item, quantity: nextQuantity, stock: liveStock }
            : item
        );
      } else {
        newItems = [...prev, {
          id: cartItemId,
          productId: product.id,
          name: product.name,
          price: Number(product.price),
          quantity: Math.min(quantity, liveStock),
          image: product.thumbnail || product.image || product.images?.[0] || "",
          slug: product.slug,
          variantId: variantId ?? undefined,
          variantLabel,
          stock: liveStock,
        }];
      }

      persistGuestCart(newItems);
      return newItems;
    });

    fireAddToCartAnalytics({ id: product.id, name: displayName, price: productPrice, quantity, category: product.category });
    return true;
  };

  const addItems = async (products: Product[]): Promise<void> => {
    const purchasableProducts = products.filter((p) => Number(p.price) > 0 || (p.hasVariants && p.variants?.some((v) => Number(v.price) > 0)));
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
        description: `تمت محاولة إضافة ${purchasableProducts.length} منتج فقط — البقية غير متوفرة حالياً.`,
      });
    }

    // Reuse the exact same stock-safe path for every surface instead of keeping a
    // second batch implementation that can drift away from addItem's protections.
    for (const product of purchasableProducts) {
      await addItem(product, 1);
    }
  };

  const removeItem = useCallback(async (id: string): Promise<void> => {
    if (user) {
      setItems((prev) => prev.filter((item) => item.id !== id));

      try {
        const res = await fetch(`/api/cart/${id}`, {
          method: "DELETE",
          headers: addCsrfHeader(),
          credentials: "include",
        });
        if (!res.ok) {
          const cartRes = await fetch("/api/cart", { credentials: "include", cache: "no-store" });
          if (cartRes.ok) {
            const serverItems = await cartRes.json();
            if (Array.isArray(serverItems)) setItems(serverItems.map(mapServerCartItem));
          }
          toast({
            title: "فشل حذف المنتج",
            description: "يرجى المحاولة مرة أخرى",
            variant: "destructive",
          });
        }
      } catch (err) {
        console.warn("Failed to remove from server cart", err);
        toast({ title: "فشل حذف المنتج", variant: "destructive" });
      }
    } else {
      setItems((prev) => {
        const newItems = prev.filter((item) => item.id !== id);
        persistGuestCart(newItems);
        return newItems;
      });
    }
  }, [user]);

  const updateQuantity = useCallback(async (id: string, requestedQuantity: number): Promise<void> => {
    const quantity = Math.max(1, Math.floor(requestedQuantity));
    const currentItem = items.find((item) => item.id === id);
    if (!currentItem) return;

    if (user) {
      const oldQuantity = currentItem.quantity;
      setItems((prev) => prev.map((item) => item.id === id ? { ...item, quantity } : item));
      try {
        const res = await fetch(`/api/cart/${id}`, {
          method: "PUT",
          headers: addCsrfHeader({ "Content-Type": "application/json" }),
          credentials: "include",
          body: JSON.stringify({ quantity }),
        });

        if (!res.ok) {
          setItems((prev) => prev.map((item) => item.id === id ? { ...item, quantity: oldQuantity } : item));
          let description = "يرجى المحاولة مرة أخرى";
          try {
            const data = await res.json();
            if (typeof data?.message === "string") description = data.message;
          } catch { /* keep fallback */ }
          toast({ title: "تعذر تحديث الكمية", description, variant: "destructive" });
          return;
        }

        const cartRes = await fetch("/api/cart", { credentials: "include", cache: "no-store" });
        if (cartRes.ok) {
          const serverItems = await cartRes.json();
          if (Array.isArray(serverItems)) setItems(serverItems.map(mapServerCartItem));
        }
      } catch (err) {
        console.warn("Failed to update server cart", err);
        setItems((prev) => prev.map((item) => item.id === id ? { ...item, quantity: oldQuantity } : item));
        toast({ title: "تعذر تحديث الكمية", description: "يرجى المحاولة مرة أخرى", variant: "destructive" });
      }
      return;
    }

    // Guest quantity controls are server-validated before localStorage changes.
    let liveLine: AvailabilityLine | undefined;
    try {
      const availability = await requestAvailability([{
        productId: currentItem.productId,
        variantId: currentItem.variantId,
        quantity,
      }]);
      liveLine = availability.items[0];
    } catch (err) {
      console.warn("Failed to validate guest quantity", err);
      toast({
        title: "تعذر التأكد من المخزون",
        description: "ما قدرنا نتأكد من الكمية المتوفرة الآن. حاول مرة ثانية بعد لحظات.",
        variant: "destructive",
      });
      return;
    }

    if (!liveLine || liveLine.availableStock <= 0) {
      await removeItem(id);
      toast({
        title: "نفدت الكمية",
        description: "هذا المنتج لم يعد متوفراً، لذلك أزلناه من السلة.",
        variant: "destructive",
      });
      return;
    }

    if (quantity > liveLine.availableStock) {
      setItems((prev) => {
        const newItems = prev.map((item) => item.id === id ? { ...item, stock: liveLine!.availableStock } : item);
        persistGuestCart(newItems);
        return newItems;
      });
      toast({
        title: "وصلت للكمية المتوفرة",
        description: `المتوفر حالياً ${liveLine.availableStock} فقط من هذا المنتج.`,
        variant: "destructive",
      });
      return;
    }

    setItems((prev) => {
      const newItems = prev.map((item) =>
        item.id === id ? { ...item, quantity, stock: liveLine!.availableStock } : item
      );
      persistGuestCart(newItems);
      return newItems;
    });
  }, [user, items, removeItem]);

  const validateAvailability = useCallback(async (options: { notify?: boolean } = {}): Promise<CartAvailabilityResult> => {
    const snapshot = items;
    if (snapshot.length === 0) {
      return { ok: true, changed: false, issues: [], checkedAt: new Date().toISOString() };
    }

    try {
      const availability = await requestAvailability(snapshot);
      if (availability.items.length !== snapshot.length) {
        throw new Error("Availability response is incomplete");
      }

      const reconciled = reconcileCartWithAvailability(snapshot, availability.items);

      if (user && reconciled.changed) {
        // Keep the persisted account cart aligned with the corrected quantities.
        await Promise.all(reconciled.issues.map(async (issue) => {
          if (issue.action === "removed") {
            await fetch(`/api/cart/${issue.id}`, {
              method: "DELETE",
              headers: addCsrfHeader(),
              credentials: "include",
            });
          } else {
            await fetch(`/api/cart/${issue.id}`, {
              method: "PUT",
              headers: addCsrfHeader({ "Content-Type": "application/json" }),
              credentials: "include",
              body: JSON.stringify({ quantity: issue.availableStock }),
            });
          }
        }));

        const cartRes = await fetch("/api/cart", { credentials: "include", cache: "no-store" });
        if (cartRes.ok) {
          const serverItems = await cartRes.json();
          if (Array.isArray(serverItems)) setItems(serverItems.map(mapServerCartItem));
          else setItems(reconciled.nextItems);
        } else {
          setItems(reconciled.nextItems);
        }
      } else {
        setItems(reconciled.nextItems);
        if (!user) persistGuestCart(reconciled.nextItems);
      }

      if (options.notify && reconciled.issues.length > 0) {
        const message = availabilityToast(reconciled.issues);
        toast({ title: message.title, description: message.description });
      }

      return {
        ok: true,
        changed: reconciled.changed,
        issues: reconciled.issues,
        checkedAt: availability.checkedAt,
      };
    } catch (err) {
      console.warn("Failed to validate cart availability", err);
      if (options.notify) {
        toast({
          title: "تعذر تحديث المخزون",
          description: "ما قدرنا نتأكد من الكميات المتوفرة الآن. حاول مرة ثانية بعد لحظات.",
          variant: "destructive",
        });
      }
      return { ok: false, changed: false, issues: [] };
    }
  }, [items, user]);

  // A restored guest cart is immediately reconciled with fresh stock once per
  // page load, fixing stale quantities from older browser sessions.
  useEffect(() => {
    if (user || !isInitialized || items.length === 0 || guestInitialRevalidationDone.current) return;
    guestInitialRevalidationDone.current = true;
    void validateAvailability({ notify: true });
  }, [user, isInitialized, items.length, validateAvailability]);

  // Revalidate when the shopper returns to the tab. Stock can change while a cart
  // sits open, and this keeps long-lived guest sessions honest without polling.
  useEffect(() => {
    if (user || !isInitialized) return;
    const revalidate = () => {
      if (document.visibilityState === "visible") void validateAvailability({ notify: false });
    };
    window.addEventListener("focus", revalidate);
    document.addEventListener("visibilitychange", revalidate);
    return () => {
      window.removeEventListener("focus", revalidate);
      document.removeEventListener("visibilitychange", revalidate);
    };
  }, [user, isInitialized, validateAvailability]);

  const refetchCart = useCallback(async (): Promise<void> => {
    if (!user) {
      await validateAvailability({ notify: false });
      return;
    }
    try {
      const cartRes = await fetch("/api/cart", { credentials: "include", cache: "no-store" });
      if (cartRes.ok) {
        const serverItems = await cartRes.json();
        if (Array.isArray(serverItems)) setItems(serverItems.map(mapServerCartItem));
      }
    } catch (err) {
      console.warn("Failed to refetch cart:", err);
    }
  }, [user, validateAvailability]);

  const clearCart = async (): Promise<void> => {
    if (user) {
      try {
        await fetch("/api/cart", {
          method: "DELETE",
          headers: addCsrfHeader(),
          credentials: "include",
        });
        setItems([]);
      } catch (err) {
        console.warn("Failed to clear server cart", err);
      }
    } else {
      await saveCart([]);
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
        validateAvailability,
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
