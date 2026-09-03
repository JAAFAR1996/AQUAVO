/**
 * Full corpus verification against production.
 *
 *   npx tsx docs/knowledge-center/wave-9/verify-corpus.mjs
 *
 * Runs all three content guards plus the link graph over the LIVE corpus, so
 * the numbers are measured rather than projected.
 */
import fs from "node:fs";
import { findScriptViolations } from "../../../shared/script-purity.js";
import { findEditorialViolations } from "../../../shared/editorial-guard.js";
import { findBusinessTruthViolations, AQUAVO_INVARIANTS } from "../../../shared/business-truth.js";

const BASE = "https://www.aquavoiq.com";
const OUT = process.argv[2];

const productBody = await (await fetch(`${BASE}/api/products?limit=500`)).json();
const items = Array.isArray(productBody) ? productBody : productBody.products;
const facts = {
  ...AQUAVO_INVARIANTS,
  categories: [...new Set(items.map((p) => p.category).filter(Boolean))],
  productTerms: [
    ...new Set(items.flatMap((p) => (p.name ?? "").split(/[\s—–\-،(),.\/]+/)).filter((w) => w.length > 3)),
  ],
};

const listBody = await (await fetch(`${BASE}/api/blog/posts`)).json();
const posts = Array.isArray(listBody) ? listBody : listBody.posts;

const content = {};
for (const p of posts) {
  const body = await (await fetch(`${BASE}/api/blog/posts/${encodeURIComponent(p.slug)}`)).json();
  content[p.slug] = (body.post ?? body).content ?? "";
}

let script = 0, editorial = 0, business = 0;
for (const [slug, html] of Object.entries(content)) {
  const s = findScriptViolations(html), e = findEditorialViolations(html), b = findBusinessTruthViolations(html, facts);
  script += s.length; editorial += e.length; business += b.length;
  for (const v of [...s, ...e, ...b]) console.log(`${slug}\n   ${v.rule}: ${v.evidence.slice(0, 120)}`);
}

// Link graph, measured from production.
const slugs = Object.keys(content);
const inb = {}, outb = {};
slugs.forEach((s) => { inb[s] = new Set(); outb[s] = new Set(); });
const dead = [], self = [];
for (const s of slugs) {
  for (const m of content[s].matchAll(/href="\/blog\/([^"#?]+)"/g)) {
    const raw = m[1];
    const t = decodeURIComponent(raw);
    if (!content[t]) { dead.push(`${s} -> ${raw}`); continue; }
    if (t === s) { self.push(s); continue; }
    outb[s].add(t); inb[t].add(s);
  }
}
const orphans = slugs.filter((s) => inb[s].size === 0);
const noOut = slugs.filter((s) => outb[s].size === 0);
const edges = slugs.reduce((a, s) => a + outb[s].size, 0);

console.log(`\n=== PRODUCTION CORPUS ===`);
console.log(`articles        : ${slugs.length}`);
console.log(`script purity   : ${script}`);
console.log(`editorial       : ${editorial}`);
console.log(`business truth  : ${business}`);
console.log(`dead links      : ${dead.length}${dead.length ? " " + JSON.stringify(dead) : ""}`);
console.log(`self links      : ${self.length}${self.length ? " " + JSON.stringify(self) : ""}`);
console.log(`orphans         : ${orphans.length}`);
console.log(`zero-outbound   : ${noOut.length}`);
console.log(`edges           : ${edges}  (avg out ${(edges / slugs.length).toFixed(2)})`);
if (orphans.length) { console.log(`\norphan list:`); orphans.forEach((s) => console.log("   " + s)); }
if (OUT) fs.writeFileSync(OUT, JSON.stringify({ slugs, orphans, noOut, edges, dead, self }, null, 1));
