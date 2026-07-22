#!/usr/bin/env node
/**
 * Transparent, reviewed, READ-ONLY admin audit for AQUAVO.
 *
 * This script logs into the admin panel and READS financial screens to produce a
 * redacted audit log. It is deliberately incapable of changing anything:
 *   - the ONLY form it submits is the login form;
 *   - it navigates by URL and clicks ONLY tab headers ([role="tab"]);
 *   - it never clicks create/edit/confirm/refund/cancel/delete controls;
 *   - it refuses to run unless ADMIN_AUDIT_READ_ONLY=true;
 *   - it only targets whitelisted AQUAVO domains;
 *   - it redacts PII, never prints credentials/cookies/tokens/auth headers;
 *   - it writes output OUTSIDE the git repo and clears browser state afterward.
 *
 * Credentials and target are provided ONLY via environment variables — never args,
 * never hardcoded:
 *   ADMIN_AUDIT_URL         e.g. https://www.aquavoiq.com
 *   ADMIN_AUDIT_EMAIL       admin email
 *   ADMIN_AUDIT_PASSWORD    admin password
 *   ADMIN_AUDIT_READ_ONLY   must be exactly "true"
 *   ADMIN_AUDIT_OUT         (optional) output dir; MUST be outside the repo.
 *                           Defaults to the OS temp dir.
 *
 * See docs/audit/read-only-admin-audit.md for the exact owner-run command.
 */
import { chromium } from "@playwright/test";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const ALLOWED_HOSTS = ["aquavoiq.com", "www.aquavoiq.com"]; // prod/preview whitelist

function fail(msg) { console.error("REFUSING TO RUN: " + msg); process.exit(2); }

// ---- guards -------------------------------------------------------------
if (process.env.ADMIN_AUDIT_READ_ONLY !== "true") {
  fail("ADMIN_AUDIT_READ_ONLY must be exactly 'true' (explicit read-only acknowledgement).");
}
const URL_STR = process.env.ADMIN_AUDIT_URL;
const EMAIL = process.env.ADMIN_AUDIT_EMAIL;
const PASSWORD = process.env.ADMIN_AUDIT_PASSWORD;
if (!URL_STR || !EMAIL || !PASSWORD) {
  fail("Set ADMIN_AUDIT_URL, ADMIN_AUDIT_EMAIL and ADMIN_AUDIT_PASSWORD in the environment (no defaults).");
}
let host;
try { host = new URL(URL_STR).hostname.toLowerCase(); } catch { fail("ADMIN_AUDIT_URL is not a valid URL."); }
if (!ALLOWED_HOSTS.some((h) => host === h || host.endsWith("." + h))) {
  fail(`Host '${host}' is not a whitelisted AQUAVO domain (${ALLOWED_HOSTS.join(", ")}).`);
}

// Output MUST live outside the git repo (never commit audit artifacts).
let OUT = process.env.ADMIN_AUDIT_OUT;
if (OUT) {
  OUT = resolve(OUT);
  if (OUT === REPO_ROOT || OUT.startsWith(REPO_ROOT + sep)) {
    fail("ADMIN_AUDIT_OUT must be OUTSIDE the repository (audit artifacts must never be committed).");
  }
  mkdirSync(OUT, { recursive: true });
} else {
  OUT = mkdtempSync(join(tmpdir(), "aquavo-admin-audit-"));
}

// ---- redaction ----------------------------------------------------------
const redact = (s) => !s ? s : String(s)
  .replace(/07[0-9]{9}/g, "[PHONE]")
  .replace(/\+?964[0-9]{9,10}/g, "[PHONE]")
  .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[EMAIL]");

const BASE = new URL(URL_STR).origin;
const apiLog = [];      // { method, path, status } — headers are NEVER captured
const visited = [];
const report = { base: BASE, startedAt: new Date().toISOString(), login: null, screens: [], api: apiLog };

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

// record ONLY method/path/status of API responses — no headers, no bodies.
page.on("response", (resp) => {
  const u = resp.url();
  if (!u.includes("/api/")) return;
  apiLog.push({ method: resp.request().method(), path: u.replace(BASE, ""), status: resp.status() });
});

async function snapshot(tag, { screenshot = false } = {}) {
  await page.waitForTimeout(2000);
  let title = null, text = null, err = null;
  try {
    title = await page.title();
    text = redact((await page.evaluate(() => document.body.innerText)).slice(0, 6000));
  } catch (e) { err = String(e).slice(0, 160); }
  visited.push(page.url().replace(BASE, ""));
  report.screens.push({ tag, url: page.url().replace(BASE, ""), title, text, err });
  if (screenshot) { try { await page.screenshot({ path: join(OUT, `screen-${tag}.png`) }); } catch {} }
}

try {
  // ---- login (the ONLY form submission this script performs) ----
  await page.goto(BASE + "/admin/login", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.locator('input[type="email"]').first().fill(EMAIL);
  await page.locator('input[type="password"]').first().fill(PASSWORD);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(4000);
  const loggedIn = !page.url().includes("/admin/login");
  report.login = { loggedIn, landedOn: page.url().replace(BASE, "") };
  console.log("LOGIN:", loggedIn ? "SUCCESS" : "FAILED (credentials rejected)");

  if (loggedIn) {
    // read-only navigation of financial screens (URLs only, no action buttons)
    for (const [tag, path] of [["dashboard", "/admin"], ["finance", "/admin/finance"]]) {
      await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 30000 });
      await snapshot(tag, { screenshot: true });
    }
    // click ONLY tab headers within finance (never action controls)
    const tabs = await page.locator('[role="tab"]').all();
    for (let i = 0; i < tabs.length; i++) {
      try {
        const t = page.locator('[role="tab"]').nth(i);
        const name = (await t.innerText()).trim().replace(/\s+/g, "-").slice(0, 24) || String(i);
        await t.click();
        await snapshot("fin-" + name);
      } catch { /* skip unreadable tab */ }
    }
  }
} finally {
  // clear all browser state/cookies, then tear down.
  try { await ctx.clearCookies(); } catch {}
  try { await ctx.clearPermissions(); } catch {}
  await ctx.close();
  await browser.close();
}

report.finishedAt = new Date().toISOString();
writeFileSync(join(OUT, "audit-data.json"), JSON.stringify(report, null, 2));
// summary — no credentials/cookies/tokens/headers are ever printed
console.log("Pages visited:", visited.join(", ") || "(none)");
console.log("API responses read:", apiLog.length);
console.log("Redacted audit written to:", OUT);
console.log("DONE (read-only).");
