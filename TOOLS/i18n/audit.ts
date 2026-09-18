/**
 * AQUAVO translation coverage audit.
 *
 * Produces reports/i18n/coverage-report.md (+ .json) covering:
 *  1. UI bundles: keys missing in en / ckb versus the Arabic source, and
 *     Arabic script leaking into English / Kurdish values.
 *  2. Static SEO metadata coverage for every indexable path.
 *  3. Business content coverage: products, blog posts, blog categories and
 *     product categories, per locale, from the live catalogue and the
 *     generated translation files (data/i18n/translations).
 *  4. Hard-coded Arabic in customer-facing client code, classified as
 *     A) localized source, B) intentional Arabic content/data, C) comments,
 *     D) accidental customer-facing Arabic (the ones that must be fixed).
 *
 * Usage: node --import tsx TOOLS/i18n/audit.ts [--strict]
 * --strict exits 1 when any D-class file or missing key exists.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { PUBLIC_INDEXABLE_PATHS, AQUAVO_PRODUCT_CATEGORIES } from "../../shared/seo-contract.js";
import { TRANSLATION_TARGET_LOCALES, type Locale } from "../../shared/i18n/locales.js";
import { localizedStaticMetaPaths } from "../../api/_static-meta-i18n.js";
import { localizeCategoryName } from "../../shared/i18n/categories.js";

const STRICT = process.argv.includes("--strict");
const BASE = process.env.AQUAVO_SOURCE_BASE || "https://www.aquavoiq.com";
const ARABIC = /\p{Script=Arabic}/u;
const KURDISH_ONLY = /[ڕڵۆێەڤگچپژ]/u;

function flatten(obj: Record<string, unknown>, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") Object.assign(out, flatten(v as Record<string, unknown>, key));
    else out[key] = String(v);
  }
  return out;
}

// ── 1. UI bundles ─────────────────────────────────────────────────────────────
const LOCALES_DIR = resolve("client/src/locales");
const namespaces = readdirSync(resolve(LOCALES_DIR, "ar")).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""));
// Strings that legitimately contain Arabic script in every language.
const ARABIC_ALLOWED_IN_TRANSLATIONS = ["د.ع", "AL NABEA", "المنبع"];
// Kurdish values that are legitimately identical to the Arabic source (shared spellings, currency).
const CKB_SAME_AS_ARABIC = new Set(["بابل", "{{value}} د.ع", "5,000 د.ع"]);
const ui: Record<string, { total: number; missing: string[]; arabicLeaks: string[] }> = {};
let uiArabicTotal = 0;
for (const locale of TRANSLATION_TARGET_LOCALES) {
  const missing: string[] = [];
  const arabicLeaks: string[] = [];
  let total = 0;
  for (const ns of namespaces) {
    const ar = flatten(JSON.parse(readFileSync(resolve(LOCALES_DIR, "ar", `${ns}.json`), "utf8")));
    const target = existsSync(resolve(LOCALES_DIR, locale, `${ns}.json`))
      ? flatten(JSON.parse(readFileSync(resolve(LOCALES_DIR, locale, `${ns}.json`), "utf8")))
      : {};
    for (const key of Object.keys(ar)) {
      // Plural forms differ per language (Arabic has six, English/Kurdish two).
      const base = key.replace(/_(zero|one|two|few|many|other)$/, "");
      const present = key in target || Object.keys(target).some((k) => k.replace(/_(zero|one|two|few|many|other)$/, "") === base);
      total++;
      if (!present) missing.push(`${ns}:${key}`);
    }
    if (locale === "en") {
      for (const [key, value] of Object.entries(target)) {
        const stripped = ARABIC_ALLOWED_IN_TRANSLATIONS.reduce((v, allowed) => v.split(allowed).join(""), value);
        if (ARABIC.test(stripped)) arabicLeaks.push(`${ns}:${key}`);
      }
    }
    if (locale === "ckb") {
      // Kurdish is written in Arabic script; flag values that contain NO Kurdish-specific letter and look like plain Arabic copies.
      for (const [key, value] of Object.entries(target)) {
        if (ARABIC.test(value) && !KURDISH_ONLY.test(value) && ar[key] === value && value.length > 3 && !CKB_SAME_AS_ARABIC.has(value)) arabicLeaks.push(`${ns}:${key}`);
      }
    }
  }
  uiArabicTotal = total;
  ui[locale] = { total, missing, arabicLeaks };
}

// ── 2. Static SEO metadata ────────────────────────────────────────────────────
const staticPaths = [...PUBLIC_INDEXABLE_PATHS];
const staticMeta: Record<string, { covered: number; total: number; missing: string[] }> = {};
for (const locale of TRANSLATION_TARGET_LOCALES) {
  const have = new Set(localizedStaticMetaPaths(locale));
  const missing = staticPaths.filter((p) => !have.has(p));
  staticMeta[locale] = { covered: staticPaths.length - missing.length, total: staticPaths.length, missing };
}

// ── 3. Business content ───────────────────────────────────────────────────────
async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: { "x-locale": "ar" } });
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return (await res.json()) as T;
}
function loadStore(locale: Locale, entity: string): Record<string, unknown> {
  const p = resolve("data/i18n/translations", locale, `${entity}.json`);
  return existsSync(p) ? (JSON.parse(readFileSync(p, "utf8")) as Record<string, unknown>) : {};
}
const { products } = await getJson<{ products: Array<{ id: string; slug: string }> }>("/api/products?limit=500");
const posts = await getJson<Array<{ id: string; slug: string }>>("/api/blog/posts?limit=1000");
const blogCats = await getJson<Array<{ id: string }>>("/api/blog/categories");
const content: Record<string, Record<Locale, { have: number; total: number; missingSlugs?: string[] }>> = {
  products: { ar: { have: products.length, total: products.length } } as never,
  blog_posts: { ar: { have: posts.length, total: posts.length } } as never,
  blog_categories: { ar: { have: blogCats.length, total: blogCats.length } } as never,
  categories: { ar: { have: AQUAVO_PRODUCT_CATEGORIES.length, total: AQUAVO_PRODUCT_CATEGORIES.length } } as never,
};
for (const locale of TRANSLATION_TARGET_LOCALES) {
  const p = loadStore(locale, "products");
  const b = loadStore(locale, "blog_posts");
  const c = loadStore(locale, "blog_categories");
  const missingProducts = products.filter((x) => !p[x.id]).map((x) => x.slug);
  const missingPosts = posts.filter((x) => !b[x.id]).map((x) => x.slug);
  content.products[locale] = { have: products.length - missingProducts.length, total: products.length, missingSlugs: missingProducts };
  content.blog_posts[locale] = { have: posts.length - missingPosts.length, total: posts.length, missingSlugs: missingPosts };
  content.blog_categories[locale] = { have: blogCats.filter((x) => c[x.id]).length, total: blogCats.length };
  const catsCovered = AQUAVO_PRODUCT_CATEGORIES.filter((cat) => localizeCategoryName(cat, locale) !== cat).length;
  content.categories[locale] = { have: catsCovered, total: AQUAVO_PRODUCT_CATEGORIES.length };
}

// ── 4. Hard-coded Arabic in client code ───────────────────────────────────────
const CLASS_B_PATTERNS = [/^client\/src\/data\//, /fish-species-data/, /breeding-data/, /^client\/src\/lib\/site-search\.ts$/, /aquascape-data/, /initial-fish-data/];
const EXCLUDE = ["client/src/locales/", "/__tests__/", "client/src/components/admin/", "client/src/pages/admin", "client/src/pages/admin-", ".test.", "client/src/i18n/"];
function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}
const ROOT = resolve("client/src");
let rgOut = "";
for (const file of walk(ROOT)) {
  const rel = "client/src/" + file.slice(ROOT.length + 1).replace(/\/g, "/");
  const text = readFileSync(file, "utf8");
  if (!ARABIC.test(text)) continue;
  text.split(/?
/).forEach((line, i) => {
    if (ARABIC.test(line)) rgOut += `${rel}:${i + 1}:${line}
`;
  });
}
const byFile = new Map<string, { code: number; comments: number }>();
for (const line of rgOut.split(/\r?\n/)) {
  const m = /^(.+?):(\d+):(.*)$/.exec(line);
  if (!m) continue;
  const file = m[1].replace(/\\/g, "/");
  if (EXCLUDE.some((e) => file.includes(e))) continue;
  const text = m[3].trim();
  const isComment = /^(\/\/|\/\*|\*|\{\/\*)/.test(text) || /^\s*\*\s/.test(text);
  const entry = byFile.get(file) ?? { code: 0, comments: 0 };
  if (isComment) entry.comments++;
  else entry.code++;
  byFile.set(file, entry);
}
const classified = { B: [] as string[], C: [] as string[], D: [] as Array<{ file: string; lines: number }> };
for (const [file, counts] of byFile) {
  if (CLASS_B_PATTERNS.some((p) => p.test(file))) classified.B.push(file);
  else if (counts.code === 0) classified.C.push(file);
  else classified.D.push({ file, lines: counts.code });
}
classified.D.sort((a, b) => b.lines - a.lines);

// ── Report ────────────────────────────────────────────────────────────────────
const pct = (have: number, total: number) => (total === 0 ? "n/a" : `${((have / total) * 100).toFixed(1)}%`);
const lines: string[] = [];
lines.push(`# AQUAVO translation coverage report`, ``, `Generated ${new Date().toISOString()} against ${BASE}.`, ``);
lines.push(`## 1. UI string bundles (client/src/locales)`, ``, `| Locale | Keys | Missing | Arabic leaks |`, `|---|---|---|---|`);
lines.push(`| ar | ${uiArabicTotal} | 0 (source) | n/a |`);
for (const locale of TRANSLATION_TARGET_LOCALES) lines.push(`| ${locale} | ${ui[locale].total} | ${ui[locale].missing.length} | ${ui[locale].arabicLeaks.length} |`);
for (const locale of TRANSLATION_TARGET_LOCALES) {
  if (ui[locale].missing.length) lines.push(``, `Missing in ${locale}: ${ui[locale].missing.slice(0, 50).join(", ")}${ui[locale].missing.length > 50 ? " …" : ""}`);
  if (ui[locale].arabicLeaks.length) lines.push(``, `Arabic leaks in ${locale}: ${ui[locale].arabicLeaks.join(", ")}`);
}
lines.push(``, `## 2. Static SEO metadata (indexable paths)`, ``, `| Locale | Covered |`, `|---|---|`, `| ar | ${staticPaths.length}/${staticPaths.length} |`);
for (const locale of TRANSLATION_TARGET_LOCALES) lines.push(`| ${locale} | ${staticMeta[locale].covered}/${staticMeta[locale].total}${staticMeta[locale].missing.length ? ` (missing: ${staticMeta[locale].missing.join(", ")})` : ""} |`);
lines.push(``, `## 3. Business content (live catalogue vs generated translations)`, ``, `| Entity | ar | en | ckb |`, `|---|---|---|---|`);
for (const [entity, row] of Object.entries(content)) {
  lines.push(`| ${entity} | ${row.ar.have}/${row.ar.total} | ${row.en.have}/${row.en.total} (${pct(row.en.have, row.en.total)}) | ${row.ckb.have}/${row.ckb.total} (${pct(row.ckb.have, row.ckb.total)}) |`);
}
lines.push(``, `Translation records live in data/i18n/translations/<locale>/*.json until TOOLS/i18n/seed-translations.mjs loads them into content_translations (requires the migration).`);
lines.push(``, `## 4. Hard-coded Arabic in customer-facing client code`, ``, `- A) Localized source bundles: client/src/locales/ar/*.json (${namespaces.length} namespaces) — by design.`);
lines.push(`- B) Intentional Arabic data/content files: ${classified.B.length}`, ...classified.B.map((f) => `  - ${f}`));
lines.push(`- C) Comments only: ${classified.C.length} files`);
lines.push(`- D) Customer-facing Arabic still hard-coded: ${classified.D.length} files, ${classified.D.reduce((a, b) => a + b.lines, 0)} lines`, ...classified.D.map((d) => `  - ${d.file} (${d.lines})`));
mkdirSync(resolve("reports/i18n"), { recursive: true });
writeFileSync(resolve("reports/i18n/coverage-report.md"), lines.join("\n") + "\n");
writeFileSync(resolve("reports/i18n/coverage-report.json"), JSON.stringify({ ui, staticMeta, content, classified }, null, 2));
console.log(lines.join("\n"));
const failing = classified.D.length > 0 || TRANSLATION_TARGET_LOCALES.some((l) => ui[l].missing.length > 0);
if (STRICT && failing) process.exit(1);
