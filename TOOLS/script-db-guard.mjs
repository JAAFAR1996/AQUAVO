// TRACKED database-target guard for one-off scripts (migrations, backfills, audits).
//
// WHY THIS EXISTS
// ---------------
// The `scripts/`, `script/` and `scratch/` directories are gitignored on purpose
// (see .gitignore: "One-off DB scripts (may contain credentials — never commit)").
// That is the right call for secret-safety, but it means the SAFETY logic those
// scripts rely on — "never let a local .env silently re-point me at PRODUCTION" —
// used to live only inside each machine's untracked copy. Three `override:true`
// fixes made earlier therefore existed on exactly one developer's disk.
//
// The canonical resolver `server/db-target.ts` already encodes the two hard rules
// (inherited process env wins over .env; resolution fails closed). But it is a
// TypeScript module with `.js` ESM specifiers, so a plain-node `.mjs` script
// cannot import it. This file is the JS-consumable projection of that same policy,
// so the guard is now TRACKED and reviewed rather than per-machine.
//
// The production identifiers below MUST stay in sync with server/db-target.ts.
//
// USAGE (write-capable script):
//   import { resolveScriptDatabaseUrl } from "../TOOLS/script-db-guard.mjs";
//   const { url, redactedLabel } = resolveScriptDatabaseUrl({ mode: "migrate" });
//   console.log(`[migrate] target: ${redactedLabel}`); // never logs the URL
//   const sql = neon(url);
//
// In "migrate" / "verify" mode a production target is REJECTED outright.
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

// Keep in sync with server/db-target.ts.
export const PRODUCTION_ENDPOINT_IDS = new Set(["ep-quiet-moon-a4h7tdze"]);
export const PRODUCTION_BRANCH_IDS = new Set(["br-patient-mouse-a4d4cgr4"]);
const LOCAL_DATABASE_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);
const PROTECTED_KEYS = ["DATABASE_URL", "NEON_VERIFY_DATABASE_URL", "NEON_ROLLBACK_DATABASE_URL"];

export class ScriptDatabaseTargetError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ScriptDatabaseTargetError";
    this.code = code;
  }
}

/** Snapshot explicitly-inherited protected keys BEFORE dotenv runs. */
function captureInherited(env) {
  const snap = {};
  for (const k of PROTECTED_KEYS) {
    const v = env[k];
    if (typeof v === "string" && v.trim() !== "") snap[k] = v;
  }
  return snap;
}

/**
 * Load .env.local then .env with override:true for NON-database keys, then
 * re-assert any protected DB key that was explicitly inherited from the shell.
 * Mirrors loadEnvFilesPreservingDatabaseTargets() in server/db-target.ts.
 */
export function loadEnvPreservingTargets({ env = process.env, cwd = process.cwd(), files = [".env.local", ".env"] } = {}) {
  const inherited = captureInherited(env);
  for (const file of files) {
    const abs = path.isAbsolute(file) ? file : path.join(cwd, file);
    if (!fs.existsSync(abs)) continue;
    dotenv.config({ path: abs, override: true, processEnv: env, quiet: true });
  }
  const clobbered = [];
  for (const k of PROTECTED_KEYS) {
    if (inherited[k] === undefined) continue;
    if (env[k] !== inherited[k]) clobbered.push(k);
    env[k] = inherited[k];
  }
  if (clobbered.length) {
    console.warn(`[DB-TARGET] Ignored env-file override for inherited ${clobbered.join(", ")} — the process environment wins.`);
  }
  return { inherited, clobbered };
}

function parseEndpointId(host) {
  const first = host.toLowerCase().split(".")[0] ?? "";
  const withoutPooler = first.replace(/-pooler$/, "");
  return /^ep-[a-z0-9-]+$/.test(withoutPooler) ? withoutPooler : null;
}

function parseIdsFromSearch(search) {
  const candidates = [search.get("options") ?? "", search.get("branch") ?? ""].join(" ");
  const ep = /\bendpoint=(ep-[a-z0-9-]+)/i.exec(candidates);
  const br = /\b(?:branch=)?(br-[a-z0-9-]+)/i.exec(candidates);
  return { endpointId: ep ? ep[1].toLowerCase() : null, branchId: br ? br[1].toLowerCase() : null };
}

/** Classify a raw connection string. Never returns or logs the secret. */
export function classifyTarget(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new ScriptDatabaseTargetError("UNPARSEABLE_URL", "DATABASE_URL is not a valid URL. Refusing (fail closed).");
  }
  if (!/^postgres(ql)?:$/.test(parsed.protocol)) {
    throw new ScriptDatabaseTargetError("UNSUPPORTED_PROTOCOL", `Unsupported protocol "${parsed.protocol}". Refusing (fail closed).`);
  }
  const host = parsed.hostname.toLowerCase();
  if (!host) throw new ScriptDatabaseTargetError("MISSING_HOST", "DATABASE_URL has no host. Refusing (fail closed).");
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, "")) || "(default)";
  const fromSearch = parseIdsFromSearch(parsed.searchParams);
  const endpointId = parseEndpointId(host) ?? fromSearch.endpointId;
  const branchId = fromSearch.branchId;

  let environmentType;
  if (LOCAL_DATABASE_HOSTS.has(host)) environmentType = "local";
  else if ((endpointId && PRODUCTION_ENDPOINT_IDS.has(endpointId)) || (branchId && PRODUCTION_BRANCH_IDS.has(branchId))) environmentType = "production";
  else if (endpointId) environmentType = "child-branch";
  else environmentType = "unknown";

  const redactedLabel = `${environmentType} · host=${host} · db=${database}` +
    `${endpointId ? ` · endpoint=${endpointId}` : ""}${branchId ? ` · branch=${branchId}` : ""}`;
  return { host, database, endpointId, branchId, environmentType, redactedLabel };
}

/**
 * Resolve the write target for a script. Loads env (preserving inherited
 * targets), classifies, and FAILS CLOSED.
 *
 * @param {object} opts
 * @param {"migrate"|"verify"|"read"|"write"} [opts.mode="write"]
 *        migrate/verify REJECT production; read/write reject unknown/unparseable.
 * @param {string}  [opts.key="DATABASE_URL"] which protected key to resolve.
 * @param {boolean} [opts.allowProduction=false] explicit, deliberate override for
 *        the rare intentional production write (must be paired with a human).
 * @param {boolean} [opts.allowUnknown=false] permit non-Neon self-hosted hosts.
 * @returns {{ url: string, redactedLabel: string, environmentType: string }}
 */
export function resolveScriptDatabaseUrl(opts = {}) {
  const { mode = "write", key = "DATABASE_URL", allowProduction = false, allowUnknown = false } = opts;
  loadEnvPreservingTargets();
  const url = process.env[key]?.trim();
  if (!url) throw new ScriptDatabaseTargetError("NO_TARGET", `${key} is not set. Refusing (fail closed).`);

  const t = classifyTarget(url);

  if (t.environmentType === "production" && !allowProduction) {
    throw new ScriptDatabaseTargetError(
      "PRODUCTION_REJECTED",
      `Refusing to run a ${mode} script against PRODUCTION (${t.redactedLabel}). ` +
        `Point ${key} at a child branch, or pass allowProduction:true only with explicit human sign-off.`,
    );
  }
  if (t.environmentType === "unknown" && !allowUnknown) {
    throw new ScriptDatabaseTargetError(
      "UNIDENTIFIED_TARGET",
      `${key} host could not be identified as local/child-branch/production (${t.redactedLabel}). ` +
        `Refusing (fail closed). Pass allowUnknown:true for a known self-hosted Postgres.`,
    );
  }
  return { url, redactedLabel: t.redactedLabel, environmentType: t.environmentType };
}
