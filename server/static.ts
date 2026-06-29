import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { generateSsrMeta } from "./ssr-meta.js";
import {
  GUIDE_CONTENT_PAGES,
  renderGuideHtml,
  renderGuidesIndexHtml,
} from "../api/_guides-content.js";

const PRECOMPRESSED_EXTENSIONS = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".svg",
  ".txt",
  ".wasm",
  ".xml",
]);

const IMAGE_EXTENSIONS_WITH_WEBP_FALLBACK = new Set([".jpg", ".jpeg", ".png"]);
const CRITICAL_HOME_SHELL = `<section class="critical-home-shell" aria-hidden="true"><div class="critical-home-card"><img src="/images/aquascape-styles/iwagumi_aquascape_1765676307763.webp" alt="" fetchpriority="high" decoding="sync" width="1200" height="800"><div class="critical-home-copy"><h1>&#1581;&#1608;&#1604; &#1581;&#1608;&#1590;&#1603; &#1573;&#1604;&#1609; &#1578;&#1581;&#1601;&#1577; &#1601;&#1606;&#1610;&#1577;.</h1></div></div></section>`;

/**
 * SSR_NAV_SHELL — injected into every page's server HTML before React mounts.
 * Visually hidden (1×1px, opacity:0, pointer-events:none) so users never see it.
 * Crawlers (Googlebot, Ahrefs, ClaudeBot, GPTBot) parse it as real HTML links.
 * React replaces #root contents on hydration — zero visual conflict.
 */
const SSR_NAV_SHELL = `<nav id="ssr-nav-shell" aria-hidden="true" style="position:absolute;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;clip:rect(0,0,0,0);white-space:nowrap;">
  <a href="/">AQUAVO &#1575;&#1604;&#1585;&#1574;&#1610;&#1587;&#1610;&#1577;</a>
  <a href="/products">&#1575;&#1604;&#1605;&#1606;&#1578;&#1580;&#1575;&#1578;</a>
  <a href="/deals">&#1575;&#1604;&#1593;&#1585;&#1608;&#1590;</a>
  <a href="/blog">&#1575;&#1604;&#1605;&#1583;&#1608;&#1606;&#1577;</a>
  <a href="/faq">&#1575;&#1604;&#1571;&#1587;&#1574;&#1604;&#1577; &#1575;&#1604;&#1588;&#1575;&#1574;&#1593;&#1577;</a>
  <a href="/shipping">&#1575;&#1604;&#1578;&#1608;&#1589;&#1610;&#1604;</a>
  <a href="/return-policy">&#1587;&#1610;&#1575;&#1587;&#1577; &#1575;&#1604;&#1573;&#1585;&#1580;&#1575;&#1593;</a>
  <a href="/about">&#1593;&#1606; AQUAVO</a>
  <a href="/why-aquavo">&#1604;&#1605;&#1575;&#1584;&#1575; AQUAVO</a>
  <a href="/beginner-guide">&#1583;&#1604;&#1610;&#1604; &#1575;&#1604;&#1605;&#1576;&#1578;&#1583;&#1574;&#1610;&#1606;</a>
  <a href="/calculators">&#1575;&#1604;&#1581;&#1575;&#1587;&#1576;&#1575;&#1578;</a>
  <a href="/fish-encyclopedia">&#1605;&#1608;&#1587;&#1608;&#1593;&#1577; &#1575;&#1604;&#1571;&#1587;&#1605;&#1575;&#1603;</a>
  <a href="/journey">&#1585;&#1581;&#1604;&#1578;&#1603;</a>
  <a href="/sustainability">&#1575;&#1604;&#1575;&#1587;&#1578;&#1583;&#1575;&#1605;&#1577;</a>
  <a href="/order-tracking">&#1578;&#1578;&#1576;&#1593; &#1575;&#1604;&#1591;&#1604;&#1576;</a>
  <a href="/guides/new-aquarium-setup-iraq">&#1578;&#1580;&#1607;&#1610;&#1586; &#1581;&#1608;&#1590; &#1587;&#1605;&#1603; &#1580;&#1583;&#1610;&#1583;</a>
  <a href="/guides/aquarium-water-test-guide">&#1601;&#1581;&#1589; &#1605;&#1575;&#1569; &#1575;&#1604;&#1581;&#1608;&#1590;</a>
  <a href="/guides/aquarium-decor-stones-guide">&#1583;&#1610;&#1603;&#1608;&#1585; &#1575;&#1604;&#1581;&#1608;&#1590;</a>
  <a href="/guides/heater-choice">&#1575;&#1582;&#1578;&#1610;&#1575;&#1585; &#1575;&#1604;&#1587;&#1582;&#1575;&#1606;</a>
  <a href="/guides/filter-choice">&#1575;&#1582;&#1578;&#1610;&#1575;&#1585; &#1575;&#1604;&#1601;&#1604;&#1578;&#1585;</a>
  <a href="/guides/algae-control">&#1605;&#1603;&#1575;&#1601;&#1581;&#1577; &#1575;&#1604;&#1591;&#1581;&#1575;&#1604;&#1576;</a>
  <a href="/guides/water-change-schedule">&#1580;&#1583;&#1608;&#1604; &#1578;&#1594;&#1610;&#1610;&#1585; &#1575;&#1604;&#1605;&#1575;&#1569;</a>
  <a href="/guides/feeding-table">&#1580;&#1583;&#1608;&#1604; &#1575;&#1604;&#1578;&#1594;&#1584;&#1610;&#1577;</a>
  <a href="/guides/quarantine">&#1575;&#1604;&#1581;&#1580;&#1585; &#1575;&#1604;&#1589;&#1581;&#1610;</a>
  <a href="/guides/aquarium-salt">&#1605;&#1604;&#1581; &#1575;&#1604;&#1581;&#1608;&#1590;</a>
  <a href="/guides/treatment-basics">&#1571;&#1587;&#1575;&#1587;&#1610;&#1575;&#1578; &#1575;&#1604;&#1593;&#1604;&#1575;&#1580;</a>
  <a href="/guides/tank-rescue-plan">&#1573;&#1606;&#1602;&#1575;&#1584; &#1575;&#1604;&#1581;&#1608;&#1590;</a>
  <a href="/guides/white-scale">&#1575;&#1604;&#1578;&#1585;&#1587;&#1576;&#1575;&#1578; &#1575;&#1604;&#1576;&#1610;&#1590;&#1575;&#1569;</a>
  <a href="/guides/temperature-guide">&#1583;&#1604;&#1610;&#1604; &#1575;&#1604;&#1581;&#1585;&#1575;&#1585;&#1577;</a>
  <a href="/guides/filter-media">&#1571;&#1608;&#1587;&#1575;&#1591; &#1575;&#1604;&#1578;&#1585;&#1588;&#1610;&#1581;</a>
  <a href="/guides/happy-fish-signs">&#1593;&#1604;&#1575;&#1605;&#1575;&#1578; &#1575;&#1604;&#1587;&#1605;&#1603; &#1575;&#1604;&#1587;&#1593;&#1610;&#1583;</a>
  <a href="/guides/fish-hiding">&#1575;&#1582;&#1578;&#1576;&#1575;&#1569; &#1575;&#1604;&#1587;&#1605;&#1603;</a>
  <a href="/guides/water-myths">&#1582;&#1585;&#1575;&#1601;&#1575;&#1578; &#1575;&#1604;&#1605;&#1575;&#1569;</a>
  <a href="/guides/essential-tools">&#1575;&#1604;&#1571;&#1583;&#1608;&#1575;&#1578; &#1575;&#1604;&#1571;&#1587;&#1575;&#1587;&#1610;&#1577;</a>
  <a href="/guides/eco-friendly">&#1575;&#1604;&#1593;&#1606;&#1575;&#1610;&#1577; &#1575;&#1604;&#1576;&#1610;&#1574;&#1610;&#1577;</a>
  <a href="/guides/aquarium-salt">&#1605;&#1604;&#1581; &#1575;&#1604;&#1581;&#1608;&#1590;</a>
</nav>`;

function resolveStaticAssetPath(root: string, requestPath: string) {
  try {
    const decodedPath = decodeURIComponent(requestPath);
    const resolvedPath = path.resolve(root, `.${decodedPath}`);
    const normalizedRoot = path.resolve(root);

    if (resolvedPath !== normalizedRoot && !resolvedPath.startsWith(`${normalizedRoot}${path.sep}`)) {
      return null;
    }

    return resolvedPath;
  } catch {
    return null;
  }
}

function setCacheHeaders(res: express.Response, requestPath: string) {
  if (
    requestPath.startsWith("/assets/") ||
    requestPath.startsWith("/chunks/") ||
    requestPath.startsWith("/entries/")
  ) {
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return;
  }

  res.setHeader("Cache-Control", "public, max-age=604800");
}


// ─── Per-page meta map ───────────────────────────────────────────────────────
// Controls <title>, <meta description>, <link canonical>, og:url for every path.
// Falls back to generic AQUAVO values for unregistered paths.
interface PageMeta {
  title: string;
  description: string;
  url: string;
  ogType?: string;
}

const BASE_SITE = "https://www.aquavoiq.com";

function getPageMeta(requestPath: string): PageMeta {
  const map: Record<string, PageMeta> = {
    "/guides/new-aquarium-setup-iraq": {
      title: "تجهيز حوض سمك جديد خطوة بخطوة في العراق | AQUAVO",
      description: "دليل عملي لتجهيز أول حوض سمك: اختيار الفلتر والسخان، تهيئة الماء، الدورة البايولوجية، وإضافة السمك بأمان. منتجات متوفرة مع توصيل لكل العراق.",
      url: `${BASE_SITE}/guides/new-aquarium-setup-iraq`,
    },
    "/guides/aquarium-water-test-guide": {
      title: "دليل فحص ماء حوض السمك: الأمونيا، pH، النتريت | AQUAVO",
      description: "دليل كامل لشرائط فحص ماء الحوض: القراءات الآمنة للأمونيا والنتريت والنترات وpH وشنو تسوي إذا ارتفعت. أدوات الفحص متوفرة مع توصيل لكل العراق.",
      url: `${BASE_SITE}/guides/aquarium-water-test-guide`,
    },
    "/guides/aquarium-decor-stones-guide": {
      title: "دليل ديكور وأحجار أحواض الزينة في العراق | AQUAVO",
      description: "دليل عملي لاختيار ديكور وأحجار آمنة لأحواض الزينة في العراق: شنو الحجر الآمن، هل الحجر يغير pH، شلون تغسل الديكور قبل الاستخدام، والفرق بين الديكور الطبيعي والصناعي.",
      url: `${BASE_SITE}/guides/aquarium-decor-stones-guide`,
    },
    "/guides/heater-choice": {
      title: "كيف تختار سخان الحوض المناسب | AQUAVO",
      description: "دليل اختيار سخان حوض الزينة حسب حجم الحوض وليترات الماء. سخانات أصلية متوفرة مع توصيل لكل العراق.",
      url: `${BASE_SITE}/guides/heater-choice`,
    },
    "/guides/filter-choice": {
      title: "كيف تختار فلتر الحوض المناسب | AQUAVO",
      description: "دليل اختيار فلتر حوض الزينة: الفرق بين الفلتر الداخلي والخارجي والإسفنجي. فلاتر أصلية متوفرة مع توصيل لكل العراق.",
      url: `${BASE_SITE}/guides/filter-choice`,
    },
    "/beginner-guide": {
      title: "دليل المبتدئين لتربية الأسماك في العراق | AQUAVO",
      description: "كل ما تحتاج لتربية أسماك الزينة من الصفر: المعدات، الماء، التغذية، والعناية اليومية. AQUAVO متجر معدات أحواض الزينة في العراق.",
      url: `${BASE_SITE}/beginner-guide`,
    },
  };

  return map[requestPath] ?? {
    title: "AQUAVO — مستلزمات أحواض الزينة في العراق | فلاتر، سخانات، أغذية",
    description: "AQUAVO متجر إلكتروني عراقي متخصص في معدات ومستلزمات أحواض الزينة الأصلية. فلاتر، سخانات، طعام، ديكورات، معالجات مياه. توصيل 5,000 دينار لكل العراق.",
    url: `${BASE_SITE}${requestPath}`,
  };
}

// ─── SSR content shell for /guides/aquarium-decor-stones-guide ───────────────
// Full crawlable HTML: H1, Answer Block, tables, FAQ — injected before React mounts.
// React replaces #root on hydration; this block (outside #root) stays in DOM for crawlers.
const SSR_DECOR_GUIDE_SHELL = `<article id="ssr-decor-guide" lang="ar" dir="rtl" style="position:absolute;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;clip:rect(0,0,0,0);white-space:normal;" aria-hidden="true">
<h1>دليل ديكور وأحجار أحواض الزينة في العراق</h1>
<p>اختيار ديكور وأحجار الحوض لازم يكون حسب الأمان وتأثيره على الماء، مو الشكل فقط. الحجر المناسب ما يطلق مواد ضارة، وما يرفع pH بقوة إلا إذا كان هذا مطلوباً لنوع الأسماك. قبل إدخال أي حجر أو ديكور للحوض، اغسله جيداً بدون صابون وتأكد أنه مناسب لأحواض الزينة.</p>
<nav aria-label="محتوى الدليل"><ul>
<li><a href="#safe-decor">شنو معنى ديكور آمن لحوض السمك؟</a></li>
<li><a href="#decor-table">جدول أنواع الديكور وتأثيره</a></li>
<li><a href="#ph-effect">هل الحجر يغير pH؟</a></li>
<li><a href="#vinegar-test">شلون أفحص الحجر قبل استخدامه؟</a></li>
<li><a href="#wood-color">هل الخشب يغير لون الماء؟</a></li>
<li><a href="#washing">شلون أغسل الديكور قبل الاستخدام؟</a></li>
<li><a href="#aquavo-products">منتجات AQUAVO المناسبة</a></li>
<li><a href="#faq">الأسئلة الشائعة</a></li>
</ul></nav>
<section id="safe-decor">
<h2>شنو معنى ديكور آمن لحوض السمك؟</h2>
<p>الديكور الآمن هو الذي لا يُطلق مواد كيميائية سامة في الماء، لا يُغيّر pH بشكل يضر بالسمك، وليس فيه ألوان أو طلاء غير مخصص للأحواض. AQUAVO متجر معدات ومستلزمات أحواض الزينة في العراق يوفر ديكورات مختبرة وآمنة.</p>
</section>
<section id="decor-table">
<h2>جدول أنواع الديكور وتأثيره على الماء</h2>
<table>
<thead><tr><th>النوع</th><th>هل مناسب غالباً؟</th><th>تأثيره المحتمل على الماء</th><th>ملاحظة مهمة</th></tr></thead>
<tbody>
<tr><td>حجر بركاني (Lava Rock)</td><td>نعم</td><td>خامل، لا يُغيّر pH</td><td>يُحسّن التصفية البيولوجية بسبب مساماته</td></tr>
<tr><td>حجر نهري مصقول</td><td>نعم غالباً</td><td>خامل إذا غير كلسي</td><td>افحصه بالخل قبل الاستخدام</td></tr>
<tr><td>خشب طبيعي مخصص للأحواض</td><td>نعم</td><td>يُفرز تانينات — يُحمّض الماء قليلاً</td><td>نقّعه أسبوعاً قبل الاستخدام</td></tr>
<tr><td>ديكور بلاستك مخصص للأحواض</td><td>نعم</td><td>خامل تماماً</td><td>تأكد أنه مُصنَّف food-grade أو aquarium-safe</td></tr>
<tr><td>أحجار كلسية (رخام، حجر جيري)</td><td>تحذير</td><td>يرفع pH والصلابة</td><td>مناسب فقط لأسماك تفضل ماء قلوي</td></tr>
<tr><td>قطع معدنية أو مصبوغة غير مخصصة</td><td>لا</td><td>يُطلق معادن سامة في الماء</td><td>ممنوع استخدامها في الأحواض</td></tr>
</tbody>
</table>
</section>
<section id="ph-effect">
<h2>هل الحجر يغير pH؟</h2>
<p>نعم. الأحجار الكلسية مثل الرخام والحجر الجيري تُذيب في الماء وتُرفع pH والصلابة (KH). الأحجار الخاملة مثل البازلت والكوارتز والأردواز لا تُغيّر pH. افحص الحجر دائماً قبل الاستخدام لتحديد نوعه.</p>
</section>
<section id="vinegar-test">
<h2>شلون أفحص الحجر قبل استخدامه؟ (اختبار الخل)</h2>
<p>ضع قطرة خل أبيض (حمض الخليك) على الحجر الجاف. إذا فقّع أو صدر فوران — الحجر كلسي ويرفع pH. إذا ما فقّع — الحجر خامل وآمن غالباً. هذا الاختبار سريع ورخيص ويوفّر عليك مشاكل كثيرة.</p>
</section>
<section id="wood-color">
<h2>هل الخشب يغير لون الماء؟</h2>
<p>نعم. الخشب الطبيعي يُفرز تانينات تُحوّل لون الماء للأصفر أو البني الخفيف. هذا ظاهرة طبيعية وغير ضارة — بالعكس التانينات تُقلل pH وتُريح بعض أنواع الأسماك الاستوائية. لتقليل الصبغة: نقّع الخشب في ماء ساخن لأسبوع وغيّر الماء يومياً قبل إدخاله للحوض.</p>
</section>
<section id="washing">
<h2>شلون أغسل الديكور قبل الاستخدام؟</h2>
<p>اغسل كل ديكور جديد بماء دافئ نظيف بدون صابون أو مواد تنظيف. الصابون والمنظفات تقتل البكتيريا النافعة وتُسمّم الماء. للأحجار الكبيرة: اتركها في ماء ساخن ساعتين ثم اشطفها جيداً. للديكور البلاستك: اكتفِ بشطفه بالماء البارد.</p>
</section>
<section id="aquavo-products">
<h2>منتجات AQUAVO المناسبة</h2>
<p>AQUAVO متجر معدات ومستلزمات أحواض الزينة في العراق. نوفر ديكورات وأحجاراً مختبرة وآمنة لأحواض الزينة، مع توصيل 5,000 دينار لكل محافظات العراق والدفع عند الاستلام.</p>
<ul>
<li><a href="/products?category=decorations">ديكورات وأحجار الأحواض</a></li>
<li><a href="/products?category=substrates">حصى وأرضية الأحواض</a></li>
<li><a href="/guides/aquarium-water-test-guide">دليل فحص ماء الحوض</a></li>
<li><a href="/guides/new-aquarium-setup-iraq">دليل تجهيز حوض جديد</a></li>
</ul>
</section>
<section id="faq">
<h2>الأسئلة الشائعة — ديكور وأحجار أحواض الزينة</h2>
<dl>
<dt>شنو أفضل حجر آمن لحوض السمك؟</dt>
<dd>الأحجار الخاملة هي الأآمن: البازلت، الكوارتز، الأردواز (Slate)، والأحجار النهرية المصقولة. ما يُغيّرون pH ولا يُطلقون مواد ضارة. تجنب الرخام والحجر الجيري لأنهما يرفعان pH والصلابة.</dd>
<dt>هل كل حجر طبيعي يصلح للحوض؟</dt>
<dd>لا. بعض الأحجار الطبيعية مثل الرخام والحجر الجيري تُغيّر pH وتضر ببعض أنواع الأسماك. دائماً افحص الحجر باختبار الخل قبل إدخاله للحوض.</dd>
<dt>هل الحجر يرفع pH؟</dt>
<dd>الأحجار الكلسية ترفع pH. الأحجار الخاملة مثل البازلت والكوارتز لا تُغيّر pH. اختبار الخل يُحدد نوع الحجر في ثوانٍ.</dd>
<dt>هل الخشب الطبيعي يغير لون الماء؟</dt>
<dd>نعم، يُفرز تانينات تُحوّل الماء للأصفر. هذا طبيعي وغير ضار. نقّع الخشب أسبوعاً في ماء ساخن مع تغيير الماء يومياً لتقليل الصبغة.</dd>
<dt>هل أغسل الديكور بالصابون؟</dt>
<dd>لا أبداً. الصابون والمنظفات تُسمّم الماء وتقتل البكتيريا النافعة. اغسل الديكور بماء دافئ نظيف فقط.</dd>
<dt>هل الديكور البلاستك آمن؟</dt>
<dd>نعم إذا كان مُصنَّفاً aquarium-safe أو food-grade. تجنب الديكور البلاستك الرخيص غير المخصص للأحواض لأنه قد يُطلق مواد كيميائية.</dd>
<dt>شلون أعرف الديكور غير مناسب للحوض؟</dt>
<dd>علامات الديكور غير المناسب: طلاء يتقشر، رائحة كيميائية، معدن غير مطلي، أو ألوان فاقعة من مصدر غير موثوق. اشترِ دائماً ديكوراً مُصنَّفاً لأحواض الزينة.</dd>
<dt>هل AQUAVO يبيع ديكور وأحجار أحواض الزينة في العراق؟</dt>
<dd>نعم. AQUAVO متجر معدات ومستلزمات أحواض الزينة في العراق يوفر ديكورات وأحجاراً آمنة ومختبرة، مع توصيل 5,000 دينار لكل المحافظات والدفع عند الاستلام.</dd>
</dl>
</section>
</article>`;

export function renderLocalFallbackHtml(template: string, requestPath: string) {
  const cleanPath = requestPath.replace(/\/+$/, "") || "/";
  const defaultImage = `${BASE_SITE}/logo_aquavo.png`;
  if (cleanPath === "/guides") {
    return renderGuidesIndexHtml(BASE_SITE, defaultImage);
  }

  const guidePage = GUIDE_CONTENT_PAGES[cleanPath];
  if (guidePage) {
    return renderGuideHtml(cleanPath, guidePage, BASE_SITE, defaultImage);
  }

  const meta = getPageMeta(requestPath);

  let html = template
    .replace(/__META_TITLE__/g, meta.title)
    .replace(/__META_DESCRIPTION__/g, meta.description)
    .replace(/__META_KEYWORDS__/g, "مستلزمات أحواض الزينة العراق، AQUAVO، فلاتر، سخانات، أغذية أسماك")
    .replace(/__META_URL__/g, meta.url)
    .replace(/__META_IMAGE__/g, "/logo_aquavo.png")
    .replace(/__META_OG_TYPE__/g, meta.ogType ?? "website")
    .replace(/__JSON_LD__/g, generateSsrMeta(requestPath));

  // Fix canonical tag — static.ts used localhost; now uses real URL
  html = html.replace(
    /<link rel="canonical" href="[^"]*"\s*\/>/,
    `<link rel="canonical" href="${meta.url}" />`
  );

  // Inject SSR nav shell on EVERY page (crawlable links, visually hidden)
  html = html.replace('<div id="root" dir="rtl"></div>', `${SSR_NAV_SHELL}<div id="root" dir="rtl"></div>`);
  // Fallback: if root div has no dir attribute (dev/template variants)
  if (!html.includes(SSR_NAV_SHELL)) {
    html = html.replace('<div id="root"></div>', `${SSR_NAV_SHELL}<div id="root"></div>`);
  }

  // Decor guide: inject full crawlable content block before #root
  if (requestPath === "/guides/aquarium-decor-stones-guide") {
    html = html.replace(
      `${SSR_NAV_SHELL}<div id="root" dir="rtl"></div>`,
      `${SSR_NAV_SHELL}${SSR_DECOR_GUIDE_SHELL}<div id="root" dir="rtl"></div>`
    );
  }

  if (requestPath === "/" || requestPath === "/ar") {
    html = html.replace(
      /<link rel="stylesheet"([^>]*?)href="(\/assets\/[^"]+\.css)"([^>]*)>/,
      (_tag, before, href, after) => `<link rel="stylesheet"${before}href="${href}"${after} media="print" data-app-css>`
    );
    // At this point SSR_NAV_SHELL is already before #root. Insert CRITICAL_HOME_SHELL between them.
    html = html.replace(
      `${SSR_NAV_SHELL}<div id="root" dir="rtl"></div>`,
      `${SSR_NAV_SHELL}${CRITICAL_HOME_SHELL}<div id="root" dir="rtl"></div>`
    );
  }

  return html;
}


export function serveStatic(app: Express) {
  // Get the directory of the current file (works in bundled ESM)
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // In production, we're running from dist/index.js, so public is in dist/public
  const distPath = path.resolve(__dirname, "public");

  console.log(`[Static] Looking for public files at: ${distPath}`);

  if (!fs.existsSync(distPath)) {
    console.error(`[Static] Could not find the build directory: ${distPath}`);
    // Don't throw, just serve a basic error page
    app.use("*", (_req, res) => {
      res.status(500).send("Build directory not found. Please run 'pnpm run build'.");
    });
    return;
  }

  console.log(`[Static] Serving static files from: ${distPath}`);

  app.get(["/guides", "/guides/"], (_req, res) => {
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.type("html").send(renderGuidesIndexHtml(BASE_SITE, `${BASE_SITE}/logo_aquavo.png`));
  });

  const guideRoutes = Object.keys(GUIDE_CONTENT_PAGES).flatMap((guidePath) => [
    guidePath,
    `${guidePath}/`,
  ]);

  app.get(guideRoutes, (req, res, next) => {
    const cleanPath = req.path.replace(/\/+$/, "") || "/";
    const guidePage = GUIDE_CONTENT_PAGES[cleanPath];
    if (!guidePage) return next();

    res.setHeader("Cache-Control", "public, max-age=3600");
    res.type("html").send(renderGuideHtml(cleanPath, guidePage, BASE_SITE, `${BASE_SITE}/logo_aquavo.png`));
  });

  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();

    const assetPath = resolveStaticAssetPath(distPath, req.path);
    if (!assetPath) return next();

    const ext = path.extname(assetPath).toLowerCase();

    if (IMAGE_EXTENSIONS_WITH_WEBP_FALLBACK.has(ext) && req.headers.accept?.includes("image/webp")) {
      // Try exact .webp first, then .card.webp (generated by image pipeline)
      const webpPath = assetPath.replace(/\.(jpe?g|png)$/i, ".webp");
      const cardWebpPath = assetPath.replace(/\.(jpe?g|png)$/i, ".card.webp");
      const match = fs.existsSync(webpPath) ? webpPath : fs.existsSync(cardWebpPath) ? cardWebpPath : null;
      if (match) {
        res.type("webp");
        res.setHeader("Vary", "Accept");
        setCacheHeaders(res, req.path);
        return res.sendFile(match);
      }
    }

    if (!PRECOMPRESSED_EXTENSIONS.has(ext)) return next();

    const acceptedEncodings = req.headers["accept-encoding"] || "";
    const candidates = String(acceptedEncodings).includes("br")
      ? [{ path: `${assetPath}.br`, encoding: "br" }, { path: `${assetPath}.gz`, encoding: "gzip" }]
      : String(acceptedEncodings).includes("gzip")
        ? [{ path: `${assetPath}.gz`, encoding: "gzip" }]
        : [];

    for (const candidate of candidates) {
      if (!fs.existsSync(candidate.path)) continue;
      res.type(ext);
      res.setHeader("Content-Encoding", candidate.encoding);
      res.setHeader("Vary", "Accept-Encoding");
      setCacheHeaders(res, req.path);
      return res.sendFile(candidate.path);
    }

    return next();
  });

  // Hashed assets (JS/CSS chunks) - cache forever (immutable)
  app.use("/assets", express.static(path.join(distPath, "assets"), {
    maxAge: "1y",
    immutable: true,
  }));

  // Non-hashed static files (images, fonts, manifest) - cache with revalidation
  app.use(express.static(distPath, {
    maxAge: "7d",
    etag: true,
    lastModified: true,
  }));

  // fall through to index.html if the file doesn't exist (SPA routing)
  // Check ssr-template first (build moves index.html there for SSR meta injection)
  const ssrTemplatePath = path.resolve(__dirname, "ssr-template", "index.html");
  const publicIndexPath = path.resolve(distPath, "index.html");
  const indexPath = fs.existsSync(publicIndexPath) ? publicIndexPath : ssrTemplatePath;

  app.use((req, res, next) => {
    if (path.extname(req.path)) {
      res.status(404).send("Not found");
      return;
    }

    next();
  });

  app.use("*", (req, res) => {
    res.setHeader("Cache-Control", "no-cache");
    fs.readFile(indexPath, "utf8", (error, template) => {
      if (error) {
        res.status(500).send("Unable to load application shell.");
        return;
      }

      const requestPath = (req.originalUrl || req.url || req.path).split("?")[0] || "/";
      res.type("html").send(renderLocalFallbackHtml(template, requestPath));
    });
  });
}
