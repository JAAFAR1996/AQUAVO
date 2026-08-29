// Tell IndexNow which AQUAVO URLs changed.
//
// This used to POST a frozen six-URL list — "/", one product, two guides,
// /shipping and /faq — written during an indexing-recovery push and never
// updated. It ran on every push to main, so it resubmitted those same six
// unchanged URLs over and over, which is the behaviour IndexNow answers 429
// to, while never submitting anything that had actually changed: the eleven
// category listings went live without a single notification.
//
// The list now comes from the sitemaps, which already carry the lastmod that
// says what changed and when. Selection lives in indexnow-core.mjs so it can
// be tested without the network.
//
// It lives in TOOLS/ rather than scripts/ because .gitignore excludes
// scripts/ outright — "may contain credentials — never commit" — so a new
// file there is invisible to git and would never reach CI.

import { readFile, writeFile } from "node:fs/promises";

import {
  INDEXNOW_ENDPOINT,
  INDEXNOW_KEY,
  INDEXNOW_KEY_LOCATION,
  SITEMAPS,
  buildSubmissionPayload,
  describeIndexNowStatus,
  nextLedger,
  parseSitemapEntries,
  selectChangedUrls,
} from "./indexnow-core.mjs";

const LEDGER_PATH = process.env.INDEXNOW_LEDGER ?? ".indexnow-ledger.json";
const WINDOW_DAYS = Number(process.env.INDEXNOW_WINDOW_DAYS ?? 7);
const DRY_RUN = process.env.INDEXNOW_DRY_RUN === "1";

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { "user-agent": "AQUAVO-IndexNow/2.0", accept: "application/xml, text/plain, */*;q=0.1" },
    redirect: "follow",
  });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.text();
}

// The key file is the only thing IndexNow checks before trusting a submission.
// If production is not serving it, or is serving a different key, every URL in
// the batch is rejected with 403 — so verify it first and fail loudly.
async function assertKeyIsLive() {
  const text = await fetchText(INDEXNOW_KEY_LOCATION);
  if (text.trim() !== INDEXNOW_KEY) {
    throw new Error(`${INDEXNOW_KEY_LOCATION} does not serve the configured key`);
  }
  console.log(`Key file verified at ${INDEXNOW_KEY_LOCATION}`);
}

async function readLedger() {
  try {
    return JSON.parse(await readFile(LEDGER_PATH, "utf8"));
  } catch {
    // No ledger yet, or an unreadable one. The recency window still bounds the
    // batch, so the worst case is one extra submission of recently changed
    // URLs rather than the whole corpus.
    return {};
  }
}

async function main() {
  await assertKeyIsLive();

  const entries = [];
  for (const sitemap of SITEMAPS) {
    const found = parseSitemapEntries(await fetchText(sitemap));
    console.log(`${sitemap}: ${found.length} URL(s)`);
    entries.push(...found);
  }

  const ledger = await readLedger();
  const today = new Date().toISOString().slice(0, 10);
  const urls = selectChangedUrls(entries, { ledger, today, windowDays: WINDOW_DAYS });

  if (urls.length === 0) {
    console.log("Nothing changed within the window that has not already been submitted.");
    return;
  }
  console.log(`Submitting ${urls.length} changed URL(s):`);
  for (const url of urls) console.log(`  ${url}`);

  if (DRY_RUN) {
    console.log("INDEXNOW_DRY_RUN=1, not calling the endpoint.");
    return;
  }

  const response = await fetch(INDEXNOW_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8", "user-agent": "AQUAVO-IndexNow/2.0" },
    body: JSON.stringify(buildSubmissionPayload(urls)),
  });
  const body = (await response.text()).slice(0, 500);
  const verdict = describeIndexNowStatus(response.status);
  console.log(`IndexNow HTTP ${response.status}: ${verdict.message}`);

  if (verdict.ok) {
    await writeFile(LEDGER_PATH, `${JSON.stringify(nextLedger(ledger, entries, urls), null, 2)}\n`, "utf8");
    console.log(`Ledger updated with ${urls.length} URL(s).`);
    return;
  }
  if (verdict.retryable) {
    // Not a failure worth breaking the deployment over: the sitemap is still
    // the standing signal, and the ledger is deliberately left untouched so
    // the next run retries these same URLs.
    console.warn("Leaving the ledger unchanged so the next run retries.");
    return;
  }
  throw new Error(`IndexNow submission failed with HTTP ${response.status}: ${body}`);
}

await main();
