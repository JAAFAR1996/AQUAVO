/**
 * Projects the post-migration link graph for the final batch WITHOUT applying anything.
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
const sql = fs.readFileSync(path.join(HERE, "migration-final.sql"), "utf8");
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
// The rewrite uses a different UPDATE shape (title + excerpt + content). Missing
// it silently under-counted the graph on the first run.
let rewrites = 0;
for (const m of sql.matchAll(/UPDATE blog_posts SET title = '[\s\S]*?', excerpt = '[\s\S]*?', content = '([\s\S]*?)'\s*WHERE slug = '([^']+)';/g)) {
  content[m[2]] = unq(m[1]);
  rewrites++;
}
console.log(`replayed rewrites: ${rewrites}`);
console.log(`replayed: ${inserts} inserts, ${updates} content updates`);

const NEW = ["choosing-healthy-fish-in-store", "aquarium-hygiene-and-human-safety",
             "fish-that-outgrow-home-tanks", "fish-eye-problems"];
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
let islanded = 0;
const isNew = new Set(NEW);
// An inbound link from another article in the same batch is not discoverability:
// new articles that point only at each other form an island the established
// corpus cannot reach. Require at least one source from outside the batch.
for (const s of NEW) {
  const sources = [...inb[s]];
  const established = sources.filter((x) => !isNew.has(x));
  if (sources.length === 0) bad++;
  else if (established.length === 0) islanded++;
  const tag = sources.length === 0 ? "ORPHAN" : established.length === 0 ? "ISLAND" : "OK    ";
  console.log(`  ${tag} ${s}  <- ${sources.join(", ") || "(none)"}`);
}
if (bad || islanded || dead.length || self.length || orphans.length) {
  console.log(`\nFAIL: ${bad} without inbound links, ${islanded} reachable only from this batch, ${orphans.length} orphans, ${dead.length} dead, ${self.length} self`);
  process.exitCode = 1;
} else {
  console.log(`\nPASS: every new canonical has an inbound link from the established corpus; no orphans, no dead links, no self links.`);
}
