/**
 * THE WHATSAPP HANDOFF — one place, so a new call site cannot forget to measure.
 *
 * WHY
 * ---
 * WhatsApp carries roughly 55% of AQUAVO's orders, and `WhatsAppClick` has fired **three times in its
 * entire history**. The audit found why, and it was not event loss: `phTrackWhatsAppClick` had exactly
 * ONE call site (`product-details.tsx`), against about ten customer-facing WhatsApp surfaces — footer,
 * contact, links, checkout, order confirmation, the success fallback, the beginner guide, the chat bot
 * and referral. Nine of ten doors were unmeasured, so the site's single largest conversion path was
 * dark by construction.
 *
 * Ten independent copies of "remember to call the tracker in onClick" would fail the same way again the
 * eleventh time somebody adds a WhatsApp button. So this module owns the whole handoff: it builds the
 * URL, records the click, and opens the window. A caller supplies context and gets correct behaviour;
 * there is no separate step to omit.
 *
 * PRIVACY
 * -------
 * The prefilled MESSAGE TEXT is never recorded — it can contain whatever a customer types next, and on
 * the product page it already embeds the page URL. The destination phone number is not recorded either:
 * it is AQUAVO's own line, identical on every event, and logging it would add nothing while making
 * every payload look like it contains a phone number. What is recorded is where the click came from and
 * which product it concerned.
 *
 * NOT IN SCOPE, DELIBERATELY: this is measurement only. No FAQ buttons, no suggested questions, no ice
 * breakers, no quick replies, no automated messaging flows.
 */

import { phTrackWhatsAppClick } from "./posthog";

/** Where a WhatsApp handoff can start. Adding a surface means adding it here first. */
export type WhatsAppSource =
  | "product"
  | "footer"
  | "contact"
  | "links"
  | "checkout"
  | "order_confirmation"
  | "checkout_success_fallback"
  | "beginner_guide"
  | "chatbot"
  | "referral"
  | "invoice"
  | "other";

export interface WhatsAppHandoffContext {
  /** Which surface the customer clicked from. Required — an unattributed click is barely worth having. */
  source: WhatsAppSource;
  /** Prefilled message. Recorded ONLY as a length, never as content. */
  message?: string;
  productId?: string;
  productName?: string;
  category?: string;
  orderNumber?: string;
}

/** AQUAVO's public WhatsApp line. Already published on the storefront. */
export const AQUAVO_WHATSAPP_URL = "https://wa.me/9647747880673";

/** Build the destination URL. Exported so tests can assert it without opening a window. */
export function buildWhatsAppUrl(context: WhatsAppHandoffContext, baseUrl: string = AQUAVO_WHATSAPP_URL): string {
  if (!context.message) return baseUrl;
  return `${baseUrl}?text=${encodeURIComponent(context.message)}`;
}

/**
 * Record the handoff. Separated from navigation so a component that renders a real `<a href>` (better
 * for accessibility, middle-click and "copy link address") can call this from onClick and let the
 * browser do the navigating.
 */
export function trackWhatsAppHandoff(context: WhatsAppHandoffContext): void {
  phTrackWhatsAppClick({
    sourcePage: context.source,
    productId: context.productId,
    productName: context.productName,
    category: context.category,
    orderNumber: context.orderNumber,
    // Length only. The content may contain anything the customer is about to say.
    messageLength: context.message ? context.message.length : undefined,
  });
}

/**
 * Record the handoff and open WhatsApp.
 *
 * Uses `window.open(..., "_blank")` so the AQUAVO tab survives. That matters for measurement as well as
 * for the customer: a same-tab navigation can cut off an in-flight analytics request, which is exactly
 * the failure mode people assume is behind a low event count. Here it is not the cause — the one
 * instrumented CTA already used `target="_blank"` — but every new surface now inherits the safe
 * behaviour rather than depending on whoever writes it next.
 *
 * Tracking runs BEFORE the window opens, and a tracking failure must never block the customer.
 */
export function openWhatsApp(context: WhatsAppHandoffContext, baseUrl?: string): void {
  try {
    trackWhatsAppHandoff(context);
  } catch (_) { /* analytics must never stand between a customer and support */ }
  const url = buildWhatsAppUrl(context, baseUrl);
  if (typeof window !== "undefined") {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
