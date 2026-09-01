/**
 * Corpus audit for external commercial referrals and invented availability.
 *
 * Runs the same guard the generator enforces (shared/editorial-guard.ts) over
 * every published article, so the audit and the gate can never disagree. Reads
 * the public API rather than the database: no credentials, and it measures what
 * a reader is actually served.
 *
 *   npx tsx scripts/audit-editorial-commerce.ts            # summary
 *   npx tsx scripts/audit-editorial-commerce.ts --json      # machine readable
 */
import { findEditorialViolations, type EditorialViolation } from "../shared/editorial-guard.js";

const BASE = process.env.AQUAVO_BASE_URL ?? "https://www.aquavoiq.com";

/**
 * Articles whose subject genuinely is the comparison with local shops. They may
 * name a competitor; they still may not send a reader there to buy, and the
 * guard keeps enforcing that.
 */
const COMPARISON_SLUGS = new Set(["aquavo-vs-local-stores-baghdad", "best-aquarium-store-iraq-2026"]);

type Post = { slug: string; title: string; excerpt: string | null; content: string | null };

async function main(): Promise<void> {
  const listRes = await fetch(`${BASE}/api/blog/posts`);
  if (!listRes.ok) throw new Error(`blog list failed: ${listRes.status}`);
  const list = (await listRes.json()) as Array<{ slug: string }>;

  const findings: Array<{ slug: string; field: string; violation: EditorialViolation }> = [];
  for (const { slug } of list) {
    const res = await fetch(`${BASE}/api/blog/posts/${encodeURIComponent(slug)}`);
    if (!res.ok) continue;
    const post = (await res.json()) as Post;
    const options = { allowComparison: COMPARISON_SLUGS.has(slug) };
    for (const field of ["title", "excerpt", "content"] as const) {
      for (const violation of findEditorialViolations(post[field], options)) {
        findings.push({ slug, field, violation });
      }
    }
  }

  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(findings, null, 2));
    return;
  }

  const bySlug = new Map<string, typeof findings>();
  for (const f of findings) {
    const rows = bySlug.get(f.slug) ?? [];
    rows.push(f);
    bySlug.set(f.slug, rows);
  }

  console.log(`articles scanned : ${list.length}`);
  console.log(`articles flagged : ${bySlug.size}`);
  console.log(`violations       : ${findings.length}\n`);
  for (const [slug, rows] of [...bySlug.entries()].sort()) {
    console.log(`${slug}`);
    for (const { field, violation } of rows) {
      console.log(`  [${field}] ${violation.rule}`);
      console.log(`      ${violation.evidence.slice(0, 220)}`);
    }
    console.log();
  }
  const counts = new Map<string, number>();
  for (const f of findings) counts.set(f.violation.rule, (counts.get(f.violation.rule) ?? 0) + 1);
  console.log("by rule:");
  for (const [rule, n] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(3)}  ${rule}`);
  }
  process.exitCode = findings.length > 0 ? 1 : 0;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
