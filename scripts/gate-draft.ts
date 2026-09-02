/**
 * Runs all three content guards over a local draft file, so a rewrite is
 * checked with the same code that gates the generator before it ever reaches a
 * migration.
 *
 *   npx tsx scripts/gate-draft.ts <file.html> [--allow-slug=a,b]
 *
 * Also resolves every internal /blog/ link against the live corpus, because a
 * mistyped slug is invisible to all three guards and ships a dead link. Slugs
 * being created in the same migration are declared with --allow-slug.
 */
import fs from "node:fs";
import { findScriptViolations } from "../shared/script-purity.js";
import { findEditorialViolations } from "../shared/editorial-guard.js";
import { findBusinessTruthViolations, AQUAVO_INVARIANTS, type BusinessFacts } from "../shared/business-truth.js";

const BASE = process.env.AQUAVO_BASE_URL ?? "https://www.aquavoiq.com";
const file = process.argv[2];
if (!file) { console.error("usage: npx tsx scripts/gate-draft.ts <file.html>"); process.exit(2); }
const html = fs.readFileSync(file, "utf8");

const body = (await (await fetch(`${BASE}/api/products?limit=500`)).json()) as
  | Array<{ name: string; category: string }>
  | { products: Array<{ name: string; category: string }> };
const items = Array.isArray(body) ? body : body.products;
const facts: BusinessFacts = {
  ...AQUAVO_INVARIANTS,
  categories: Array.from(new Set(items.map((p) => p.category).filter(Boolean))),
  productTerms: Array.from(
    new Set(items.flatMap((p) => (p.name ?? "").split(/[\s—–\-،(),.\/]+/)).filter((w) => w.length > 3)),
  ),
};

// Internal /blog/ links must resolve. A typo here passes every guard and every
// SQL post-flight, and lands the reader on a 404.
const allowExtra = new Set(
  (process.argv.find((a) => a.startsWith("--allow-slug=")) ?? "").replace("--allow-slug=", "").split(",").filter(Boolean),
);
const listBody = (await (await fetch(`${BASE}/api/blog/posts`)).json()) as
  | Array<{ slug: string }>
  | { posts: Array<{ slug: string }> };
const live = new Set((Array.isArray(listBody) ? listBody : listBody.posts).map((p) => p.slug));
const linked = [...html.matchAll(/href="\/blog\/([^"#?]+)"/g)].map((m) => decodeURIComponent(m[1]));
const dead = linked.filter((slug) => !live.has(slug) && !allowExtra.has(slug));
for (const slug of dead) console.log(`DEAD LINK   /blog/${slug} does not resolve`);

// Block-level tag balance. A stray closing tag passes every content guard and
// every SQL post-flight, and renders as broken markup.
const BLOCK = ["p", "ul", "ol", "li", "table", "tr", "td", "th", "blockquote", "h2", "h3", "strong", "em"];
const unbalanced: string[] = [];
for (const tag of BLOCK) {
  // NB: this pattern is built inside a template literal, so a bare \s would
  // reach RegExp as a literal "s" and the count would miss every tag carrying
  // attributes. Escape it.
  const open = (html.match(new RegExp(`<${tag}(?:\\s[^>]*)?>`, "g")) ?? []).length;
  const close = (html.match(new RegExp(`</${tag}>`, "g")) ?? []).length;
  if (open !== close) unbalanced.push(`${tag}: ${open} open vs ${close} close`);
}
for (const u of unbalanced) console.log(`UNBALANCED  ${u}`);

const script = findScriptViolations(html);
const editorial = findEditorialViolations(html);
const business = findBusinessTruthViolations(html, facts);

for (const v of script) console.log(`SCRIPT      ${v.rule}: ${v.evidence.slice(0, 150)}`);
for (const v of editorial) console.log(`EDITORIAL   ${v.rule}: ${v.evidence.slice(0, 150)}`);
for (const v of business) console.log(`BUSINESS    ${v.rule}: ${v.evidence.slice(0, 150)}`);

console.log(`\nfile            : ${file}`);
console.log(`length          : ${html.length}`);
console.log(`tables          : ${(html.match(/<table/g) ?? []).length}`);
console.log(`internal links  : ${(html.match(/href="\//g) ?? []).length}`);
console.log(`script purity   : ${script.length}`);
console.log(`editorial       : ${editorial.length}`);
console.log(`business truth  : ${business.length}`);
console.log(`dead links      : ${dead.length}`);
console.log(`unbalanced tags : ${unbalanced.length}`);
if (script.length + editorial.length + business.length + dead.length + unbalanced.length > 0) process.exitCode = 1;
