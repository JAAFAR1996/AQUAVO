import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";
import { isProductComingSoon } from "@shared/product-availability";

type VolcanicSizeProduct = Pick<Product, "id" | "stock" | "hasVariants" | "specifications">;

const VOLCANIC_PRODUCT_IDS = new Set([
  "houyi-volcanic-stone-red",
  "houyi-volcanic-stone-black",
]);

const STONE_SIZES = [
  { key: "small", range: "1–2", current: false },
  { key: "medium", range: "3–5", current: true },
  { key: "large", range: "5–8", current: false },
  { key: "extraLarge", range: "10–30", current: false },
] as const;

/**
 * Safe, display-only option selector for the two existing volcanic-rock pages.
 *
 * The only currently catalogued size is 3–5 cm; upcoming sizes do NOT have
 * approved prices or per-size inventory. Keeping the original products simple
 * preserves the historical base-SKU identity used by older sales and returns.
 *
 * If canonical variants are ever activated safely, the ordinary embedded
 * variant selector replaces this display automatically.
 */
export function VolcanicSizeOptions({ product }: { product: VolcanicSizeProduct }) {
  const { t } = useTranslation("product");

  // The API translates specification keys on /en and /ckb pages. These are
  // the real current names in content_translations, not guessed UI labels.
  const specifications = product.specifications ?? {};
  const verifiedCurrentSize = [
    specifications["حجم القطع"],
    specifications["Piece Size"],
    specifications["Piece size"],
    specifications["قەبارەی پارچەکان"],
  ].some((value) => typeof value === "string" && /^3\s*[–-]\s*5\s*(?:سم|cm)$/i.test(value.trim()));

  if (
    !VOLCANIC_PRODUCT_IDS.has(product.id) ||
    product.hasVariants ||
    !verifiedCurrentSize
  ) {
    return null;
  }

  const inStock = Number(product.stock ?? 0) > 0;
  const currentState = inStock
    ? t("volcanicSizes.inStockKg", { count: product.stock })
    : isProductComingSoon(product)
      ? t("price.soon")
      : t("stock.unavailable");

  return (
    <fieldset className="mb-6 space-y-3 rounded-xl border border-primary/20 bg-card p-4" dir="rtl">
      <legend className="px-1 text-sm font-bold">{t("volcanicSizes.title")}</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {STONE_SIZES.map((size) => {
          const selectable = size.current && inStock;
          return (
            <label
              key={size.key}
              className={cn(
                "flex min-h-24 flex-col items-center justify-center gap-1 rounded-xl border-2 px-2 py-3 text-center text-sm",
                size.current ? "border-primary bg-primary/10" : "border-border bg-background opacity-65",
              )}
            >
              <input
                type="radio"
                name={`volcanic-size-${product.id}`}
                value={`${size.range} ${t("volcanicSizes.unit")}`}
                checked={size.current}
                disabled={!selectable}
                readOnly
                className="sr-only"
              />
              <span className={cn("font-semibold", size.current && "text-primary")}>
                {t(`volcanicSizes.${size.key}`)}
              </span>
              <bdi dir="ltr" className="font-medium">{size.range} {t("volcanicSizes.unit")}</bdi>
              <span className="text-xs text-muted-foreground">
                {size.current ? currentState : t("price.soon")}
              </span>
            </label>
          );
        })}
      </div>
      <p className="text-xs leading-5 text-muted-foreground">
        {t("volcanicSizes.imageNote")}
      </p>
    </fieldset>
  );
}
