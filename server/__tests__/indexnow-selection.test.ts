import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  BASE_URL,
  INDEXNOW_KEY,
  MAX_URLS_PER_POST,
  buildSubmissionPayload,
  describeIndexNowStatus,
  nextLedger,
  parseSitemapEntries,
  selectChangedUrls,
  // @ts-expect-error - plain ESM module, run by node in CI without a build step
} from "../../TOOLS/indexnow-core.mjs";

// The submission script carried a frozen six-URL list, written during an old
// indexing-recovery push: "/", one product, two guides, /shipping and /faq.
// It ran on every push to main and resubmitted those same six unchanged URLs,
// which is exactly what IndexNow answers 429 to — and it never once submitted
// any of the eleven category listings. These tests pin the replacement: what
// gets sent is derived from the sitemaps, and only where something changed.

const sitemap = (rows: Array<[string, string?]>) =>
  `<?xml version="1.0" encoding="UTF-8"?><urlset>${rows
    .map(([loc, lastmod]) =>
      `<url><loc>${loc}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}</url>`)
    .join("")}</urlset>`;

const CATEGORY = `${BASE_URL}/products?category=%D8%A7%D9%84%D8%A5%D8%B6%D8%A7%D8%A1%D8%A9`;

describe("IndexNow: the URL list comes from the sitemaps", () => {
  it("reads loc and lastmod pairs out of a sitemap", () => {
    const entries = parseSitemapEntries(sitemap([
      [`${BASE_URL}/`, "2026-08-29"],
      [CATEGORY, "2026-08-29"],
      [`${BASE_URL}/faq`, "2026-08-01"],
    ]));
    expect(entries).toEqual([
      { loc: `${BASE_URL}/`, lastmod: "2026-08-29" },
      { loc: CATEGORY, lastmod: "2026-08-29" },
      { loc: `${BASE_URL}/faq`, lastmod: "2026-08-01" },
    ]);
  });

  it("includes the category listings, which the frozen list never did", () => {
    const entries = parseSitemapEntries(sitemap([[CATEGORY, "2026-08-29"]]));
    expect(selectChangedUrls(entries, { today: "2026-08-29" })).toEqual([CATEGORY]);
  });

  it("truncates a full sitemap timestamp to a date", () => {
    const entries = parseSitemapEntries(sitemap([[`${BASE_URL}/`, "2026-08-29T14:03:11.000Z"]]));
    expect(entries[0].lastmod).toBe("2026-08-29");
  });
});

describe("IndexNow: only what actually changed", () => {
  const entries = parseSitemapEntries(sitemap([
    [`${BASE_URL}/`, "2026-08-29"],
    [CATEGORY, "2026-08-29"],
    [`${BASE_URL}/faq`, "2026-06-01"],
  ]));

  it("drops URLs whose lastmod is older than the window", () => {
    const urls = selectChangedUrls(entries, { today: "2026-08-29", windowDays: 7 });
    expect(urls).toContain(CATEGORY);
    expect(urls).not.toContain(`${BASE_URL}/faq`);
  });

  it("drops a URL already submitted for that same lastmod", () => {
    const ledger = { [CATEGORY]: "2026-08-29" };
    expect(selectChangedUrls(entries, { today: "2026-08-29", ledger })).not.toContain(CATEGORY);
  });

  it("resubmits once the lastmod moves on", () => {
    const ledger = { [CATEGORY]: "2026-08-20" };
    expect(selectChangedUrls(entries, { today: "2026-08-29", ledger })).toContain(CATEGORY);
  });

  it("submits nothing at all when nothing changed", () => {
    const ledger = Object.fromEntries(entries.map((e) => [e.loc, e.lastmod]));
    expect(selectChangedUrls(entries, { today: "2026-08-29", ledger })).toEqual([]);
  });

  it("ignores an entry with no lastmod rather than assuming it changed", () => {
    const noStamp = parseSitemapEntries(sitemap([[`${BASE_URL}/orphan`]]));
    expect(selectChangedUrls(noStamp, { today: "2026-08-29" })).toEqual([]);
  });

  it("refuses a URL on another host, which IndexNow answers 422 to", () => {
    const offHost = parseSitemapEntries(sitemap([["https://example.com/x", "2026-08-29"]]));
    expect(selectChangedUrls(offHost, { today: "2026-08-29" })).toEqual([]);
  });

  it("refuses a lastmod in the future", () => {
    const future = parseSitemapEntries(sitemap([[`${BASE_URL}/x`, "2027-01-01"]]));
    expect(selectChangedUrls(future, { today: "2026-08-29" })).toEqual([]);
  });

  it("never exceeds the protocol maximum of 10,000 URLs", () => {
    const many = Array.from({ length: MAX_URLS_PER_POST + 25 }, (_, i) =>
      [`${BASE_URL}/p/${i}`, "2026-08-29"] as [string, string]);
    expect(selectChangedUrls(parseSitemapEntries(sitemap(many)), { today: "2026-08-29" }))
      .toHaveLength(MAX_URLS_PER_POST);
  });

  it("deduplicates a URL listed in two sitemaps", () => {
    const dup = parseSitemapEntries(sitemap([[CATEGORY, "2026-08-29"], [CATEGORY, "2026-08-29"]]));
    expect(selectChangedUrls(dup, { today: "2026-08-29" })).toEqual([CATEGORY]);
  });
});

describe("IndexNow: the ledger records what was sent", () => {
  it("records the lastmod each submitted URL was sent for", () => {
    const entries = parseSitemapEntries(sitemap([[CATEGORY, "2026-08-29"], [`${BASE_URL}/faq`, "2026-08-29"]]));
    expect(nextLedger({}, entries, [CATEGORY])).toEqual({ [CATEGORY]: "2026-08-29" });
  });

  it("keeps entries for URLs not in this batch", () => {
    const entries = parseSitemapEntries(sitemap([[CATEGORY, "2026-08-29"]]));
    const previous = { [`${BASE_URL}/faq`]: "2026-06-01" };
    expect(nextLedger(previous, entries, [CATEGORY])).toEqual({
      [`${BASE_URL}/faq`]: "2026-06-01",
      [CATEGORY]: "2026-08-29",
    });
  });
});

describe("IndexNow: payload and status handling", () => {
  it("builds the documented payload shape", () => {
    const payload = buildSubmissionPayload([CATEGORY]);
    expect(payload.host).toBe("www.aquavoiq.com");
    expect(payload.key).toBe(INDEXNOW_KEY);
    expect(payload.keyLocation).toBe(`${BASE_URL}/${INDEXNOW_KEY}.txt`);
    expect(payload.urlList).toEqual([CATEGORY]);
  });

  it("treats 200 and 202 as success and 429 as retryable, not fatal", () => {
    expect(describeIndexNowStatus(200).ok).toBe(true);
    expect(describeIndexNowStatus(202).ok).toBe(true);
    expect(describeIndexNowStatus(429)).toMatchObject({ ok: false, retryable: true });
    for (const status of [400, 403, 422]) {
      expect(describeIndexNowStatus(status)).toMatchObject({ ok: false, retryable: false });
    }
  });

  it("keeps the key file in the repo in step with the key it submits", () => {
    const file = readFileSync(
      resolve(process.cwd(), `client/public/${INDEXNOW_KEY}.txt`), "utf8");
    expect(file.trim()).toBe(INDEXNOW_KEY);
    expect(INDEXNOW_KEY).toMatch(/^[a-zA-Z0-9-]{8,128}$/);
  });
});

describe("IndexNow: the submission script no longer carries a frozen list", () => {
  it("derives its URLs from the sitemaps instead of a literal array", () => {
    const source = readFileSync(resolve(process.cwd(), "TOOLS/submit-indexnow.mjs"), "utf8");
    expect(source).toContain("selectChangedUrls");
    expect(source).toContain("parseSitemapEntries");
    // The frozen list and the stale readiness probe that pinned it.
    expect(source).not.toContain("houyi-stainless-shunt");
    expect(source).not.toContain("sitemap-recovery.xml");
    expect(source).not.toMatch(/const URLS = \[/);
  });
});

describe("IndexNow: the workflow fires on a real deployment", () => {
  const workflow = () =>
    readFileSync(resolve(process.cwd(), ".github/workflows/indexnow-search-refresh.yml"), "utf8");

  it("triggers on deployment_status rather than on push to main", () => {
    const yaml = workflow();
    expect(yaml).toContain("deployment_status");
    // The push trigger was what made this run against the previous deployment.
    expect(yaml).not.toMatch(/^\s*push:/m);
  });

  it("submits only for a successful production deployment", () => {
    const yaml = workflow();
    expect(yaml).toContain("deployment_status.state == 'success'");
    expect(yaml).toContain("deployment.environment == 'Production'");
  });

  it("carries the ledger between runs", () => {
    const yaml = workflow();
    expect(yaml).toContain("actions/cache");
    expect(yaml).toContain(".indexnow-ledger.json");
  });
});

describe("IndexNow: nothing still points at the old script path", () => {
  it("has no workflow referencing scripts/submit-indexnow.mjs", () => {
    // .gitignore excludes scripts/, so moving the script there back would make
    // it invisible to git; a workflow left pointing at the old path fails with
    // MODULE_NOT_FOUND, which is exactly how this was caught in CI.
    const dir = resolve(process.cwd(), ".github/workflows");
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"))) {
      const yaml = readFileSync(resolve(dir, file), "utf8");
      expect(yaml, `${file} still references the old script path`).not.toContain("scripts/submit-indexnow");
      expect(yaml, `${file} still references the old core path`).not.toContain("scripts/indexnow-core");
    }
  });

  it("syntax-checks both IndexNow modules, not just one", () => {
    const yaml = readFileSync(
      resolve(process.cwd(), ".github/workflows/seo-preview-validation.yml"), "utf8");
    expect(yaml).toContain("node --check TOOLS/submit-indexnow.mjs");
    expect(yaml).toContain("node --check TOOLS/indexnow-core.mjs");
  });
});
