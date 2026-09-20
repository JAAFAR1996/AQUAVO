#!/usr/bin/env node
// Arabic-source corrections for the two i18n release blockers.
//
// WHAT THIS DOES
// --------------
// Step "unpublish"  auto-1789869961312 (summer-heat guide) -> is_published = false.
//                   Reviewed in reports/i18n/summer-heat-article-arabic-review.md.
//                   The article is auto-generated and carries a false central premise
//                   (filtration cools water), unsafe advice (ice cubes into the tank,
//                   confirmed "safe" in its own FAQ) and seven 404 internal links.
//                   Unpublishing clears BOTH outstanding validator errors
//                   (content/en/missing, content/ckb/missing) without translating it.
//
// Step "carbon"     activated-carbon-aquarium-when-to-use -> 7 exact substring edits.
//                   Reviewed in reports/i18n/activated-carbon-arabic-correction-proposal.md.
//                   Removes the "carbon treats ammonia" contradiction and 3 stray
//                   Persian/Sorani letters. REQUIRES ITS OWN SIGN-OFF - it is not
//                   included in --step=all unless you pass it explicitly.
//
// Arabic is the source of record, so this runs BEFORE any EN/CKB translation.
// Both edits change the Arabic sourceHash, which correctly marks existing
// translations outdated. Neither marks any locale reviewed.
//
// SAFETY
// ------
//   * Dry run by default. Nothing is written without --commit.
//   * Production is REJECTED unless --allow-production is passed deliberately.
//   * Every edit is anchored to an exact substring that must match EXACTLY ONCE.
//     Any drift aborts the whole run before a single write.
//   * Preconditions are re-verified INSIDE the write transaction.
//   * Prior values are written to a rollback JSON before committing.
//   * The connection string is never printed - only the guard's redacted label.
//
// USAGE
//   node TOOLS/i18n/fix-arabic-source-blockers.mjs                      # dry run, unpublish
//   node TOOLS/i18n/fix-arabic-source-blockers.mjs --step=carbon        # dry run, carbon
//   node TOOLS/i18n/fix-arabic-source-blockers.mjs --step=all           # dry run, both
//   node TOOLS/i18n/fix-arabic-source-blockers.mjs --commit --allow-production
//
// ROLLBACK
//   node TOOLS/i18n/fix-arabic-source-blockers.mjs --rollback=<file> --commit --allow-production
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const { register } = require("tsx/esm/api");
register();

const { resolveScriptDatabaseUrl } = await import("../script-db-guard.mjs");

// ---------------------------------------------------------------- arguments
const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const val = (f) => {
  const hit = argv.find((a) => a.startsWith(`${f}=`));
  return hit ? hit.slice(f.length + 1) : null;
};

const COMMIT = has("--commit");
const ALLOW_PRODUCTION = has("--allow-production");
const ROLLBACK_FILE = val("--rollback");
const STEP = val("--step") ?? "unpublish";

if (!ROLLBACK_FILE && !["unpublish", "carbon", "all"].includes(STEP)) {
  console.error(`Unknown --step=${STEP}. Expected: unpublish | carbon | all`);
  process.exit(2);
}

// ------------------------------------------------------------------- edits
const SUMMER_ID = "auto-1789869961312";
const CARBON_SLUG = "activated-carbon-aquarium-when-to-use";

/** Exact substring edits for the activated-carbon article, in apply order. */
const CARBON_EDITS = [
  {
    note: "block #6 - what carbon absorbs: drop the false ammonia/nitrite claim",
    from: "<li>الأمونيا والنتريت، التي يمكن أن تكون ضارة للأسماك</li>",
    to: "<li>الكلور والكلورامين بعد تغيير الماء</li>",
  },
  {
    note: "block #11 - when to add it",
    from: "<li>عندما تكون مستويات الأمونيا أو النتريت عالية</li>",
    to: "<li>بعد انتهاء دورة علاج دوائي، لسحب بقايا الدواء من الماء</li>",
  },
  {
    note: "block #19 - when to remove it",
    from: "<li>عندما تنخفض مستويات الأمونيا أو النتريت إلى مستويات آمنة</li>",
    to: "<li>قبل البدء بعلاج دوائي جديد، لأن الفحم يسحب الدواء ويلغي مفعوله</li>",
  },
  {
    note: "block #24 - fix the broken verb يامتص -> يمتص",
    from: "يمكن أن يامتص الفحم النشط الكلور الزائد",
    to: "يمكن أن يمتص الفحم النشط الكلور الزائد",
  },
  {
    note: "block #26 - conclusion: state what actually handles ammonia",
    from:
      "يجب وضع الفحم النشط في الحوض عندما تكون مستويات الأمونيا أو النتريت عالية، أو عندما تظهر روائح كريهة من الماء. " +
      "يجب إزالة الفحم النشط من الحوض عندما تنخفض مستويات الأمونيا أو النتريت إلى مستويات آمنة، أو عندما تختفي الروائح الكريهة من الماء.",
    to:
      "يجب وضع الفحم النشط في الحوض عندما تظهر روائح كريهة أو اصفرار في الماء، أو بعد انتهاء علاج دوائي. " +
      "يجب إزالته عندما تختفي الروائح، أو بعد مرور أسابيع قليلة لأن فعاليته تنتهي، أو قبل البدء بعلاج دوائي جديد. " +
      "الأمونيا والنتريت لا يعالجهما الفحم النشط — يعالجهما تغيير الماء والدورة البايولوجية في الفلتر.",
  },
  {
    note: "block #1 - stray Persian/Sorani letters یکی",
    from: "يعد الحوض یکی من أجمل",
    to: "يعد الحوض واحداً من أجمل",
  },
  {
    note: "block #5 - fix the broken verb يامتص -> يمتص",
    from: "فإنه يامتص",
    to: "فإنه يمتص",
  },
  {
    // Not in the original proposal: it quoted this block but only listed two of the
    // three يامتص occurrences, leaving the list lead-in broken. Same class of fix.
    note: "block #6 lead-in - fix the broken verb يامتص -> يمتص",
    from: "الفحم النشط يمكن أن يامتص:",
    to: "الفحم النشط يمكن أن يمتص:",
  },
];

/** Apply the edit list, asserting each anchor matches exactly once. */
function applyCarbonEdits(original) {
  let content = original;
  const applied = [];
  for (const edit of CARBON_EDITS) {
    const count = content.split(edit.from).length - 1;
    if (count !== 1) {
      throw new Error(
        `Anchor drift: expected exactly 1 match, found ${count}.\n` +
          `  edit: ${edit.note}\n  anchor: ${JSON.stringify(edit.from.slice(0, 60))}`,
      );
    }
    content = content.replace(edit.from, edit.to);
    applied.push(edit.note);
  }
  return { content, applied };
}

// -------------------------------------------------------------- connection
let target;
try {
  target = resolveScriptDatabaseUrl({ mode: "migrate", allowProduction: ALLOW_PRODUCTION });
} catch (err) {
  console.error(`\n[db-target] ${err.message}\n`);
  process.exit(2);
}

console.log(`[i18n-fix] target : ${target.redactedLabel}`);
console.log(`[i18n-fix] mode   : ${COMMIT ? "COMMIT (writes)" : "DRY RUN (no writes)"}`);
console.log(`[i18n-fix] step   : ${ROLLBACK_FILE ? `rollback from ${ROLLBACK_FILE}` : STEP}\n`);

if (target.environmentType === "production" && COMMIT) {
  console.log("!! Writing to PRODUCTION content. This was explicitly authorised via --allow-production.\n");
}

const { Pool, neonConfig } = await import("@neondatabase/serverless");
const ws = (await import("ws")).default;
neonConfig.webSocketConstructor = ws;

const pool = new Pool({
  connectionString: target.url.replace(/[&?]channel_binding=require/g, ""),
});

const reportsDir = path.resolve(process.cwd(), "reports/i18n");
let exitCode = 0;

try {
  // ------------------------------------------------------------- rollback
  if (ROLLBACK_FILE) {
    const snapshot = JSON.parse(fs.readFileSync(ROLLBACK_FILE, "utf8"));
    console.log(`Restoring ${snapshot.rows.length} row(s) captured ${snapshot.capturedAt}\n`);
    for (const row of snapshot.rows) {
      console.log(`  - ${row.id} (${row.slug})`);
      for (const [col, v] of Object.entries(row.before)) {
        console.log(`      ${col} <- ${typeof v === "string" && v.length > 60 ? `${v.slice(0, 60)}...` : v}`);
      }
    }
    if (!COMMIT) {
      console.log("\nDRY RUN - nothing restored. Re-run with --commit to apply.");
    } else {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        for (const row of snapshot.rows) {
          const cols = Object.keys(row.before);
          const sets = cols.map((c, i) => `${c} = $${i + 2}`).join(", ");
          await client.query(
            `UPDATE blog_posts SET ${sets}, updated_at = now() WHERE id = $1`,
            [row.id, ...cols.map((c) => row.before[c])],
          );
        }
        await client.query("COMMIT");
        console.log("\nRollback committed.");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    }
    await pool.end();
    process.exit(0);
  }

  // --------------------------------------------------------- plan the work
  const doUnpublish = STEP === "unpublish" || STEP === "all";
  const doCarbon = STEP === "carbon";

  if (STEP === "all") {
    console.log("Note: --step=all covers the unpublish only. The activated-carbon edit");
    console.log("      needs its own sign-off: run it with --step=carbon.\n");
  }

  const planned = [];

  // Step: unpublish -------------------------------------------------------
  if (doUnpublish) {
    const { rows } = await pool.query(
      `SELECT id, slug, title, is_published FROM blog_posts WHERE id = $1`,
      [SUMMER_ID],
    );
    if (rows.length !== 1) {
      throw new Error(`Expected exactly 1 row for ${SUMMER_ID}, found ${rows.length}. Aborting.`);
    }
    const row = rows[0];
    console.log("STEP unpublish");
    console.log(`  id          : ${row.id}`);
    console.log(`  title       : ${row.title}`);
    console.log(`  is_published: ${row.is_published} -> false`);

    if (row.is_published === false) {
      console.log("  ALREADY UNPUBLISHED - nothing to do.\n");
    } else {
      planned.push({
        id: row.id,
        slug: row.slug,
        before: { is_published: row.is_published },
        after: { is_published: false },
      });
      console.log("");
    }
  }

  // Step: carbon ----------------------------------------------------------
  if (doCarbon) {
    const { rows } = await pool.query(
      `SELECT id, slug, title, content FROM blog_posts WHERE slug = $1`,
      [CARBON_SLUG],
    );
    if (rows.length !== 1) {
      throw new Error(`Expected exactly 1 row for ${CARBON_SLUG}, found ${rows.length}. Aborting.`);
    }
    const row = rows[0];
    const { content, applied } = applyCarbonEdits(row.content);

    console.log("STEP carbon");
    console.log(`  id     : ${row.id}`);
    console.log(`  slug   : ${row.slug}`);
    console.log(`  length : ${row.content.length} -> ${content.length}`);
    console.log(`  edits  : ${applied.length}/${CARBON_EDITS.length} anchors matched exactly once`);
    applied.forEach((n) => console.log(`    - ${n}`));

    if (content === row.content) {
      console.log("  NO CHANGE - already corrected.\n");
    } else {
      planned.push({
        id: row.id,
        slug: row.slug,
        before: { content: row.content },
        after: { content },
      });
      console.log("");
    }
  }

  // ------------------------------------------------------------- execution
  if (planned.length === 0) {
    console.log("Nothing to do. Database already matches the reviewed state.");
    await pool.end();
    process.exit(0);
  }

  if (!COMMIT) {
    console.log(`DRY RUN - ${planned.length} row(s) would change. Nothing was written.`);
    console.log("Re-run with --commit (and --allow-production for the live DB) to apply.");
    await pool.end();
    process.exit(0);
  }

  fs.mkdirSync(reportsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const rollbackPath = path.join(reportsDir, `rollback-arabic-source-${stamp}.json`);
  fs.writeFileSync(
    rollbackPath,
    JSON.stringify(
      { capturedAt: new Date().toISOString(), step: STEP, target: target.redactedLabel, rows: planned },
      null,
      2,
    ),
  );
  console.log(`Rollback snapshot: ${rollbackPath}\n`);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const change of planned) {
      // Re-verify preconditions inside the transaction.
      const { rows } = await client.query(
        `SELECT is_published, content FROM blog_posts WHERE id = $1 FOR UPDATE`,
        [change.id],
      );
      if (rows.length !== 1) throw new Error(`Row ${change.id} vanished mid-transaction. Aborting.`);
      const live = rows[0];

      if ("is_published" in change.before && live.is_published !== change.before.is_published) {
        throw new Error(`Row ${change.id}: is_published changed under us. Aborting.`);
      }
      if ("content" in change.before && live.content !== change.before.content) {
        throw new Error(`Row ${change.id}: content changed under us. Aborting.`);
      }

      const cols = Object.keys(change.after);
      const sets = cols.map((c, i) => `${c} = $${i + 2}`).join(", ");
      await client.query(
        `UPDATE blog_posts SET ${sets}, updated_at = now() WHERE id = $1`,
        [change.id, ...cols.map((c) => change.after[c])],
      );
      console.log(`  committed: ${change.id} (${change.slug})`);
    }

    await client.query("COMMIT");
    console.log(`\nCommitted ${planned.length} row(s).`);
    console.log("Next: re-run TOOLS/i18n/validate-translations.ts to confirm the error count.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("\nTransaction rolled back - no changes were applied.");
    throw err;
  } finally {
    client.release();
  }
} catch (err) {
  console.error(`\n[i18n-fix] FAILED: ${err.message}`);
  exitCode = 1;
} finally {
  await pool.end().catch(() => {});
}

process.exit(exitCode);
