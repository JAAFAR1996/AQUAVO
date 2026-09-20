#!/usr/bin/env node
// Repair the 11 dead internal links in the published Arabic source.
//
// WHY
// ---
// Three auto-generated articles link to routes that do not exist. Arabic is the
// source of record and EN/CKB reproduce the hrefs faithfully, so each dead link
// is three broken pages. The generator gate that stops new ones is
// shared/internal-links.ts; this repairs the ones already live.
//
// Targets were chosen from each anchor's own visible TEXT, not from the invented
// path, because the text is what the reader is promised. Every target is checked
// against the real route table before anything is written.
//
// One anchor disagrees with itself: href="/substrate" with the text
// "الطعام الأسماك" (fish food). The text wins — it goes to the food category —
// and its broken grammar ("الطعام الأسماك" → "طعام الأسماك") is fixed in the
// same edit, since it is the visible half.
//
// SAFETY: dry run by default; production rejected unless --allow-production;
// every anchor must match exactly once; preconditions re-checked inside the
// transaction; rollback snapshot written before commit.
//
//   node TOOLS/i18n/fix-dead-internal-links.mjs
//   node TOOLS/i18n/fix-dead-internal-links.mjs --commit --allow-production
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const { register } = require("tsx/esm/api");
register();

const { resolveScriptDatabaseUrl } = await import("../script-db-guard.mjs");
const { routeExists } = await import("../../shared/internal-links.ts");

const COMMIT = process.argv.includes("--commit");
const ALLOW_PRODUCTION = process.argv.includes("--allow-production");

const cat = (name) => `/products?category=${encodeURIComponent(name)}`;

/** articleId → [{ from, to, note }] exact-substring anchor rewrites. */
const EDITS = {
  "auto-1789265156493": [
    { from: '<a href="/temperature-control">', to: `<a href="${cat("التحكم بالحرارة")}">`, note: "التعامل مع الحرارة" },
    { from: '<a href="/filtration">', to: `<a href="${cat("الفلترة والتنقية")}">`, note: "الفلترة والتنقية" },
    { from: '<a href="/water-treatment">', to: `<a href="${cat("معالجة المياه")}">`, note: "معالجة المياه" },
    // href said substrate, text says food. The text is what the reader clicks.
    { from: '<a href="/substrate">الطعام الأسماك</a>', to: `<a href="${cat("طعام الأسماك")}">طعام الأسماك</a>`, note: "food (href/text disagreed; grammar fixed)" },
    { from: '<a href="/decor">', to: `<a href="${cat("تربة وديكور")}">`, note: "الديكور والتجهيزات" },
    { from: '<a href="/ventilation">', to: `<a href="${cat("التهوية والأكسجين")}">`, note: "التهوية والأكسجين" },
    { from: '<a href="/monitoring">', to: `<a href="${cat("الفحص والمراقبة")}">`, note: "الفحص والمراقبة" },
  ],
  "auto-1788660363857": [
    // No per-filter-type pages exist; the filter-media guide covers both.
    { from: '<a href="/الفلترة-والتنقية/الفلتر-الميكانيكي">', to: '<a href="/guides/filter-media">', note: "الفلتر الميكانيكي" },
    { from: '<a href="/الفلترة-والتنقية/الفلتر-البيولوجي">', to: '<a href="/guides/filter-media">', note: "الفلتر البيولوجي" },
  ],
  "auto-1787451489298": [
    { from: '<a href="/substrate">', to: `<a href="${cat("تربة وديكور")}">`, note: "اختيار التربة" },
    { from: '<a href="/decor">', to: `<a href="${cat("تربة وديكور")}">`, note: "الديكور المناسب" },
  ],
};

// Refuse to ship a replacement that is itself dead.
for (const [id, list] of Object.entries(EDITS)) {
  for (const e of list) {
    const href = /href="([^"]*)"/.exec(e.to)[1];
    if (!routeExists(href)) {
      console.error(`Replacement target does not resolve: ${href} (${id})`);
      process.exit(2);
    }
  }
}
console.log(`[links] ${Object.values(EDITS).flat().length} replacement targets all resolve.\n`);

let target;
try {
  target = resolveScriptDatabaseUrl({ mode: "migrate", allowProduction: ALLOW_PRODUCTION });
} catch (err) {
  console.error(`\n[db-target] ${err.message}\n`);
  process.exit(2);
}
console.log(`[links] target : ${target.redactedLabel}`);
console.log(`[links] mode   : ${COMMIT ? "COMMIT (writes)" : "DRY RUN (no writes)"}\n`);

const { Pool, neonConfig } = await import("@neondatabase/serverless");
const ws = (await import("ws")).default;
neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: target.url.replace(/[&?]channel_binding=require/g, "") });

let exitCode = 0;
try {
  const planned = [];
  for (const [id, list] of Object.entries(EDITS)) {
    const { rows } = await pool.query(`SELECT id, slug, content FROM blog_posts WHERE id = $1`, [id]);
    if (rows.length !== 1) throw new Error(`Expected 1 row for ${id}, found ${rows.length}.`);
    let content = rows[0].content;
    console.log(`ARTICLE ${id}`);
    for (const e of list) {
      const n = content.split(e.from).length - 1;
      if (n === 1) {
        content = content.replace(e.from, e.to);
        console.log(`  ✓ ${e.note}`);
        continue;
      }
      // Already applied is not drift. A production repair script has to be safe
      // to re-run — after a partial failure, or simply twice — so an anchor that
      // is missing *because its replacement is already there* is a skip, not an
      // error. Anything else still aborts the whole run.
      if (n === 0 && content.includes(e.to)) {
        console.log(`  · ${e.note} (already applied)`);
        continue;
      }
      throw new Error(`Anchor drift in ${id}: "${e.from}" matched ${n} times, expected 1.`);
    }
    const remaining = [...content.matchAll(/href="([^"]*)"/g)].map((m) => m[1]).filter((h) => !routeExists(h));
    if (remaining.length) throw new Error(`${id} still has dead links after repair: ${remaining.join(", ")}`);
    console.log(`  → 0 dead links remain\n`);
    if (content !== rows[0].content) planned.push({ id, slug: rows[0].slug, before: rows[0].content, after: content });
  }

  if (!planned.length) { console.log("Nothing to do — already repaired."); await pool.end(); process.exit(0); }
  if (!COMMIT) {
    console.log(`DRY RUN — ${planned.length} article(s) would change. Nothing written.`);
    await pool.end();
    process.exit(0);
  }

  const dir = path.resolve(process.cwd(), "reports/i18n");
  fs.mkdirSync(dir, { recursive: true });
  const snap = path.join(dir, `rollback-dead-links-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  fs.writeFileSync(snap, JSON.stringify({ capturedAt: new Date().toISOString(), target: target.redactedLabel, rows: planned }, null, 2));
  console.log(`Rollback snapshot: ${snap}\n`);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const p of planned) {
      const { rows } = await client.query(`SELECT content FROM blog_posts WHERE id = $1 FOR UPDATE`, [p.id]);
      if (rows[0]?.content !== p.before) throw new Error(`${p.id}: content changed under us. Aborting.`);
      await client.query(`UPDATE blog_posts SET content = $2, updated_at = now() WHERE id = $1`, [p.id, p.after]);
      console.log(`  committed ${p.id} (${p.slug})`);
    }
    await client.query("COMMIT");
    console.log(`\nCommitted ${planned.length} article(s).`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("\nTransaction rolled back — nothing applied.");
    throw err;
  } finally {
    client.release();
  }
} catch (err) {
  console.error(`\n[links] FAILED: ${err.message}`);
  exitCode = 1;
} finally {
  await pool.end().catch(() => {});
}
process.exit(exitCode);
