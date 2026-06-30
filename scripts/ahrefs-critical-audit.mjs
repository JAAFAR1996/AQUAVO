import fs from "node:fs";
import path from "node:path";

const BASE = (process.env.AUDIT_BASE || "https://www.aquavoiq.com").replace(/\/$/, "");
const OUT_DIR = path.join(process.cwd(), "reports", "seo");
const BEFORE_FILE = path.join(OUT_DIR, "ahrefs-critical-before.json");
const AFTER_FILE = path.join(OUT_DIR, "ahrefs-critical-after.json");
const SUMMARY_FILE = path.join(OUT_DIR, "ahrefs-critical-summary.md");

const TARGET_PATHS = [
  "/",
  "/products",
  "/shipping",
  "/faq",
  "/return-policy",
  "/beginner-guide",
  "/privacy-policy",
  "/about",
  "/about-aquavo",
  "/guides",
  "/guides/filter-choice",
  "/guides/heater-choice",
  "/fish-encyclopedia",
  "/fish-health",
  "/sustainability",
  "/blog",
  "/deals",
  "/guides/tank-rescue-plan",
  "/calculators",
  "/aquarium-wizard",
  "/tank-builder",
  "/fish-compatibility",
  "/guides/white-scale",
  "/ai-tools",
  "/guides/feeding-table",
  "/invest",
  "/guides/quarantine",
  "/guides/essential-tools",
  "/guides/water-change-schedule",
  "/guides/water-myths",
  "/terms",
  "/journey",
  "/guides/aquarium-salt",
  "/why-aquavo",
  "/guides/eco-friendly",
  "/guides/happy-fish-signs",
  "/guides/algae-control",
  "/community-gallery",
  "/guides/filter-media",
  "/guides/treatment-basics",
  "/guides/5-mistakes",
  "/guides/5-mistakes/",
  "/guides/temperature-guide",
  "/fish-finder",
  "/guides/fish-hiding",
  "/guides/new-aquarium-setup-iraq",
  "/guides/aquarium-filter-guide",
  "/guides/aquarium-heater-guide",
  "/guides/aquarium-water-test-guide",
  "/guides/aquarium-decor-stones-guide",
  "/guides/beginner-aquarium-mistakes",
  "/guides/water-conditioner-guide",
  "/guides/aquarium-weekly-maintenance",
  "/products/houyi-white-cotton",
];

const REQUIRED_OG = ["og:title", "og:description", "og:type", "og:url", "og:image"];
const REQUIRED_TWITTER = ["twitter:card", "twitter:title", "twitter:description", "twitter:image"];

function unique(items) {
  return [...new Set(items)];
}

function toUrl(pathname) {
  return pathname.startsWith("http") ? pathname : `${BASE}${pathname}`;
}

function cleanPath(urlOrPath) {
  try {
    const u = new URL(urlOrPath, BASE);
    return u.pathname.replace(/\/+$/, "") || "/";
  } catch {
    return String(urlOrPath).split("?")[0].replace(/\/+$/, "") || "/";
  }
}

function toAuditBaseUrl(urlOrPath) {
  const url = new URL(urlOrPath, BASE);
  return `${BASE}${url.pathname}${url.search}`;
}

function decodeHtml(text) {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, n) => String.fromCharCode(Number.parseInt(n, 16)));
}

function stripTags(html) {
  return decodeHtml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function firstMatch(html, regex) {
  const match = html.match(regex);
  return match ? decodeHtml(match[1].replace(/\s+/g, " ").trim()) : "";
}

function getMetaContent(html, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return firstMatch(
    html,
    new RegExp(`<meta\\s+(?:name|property)=["']${escaped}["'][^>]*content=["']([^"']*)["'][^>]*>`, "i"),
  );
}

function getCanonical(html) {
  return firstMatch(html, /<link\s+rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i);
}

function getH1s(html) {
  return [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)]
    .map((m) => stripTags(m[1]))
    .filter(Boolean);
}

function getInternalHrefs(html) {
  const hrefs = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)]
    .map((m) => m[1])
    .filter((href) => href.startsWith("/") && !href.startsWith("//"))
    .map((href) => href.split("#")[0])
    .filter(Boolean)
    .filter((href) => !href.startsWith("/assets/"))
    .filter((href) => !href.startsWith("/images/"))
    .filter((href) => !href.match(/\.(png|jpe?g|webp|gif|svg|ico|css|js|pdf|xml|txt)$/i));
  return unique(hrefs);
}

function collectJsonLdTypes(value, acc) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item) => collectJsonLdTypes(item, acc));
    return;
  }
  if (value["@type"]) {
    if (Array.isArray(value["@type"])) value["@type"].forEach((type) => acc.add(String(type)));
    else acc.add(String(value["@type"]));
  }
  if (Array.isArray(value["@graph"])) value["@graph"].forEach((item) => collectJsonLdTypes(item, acc));
}

function getJsonLdTypes(html) {
  const types = new Set();
  const scripts = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const script of scripts) {
    try {
      collectJsonLdTypes(JSON.parse(script[1]), types);
    } catch {
      types.add("INVALID_JSON_LD");
    }
  }
  return [...types].sort();
}

function missingImageAltCount(html) {
  return [...html.matchAll(/<img\b[^>]*>/gi)].filter((m) => {
    const tag = m[0];
    const alt = tag.match(/\salt=["']([^"']*)["']/i);
    return !alt || alt[1].trim().length === 0;
  }).length;
}

function wordCount(html) {
  return stripTags(html)
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 1).length;
}

async function fetchManual(url) {
  const redirects = [];
  let current = url;
  for (let i = 0; i < 8; i += 1) {
    const response = await fetch(current, {
      redirect: "manual",
      headers: { "user-agent": "AQUAVO-AhrefsCriticalAudit/1.0" },
    });
    const location = response.headers.get("location");
    if (location && response.status >= 300 && response.status < 400) {
      const nextUrl = new URL(location, current).href;
      redirects.push({ status: response.status, from: current, to: nextUrl });
      current = nextUrl;
      continue;
    }

    const html = await response.text();
    return {
      status: response.status,
      finalUrl: current,
      redirects,
      html,
      contentType: response.headers.get("content-type") || "",
    };
  }
  throw new Error(`Too many redirects for ${url}`);
}

async function fetchStatusManual(url) {
  const redirects = [];
  let current = url;
  for (let i = 0; i < 8; i += 1) {
    let response = await fetch(current, {
      method: "HEAD",
      redirect: "manual",
      headers: { "user-agent": "AQUAVO-AhrefsCriticalAudit/1.0" },
    });
    if (response.status === 405) {
      response = await fetch(current, {
        method: "GET",
        redirect: "manual",
        headers: { "user-agent": "AQUAVO-AhrefsCriticalAudit/1.0" },
      });
    }

    const location = response.headers.get("location");
    if (location && response.status >= 300 && response.status < 400) {
      const nextUrl = new URL(location, current).href;
      redirects.push({ status: response.status, from: current, to: nextUrl });
      current = nextUrl;
      continue;
    }

    return { status: response.status, finalUrl: current, redirects };
  }

  return { status: 0, finalUrl: current, redirects, error: "Too many redirects" };
}

async function auditSitemapUrls(urls) {
  const results = [];
  const concurrency = 8;
  let index = 0;

  async function worker() {
    while (index < urls.length) {
      const currentIndex = index;
      index += 1;
      const url = urls[currentIndex];
      try {
        const checkedUrl = toAuditBaseUrl(url);
        results[currentIndex] = { url, checkedUrl, ...(await fetchStatusManual(checkedUrl)) };
      } catch (error) {
        results[currentIndex] = { url, status: 0, finalUrl: url, redirects: [], error: String(error) };
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, worker));
  return results;
}

async function fetchSitemap() {
  try {
    const response = await fetch(`${BASE}/sitemap.xml`, { headers: { "user-agent": "AQUAVO-AhrefsCriticalAudit/1.0" } });
    const xml = await response.text();
    const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/gi)].map((m) => decodeHtml(m[1].trim()));
    return { status: response.status, urls, xml };
  } catch (error) {
    return { status: 0, urls: [], xml: "", error: String(error) };
  }
}

function analyzePage(pathname, fetched, sitemapUrls) {
  const html = fetched.html || "";
  const title = firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description = getMetaContent(html, "description");
  const robots = getMetaContent(html, "robots");
  const h1s = getH1s(html);
  const canonical = getCanonical(html);
  const internalHrefs = getInternalHrefs(html);
  const jsonLdTypes = getJsonLdTypes(html);
  const og = Object.fromEntries(REQUIRED_OG.map((tag) => [tag, Boolean(getMetaContent(html, tag))]));
  const twitter = Object.fromEntries(REQUIRED_TWITTER.map((tag) => [tag, Boolean(getMetaContent(html, tag))]));
  const canonicalOrFinal = canonical || fetched.finalUrl;
  const sitemapPresence = sitemapUrls.includes(canonicalOrFinal) || sitemapUrls.includes(`${BASE}${cleanPath(canonicalOrFinal)}`);
  const isIndexable = fetched.status === 200 && !/noindex/i.test(robots);

  return {
    path: pathname,
    requestedUrl: toUrl(pathname),
    status: fetched.status,
    finalUrl: fetched.finalUrl,
    redirects: fetched.redirects,
    contentType: fetched.contentType,
    title,
    titleLength: title.length,
    metaDescription: description,
    metaDescriptionLength: description.length,
    h1Count: h1s.length,
    h1Text: h1s,
    wordCount: wordCount(html),
    internalHrefCount: internalHrefs.length,
    internalHrefs,
    canonical,
    robots,
    isIndexable,
    sitemapPresence,
    jsonLdTypes,
    og,
    twitter,
    ogComplete: REQUIRED_OG.every((tag) => og[tag]),
    twitterComplete: REQUIRED_TWITTER.every((tag) => twitter[tag]),
    missingImageAltCount: missingImageAltCount(html),
    hasEducationalSalesCard: /educationalGuide|getEducationalGuideForSignals|كارت تعليمي|دليل تعليمي/i.test(html),
  };
}

function summarize(report) {
  const pages = report.pages;
  const indexable = pages.filter((p) => p.isIndexable);
  const sitemapRedirectUrls = report.sitemap?.redirectUrls || [];
  const sitemapErrorUrls = report.sitemap?.errorUrls || [];
  return {
    totalPages: pages.length,
    indexablePages: indexable.length,
    missingH1: indexable.filter((p) => p.h1Count === 0).length,
    lowWordCountUnder150: indexable.filter((p) => p.wordCount < 150).length,
    noInternalOutlinksUnder5: indexable.filter((p) => p.internalHrefCount < 5).length,
    metaDescriptionMissing: indexable.filter((p) => p.metaDescriptionLength === 0).length,
    metaDescriptionTooShort: indexable.filter((p) => p.metaDescriptionLength > 0 && p.metaDescriptionLength < 120).length,
    metaDescriptionTooLong: indexable.filter((p) => p.metaDescriptionLength > 155).length,
    canonicalMissing: indexable.filter((p) => !p.canonical).length,
    robotsMissing: indexable.filter((p) => !p.robots).length,
    indexableNotInSitemap: indexable.filter((p) => !p.sitemapPresence && !p.requestedUrl.includes("/products/")).length,
    redirectingTargets: pages.filter((p) => p.redirects.length > 0).length,
    sitemapDuplicateUrls: report.sitemap?.duplicateUrls?.length || 0,
    sitemapNonWwwUrls: report.sitemap?.nonWwwUrls?.length || 0,
    sitemapRedirectUrls: sitemapRedirectUrls.length,
    sitemapErrorUrls: sitemapErrorUrls.length,
    ogIncomplete: indexable.filter((p) => !p.ogComplete).length,
    twitterIncomplete: indexable.filter((p) => !p.twitterComplete).length,
    pagesWithMissingAlt: indexable.filter((p) => p.missingImageAltCount > 0).length,
    homeSchemaRiskTypes: pages.find((p) => p.path === "/")?.jsonLdTypes.filter((type) => ["SpeakableSpecification", "VideoObject", "INVALID_JSON_LD"].includes(type)) || [],
    productsEducationalCards: pages.filter((p) => p.path.startsWith("/products") && p.hasEducationalSalesCard).length,
  };
}

function markdownTable(rows) {
  const head = "| Metric | Before | After |\n|---|---:|---:|";
  const body = rows.map(([label, before, after]) => `| ${label} | ${before ?? "-"} | ${after ?? "-"} |`).join("\n");
  return `${head}\n${body}`;
}

function writeSummary(before, after) {
  const b = before?.summary || null;
  const a = after?.summary || null;
  const rows = [
    ["Indexable pages", b?.indexablePages, a?.indexablePages],
    ["Missing H1", b?.missingH1, a?.missingH1],
    ["Low word count <150", b?.lowWordCountUnder150, a?.lowWordCountUnder150],
    ["Internal outlinks <5", b?.noInternalOutlinksUnder5, a?.noInternalOutlinksUnder5],
    ["Meta descriptions missing", b?.metaDescriptionMissing, a?.metaDescriptionMissing],
    ["Meta descriptions too short", b?.metaDescriptionTooShort, a?.metaDescriptionTooShort],
    ["Meta descriptions too long", b?.metaDescriptionTooLong, a?.metaDescriptionTooLong],
    ["Indexable not in sitemap", b?.indexableNotInSitemap, a?.indexableNotInSitemap],
    ["Redirecting target URLs", b?.redirectingTargets, a?.redirectingTargets],
    ["Sitemap duplicate URLs", b?.sitemapDuplicateUrls, a?.sitemapDuplicateUrls],
    ["Sitemap non-www URLs", b?.sitemapNonWwwUrls, a?.sitemapNonWwwUrls],
    ["Sitemap 3XX URLs", b?.sitemapRedirectUrls, a?.sitemapRedirectUrls],
    ["Sitemap error URLs", b?.sitemapErrorUrls, a?.sitemapErrorUrls],
    ["OG incomplete", b?.ogIncomplete, a?.ogIncomplete],
    ["Twitter incomplete", b?.twitterIncomplete, a?.twitterIncomplete],
    ["Pages with missing image alt", b?.pagesWithMissingAlt, a?.pagesWithMissingAlt],
    ["Home schema risk types", b?.homeSchemaRiskTypes.join(", ") || "", a?.homeSchemaRiskTypes.join(", ") || ""],
    ["Product educational cards", b?.productsEducationalCards, a?.productsEducationalCards],
  ];

  const lines = [
    "# Ahrefs Critical SEO Audit",
    "",
    `Base: ${BASE}`,
    `Generated: ${new Date().toISOString()}`,
    "",
    markdownTable(rows),
    "",
    "## Current Page Details",
    "",
  ];

  const current = after || before;
  for (const page of current.pages) {
    lines.push(`- ${page.path}: status ${page.status}, H1 ${page.h1Count}, words ${page.wordCount}, internal hrefs ${page.internalHrefCount}, sitemap ${page.sitemapPresence ? "yes" : "no"}, redirects ${page.redirects.length}`);
  }

  fs.writeFileSync(SUMMARY_FILE, `${lines.join("\n")}\n`, "utf8");
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const phaseArg = process.argv.find((arg) => arg.startsWith("--phase="));
  const phase = phaseArg ? phaseArg.split("=")[1] : fs.existsSync(BEFORE_FILE) ? "after" : "before";
  const sitemap = await fetchSitemap();
  const sitemapUrls = sitemap.urls;
  const sitemapChecks = await auditSitemapUrls(sitemapUrls);
  const pages = [];

  for (const pathname of TARGET_PATHS) {
    const fetched = await fetchManual(toUrl(pathname));
    pages.push(analyzePage(pathname, fetched, sitemapUrls));
  }

  const report = {
    phase,
    generatedAt: new Date().toISOString(),
    base: BASE,
    sitemap: {
      status: sitemap.status,
      urlCount: sitemapUrls.length,
      duplicateUrls: sitemapUrls.filter((url, index) => sitemapUrls.indexOf(url) !== index),
      nonWwwUrls: sitemapUrls.filter((url) => !url.startsWith("https://www.aquavoiq.com")),
      checkedUrlCount: sitemapChecks.length,
      redirectUrls: sitemapChecks.filter((item) => item.redirects.length > 0),
      errorUrls: sitemapChecks.filter((item) => item.status >= 400 || item.status === 0),
    },
    pages,
  };
  report.summary = summarize(report);

  const outFile = phase === "before" ? BEFORE_FILE : AFTER_FILE;
  fs.writeFileSync(outFile, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  const before = fs.existsSync(BEFORE_FILE) ? JSON.parse(fs.readFileSync(BEFORE_FILE, "utf8")) : null;
  const after = fs.existsSync(AFTER_FILE) ? JSON.parse(fs.readFileSync(AFTER_FILE, "utf8")) : null;
  writeSummary(before, after);

  console.log(`Wrote ${outFile}`);
  console.log(`Wrote ${SUMMARY_FILE}`);
  console.log(JSON.stringify(report.summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
