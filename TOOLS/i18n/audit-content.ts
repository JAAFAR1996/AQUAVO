/**
 * Pass-2 content audits that can be done mechanically, so that human-style
 * reading can be spent where it matters.
 *
 *   risk         classify every article by how dangerous a mistranslation is
 *   orthography  Arabic-only letters (ك ي ى ة) inside Kurdish text, outside
 *                brand names, model codes and Latin runs
 *   leakage      long runs of Kurdish text that look like untranslated Arabic
 *                (lexical, not script based: Arabic and Sorani share the script)
 *   claims       marketing or medical claims in the target with no basis in the source
 *   numbers      per paragraph: a dosage, temperature, percentage, volume or
 *                duration that changed between source and translation
 *
 * Usage: node --import tsx TOOLS/i18n/audit-content.ts [--locale=en|ckb] [--json]
 * Output: reports/i18n/content-audit.{md,json}
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { normalizeDigits } from "./_llm.js";

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")).map(([k, v]) => [k, v ?? "true"]));
const LOCALES = (args.locale ? [String(args.locale)] : ["en", "ckb"]) as Array<"en" | "ckb">;

interface Cache {
  products: Array<Record<string, unknown> & { id: string; slug: string; name: string; description: string }>;
  posts: Array<Record<string, unknown> & { id: string; slug: string; title: string; content: string; excerpt: string }>;
  blogCategories: Array<Record<string, unknown> & { id: string; slug: string; name: string }>;
}
const cache = JSON.parse(readFileSync(resolve("reports/i18n/source-cache.json"), "utf8")) as Cache;
const store = (locale: string, f: string) => {
  const p = resolve("data/i18n/translations", locale, `${f}.json`);
  return existsSync(p) ? (JSON.parse(readFileSync(p, "utf8")) as Record<string, { slug?: string; data: Record<string, unknown> }>) : {};
};

interface Finding { audit: string; locale: string; where: string; severity: "high" | "medium" | "low"; detail: string }
const findings: Finding[] = [];
const add = (f: Finding) => findings.push(f);

// ── 1. Risk classification ───────────────────────────────────────────────────
const RISK_TERMS: Array<{ re: RegExp; weight: number; topic: string }> = [
  { re: /أمونيا|نتريت|نترات|الدورة (?:البيولوجية|النيتروجينية)/, weight: 3, topic: "nitrogen cycle" },
  { re: /مرض|أمراض|علاج|دواء|جرعة|مضاد حيوي|فطري|طفيلي|النقطة البيضاء|تعفن/, weight: 3, topic: "disease / treatment" },
  { re: /كلور|كلورامين|معالج (?:مياه|الماء)|مزيل/, weight: 2, topic: "water conditioning" },
  { re: /درجة الحرارة|حرارة|مئوية|سخان|هيتر/, weight: 2, topic: "temperature" },
  { re: /pH|GH|KH|CO2|عسر|قلوية|حموضة/, weight: 2, topic: "water parameters" },
  { re: /سام|سمية|تسمم|نفوق|موت|طوارئ|خطر/, weight: 3, topic: "toxicity / emergency" },
  { re: /تغيير الماء|نسبة|٪|%/, weight: 1, topic: "dosing / proportion" },
];
function riskOf(text: string): { score: number; topics: string[] } {
  let score = 0;
  const topics = new Set<string>();
  for (const r of RISK_TERMS) {
    const m = text.match(new RegExp(r.re, "g"));
    if (m) { score += r.weight * Math.min(m.length, 4); topics.add(r.topic); }
  }
  return { score, topics: [...topics] };
}
const articleRisk = cache.posts
  .map((p) => ({ slug: p.slug, id: p.id, ...riskOf(`${p.title} ${p.content.replace(/<[^>]+>/g, " ")}`) }))
  .sort((a, b) => b.score - a.score);
const HIGH_RISK = articleRisk.filter((a) => a.score >= 12);

// ── 2. Orthography (ckb) ─────────────────────────────────────────────────────
const ARABIC_ONLY = /[كيىة]/g;
function orthography(locale: string, where: string, text: string) {
  if (locale !== "ckb") return;
  // Ignore Latin runs, model codes, HTML tags/attributes and bracketed Latin names.
  const scrubbed = text
    .replace(/<[^>]*>/g, " ")
    .replace(/[A-Za-z][A-Za-z0-9./-]*/g, " ")
    .replace(/&[a-z]+;/g, " ");
  const hits = scrubbed.match(ARABIC_ONLY);
  if (!hits) return;
  const words = new Set<string>();
  for (const w of scrubbed.match(/[\p{Script=Arabic}][\p{Script=Arabic}‌]*/gu) ?? []) if (ARABIC_ONLY.test(w)) words.add(w);
  ARABIC_ONLY.lastIndex = 0;
  if (words.size) add({ audit: "orthography", locale, where, severity: "medium", detail: `${hits.length} Arabic-only letters in: ${[...words].slice(0, 6).join(", ")}` });
}

/** Every human-readable value of a product translation, excluding the Arabic keys. */
function orthographyTextOf(d: Record<string, unknown>): string {
  const parts: string[] = [String(d.name ?? ""), String(d.description ?? ""), String(d.subcategory ?? ""), String(d.seoTitle ?? ""), String(d.seoDescription ?? "")];
  const specs = (d.specifications ?? {}) as Record<string, unknown>;
  for (const k of ["benefits", "usageInstructions", "safetyWarnings"]) for (const v of (specs[k] as string[] | undefined) ?? []) parts.push(String(v));
  if (typeof specs.__cardBenefit === "string") parts.push(specs.__cardBenefit);
  for (const entry of Object.values((specs.labelled ?? {}) as Record<string, { label?: unknown; value?: unknown }>)) {
    parts.push(String(entry?.label ?? ""), String(entry?.value ?? ""));
  }
  for (const v of Object.values((d.variantLabels ?? {}) as Record<string, unknown>)) parts.push(String(v));
  return parts.join(" ");
}

// ── 3. Arabic-sentence leakage (ckb), lexical not script based ───────────────
/** Words that are common in Arabic prose and essentially absent from Sorani. */
const ARABIC_MARKERS = /(?:^|\s)(?:التي|الذي|الذين|هذه|هذا|ذلك|عندما|لكن|أيضاً|أيضا|حيث|يجب|يمكن|كما|بعد|قبل|على|إلى|من|في|عن|مع|هو|هي|كان|كانت|سوف|قد|لا|ما|أن|إن|كل|بين|عند|حتى)(?=\s|$)/g;
/** Words that are common in Sorani and absent from Arabic. */
const SORANI_MARKERS = /(?:^|\s)(?:لە|بۆ|کە|ئەم|ئەو|دەبێت|هەیە|نییە|یان|بێت|ئەگەر|زۆر|بکە|دەکرێت|کاتێک|دوای|بەڵام|هەروەها|ئەمە|دەکات|وەک|خۆی|ئێمە|تۆ)(?=\s|$)/g;
/**
 * Sorani has no definite article, so a word carrying Arabic "ال" is almost
 * always an Arabic term left untranslated. Brand names and a few borrowed
 * proper nouns are exempt.
 */
const AL_EXEMPT = /^(?:ال(?:عراق|بصرة|موصل|أنبار|نجف|كوت|عمارة|ديوانية|سماوة|رمادي|حلة|كربلاء))$/;
function arabicArticleWords(locale: string, where: string, text: string) {
  if (locale !== "ckb") return;
  const plain = text.replace(/<[^>]+>/g, " ");
  const words = new Set<string>();
  for (const w of plain.match(/(?:^|\s)ال[\p{Script=Arabic}]{2,}/gu) ?? []) {
    const clean = w.trim();
    if (!AL_EXEMPT.test(clean)) words.add(clean);
  }
  if (words.size) {
    add({ audit: "arabic-terms", locale, where, severity: "high", detail: `Arabic definite article in: ${[...words].slice(0, 8).join(", ")}` });
  }
}

function leakage(locale: string, where: string, text: string) {
  if (locale !== "ckb") return;
  const plain = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  // Look at windows so a single Arabic quotation inside a long article is found.
  const WINDOW = 400;
  for (let i = 0; i < plain.length; i += WINDOW) {
    const chunk = plain.slice(i, i + WINDOW);
    if (chunk.replace(/[^\p{Script=Arabic}]/gu, "").length < 80) continue;
    const ar = (chunk.match(ARABIC_MARKERS) ?? []).length;
    const ckb = (chunk.match(SORANI_MARKERS) ?? []).length;
    if (ar >= 3 && ar > ckb) {
      add({ audit: "leakage", locale, where, severity: "high", detail: `Arabic markers ${ar} vs Sorani ${ckb} at offset ${i}: "${chunk.slice(0, 120)}"` });
      return;
    }
  }
}

// ── 4. Unsupported claims ────────────────────────────────────────────────────
const CLAIMS: Array<{ re: RegExp; ar: RegExp; label: string }> = [
  { re: /\bbest\b|\bthe finest\b/i, ar: /أفضل|الأفضل/, label: "best" },
  { re: /\bguarantee[ds]?\b/i, ar: /ضمان|نضمن|مضمون/, label: "guaranteed" },
  { re: /safe for all\b/i, ar: /آمن لجميع|آمن لكل/, label: "safe for all" },
  { re: /\b100\s*%/, ar: /100\s*%|١٠٠\s*٪/, label: "100%" },
  { re: /\bprofessional\b/i, ar: /احترافي|محترف|مهني/, label: "professional" },
  { re: /\bpremium\b/i, ar: /بريميوم|فاخر|ممتاز/, label: "premium" },
  { re: /\bantibacterial\b/i, ar: /مضاد للبكتيريا|مضاد بكتيري/, label: "antibacterial" },
  { re: /\bcures?\b|\btreats?\b/i, ar: /يعالج|علاج|يشفي/, label: "treats / cures" },
  { re: /\bprevents?\b/i, ar: /يمنع|يقي|وقاية/, label: "prevents" },
  { re: /\bofficial\b/i, ar: /رسمي/, label: "official" },
  { re: /\boriginal\b/i, ar: /أصلي|الأصلي/, label: "original" },
  { re: /\bmedical\b/i, ar: /طبي/, label: "medical" },
];
const CLAIMS_CKB: Array<{ re: RegExp; ar: RegExp; label: string }> = [
  { re: /باشترین/, ar: /أفضل|الأفضل/, label: "best" },
  { re: /گەرەنتی(?!.{0,12}مانگ)/, ar: /ضمان|نضمن|مضمون/, label: "guaranteed" },
  { re: /سەدا\s*سەد|100\s*%/, ar: /100\s*%|١٠٠\s*٪/, label: "100%" },
  { re: /پیشەیی|پرۆفیشناڵ/, ar: /احترافي|محترف|مهني/, label: "professional" },
  { re: /پرێمیۆم/, ar: /بريميوم|فاخر|ممتاز/, label: "premium" },
  { re: /دژە ?بەکتریا/, ar: /مضاد للبكتيريا|مضاد بكتيري/, label: "antibacterial" },
  { re: /ڕێگری دەکات/, ar: /يمنع|يقي|وقاية/, label: "prevents" },
  { re: /ڕەسمی/, ar: /رسمي/, label: "official" },
  { re: /ئەسڵی|ئۆریجیناڵ/, ar: /أصلي|الأصلي/, label: "original" },
];
/** Words that are marketing claims on a product page but ordinary prose in an article. */
const PROSE_SAFE = new Set(["treats / cures", "prevents", "original", "professional", "best", "guaranteed", "premium", "medical"]);
function claims(locale: "en" | "ckb", where: string, src: string, tgt: string) {
  const isArticle = where.startsWith("post/");
  const list = (locale === "en" ? CLAIMS : CLAIMS_CKB).filter((c) => !(isArticle && PROSE_SAFE.has(c.label)));
  const plainT = tgt.replace(/<[^>]+>/g, " ");
  for (const c of list) {
    if (!c.re.test(plainT)) continue;
    if (c.ar.test(src)) continue;
    const i = plainT.search(c.re);
    add({ audit: "claims", locale, where, severity: "high", detail: `"${c.label}" not supported by the source: "${plainT.slice(Math.max(0, i - 50), i + 70).replace(/\s+/g, " ").trim()}"` });
  }
}

// ── 5. Per-paragraph number drift ────────────────────────────────────────────
const splitParas = (html: string) =>
  html
    .split(/<\/(?:p|li|h[1-6]|td|blockquote)>/i)
    .map((s) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
    .filter((s) => s.length > 12);
const numsOf = (s: string) => (normalizeDigits(s).replace(/(\d),(?=\d{3}\b)/g, "$1").match(/\d+(?:\.\d+)?\s*(?:%|°|م|℃|C|L|ml|لتر|مل|واط|W|سم|cm|mm|ملم|ساعة|يوم|أيام|أسبوع|دقيقة|ppm|درجة)?/gi) ?? []).map((x) => x.trim());
/**
 * Whole-article multiset comparison. Paragraph-by-paragraph alignment is
 * unreliable because a translator may merge or split paragraphs, and a single
 * shift then reports every following paragraph as broken. A number that
 * disappears from, or appears in, the article as a whole is the real signal.
 */
function numberDrift(locale: string, where: string, srcHtml: string, tgtHtml: string) {
  const allNums = (html: string) =>
    (normalizeDigits(html).replace(/<[^>]+>/g, " ").replace(/(\d),(?=\d{3}\b)/g, "$1").match(/\d+(?:\.\d+)?/g) ?? []).filter((x) => Number(x) > 0);
  const sa = allNums(srcHtml);
  const sb = allNums(tgtHtml);
  const pool = [...sb];
  const missing: string[] = [];
  for (const x of sa) { const j = pool.indexOf(x); if (j >= 0) pool.splice(j, 1); else missing.push(x); }
  const srcSet = new Set(sa);
  const invented = pool.filter((x) => !srcSet.has(x) && Number(x) >= 3);
  // Small counts are routinely written as words ("two weeks", "دوو هەفتە").
  const hardMissing = missing.filter((m) => Number(m) > 12 || m.includes("."));
  if (hardMissing.length || invented.length) {
    const ctx = (html: string, n: string) => {
      const plain = normalizeDigits(html).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
      const i = plain.indexOf(n);
      return i < 0 ? "" : plain.slice(Math.max(0, i - 70), i + 60).trim();
    };
    add({
      audit: "numbers",
      locale,
      where,
      severity: "high",
      detail: [
        hardMissing.length ? `dropped ${[...new Set(hardMissing)].join(", ")} | src: "${ctx(srcHtml, hardMissing[0])}"` : "",
        invented.length ? `invented ${[...new Set(invented)].join(", ")} | tgt: "${ctx(tgtHtml, invented[0])}"` : "",
      ].filter(Boolean).join(" ;; "),
    });
  }
}

// ── run ──────────────────────────────────────────────────────────────────────
for (const locale of LOCALES) {
  const posts = store(locale, "blog_posts");
  const products = store(locale, "products");
  for (const p of cache.posts) {
    const d = posts[p.id]?.data;
    if (!d) continue;
    const where = `post/${p.slug}`;
    const content = String(d.content ?? "");
    orthography(locale, where, `${d.title} ${d.excerpt} ${content}`);
    leakage(locale, where, content);
    arabicArticleWords(locale, where, `${d.title} ${d.excerpt} ${content}`);
    claims(locale, where, `${p.title} ${p.excerpt} ${p.content}`, `${d.title} ${d.excerpt} ${content}`);
    numberDrift(locale, where, p.content, content);
  }
  for (const p of cache.products) {
    const d = products[p.id]?.data;
    if (!d) continue;
    const where = `product/${p.slug}`;
    const flatT = JSON.stringify(d);
    const flatS = JSON.stringify({ n: p.name, d: p.description, s: p.specifications });
    // Only the translated VALUES: labelled spec keys are Arabic by design (they
    // key back to the Arabic source row), and must not count as bad orthography.
    orthography(locale, where, orthographyTextOf(d));
    leakage(locale, where, String(d.description ?? ""));
    arabicArticleWords(locale, where, orthographyTextOf(d));
    claims(locale, where, flatS, `${d.name} ${d.description} ${JSON.stringify(d.specifications ?? {})}`);
  }
}

// ── report ───────────────────────────────────────────────────────────────────
const bySeverity = { high: 0, medium: 0, low: 0 };
for (const f of findings) bySeverity[f.severity]++;
const byAudit: Record<string, number> = {};
for (const f of findings) byAudit[`${f.audit}/${f.locale}`] = (byAudit[`${f.audit}/${f.locale}`] ?? 0) + 1;

const md: string[] = [
  `# Pass-2 content audit (${new Date().toISOString().slice(0, 16).replace("T", " ")})`,
  ``,
  `Findings: ${findings.length} (high ${bySeverity.high}, medium ${bySeverity.medium}, low ${bySeverity.low})`,
  ``,
  `| audit | count |`,
  `|---|---|`,
  ...Object.entries(byAudit).sort().map(([k, v]) => `| ${k} | ${v} |`),
  ``,
  `## High-risk articles (score >= 12): ${HIGH_RISK.length} of ${cache.posts.length}`,
  ``,
  `| article | score | topics |`,
  `|---|---|---|`,
  ...HIGH_RISK.map((a) => `| ${a.slug} | ${a.score} | ${a.topics.join(", ")} |`),
  ``,
  `## Findings`,
  ``,
];
for (const sev of ["high", "medium", "low"] as const) {
  const list = findings.filter((f) => f.severity === sev);
  if (!list.length) continue;
  md.push(`### ${sev} (${list.length})`, ``);
  for (const f of list.slice(0, 120)) md.push(`- **[${f.locale}] ${f.where}** — ${f.audit}: ${f.detail}`);
  if (list.length > 120) md.push(`- … ${list.length - 120} more in the JSON report`);
  md.push(``);
}
mkdirSync(resolve("reports/i18n"), { recursive: true });
writeFileSync(resolve("reports/i18n/content-audit.md"), md.join("\n") + "\n");
writeFileSync(resolve("reports/i18n/content-audit.json"), JSON.stringify({ generatedAt: new Date().toISOString(), highRisk: HIGH_RISK, articleRisk, findings }, null, 2));
console.log(`findings: ${findings.length} (high ${bySeverity.high}, medium ${bySeverity.medium}, low ${bySeverity.low})`);
for (const [k, v] of Object.entries(byAudit).sort()) console.log(`  ${k}: ${v}`);
console.log(`high-risk articles: ${HIGH_RISK.length} of ${cache.posts.length}`);
