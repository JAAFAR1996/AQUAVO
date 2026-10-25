import type { EquipmentPart } from "@/types";

/**
 * One manually inspected catalogue photograph. This is not an engineering drawing,
 * an exploded view, or evidence of hidden construction or performance.
 *
 * Reviewed pixels: the 1000 × 1000 JPEG at this exact versioned public URL,
 * downloaded on 2026-10-25. The catalogue labels it an invoice reference; that
 * label is retained as provenance, not a claim about the manufacturer's process.
 * SHA-256 of reviewed bytes is recorded for future review, not checked at runtime.
 * Replacing this asset, including in place, requires a fresh pixel review.
 */
export const VERIFIED_EXTERNAL_ANNOTATION_SOURCE = {
  productId: "luby-gyhs03-202610",
  imageUrl: "https://res.cloudinary.com/dyczh8ogv/image/upload/v1792385362/aquavo/products/luby/aquarium-water-changer-3m/invoice-reference-20261019.jpg",
  width: 1000,
  height: 1000,
  reviewedOn: "2026-10-25",
  sha256: "c357b4e69e755e621eac8e88b8295004d3a110adb5b1b53bc4f39d7e31f03676",
  sourceKind: "catalogue-invoice-reference",
} as const;

type AnnotationLocale = "ar" | "en" | "ckb";
type LocalizedText = Record<AnnotationLocale, string>;

/** Minimal structural input accepts both API and presentation product objects. */
export interface ExternalAnnotationProduct {
  id: string;
  image?: string | null;
  thumbnail?: string | null;
  images?: readonly string[] | null;
  hasVariants?: boolean;
  variants?: readonly { id: string }[] | null;
}

export interface VerifiedExternalAnnotationOptions {
  /** The actual displayed photo. Explicit null/empty means no verified photo. */
  photoUrl?: string | null;
  selectedVariantId?: string | null;
  locale?: string;
}

export interface VerifiedExternalAnnotations {
  productId: string;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  /** Percentages belong to the unpadded source-image plane, not the parent card. */
  coordinateSpace: "image-plane-percent";
  title: string;
  note: string;
  sourceLabel: string;
  parts: EquipmentPart[];
}

const copy = {
  title: {
    ar: "تعرّف على الأجزاء الظاهرة",
    en: "Explore the visible parts",
    ckb: "بەشە دیارەکان بناسە",
  },
  note: {
    ar: "النقاط تشرح بس الأجزاء الظاهرة بهالصورة، مو الأجزاء الداخلية ولا طريقة التشغيل.",
    en: "The points describe only what is visible in this photo, not internal parts or operating instructions.",
    ckb: "خاڵەکان تەنها ئەو بەشانە ڕوون دەکەنەوە کە لەم وێنەیەدا دیارن، نەک بەشە ناوخۆییەکان یان ڕێنمایی بەکارهێنان.",
  },
  sourceLabel: {
    ar: "الصورة المرجعية الموجودة بالكتالوج",
    en: "Reference photo from the catalogue",
    ckb: "وێنەی سەرچاوە لە کاتەلۆگ",
  },
} satisfies Record<string, LocalizedText>;

interface ReviewedPart {
  id: string;
  /** Pixel location in the reviewed 1000 × 1000 image, measured from top-left. */
  pixelX: number;
  pixelY: number;
  name: LocalizedText;
  description: LocalizedText;
}

const reviewedParts: readonly ReviewedPart[] = [
  {
    id: "visible-coiled-hose",
    pixelX: 814,
    pixelY: 588,
    name: { ar: "الصوندة الملفوفة", en: "Coiled hose", ckb: "لوولەی پێچراو" },
    description: {
      ar: "الصوندة الملفوفة واضحة بيمين الصورة.",
      en: "The coiled hose is visible on the right of the photo.",
      ckb: "لوولەی پێچراو لە لای ڕاستی وێنەکە دیارە.",
    },
  },
  {
    id: "visible-orange-lever",
    pixelX: 391,
    pixelY: 628,
    name: { ar: "الذراع البرتقالي", en: "Orange lever", ckb: "دەسکی پرتەقاڵی" },
    description: {
      ar: "ذراع برتقالي ظاهر على واجهة الوحدة.",
      en: "An orange lever is visible on the front of the unit.",
      ckb: "دەسکێکی پرتەقاڵی لە پێشەوەی یەکەکە دیارە.",
    },
  },
  {
    id: "visible-side-connector",
    pixelX: 174,
    pixelY: 458,
    name: { ar: "وصلة الصوندة الجانبية", en: "Side hose connector", ckb: "پێکەوەبەستەری لاوەکی لوولە" },
    description: {
      ar: "وصلة بارزة من جانب الوحدة، وعليها حلقات واضحة بالصورة.",
      en: "A connector projects from the side of the unit, with visible raised rings.",
      ckb: "پێکەوەبەستەرێک لە لاوەی یەکەکە بەرەو دەرەوەیە و بازنە بەرزەکانی دیارن.",
    },
  },
  {
    id: "visible-separate-adapters",
    pixelX: 287,
    pixelY: 223,
    name: { ar: "وصلات الربط المنفصلة", en: "Separate threaded adapters", ckb: "پێکەوەبەستەرە جیاوازەکان" },
    description: {
      ar: "ثلاث وصلات منفصلة مبينة فوق الوحدة. النقطة على الوصلة الوسطية.",
      en: "Three separate threaded adapters are shown above the unit. The point marks the middle one.",
      ckb: "سێ پێکەوەبەستەری جیاواز لە سەرەوەی یەکەکە دیارن. خاڵەکە لەسەر ئەوەی ناوەڕاستە.",
    },
  },
];

function annotationLocale(locale: string | undefined): AnnotationLocale {
  const language = locale?.toLowerCase().split(/[-_]/)[0];
  return language === "en" || language === "ckb" ? language : "ar";
}

/**
 * Fail closed for unknown products, changed angles, and all variant identities.
 * The one reviewed item has no variants. If variants are added later, review them
 * individually instead of allowing these points to follow a similar photograph.
 *
 * Integration contract: use the returned image in a 1000:1000 aspect-ratio image
 * plane with no internal padding/crop and attach x/y directly to that plane.
 * Keep padding OUTSIDE that plane. Do not feed these coordinates into the legacy
 * p-8 square/md:video frame. Do not mirror physical x coordinates for RTL.
 */
export function getVerifiedExternalAnnotations(
  product: ExternalAnnotationProduct | null | undefined,
  options: VerifiedExternalAnnotationOptions = {},
): VerifiedExternalAnnotations | null {
  const source = VERIFIED_EXTERNAL_ANNOTATION_SOURCE;
  if (!product || product.id !== source.productId) return null;
  if (product.hasVariants || (product.variants?.length ?? 0) > 0) return null;
  if (options.selectedVariantId != null) return null;

  const displayedPhoto = options.photoUrl === undefined
    ? product.image || product.thumbnail || product.images?.[0]
    : options.photoUrl;
  if (displayedPhoto !== source.imageUrl) return null;

  // An explicitly requested old URL is not enough if the product no longer lists it.
  const currentPhotos = [product.image, product.thumbnail, ...(product.images ?? [])];
  if (!currentPhotos.includes(source.imageUrl)) return null;

  const locale = annotationLocale(options.locale);
  return {
    productId: source.productId,
    imageUrl: source.imageUrl,
    imageWidth: source.width,
    imageHeight: source.height,
    coordinateSpace: "image-plane-percent",
    title: copy.title[locale],
    note: copy.note[locale],
    sourceLabel: copy.sourceLabel[locale],
    parts: reviewedParts.map((part) => ({
      id: part.id,
      name: part.name[locale],
      description: part.description[locale],
      // No fabricated detail image or repeated whole-photo thumbnail.
      imageUrl: "",
      x: (part.pixelX * 100) / source.width,
      y: (part.pixelY * 100) / source.height,
    })),
  };
}
