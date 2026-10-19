import { AQUAVO_ENTITY } from "./seo-contract.js";

const EMAIL_OFF_START = "<!--email_off-->";
const EMAIL_OFF_END = "<!--/email_off-->";

/**
 * Keep the published support address usable without JavaScript. Cloudflare
 * otherwise rewrites it to an email-protection URL that crawlers receive as 404.
 * Run after React renders, so these are real HTML comments rather than text.
 * Only the existing public address is exempted; no zone settings are changed.
 */
export function preservePublicEmailHtml(html: string): string {
  const publicEmail = AQUAVO_ENTITY.email.toLowerCase();
  const protect = (markup: string) => EMAIL_OFF_START + markup + EMAIL_OFF_END;

  // The input is generated HTML. Keep tags, raw-text elements, existing
  // exemptions and whole anchors intact while inspecting ordinary text nodes.
  return html.replace(
    /<!--email_off-->[\s\S]*?<!--\/email_off-->|<!--[\s\S]*?-->|<(script|style|textarea|noscript|xmp|head)\b[^>]*>[\s\S]*?<\/\1\s*>|<a\b[^>]*>[\s\S]*?<\/a\s*>|<[^>]*>|[^<]+/gi,
    (part: string) => {
      if (/^<a\b/i.test(part)) {
        const openingTag = part.slice(0, part.indexOf(">") + 1);
        const href = openingTag.match(/\shref=(["'])(.*?)\1/i)?.[2];
        if (href?.toLowerCase().split("?")[0] === "mailto:" + publicEmail) {
          return protect(part);
        }
        return part;
      }
      if (part.startsWith("<")) return part;
      return part.replace(
        /[\p{L}\p{N}.!#$%&'*+/=?^_\u0060{|}~-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)+/gu,
        (address: string) => address.toLowerCase() === publicEmail ? protect(address) : address,
      );
    },
  );
}
