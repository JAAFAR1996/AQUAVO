// FILE: scripts/seo/gsc-inspect.ts
// Asks Search Console's URL Inspection API how Google sees a set of URLs:
// indexed or not, why, which canonical it chose, and when it last crawled.
//
//   npx tsx scripts/seo/gsc-inspect.ts <url> [<url> ...]
//   npx tsx scripts/seo/gsc-inspect.ts --file urls.txt
//
// Same credentials as gsc-baseline.ts. Read-only; nothing is submitted.

import { createSign } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";

const SITE = process.env.GSC_SITE_URL ?? "sc-domain:aquavoiq.com";
const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

interface ServiceAccount { client_email: string; private_key: string; token_uri?: string }

function loadServiceAccount(): ServiceAccount {
  const inline = process.env.GSC_SERVICE_ACCOUNT_JSON;
  const file = process.env.GSC_SERVICE_ACCOUNT_FILE ?? resolve(homedir(), ".aquavo", "gsc-service-account.json");
  const raw = inline ?? (existsSync(file) ? readFileSync(file, "utf8") : null);
  if (!raw) throw new Error(`No credentials. Set GSC_SERVICE_ACCOUNT_JSON or put the service-account JSON at ${file}`);
  return JSON.parse(raw) as ServiceAccount;
}

async function accessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const enc = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const unsigned = `${enc({ alg: "RS256", typ: "JWT" })}.${enc({ iss: sa.client_email, scope: SCOPE, aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 })}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  const jwt = `${unsigned}.${signer.sign(sa.private_key).toString("base64url")}`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);
  return ((await res.json()) as { access_token: string }).access_token;
}

interface InspectResult {
  inspectionResult?: {
    indexStatusResult?: {
      verdict?: string; coverageState?: string; robotsTxtState?: string; indexingState?: string;
      lastCrawlTime?: string; pageFetchState?: string; googleCanonical?: string; userCanonical?: string; crawledAs?: string;
    };
  };
  error?: { message?: string };
}

async function inspect(token: string, url: string, attempt = 1): Promise<InspectResult> {
  try {
    const res = await fetch("https://searchconsole.googleapis.com/v1/urlInspection/index:inspect", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ inspectionUrl: url, siteUrl: SITE, languageCode: "ar" }),
    });
    return (await res.json()) as InspectResult;
  } catch (err) {
    // The endpoint drops the connection now and then mid-run; three tries with a pause is enough.
    if (attempt >= 3) throw err;
    await new Promise((r) => setTimeout(r, 1500 * attempt));
    return inspect(token, url, attempt + 1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const fileIdx = args.indexOf("--file");
  const urls = fileIdx > -1
    ? readFileSync(args[fileIdx + 1], "utf8").split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    : args;
  if (urls.length === 0) throw new Error("Give at least one URL or --file <list>");

  const token = await accessToken(loadServiceAccount());
  console.log("verdict | coverage | crawledAs | lastCrawl | googleCanonical==url | url");
  for (const url of urls) {
    const r = await inspect(token, url);
    if (r.error) { console.log(`ERROR | ${r.error.message} | ${url}`); continue; }
    const s = r.inspectionResult?.indexStatusResult ?? {};
    const canonicalMatch = s.googleCanonical ? (s.googleCanonical === url ? "yes" : `no → ${s.googleCanonical}`) : "-";
    console.log(`${s.verdict ?? "-"} | ${s.coverageState ?? "-"} | ${s.crawledAs ?? "-"} | ${(s.lastCrawlTime ?? "-").slice(0, 10)} | ${canonicalMatch} | ${url}`);
    // The API allows ~600 inspections/day per property; a short pause keeps bursts polite.
    await new Promise((r) => setTimeout(r, 400));
  }
}

main().catch((err: unknown) => { console.error(err instanceof Error ? err.message : err); process.exit(1); });
