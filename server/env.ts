import dotenv from "dotenv";
const REMOTE_DATABASE_DEV_OPT_IN = "ALLOW_REMOTE_DATABASE_IN_DEV";
const shellRemoteDatabaseDevOptIn = process.env[REMOTE_DATABASE_DEV_OPT_IN];

dotenv.config({ path: ".env.local", override: true });
dotenv.config({ override: true });

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
