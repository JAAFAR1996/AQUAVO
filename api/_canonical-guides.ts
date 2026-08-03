import {
  GUIDE_CONTENT_PAGES,
  renderGuideHtml,
  renderGuideMarkdown,
  type GuidePage,
} from "./_guides-content.js";
import { canonicalProductCategory } from "../shared/seo-contract.js";

const GUIDE_ROUTE_ALIASES: Record<string, string> = {
  "/guides/aquarium-filter-guide": "/guides/filter-choice",
  "/guides/aquarium-heater-guide": "/guides/heater-choice",
  "/guides/beginner-aquarium-mistakes": "/guides/5-mistakes",
  "/guides-filter-choice": "/guides/filter-choice",
  "/guides-filter-media-guide": "/guides/filter-media",
  "/guides-heater-choice": "/guides/heater-choice",
};

const CANONICAL_SOURCE_FALLBACKS: Record<string, string[]> = {
  "/guides/filter-choice": ["/guides/filter-choice", "/guides/aquarium-filter-guide"],
  "/guides/heater-choice": ["/guides/heater-choice", "/guides/aquarium-heater-guide"],
  "/guides/5-mistakes": ["/guides/5-mistakes", "/guides/beginner-aquarium-mistakes"],
};

const EXTRA_GUIDE_PAGES: Record<string, GuidePage> = {
  "/guides/cloudy-water-causes": {
    title: "ليش ماء الحوض يصير عكر؟ الأسباب والحل خطوة بخطوة | AQUAVO",
    description: "دليل عملي لتحديد سبب عكورة ماء الحوض: غبار الركيزة، ازدهار بكتيري، إفراط بالتغذية، أو ضعف الفلترة، مع خطوات آمنة للتصحيح.",
    h1: "ليش ماء الحوض يصير عكر؟",
    answer: "عكورة ماء الحوض مو سبب واحد. إذا ظهرت بعد التأسيس فقد تكون غبار رمل أو ازدهاراً بكتيرياً مؤقتاً، وإذا ظهرت بعد مدة فافحص التغذية والفضلات وتدفق الفلتر والأمونيا والنتريت. لا تبدّل كل الماء ولا تضيف مواد عشوائياً؛ حدّد السبب أولاً ثم صحّح التغذية والفلترة وتغيير الماء تدريجياً.",
    sections: [
      {
        h2: "1) عكورة بعد تركيب الحوض",
        paras: [
          "العكورة البنية أو الرمادية مباشرة بعد إضافة الرمل أو الحصى غالباً تكون غباراً دقيقاً. شغّل الفلتر وضع قطن ترشيح ناعماً وبدّله عند اتساخه، وتجنب تحريك الركيزة باستمرار.",
          "العكورة البيضاء في الحوض الجديد قد تكون ازدهاراً بكتيرياً أثناء التدوير. راقب الأمونيا والنتريت ولا تضف أسماكاً جديدة قبل استقرار القيم.",
        ],
      },
      {
        h2: "2) عكورة في حوض قائم",
        paras: [
          "راجع كمية الطعام وبقاياه، عدد الأسماك، تراكم الفضلات، وانخفاض تدفق الفلتر. الطعام الزائد والتحميل الحيوي العالي يرفعان المواد العضوية بسرعة.",
          "افحص الأمونيا والنتريت، وغيّر جزءاً من الماء بماء معالَج إذا كانت القيم مرتفعة، مع تقليل التغذية وتنظيف المخلفات الظاهرة.",
        ],
      },
      {
        h2: "3) متى يكون الوضع طارئاً؟",
        paras: [
          "إذا ترافق التعكر مع صعود الأسماك للسطح، تنفس سريع، خمول، أو أمونيا ونتريت أعلى من الصفر، تعامل معه كحالة جودة ماء عاجلة: زِد التهوية، غيّر جزءاً من الماء، وتحقق من الفلتر فوراً.",
        ],
      },
    ],
    faq: [
      { q: "هل أبدل كل ماء الحوض؟", a: "لا. التغيير الكامل قد يسبب صدمة ويخل بالتوازن. غيّر جزءاً مناسباً حسب نتيجة الفحص والحالة." },
      { q: "هل مروّق الماء يحل المشكلة؟", a: "قد يجمع الجزيئات الدقيقة لكنه لا يعالج السبب مثل الأمونيا أو الإفراط بالتغذية أو ضعف الفلترة." },
      { q: "كم يحتاج حتى يصفى؟", a: "يعتمد على السبب. غبار الركيزة قد يختفي خلال ساعات أو أيام، أما مشكلة جودة الماء فلا تتحسن إلا بعد تصحيح السبب." },
    ],
    links: [
      { href: "/guides/aquarium-water-test-guide", label: "دليل فحص ماء الحوض" },
      { href: "/guides/filter-maintenance", label: "تنظيف وصيانة الفلتر" },
      { href: "/guides/water-change-schedule", label: "جدول تغيير الماء" },
      { href: "/products?category=الفلترة والتنقية", label: "مواد ومعدات الفلترة" },
    ],
    cta: { text: "راجع أدوات الفحص والفلترة المتوفرة، ثم اختر بناءً على سبب العكورة وحجم الحوض.", href: "/products?category=الفحص والمراقبة", label: "تصفح أدوات الفحص" },
    breadcrumb: [
      { label: "الرئيسية", href: "/" },
      { label: "أسباب عكورة الماء", href: "/guides/cloudy-water-causes" },
    ],
  },
  "/guides/filter-maintenance": {
    title: "تنظيف وصيانة فلتر حوض السمك بدون قتل البكتيريا | AQUAVO",
    description: "خطوات تنظيف فلتر الحوض بأمان: متى تنظفه، استخدام ماء الحوض، ترتيب الوسائط، وفحص التدفق من دون إتلاف البكتيريا النافعة.",
    h1: "شلون تنظف فلتر الحوض صح؟",
    answer: "نظّف الفلتر عند انخفاض التدفق أو تراكم الأوساخ، مو حسب موعد ثابت فقط. افصل الكهرباء، احتفظ بماء من الحوض، واعصر الإسفنج بلطف بهذا الماء لا بماء البوري. لا تبدّل جميع الوسائط البيولوجية معاً، ولا تتركها تجف. أعد تركيبها بترتيب يسمح بتدفق الماء ثم شغّل الفلتر وتأكد من عدم وجود تسريب.",
    sections: [
      {
        h2: "قبل التنظيف",
        paras: [
          "راقب التدفق والصوت والتسريب. ضعف التدفق قد ينتج من إسفنج مسدود، خرطوم متسخ، أو مروحة تحتاج تنظيفاً، وليس من حاجة لاستبدال الفلتر كله.",
          "حضّر وعاءً بماء مسحوب من الحوض حتى تنظف الإسفنج وتحافظ على رطوبة الوسائط البيولوجية.",
        ],
      },
      {
        h2: "خطوات التنظيف",
        paras: [
          "افصل الكهرباء، افتح الفلتر حسب تعليمات الشركة، أزل المخلفات الكبيرة، واعصر الإسفنج برفق في ماء الحوض. نظّف المروحة والأنابيب من الرواسب بدون صابون.",
          "لا تغسل السيراميك أو الوسائط البيولوجية بقوة. حركها بخفة في ماء الحوض فقط إذا تراكم عليها وسخ يمنع التدفق.",
        ],
      },
      {
        h2: "بعد إعادة التشغيل",
        paras: [
          "تأكد من رجوع التدفق وعدم وجود هواء محبوس أو تسريب. راقب الأسماك وافحص الأمونيا والنتريت إذا استبدلت كمية كبيرة من الوسائط أو توقف الفلتر مدة طويلة.",
        ],
      },
    ],
    faq: [
      { q: "كم مرة أنظف الفلتر؟", a: "عند انخفاض التدفق أو تراكم الأوساخ. الأحواض المكتظة تحتاج متابعة أكثر من الأحواض الخفيفة." },
      { q: "ليش ما أستخدم ماء البوري؟", a: "الكلور أو الكلورامين قد يضر البكتيريا النافعة الموجودة على الوسائط." },
      { q: "أبدل السيراميك كله؟", a: "لا تبدله كله دفعة واحدة إلا لسبب ضروري؛ التبديل التدريجي يحافظ على جزء من المستعمرة البكتيرية." },
    ],
    links: [
      { href: "/guides/filter-choice", label: "اختيار الفلتر المناسب" },
      { href: "/guides/filter-media", label: "أنواع وسائط الفلترة" },
      { href: "/guides/aquarium-water-test-guide", label: "فحص الأمونيا والنتريت" },
      { href: "/products?category=الصيانة والتنظيف", label: "أدوات تنظيف الحوض" },
    ],
    cta: { text: "تصفح مواد الفلترة وأدوات التنظيف المسجلة مع حالة المخزون الحالية.", href: "/products?category=الفلترة والتنقية", label: "تصفح مواد الفلترة" },
    breadcrumb: [
      { label: "الرئيسية", href: "/" },
      { label: "صيانة الفلتر", href: "/guides/filter-maintenance" },
    ],
  },
  "/guides/fish-gasping-surface": {
    title: "ليش السمك يصعد للسطح ويتنفس بسرعة؟ خطوات عاجلة | AQUAVO",
    description: "أسباب صعود السمك للسطح مثل نقص الأكسجين، الأمونيا والنتريت، الحرارة أو تعطل الفلتر، مع خطوات إسعافية آمنة وفحوصات ضرورية.",
    h1: "ليش السمك يصعد للسطح؟",
    answer: "صعود الأسماك للسطح مع تنفس سريع علامة تستحق التصرف فوراً، وقد ينتج من نقص الأكسجين أو ارتفاع الأمونيا والنتريت أو حرارة عالية أو تعطل الفلتر. زِد حركة سطح الماء والتهوية، افحص الحرارة والأمونيا والنتريت، وغيّر جزءاً من الماء بماء معالَج ومتقارب الحرارة إذا كانت جودة الماء مشكوكاً بها.",
    sections: [
      {
        h2: "الإجراءات الفورية",
        paras: [
          "وجّه مخرج الفلتر نحو السطح، شغّل مضخة الهواء إن وجدت، وتأكد أن الفلتر يعمل. لا تطعم مؤقتاً إلى أن تعرف السبب.",
          "افحص الحرارة؛ الماء الأدفأ يحمل أكسجيناً أقل. لا تخفض الحرارة فجأة، بل صححها تدريجياً إذا كانت أعلى من مدى النوع.",
        ],
      },
      {
        h2: "فحوصات جودة الماء",
        paras: [
          "افحص الأمونيا والنتريت فوراً. القيم الآمنة لهما في الحوض المستقر هي صفر. إذا ارتفعتا، غيّر جزءاً من الماء المعالَج وقلل التغذية وراجع دورة الحوض والفلتر.",
          "راجع أي تغيير حديث: إضافة أسماك كثيرة، تنظيف كامل للفلتر، دواء، انقطاع كهرباء، أو توقف مضخة الهواء.",
        ],
      },
      {
        h2: "متى تحتاج مساعدة متخصصة؟",
        paras: [
          "إذا استمر التنفس السريع بعد تصحيح الأكسجين والماء، أو ظهرت إصابات بالخياشيم أو نفوق، اعزل المعلومات بدقة واطلب رأي مختص. لا تخلط أدوية عشوائياً لأن السبب قد لا يكون مرضاً معدياً.",
        ],
      },
    ],
    faq: [
      { q: "هل إضافة حجر هواء تكفي؟", a: "تفيد في زيادة التهوية، لكنها لا تعالج الأمونيا أو النتريت أو تعطل الفلتر؛ يجب فحص السبب." },
      { q: "هل كل وقوف قرب السطح خطر؟", a: "بعض الأنواع تتواجد قرب السطح طبيعياً، لكن التنفس السريع الجماعي أو التغير المفاجئ علامة إنذار." },
      { q: "هل أضيف دواء؟", a: "لا قبل فحص الماء والأكسجين والحرارة. الأدوية العشوائية قد تزيد الإجهاد وتضر البكتيريا النافعة." },
    ],
    links: [
      { href: "/guides/aquarium-water-test-guide", label: "دليل فحص الماء" },
      { href: "/guides/temperature-guide", label: "درجة حرارة الحوض" },
      { href: "/guides/filter-maintenance", label: "فحص وصيانة الفلتر" },
      { href: "/products?category=التهوية والأكسجين", label: "معدات التهوية" },
    ],
    cta: { text: "راجع أدوات فحص الماء والتهوية المتوفرة، وابدأ بالقياس قبل شراء علاج.", href: "/products?category=الفحص والمراقبة", label: "تصفح أدوات الفحص" },
    breadcrumb: [
      { label: "الرئيسية", href: "/" },
      { label: "صعود السمك للسطح", href: "/guides/fish-gasping-surface" },
    ],
  },
  "/guides/aquarium-maintenance-checklist": {
    title: "قائمة صيانة حوض السمك اليومية والأسبوعية والشهرية | AQUAVO",
    description: "قائمة مرتبة لصيانة حوض الزينة: ملاحظات يومية، تغيير ماء أسبوعي، تنظيف الفلتر والفحوصات الدورية بدون الإضرار بالتوازن.",
    h1: "قائمة صيانة حوض السمك",
    answer: "راقب الأسماك والحرارة والمعدات يومياً، وأزل الطعام الزائد. أسبوعياً افحص الماء عند الحاجة، غيّر نحو 20–30% بماء معالَج ومتقارب الحرارة، ونظّف الزجاج والفضلات الظاهرة. دورياً نظّف الفلتر عند ضعف التدفق بماء الحوض، وافحص الخراطيم والسخان. لا تنظف كل شيء أو تبدل كل الماء في يوم واحد.",
    sections: [
      {
        h2: "يومياً",
        paras: [
          "راقب التنفس والشهية والسلوك، تحقق من الحرارة وتدفق الفلتر، وأزل أي سمكة نافقة أو طعام متبقٍ بسرعة.",
        ],
      },
      {
        h2: "أسبوعياً",
        paras: [
          "غيّر عادة 20–30% من الماء بحسب الحمل الحيوي ونتائج الفحص، واستعمل مزيل كلور بالجرعة المكتوبة على العبوة.",
          "نظّف الزجاج واسحب الفضلات من المناطق المكشوفة من الركيزة بدون قلب الحوض كله.",
        ],
      },
      {
        h2: "شهرياً أو عند الحاجة",
        paras: [
          "افحص الأنابيب والمروحة والسخان والوصلات الكهربائية. نظّف الفلتر عند ضعف التدفق، ولا تستبدل جميع الوسائط البيولوجية دفعة واحدة.",
          "راجع نمو الأسماك وعددها وحجم الحوض، لأن خطة الصيانة تتغير مع زيادة الحمل الحيوي.",
        ],
      },
    ],
    tables: [
      {
        heading: "ملخص الجدول",
        headers: ["التكرار", "المهام"],
        rows: [
          ["يومي", "سلوك الأسماك، الحرارة، الفلتر، الطعام الزائد"],
          ["أسبوعي", "تغيير جزئي للماء، تنظيف الزجاج والفضلات، فحص عند الحاجة"],
          ["دوري", "صيانة الفلتر والخراطيم والسخان ومراجعة الحمل الحيوي"],
        ],
      },
    ],
    faq: [
      { q: "هل لازم أغيّر 30% دائماً؟", a: "هي نسبة شائعة وليست قانوناً ثابتاً؛ عدّلها حسب نتائج الفحص وعدد الأسماك وتراكم الفضلات." },
      { q: "هل أنظف الفلتر مع تغيير الماء؟", a: "يمكن عند الحاجة، لكن تجنب تنظيف كل الوسائط بقوة أو إجراء تغييرات كبيرة متعددة في وقت واحد." },
      { q: "هل أفرغ الحوض للتنظيف؟", a: "لا في الصيانة المعتادة. التغيير الكامل يسبب عدم استقرار وقد يجهد الأسماك." },
    ],
    links: [
      { href: "/guides/aquarium-weekly-maintenance", label: "شرح الصيانة الأسبوعية" },
      { href: "/guides/water-change-schedule", label: "جدول تغيير الماء" },
      { href: "/guides/filter-maintenance", label: "تنظيف الفلتر" },
      { href: "/products?category=الصيانة والتنظيف", label: "أدوات الصيانة" },
    ],
    cta: { text: "جهّز أدوات الصيانة الأساسية حسب حجم حوضك ونوع الركيزة والفلتر.", href: "/products?category=الصيانة والتنظيف", label: "تصفح أدوات الصيانة" },
    breadcrumb: [
      { label: "الرئيسية", href: "/" },
      { label: "قائمة صيانة الحوض", href: "/guides/aquarium-maintenance-checklist" },
    ],
  },
};

function cleanPath(pathname: string): string {
  return pathname.split(/[?#]/, 1)[0].replace(/\/+$/, "") || "/";
}

export function canonicalGuidePath(pathname: string): string {
  const clean = cleanPath(pathname);
  return GUIDE_ROUTE_ALIASES[clean] || clean;
}

function normalizeHref(href: string): string {
  const [path, query = ""] = href.split("?", 2);
  const canonicalPath = GUIDE_ROUTE_ALIASES[path] || path;
  if (!query) return canonicalPath;

  const params = new URLSearchParams(query);
  const category = params.get("category");
  if (category) params.set("category", canonicalProductCategory(category) || category);
  const normalized = params.toString();
  return normalized ? `${canonicalPath}?${normalized}` : canonicalPath;
}

function canonicalizePage(page: GuidePage, canonicalPath: string): GuidePage {
  return {
    ...page,
    links: page.links.map((link) => ({ ...link, href: normalizeHref(link.href) })),
    cta: { ...page.cta, href: normalizeHref(page.cta.href) },
    breadcrumb: page.breadcrumb.map((item, index) => ({
      ...item,
      href: index === page.breadcrumb.length - 1 ? canonicalPath : normalizeHref(item.href),
    })),
  };
}

export function resolveGuidePage(pathname: string): { canonicalPath: string; page: GuidePage } | null {
  const canonicalPath = canonicalGuidePath(pathname);
  const extra = EXTRA_GUIDE_PAGES[canonicalPath];
  if (extra) return { canonicalPath, page: canonicalizePage(extra, canonicalPath) };

  const candidates = CANONICAL_SOURCE_FALLBACKS[canonicalPath] || [canonicalPath];
  for (const candidate of candidates) {
    const page = GUIDE_CONTENT_PAGES[candidate];
    if (page) return { canonicalPath, page: canonicalizePage(page, canonicalPath) };
  }
  return null;
}

export function canonicalGuidePaths(): string[] {
  const paths = new Set<string>(Object.keys(EXTRA_GUIDE_PAGES));
  for (const path of Object.keys(GUIDE_CONTENT_PAGES)) paths.add(canonicalGuidePath(path));
  for (const path of Object.keys(CANONICAL_SOURCE_FALLBACKS)) {
    if (resolveGuidePage(path)) paths.add(path);
  }
  return [...paths].filter((path) => path.startsWith("/guides/")).sort();
}

export function renderCanonicalGuideHtml(
  canonicalPath: string,
  page: GuidePage,
  baseUrl: string,
  defaultImage: string,
): string {
  return renderGuideHtml(canonicalPath, canonicalizePage(page, canonicalPath), baseUrl, defaultImage);
}

export function renderCanonicalGuideMarkdown(
  canonicalPath: string,
  page: GuidePage,
  baseUrl: string,
): string {
  return renderGuideMarkdown(canonicalPath, canonicalizePage(page, canonicalPath), baseUrl);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderCanonicalGuidesIndexHtml(baseUrl: string, defaultImage: string): string {
  const entries = canonicalGuidePaths()
    .map((path) => {
      const resolved = resolveGuidePage(path);
      return resolved ? { path, page: resolved.page } : null;
    })
    .filter((entry): entry is { path: string; page: GuidePage } => Boolean(entry));

  const cards = entries.map(({ path, page }) => `
    <article>
      <h2><a href="${escapeHtml(path)}">${escapeHtml(page.h1)}</a></h2>
      <p>${escapeHtml(page.answer)}</p>
    </article>`).join("");

  const itemList = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "أدلة AQUAVO لأحواض الزينة",
    url: `${baseUrl}/guides`,
    inLanguage: "ar-IQ",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: entries.length,
      itemListElement: entries.map(({ path, page }, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: page.h1,
        url: `${baseUrl}${path}`,
      })),
    },
  };

  return `<!doctype html>
<html lang="ar" dir="rtl"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>أدلة أحواض الزينة بالعربي | AQUAVO</title>
<meta name="description" content="أدلة عملية بالعربي عن تجهيز الحوض والفلاتر والسخانات وفحص الماء والصيانة والعناية بأسماك الزينة.">
<link rel="canonical" href="${baseUrl}/guides">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta property="og:title" content="أدلة أحواض الزينة بالعربي | AQUAVO">
<meta property="og:description" content="أدلة عملية قابلة للقراءة والاقتباس عن أحواض الزينة في العراق.">
<meta property="og:url" content="${baseUrl}/guides"><meta property="og:image" content="${defaultImage}">
<script type="application/ld+json">${JSON.stringify(itemList).replace(/</g, "\\u003c")}</script>
<style>body{font-family:Cairo,Tahoma,sans-serif;background:#0B1E28;color:#fff;line-height:1.8;margin:0;padding:32px}main{max-width:1080px;margin:auto}a{color:#67d7e5}section{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}article{border:1px solid #34505b;padding:18px;border-radius:10px;background:#102a35}h1{font-size:clamp(32px,5vw,56px)}</style>
</head><body><main><nav><a href="/">الرئيسية</a> / الأدلة</nav><h1>أدلة AQUAVO لأحواض الزينة</h1><p>إجابات عملية تبدأ بالخلاصة ثم تشرح الخطوات والتحذيرات والاختيارات المناسبة.</p><section>${cards}</section></main></body></html>`;
}

export function renderCanonicalGuidesIndexMarkdown(baseUrl: string): string {
  const lines = ["# أدلة AQUAVO لأحواض الزينة", "", "إجابات عملية بالعربي عن تجهيز الحوض والعناية والمعدات.", ""];
  for (const path of canonicalGuidePaths()) {
    const resolved = resolveGuidePage(path);
    if (resolved) lines.push(`- [${resolved.page.h1}](${baseUrl}${path}) — ${resolved.page.answer}`);
  }
  return lines.join("\n");
}
