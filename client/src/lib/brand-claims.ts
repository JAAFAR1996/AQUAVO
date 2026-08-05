/**
 * AQUAVO — single source of truth for customer-facing trust claims and
 * official contact details.
 *
 * WHY THIS FILE EXISTS
 * Three separate arrays previously declared the same four promises with
 * divergent wording (footer, homepage, product detail). Same promise, three
 * phrasings, on pages a customer sees in one session — which reads as
 * carelessness on exactly the claims that carry the most trust weight, and
 * meant a shipping-policy change had to be made in three places.
 *
 * GOVERNANCE
 * Every string below is owner-approved (2026-08-05, recorded in CLAUDE.md
 * "OWNER-APPROVED COMMERCIAL CLAIMS") or carried forward from
 * 02_Legal_Brand_Usage/AQUAVO_Legal_Brand_Usage_Guide_v2.md.
 *
 * Do NOT paraphrase these strings at a call site, and do not add a claim here
 * without owner approval first. Per the legal guide, a claim is only publishable
 * if it is real and currently true — and a badge graphic implying certification
 * is as much a false claim as the equivalent text.
 *
 * NEVER publish: manufacturing, certification, laboratory testing, "safe for all
 * fish", "100% natural", "chemical-free", the (R) symbol, any live-organism
 * implication, or any payment method other than cash on delivery.
 */

/** Approved claim identifiers. Use these rather than raw strings. */
export type BrandClaimId =
  | "delivery"
  | "support"
  | "damagedResponse"
  | "cashOnDelivery"
  | "checkedAndPacked";

export interface BrandClaim {
  id: BrandClaimId;
  /** Exact approved wording. Render verbatim. */
  title: string;
  /** Optional supporting line. Must not extend or weaken the claim. */
  detail?: string;
}

/**
 * The complete set of approved customer-facing service claims.
 * Order is presentation-neutral; pick per surface via `pickClaims`.
 */
export const BRAND_CLAIMS: Record<BrandClaimId, BrandClaim> = {
  delivery: {
    id: "delivery",
    title: "التوصيل خلال 24 ساعة إلى جميع المحافظات العراقية",
  },
  support: {
    id: "support",
    title: "الدعم متوفر 24/7",
  },
  damagedResponse: {
    id: "damagedResponse",
    title: "الرد خلال 24 ساعة إذا وصل المنتج تالف",
  },
  cashOnDelivery: {
    id: "cashOnDelivery",
    title: "الدفع عند الاستلام",
  },
  checkedAndPacked: {
    id: "checkedAndPacked",
    title: "مختار ومفحوص ومعبأ بواسطة AQUAVO",
  },
};

/**
 * The four promises shown in the shared trust strip (footer, homepage) and the
 * product-detail trust area. One list, one wording, every surface.
 */
export const TRUST_STRIP_CLAIM_IDS: readonly BrandClaimId[] = [
  "delivery",
  "cashOnDelivery",
  "checkedAndPacked",
  "support",
];

export function pickClaims(ids: readonly BrandClaimId[]): BrandClaim[] {
  return ids.map((id) => BRAND_CLAIMS[id]);
}

/** The four trust-strip claims, resolved. */
export const TRUST_STRIP_CLAIMS: BrandClaim[] = pickClaims(TRUST_STRIP_CLAIM_IDS);

/**
 * Official contact details.
 *
 * The owner confirmed INFO@AQUAVOIQ.COM on 2026-08-05. This supersedes the
 * `Info@aquavo.com` value in 02_Legal_Brand_Usage (a domain error in that
 * document — the real mailbox is on the same domain as the website).
 */
export const OFFICIAL_CONTACT = {
  /** Display form, uppercase as approved. */
  email: "INFO@AQUAVOIQ.COM",
  /** mailto: target — lowercased because some mail clients are case-fussy. */
  emailHref: "mailto:info@aquavoiq.com",
  /** Canonical stored form, never abbreviated. */
  phone: "07747880673",
  /** Display form used across the storefront. */
  phoneDisplay: "+964 774 788 0673",
  phoneHref: "tel:+9647747880673",
  website: "aquavoiq.com",
  social: "aquavo_iq",
  location: "بغداد — العراق",
} as const;

/**
 * Shipping fact that is NOT a claim about service quality — it is a price.
 * Kept here so the fee is stated in one place, but deliberately separate from
 * BRAND_CLAIMS so it is never rendered as a trust badge.
 */
export const SHIPPING_FEE_LABEL = "أجرة توصيل ثابتة";
export const SHIPPING_FEE_DETAIL = "5,000 د.ع";

/** Payment reality: cash on delivery only. No gateway is enabled. */
export const PAYMENT_METHOD_LABEL = "الدفع عند الاستلام فقط";
