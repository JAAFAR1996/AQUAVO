// FILE: scripts/seo/gsc-page-queries.ts
// The queries Google shows a given page for, with position and CTR — the
// input for rewriting that page's title and description around what people
// actually type. Same credentials as gsc-baseline.ts; read-only.
//
//   npx tsx scripts/seo/gsc-page-queries.ts /guides/filter-choice /guides/feeding-table --days 90

import { createSign } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";

const SITE = process.env.GSC_SITE_URL ?? "sc-domain:aquavoiq.com";
const BASE = "https://www.aquavoiq.com";
const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

interface ServiceAccount { client_email: string; private_key: string }
interface Row { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }

function loadServiceAccount(): ServiceAccount {
  const inline = process.env.GSC_SERVICE_ACCOUNT_JSON;
  const file = process.env.GSC_SERVICE_ACCOUNT_FILE ?? resolve(homedir(), ".aquavo", "gsc-service-account.json");
  const raw = inline ?? (existsSync(file) ? readFileSync(file, "utf8") : null);
  if (!raw) throw new Error(`No credentials at ${file}`);
  return JSON.parse(raw) as ServiceAccount;
}

async function accessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const enc = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const unsigned = `${enc({ alg: "RS256", typ: "JWT" })}.${enc({ iss: sa.client_email, scope: SCOPE, aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 })}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${signer.sign(sa.private_key).toString("base64url")}` }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);
  return ((await res.json()) as { access_token: string }).access_token;
}

async function main() {
  const args = process.argv.slice(2);
  const daysIdx = args.indexOf("--days");
  const days = daysIdx > -1 ? Number(args[daysIdx + 1]) : 90;
  const pages = args.filter((a, i) => !a.startsWith("--") && (daysIdx === -1 || i !== daysIdx + 1));
  if (pages.length === 0) throw new Error("Give at least one page path");

  const end = new Date(Date.now() - 3 * 86_400_000);
  const start = new Date(end.getTime() - (days - 1) * 86_400_000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const token = await accessToken(loadServiceAccount());

  for (const page of pages) {
    const url = page.startsWith("http") ? page : `${BASE}${page}`;
    const res = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/searchAnalytics/query`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({
        startDate: iso(start), endDate: iso(end), dimensions: ["query"], rowLimit: 40,
        dimensionFilterGroups: [{ filters: [{ dimension: "page", operator: "equals", expression: url }] }],
      }),
    });
    const rows = ((await res.json()) as { rows?: Row[] }).rows ?? [];
    const total = rows.reduce((a, r) => a + r.impressions, 0);
    console.log(`\n## ${page} — ${rows.length} queries, ${total} impressions (${iso(start)} → ${iso(end)})`);
    console.log("pos | imp | clicks | query");
    for (const r of rows) console.log(`${r.position.toFixed(1).padStart(4)} | ${String(r.impressions).padStart(3)} | ${String(r.clicks).padStart(3)} | ${r.keys[0]}`);
  }
}

main().catch((err: unknown) => { console.error(err instanceof Error ? err.message : err); process.exit(1); });
