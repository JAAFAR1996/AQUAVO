import type { Product } from "@/types";

/**
 * Reads the product payload the server embedded in the initial HTML.
 *
 * The PDP used to ask `/api/products/:slug` for a row the server had already
 * read moments earlier to build the page's own title, meta description and
 * Product schema. Measured on production: the request left the browser at
 * 3,823 ms and resolved at 4,390 ms, and the variants / similar /
 * frequently-bought requests all queued behind it — roughly 600 ms of pure
 * round-trip on top of an already JS-bound page.
 *
 * `api/ssr-meta.ts` now writes the same `toPublicProduct(...)` payload into an
 * inert `<script type="application/json">`, and this reads it back.
 *
 * Three rules, each of which exists to stop a specific way this could go wrong:
 *
 *  1. **Slug must match.** The payload describes the product the document was
 *     rendered for. After a client-side navigation to a different product the
 *     block is stale by definition, so a mismatched slug is ignored rather
 *     than shown under the wrong name.
 *  2. **Read once.** The block is consumed on first read and cached, so a
 *     re-render never reuses it after a navigation.
 *  3. **Never throw.** A missing, truncated or malformed block returns null and
 *     the page fetches normally. This is an optimisation; it must not be able
 *     to take the page down.
 */

const SCRIPT_ID = "__AQUAVO_PRODUCT__";

export interface EmbeddedProductPayload {
  slug: string;
  /** Server render time, in epoch ms — handed to TanStack as initialDataUpdatedAt. */
  renderedAt: number;
  product: Product;
}

let cached: EmbeddedProductPayload | null | undefined;

function read(): EmbeddedProductPayload | null {
  if (cached !== undefined) return cached;
  cached = null;

  if (typeof document === "undefined") return cached;

  try {
    const element = document.getElementById(SCRIPT_ID);
    if (!element?.textContent) return cached;

    const parsed = JSON.parse(element.textContent) as Partial<EmbeddedProductPayload>;
    const product = parsed?.product as Product | undefined;

    // A payload without these is not usable as a product, and half-rendering a
    // PDP from one would be worse than fetching.
    if (
      !parsed ||
      typeof parsed.slug !== "string" ||
      !product ||
      typeof product !== "object" ||
      typeof product.id !== "string" ||
      typeof product.name !== "string"
    ) {
      return cached;
    }

    cached = {
      slug: parsed.slug,
      // An absent or nonsense timestamp is treated as "infinitely old", so the
      // client revalidates immediately rather than trusting an unknown age.
      renderedAt: typeof parsed.renderedAt === "number" && Number.isFinite(parsed.renderedAt)
        ? parsed.renderedAt
        : 0,
      product,
    };
  } catch {
    cached = null;
  }

  return cached;
}

/**
 * The embedded product for `slug`, or null if there isn't one for this exact
 * product. Safe to call on every render.
 */
export function getEmbeddedProduct(slug: string | undefined): EmbeddedProductPayload | null {
  if (!slug) return null;
  const payload = read();
  return payload && payload.slug === slug ? payload : null;
}

/** Test seam: forget what was read, so a test can install a different block. */
export function resetEmbeddedProductCache(): void {
  cached = undefined;
}
