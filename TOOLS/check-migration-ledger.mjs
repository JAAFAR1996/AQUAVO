#!/usr/bin/env node
// Guards against git and Production schema history drifting apart again.
//
// The drift that motivated this: 0039 was applied to Production and recorded in
// public.schema_migrations, but its .sql file was never committed. Nobody
// noticed until a later migration needed to be added on top of a history git
// could not see.
//
// Two independent lineages exist in migrations/:
//   * NUMBERED (0000..NNNN_name.sql) — the governed ledger. Every one of these
//     must register itself in schema_migrations, and every ledger row must have
//     a matching file.
//   * DESCRIPTIVE (add_fulfillment_costing.sql, ...) — the older convention,
//     applied outside the ledger. Frozen: no new ones.
//
// Runs offline against the filesystem. The Production cross-check is a separate
// documented step in OPERATOR-RUNBOOK.md, because CI has no database credentials
// and should not have any.
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

const MIGRATIONS = join(process.cwd(), "migrations");

/**
 * Migrations whose file cannot hash to the checksum recorded in Production,
 * because the original artifact is gone and the committed file is a semantic
 * reconstruction. Listing one here is a deliberate, reviewed exception — it is
 * NOT a way to silence a genuine mismatch.
 */
const RECONSTRUCTED = new Map([
  [
    "0039_accounting_phase1b_snapshot_writer_and_payment_ledger",
    {
      productionChecksum: "7b76a29582d293d8413b32205afb38400f35faa06127d1a67f40c75f2ea30b11",
      reconstructionChecksum:
        "9f00fac1a2356c274207035e182346912f880b2f188671c3272ea23357e58962",
      reason:
        "original artifact unavailable (repo, git history, 176-commit mirror and release archives all searched 2026-07-31); equivalence established by pre/post catalog diff",
    },
  ],
]);

const NUMBERED = /^(\d{4})_([a-z0-9_]+)\.sql$/;

/**
 * drizzle-kit owns its own lineage, tracked in migrations/meta/_journal.json and
 * applied by drizzle rather than by the governed ledger. Those files legitimately
 * do not self-register and have no hand-written rollback, so they are outside
 * this checker's remit — but they are read from the journal rather than
 * hard-coded, so adding one cannot silently widen the exemption.
 */
const DRIZZLE_TAGS = new Set(
  JSON.parse(readFileSync(join(MIGRATIONS, "meta", "_journal.json"), "utf8")).entries.map(
    (e) => e.tag,
  ),
);
const ROLLBACK = /^(\d{4})_([a-z0-9_]+)_rollback\.sql$/;

/**
 * The governance floor. 0039 is where the ledger discipline starts: it is the
 * migration whose missing file exposed the drift. Everything numbered below it
 * was written under earlier conventions and is reported, not enforced.
 */
const GOVERNED_FROM = 39;

const legacyNumbered = [];
const errors = [];
const warnings = [];
const notes = [];

const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql"));
const forward = new Map();
const rollbacks = new Set();

for (const f of files) {
  if (ROLLBACK.test(f)) {
    rollbacks.add(f.replace(/_rollback\.sql$/, ""));
    continue;
  }
  const m = NUMBERED.exec(f);
  if (!m) continue;
  const version = f.replace(/\.sql$/, "");
  if (DRIZZLE_TAGS.has(version)) continue;
  // Hand-written numbered files that predate the governance floor are legacy
  // debt, not this checker's business. Reporting them as errors would make the
  // check fail on day one and train everyone to ignore it.
  if (Number(m[1]) < GOVERNED_FROM) {
    legacyNumbered.push(f);
    continue;
  }
  forward.set(version, f);
}

for (const [version, file] of [...forward].sort()) {
  const sql = readFileSync(join(MIGRATIONS, file), "utf8");
  const sha = createHash("sha256").update(sql).digest("hex");

  // 1. Every numbered migration must register itself in the ledger.
  if (!sql.includes("schema_migrations")) {
    errors.push(`${file}: numbered migration never writes to schema_migrations`);
  }

  // 2. And must ship a rollback.
  if (!rollbacks.has(version)) {
    errors.push(`${file}: no matching _rollback.sql`);
  }

  // 3. Reconstructions must be labelled honestly and must not assert byte
  //    equality with a checksum they cannot produce.
  const recon = RECONSTRUCTED.get(version);
  if (recon) {
    if (sha !== recon.reconstructionChecksum) {
      errors.push(
        `${file}: reconstruction changed. Recorded ${recon.reconstructionChecksum.slice(0, 16)}…, ` +
          `file is now ${sha.slice(0, 16)}…. Update RECONSTRUCTED in this tool AND the ` +
          `provenance doc, and re-verify semantic equivalence against Production.`,
      );
    }
    if (!/SEMANTIC RECONSTRUCTION/i.test(sql)) {
      errors.push(`${file}: reconstruction is not labelled "SEMANTIC RECONSTRUCTION"`);
    }
    if (sql.includes(`'${recon.productionChecksum}'`)) {
      errors.push(
        `${file}: quotes the Production checksum as if this file hashed to it. ` +
          `A fresh-branch ledger row must use the reconstruction's own checksum.`,
      );
    }
    notes.push(
      `${version}: SEMANTIC RECONSTRUCTION — file ${sha.slice(0, 12)}… ` +
        `!= Production ledger ${recon.productionChecksum.slice(0, 12)}… (expected). ${recon.reason}`,
    );
  }
}

// 4. The descriptive lineage is frozen: nothing new outside the numbered scheme.
const KNOWN_DESCRIPTIVE = new Set(
  files.filter((f) => !NUMBERED.test(f) && !ROLLBACK.test(f) && !/^\d{3}_/.test(f)),
);
if (legacyNumbered.length > 0) {
  warnings.push(
    `${legacyNumbered.length} hand-written numbered migration(s) below the ${String(GOVERNED_FROM).padStart(4, "0")} ` +
      `governance floor: ${legacyNumbered.join(", ")}. Legacy — reported, not enforced.`,
  );
}

if (KNOWN_DESCRIPTIVE.size > 0) {
  warnings.push(
    `${KNOWN_DESCRIPTIVE.size} descriptive (unnumbered) migrations exist. ` +
      `These predate the ledger and are applied outside it. Do not add more — ` +
      `every new migration must be numbered and self-registering.`,
  );
}

for (const n of notes) console.log(`[check:migration-ledger] NOTE ${n}`);
for (const w of warnings) console.log(`[check:migration-ledger] WARN ${w}`);

if (errors.length > 0) {
  for (const e of errors) console.error(`[check:migration-ledger] ERROR ${e}`);
  console.error(`[check:migration-ledger] FAILED with ${errors.length} error(s)`);
  process.exit(1);
}

console.log(
  `[check:migration-ledger] OK — ${forward.size} numbered migrations, ` +
    `all self-registering, all with rollbacks.`,
);
