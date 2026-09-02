/**
 * Runs all three content guards over a local draft file, so a rewrite is
 * checked with the same code that gates the generator before it ever reaches a
 * migration.
 *
 *   npx tsx scripts/gate-draft.ts <file.html>
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
if (script.length + editorial.length + business.length > 0) process.exitCode = 1;
