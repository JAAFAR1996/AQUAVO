/**
 * Regression tests for the database-target safety invariant (finding N-2).
 *
 * INVARIANT: an explicitly supplied PROCESS environment variable must ALWAYS
 * beat any local `.env` / `.env.local` file, for DATABASE_URL,
 * NEON_VERIFY_DATABASE_URL and NEON_ROLLBACK_DATABASE_URL.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

import {
  PROTECTED_DATABASE_ENV_KEYS,
  captureInheritedDatabaseTargets,
  restoreInheritedDatabaseTargets,
  loadEnvFilesPreservingDatabaseTargets,
  resolveDatabaseTarget,
  assertNonProductionTarget,
  describeDatabaseTarget,
  logResolvedDatabaseTarget,
  parseEndpointId,
  DatabaseTargetError,
  type EnvLike,
} from "../db-target.js";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// Fake credentials — these are not real secrets, they exist so the tests can
// assert that credentials never reach a log line.
const SECRET = "sup3rs3cr3t-pw";
const PROD_URL = `postgresql://neondb_owner:${SECRET}@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require`;
const VERIFY_URL = `postgresql://neondb_owner:${SECRET}@ep-verify-child-a4t0kt58-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require`;
const ROLLBACK_URL = `postgresql://neondb_owner:${SECRET}@ep-rollback-child-a4rb0000-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require`;

let tmpDir: string;

function writeEnvFiles(files: Record<string, string>): void {
  for (const [name, body] of Object.entries(files)) {
    fs.writeFileSync(path.join(tmpDir, name), body, "utf8");
  }
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "db-target-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("process env beats .env for database targets", () => {
  it("inherited DATABASE_URL wins over .env", () => {
    writeEnvFiles({ ".env": `DATABASE_URL=${PROD_URL}\nAPI_KEY=from-env-file\n` });
    const env: EnvLike = { DATABASE_URL: VERIFY_URL, API_KEY: "from-process" };

    const result = loadEnvFilesPreservingDatabaseTargets({ env, cwd: tmpDir, logger: () => {} });

    expect(env.DATABASE_URL).toBe(VERIFY_URL);
    expect(result.clobberAttempts).toContain("DATABASE_URL");
    // Deliberate: non-database keys keep the historical override behaviour.
    expect(env.API_KEY).toBe("from-env-file");
  });

  it("inherited NEON_VERIFY_DATABASE_URL wins over .env", () => {
    writeEnvFiles({ ".env": `NEON_VERIFY_DATABASE_URL=${PROD_URL}\n` });
    const env: EnvLike = { NEON_VERIFY_DATABASE_URL: VERIFY_URL };

    loadEnvFilesPreservingDatabaseTargets({ env, cwd: tmpDir, logger: () => {} });

    expect(env.NEON_VERIFY_DATABASE_URL).toBe(VERIFY_URL);
  });

  it("inherited NEON_ROLLBACK_DATABASE_URL wins over .env", () => {
    writeEnvFiles({ ".env": `NEON_ROLLBACK_DATABASE_URL=${PROD_URL}\n` });
    const env: EnvLike = { NEON_ROLLBACK_DATABASE_URL: ROLLBACK_URL };

    loadEnvFilesPreservingDatabaseTargets({ env, cwd: tmpDir, logger: () => {} });

    expect(env.NEON_ROLLBACK_DATABASE_URL).toBe(ROLLBACK_URL);
  });

  it("inherited value also wins over .env.local, which is loaded first", () => {
    writeEnvFiles({
      ".env.local": `DATABASE_URL=${PROD_URL}\n`,
      ".env": `DATABASE_URL=${PROD_URL}\n`,
    });
    const env: EnvLike = { DATABASE_URL: VERIFY_URL };

    loadEnvFilesPreservingDatabaseTargets({ env, cwd: tmpDir, logger: () => {} });

    expect(env.DATABASE_URL).toBe(VERIFY_URL);
  });

  it("falls back to the .env value when nothing was inherited", () => {
    writeEnvFiles({ ".env": `DATABASE_URL=${VERIFY_URL}\n` });
    const env: EnvLike = {};

    const result = loadEnvFilesPreservingDatabaseTargets({ env, cwd: tmpDir, logger: () => {} });

    expect(env.DATABASE_URL).toBe(VERIFY_URL);
    expect(result.clobberAttempts).toHaveLength(0);
  });

  it("treats a blank inherited value as absent (does not shadow the env file)", () => {
    writeEnvFiles({ ".env": `DATABASE_URL=${VERIFY_URL}\n` });
    const env: EnvLike = { DATABASE_URL: "   " };

    loadEnvFilesPreservingDatabaseTargets({ env, cwd: tmpDir, logger: () => {} });

    expect(env.DATABASE_URL).toBe(VERIFY_URL);
  });

  it("capture/restore protects every protected key", () => {
    const env: EnvLike = Object.fromEntries(
      PROTECTED_DATABASE_ENV_KEYS.map((k) => [k, `postgresql://u:p@ep-x-${k.toLowerCase()}.neon.tech/db`]),
    );
    const snapshot = captureInheritedDatabaseTargets(env);
    for (const key of PROTECTED_DATABASE_ENV_KEYS) env[key] = PROD_URL;

    const clobbered = restoreInheritedDatabaseTargets(env, snapshot);

    expect(clobbered.sort()).toEqual([...PROTECTED_DATABASE_ENV_KEYS].sort());
    for (const key of PROTECTED_DATABASE_ENV_KEYS) expect(env[key]).not.toBe(PROD_URL);
  });
});

describe("resolver fails closed", () => {
  it("rejects a production URL when a child-branch target was requested (verify)", () => {
    const env: EnvLike = { NEON_VERIFY_DATABASE_URL: PROD_URL };
    expect(() => resolveDatabaseTarget("verify", { env })).toThrowError(DatabaseTargetError);
    try {
      resolveDatabaseTarget("verify", { env });
    } catch (e) {
      expect((e as DatabaseTargetError).code).toBe("PRODUCTION_TARGET");
    }
  });

  it("rejects a production URL when a child-branch target was requested (rollback)", () => {
    const env: EnvLike = { NEON_ROLLBACK_DATABASE_URL: PROD_URL };
    expect(() => assertNonProductionTarget("rollback", { env })).toThrowError(/PRODUCTION/i);
  });

  it("rejects a production primary when requireNonProduction is set", () => {
    const env: EnvLike = { DATABASE_URL: PROD_URL };
    expect(() => resolveDatabaseTarget("primary", { env, requireNonProduction: true })).toThrowError(
      /PRODUCTION/i,
    );
    // ...but plain primary resolution of production is legitimate.
    expect(resolveDatabaseTarget("primary", { env }).environmentType).toBe("production");
  });

  it("detects production via the branch id carried in connection options", () => {
    const env: EnvLike = {
      NEON_VERIFY_DATABASE_URL: `postgresql://u:${SECRET}@ep-something-else-a1b2c3d4.neon.tech/neondb?options=project%3Dp%20branch%3Dbr-patient-mouse-a4d4cgr4`,
    };
    expect(() => resolveDatabaseTarget("verify", { env })).toThrowError(/PRODUCTION/i);
  });

  it("fails closed when the URL is missing", () => {
    expect(() => resolveDatabaseTarget("primary", { env: {} })).toThrowError(/not set/i);
    try {
      resolveDatabaseTarget("primary", { env: {} });
    } catch (e) {
      expect((e as DatabaseTargetError).code).toBe("MISSING_TARGET");
    }
  });

  it("fails closed when the URL is blank", () => {
    expect(() => resolveDatabaseTarget("verify", { env: { NEON_VERIFY_DATABASE_URL: "  " } })).toThrowError(
      /not set/i,
    );
  });

  it("fails closed when the runtime target cannot be identified", () => {
    const env: EnvLike = { DATABASE_URL: `postgresql://u:${SECRET}@db.some-unknown-host.example/neondb` };
    try {
      resolveDatabaseTarget("primary", { env });
      throw new Error("expected throw");
    } catch (e) {
      expect((e as DatabaseTargetError).code).toBe("UNIDENTIFIED_TARGET");
    }
    // Opt-in escape hatch stays explicit.
    expect(
      resolveDatabaseTarget("primary", { env, allowUnknownEnvironment: true }).environmentType,
    ).toBe("unknown");
  });

  it("fails closed on an unparseable URL and on a non-postgres protocol", () => {
    expect(() => resolveDatabaseTarget("primary", { env: { DATABASE_URL: "not a url" } })).toThrowError(
      DatabaseTargetError,
    );
    expect(() =>
      resolveDatabaseTarget("primary", { env: { DATABASE_URL: "mysql://u:p@ep-x-a1b2c3d4.neon.tech/db" } }),
    ).toThrowError(/protocol/i);
  });

  it("fails closed when an endpoint pin does not match", () => {
    const env: EnvLike = {
      NEON_VERIFY_DATABASE_URL: VERIFY_URL,
      NEON_VERIFY_ENDPOINT_ID: "ep-some-other-endpoint",
    };
    try {
      resolveDatabaseTarget("verify", { env });
      throw new Error("expected throw");
    } catch (e) {
      expect((e as DatabaseTargetError).code).toBe("ENDPOINT_PIN_MISMATCH");
    }
  });

  it("a test run claiming Verify resolves correctly when it really is Verify", () => {
    const env: EnvLike = { NEON_VERIFY_DATABASE_URL: VERIFY_URL };
    const target = assertNonProductionTarget("verify", { env });
    expect(target.environmentType).toBe("child-branch");
    expect(target.endpointId).toBe("ep-verify-child-a4t0kt58");
    expect(target.envKey).toBe("NEON_VERIFY_DATABASE_URL");
  });

  it("reports the source of the resolved value", () => {
    const env: EnvLike = { DATABASE_URL: VERIFY_URL };
    const inherited = captureInheritedDatabaseTargets(env);
    expect(resolveDatabaseTarget("primary", { env, inherited }).source).toBe("process");
    expect(resolveDatabaseTarget("primary", { env, inherited: {} }).source).toBe("env-file");
  });

  it("classifies local hosts as local", () => {
    const env: EnvLike = { DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/aquavo" };
    expect(resolveDatabaseTarget("primary", { env }).environmentType).toBe("local");
  });

  it("parses pooled and unpooled Neon endpoint ids", () => {
    expect(parseEndpointId("ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech")).toBe(
      "ep-quiet-moon-a4h7tdze",
    );
    expect(parseEndpointId("ep-quiet-moon-a4h7tdze.us-east-1.aws.neon.tech")).toBe(
      "ep-quiet-moon-a4h7tdze",
    );
    expect(parseEndpointId("localhost")).toBeNull();
  });
});

describe("no secret appears in logs", () => {
  it("the redacted label and startup log contain no credentials", () => {
    const env: EnvLike = { DATABASE_URL: PROD_URL };
    const target = resolveDatabaseTarget("primary", { env });

    const lines: string[] = [];
    logResolvedDatabaseTarget(target, (m) => lines.push(m));

    const all = [target.redactedLabel, ...lines].join("\n");
    expect(all).not.toContain(SECRET);
    expect(all).not.toContain("neondb_owner");
    expect(all).not.toContain("postgresql://");
    expect(all).not.toContain(PROD_URL);
    expect(all).toContain("ep-quiet-moon-a4h7tdze");
    expect(all).toContain("env=production");
  });

  it("describeDatabaseTarget never echoes a raw URL", () => {
    const target = resolveDatabaseTarget("verify", { env: { NEON_VERIFY_DATABASE_URL: VERIFY_URL } });
    const label = describeDatabaseTarget(target);
    expect(label).not.toMatch(/:\/\//);
    expect(label).not.toContain(SECRET);
  });

  it("the clobber warning names keys but never values", () => {
    writeEnvFiles({ ".env": `DATABASE_URL=${PROD_URL}\n` });
    const env: EnvLike = { DATABASE_URL: VERIFY_URL };
    const logged: string[] = [];

    loadEnvFilesPreservingDatabaseTargets({ env, cwd: tmpDir, logger: (m) => logged.push(m) });

    const joined = logged.join("\n");
    expect(joined).toContain("DATABASE_URL");
    expect(joined).not.toContain(SECRET);
    expect(joined).not.toContain("postgresql://");
  });
});

describe("child process (tsx re-exec) inherits the explicit target", () => {
  it("a spawned tsx child resolves the inherited target, not the local .env", () => {
    // A decoy .env in the child's cwd pointing at PRODUCTION — exactly the
    // real-world layout that caused the near-miss.
    writeEnvFiles({ ".env": `DATABASE_URL=${PROD_URL}\n` });

    const harness = path.join(tmpDir, "harness.ts");
    const modulePath = path
      .join(REPO_ROOT, "server", "db-target.ts")
      .replace(/\\/g, "/");
    fs.writeFileSync(
      harness,
      [
        `import { loadEnvFilesPreservingDatabaseTargets, resolveDatabaseTarget } from ${JSON.stringify(modulePath)};`,
        `const load = loadEnvFilesPreservingDatabaseTargets({ logger: () => {} });`,
        `const t = resolveDatabaseTarget("primary", { inherited: load.inherited });`,
        `console.log(JSON.stringify({ label: t.redactedLabel, endpointId: t.endpointId, source: t.source, env: t.environmentType }));`,
      ].join("\n"),
      "utf8",
    );

    const tsxBin = path.join(
      REPO_ROOT,
      "node_modules",
      ".bin",
      process.platform === "win32" ? "tsx.CMD" : "tsx",
    );

    const stdout = execFileSync(tsxBin, [harness], {
      cwd: tmpDir,
      env: { ...process.env, DATABASE_URL: VERIFY_URL, NODE_ENV: "test" },
      encoding: "utf8",
      shell: process.platform === "win32",
      timeout: 60_000,
    });

    const line = stdout.trim().split(/\r?\n/).filter(Boolean).pop() as string;
    const parsed = JSON.parse(line) as {
      label: string;
      endpointId: string;
      source: string;
      env: string;
    };

    expect(parsed.endpointId).toBe("ep-verify-child-a4t0kt58");
    expect(parsed.env).toBe("child-branch");
    expect(parsed.source).toBe("process");
    // and the whole child output is credential-free
    expect(stdout).not.toContain(SECRET);
    expect(stdout).not.toContain("ep-quiet-moon-a4h7tdze");
  }, 90_000);
});
