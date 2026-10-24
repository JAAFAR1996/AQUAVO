import { ImageOff } from "lucide-react";
import { cardImage } from "@/lib/cloudinary";

export interface BundlePreviewItem {
  productId: string;
  quantity: number;
  required: boolean;
  name?: string;
  thumbnail?: string | null;
  variantId?: string | null;
  variantLabel?: string | null;
}

const copy = {
  ar: { included: "القطع المشمولة", missing: "صورة الخيار مو متوفرة", empty: "تفاصيل القطع مو متوفرة هسه" },
  en: { included: "Included items", missing: "Option photo unavailable", empty: "Item details are not available yet" },
  ckb: { included: "پارچە ناوخۆکان", missing: "وێنەی هەڵبژاردە بەردەست نییە", empty: "وردەکاری پارچەکان ئێستا بەردەست نین" },
} as const;

/** Read-only overview. Never presents optional extras as included or invents option photos. */
export function BundleContentsPreview({ items, locale }: { items: BundlePreviewItem[]; locale: keyof typeof copy }) {
  const included = items.filter((item) => item.required);
  const t = copy[locale];
  if (!included.length) return <p className="mt-4 text-xs text-muted-foreground">{t.empty}</p>;
  return (
    <ul aria-label={t.included} className="mt-5 grid grid-cols-3 gap-2 border-t border-border pt-4">
      {included.map((item) => (
        <li key={`${item.productId}:${item.variantId ?? ""}`} className="min-w-0 rounded-xl bg-card p-2">
          <div className="relative flex aspect-square items-center justify-center rounded-lg bg-background p-2">
            {item.thumbnail && !item.variantId ? (
              <img src={cardImage(item.thumbnail)} alt="" width={120} height={120} loading="lazy" decoding="async" className="h-full w-full object-contain" />
            ) : <ImageOff aria-label={t.missing} className="h-6 w-6 text-muted-foreground" />}
            <span className="absolute end-1 top-1 rounded-full border border-border bg-background px-1.5 py-0.5 text-xs font-bold"><bdi>×{item.quantity}</bdi></span>
          </div>
          <p className="mt-2 text-xs leading-5">{item.name ?? item.productId}</p>
          {item.variantLabel && <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.variantLabel}</p>}
        </li>
      ))}
    </ul>
  );
}
