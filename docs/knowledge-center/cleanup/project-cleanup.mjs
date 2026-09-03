/**
 * Projected post-cleanup verification.
 *
 *   npx tsx docs/knowledge-center/cleanup/project-cleanup.mjs
 *
 * Fetches the live corpus, substitutes the four corrected bodies, and runs
 * every gate over the RESULT — so the post-migration state is measured before
 * the migration is applied, not after. Exits non-zero on any failure.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findScriptViolations } from "../../../shared/script-purity.js";
import { findEditorialViolations } from "../../../shared/editorial-guard.js";
import { findBusinessTruthViolations, AQUAVO_INVARIANTS } from "../../../shared/business-truth.js";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const BASE = "https://www.aquavoiq.com";
const EXPECTED_COUNT = 115;

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

// --- substitute the corrections -------------------------------------------
const patched = [];
for (const f of fs.readdirSync(DIR).filter((f) => f.startsWith("_c-") && f.endsWith(".html"))) {
  const slug = f.slice(3, -5);
  if (!(slug in content)) { console.log(`FAIL  ${slug} is not in the live corpus`); process.exitCode = 1; continue; }
  content[slug] = fs.readFileSync(path.join(DIR, f), "utf8");
  patched.push(slug);
}
console.log(`patched ${patched.length} articles into the projection: ${patched.join(", ")}\n`);

// --- guards ----------------------------------------------------------------
let script = 0, editorial = 0, business = 0;
for (const [slug, html] of Object.entries(content)) {
  const s = findScriptViolations(html), e = findEditorialViolations(html), b = findBusinessTruthViolations(html, facts);
  script += s.length; editorial += e.length; business += b.length;
  for (const v of [...s, ...e, ...b]) console.log(`${slug}\n   ${v.rule}: ${v.evidence.slice(0, 120)}`);
}

// --- link graph ------------------------------------------------------------
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
const noOut = slugs.filter((s) => outb[s].size === 0);
const edges = slugs.reduce((a, s) => a + outb[s].size, 0);

// --- tag balance -----------------------------------------------------------
// NB: the character class is written without backslashes on purpose. A bare \s
// inside a template literal degrades to a literal "s" and silently reports
// phantom defects — the trap documented in gate-draft.ts.
const BLOCK = ["p","ul","ol","li","table","tr","td","th","blockquote","h2","h3","strong","em"];
const malformed = [];
for (const [slug, html] of Object.entries(content)) {
  const bad = [];
  for (const tag of BLOCK) {
    const open = (html.match(new RegExp("<" + tag + "(?:[^a-zA-Z0-9>][^>]*)?>", "g")) ?? []).length;
    const close = (html.match(new RegExp("</" + tag + ">", "g")) ?? []).length;
    if (open !== close) bad.push(`${tag} ${open}/${close}`);
  }
  if (bad.length) malformed.push(`${slug}: ${bad.join(", ")}`);
}

// --- report ----------------------------------------------------------------
const checks = [
  ["articles", slugs.length, EXPECTED_COUNT],
  ["script purity", script, 0],
  ["editorial", editorial, 0],
  ["business truth", business, 0],
  ["dead links", dead.length, 0],
  ["self links", self.length, 0],
  ["orphans", orphans.length, 0],
  ["malformed articles", malformed.length, 0],
];
console.log("=== PROJECTED POST-CLEANUP CORPUS ===");
let failed = 0;
for (const [name, got, want] of checks) {
  const ok = got === want;
  if (!ok) failed++;
  console.log(`${name.padEnd(20)}: ${String(got).padStart(4)}   expected ${want}   ${ok ? "PASS" : "FAIL"}`);
}
console.log(`${"edges".padEnd(20)}: ${String(edges).padStart(4)}   (avg out ${(edges / slugs.length).toFixed(2)})`);
console.log(`${"zero-outbound".padEnd(20)}: ${String(noOut.length).padStart(4)}   (informational)`);
if (dead.length) console.log("dead:", dead);
if (self.length) console.log("self:", self);
if (orphans.length) console.log("orphans:", orphans);
if (malformed.length) { console.log("\nmalformed:"); malformed.forEach((m) => console.log("   " + m)); }

if (failed) { console.log(`\n${failed} CHECK(S) FAILED — do not proceed to migration.`); process.exitCode = 1; }
else console.log("\nAll checks pass. Projection is clean.");
