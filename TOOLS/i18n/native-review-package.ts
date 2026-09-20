/**
 * Native-review package: the decisions a Sorani speaker has to make before the
 * Kurdish locale can be released, and nothing else.
 *
 * Everything a machine can decide has already been decided: the validator is at
 * 0 errors, structure and links are verified against the Arabic source, and the
 * BiDi and search defects are fixed in code. What is left is language judgement,
 * and this file is the only artefact a reviewer should have to read.
 *
 * It deliberately does NOT dump strings. Each entry is one decision, with the
 * Arabic source, the Sorani currently shipped, the alternative on the table, a
 * real context, how often it occurs, and a recommendation the reviewer can
 * accept or overrule with one word.
 *
 * Usage:  node --import tsx TOOLS/i18n/native-review-package.ts
 * Output: reports/i18n/native-review-package.md
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadGlossary } from "./_llm.js";

const NAMESPACES = ["common", "nav", "home", "products", "product", "cart", "checkout", "account", "orders", "search", "errors", "pages", "seo", "tools", "guides"];
const MIN_MISSES = Number(process.env.MIN_MISSES ?? 3);
const CONTEXTS = 2;

function flatten(obj: Record<string, unknown>, prefix = "", out: Record<string, string> = {}): Record<string, string> {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") flatten(v as Record<string, unknown>, key, out);
    else out[key] = String(v);
  }
  return out;
}

const readJson = <T,>(p: string): T => JSON.parse(readFileSync(resolve(p), "utf8")) as T;
const clip = (s: string, n = 150) => {
  const flat = s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return flat.length > n ? `${flat.slice(0, n)}…` : flat;
};
/** Markdown table cells must not contain a bare pipe or a line break. */
const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");

// ── Aligned Arabic/Sorani pairs ──────────────────────────────────────────────
interface Pair { src: string; tgt: string; where: string; scope: "ui" | "content" }
const pairs: Pair[] = [];

for (const ns of NAMESPACES) {
  const arPath = `client/src/locales/ar/${ns}.json`;
  const ckbPath = `client/src/locales/ckb/${ns}.json`;
  if (!existsSync(resolve(arPath)) || !existsSync(resolve(ckbPath))) continue;
  const ar = flatten(readJson<Record<string, unknown>>(arPath));
  const ckb = flatten(readJson<Record<string, unknown>>(ckbPath));
  for (const [k, v] of Object.entries(ar)) if (ckb[k]) pairs.push({ src: v, tgt: ckb[k], where: `${ns}:${k}`, scope: "ui" });
}

interface SourceProduct { id: string; slug: string; name: string; subcategory?: string; description?: string }
interface SourcePost { id: string; slug: string; title: string; content?: string; excerpt?: string }
interface Cache { fetchedAt?: string; products: SourceProduct[]; posts: SourcePost[] }
const cache = existsSync(resolve("reports/i18n/source-cache.json"))
  ? readJson<Cache>("reports/i18n/source-cache.json")
  : { products: [], posts: [] };

interface Translated<T> { slug?: string; data?: T }
const ckbProducts = existsSync(resolve("data/i18n/translations/ckb/products.json"))
  ? readJson<Record<string, Translated<{ name?: string; description?: string; subcategory?: string }>>>("data/i18n/translations/ckb/products.json")
  : {};
const ckbPosts = existsSync(resolve("data/i18n/translations/ckb/blog_posts.json"))
  ? readJson<Record<string, Translated<{ title?: string; content?: string }>>>("data/i18n/translations/ckb/blog_posts.json")
  : {};

for (const p of cache.products) {
  const t = ckbProducts[p.id]?.data;
  if (!t) continue;
  if (p.name && t.name) pairs.push({ src: p.name, tgt: t.name, where: `product/${p.slug}#name`, scope: "content" });
  if (p.description && t.description) pairs.push({ src: p.description, tgt: t.description, where: `product/${p.slug}#description`, scope: "content" });
}
for (const post of cache.posts) {
  const t = ckbPosts[post.id]?.data;
  if (!t) continue;
  if (post.title && t.title) pairs.push({ src: post.title, tgt: t.title, where: `post/${post.slug}#title`, scope: "content" });
  if (post.content && t.content) pairs.push({ src: post.content, tgt: t.content, where: `post/${post.slug}#content`, scope: "content" });
}

// ── Glossary concepts: where the preferred Sorani term is missing ────────────
const glossary = loadGlossary();

/**
 * Does the Arabic source really use this term?
 *
 * Stricter than the validator's rule on purpose. The validator allows any clitic
 * in front of a term and any suffix behind it, which is right for a warning but
 * wrong for a review sheet: it reads فلتر ("filter") as ف + لتر ("litre"), السمة
 * ("theme") as ال + سم ("cm"), and دفعة ("in one go") as دفع ("payment"), and a
 * reviewer then gets hundreds of phantom decisions. Here a short term must be a
 * whole word, and only a term long enough to be unambiguous may carry affixes.
 */
const AFFIXABLE = 4;
function containsArabicTerm(haystack: string, term: string): boolean {
  // A multi-word term is long and specific enough that a substring test is safe.
  if (/\s/.test(term)) return haystack.includes(term);
  const forms = [term, `ال${term}`];
  if (term.length >= AFFIXABLE) for (const p of ["و", "ب", "ل", "ف", "ك", "وال", "بال", "لل"]) forms.push(`${p}${term}`);
  for (const token of haystack.split(/[^\p{Script=Arabic}]+/u)) {
    if (!token) continue;
    if (forms.includes(token)) return true;
    if (term.length >= AFFIXABLE && forms.some((f) => token.startsWith(f))) return true;
  }
  return false;
}

interface Concept {
  id: string;
  ar: string;
  preferred: string;
  alts: string[];
  hits: number;
  misses: Pair[];
  needsNativeReview: boolean;
}

const concepts: Concept[] = [];
for (const term of glossary.terms) {
  const wanted = [term.ckb, ...(term.ckbAlt ?? [])];
  let hits = 0;
  const misses: Pair[] = [];
  for (const pair of pairs) {
    if (!term.ar.some((a: string) => containsArabicTerm(pair.src, a))) continue;
    if (wanted.some((w: string) => pair.tgt.includes(w))) hits += 1;
    else misses.push(pair);
  }
  concepts.push({
    id: term.id,
    ar: term.ar[0],
    preferred: term.ckb,
    alts: term.ckbAlt ?? [],
    hits,
    misses,
    needsNativeReview: Boolean(term.needsNativeReview),
  });
}

/**
 * The recommendation, and it is only a recommendation.
 *
 * A term used consistently with a handful of stragglers is a consistency fix —
 * the reviewer only confirms the term. A term the corpus ignores more often than
 * it uses is the opposite situation: the model kept reaching for another word,
 * and that word may well be the idiomatic one.
 */
function recommend(c: Concept): string {
  const total = c.hits + c.misses.length;
  if (total === 0) return "unused — drop from the glossary";
  const missRate = c.misses.length / total;
  if (missRate <= 0.2) return `keep **${c.preferred}**, align the ${c.misses.length} stragglers`;
  if (missRate >= 0.5) return `**decide**: the corpus prefers another form ${c.misses.length}/${total} of the time`;
  return `confirm **${c.preferred}** is idiomatic, then align ${c.misses.length}`;
}

// ── Kurdish subcategories ────────────────────────────────────────────────────
const subcategoryGroups = new Map<string, Map<string, string[]>>();
for (const p of cache.products) {
  const t = ckbProducts[p.id]?.data;
  if (!p.subcategory || !t?.subcategory) continue;
  const byAr = subcategoryGroups.get(p.subcategory) ?? new Map<string, string[]>();
  byAr.set(t.subcategory, [...(byAr.get(t.subcategory) ?? []), p.slug]);
  subcategoryGroups.set(p.subcategory, byAr);
}
const splitSubcategories = [...subcategoryGroups.entries()].filter(([, forms]) => forms.size > 1);

// ── Arabic words left in the Kurdish text ────────────────────────────────────
/**
 * Hand-verified, not detected: the register's list re-checked one by one against
 * the current corpus. `status` records what the check found, so a reviewer is not
 * asked to rule on something already settled.
 */
const ARABIC_WORDS = [
  { word: "تدریج / تدریجی", meaning: "gradually", status: "untranslated Arabic", occurrences: "guides:guides-new-aquarium-setup.s91 and .s105; posts nitrogen-cycle-simple-arabic-explained (2), cloudy-water-fix, aquarium-safe-rocks-and-wood", note: "the corpus renders this concept 8 different ways elsewhere — see the vocabulary table below, one decision fixes all of them" },
  { word: "حراشف", meaning: "scales (of a fish)", status: "untranslated Arabic", occurrences: "1 block, post/fish-eye-problems", note: "the only rendering of the concept anywhere in the Kurdish corpus, so there is no internal precedent to copy" },
  { word: "قاعیدی", meaning: "alkaline / basic (chemistry)", status: "possible legitimate loan", occurrences: "posts ammonia-spike-emergency-treatment, aquarium-safe-rocks-and-wood", note: "Kurdish chemistry writing uses both the Arabic loan and native forms; a native reader has to say which AQUAVO should use" },
  { word: "حاسبات", meaning: "calculators", status: "FIXED — no decision needed", occurrences: "was 1 link label in post/how-to-treat-tap-water-for-fish-iraq", note: "replaced with ژمێرەرەکان, the term the Kurdish UI already uses for that same page (tools:calculators.s1)" },
  { word: "الإسالة", meaning: "tap (water)", status: "FALSE POSITIVE — no decision needed", occurrences: "guides:guides-water-test-guide.s16", note: "the word is in the ARABIC source string; the Kurdish correctly says ئاوی لولە" },
  { word: "الولودة", meaning: "livebearers", status: "NOT PRESENT — no decision needed", occurrences: "—", note: "not found anywhere in the current Kurdish corpus" },
];

/** UI sections rewritten by a model in pass 3. Model-assisted is not native review. */
const REWRITTEN_SECTIONS = [
  { section: "pages:terms", what: "terms and conditions" },
  { section: "pages:shipping", what: "shipping and delivery policy" },
  { section: "account:profile-loyalty", what: "loyalty tiers and points" },
  { section: "orders:invoice-view", what: "the invoice a customer prints" },
];

// ── Render ───────────────────────────────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10);
const decided = concepts.filter((c) => c.misses.length >= MIN_MISSES).sort((a, b) => b.misses.length - a.misses.length);
const out: string[] = [];

out.push(`# Kurdish (Sorani) native-review package — ${today}`);
out.push("");
out.push("Everything in this file is a **language decision**, not a bug. The deterministic work is done: validator 0 errors, structure and links verified against the Arabic source, RTL numeric ranges fixed in the rendering layer, search reachable from an Arabic keyboard.");
out.push("");
out.push("Nothing here was decided by a model. Where a recommendation appears it is derived from what the corpus already does, and a native reader may overrule any of it with one word.");
out.push("");
out.push("**How to use this file:** work top to bottom. Section 1 is 4 UI sections to read end to end — everything else is a single word-choice each. Write your decision in the last column.");
out.push("");
out.push(`| section | decisions | what it costs you |`);
out.push(`|---|---|---|`);
out.push(`| 1. Rewritten UI sections | ${REWRITTEN_SECTIONS.length} | read 4 short pages |`);
out.push(`| 2. Arabic words left in Kurdish | ${ARABIC_WORDS.filter((w) => !w.status.includes("no decision")).length} | 3 word choices |`);
out.push(`| 3. Competing renderings | ${decided.length} | 1 word choice each |`);
out.push(`| 4. Glossary terms to confirm | ${concepts.filter((c) => c.needsNativeReview).length} | yes/no each |`);
out.push(`| 5. Split subcategories | ${splitSubcategories.length} | pick one label each |`);
out.push("");

out.push("## 1. UI sections rewritten by a model (read in full)");
out.push("");
out.push("These four were rewritten in pass 3 because the machine translation was wrong, not merely awkward. The rewrite is **model-assisted and unreviewed** — it is the single highest-risk thing in the Kurdish locale, because a customer reads these as the shop's own words.");
out.push("");
out.push("| section | what it is | where to read it |");
out.push("|---|---|---|");
for (const s of REWRITTEN_SECTIONS) {
  const [ns, key] = s.section.split(":");
  out.push(`| \`${s.section}\` | ${s.what} | \`client/src/locales/ckb/${ns}.json\` → \`${key}\` (Arabic source in \`client/src/locales/ar/${ns}.json\`) |`);
}
out.push("");

out.push("## 2. Arabic words still inside the Kurdish text");
out.push("");
out.push("| word | means | status | where | note |");
out.push("|---|---|---|---|---|");
for (const w of ARABIC_WORDS) {
  out.push(`| ${w.word} | ${w.meaning} | ${w.status} | ${cell(w.occurrences)} | ${cell(w.note)} |`);
}
out.push("");

out.push("## 3. Competing renderings — one decision each");
out.push("");
out.push(`Concepts where the Arabic source uses a glossary term but the Kurdish does not use the glossary's Sorani form. "Uses" counts strings that do use it; "misses" counts strings that reach for something else. Only concepts with ${MIN_MISSES}+ misses are listed — the rest are noise.`);
out.push("");
for (const c of decided) {
  out.push(`### \`${c.id}\` — ${c.ar}`);
  out.push("");
  out.push(`- glossary's Sorani: **${c.preferred}**${c.alts.length ? ` (also accepted: ${c.alts.join(", ")})` : ""}`);
  out.push(`- frequency: used ${c.hits}×, something else used ${c.misses.length}×`);
  out.push(`- recommendation: ${recommend(c)}`);
  out.push(`- **decision:** ␣`);
  out.push("");
  for (const m of c.misses.slice(0, CONTEXTS)) {
    out.push(`  - \`${m.where}\``);
    out.push(`    - ar : ${clip(m.src)}`);
    out.push(`    - ckb: ${clip(m.tgt)}`);
  }
  out.push("");
}

out.push("## 4. Glossary terms awaiting a native yes/no");
out.push("");
out.push("These were added to the glossary during translation and carry `needsNativeReview: true`. They are already in use across the locale, so a \"no\" is a rename everywhere, not a one-off edit.");
out.push("");
out.push("| term | Arabic | current Sorani | alternatives on the table | in use | decision |");
out.push("|---|---|---|---|---|---|");
for (const c of concepts.filter((x) => x.needsNativeReview)) {
  out.push(`| \`${c.id}\` | ${c.ar} | **${c.preferred}** | ${c.alts.length ? c.alts.join(", ") : "—"} | ${c.hits}× | ␣ |`);
}
out.push("");

out.push("## 5. Subcategories that split a filter");
out.push("");
out.push("One Arabic subcategory translated two different ways splits the shop's facet filter in Kurdish: the same shelf appears twice. The English side was normalised deterministically; Kurdish cannot be, because choosing between two Sorani forms is exactly this review.");
out.push("");
if (splitSubcategories.length === 0) {
  out.push("_None._");
} else {
  out.push("| Arabic subcategory | Sorani forms in use | products | decision |");
  out.push("|---|---|---|---|");
  for (const [ar, forms] of splitSubcategories) {
    const list = [...forms.entries()].map(([form, slugs]) => `**${form}** (${slugs.length})`).join(" vs ");
    const slugs = [...forms.values()].flat();
    out.push(`| ${ar} | ${list} | ${slugs.length} | ␣ |`);
  }
}
out.push("");

out.push("## 6. What this package does NOT cover");
out.push("");
out.push("- **Prose quality across the articles.** 117 articles are verified structurally and factually against the Arabic source in both locales. Linguistic prose review has reached roughly 35 of them, all of it model-assisted. The other 82 are *not* reviewed for how they read, and no run should claim otherwise.");
out.push("- **`activated-carbon-aquarium-when-to-use`.** The Arabic source contradicts itself about ammonia. The Kurdish and English follow the Arabic faithfully, which is correct: the Arabic needs an editorial decision first, and the translations follow it afterwards.");
out.push("- **Anything a model could have guessed.** No term in this file was picked by a model. That is the point of the file.");
out.push("");

mkdirSync(resolve("reports/i18n"), { recursive: true });
writeFileSync(resolve("reports/i18n/native-review-package.md"), `${out.join("\n")}\n`, "utf8");
console.log(`native-review-package.md written: ${decided.length} competing renderings, ${concepts.filter((c) => c.needsNativeReview).length} glossary confirmations, ${splitSubcategories.length} split subcategories, ${pairs.length} aligned pairs scanned`);
