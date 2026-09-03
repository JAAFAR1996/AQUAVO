/**
 * Sweeps the updated business-truth guard over the entire live corpus.
 *
 *   npx tsx docs/knowledge-center/wave-9/sweep-guard.mjs
 *
 * A guard change is only safe if it flags what it should and nothing else. Unit
 * tests prove the first half; only the real corpus proves the second.
 */
import { findBusinessTruthViolations, AQUAVO_INVARIANTS } from "../../../shared/business-truth.js";

const BASE = "https://www.aquavoiq.com";

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

let flagged = 0;
for (const p of posts) {
  const body = await (await fetch(`${BASE}/api/blog/posts/${encodeURIComponent(p.slug)}`)).json();
  const row = body.post ?? body;
  const found = findBusinessTruthViolations(row.content, facts);
  if (found.length) {
    flagged++;
    console.log(`\n${p.slug}`);
    for (const v of found) console.log(`   ${v.rule}\n     ${v.evidence.slice(0, 160)}`);
  }
}
console.log(`\nscanned ${posts.length} live articles — ${flagged} flagged`);
