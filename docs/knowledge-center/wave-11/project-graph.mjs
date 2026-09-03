/**
 * Projects the post-migration link graph for Wave 11 WITHOUT applying anything.
 *
 *   npx tsx docs/knowledge-center/wave-11/project-graph.mjs
 *
 * Cycle 10 shipped an orphan because linking was folded into the article
 * migration and nothing checked the resulting graph before apply. This checks
 * it before apply, and names the exact orphan slugs if any survive.
 */
import fs from "node:fs";
import path from "node:path";

const BASE = "https://www.aquavoiq.com";
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));

const listBody = await (await fetch(`${BASE}/api/blog/posts`)).json();
const posts = Array.isArray(listBody) ? listBody : listBody.posts;

const content = {};
for (const p of posts) {
  const body = await (await fetch(`${BASE}/api/blog/posts/${encodeURIComponent(p.slug)}`)).json();
  content[p.slug] = (body.post ?? body).content ?? "";
}
const before = { articles: Object.keys(content).length };

// Replay the migration's writes from the emitted SQL, so what is projected is
// exactly what would be committed — not a re-derivation from the drafts.
const sql = fs.readFileSync(path.join(HERE, "migration-wave11.sql"), "utf8");
const unq = (s) => s.split("''").join("'");

let inserts = 0;
for (const m of sql.matchAll(/INSERT INTO blog_posts[\s\S]*?VALUES \('(?:[\s\S]*?)', '([a-z0-9-]+)', '(?:[\s\S]*?)', '([\s\S]*?)', '[^']*', '[^']*',\n        'AQUAVO Editorial Team', TRUE, now\(\);?\);/g)) {
  content[m[1]] = unq(m[2]);
  inserts++;
}
let updates = 0;
for (const m of sql.matchAll(/UPDATE blog_posts SET content = '([\s\S]*?)' WHERE slug = '([^']+)';/g)) {
  content[m[2]] = unq(m[1]);
  updates++;
}
console.log(`replayed: ${inserts} inserts, ${updates} content updates`);

const NEW = ["external-fish-parasites", "internal-fish-parasites", "fish-treatment-protocol",
             "aquarium-water-flow", "aquarium-placement-and-stand"];
for (const s of NEW) if (!content[s]) throw new Error(`insert not replayed: ${s}`);

const slugs = Object.keys(content);
const inb = {}, outb = {};
slugs.forEach((s) => { inb[s] = new Set(); outb[s] = new Set(); });
const dead = [], self = [];
for (const s of slugs) {
  for (const m of content[s].matchAll(/href="\/blog\/([^"#?]+)"/g)) {
    const t = decodeURIComponent(m[1]);
    if (!content[t]) { dead.push(`${s} -> ${m[1]}`); continue; }
    if (t === s) { self.push(s); continue; }
    outb[s].add(t); inb[t].add(s);
  }
}
const orphans = slugs.filter((s) => inb[s].size === 0);
const edges = slugs.reduce((a, s) => a + outb[s].size, 0);

console.log(`\n=== PROJECTED POST-MIGRATION GRAPH ===`);
console.log(`articles      : ${before.articles} -> ${slugs.length}`);
console.log(`dead links    : ${dead.length}${dead.length ? "\n  " + dead.join("\n  ") : ""}`);
console.log(`self links    : ${self.length}${self.length ? "\n  " + self.join("\n  ") : ""}`);
console.log(`orphans       : ${orphans.length}${orphans.length ? "\n  " + orphans.join("\n  ") : ""}`);
console.log(`edges         : ${edges}`);

console.log(`\n=== INBOUND LINKS PER NEW CANONICAL ===`);
let bad = 0;
for (const s of NEW) {
  const sources = [...inb[s]];
  if (sources.length === 0) bad++;
  console.log(`  ${sources.length === 0 ? "ORPHAN" : "OK    "} ${s}  <- ${sources.join(", ") || "(none)"}`);
}
if (bad || dead.length || self.length || orphans.length) {
  console.log(`\nFAIL: ${bad} new articles without inbound links, ${orphans.length} orphans, ${dead.length} dead, ${self.length} self`);
  process.exitCode = 1;
} else {
  console.log(`\nPASS: every new canonical has an inbound link; no orphans, no dead links, no self links.`);
}
