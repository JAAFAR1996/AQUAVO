// F-8 (HIGH) — blocked_ips.expires_at timezone/expiry remediation.
//
// Proves, against a REAL Postgres (PGlite), that:
//   • a temporary block has the correct DURATION (5 failed attempts → 5-minute block)
//   • expiry is decided by the DB clock (now()), so it is timezone- AND DST-independent
//   • an expired block no longer denies; an active block denies
//   • a PERMANENT block (expires_at IS NULL) stays permanent and is never auto-lifted
//   • a NULL/absent expiry fails SAFE (stays blocked — the safe direction for a block)
//   • the app method (SecurityStorage) and the raw DB predicate ALWAYS agree
//   • the cleanup job lifts ONLY expired temporary rows — no accidental mass unblock
//   • the migration converts tz-less columns to timestamptz, repairing the +03:00
//     read skew on existing rows, without touching is_active (no silent unblock)
import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { sql } from "drizzle-orm";
import * as schema from "../../shared/schema.js";
import { SecurityStorage } from "../storage/security-storage.js";

const ROOT = process.cwd();

// Post-migration DDL: exactly the timestamptz shape shared/schema.ts now declares.
const DDL = `
CREATE TABLE login_attempts (
  id text PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text,
  email text NOT NULL,
  success boolean NOT NULL,
  ip_address text,
  user_agent text,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE blocked_ips (
  id text PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL UNIQUE,
  reason text NOT NULL,
  failed_attempts integer DEFAULT 0,
  blocked_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
`;

/** A SecurityStorage whose private db is a PGlite-backed Drizzle instance. */
function storageOver(db: any): SecurityStorage {
  const s = new SecurityStorage();
  (s as any).db = db;
  return s;
}

/** The canonical in-force predicate, evaluated by raw SQL — the source of truth
 *  the middleware delegates to. Used to assert app/DB agreement. */
async function dbSaysBlocked(client: PGlite, ip: string): Promise<boolean> {
  const r = await client.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM blocked_ips
      WHERE ip_address = $1 AND is_active = true
        AND (expires_at IS NULL OR expires_at > now())`,
    [ip],
  );
  return r.rows[0].n > 0;
}

describe("F-8 blocked-ip expiry — behaviour over real Postgres", () => {
  let client: PGlite;
  let db: any;
  let store: SecurityStorage;

  beforeEach(async () => {
    client = new PGlite();
    await client.exec(DDL);
    db = drizzle(client, { schema });
    store = storageOver(db);
  });

  async function recordFailures(ip: string, n: number) {
    for (let i = 0; i < n; i++) {
      await store.recordLoginAttempt({ email: `a${i}@x.io`, success: false, ipAddress: ip } as any);
    }
  }

  it("5 failed attempts create a block with a 5-minute (300s) duration", async () => {
    await recordFailures("10.0.0.1", 5);
    expect(await store.isIPBlocked("10.0.0.1")).toBe(true);

    // Duration is anchored to the DB clock: expires_at must be ~300s ahead of now().
    const r = await client.query<{ secs: number }>(
      `SELECT EXTRACT(EPOCH FROM (expires_at - now()))::float AS secs
         FROM blocked_ips WHERE ip_address = '10.0.0.1'`,
    );
    expect(r.rows[0].secs).toBeGreaterThan(295);
    expect(r.rows[0].secs).toBeLessThanOrEqual(300);
  });

  it("an ACTIVE block denies; an EXPIRED block does not (and self-heals to inactive)", async () => {
    await recordFailures("10.0.0.2", 5);
    expect(await store.isIPBlocked("10.0.0.2")).toBe(true); // still active

    // Simulate the 5 minutes elapsing by moving expiry into the past.
    await client.exec(`UPDATE blocked_ips SET expires_at = now() - interval '1 second' WHERE ip_address = '10.0.0.2'`);

    expect(await store.isIPBlocked("10.0.0.2")).toBe(false); // no longer denies
    const active = await client.query<{ is_active: boolean }>(
      `SELECT is_active FROM blocked_ips WHERE ip_address = '10.0.0.2'`);
    expect(active.rows[0].is_active).toBe(false); // self-healed
  });

  it("the 5-minute boundary is exact: active at +299s, expired at +301s", async () => {
    await client.exec(
      `INSERT INTO blocked_ips (ip_address, reason, expires_at, is_active)
       VALUES ('10.0.0.9','t', now() + interval '300 seconds', true)`);
    const at = async (offset: string) => (await client.query<{ b: boolean }>(
      `SELECT (expires_at > now() + interval '${offset}') AS b FROM blocked_ips WHERE ip_address='10.0.0.9'`)).rows[0].b;
    expect(await at("299 seconds")).toBe(true);  // still blocked just before 5 min
    expect(await at("301 seconds")).toBe(false); // lifted just after 5 min
  });

  it("a PERMANENT block (expires_at NULL) stays blocked and is never auto-lifted", async () => {
    await client.exec(
      `INSERT INTO blocked_ips (ip_address, reason, expires_at, is_active)
       VALUES ('203.0.113.7','permanent', NULL, true)`);
    expect(await store.isIPBlocked("203.0.113.7")).toBe(true);
    const lifted = await store.deactivateExpiredBlocks();
    expect(lifted).toBe(0); // cleanup never touches permanent rows
    expect(await store.isIPBlocked("203.0.113.7")).toBe(true);
    const list = await store.getBlockedIPs();
    expect(list.some((b) => b.ipAddress === "203.0.113.7")).toBe(true);
  });

  it("NULL/absent expiry fails SAFE — treated as a permanent block (deny), never lifted", async () => {
    await client.exec(
      `INSERT INTO blocked_ips (ip_address, reason, expires_at, is_active)
       VALUES ('198.51.100.5', 'malformed/absent expiry', NULL, true)`);
    // Fail-closed: unknown expiry keeps the block in force rather than opening access.
    expect(await store.isIPBlocked("198.51.100.5")).toBe(true);
    expect(await store.deactivateExpiredBlocks("198.51.100.5")).toBe(0);
  });

  it("getBlockInfo returns DB-computed remainingSeconds for active, null for expired", async () => {
    await recordFailures("10.0.0.3", 5);
    const info = await store.getBlockInfo("10.0.0.3");
    expect(info?.isBlocked).toBe(true);
    expect(info!.remainingSeconds).toBeGreaterThan(0);
    expect(info!.remainingSeconds).toBeLessThanOrEqual(300);

    await client.exec(`UPDATE blocked_ips SET expires_at = now() - interval '1 second' WHERE ip_address = '10.0.0.3'`);
    expect(await store.getBlockInfo("10.0.0.3")).toBeNull();
  });

  it("app method and raw DB predicate ALWAYS agree (active, expired, permanent)", async () => {
    await recordFailures("10.0.0.4", 5); // active temporary
    await client.exec(`INSERT INTO blocked_ips (ip_address, reason, expires_at, is_active) VALUES ('10.0.0.5','exp', now() - interval '1 minute', true)`);
    await client.exec(`INSERT INTO blocked_ips (ip_address, reason, expires_at, is_active) VALUES ('10.0.0.6','perm', NULL, true)`);
    for (const ip of ["10.0.0.4", "10.0.0.5", "10.0.0.6", "10.0.0.99"]) {
      expect(await store.isIPBlocked(ip)).toBe(await dbSaysBlocked(client, ip));
    }
  });

  it("cleanup lifts ONLY expired temporary rows — no accidental mass unblock", async () => {
    await client.exec(`INSERT INTO blocked_ips (ip_address, reason, expires_at, is_active) VALUES
      ('1.1.1.1','active', now() + interval '5 minutes', true),
      ('2.2.2.2','expired', now() - interval '5 minutes', true),
      ('3.3.3.3','permanent', NULL, true),
      ('4.4.4.4','also-expired', now() - interval '1 second', true)`);
    const lifted = await store.deactivateExpiredBlocks();
    expect(lifted).toBe(2); // only the two expired temporary rows
    const stillActive = await client.query<{ ip: string }>(
      `SELECT ip_address AS ip FROM blocked_ips WHERE is_active = true ORDER BY ip_address`);
    expect(stillActive.rows.map((r) => r.ip)).toEqual(["1.1.1.1", "3.3.3.3"]);
  });

  it("expiry is timezone- and DST-independent (UTC, Asia/Baghdad, America/New_York agree)", async () => {
    // A block that expires 30s from now, evaluated under three very different
    // session timezones, must give the SAME answer — because timestamptz + now()
    // compares absolute instants, not wall-clocks.
    await client.exec(`INSERT INTO blocked_ips (ip_address, reason, expires_at, is_active) VALUES ('9.9.9.9','tz', now() + interval '30 seconds', true)`);
    await client.exec(`INSERT INTO blocked_ips (ip_address, reason, expires_at, is_active) VALUES ('8.8.8.8','tz-exp', now() - interval '30 seconds', true)`);
    for (const tz of ["UTC", "Asia/Baghdad", "America/New_York"]) {
      await client.exec(`SET TIME ZONE '${tz}'`);
      expect(await store.isIPBlocked("9.9.9.9")).toBe(true);   // future expiry: blocked everywhere
      expect(await dbSaysBlocked(client, "8.8.8.8")).toBe(false); // past expiry: lifted everywhere
    }
    await client.exec(`SET TIME ZONE 'UTC'`);
  });
});

describe("F-8 blocked-ip expiry — migration repairs the +03:00 skew", () => {
  const forwardSql = readFileSync(join(ROOT, "migrations/fix_blocked_ips_timestamptz.sql"), "utf8");
  const rollbackSql = readFileSync(join(ROOT, "migrations/fix_blocked_ips_timestamptz_rollback.sql"), "utf8");

  // Pre-migration shape: tz-less `timestamp` columns (the F-8 defect).
  const PRE_DDL = `
    CREATE TABLE login_attempts (
      id text PRIMARY KEY DEFAULT gen_random_uuid(), email text NOT NULL,
      success boolean NOT NULL, ip_address text, created_at timestamp NOT NULL DEFAULT now());
    CREATE TABLE blocked_ips (
      id text PRIMARY KEY DEFAULT gen_random_uuid(), ip_address text NOT NULL UNIQUE,
      reason text NOT NULL, failed_attempts integer DEFAULT 0,
      blocked_at timestamp NOT NULL DEFAULT now(), expires_at timestamp,
      is_active boolean DEFAULT true, created_at timestamp NOT NULL DEFAULT now());
  `;

  async function colType(client: PGlite, table: string, col: string): Promise<string> {
    const r = await client.query<{ data_type: string }>(
      `SELECT data_type FROM information_schema.columns WHERE table_name=$1 AND column_name=$2`,
      [table, col]);
    return r.rows[0].data_type;
  }

  it("converts tz-less columns to timestamptz and preserves the true UTC instant", async () => {
    const client = new PGlite();
    await client.exec(PRE_DDL);
    // Deliberately run the migration under a NON-UTC session tz: the migration must
    // anchor conversion to UTC explicitly, not to the session zone.
    await client.exec(`SET TIME ZONE 'Asia/Baghdad'`);

    // A row that TRULY expires 2026-07-23 09:54:20.907Z was stored by the driver as
    // the naked UTC wall-clock '2026-07-23 09:54:20.907' (the F-8 storage form).
    await client.exec(`INSERT INTO blocked_ips (ip_address, reason, expires_at, is_active)
      VALUES ('7.7.7.7','skewed', TIMESTAMP '2026-07-23 09:54:20.907', true)`);
    await client.exec(`INSERT INTO blocked_ips (ip_address, reason, expires_at, is_active)
      VALUES ('7.7.7.8','permanent', NULL, true)`);
    await client.exec(`INSERT INTO blocked_ips (ip_address, reason, expires_at, is_active)
      VALUES ('7.7.7.9','past', TIMESTAMP '2020-01-01 00:00:00', true)`);

    const activeBefore = (await client.query<{ n: number }>(`SELECT count(*)::int n FROM blocked_ips WHERE is_active`)).rows[0].n;

    await client.exec(forwardSql);

    // All four target columns are now timestamptz.
    expect(await colType(client, "blocked_ips", "expires_at")).toBe("timestamp with time zone");
    expect(await colType(client, "blocked_ips", "blocked_at")).toBe("timestamp with time zone");
    expect(await colType(client, "blocked_ips", "created_at")).toBe("timestamp with time zone");
    expect(await colType(client, "login_attempts", "created_at")).toBe("timestamp with time zone");

    // The repaired instant equals the intended UTC instant — the +03:00 skew is gone.
    const epoch = (await client.query<{ e: number }>(
      `SELECT EXTRACT(EPOCH FROM expires_at)::float AS e FROM blocked_ips WHERE ip_address='7.7.7.7'`)).rows[0].e;
    expect(epoch).toBeCloseTo(Date.UTC(2026, 6, 23, 9, 54, 20, 907) / 1000, 3);

    // No silent unblock: is_active untouched, permanent stays NULL+active.
    const activeAfter = (await client.query<{ n: number }>(`SELECT count(*)::int n FROM blocked_ips WHERE is_active`)).rows[0].n;
    expect(activeAfter).toBe(activeBefore);
    const perm = await client.query<{ e: string | null; a: boolean }>(
      `SELECT expires_at e, is_active a FROM blocked_ips WHERE ip_address='7.7.7.8'`);
    expect(perm.rows[0].e).toBeNull();
    expect(perm.rows[0].a).toBe(true);
  });

  it("is idempotent (second apply is a no-op) and reversible via rollback", async () => {
    const client = new PGlite();
    await client.exec(PRE_DDL);
    await client.exec(forwardSql);
    await expect(client.exec(forwardSql)).resolves.toBeDefined(); // idempotent
    expect(await colType(client, "blocked_ips", "expires_at")).toBe("timestamp with time zone");

    await client.exec(rollbackSql);
    expect(await colType(client, "blocked_ips", "expires_at")).toBe("timestamp without time zone");
    await expect(client.exec(rollbackSql)).resolves.toBeDefined(); // idempotent rollback
  });
});
