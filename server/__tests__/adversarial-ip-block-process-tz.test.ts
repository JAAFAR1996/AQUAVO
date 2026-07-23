// ADVERSARIAL (Phase B, SecurityAndTargetVerifier) — process-level TZ attack on
// the IP-block expiry predicate.
//
// The existing blocked-ip-expiry suite proves the DB SESSION timezone
// (SET TIME ZONE ...) cannot change the outcome. This file attacks the other
// clock an attacker might hope leaks in: the Node PROCESS timezone (process.env.TZ,
// which skews `new Date()` by hours). If any read-path compared expiry on the JS
// clock, a large +TZ offset would make a just-expired block look "still in force"
// (or a future block look expired). We prove it does NOT: the app methods delegate
// entirely to the DB now(), so process.env.TZ is inert.
import { describe, it, expect, beforeEach, afterEach, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "../../shared/schema.js";
import { SecurityStorage } from "../storage/security-storage.js";

const DDL = `
CREATE TABLE login_attempts (
  id text PRIMARY KEY DEFAULT gen_random_uuid(), user_id text, email text NOT NULL,
  success boolean NOT NULL, ip_address text, user_agent text, failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE blocked_ips (
  id text PRIMARY KEY DEFAULT gen_random_uuid(), ip_address text NOT NULL UNIQUE,
  reason text NOT NULL, failed_attempts integer DEFAULT 0,
  blocked_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz,
  is_active boolean DEFAULT true, created_at timestamptz NOT NULL DEFAULT now());
`;

function storageOver(db: any): SecurityStorage {
  const s = new SecurityStorage();
  (s as any).db = db;
  return s;
}

const ORIGINAL_TZ = process.env.TZ;

describe("ADVERSARIAL — process TZ cannot change IP-block outcome", () => {
  let client: PGlite;
  let store: SecurityStorage;

  beforeEach(async () => {
    client = new PGlite();
    await client.exec(DDL);
    store = storageOver(drizzle(client, { schema }));
  });

  // Restore TZ after EACH case, not just afterAll: a leaked process.env.TZ must
  // never persist into a concurrently-scheduled test file (it flaked the F-8
  // duration test under shared workers). afterAll kept as belt-and-suspenders.
  afterEach(() => { process.env.TZ = ORIGINAL_TZ; });
  afterAll(() => { process.env.TZ = ORIGINAL_TZ; });

  // A block that expired 1 second ago must be seen as lifted no matter how badly
  // the Node process clock is skewed forward (Asia/Baghdad = +03, Kiritimati = +14).
  for (const tz of ["UTC", "Asia/Baghdad", "Pacific/Kiritimati", "Etc/GMT+12"]) {
    it(`expired block stays lifted and active block stays blocked under process TZ=${tz}`, async () => {
      process.env.TZ = tz;
      await client.exec(
        `INSERT INTO blocked_ips (ip_address, reason, expires_at, is_active)
         VALUES ('5.5.5.5','just-expired', now() - interval '1 second', true),
                ('6.6.6.6','still-active', now() + interval '5 minutes', true)`);
      // Even with a +14h JS skew, the expired row must NOT be reported blocked...
      expect(await store.isIPBlocked("5.5.5.5")).toBe(false);
      // ...and the active row must remain blocked.
      expect(await store.isIPBlocked("6.6.6.6")).toBe(true);
      // getBlockInfo remaining is DB-computed and bounded, never JS-inflated by TZ.
      const info = await store.getBlockInfo("6.6.6.6");
      expect(info?.remainingSeconds).toBeGreaterThan(0);
      expect(info!.remainingSeconds).toBeLessThanOrEqual(300);
    });
  }
});
