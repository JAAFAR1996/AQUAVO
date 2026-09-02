/**
 * Corpus audit for script purity. Runs the same guard the generator enforces
 * (shared/script-purity.ts) over every published article, so the audit and the
 * gate can never disagree. Reads the public API: no credentials, and it
 * measures what a reader is actually served.
 *
 *   npx tsx scripts/audit-script-purity.ts
 */
import { findScriptViolations, type ScriptViolation } from "../shared/script-purity.js";

const BASE = process.env.AQUAVO_BASE_URL ?? "https://www.aquavoiq.com";

type Post = { slug: string; title: string; excerpt: string | null; content: string | null };

async function main(): Promise<void> {
  const listRes = await fetch(`${BASE}/api/blog/posts`);
  if (!listRes.ok) throw new Error(`blog list failed: ${listRes.status}`);
  const list = (await listRes.json()) as Array<{ slug: string }>;

  const findings: Array<{ slug: string; field: string; violation: ScriptViolation }> = [];
  for (const { slug } of list) {
    const res = await fetch(`${BASE}/api/blog/posts/${encodeURIComponent(slug)}`);
    if (!res.ok) throw new Error(`${slug}: ${res.status}`);
    const body = (await res.json()) as Post | { post: Post };
    const post = "post" in body ? body.post : body;
    for (const field of ["title", "excerpt", "content"] as const) {
      for (const violation of findScriptViolations(post[field])) {
        findings.push({ slug: post.slug, field, violation });
      }
    }
  }

  const byRule = new Map<string, number>();
  for (const f of findings) byRule.set(f.violation.rule, (byRule.get(f.violation.rule) ?? 0) + 1);

  for (const f of findings) {
    console.log(`${f.slug}\n  [${f.field}] ${f.violation.rule}\n      ${f.violation.evidence.slice(0, 160)}`);
  }
  console.log(`\narticles scanned : ${list.length}`);
  console.log(`articles flagged : ${new Set(findings.map((f) => f.slug)).size}`);
  console.log(`violations       : ${findings.length}`);
  console.log(`\nby rule:`);
  for (const [rule, n] of byRule) console.log(`  ${String(n).padStart(5)}  ${rule}`);
  if (findings.length > 0) process.exitCode = 1;
}

await main();
