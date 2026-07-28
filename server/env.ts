/**
 * Process bootstrap: load env files, then resolve + log the database target.
 *
 * IMPORTANT ORDERING: `loadEnvFilesPreservingDatabaseTargets()` snapshots the
 * inherited process environment BEFORE dotenv runs, then re-asserts the
 * protected database keys afterwards. `override: true` is still applied to all
 * other keys (deliberate — local `.env` is the developer's source of truth for
 * API keys, ports, flags), but a database target supplied on the command line
 * or by a parent process can no longer be silently replaced by `.env`.
 */
import {
  loadEnvFilesPreservingDatabaseTargets,
  resolveDatabaseTarget,
  logResolvedDatabaseTarget,
  DatabaseTargetError,
} from "./db-target.js";

const REMOTE_DATABASE_DEV_OPT_IN = "ALLOW_REMOTE_DATABASE_IN_DEV";
const shellRemoteDatabaseDevOptIn = process.env[REMOTE_DATABASE_DEV_OPT_IN];

const envLoad = loadEnvFilesPreservingDatabaseTargets();

const LOCAL_DATABASE_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "0.0.0.0",
]);

function isEnabled(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

function databaseUrlAppearsRemote(databaseUrl: string): boolean {
  try {
    const parsed = new URL(databaseUrl);
    const hostname = parsed.hostname.toLowerCase();
    return Boolean(hostname) && !LOCAL_DATABASE_HOSTS.has(hostname);
  } catch {
    return false;
  }
}

function assertSafeDevelopmentDatabase(): void {
  const isProduction = process.env.NODE_ENV === "production";
  const isTest = process.env.NODE_ENV === "test";
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (isProduction || isTest || !databaseUrl) return;
  if (!databaseUrlAppearsRemote(databaseUrl)) return;
  if (isEnabled(shellRemoteDatabaseDevOptIn) || isEnabled(process.env[REMOTE_DATABASE_DEV_OPT_IN])) return;

  throw new Error(
    [
      "Local dev/browser QA startup blocked: DATABASE_URL appears remote or Neon-like.",
      "Use a local/staging database, unset DATABASE_URL for mock storage,",
      `or explicitly set ${REMOTE_DATABASE_DEV_OPT_IN}=true only for a known safe staging/test database.`,
      "Never opt in with a production database.",
    ].join(" ")
  );
}

assertSafeDevelopmentDatabase();

/**
 * Identify and log the resolved target at startup (redacted).
 *
 * Fail-closed: if DATABASE_URL is set but its target cannot be identified, we
 * throw rather than connect to an unknown database. A completely unset
 * DATABASE_URL stays non-fatal — the app deliberately falls back to in-memory
 * mock storage in that case (see server/db.ts).
 */
function announceDatabaseTarget(): void {
  if (!process.env.DATABASE_URL?.trim()) return;
  try {
    const target = resolveDatabaseTarget("primary", {
      inherited: envLoad.inherited,
      // Documented escape hatch for self-hosted / container Postgres whose host
      // is not a Neon endpoint. Must be set deliberately.
      allowUnknownEnvironment:
        process.env.ALLOW_UNIDENTIFIED_DATABASE_TARGET?.trim().toLowerCase() === "true",
    });
    logResolvedDatabaseTarget(target);
    if (target.environmentType === "production" && process.env.NODE_ENV !== "production") {
      console.warn(
        "[DB-TARGET] WARNING: connected to the PRODUCTION database while NODE_ENV is " +
          `"${process.env.NODE_ENV ?? "development"}".`,
      );
    }
  } catch (error) {
    if (error instanceof DatabaseTargetError) {
      throw new Error(`[DB-TARGET] ${error.code}: ${error.message}`);
    }
    throw error;
  }
}

announceDatabaseTarget();

export { envLoad };
