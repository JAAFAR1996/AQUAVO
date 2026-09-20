// Link-integrity gate for translated content.
// 1) every href in a translation must also exist in its Arabic source (no invented links)
// 2) no href may contain Sorani-only letters (translator rewriting the URL itself)
// 3) internal hrefs must resolve to a real route / known dynamic prefix
import fs from "node:fs";
import path from "node:path";

const ROOT = "C:/Users/jaafa/Desktop/upload/wt-i18n";
const rd = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));

const app = fs.readFileSync(path.join(ROOT, "client/src/App.tsx"), "utf8");
const staticRoutes = new Set([...app.matchAll(/path="([^"]+)"/g)].map((m) => m[1]).filter((p) => !p.includes(":")));
const dynamicPrefixes = [...app.matchAll(/path="([^"]*?)\/:[^"]*"/g)].map((m) => `${m[1]}/`);

const cache = rd("reports/i18n/source-cache.json");
const srcPosts = new Map(cache.posts.map((p) => [p.slug, p]));
const srcProducts = new Map(cache.products.map((p) => [p.id, p]));

const SORANI_ONLY = /[ەێۆڕڵ]/;
const findings = [];

function hrefs(s) {
  return typeof s === "string" ? [...s.matchAll(/href="([^"]*)"/g)].map((m) => m[1]) : [];
}

function resolves(h) {
  if (/^(https?:|mailto:|tel:|#)/.test(h)) return true;
  const clean = h.split(/[?#]/)[0].replace(/\/$/, "") || "/";
  if (staticRoutes.has(clean)) return true;
  if (dynamicPrefixes.some((p) => clean.startsWith(p) && clean.length > p.length)) return true;
  return false;
}

for (const locale of ["en", "ckb"]) {
  // ---- blog posts
  const posts = rd(`data/i18n/translations/${locale}/blog_posts.json`);
  for (const [key, entry] of Object.entries(posts)) {
    const slug = entry.slug ?? key;
    const src = srcPosts.get(slug);
    const srcHrefs = new Set(src ? hrefs(src.content) : []);
    for (const h of hrefs(entry.data?.content)) {
      if (SORANI_ONLY.test(h)) findings.push({ locale, where: `post/${slug}`, kind: "sorani-in-url", href: h });
      else if (src && !srcHrefs.has(h)) findings.push({ locale, where: `post/${slug}`, kind: "invented-link", href: h });
      if (!resolves(h)) findings.push({ locale, where: `post/${slug}`, kind: "dead-route", href: h });
    }
  }
  // ---- products (description + spec arrays)
  const prods = rd(`data/i18n/translations/${locale}/products.json`);
  for (const [key, entry] of Object.entries(prods)) {
    const src = srcProducts.get(entry.entityId ?? key);
    const blob = JSON.stringify(entry.data ?? {});
    const srcBlob = src ? JSON.stringify(src) : "";
    const srcHrefs = new Set(hrefs(srcBlob));
    for (const h of hrefs(blob)) {
      if (SORANI_ONLY.test(h)) findings.push({ locale, where: `product/${entry.slug ?? key}`, kind: "sorani-in-url", href: h });
      else if (src && !srcHrefs.has(h)) findings.push({ locale, where: `product/${entry.slug ?? key}`, kind: "invented-link", href: h });
      if (!resolves(h)) findings.push({ locale, where: `product/${entry.slug ?? key}`, kind: "dead-route", href: h });
    }
  }
}

// ---- also audit the ARABIC source itself for dead routes (the summer-heat lesson)
for (const p of cache.posts) {
  if (!p.isPublished) continue;
  for (const h of hrefs(p.content)) if (!resolves(h)) findings.push({ locale: "ar", where: `post/${p.slug}`, kind: "dead-route", href: h });
}

const byKind = {};
for (const f of findings) byKind[`${f.locale}/${f.kind}`] = (byKind[`${f.locale}/${f.kind}`] ?? 0) + 1;
console.log("findings:", findings.length);
console.log(byKind);
const seen = new Set();
for (const f of findings) {
  const k = `${f.locale}|${f.kind}|${f.href}`;
  if (seen.has(k)) continue;
  seen.add(k);
  console.log(`  [${f.locale}] ${f.kind.padEnd(14)} ${f.href}   (${f.where})`);
}
