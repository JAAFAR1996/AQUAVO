// FILE: scripts/seo/gsc-baseline.ts
// Records where aquavoiq.com stands in Google Search today, from Search Console itself.
//
//   npx tsx scripts/seo/gsc-baseline.ts            # last 28 complete days
//   npx tsx scripts/seo/gsc-baseline.ts --days 90
//
// Credentials: a service account added to the Search Console property with
// Full permission. Read from GSC_SERVICE_ACCOUNT_JSON (the JSON text) or from
// the file GSC_SERVICE_ACCOUNT_FILE (default ~/.aquavo/gsc-service-account.json).
// The key is never logged and never written anywhere by this script.
//
// Output: reports/seo/gsc-baseline-<date>.json and .md — top queries, top
// pages, and the position for every keyword in scripts/seo/target-keywords.json.
// No dependencies beyond Node: the Google OAuth JWT is signed with node:crypto.

import { createSign } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";

const SITE = process.env.GSC_SITE_URL ?? "sc-domain:aquavoiq.com";
const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

interface ServiceAccount { client_email: string; private_key: string; token_uri?: string }
interface Row { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }

function loadServiceAccount(): ServiceAccount {
  const inline = process.env.GSC_SERVICE_ACCOUNT_JSON;
  const file = process.env.GSC_SERVICE_ACCOUNT_FILE ?? resolve(homedir(), ".aquavo", "gsc-service-account.json");
  const raw = inline ?? (existsSync(file) ? readFileSync(file, "utf8") : null);
  if (!raw) {
    throw new Error(`No credentials. Set GSC_SERVICE_ACCOUNT_JSON or put the service-account JSON at ${file}`);
  }
  const parsed = JSON.parse(raw) as Partial<ServiceAccount>;
  if (!parsed.client_email || !parsed.private_key) throw new Error("Service-account JSON is missing client_email/private_key");
  return parsed as ServiceAccount;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

async function accessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: SCOPE,
    aud: sa.token_uri ?? "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const jwt = `${header}.${claims}.${b64url(signer.sign(sa.private_key))}`;

  const res = await fetch(sa.token_uri ?? "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

async function query(token: string, body: Record<string, unknown>): Promise<Row[]> {
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/searchAnalytics/query`;
  const res = await fetch(url, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Search Analytics ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = (await res.json()) as { rows?: Row[] };
  return json.rows ?? [];
}

/** Arabic search strings vary in hamza/ta-marbuta/diacritics; compare on a normalised form. */
function normalizeAr(s: string): string {
  return s
    .toLowerCase()
    .replace(/[ً-ْـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ")
    .trim();
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function main() {
  const daysArg = process.argv.indexOf("--days");
  const days = daysArg > -1 ? Number(process.argv[daysArg + 1]) : 28;
  // Search Console data lags ~2 days; end the window before the lag.
  const end = new Date(Date.now() - 3 * 86_400_000);
  const start = new Date(end.getTime() - (days - 1) * 86_400_000);
  const range = { startDate: isoDate(start), endDate: isoDate(end) };

  const sa = loadServiceAccount();
  console.log(`Authenticating as ${sa.client_email.replace(/^(.{4}).*(@.*)$/, "$1…$2")} for ${SITE}`);
  const token = await accessToken(sa);

  // 1. Connection check + totals
  const totals = await query(token, { ...range, dimensions: [] });
  const t = totals[0] ?? { clicks: 0, impressions: 0, ctr: 0, position: 0, keys: [] };
  console.log(`Connected. ${range.startDate} → ${range.endDate}: ${t.clicks} clicks, ${t.impressions} impressions, avg position ${t.position.toFixed(1)}`);

  // 2. Top queries and pages (Iraq only and worldwide)
  const [queriesIQ, queriesAll, pages] = await Promise.all([
    query(token, { ...range, dimensions: ["query"], rowLimit: 500, dimensionFilterGroups: [{ filters: [{ dimension: "country", operator: "equals", expression: "irq" }] }] }),
    query(token, { ...range, dimensions: ["query"], rowLimit: 500 }),
    query(token, { ...range, dimensions: ["page"], rowLimit: 200 }),
  ]);

  // 3. Target keyword positions, matched on normalised Arabic
  const targets = JSON.parse(readFileSync(resolve("scripts/seo/target-keywords.json"), "utf8")) as Record<string, string[]>;
  const byQuery = new Map<string, Row>();
  for (const r of queriesAll) byQuery.set(normalizeAr(r.keys[0]), r);
  const targetRows = Object.entries(targets)
    .filter(([k]) => !k.startsWith("_"))
    .flatMap(([group, list]) => list.map((kw) => {
      const hit = byQuery.get(normalizeAr(kw));
      return { group, keyword: kw, position: hit ? Number(hit.position.toFixed(1)) : null, impressions: hit?.impressions ?? 0, clicks: hit?.clicks ?? 0 };
    }));

  const report = {
    site: SITE,
    generatedAt: new Date().toISOString(),
    range,
    totals: { clicks: t.clicks, impressions: t.impressions, ctr: t.ctr, position: t.position },
    targets: targetRows,
    topQueriesIraq: queriesIQ.slice(0, 100).map((r) => ({ query: r.keys[0], clicks: r.clicks, impressions: r.impressions, position: Number(r.position.toFixed(1)) })),
    topQueriesAll: queriesAll.slice(0, 100).map((r) => ({ query: r.keys[0], clicks: r.clicks, impressions: r.impressions, position: Number(r.position.toFixed(1)) })),
    topPages: pages.slice(0, 100).map((r) => ({ page: r.keys[0], clicks: r.clicks, impressions: r.impressions, position: Number(r.position.toFixed(1)) })),
  };

  mkdirSync("reports/seo", { recursive: true });
  const stamp = isoDate(new Date());
  writeFileSync(`reports/seo/gsc-baseline-${stamp}.json`, JSON.stringify(report, null, 2));

  const seen = targetRows.filter((r) => r.position !== null);
  const md = [
    `# GSC baseline — ${stamp}`,
    ``,
    `Property: \`${SITE}\` · Window: ${range.startDate} → ${range.endDate} (${days} days)`,
    ``,
    `| Clicks | Impressions | CTR | Avg position |`,
    `|---|---|---|---|`,
    `| ${t.clicks} | ${t.impressions} | ${(t.ctr * 100).toFixed(1)}% | ${t.position.toFixed(1)} |`,
    ``,
    `## Target keywords (${seen.length}/${targetRows.length} have any impressions)`,
    ``,
    `| Group | Keyword | Position | Impressions | Clicks |`,
    `|---|---|---|---|---|`,
    ...targetRows.map((r) => `| ${r.group} | ${r.keyword} | ${r.position ?? "—"} | ${r.impressions} | ${r.clicks} |`),
    ``,
    `## Top 30 queries from Iraq`,
    ``,
    `| Query | Position | Impressions | Clicks |`,
    `|---|---|---|---|`,
    ...report.topQueriesIraq.slice(0, 30).map((r) => `| ${r.query} | ${r.position} | ${r.impressions} | ${r.clicks} |`),
    ``,
    `## Top 20 pages`,
    ``,
    `| Page | Position | Impressions | Clicks |`,
    `|---|---|---|---|`,
    ...report.topPages.slice(0, 20).map((r) => `| ${r.page.replace("https://www.aquavoiq.com", "")} | ${r.position} | ${r.impressions} | ${r.clicks} |`),
    ``,
  ].join("\n");
  writeFileSync(`reports/seo/gsc-baseline-${stamp}.md`, md);
  console.log(`Wrote reports/seo/gsc-baseline-${stamp}.{json,md}`);
  console.log(`Target keywords with impressions: ${seen.length}/${targetRows.length}; top-3: ${seen.filter((r) => (r.position ?? 99) <= 3).length}; page-1: ${seen.filter((r) => (r.position ?? 99) <= 10).length}`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
