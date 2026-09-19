/**
 * Translation validator: UI bundles + content stores, against the Arabic source.
 *
 * Errors (block "complete", pruned with --prune so the pipeline regenerates them):
 *   empty            value missing / blank
 *   placeholder      {{vars}} or <tags> differ from the source
 *   arabic-leak      Arabic script inside an English value
 *   source-copy      target identical to the Arabic source
 *   arabic-letters   ckb value written with Arabic-only letters (ة ي ك) and no Sorani letters
 *   english-copy     ckb value identical to the English value
 *   unicode          U+FFFD, lone surrogates, control chars, bidi overrides (U+202A..U+202E, U+2066..U+2069)
 *   tech-token       a number / unit / chemical symbol / model code from the source is absent in the target
 *   incomplete       content record lacks a required field (shared/i18n/content.ts rules)
 *   html-structure   blog body has a different count of headings / list items / tables / images
 * Warnings (reported, not pruned):
 *   punctuation      doubled punctuation, stray spaces
 *   glossary         a glossary concept in the source is rendered with a different Sorani term
 *   latin-heavy      ckb value is mostly Latin letters although the source is Arabic prose
 *   small-number     "1" / "2" from the source not found (often written as a word in English)
 *
 * Usage: node --import tsx TOOLS/i18n/validate-translations.ts [--scope=ui|content|all] [--locale=en|ckb] [--prune] [--strict] [--refresh-source]
 * Output: reports/i18n/validation-report.{json,md}
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  blogCategorySourceFields,
  blogPostSourceFields,
  productSourceFields,
  translationCompleteness,
  type TranslatableEntityType,
} from "../../shared/i18n/content.js";
import { loadGlossary, normalizeDigits } from "./_llm.js";

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")).map(([k, v]) => [k, v ?? "true"]));
const SCOPE = String(args.scope || "all");
const LOCALES = (args.locale ? [String(args.locale)] : ["en", "ckb"]) as Array<"en" | "ckb">;
const PRUNE = args.prune === "true";
const STRICT = args.strict === "true";
const REFRESH = args["refresh-source"] === "true";
const BASE = process.env.AQUAVO_SOURCE_BASE || "https://www.aquavoiq.com";
const LOCALE_DIR = resolve("client/src/locales");
const CONTENT_DIR = resolve(process.env.AQUAVO_TRANSLATIONS_DIR || "data/i18n/translations");
const REPORT_DIR = resolve("reports/i18n");
const SOURCE_CACHE = resolve(REPORT_DIR, "source-cache.json");

type Severity = "error" | "warning";
interface Finding { scope: "ui" | "content"; locale: string; where: string; code: string; severity: Severity; detail: string }
const findings: Finding[] = [];
const add = (f: Finding) => findings.push(f);

// ── helpers ──────────────────────────────────────────────────────────────────
const ARABIC = /\p{Script=Arabic}/u;
const SORANI_LETTERS = /[ەێۆڕڵ]/;
const ARABIC_ONLY_LETTERS = /[ةيكثذضظ]/;
const BAD_UNICODE = /[�\u0000-\u0008\u000B\u000C\u000E-\u001F‪-‮⁦-⁩]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;
const CHEM = /\b(pH|GH|KH|TDS|NH3|NH4|NO2|NO3|CO2|O2|PO4|dKH|dGH)\b/g;
const MODEL = /\b[A-Z]{1,6}-?\d{2,5}[A-Z0-9-]*\b/g;

function placeholders(s: string): string {
  return (s.match(/\{\{[^}]+\}\}|<\/?[a-zA-Z][a-zA-Z0-9]*(?:\s[^>]*)?>/g) ?? [])
    .map((t) => t.replace(/\s.*$/, "").replace(/>$/, ""))
    .sort()
    .join("|");
}
/** Numbers with thousands separators collapsed ("5,000" == "5000"; "1.5" stays). */
function numbers(s: string): string[] {
  const clean = normalizeDigits(s).replace(/<[^>]+>/g, " ").replace(/(\d),(?=\d{3}\b)/g, "$1");
  return clean.match(/\d+(?:\.\d+)?/g) ?? [];
}
function techTokens(s: string): { nums: string[]; chem: string[]; models: string[] } {
  const clean = normalizeDigits(s).replace(/<[^>]+>/g, " ");
  return { nums: numbers(clean), chem: clean.match(CHEM) ?? [], models: clean.match(MODEL) ?? [] };
}
function multisetMissing(src: string[], tgt: string[]): string[] {
  const pool = [...tgt];
  const missing: string[] = [];
  for (const t of src) {
    const i = pool.indexOf(t);
    if (i >= 0) pool.splice(i, 1);
    else missing.push(t);
  }
  return missing;
}
const glossary = loadGlossary();

/** Validate one target string against its Arabic source. Returns codes it added. */
function checkString(scope: "ui" | "content", locale: "en" | "ckb", where: string, src: string, tgt: unknown, enValue?: string): void {
  if (typeof tgt !== "string" || !tgt.trim()) { add({ scope, locale, where, code: "empty", severity: "error", detail: "" }); return; }
  const t = tgt;
  if (placeholders(src) !== placeholders(t)) add({ scope, locale, where, code: "placeholder", severity: "error", detail: `${placeholders(src)} vs ${placeholders(t)}` });
  if (BAD_UNICODE.test(t)) add({ scope, locale, where, code: "unicode", severity: "error", detail: "control / replacement / bidi-override character" });
  const srcHasArabic = ARABIC.test(src.replace(/\{\{[^}]+\}\}/g, ""));
  if (srcHasArabic && t.trim() === src.trim()) add({ scope, locale, where, code: "source-copy", severity: "error", detail: t.slice(0, 60) });
  if (locale === "en") {
    const stripped = t.replace(/د\.ع/g, "");
    if (ARABIC.test(stripped)) add({ scope, locale, where, code: "arabic-leak", severity: "error", detail: t.slice(0, 80) });
  } else {
    const letters = t.replace(/\{\{[^}]+\}\}|<[^>]+>|[A-Z]{2,}[- ]?\d[A-Z0-9-]*|https?:\S+/g, "");
    if (ARABIC_ONLY_LETTERS.test(letters) && !SORANI_LETTERS.test(letters) && srcHasArabic) {
      add({ scope, locale, where, code: "arabic-letters", severity: "error", detail: t.slice(0, 80) });
    }
    if (enValue && t.trim() === enValue.trim() && srcHasArabic) add({ scope, locale, where, code: "english-copy", severity: "error", detail: t.slice(0, 60) });
    const latin = (letters.match(/[A-Za-z]/g) ?? []).length;
    const arab = (letters.match(/\p{Script=Arabic}/gu) ?? []).length;
    if (srcHasArabic && latin > 12 && latin > arab * 1.5) add({ scope, locale, where, code: "latin-heavy", severity: "warning", detail: t.slice(0, 80) });
    // glossary consistency (warning): concept present in the source, Sorani term absent in the target
    for (const term of glossary.terms) {
      if (!term.ar.some((a) => src.includes(a))) continue;
      const wanted = [term.ckb, ...(term.ckbAlt ?? [])];
      if (!wanted.some((w) => t.includes(w))) add({ scope, locale, where, code: "glossary", severity: "warning", detail: `${term.id}: expected "${term.ckb}"` });
    }
  }
  // technical tokens
  const a = techTokens(src);
  const b = techTokens(t);
  const missNums = multisetMissing(a.nums, b.nums);
  // Small counts are often written as words ("four digits"); larger values, decimals and measurements must survive verbatim.
  const isSmall = (n: string) => /^\d+$/.test(n) && Number(n) <= 10;
  const hard = missNums.filter((n) => !isSmall(n));
  const soft = missNums.filter(isSmall);
  if (hard.length) add({ scope, locale, where, code: "tech-token", severity: "error", detail: `numbers missing: ${hard.join(", ")}` });
  if (soft.length) add({ scope, locale, where, code: "small-number", severity: "warning", detail: `numbers missing: ${soft.join(", ")}` });
  const missChem = multisetMissing(a.chem, b.chem);
  if (missChem.length) add({ scope, locale, where, code: "tech-token", severity: "error", detail: `symbols missing: ${missChem.join(", ")}` });
  const missModels = multisetMissing(a.models, b.models);
  if (missModels.length) add({ scope, locale, where, code: "tech-token", severity: "error", detail: `model codes missing: ${missModels.join(", ")}` });
  // punctuation
  const edgeSpaceDiffers = /^\s/.test(t) !== /^\s/.test(src) || /\s$/.test(t) !== /\s$/.test(src);
  const doubled = /[?!؟]{2,}|,,|\s[,،]|  +/.test(t) || (/\.{2,}/.test(t) && !/\.{2,}|…/.test(src));
  if (doubled || edgeSpaceDiffers) add({ scope, locale, where, code: "punctuation", severity: "warning", detail: t.slice(0, 60) });
}

// ── UI bundles ───────────────────────────────────────────────────────────────
function flatten(obj: Record<string, unknown>, prefix = "", out: Record<string, string> = {}): Record<string, string> {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") flatten(v as Record<string, unknown>, key, out);
    else out[key] = String(v);
  }
  return out;
}
function deleteDeep(obj: Record<string, unknown>, key: string) {
  const parts = key.split(".");
  let cur: Record<string, unknown> | undefined = obj;
  for (const p of parts.slice(0, -1)) cur = cur?.[p] as Record<string, unknown> | undefined;
  if (cur) delete cur[parts[parts.length - 1]];
}
const NAMESPACES = ["common", "nav", "home", "products", "product", "cart", "checkout", "account", "orders", "search", "errors", "pages", "seo", "tools", "guides"];
const uiStats: Record<string, { total: number; present: number }> = {};

function validateUi() {
  for (const locale of LOCALES) {
    uiStats[locale] = { total: 0, present: 0 };
    const pruned: string[] = [];
    for (const ns of NAMESPACES) {
      const arPath = resolve(LOCALE_DIR, "ar", `${ns}.json`);
      if (!existsSync(arPath)) continue;
      const ar = flatten(JSON.parse(readFileSync(arPath, "utf8")));
      const tgtPath = resolve(LOCALE_DIR, locale, `${ns}.json`);
      const tgtObj = existsSync(tgtPath) ? (JSON.parse(readFileSync(tgtPath, "utf8")) as Record<string, unknown>) : {};
      const tgt = flatten(tgtObj);
      const enPath = resolve(LOCALE_DIR, "en", `${ns}.json`);
      const en = locale === "ckb" && existsSync(enPath) ? flatten(JSON.parse(readFileSync(enPath, "utf8"))) : {};
      for (const [k, src] of Object.entries(ar)) {
        uiStats[locale].total++;
        if (!(k in tgt)) { add({ scope: "ui", locale, where: `${ns}:${k}`, code: "missing", severity: "error", detail: "" }); continue; }
        uiStats[locale].present++;
        const before = findings.length;
        checkString("ui", locale, `${ns}:${k}`, src, tgt[k], en[k]);
        if (PRUNE && findings.slice(before).some((f) => f.severity === "error")) { deleteDeep(tgtObj, k); pruned.push(`${ns}:${k}`); }
      }
      if (PRUNE && pruned.length) writeFileSync(tgtPath, JSON.stringify(tgtObj, null, 2) + "\n");
    }
    if (PRUNE) console.log(`${locale}: pruned ${pruned.length} UI keys for regeneration`);
  }
}

// ── Content stores ───────────────────────────────────────────────────────────
interface SourceCache {
  fetchedAt: string;
  products: Array<Record<string, unknown> & { id: string; slug: string }>;
  posts: Array<Record<string, unknown> & { id: string; slug: string }>;
  blogCategories: Array<Record<string, unknown> & { id: string; slug: string }>;
}
async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: { accept: "application/json", "x-locale": "ar" } });
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return (await res.json()) as T;
}
async function loadSource(): Promise<SourceCache> {
  if (!REFRESH && existsSync(SOURCE_CACHE)) {
    const c = JSON.parse(readFileSync(SOURCE_CACHE, "utf8")) as SourceCache;
    if (Date.now() - new Date(c.fetchedAt).getTime() < 6 * 3600_000) return c;
  }
  console.log("fetching public Arabic source (products, posts, categories)...");
  const { products } = await getJson<{ products: SourceCache["products"] }>("/api/products?limit=500");
  const list = await getJson<Array<{ slug: string }>>("/api/blog/posts?limit=1000");
  const posts: SourceCache["posts"] = [];
  for (const p of list) posts.push(await getJson(`/api/blog/posts/${encodeURIComponent(p.slug)}`));
  const blogCategories = await getJson<SourceCache["blogCategories"]>("/api/blog/categories");
  const cache = { fetchedAt: new Date().toISOString(), products, posts, blogCategories };
  mkdirSync(REPORT_DIR, { recursive: true });
  writeFileSync(SOURCE_CACHE, JSON.stringify(cache));
  return cache;
}

interface StoredEntry { entityId: string; slug?: string; sourceHash: string; data: Record<string, unknown> }
const contentStats: Record<string, { publicTotal: number; present: number; complete: number; valid: number }> = {};

function walkStrings(src: unknown, tgt: unknown, path: string, out: Array<[string, string, unknown]>) {
  if (typeof src === "string") { out.push([path, src, tgt]); return; }
  if (Array.isArray(src)) { src.forEach((v, i) => walkStrings(v, Array.isArray(tgt) ? tgt[i] : undefined, `${path}[${i}]`, out)); return; }
  if (src && typeof src === "object") for (const [k, v] of Object.entries(src)) walkStrings(v, (tgt as Record<string, unknown> | undefined)?.[k], path ? `${path}.${k}` : k, out);
}

function validateEntity(
  locale: "en" | "ckb",
  entityType: TranslatableEntityType,
  file: string,
  sources: Array<Record<string, unknown> & { id: string; slug: string }>,
  toFields: (row: never) => Record<string, unknown>,
  pairs: (fields: Record<string, unknown>, data: Record<string, unknown>) => Array<[string, string, unknown]>,
) {
  const storePath = resolve(CONTENT_DIR, locale, `${file}.json`);
  const store = existsSync(storePath) ? (JSON.parse(readFileSync(storePath, "utf8")) as Record<string, StoredEntry>) : {};
  const enStore = locale === "ckb" && existsSync(resolve(CONTENT_DIR, "en", `${file}.json`)) ? (JSON.parse(readFileSync(resolve(CONTENT_DIR, "en", `${file}.json`), "utf8")) as Record<string, StoredEntry>) : {};
  const key = `${locale}/${file}`;
  contentStats[key] = { publicTotal: sources.length, present: 0, complete: 0, valid: 0 };
  const toPrune: string[] = [];
  for (const row of sources) {
    const entry = store[row.id];
    const where = `${file}/${row.slug}`;
    if (!entry) { add({ scope: "content", locale, where, code: "missing", severity: "error", detail: "" }); continue; }
    contentStats[key].present++;
    const fields = toFields(row as never);
    const before = findings.length;
    const completeness = translationCompleteness(entityType, entry.data, fields);
    if (!completeness.complete) add({ scope: "content", locale, where, code: "incomplete", severity: "error", detail: completeness.missing.join(", ") });
    else contentStats[key].complete++;
    const enData = enStore[row.id]?.data ?? {};
    for (const [path, src, tgt] of pairs(fields, entry.data)) {
      const enFlat: Array<[string, string, unknown]> = [];
      walkStrings(fields, enData, "", enFlat);
      const enValue = enFlat.find(([p]) => p === path)?.[2];
      if (entityType === "blog_post" && path === "content") {
        // body: compare text only, structure separately
        const strip = (h: string) => h.replace(/<[^>]+>/g, " ");
        checkString("content", locale, `${where}#content`, strip(src), typeof tgt === "string" ? strip(tgt) : tgt, typeof enValue === "string" ? strip(enValue) : undefined);
        if (typeof tgt === "string") {
          const count = (h: string, re: RegExp) => (h.match(re) || []).length;
          for (const [label, re] of [["headings", /<h[1-6]\b/gi], ["list items", /<li\b/gi], ["tables", /<table\b/gi], ["images", /<img\b/gi], ["links", /<a\b/gi]] as const) {
            if (count(src, re) !== count(tgt, re)) add({ scope: "content", locale, where: `${where}#content`, code: "html-structure", severity: "error", detail: `${label}: ${count(src, re)} vs ${count(tgt, re)}` });
          }
          const srcAlts = (src.match(/alt="([^"]*)"/g) ?? []).filter((a) => ARABIC.test(a)).length;
          const tgtAlts = (tgt.match(/alt="([^"]*)"/g) ?? []).filter((a) => ARABIC.test(a)).length;
          if (locale === "en" && tgtAlts > 0) add({ scope: "content", locale, where: `${where}#content`, code: "arabic-leak", severity: "error", detail: `${tgtAlts} Arabic alt attributes` });
          if (srcAlts && locale === "ckb" && tgtAlts === 0) { /* fine: translated */ }
        }
      } else {
        checkString("content", locale, `${where}#${path}`, src, tgt, typeof enValue === "string" ? enValue : undefined);
      }
    }
    if (!findings.slice(before).some((f) => f.severity === "error")) contentStats[key].valid++;
    else if (PRUNE) toPrune.push(row.id);
  }
  if (PRUNE && toPrune.length) {
    for (const id of toPrune) delete store[id];
    writeFileSync(storePath, JSON.stringify(store, null, 2) + "\n");
    console.log(`${key}: pruned ${toPrune.length} entries for regeneration`);
  }
}

async function validateContent() {
  const src = await loadSource();
  for (const locale of LOCALES) {
    validateEntity(locale, "product", "products", src.products, productSourceFields as never, (f, d) => {
      const specs = (d.specifications ?? {}) as Record<string, unknown>;
      const out: Array<[string, string, unknown]> = [
        ["name", String(f.name), d.name],
        ["description", String(f.description), d.description],
      ];
      if (String(f.subcategory)) out.push(["subcategory", String(f.subcategory), d.subcategory]);
      for (const key of ["benefits", "usageInstructions", "safetyWarnings"]) {
        (f[key] as string[]).forEach((s, i) => out.push([`${key}[${i}]`, s, (specs[key] as string[] | undefined)?.[i]]));
      }
      if (String(f.cardBenefit)) out.push(["cardBenefit", String(f.cardBenefit), specs.__cardBenefit]);
      const labelled = (specs.labelled ?? {}) as Record<string, { label?: unknown; value?: unknown }>;
      for (const [k, v] of Object.entries((f.labelled ?? {}) as Record<string, unknown>)) {
        out.push([`labelled.${k}.label`, k, labelled[k]?.label]);
        if (typeof v === "string" && ARABIC.test(v)) out.push([`labelled.${k}.value`, v, labelled[k]?.value]);
        else if (labelled[k]?.value !== undefined) out.push([`labelled.${k}.value`, String(v), labelled[k]?.value]);
      }
      for (const [id, label] of Object.entries((f.variantLabels ?? {}) as Record<string, string>)) out.push([`variantLabels.${id}`, label, (d.variantLabels as Record<string, unknown> | undefined)?.[id]]);
      return out;
    });
    validateEntity(locale, "blog_post", "blog_posts", src.posts, blogPostSourceFields as never, (f, d) => [
      ["title", String(f.title), d.title],
      ["excerpt", String(f.excerpt), d.excerpt],
      ["content", String(f.content), d.content],
    ]);
    validateEntity(locale, "blog_category", "blog_categories", src.blogCategories, blogCategorySourceFields as never, (f, d) => {
      const out: Array<[string, string, unknown]> = [["name", String(f.name), d.name]];
      if (String(f.description)) out.push(["description", String(f.description), d.description]);
      return out;
    });
  }
}

// ── Report ───────────────────────────────────────────────────────────────────
async function main() {
  if (SCOPE === "ui" || SCOPE === "all") validateUi();
  if (SCOPE === "content" || SCOPE === "all") await validateContent();
  const errors = findings.filter((f) => f.severity === "error");
  const warnings = findings.filter((f) => f.severity === "warning");
  const byCode = (list: Finding[]) => Object.entries(list.reduce<Record<string, number>>((m, f) => ((m[`${f.scope}/${f.locale}/${f.code}`] = (m[`${f.scope}/${f.locale}/${f.code}`] ?? 0) + 1), m), {})).sort();
  mkdirSync(REPORT_DIR, { recursive: true });
  writeFileSync(resolve(REPORT_DIR, "validation-report.json"), JSON.stringify({ generatedAt: new Date().toISOString(), uiStats, contentStats, errors: errors.length, warnings: warnings.length, byCode: Object.fromEntries(byCode(findings)), findings }, null, 2));
  const md: string[] = [`# Translation validation (${new Date().toISOString()})`, ""];
  md.push("## UI bundles", "", "| locale | present / total | errors | warnings |", "|---|---|---|---|");
  for (const [l, s] of Object.entries(uiStats)) md.push(`| ${l} | ${s.present} / ${s.total} | ${errors.filter((f) => f.scope === "ui" && f.locale === l).length} | ${warnings.filter((f) => f.scope === "ui" && f.locale === l).length} |`);
  if (Object.keys(contentStats).length) {
    md.push("", "## Content (public set)", "", "| store | present / public | field-complete | passes all checks |", "|---|---|---|---|");
    for (const [k, s] of Object.entries(contentStats)) md.push(`| ${k} | ${s.present} / ${s.publicTotal} | ${s.complete} | ${s.valid} |`);
  }
  md.push("", "## Findings by code", "", "| code | count |", "|---|---|");
  for (const [k, n] of byCode(findings)) md.push(`| ${k} | ${n} |`);
  md.push("", "## Error samples (first 60)", "");
  for (const f of errors.slice(0, 60)) md.push(`- [${f.locale}] ${f.where} — **${f.code}** ${f.detail}`);
  md.push("", "## Warning samples (first 40)", "");
  for (const f of warnings.slice(0, 40)) md.push(`- [${f.locale}] ${f.where} — ${f.code} ${f.detail}`);
  writeFileSync(resolve(REPORT_DIR, "validation-report.md"), md.join("\n") + "\n");
  console.log(`errors: ${errors.length}, warnings: ${warnings.length}`);
  for (const [k, n] of byCode(findings)) console.log(`  ${k}: ${n}`);
  if (STRICT && errors.length) process.exit(1);
}
main().catch((e) => { console.error(e); process.exit(1); });
