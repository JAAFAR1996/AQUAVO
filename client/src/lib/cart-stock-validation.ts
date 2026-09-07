export interface StockCheckLine {
  productId: string;
  name: string;
  quantity: number;
  variantId?: string;
  variantLabel?: string;
}

interface LiveVariant {
  id: string;
  label?: string;
  stock?: number | string | null;
}

interface LiveProduct {
  id: string;
  name?: string;
  stock?: number | string | null;
  variants?: LiveVariant[] | null;
}

export interface StockConflict {
  productId: string;
  name: string;
  quantity: number;
  available: number;
  variantId?: string;
  variantLabel?: string;
}

export interface CartStockValidationResult {
  ok: boolean;
  conflicts: StockConflict[];
}

const toFiniteStock = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

const extractProduct = (payload: unknown): LiveProduct | null => {
  if (!payload || typeof payload !== "object") return null;
  const value = payload as { product?: unknown; id?: unknown };
  const candidate = value.product && typeof value.product === "object" ? value.product : payload;
  if (!candidate || typeof candidate !== "object") return null;
  const product = candidate as LiveProduct;
  return typeof product.id === "string" ? product : null;
};

async function fetchLiveProduct(productId: string): Promise<LiveProduct | null> {
  // The catalogue list is intentionally cacheable. Stock validation must not use
  // that cached response, so hit the single-product route with a cache-busting
  // query and no-store. The route reads the product directly from storage.
  const url = `/api/products/${encodeURIComponent(productId)}?inventory_check=${Date.now()}`;
  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers: { "Cache-Control": "no-cache" },
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error("تعذر التحقق من المخزون حالياً. حاول مرة ثانية.");
  }

  return extractProduct(await response.json());
}

function resolveAvailableStock(product: LiveProduct, variantId?: string): number | null {
  if (variantId) {
    if (!Array.isArray(product.variants)) return 0;
    const variant = product.variants.find((item) => item.id === variantId);
    if (!variant) return 0;
    return toFiniteStock(variant.stock);
  }

  return toFiniteStock(product.stock);
}

/**
 * Revalidates every cart line against live inventory immediately before checkout.
 *
 * This is deliberately a UX guard, not the final inventory authority. The order
 * API still re-locks product rows inside its transaction and the database ledger
 * still prevents a negative balance. This check closes the stale guest-cart / CDN
 * window so a sold-out line cannot advance through the checkout UI.
 */
export async function validateCartStock(
  lines: StockCheckLine[],
): Promise<CartStockValidationResult> {
  const uniqueProductIds = Array.from(new Set(lines.map((line) => line.productId)));
  const liveProducts = await Promise.all(
    uniqueProductIds.map(async (productId) => [productId, await fetchLiveProduct(productId)] as const),
  );
  const productMap = new Map(liveProducts);
  const conflicts: StockConflict[] = [];

  for (const line of lines) {
    const product = productMap.get(line.productId) ?? null;
    if (!product) {
      conflicts.push({
        productId: line.productId,
        name: line.name,
        quantity: line.quantity,
        available: 0,
        variantId: line.variantId,
        variantLabel: line.variantLabel,
      });
      continue;
    }

    const available = resolveAvailableStock(product, line.variantId);
    // Missing/non-numeric stock is not something checkout should guess about.
    // Fail closed rather than letting an unverifiable line proceed.
    if (available === null) {
      throw new Error(`تعذر التحقق من مخزون ${line.name}. حاول مرة ثانية.`);
    }

    if (available < line.quantity) {
      conflicts.push({
        productId: line.productId,
        name: line.name,
        quantity: line.quantity,
        available,
        variantId: line.variantId,
        variantLabel: line.variantLabel,
      });
    }
  }

  return { ok: conflicts.length === 0, conflicts };
}

export function stockConflictMessage(conflict: StockConflict): string {
  const label = conflict.variantLabel
    ? `${conflict.name} — ${conflict.variantLabel}`
    : conflict.name;

  if (conflict.available <= 0) {
    return `${label} نفد من المخزون. احذفه من السلة قبل إكمال الطلب.`;
  }

  return `${label}: المتوفر ${conflict.available} فقط، والمطلوب ${conflict.quantity}.`;
}
