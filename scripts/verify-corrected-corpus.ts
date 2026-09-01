/**
 * Dry-run the prepared content corrections through the real guard.
 *
 * The corrections cannot be applied from this environment (the Neon MCP is
 * read-only), so they are verified against a corrected copy of the corpus
 * before anyone runs the migration: every replacement is applied in memory and
 * the result is re-scanned with the same guard the generator enforces.
 *
 *   npx tsx scripts/verify-corrected-corpus.ts <corrected.json>
 */
import { readFileSync } from "node:fs";
import { findEditorialViolations } from "../shared/editorial-guard.js";

const COMPARISON_SLUGS = new Set(["aquavo-vs-local-stores-baghdad", "best-aquarium-store-iraq-2026"]);

type Entry = { title: string; excerpt: string | null; content: string; unpublish?: boolean };

const path = process.argv[2];
if (!path) {
  console.error("usage: verify-corrected-corpus.ts <corrected.json>");
  process.exit(2);
}

const corpus = JSON.parse(readFileSync(path, "utf8")) as Record<string, Entry>;

let scanned = 0;
let remaining = 0;
const byRule = new Map<string, number>();

for (const [slug, entry] of Object.entries(corpus)) {
  if (entry.unpublish) continue; // removed from the site, not corrected in place
  scanned += 1;
  const options = { allowComparison: COMPARISON_SLUGS.has(slug) };
  for (const field of ["title", "excerpt", "content"] as const) {
    for (const v of findEditorialViolations(entry[field], options)) {
      remaining += 1;
      byRule.set(v.rule, (byRule.get(v.rule) ?? 0) + 1);
      console.log(`${slug} [${field}] ${v.rule}`);
      console.log(`    ${v.evidence.slice(0, 200)}`);
    }
  }
}

console.log(`\nscanned (excluding unpublished): ${scanned}`);
console.log(`violations remaining           : ${remaining}`);
for (const [rule, n] of byRule) console.log(`  ${n}  ${rule}`);
process.exitCode = remaining === 0 ? 0 : 1;
