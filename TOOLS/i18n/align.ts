/**
 * Print an article or product with its Arabic source and a translation side by
 * side, block by block, so a reviewer can read them against each other.
 *
 * Usage:
 *   node --import tsx TOOLS/i18n/align.ts --slug=<slug> --locale=ckb|en [--kind=post|product]
 *   node --import tsx TOOLS/i18n/align.ts --list=high-risk        (slugs, score >= 24)
 *   node --import tsx TOOLS/i18n/align.ts --list=posts|products
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")).map(([k, v]) => [k, v ?? "true"]));

interface Cache {
  products: Array<Record<string, unknown> & { id: string; slug: string; name: string; description: string; specifications?: Record<string, unknown>; variants?: Array<{ id: string; label: string }> }>;
  posts: Array<Record<string, unknown> & { id: string; slug: string; title: string; excerpt: string; content: string }>;
}
const cache = JSON.parse(readFileSync(resolve("reports/i18n/source-cache.json"), "utf8")) as Cache;
const store = (locale: string, f: string) => {
  const p = resolve("data/i18n/translations", locale, `${f}.json`);
  return existsSync(p) ? (JSON.parse(readFileSync(p, "utf8")) as Record<string, { data: Record<string, unknown> }>) : {};
};

if (args.list) {
  if (args.list === "high-risk") {
    const audit = JSON.parse(readFileSync(resolve("reports/i18n/content-audit.json"), "utf8")) as { articleRisk: Array<{ slug: string; score: number; topics: string[] }> };
    for (const a of audit.articleRisk.filter((x) => x.score >= 24)) console.log(`${a.slug}\t${a.score}\t${a.topics.join(", ")}`);
  } else if (args.list === "posts") {
    for (const p of cache.posts) console.log(p.slug);
  } else {
    for (const p of cache.products) console.log(p.slug);
  }
  process.exit(0);
}

const slug = String(args.slug ?? "");
const locale = String(args.locale ?? "ckb");
if (!slug) throw new Error("--slug required");

/** Split HTML into readable blocks, keeping the tag that introduced each one. */
function blocks(html: string): string[] {
  return html
    .split(/(?=<(?:p|h[1-6]|li|tr|blockquote|table)\b)/i)
    .map((s) => s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim())
    .filter((s) => s.length > 0);
}

const post = cache.posts.find((p) => p.slug === slug);
const product = cache.products.find((p) => p.slug === slug);

if (post && args.kind !== "product") {
  const d = store(locale, "blog_posts")[post.id]?.data;
  if (!d) { console.log(`no ${locale} translation for ${slug}`); process.exit(0); }
  console.log(`=== ARTICLE ${slug} (${locale})`);
  console.log(`TITLE   ar: ${post.title}`);
  console.log(`TITLE  ${locale}: ${d.title}`);
  console.log(`EXCERPT ar: ${post.excerpt}`);
  console.log(`EXCERPT ${locale}: ${d.excerpt}`);
  const a = blocks(post.content);
  const b = blocks(String(d.content ?? ""));
  console.log(`\nblocks: ar ${a.length}, ${locale} ${b.length}\n`);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    console.log(`[${i + 1}] ar : ${a[i] ?? "(missing)"}`);
    console.log(`[${i + 1}] ${locale}: ${b[i] ?? "(missing)"}`);
    console.log("");
  }
} else if (product) {
  const d = store(locale, "products")[product.id]?.data;
  if (!d) { console.log(`no ${locale} translation for ${slug}`); process.exit(0); }
  const specs = (product.specifications ?? {}) as Record<string, unknown>;
  const ts = (d.specifications ?? {}) as Record<string, unknown>;
  console.log(`=== PRODUCT ${slug} (${locale})`);
  const pair = (label: string, x: unknown, y: unknown) => { console.log(`${label} ar : ${String(x ?? "")}`); console.log(`${label} ${locale}: ${String(y ?? "")}`); console.log(""); };
  pair("NAME", product.name, d.name);
  pair("DESC", product.description, d.description);
  pair("SUBCAT", product.subcategory, d.subcategory);
  for (const k of ["benefits", "usageInstructions", "safetyWarnings"]) {
    const A = (specs[k] as string[] | undefined) ?? [];
    const B = (ts[k] as string[] | undefined) ?? [];
    for (let i = 0; i < Math.max(A.length, B.length); i++) pair(`${k}[${i}]`, A[i], B[i]);
  }
  pair("cardBenefit", specs.__cardBenefit, ts.__cardBenefit);
  const labelled = (ts.labelled ?? {}) as Record<string, { label?: string; value?: string }>;
  for (const [k, v] of Object.entries(specs)) {
    if (["benefits", "usageInstructions", "safetyWarnings", "__cardBenefit"].includes(k)) continue;
    if (typeof v !== "string" && typeof v !== "number") continue;
    console.log(`SPEC "${k}" ar : ${v}`);
    console.log(`SPEC "${k}" ${locale}: ${labelled[k]?.label ?? "(missing)"} = ${labelled[k]?.value ?? "(missing)"}`);
    console.log("");
  }
  for (const v of product.variants ?? []) {
    pair(`variant ${v.id}`, v.label, (d.variantLabels as Record<string, string> | undefined)?.[v.id]);
  }
} else {
  console.log(`slug not found: ${slug}`);
}
