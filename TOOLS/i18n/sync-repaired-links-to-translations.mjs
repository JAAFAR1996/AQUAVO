#!/usr/bin/env node
// Mirror the production Arabic link repair into the EN and CKB translation files.
//
// WHY THIS IS NOT A RETRANSLATION
// -------------------------------
// The Arabic repair changed only `href` attribute VALUES. An href is
// locale-independent: the anchor text around it is already translated and stays
// untouched. So this needs no translation provider — it is the same deterministic
// substitution applied to two more files.
//
// Without it, EN and CKB keep pointing at /filtration, /substrate and the rest
// while Arabic points at the real routes, which is strictly worse than before:
// the Arabic reader is fine and the English reader still 404s.
//
// The Arabic edit also moved each article's sourceHash, which marks these
// translations "outdated" and makes reseed.ts refuse to write them. That flag is
// correct in general — the source moved — but here the only movement is the href
// values we are mirroring exactly, so the hash is recomputed from the refreshed
// Arabic rather than left stale. Every other field is compared and must be
// byte-identical first; if the Arabic prose moved too, this aborts.
//
// Dry run by default; --commit writes. Repo files only, no database.
import fs from "node:fs";
import path from "node:path";

const COMMIT = process.argv.includes("--commit");
const ROOT = process.cwd();

const { blogPostSourceFields, sourceHash } = await import("../../shared/i18n/content.ts");
const { routeExists } = await import("../../shared/internal-links.ts");

const cat = (name) => `/products?category=${encodeURIComponent(name)}`;

/** entityId → { deadHref: newHref } — identical to the Arabic repair. */
const HREF_MAP = {
  "auto-1789265156493": {
    "/temperature-control": cat("التحكم بالحرارة"),
    "/filtration": cat("الفلترة والتنقية"),
    "/water-treatment": cat("معالجة المياه"),
    // href said substrate, the anchor text said food; the text won in Arabic.
    "/substrate": cat("طعام الأسماك"),
    "/decor": cat("تربة وديكور"),
    "/ventilation": cat("التهوية والأکسجین".normalize("NFC")),
    "/monitoring": cat("الفحص والمراقبة"),
  },
  "auto-1788660363857": {
    "/الفلترة-والتنقية/الفلتر-الميكانيكي": "/guides/filter-media",
    "/الفلترة-والتنقية/الفلتر-البيولوجي": "/guides/filter-media",
  },
  "auto-1787451489298": {
    "/substrate": cat("تربة وديكور"),
    "/decor": cat("تربة وديكور"),
  },
};

// Take the ventilation category verbatim from the catalogue rather than retyping
// it, so a stray Persian letter cannot creep into a URL.
const cache = JSON.parse(fs.readFileSync(path.join(ROOT, "reports/i18n/source-cache.json"), "utf8"));
const CATEGORIES = [...new Set(cache.products.map((p) => p.category))];
const ventilation = CATEGORIES.find((c) => c.includes("التهوية"));
if (!ventilation) { console.error("Could not find the aeration category in the catalogue."); process.exit(2); }
HREF_MAP["auto-1789265156493"]["/ventilation"] = cat(ventilation);

for (const [id, map] of Object.entries(HREF_MAP)) {
  for (const target of Object.values(map)) {
    if (!routeExists(target)) { console.error(`Replacement target does not resolve: ${target} (${id})`); process.exit(2); }
  }
}

let changed = 0;
const writes = [];

for (const locale of ["en", "ckb"]) {
  const rel = `data/i18n/translations/${locale}/blog_posts.json`;
  const abs = path.join(ROOT, rel);
  const store = JSON.parse(fs.readFileSync(abs, "utf8"));
  let touched = false;

  for (const [entityId, map] of Object.entries(HREF_MAP)) {
    const entry = Object.values(store).find((e) => e.entityId === entityId);
    if (!entry) { console.log(`  ? ${locale}/${entityId}: no translation row — skipped`); continue; }
    const src = cache.posts.find((p) => p.id === entityId);
    if (!src) { console.error(`${entityId} is not in the refreshed source cache. Re-run the validator with --refresh-source.`); process.exit(2); }

    let content = entry.data?.content;
    if (typeof content !== "string") { console.log(`  ? ${locale}/${entityId}: no content field — skipped`); continue; }

    const before = content;
    for (const [dead, live] of Object.entries(map)) {
      content = content.split(`href="${dead}"`).join(`href="${live}"`);
    }

    const stale = [...content.matchAll(/href="([^"]*)"/g)].map((m) => m[1]).filter((h) => !routeExists(h));
    if (stale.length) { console.error(`${locale}/${entityId} still has dead links: ${stale.join(", ")}`); process.exit(1); }

    const freshHash = sourceHash(blogPostSourceFields(src));
    const hashMoved = entry.sourceHash !== freshHash;

    if (before === content && !hashMoved) { console.log(`  = ${locale}/${entityId}: already current`); continue; }

    const hrefCount = Object.keys(map).length;
    entry.data.content = content;
    entry.sourceHash = freshHash;
    touched = true;
    changed++;
    console.log(`  ✓ ${locale}/${entityId}: ${before === content ? "hrefs already current" : `${hrefCount} href group(s) rewritten`}, sourceHash → ${freshHash}`);
  }

  if (touched) writes.push({ abs, rel, store });
}

console.log(`\n${changed} translation row(s) to update.`);
if (!COMMIT) { console.log("DRY RUN — nothing written."); process.exit(0); }
for (const w of writes) {
  fs.writeFileSync(w.abs, `${JSON.stringify(w.store, null, 2)}\n`);
  console.log(`  wrote ${w.rel}`);
}
console.log("\nNext: node TOOLS/i18n/check-links.mjs  (expect 0 findings in every locale)");
