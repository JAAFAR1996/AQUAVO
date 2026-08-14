/**
 * The one way to render a WhatsApp link on the storefront.
 *
 * Every customer-facing WhatsApp entry point goes through this component, and
 * `client/src/lib/__tests__/whatsapp-coverage.test.ts` fails the build if a new one does not. That test
 * is the actual guarantee — this component is only convenient. Nine of AQUAVO's ten WhatsApp doors were
 * unmeasured precisely because "remember to call the tracker" was a convention rather than a rule.
 *
 * It renders a real `<a href>` rather than a button with a click handler, so middle-click, "open in new
 * tab" and "copy link address" keep working, and so the link is announced correctly to a screen reader.
 * Tracking rides along in onClick; `target="_blank"` means the AQUAVO tab is never torn down, so the
 * capture request is not cut off mid-flight.
 */
import type { AnchorHTMLAttributes, ReactNode } from "react";
import {
  AQUAVO_WHATSAPP_URL,
  buildWhatsAppUrl,
  trackWhatsAppHandoff,
  type WhatsAppHandoffContext,
} from "@/lib/whatsapp";

export interface WhatsAppLinkProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "target" | "rel">,
    WhatsAppHandoffContext {
  children: ReactNode;
  /** Override the destination. Defaults to AQUAVO's published line. */
  baseUrl?: string;
}

export function WhatsAppLink({
  source,
  message,
  productId,
  productName,
  category,
  orderNumber,
  baseUrl = AQUAVO_WHATSAPP_URL,
  children,
  onClick,
  ...anchorProps
}: WhatsAppLinkProps) {
  const context: WhatsAppHandoffContext = { source, message, productId, productName, category, orderNumber };

  return (
    <a
      {...anchorProps}
      href={buildWhatsAppUrl(context, baseUrl)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => {
        // Tracking first, and never allowed to break the handoff: a customer reaching support matters
        // more than an analytics event, so a throw here must not prevent navigation.
        try {
          trackWhatsAppHandoff(context);
        } catch (_) { /* swallow */ }
        onClick?.(event);
      }}
    >
      {children}
    </a>
  );
}
