/**
 * Glossary review aid: for every glossary concept, find the Arabic source
 * strings that contain the term, look at the Kurdish translations, and report
 * which Sorani form was actually used where the preferred term is absent.
 *
 * Candidate alternatives are surfaced statistically: tokens that are frequent
 * in the "miss" set of a concept but rare across the whole Kurdish corpus are
 * almost always the competing rendering of that concept. Nothing is changed
 * automatically; the output is a review table for a person to decide on.
 *
 * Usage: node --import tsx TOOLS/i18n/glossary-review.ts [--min=3] [--samples=3]
 * Output: reports/i18n/glossary-review.md
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadGlossary } from "./_llm.js";

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")).map(([k, v]) => [k, v ?? "true"]));
const MIN = Number(args.min ?? 3);
const SAMPLES = Number(args.samples ?? 3);

const NAMESPACES = ["common", "nav", "home", "products", "product", "cart", "checkout", "account", "orders", "search", "errors", "pages", "seo", "tools", "guides"];
function flatten(obj: Record<string, unknown>, prefix = "", out: Record<string, string> = {}): Record<string, string> {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") flatten(v as Record<string, unknown>, key, out);
    else out[key] = String(v);
  }
  return out;
}

/** (arabic source, kurdish target, where) for every translated string in the project. */
const pairs: Array<{ src: string; tgt: string; where: string; scope: "ui" | "content" }> = [];
for (const ns of NAMESPACES) {
  const arPath = resolve("client/src/locales/ar", `${ns}.json`);
  const ckbPath = resolve("client/src/locales/ckb", `${ns}.json`);
  if (!existsSync(arPath) || !existsSync(ckbPath)) continue;
  const ar = flatten(JSON.parse(readFileSync(arPath, "utf8")));
  const ckb = flatten(JSON.parse(readFileSync(ckbPath, "utf8")));
  for (const [k, v] of Object.entries(ar)) if (ckb[k]) pairs.push({ src: v, tgt: ckb[k], where: `${ns}:${k}`, scope: "ui" });
}

interface Cache { products: Array<Record<string, unknown> & { id: string; slug: string }>; posts: Array<Record<string, unknown> & { id: string; slug: string }>; blogCategories: Array<Record<string, unknown> & { id: string; slug: string }> }
const cachePath = resolve("reports/i18n/source-cache.json");
if (existsSync(cachePath)) {
  const cache = JSON.parse(readFileSync(cachePath, "utf8")) as Cache;
  const store = (f: string) => {
    const p = resolve("data/i18n/translations/ckb", `${f}.json`);
    return existsSync(p) ? (JSON.parse(readFileSync(p, "utf8")) as Record<string, { data: Record<string, unknown> }>) : {};
  };
  const products = store("products");
  const posts = store("blog_posts");
  const cats = store("blog_categories");
  const strip = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  for (const p of cache.products) {
    const d = products[p.id]?.data;
    if (!d) continue;
    const specs = (p.specifications ?? {}) as Record<string, unknown>;
    const ts = (d.specifications ?? {}) as Record<string, unknown>;
    pairs.push({ src: String(p.name), tgt: String(d.name ?? ""), where: `product/${p.slug}#name`, scope: "content" });
    pairs.push({ src: String(p.description), tgt: String(d.description ?? ""), where: `product/${p.slug}#description`, scope: "content" });
    for (const key of ["benefits", "usageInstructions", "safetyWarnings"]) {
      const a = (specs[key] ?? []) as string[];
      const b = (ts[key] ?? []) as string[];
      a.forEach((s, i) => { if (b[i]) pairs.push({ src: s, tgt: b[i], where: `product/${p.slug}#${key}[${i}]`, scope: "content" }); });
    }
  }
  for (const post of cache.posts) {
    const d = posts[post.id]?.data;
    if (!d) continue;
    pairs.push({ src: String(post.title), tgt: String(d.title ?? ""), where: `post/${post.slug}#title`, scope: "content" });
    pairs.push({ src: strip(String(post.content)), tgt: strip(String(d.content ?? "")), where: `post/${post.slug}#content`, scope: "content" });
  }
  for (const c of cache.blogCategories) {
    const d = cats[c.id]?.data;
    if (d) pairs.push({ src: String(c.name), tgt: String(d.name ?? ""), where: `blogcat/${c.slug}#name`, scope: "content" });
  }
}

// ── token statistics over the whole Kurdish corpus ───────────────────────────
const STOP = new Set(["لە", "و", "بۆ", "بە", "لەگەڵ", "کە", "ئەم", "ئەو", "دەبێت", "دەکات", "هەیە", "نییە", "یان", "تا", "بێت", "ئەگەر", "هەر", "زۆر", "یەک", "دوو", "بکە", "دەکرێت", "کاتێک", "پێش", "دوای", "ناو", "سەر", "بێ", "چ", "کاتی", "لەسەر", "دەتوانیت", "بەکاربهێنە", "دەبن", "ئەمە", "بەڵام", "هەروەها"]);
const tokensOf = (s: string) => (s.match(/[\p{Script=Arabic}]+/gu) ?? []).filter((t) => t.length > 2 && !STOP.has(t));
const globalCount = new Map<string, number>();
for (const p of pairs) for (const t of tokensOf(p.tgt)) globalCount.set(t, (globalCount.get(t) ?? 0) + 1);

/** Word boundary for Arabic terms: only the article and single-letter clitics may precede. */
const CLITICS = new Set(["و", "ال", "وال", "بال", "فال", "كال", "لل", "ولل", "بالل"]);
function containsTerm(text: string, term: string): boolean {
  let i = text.indexOf(term);
  while (i >= 0) {
    const after = text[i + term.length] ?? "";
    if (!/\p{Script=Arabic}/u.test(after)) {
      let start = i;
      while (start > 0 && /\p{Script=Arabic}/u.test(text[start - 1])) start--;
      const prefix = text.slice(start, i);
      if (prefix === "" || CLITICS.has(prefix)) return true;
    }
    i = text.indexOf(term, i + 1);
  }
  return false;
}

const glossary = loadGlossary();
interface Row {
  id: string;
  ar: string;
  preferred: string;
  alts: string[];
  hits: number;
  misses: number;
  candidates: Array<{ token: string; inMiss: number; global: number }>;
  samples: Array<{ where: string; src: string; tgt: string }>;
}
const rows: Row[] = [];
for (const term of glossary.terms) {
  const wanted = [term.ckb, ...(term.ckbAlt ?? [])];
  let hits = 0;
  const misses: typeof pairs = [];
  for (const p of pairs) {
    if (!p.src || !p.tgt) continue;
    if (!term.ar.some((a) => containsTerm(p.src, a))) continue;
    if (wanted.some((w) => p.tgt.includes(w))) hits++;
    else misses.push(p);
  }
  if (misses.length < MIN) continue;
  const missCount = new Map<string, number>();
  for (const m of misses) for (const t of new Set(tokensOf(m.tgt))) missCount.set(t, (missCount.get(t) ?? 0) + 1);
  const candidates = [...missCount.entries()]
    // frequent inside the miss set, rare elsewhere: that is the competing rendering
    .map(([token, inMiss]) => ({ token, inMiss, global: globalCount.get(token) ?? 0, score: inMiss / Math.sqrt(globalCount.get(token) ?? 1) }))
    .filter((c) => c.inMiss >= Math.max(2, misses.length * 0.15))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(({ token, inMiss, global }) => ({ token, inMiss, global }));
  rows.push({
    id: term.id,
    ar: term.ar[0],
    preferred: term.ckb,
    alts: term.ckbAlt ?? [],
    hits,
    misses: misses.length,
    candidates,
    samples: misses.slice(0, SAMPLES).map((m) => ({ where: m.where, src: m.src.slice(0, 110), tgt: m.tgt.slice(0, 150) })),
  });
}
rows.sort((a, b) => b.misses - a.misses);

const md: string[] = [
  `# Kurdish glossary review (${new Date().toISOString().slice(0, 10)})`,
  ``,
  `Concepts whose Arabic term appears in a source string while the preferred Sorani form is absent from the translation. "Candidates" are tokens frequent in those translations and rare elsewhere, i.e. the form the model actually used. Decide per concept: keep the preferred term, adopt the alternative, or accept both (add to \`ckbAlt\`).`,
  ``,
  `| concept | Arabic | preferred Sorani | accepted alts | used preferred | used something else | candidate forms (in-miss / corpus) |`,
  `|---|---|---|---|---|---|---|`,
];
for (const r of rows) {
  md.push(`| \`${r.id}\` | ${r.ar} | ${r.preferred} | ${r.alts.join(", ") || "—"} | ${r.hits} | ${r.misses} | ${r.candidates.map((c) => `${c.token} (${c.inMiss}/${c.global})`).join(", ") || "—"} |`);
}
md.push(``, `## Samples`, ``);
for (const r of rows) {
  md.push(`### \`${r.id}\` — ${r.ar} → ${r.preferred} (${r.misses} misses)`, ``);
  for (const s of r.samples) md.push(`- **${s.where}**`, `  - ar: ${s.src}`, `  - ckb: ${s.tgt}`);
  md.push(``);
}
mkdirSync(resolve("reports/i18n"), { recursive: true });
writeFileSync(resolve("reports/i18n/glossary-review.md"), md.join("\n") + "\n");
console.log(`pairs analysed: ${pairs.length}; concepts with >= ${MIN} misses: ${rows.length}`);
for (const r of rows.slice(0, 40)) console.log(`${r.id.padEnd(22)} pref=${r.preferred.padEnd(22)} hits=${String(r.hits).padStart(4)} miss=${String(r.misses).padStart(4)}  ${r.candidates.map((c) => `${c.token}(${c.inMiss}/${c.global})`).join(" ")}`);
