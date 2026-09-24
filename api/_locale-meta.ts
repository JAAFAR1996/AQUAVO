/**
 * Locale handling for the crawler/browser HTML shell (api/ssr-meta.ts).
 *
 * The URL carries the locale, so a cached page is always the right language:
 * no Vary on cookies is needed. This module strips the prefix, and injects
 * <html lang dir>, reciprocal hreflang links, per-locale canonical and
 * og:locale into the template.
 */
import {
  AQUAVO_BASE_URL,
} from "../shared/seo-contract.js";
import {
  DEFAULT_LOCALE,
  LOCALES,
  SUPPORTED_LOCALES,
  alternatesFor,
  localizePath,
  splitLocaleFromPath,
  type Locale,
} from "../shared/i18n/locales.js";
import { RELEASED_LOCALES, releasedAlternatesFor } from "../shared/i18n/release.js";

export { splitLocaleFromPath, localizePath };

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Absolute URL of a logical path in a locale, with query string preserved. */
export function localizedAbsoluteUrl(logicalPath: string, locale: Locale, search = ""): string {
  return `${AQUAVO_BASE_URL}${localizePath(logicalPath, locale)}${search}`;
}

/**
 * `<link rel="alternate" hreflang>` for every locale plus x-default. The set is
 * emitted on every locale's page, so the annotations are reciprocal by
 * construction. Query strings that define a page (category listings) are kept.
 */
export function hreflangLinks(logicalPath: string, search = ""): string {
  // Only released locales are advertised to crawlers (shared/i18n/release.ts).
  const { alternates, xDefault } = releasedAlternatesFor(logicalPath);
  const lines = alternates.map(
    (a) => `<link rel="alternate" hreflang="${a.hreflang}" href="${escapeAttr(`${AQUAVO_BASE_URL}${a.path}${search}`)}" />`,
  );
  lines.push(`<link rel="alternate" hreflang="x-default" href="${escapeAttr(`${AQUAVO_BASE_URL}${xDefault}${search}`)}" />`);
  return lines.join("\n  ");
}

export function ogLocaleTags(locale: Locale): string {
  const own = LOCALES[locale].ogLocale;
  const tags: string[] = [];
  if (own) tags.push(`<meta property="og:locale" content="${own}" />`);
  for (const other of RELEASED_LOCALES) {
    if (other === locale) continue;
    const alt = LOCALES[other].ogLocale;
    if (alt) tags.push(`<meta property="og:locale:alternate" content="${alt}" />`);
  }
  return tags.join("\n  ");
}

/**
 * Rewrite the template for a locale:
 *  - <html lang dir> and body/root dir attributes
 *  - the og:locale block (the template hard-codes ar_IQ)
 *  - hreflang links right after the canonical
 *  - the Kurdish font stylesheet (Cairo lacks Sorani glyph coverage)
 */
export function applyLocaleToHtml(html: string, locale: Locale, logicalPath: string, search = "", options: { indexable?: boolean } = {}): string {
  const def = LOCALES[locale];
  let out = html
    .replace(/<html\b[^>]*>/i, `<html lang="${locale}" dir="${def.dir}" data-locale="${locale}">`)
    .replace(/<body\b([^>]*)\bdir="[^"]*"/i, `<body$1dir="${def.dir}"`)
    .replace(/(<div id="root")(\s[^>]*)?\bdir="[^"]*"/i, `$1$2dir="${def.dir}"`)
    .replace(/\s*<meta property="og:locale" content="[^"]*" \/>/i, `\n  ${ogLocaleTags(locale)}`);

  if (options.indexable !== false) {
    out = out.replace(/(<link rel="canonical" href="[^"]*" \/>)/i, `$1\n  ${hreflangLinks(logicalPath, search)}`);
  }

  if (locale === "ckb") {
    out = out.replace(
      /<\/head>/i,
      `  <link id="aq-font-ckb" rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;600;700&display=swap" />\n</head>`,
    );
  }
  return out;
}

/** Small set of shell strings the server must know for every locale. */
export const SHELL_META: Record<
  Locale,
  { defaultTitle: string; defaultDescription: string; notFoundTitle: string; notFoundDescription: string; blogSuffix: string; homeName: string; blogName: string; productsName: string }
> = {
  ar: {
    defaultTitle: "متجر مستلزمات أحواض الزينة في العراق | AQUAVO",
    defaultDescription:
      "AQUAVO متجر إلكتروني عراقي متخصص في معدات ومستلزمات أحواض الزينة والمياه العذبة، مع توصيل لجميع محافظات العراق ودفع عند الاستلام أو إلكترونياً.",
    notFoundTitle: "الصفحة غير موجودة | AQUAVO",
    notFoundDescription: "الرابط الذي فتحته غير موجود. تقدر ترجع للرئيسية أو تتصفح معدات ومستلزمات أحواض الزينة المتوفرة لدى AQUAVO.",
    blogSuffix: "مدونة AQUAVO",
    homeName: "الرئيسية",
    blogName: "المدونة",
    productsName: "المنتجات",
  },
  en: {
    defaultTitle: "Online Aquarium Supplies Store in Iraq | AQUAVO",
    defaultDescription:
      "AQUAVO is an Iraqi online store for freshwater aquarium equipment and supplies, with delivery across Iraq and cash on delivery or online payment.",
    notFoundTitle: "Page not found | AQUAVO",
    notFoundDescription: "The link you opened does not exist. Go back to the home page or browse the aquarium equipment and supplies AQUAVO offers.",
    blogSuffix: "AQUAVO Blog",
    homeName: "Home",
    blogName: "Blog",
    productsName: "Products",
  },
  ckb: {
    defaultTitle: "فرۆشگای پێداویستییەکانی حەوزی ماسی لە عێراق | AQUAVO",
    defaultDescription:
      "AQUAVO فرۆشگایەکی عێراقییە بۆ کەرەستە و پێداویستییەکانی حەوزی ماسی: فلتەر، گەرمکەرەوە، خۆراک، ڕازاندنەوە و چارەسەری ئاو، لەگەڵ گەیاندن بۆ هەموو عێراق و پارەدان لە کاتی وەرگرتن یان ئەلیکترۆنی.",
    notFoundTitle: "لاپەڕەکە نەدۆزرایەوە | AQUAVO",
    notFoundDescription: "ئەو لینکەی کردتەوە بوونی نییە. بگەڕێوە بۆ لاپەڕەی سەرەکی یان کەرەستە و پێداویستییەکانی حەوزی ماسی AQUAVO ببینە.",
    blogSuffix: "بلۆگی AQUAVO",
    homeName: "سەرەکی",
    blogName: "بلۆگ",
    productsName: "بەرهەمەکان",
  },
};

export { DEFAULT_LOCALE };
