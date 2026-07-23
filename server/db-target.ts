/**
 * Canonical database-target resolver.
 *
 * Single source of truth for "which database am I actually talking to?".
 *
 * Two hard rules encoded here:
 *
 *  1. AN EXPLICITLY SUPPLIED PROCESS ENVIRONMENT VARIABLE ALWAYS WINS over any
 *     local `.env` / `.env.local` file, for every key in
 *     `PROTECTED_DATABASE_ENV_KEYS`. Historically `server/env.ts` called
 *     `dotenv.config({ override: true })`, so a local `.env` pointing at the
 *     PRODUCTION Neon endpoint silently beat an operator-supplied child-branch
 *     `DATABASE_URL`. That is closed by `loadEnvFilesPreservingDatabaseTargets`.
 *
 *  2. RESOLUTION FAILS CLOSED. An unidentifiable target, a missing target, or a
 *     child-branch request that lands on production throws instead of
 *     connecting.
 *
 * Nothing in this module ever logs, returns or embeds credentials. Redacted
 * descriptions are rebuilt from parsed URL components (host / database /
 * endpoint id) — never by string-substituting a secret out of the raw URL.
 */

import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

// ─────────────────────────────────────────────────────────────────────────────
// Protected keys
// ─────────────────────────────────────────────────────────────────────────────

export const PROTECTED_DATABASE_ENV_KEYS = [
  "DATABASE_URL",
  "NEON_VERIFY_DATABASE_URL",
  "NEON_ROLLBACK_DATABASE_URL",
] as const;

export type ProtectedDatabaseEnvKey = (typeof PROTECTED_DATABASE_ENV_KEYS)[number];

export type DatabaseRole = "primary" | "verify" | "rollback";

export const ROLE_TO_ENV_KEY: Readonly<Record<DatabaseRole, ProtectedDatabaseEnvKey>> = {
  primary: "DATABASE_URL",
  verify: "NEON_VERIFY_DATABASE_URL",
  rollback: "NEON_ROLLBACK_DATABASE_URL",
};

/** Optional pins: when set, the resolved endpoint id MUST equal this exactly. */
const ROLE_TO_ENDPOINT_PIN_KEY: Readonly<Record<DatabaseRole, string>> = {
  primary: "NEON_PRIMARY_ENDPOINT_ID",
  verify: "NEON_VERIFY_ENDPOINT_ID",
  rollback: "NEON_ROLLBACK_ENDPOINT_ID",
};

// ─────────────────────────────────────────────────────────────────────────────
// Known identities (public identifiers only — never credentials)
// ─────────────────────────────────────────────────────────────────────────────

/** Neon PRODUCTION compute endpoint. Writing here from a child-branch task is the hazard. */
export const PRODUCTION_ENDPOINT_IDS: ReadonlySet<string> = new Set(["ep-quiet-moon-a4h7tdze"]);

/** Neon PRODUCTION branch id. */
export const PRODUCTION_BRANCH_IDS: ReadonlySet<string> = new Set(["br-patient-mouse-a4d4cgr4"]);

const LOCAL_DATABASE_HOSTS: ReadonlySet<string> = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "0.0.0.0",
]);

export type DatabaseEnvironmentType = "production" | "child-branch" | "local" | "unknown";

export type DatabaseTargetSource = "process" | "env-file" | "absent";

export interface ResolvedDatabaseTarget {
  readonly role: DatabaseRole;
  readonly envKey: ProtectedDatabaseEnvKey;
  /** The raw connection string. NEVER log this. */
  readonly url: string;
  readonly environmentType: DatabaseEnvironmentType;
  /** e.g. "ep-quiet-moon-a4h7tdze", or null for non-Neon/local hosts. */
  readonly endpointId: string | null;
  /** e.g. "br-round-dust-a4t0kt58" when carried in the connection options. */
  readonly branchId: string | null;
  readonly host: string;
  readonly database: string;
  /** Whether the value came from the inherited process env or from an env file. */
  readonly source: DatabaseTargetSource;
  /** Credential-free one-line description, safe to log. */
  readonly redactedLabel: string;
}

export class DatabaseTargetError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "DatabaseTargetError";
    this.code = code;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Inheritance protection
// ─────────────────────────────────────────────────────────────────────────────

export type EnvLike = Record<string, string | undefined>;

export type InheritedDatabaseTargets = Readonly<Partial<Record<ProtectedDatabaseEnvKey, string>>>;

/**
 * Snapshot the protected DB keys that were EXPLICITLY present in the process
 * environment. Must be called BEFORE any `dotenv.config()`.
 * Blank/whitespace-only values are treated as absent (an empty var is not an
 * explicit target and must not shadow an env file).
 */
export function captureInheritedDatabaseTargets(env: EnvLike = process.env): InheritedDatabaseTargets {
  const snapshot: Partial<Record<ProtectedDatabaseEnvKey, string>> = {};
  for (const key of PROTECTED_DATABASE_ENV_KEYS) {
    const value = env[key];
    if (typeof value === "string" && value.trim() !== "") {
      snapshot[key] = value;
    }
  }
  return snapshot;
}

/**
 * Re-assert the inherited process values after env files have been loaded.
 * Returns the keys that had actually been clobbered (useful for warning logs).
 */
export function restoreInheritedDatabaseTargets(
  env: EnvLike,
  snapshot: InheritedDatabaseTargets,
): ProtectedDatabaseEnvKey[] {
  const clobbered: ProtectedDatabaseEnvKey[] = [];
  for (const key of PROTECTED_DATABASE_ENV_KEYS) {
    const inherited = snapshot[key];
    if (inherited === undefined) continue;
    if (env[key] !== inherited) clobbered.push(key);
    env[key] = inherited;
  }
  return clobbered;
}

export interface LoadEnvFilesOptions {
  readonly env?: EnvLike;
  /** Env files in load order. Later files win for NON-database keys. */
  readonly files?: readonly string[];
  readonly cwd?: string;
  readonly logger?: (message: string) => void;
}

export interface LoadEnvFilesResult {
  readonly inherited: InheritedDatabaseTargets;
  /** Protected keys an env file tried to override but was not allowed to. */
  readonly clobberAttempts: ProtectedDatabaseEnvKey[];
  readonly loadedFiles: string[];
}

/**
 * Load `.env.local` then `.env` with `override: true` — deliberately preserved
 * for NON-database keys (see docs/audit/database-target-safety-remediation.md
 * §"Why override stays for non-DB keys") — and then restore any protected
 * database key that was explicitly inherited from the process environment.
 */
export function loadEnvFilesPreservingDatabaseTargets(
  options: LoadEnvFilesOptions = {},
): LoadEnvFilesResult {
  const env = options.env ?? process.env;
  const cwd = options.cwd ?? process.cwd();
  const files = options.files ?? [".env.local", ".env"];

  const inherited = captureInheritedDatabaseTargets(env);
  const loadedFiles: string[] = [];

  for (const file of files) {
    const abs = path.isAbsolute(file) ? file : path.join(cwd, file);
    if (!fs.existsSync(abs)) continue;
    // `processEnv` lets us target a caller-supplied env object in tests.
    dotenv.config({ path: abs, override: true, processEnv: env as NodeJS.ProcessEnv, quiet: true });
    loadedFiles.push(abs);
  }

  const clobberAttempts = restoreInheritedDatabaseTargets(env, inherited);

  if (clobberAttempts.length > 0) {
    const log = options.logger ?? ((m: string) => console.warn(m));
    log(
      `[DB-TARGET] Ignored env-file override for explicitly inherited ${clobberAttempts.join(", ")} ` +
        `— the process environment wins.`,
    );
  }

  return { inherited, clobberAttempts, loadedFiles };
}

// ─────────────────────────────────────────────────────────────────────────────
// Parsing & classification
// ─────────────────────────────────────────────────────────────────────────────

/** Extract the Neon compute endpoint id from a host, e.g. `ep-quiet-moon-a4h7tdze`. */
export function parseEndpointId(host: string): string | null {
  const firstLabel = host.toLowerCase().split(".")[0] ?? "";
  const withoutPooler = firstLabel.replace(/-pooler$/, "");
  return /^ep-[a-z0-9-]+$/.test(withoutPooler) ? withoutPooler : null;
}

/**
 * Neon supports pinning the endpoint/branch through the `options` query param,
 * e.g. `?options=endpoint%3Dep-xxx` or `project=`/`branch=`.
 */
function parseIdsFromSearch(search: URLSearchParams): { endpointId: string | null; branchId: string | null } {
  let endpointId: string | null = null;
  let branchId: string | null = null;
  const candidates = [search.get("options") ?? "", search.get("branch") ?? ""].join(" ");
  const ep = /\bendpoint=(ep-[a-z0-9-]+)/i.exec(candidates);
  if (ep) endpointId = ep[1].toLowerCase();
  const br = /\b(?:branch=)?(br-[a-z0-9-]+)/i.exec(candidates);
  if (br) branchId = br[1].toLowerCase();
  return { endpointId, branchId };
}

interface ParsedTarget {
  host: string;
  database: string;
  endpointId: string | null;
  branchId: string | null;
  environmentType: DatabaseEnvironmentType;
}

function parseTarget(url: string): ParsedTarget {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new DatabaseTargetError(
      "UNPARSEABLE_URL",
      "Database target could not be parsed as a URL. Refusing to connect (fail closed).",
    );
  }

  if (!/^postgres(ql)?:$/.test(parsed.protocol)) {
    throw new DatabaseTargetError(
      "UNSUPPORTED_PROTOCOL",
      `Database target uses unsupported protocol "${parsed.protocol}". Refusing to connect (fail closed).`,
    );
  }

  const host = parsed.hostname.toLowerCase();
  if (!host) {
    throw new DatabaseTargetError(
      "MISSING_HOST",
      "Database target has no host. Refusing to connect (fail closed).",
    );
  }

  const database = decodeURIComponent(parsed.pathname.replace(/^\//, "")) || "(default)";
  const fromSearch = parseIdsFromSearch(parsed.searchParams);
  const endpointId = parseEndpointId(host) ?? fromSearch.endpointId;
  const branchId = fromSearch.branchId;

  let environmentType: DatabaseEnvironmentType;
  if (LOCAL_DATABASE_HOSTS.has(host)) {
    environmentType = "local";
  } else if (
    (endpointId && PRODUCTION_ENDPOINT_IDS.has(endpointId)) ||
    (branchId && PRODUCTION_BRANCH_IDS.has(branchId))
  ) {
    environmentType = "production";
  } else if (endpointId) {
    environmentType = "child-branch";
  } else {
    environmentType = "unknown";
  }

  return { host, database, endpointId, branchId, environmentType };
}

/** Credential-free description. Built from parsed parts only — no secret can leak through. */
export function describeDatabaseTarget(target: {
  role?: DatabaseRole;
  envKey?: string;
  environmentType: DatabaseEnvironmentType;
  endpointId: string | null;
  branchId: string | null;
  host: string;
  database: string;
  source?: DatabaseTargetSource;
}): string {
  const hostLabel = target.endpointId
    ? `${target.endpointId}.<neon>`
    : target.host;
  return [
    target.role ? `role=${target.role}` : null,
    target.envKey ? `key=${target.envKey}` : null,
    `env=${target.environmentType}`,
    `endpoint=${target.endpointId ?? "n/a"}`,
    `branch=${target.branchId ?? "n/a"}`,
    `host=${hostLabel}`,
    `db=${target.database}`,
    target.source ? `source=${target.source}` : null,
  ]
    .filter(Boolean)
    .join(" ");
}

// ─────────────────────────────────────────────────────────────────────────────
// Resolution (fail closed)
// ─────────────────────────────────────────────────────────────────────────────

export interface ResolveOptions {
  readonly env?: EnvLike;
  /** Snapshot from `captureInheritedDatabaseTargets`, used to report the source. */
  readonly inherited?: InheritedDatabaseTargets;
  /** Reject a target that classifies as production. Implied for verify/rollback. */
  readonly requireNonProduction?: boolean;
  /** Allow `unknown` classification (only for deliberately non-Neon setups). */
  readonly allowUnknownEnvironment?: boolean;
}

/**
 * Resolve the connection target for a role, or throw.
 *
 * Fail-closed conditions:
 *   MISSING_TARGET        – env var absent or blank
 *   UNPARSEABLE_URL       – not a URL
 *   UNSUPPORTED_PROTOCOL  – not postgres(ql)://
 *   MISSING_HOST          – no host component
 *   UNIDENTIFIED_TARGET   – host is neither local nor a recognisable Neon endpoint
 *   PRODUCTION_TARGET     – a child-branch role (verify/rollback) or an explicit
 *                           requireNonProduction request resolved to production
 *   ENDPOINT_PIN_MISMATCH – NEON_*_ENDPOINT_ID pin does not match the resolved endpoint
 */
export function resolveDatabaseTarget(
  role: DatabaseRole,
  options: ResolveOptions = {},
): ResolvedDatabaseTarget {
  const env = options.env ?? process.env;
  const envKey = ROLE_TO_ENV_KEY[role];
  const raw = env[envKey];

  if (typeof raw !== "string" || raw.trim() === "") {
    throw new DatabaseTargetError(
      "MISSING_TARGET",
      `${envKey} is not set. Refusing to guess a database target (fail closed).`,
    );
  }

  const url = raw.trim();
  const parsed = parseTarget(url);

  if (parsed.environmentType === "unknown" && !options.allowUnknownEnvironment) {
    throw new DatabaseTargetError(
      "UNIDENTIFIED_TARGET",
      `${envKey} points at host "${parsed.host}" which is neither a local host nor a recognisable ` +
        `Neon endpoint. The runtime target cannot be identified — refusing to connect (fail closed).`,
    );
  }

  const mustBeNonProduction = options.requireNonProduction === true || role !== "primary";
  if (mustBeNonProduction && parsed.environmentType === "production") {
    throw new DatabaseTargetError(
      "PRODUCTION_TARGET",
      `${envKey} resolved to the PRODUCTION endpoint (${parsed.endpointId ?? parsed.host}) but a ` +
        `non-production (child-branch) target was requested for role "${role}". Refusing to connect ` +
        `(fail closed).`,
    );
  }

  const pin = env[ROLE_TO_ENDPOINT_PIN_KEY[role]]?.trim();
  if (pin && pin !== parsed.endpointId) {
    throw new DatabaseTargetError(
      "ENDPOINT_PIN_MISMATCH",
      `${ROLE_TO_ENDPOINT_PIN_KEY[role]} pins endpoint "${pin}" but ${envKey} resolved to ` +
        `"${parsed.endpointId ?? "n/a"}". Refusing to connect (fail closed).`,
    );
  }

  const inherited = options.inherited;
  const source: DatabaseTargetSource = inherited && inherited[envKey] === raw ? "process" : "env-file";

  const base = {
    role,
    envKey,
    environmentType: parsed.environmentType,
    endpointId: parsed.endpointId,
    branchId: parsed.branchId,
    host: parsed.host,
    database: parsed.database,
    source,
  };

  return { ...base, url, redactedLabel: describeDatabaseTarget(base) };
}

/**
 * Test-run guard: assert that a suite claiming to exercise Verify/Rollback is
 * genuinely pointed at a non-production child branch.
 */
export function assertNonProductionTarget(
  role: DatabaseRole,
  options: ResolveOptions = {},
): ResolvedDatabaseTarget {
  return resolveDatabaseTarget(role, { ...options, requireNonProduction: true });
}

/** Startup log — redacted, never contains credentials. */
export function logResolvedDatabaseTarget(
  target: ResolvedDatabaseTarget,
  logger: (message: string) => void = (m) => console.log(m),
): void {
  logger(`[DB-TARGET] ${target.redactedLabel}`);
}
