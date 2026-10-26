import { DEFAULT_LOCALE, type Locale } from "../shared/i18n/locales.js";
import { AQUAVO_BASE_URL, PUBLIC_INDEXABLE_PATHS } from "../shared/seo-contract.js";
import { SEO_META_OVERRIDES } from "./_seo-content.js";
import { getLocalizedStaticMeta, type LocalizedStaticMeta } from "./_static-meta-i18n.js";

// Search-only edits: localized visible headings, summaries and schema names
// continue to use the original localized page copy.
const SEARCH_OVERRIDES: Partial<Record<Locale, Record<string, Partial<LocalizedStaticMeta>>>> = {
  "en": {
    "/": {
      "description": "AQUAVO supplies aquarium filters, heaters, food, lighting and water treatments in Iraq, with nationwide delivery and cash on delivery or online payment."
    },
    "/products": {
      "description": "Browse aquarium filters, heaters, food, LED lighting, decor and water treatments at AQUAVO, with clear prices and delivery across Iraq."
    },
    "/blog": {
      "description": "AQUAVO articles on aquarium equipment, water testing, filters, heaters and maintenance, with practical topics for keepers in Iraq."
    },
    "/journey": {
      "title": "Your Aquarium Journey: Setup in Iraq | AQUAVO"
    },
    "/fish-health-diagnosis": {
      "description": "Organise fish symptoms, tank conditions and observations with this guidance tool before taking action or discussing the case with a specialist."
    },
    "/beginner-guide": {
      "description": "A beginner's guide to aquarium keeping in Iraq, covering tank and filter selection, water preparation and everyday care before and after setup."
    },
    "/terms": {
      "description": "Read AQUAVO's terms for using the website and ordering aquarium supplies, including payment, delivery and the related store policies."
    },
    "/privacy-policy": {
      "description": "Read how AQUAVO collects, uses and protects customer information when you browse the site, place an order or contact the store."
    },
    "/contact": {
      "title": "Contact AQUAVO — Aquarium Equipment Support in Iraq",
      "description": "Contact AQUAVO about orders, delivery, payment or aquarium equipment details, and ask about products that match your tank's size and needs."
    },
    "/fish-breeding-calculator": {
      "description": "An educational calculator for organising fish breeding data by species and recorded conditions, with a structured basis for follow-up."
    },
    "/shipping": {
      "description": "Delivery information for AQUAVO orders across Iraq, including payment options and where to check the delivery fee and order details before confirmation."
    }
  },
  "ckb": {
    "/": {
      "description": "AQUAVO فرۆشگای ئۆنلاینی کەرەستەی ئاکواریۆمە لە عێراق: فلتەر، گەرمکەرەوە، خۆراک و ڕووناکی، لەگەڵ گەیاندن و پارەدان لە کاتی وەرگرتن یان ئۆنلاین."
    },
    "/products": {
      "title": "پێداویستییەکانی ئاکواریۆم لە عێراق | AQUAVO",
      "description": "فلتەر، گەرمکەرەوە، خۆراک، ڕووناکی LED و دیکۆری ئاکواریۆم لە AQUAVO ببینە، لەگەڵ نرخی ڕوون، وردەکاریی بەرهەم و گەیاندن بۆ هەموو عێراق."
    },
    "/calculators": {
      "title": "ژمێرەری ئاکواریۆم: قەبارە، فلتەر و گەرمکەرەوە | AQUAVO"
    },
    "/fish-health-diagnosis": {
      "description": "نیشانەکانی ماسی، بارودۆخی حەوز و تێبینییەکانت بە ئەم ئامرازە ڕێک بخە، پێش ئەوەی هەنگاوێک بنێیت یان دۆخەکە لەگەڵ پسپۆڕێک باس بکەیت."
    },
    "/terms": {
      "description": "مەرجەکانی بەکارهێنانی ماڵپەڕ و داواکردنی پێداویستییەکانی ئاکواریۆم لە AQUAVO بخوێنەوە، لەگەڵ ڕێساکانی پارەدان، گەیاندن و سیاسەتەکانی فرۆشگا."
    },
    "/privacy-policy": {
      "description": "بزانە AQUAVO چۆن زانیاریی کڕیار کۆدەکاتەوە، بەکاری دەهێنێت و دەپارێزێت لە کاتی سەردانی ماڵپەڕ، داواکردن یان پەیوەندی بە فرۆشگا."
    },
    "/fish-breeding-calculator": {
      "description": "ژمێرەرێکی فێرکاری بۆ ڕێکخستنی زانیاریی زاوزێی ماسی بەپێی جۆر و بارودۆخی تۆمارکراو، بۆ پێداچوونەوە بە زانیارییەکان و بەدواداچوونی حەوزی زاوزێ."
    },
    "/shipping": {
      "description": "زانیاریی گەیاندنی داواکارییەکانی AQUAVO بۆ هەموو عێراق، هەڵبژاردەکانی پارەدان و شوێنی بینینی کرێی گەیاندن و وردەکاریی داواکاری پێش پشتڕاستکردنەوە."
    }
  },
  "ar": {
    "/contact": { "title": "تواصل ويه AQUAVO — دعم الطلبات ومعدات الأحواض" },
    "/terms": { "title": "شروط الاستخدام والشراء من AQUAVO لمستلزمات الأحواض" },
    "/privacy-policy": { "title": "سياسة الخصوصية وحماية بيانات الزبائن | AQUAVO" },
    "/shipping": {
      "description": "تفاصيل توصيل طلبات AQUAVO لكل العراق، وخيارات الدفع عند الاستلام أو إلكترونياً، ومكان ظهور رسوم التوصيل وتفاصيل الطلب قبل التأكيد."
    }
  }
};


/** Generic static search copy shared with the browser, without category data. */
export function getGenericStaticSearchMeta(
  locale: Locale = DEFAULT_LOCALE,
  path: string,
): LocalizedStaticMeta | undefined {
  const logicalPath = new URL(path, AQUAVO_BASE_URL).pathname.replace(/\/+$/, "") || "/";
  if (!(PUBLIC_INDEXABLE_PATHS as readonly string[]).includes(logicalPath)) return undefined;
  const base = locale === DEFAULT_LOCALE
    ? SEO_META_OVERRIDES[logicalPath]
    : getLocalizedStaticMeta(locale, logicalPath);
  const generic = { ...base, ...SEARCH_OVERRIDES[locale]?.[logicalPath] };
  return generic.title && generic.description
    ? { title: generic.title, description: generic.description, ...(generic.keywords ? { keywords: generic.keywords } : {}) }
    : undefined;
}
