# F-8 — IP-block expiry remediation (HIGH)

**Agent:** SecurityExpiryAgent
**Scope owned:** IP-block schema, its middleware/read-path, its cleanup job, related tests.
**Status:** Fixed in code + schema + migration + tests. Migration prepared, **not run against production**. Live child-branch row classification: **not run — `NEON_VERIFY_DATABASE_URL` is not provisioned in this environment** (only the production-default `DATABASE_URL` is present, which must never be written).

---

## 1. Column-type finding

`blocked_ips` and its feeder `login_attempts` stored every timestamp as **`timestamp` WITHOUT time zone**:

| Table | Column | Was | Now |
|-------|--------|-----|-----|
| `blocked_ips` | `expires_at` | `timestamp` | `timestamptz` |
| `blocked_ips` | `blocked_at` | `timestamp` | `timestamptz` |
| `blocked_ips` | `created_at` | `timestamp` | `timestamptz` |
| `login_attempts` | `created_at` | `timestamp` | `timestamptz` |

Source of the old type: `shared/schema.ts` declared `timestamp("expires_at")` with no `{ withTimezone: true }`. Confirmed against `migrations/0000_orange_champions.sql` (`"expires_at" timestamp`) and `migrations/meta/0006_snapshot.json` (`"type": "timestamp"`).

---

## 2. Every read / write / compare path

| Path | File | Old behaviour | New behaviour |
|------|------|---------------|---------------|
| **Write (block/upsert)** | `server/storage/security-storage.ts` `checkAndBlockIP()` | `expiresAt = new Date(Date.now()+Ns)`; `blockedAt = new Date()` | `expiresAt = sql\`now() + make_interval(secs => N)\``; `blockedAt = sql\`now()\`` — expiry computed on the **DB clock** |
| **Read/deny (middleware)** | `security-storage.ts` `isIPBlocked()` → used by `server/routes/users.ts` `POST /api/login` | selected row, then compared `blocked.expiresAt < new Date()` in **JS** | in-DB predicate `(expires_at IS NULL OR expires_at > now())` in the WHERE clause |
| **Countdown** | `security-storage.ts` `getBlockInfo()` | JS `expiresAt.getTime() - Date.now()` | in-DB `GREATEST(0, CEIL(EXTRACT(EPOCH FROM (expires_at - now()))))` |
| **Admin list** | `security-storage.ts` `getBlockedIPs()` | `is_active = true` only | `is_active = true AND` in-force predicate |
| **Stats count** | `security-storage.ts` `getSecurityStats()` | `is_active = true` only | same in-force predicate (list & count can't disagree) |
| **Cleanup job** | new `deactivateExpiredBlocks()` + cron in `server/cron/scheduled-jobs.ts` | *(did not exist)* | `expires_at IS NOT NULL AND expires_at <= now()` — same rule, permanent rows untouched |
| **Feeder window** | `security-storage.ts` `getRecentFailedAttempts()` / `getSecurityStats()` | `gte(login_attempts.created_at, jsDate)` on a tz-less column | column now `timestamptz`, so the "last hour / 24h" window is absolute |
| **E2E release (not mine)** | `e2e/support/seed-synthetic-auth.mjs` | manual `UPDATE blocked_ips SET is_active=false` for loopback IPs — documents the very +03:00 skew | left as-is (Agent 4 owns E2E infra); its workaround becomes unnecessary once the migration is applied |

All app-side JS-clock comparisons of expiry were removed. Expiry is now decided **only** by Postgres `now()`.

---

## 3. Root cause (tz **and** type)

The columns were `timestamp without time zone`. The app wrote a JS `Date`; the driver serialised its **UTC wall-clock** (e.g. `2026-07-23 09:54:20.907`) into the tz-less column, but on read the naked wall-clock was interpreted as **Asia/Baghdad local (UTC+3)**. A row that truly expired `09:54:20.907Z` was served as `expiresAt: 12:54:20.907Z` — 3 hours in the future. The old code then compared that skewed value against a JS `new Date()`, so a 5-minute block looked ~3 h unexpired and **never lifted → effectively permanent → real 429** (recorded in `docs/audit/findings-register.md` F-8 and `e2e/support/seed-synthetic-auth.mjs`). Baghdad = UTC+3 exactly explains the sign and magnitude.

It is both a **type** bug (tz-less column) and a **timezone** bug (local-vs-UTC interpretation). Fixing either alone is fragile; the remediation fixes both and additionally moves the comparison to the DB clock so server clock skew cannot alter block duration.

---

## 4. The standardization

1. **Schema:** all four columns → `timestamptz` (absolute instant; write and read agree in any session tz). `shared/schema.ts` updated to `{ withTimezone: true }` so ORM and DB match.
2. **Storage of expiry:** computed by the DB clock — `now() + make_interval(secs => N)` — not the app clock.
3. **Comparison of expiry:** a single canonical predicate `(expires_at IS NULL OR expires_at > now())`, evaluated by Postgres, is the SOLE source of truth. `isIPBlocked`, `getBlockInfo`, `getBlockedIPs`, `getSecurityStats` and the cleanup job all use it — middleware and cleanup can never diverge.
4. **Duration semantics are tz/DST-independent** because timestamptz + `now()` compares instants, never wall-clocks (proven for UTC, Asia/Baghdad, America/New_York).

---

## 5. Permanent vs temporary handling

- `expires_at IS NULL` = **PERMANENT** block. The in-force predicate keeps it blocked forever; `deactivateExpiredBlocks()` explicitly excludes `expires_at IS NULL`, so a permanent block can only be lifted by an explicit `unblockIP()`.
- `expires_at NOT NULL` = **TEMPORARY**. Lifts exactly when `expires_at <= now()`.
- **Fail-safe:** an unknown/absent expiry (NULL) keeps the block *in force* (deny) rather than opening access — the safe direction for a security control.

---

## 6. Migration + rollback

| File | SHA-256 |
|------|---------|
| `migrations/fix_blocked_ips_timestamptz.sql` | `46d064dab3a21e45c09f2c994ca7124d4784c4d92d82165dbf867c47534ba2fb` |
| `migrations/fix_blocked_ips_timestamptz_rollback.sql` | `1deb966884d3dff4b1038eae7c22ac6e4d7a593124f212630c54c201f80b9494` |

- Additive/behavioural, reversible, idempotent, fail-closed. **No top-level BEGIN/COMMIT** (executor owns the transaction) — matches repo convention (`add_product_cost_resolution.sql`).
- Conversion: `ALTER COLUMN … TYPE timestamptz USING <col> AT TIME ZONE 'UTC'`. `AT TIME ZONE 'UTC'` re-interprets the stored naked wall-clock as UTC — exactly what the driver wrote — so the correct absolute instant is recovered. This **repairs existing rows in the same step** and is anchored to UTC regardless of session tz (verified by running the migration under an `Asia/Baghdad` session in tests).
- Each column is converted only if still `timestamp without time zone`; re-run is a no-op. A fail-closed `DO` block asserts all four are timestamptz afterward.
- **`is_active` is never modified** by the migration → nothing is unblocked by applying it.
- Rollback reverses with `… TYPE timestamp USING <col> AT TIME ZONE 'UTC'` (loss-free round trip); it reinstates the F-8 skew, so it is only for emergency reversal.
- **Not run against production** (branch `br-patient-mouse-a4d4cgr4` / endpoint `ep-quiet-moon-a4h7tdze`).

---

## 7. Existing-row classification & repair

The migration emits a `RAISE NOTICE` classifying `is_active` rows into three evidence buckets **without changing `is_active`**:

- `permanent (NULL)` — untouched, stays blocked.
- `temporary-still-active` (`expires_at > now()` after repair) — stays blocked.
- `temporary-already-expired` (`expires_at <= now()` after repair) — will be lifted by the middleware/cleanup on next evaluation. This is the *intended* correction of blocks that already expired (some hours ago, per F-8), **not** a mass unblock — no bulk `is_active` flip occurs.

**Counts against the live child branch were NOT collected**: `NEON_VERIFY_DATABASE_URL` is not set in this environment and production must not be read/written. The classification query is embedded in the migration and proven correct against synthetic skewed rows in PGlite (see test "converts tz-less columns … preserves the true UTC instant", which asserts the repaired instant equals `2026-07-23T09:54:20.907Z` and that active-row counts are unchanged). **Open item:** run the migration's NOTICE / the classification SELECT on the verify branch when credentials are available, and record the three counts here.

---

## 8. Tests

New file `server/__tests__/blocked-ip-expiry.test.ts` — real Postgres via PGlite; behavioural tests inject a PGlite-backed Drizzle into a real `SecurityStorage`.

```
✓ 5 failed attempts create a block with a 5-minute (300s) duration
✓ an ACTIVE block denies; an EXPIRED block does not (and self-heals to inactive)
✓ the 5-minute boundary is exact: active at +299s, expired at +301s
✓ a PERMANENT block (expires_at NULL) stays blocked and is never auto-lifted
✓ NULL/absent expiry fails SAFE — treated as a permanent block (deny), never lifted
✓ getBlockInfo returns DB-computed remainingSeconds for active, null for expired
✓ app method and raw DB predicate ALWAYS agree (active, expired, permanent)
✓ cleanup lifts ONLY expired temporary rows — no accidental mass unblock
✓ expiry is timezone- and DST-independent (UTC, Asia/Baghdad, America/New_York agree)
✓ converts tz-less columns to timestamptz and preserves the true UTC instant
✓ is idempotent (second apply is a no-op) and reversible via rollback

Test Files  1 passed (1)
     Tests  11 passed (11)
```

Coverage of the required matrix: 5-min block expires after 5 min ✓ · Baghdad tz ✓ · UTC runtime ✓ · DST-independent ✓ · expired block does not deny ✓ · active block denies ✓ · permanent stays permanent ✓ · malformed/absent expiry fails safe ✓ · existing skewed rows classified/repaired ✓ · middleware and DB agree ✓ · no accidental mass unblock ✓.

**Suite totals.** Baseline 112 files / 1538 / 0 failed. After: **113 files / 1551 tests**. `server/__tests__/security.test.ts` (6) still green. One full-run failure appeared in `server/__tests__/orders-api.test.ts` (Agent 1's checkout domain, references none of my tables); it **passes 38/38 in isolation** — a parallel-worker flake, unrelated to this change.

---

## 9. Files changed

- `shared/schema.ts` — `blocked_ips` (`expires_at`, `blocked_at`, `created_at`) and `login_attempts.created_at` → `{ withTimezone: true }`.
- `server/storage/security-storage.ts` — DB-clock write (`now() + make_interval`), canonical `stillBlockedPredicate()`, DB-side comparisons in `isIPBlocked` / `getBlockInfo` / `getBlockedIPs` / `getSecurityStats`, new `deactivateExpiredBlocks()`.
- `server/cron/scheduled-jobs.ts` — every-5-minute "Expired IP-block cleanup" job calling `deactivateExpiredBlocks()` (same rule as middleware).
- `migrations/fix_blocked_ips_timestamptz.sql` (+ `_rollback.sql`) — new.
- `server/__tests__/blocked-ip-expiry.test.ts` — new.

## 10. Open items / notes for the coordinator

- **Run the migration** on the verify child branch, capture the three classification counts, and paste into §7. Then apply to production via the normal executor (BEGIN … file … COMMIT).
- Once applied, the loopback-unblock workaround in `e2e/support/seed-synthetic-auth.mjs` (Agent 4) is no longer needed for correctness — flagged, not changed (out of my ownership).
- `login_attempts.created_at` was included because it feeds the block decision; it lives in the security domain (`SecurityStorage`). Other readers of that column only benefit from a correct absolute timestamp.
