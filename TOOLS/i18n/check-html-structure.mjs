#!/usr/bin/env node
// Structural parity between the Arabic source and each translation.
//
// WHY
// ---
// Pass 4 found an article whose translated body contained `<pنەک` — a `<p` whose
// `>` had been swallowed by the translator, gluing the tag to the first Kurdish
// word. Browsers silently absorb it and the paragraph vanishes. The translation
// validator counts headings, lists, tables and images but NOT paragraphs, so it
// passed. A missing `<tr>` in another article passed the same way.
//
// This compares element counts per tag, checks tag balance, and looks for the
// specific malformations a translator produces: a tag name fused to non-Latin
// text, an unterminated tag, a stray entity.
//
// Read-only. Exits 1 if any article has a structural defect.
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const rd = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
const cache = rd("reports/i18n/source-cache.json");

/** Tags whose count must match the source exactly. */
const COUNTED = ["p", "h2", "h3", "h4", "ul", "ol", "li", "table", "tr", "th", "td", "blockquote", "strong", "a", "img", "section", "div"];

/**
 * Tags where a count difference is a translator's stylistic choice, not a
 * structural defect. Emphasis does not have to land on the same number of words
 * in Sorani as in Arabic. Reported, never fatal.
 */
const ADVISORY = new Set(["strong"]);

const countTag = (html, tag) => (html.match(new RegExp(`<${tag}(?=[\\s/>])`, "gi")) ?? []).length;
const countClose = (html, tag) => (html.match(new RegExp(`</${tag}\\s*>`, "gi")) ?? []).length;

/** Void elements never carry a closing tag. */
const VOID = new Set(["img", "br", "hr", "input", "meta", "link"]);

function malformations(html) {
  const out = [];
  // `<p` or `</p` immediately followed by a non-Latin letter: the `>` was eaten.
  for (const m of html.matchAll(/<\/?([a-z][a-z0-9]*)[^\s/>]*?[^\x00-\x7F]/gi)) {
    out.push(`tag fused to non-Latin text: ${JSON.stringify(m[0].slice(0, 24))}`);
  }
  // An unterminated tag: `<` ... end of string with no `>`.
  const lastOpen = html.lastIndexOf("<");
  if (lastOpen !== -1 && !html.slice(lastOpen).includes(">")) out.push("unterminated tag at end of document");
  // Malformed entity: `&` followed by letters but no `;` within 10 chars.
  for (const m of html.matchAll(/&[a-z]{2,8}(?![a-z;])/gi)) out.push(`unterminated entity: ${JSON.stringify(m[0])}`);
  return out;
}

const findings = [];
for (const locale of ["en", "ckb"]) {
  const store = rd(`data/i18n/translations/${locale}/blog_posts.json`);
  for (const entry of Object.values(store)) {
    const src = cache.posts.find((p) => p.slug === entry.slug || p.id === entry.entityId);
    const tgt = entry.data?.content;
    if (!src || typeof tgt !== "string") continue;
    const where = `${locale}/${entry.slug}`;

    for (const bad of malformations(tgt)) findings.push({ where, kind: "malformed", detail: bad });

    for (const tag of COUNTED) {
      const a = countTag(src.content, tag);
      const b = countTag(tgt, tag);
      if (a !== b) {
        findings.push({
          where,
          kind: ADVISORY.has(tag) ? "advisory" : "count",
          detail: `<${tag}>: source ${a}, target ${b}`,
        });
      }
      if (!VOID.has(tag)) {
        const open = countTag(tgt, tag);
        const close = countClose(tgt, tag);
        if (open !== close) findings.push({ where, kind: "unbalanced", detail: `<${tag}>: ${open} open, ${close} close` });
      }
    }
  }
}

// The Arabic source is the record; check it for the same malformations.
for (const p of cache.posts) {
  if (!p.isPublished) continue;
  for (const bad of malformations(p.content)) findings.push({ where: `ar/${p.slug}`, kind: "malformed", detail: bad });
}

const byKind = {};
for (const f of findings) byKind[f.kind] = (byKind[f.kind] ?? 0) + 1;
console.log(`structural findings: ${findings.length}`, byKind);
for (const f of findings.slice(0, 60)) console.log(`  [${f.kind}] ${f.where} — ${f.detail}`);
if (findings.length > 60) console.log(`  … ${findings.length - 60} more`);
const fatal = findings.filter((f) => f.kind !== "advisory");
console.log(`\n${fatal.length} structural defect(s), ${findings.length - fatal.length} advisory.`);
process.exit(fatal.length ? 1 : 0);
