/**
 * Corpus audit for AQUAVO business-fact claims. Runs the same guard the
 * generator enforces (shared/business-truth.ts) over every published article,
 * with the catalogue injected from the live API — so the audit and the gate see
 * identical facts and can never disagree.
 *
 *   npx tsx scripts/audit-business-truth.ts
 */
import {
  findBusinessTruthViolations,
  AQUAVO_INVARIANTS,
  type BusinessFacts,
  type BusinessTruthViolation,
} from "../shared/business-truth.js";

const BASE = process.env.AQUAVO_BASE_URL ?? "https://www.aquavoiq.com";

type Post = { slug: string; title: string; excerpt: string | null; content: string | null };
type Product = { name: string; category: string };

async function loadFacts(): Promise<BusinessFacts> {
  const res = await fetch(`${BASE}/api/products?limit=500`);
  if (!res.ok) throw new Error(`catalogue failed: ${res.status}`);
  const body = (await res.json()) as Product[] | { products: Product[] };
  const items = Array.isArray(body) ? body : body.products;
  return {
    ...AQUAVO_INVARIANTS,
    categories: Array.from(new Set(items.map((p) => p.category).filter(Boolean))),
    productTerms: Array.from(
      new Set(items.flatMap((p) => (p.name ?? "").split(/[\s—–-]+/).slice(0, 2)).filter((w) => w.length > 2)),
    ),
  };
}

async function main(): Promise<void> {
  const facts = await loadFacts();
  console.log(`catalogue: ${facts.categories.length} categories, ${facts.productTerms.length} product terms\n`);

  const list = (await (await fetch(`${BASE}/api/blog/posts`)).json()) as Array<{ slug: string }>;
  const findings: Array<{ slug: string; violation: BusinessTruthViolation }> = [];
  for (const { slug } of list) {
    const body = (await (await fetch(`${BASE}/api/blog/posts/${encodeURIComponent(slug)}`)).json()) as
      | Post
      | { post: Post };
    const post = "post" in body ? body.post : body;
    for (const field of ["title", "excerpt", "content"] as const) {
      for (const violation of findBusinessTruthViolations(post[field], facts)) {
        findings.push({ slug: post.slug, violation });
      }
    }
  }

  const byRule = new Map<string, number>();
  for (const f of findings) byRule.set(f.violation.rule, (byRule.get(f.violation.rule) ?? 0) + 1);
  for (const f of findings) console.log(`${f.slug}\n  ${f.violation.rule}\n      ${f.violation.evidence.slice(0, 170)}`);

  console.log(`\narticles scanned : ${list.length}`);
  console.log(`articles flagged : ${new Set(findings.map((f) => f.slug)).size}`);
  console.log(`violations       : ${findings.length}`);
  console.log(`\nby rule:`);
  for (const [rule, n] of byRule) console.log(`  ${String(n).padStart(5)}  ${rule}`);
  if (findings.length > 0) process.exitCode = 1;
}

await main();
