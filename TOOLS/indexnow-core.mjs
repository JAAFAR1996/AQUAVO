// Pure selection logic for the IndexNow submission. Kept free of network and
// filesystem access so it can be tested directly; TOOLS/submit-indexnow.mjs
// supplies the IO.

export const INDEXNOW_HOST = "www.aquavoiq.com";
export const BASE_URL = `https://${INDEXNOW_HOST}`;
export const INDEXNOW_KEY = "67d3eed08e869c3cd18bdf563d183fcc";
export const INDEXNOW_KEY_LOCATION = `${BASE_URL}/${INDEXNOW_KEY}.txt`;
export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

/** The sitemaps that between them list every indexable AQUAVO URL. */
export const SITEMAPS = [
  `${BASE_URL}/sitemap-pages.xml`,
  `${BASE_URL}/sitemap-products.xml`,
  `${BASE_URL}/sitemap-guides.xml`,
  `${BASE_URL}/sitemap-blog.xml`,
];

/** IndexNow accepts at most 10,000 URLs in one POST. */
export const MAX_URLS_PER_POST = 10000;

/**
 * <loc>/<lastmod> pairs from a sitemap. Entries without a loc are skipped;
 * a missing lastmod becomes null, which selectChangedUrls treats as "no
 * evidence it changed" rather than as "changed".
 */
export function parseSitemapEntries(xml) {
  const entries = [];
  for (const block of String(xml).match(/<url>[\s\S]*?<\/url>/g) ?? []) {
    const loc = block.match(/<loc>([^<]*)<\/loc>/)?.[1]?.trim();
    if (!loc) continue;
    const lastmod = block.match(/<lastmod>([^<]*)<\/lastmod>/)?.[1]?.trim() ?? null;
    entries.push({ loc, lastmod: lastmod ? lastmod.slice(0, 10) : null });
  }
  return entries;
}

/**
 * Which URLs are worth telling IndexNow about.
 *
 * Two independent brakes, because the protocol treats needless resubmission as
 * spam and answers 429:
 *
 *  1. a recency window — a URL is a candidate only while its sitemap lastmod
 *     is within `windowDays` of today, so the whole corpus is never submitted
 *     just because a run happened;
 *  2. a ledger of what was already sent — url to the lastmod it was sent for.
 *     A URL whose lastmod has not moved since it was submitted is dropped, so
 *     repeated deployments inside one window do not resubmit it.
 *
 * A URL off-host is refused outright: IndexNow answers 422 for those, and
 * sending them would put the whole batch at risk.
 */
export function selectChangedUrls(entries, { ledger = {}, today, windowDays = 7 } = {}) {
  const todayMs = Date.parse(`${today}T00:00:00Z`);
  if (Number.isNaN(todayMs)) throw new Error(`today must be an ISO date, received ${today}`);
  const oldestMs = todayMs - windowDays * 86400000;
  const chosen = new Map();
  for (const { loc, lastmod } of entries) {
    if (!lastmod) continue;
    if (!loc.startsWith(`${BASE_URL}/`) && loc !== `${BASE_URL}/`) continue;
    const stampMs = Date.parse(`${lastmod}T00:00:00Z`);
    if (Number.isNaN(stampMs) || stampMs < oldestMs || stampMs > todayMs) continue;
    if (ledger[loc] === lastmod) continue;
    chosen.set(loc, lastmod);
  }
  return [...chosen.keys()].sort().slice(0, MAX_URLS_PER_POST);
}

/** The ledger to persist after a successful submission. */
export function nextLedger(previous, entries, submitted) {
  const byLoc = new Map(entries.map((e) => [e.loc, e.lastmod]));
  const next = { ...previous };
  for (const loc of submitted) {
    const lastmod = byLoc.get(loc);
    if (lastmod) next[loc] = lastmod;
  }
  return next;
}

export function buildSubmissionPayload(urls) {
  return {
    host: INDEXNOW_HOST,
    key: INDEXNOW_KEY,
    keyLocation: INDEXNOW_KEY_LOCATION,
    urlList: urls,
  };
}

/**
 * What each documented IndexNow status means, and whether it is fatal.
 * 200/202 are both success — 202 means the key is still being validated.
 * 429 is a throttle, not a defect: the sitemap remains the standing signal.
 */
export function describeIndexNowStatus(status) {
  switch (status) {
    case 200: return { ok: true, retryable: false, message: "URLs submitted and accepted" };
    case 202: return { ok: true, retryable: false, message: "URLs received, key validation pending" };
    case 400: return { ok: false, retryable: false, message: "Bad request: the payload is malformed" };
    case 403: return { ok: false, retryable: false, message: "Forbidden: the key file did not validate" };
    case 422: return { ok: false, retryable: false, message: "Unprocessable: a URL does not belong to this host" };
    case 429: return { ok: false, retryable: true, message: "Rate limited: too many submissions" };
    default: return { ok: false, retryable: false, message: `Unexpected status ${status}` };
  }
}
