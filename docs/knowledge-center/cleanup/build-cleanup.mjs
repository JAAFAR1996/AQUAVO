/**
 * Maintenance cleanup build — the four defects recorded in
 * FINAL_KNOWLEDGE_CENTER_REPORT.md §5, and nothing else.
 *
 *   node docs/knowledge-center/cleanup/build-cleanup.mjs
 *
 * Emits the gated HTML and both SQL files from the SAME source, so what is
 * checked by gate-draft.ts is exactly what the migration ships. Never
 * hand-maintain the output files.
 *
 * `before/` holds the articles exactly as production served them on
 * 2026-09-03, captured before any edit. They are the rollback source: the
 * rollback SQL restores those bytes literally rather than re-deriving them,
 * so a revert is exact rather than approximate.
 *
 * Every edit is an explicit find/replace pair asserted to match EXACTLY ONCE.
 * A pattern that matches zero or twice aborts the build — silent partial
 * application is the failure mode this guards against.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const BEFORE = path.join(DIR, "before");

/** slug -> { title?: {from,to}, edits: [{from,to,why}] } */
const PLAN = {
  // Defect 1 — invented "90%" AND an unsupported Iraq-specific claim, in the
  // same sentence. Reframed to the mechanism (a lid slows evaporation; what
  // evaporates leaves its minerals behind) with no figure and no regional
  // generalisation.
  "how-to-choose-aquarium-tank": {
    edits: [
      {
        why: "invented statistic + unsupported Iraq-specific claim",
        from: "<li><strong>الغطاء (Lid):</strong> يقلل بنسبة 90% من تبخر المياه في الصيف العراقي الحار ويمنع قفز الأسماك خارج الحوض.</li>",
        to: "<li><strong>الغطاء (Lid):</strong> يبطّئ تبخّر الماء، فيثبّت مستوى الحوض ويقلّل الحاجة للإضافة المتكرّرة. وهذا يهم أكثر مما يبدو: الماء وحده هو الذي يتبخّر، أما الأملاح والمعادن فتبقى، فكل تبخّر غير معوَّض يرفع تركيزها تدريجياً. ويمنع الغطاء كذلك قفز الأسماك خارج الحوض.</li>",
      },
    ],
  },

  // Defect 2 — invented prevalence statistic, in the title AND the opening
  // line. The title change is unavoidable: the number is inside it. The emoji
  // goes with it, per the zero-emoji house rule.
  "top-5-mistakes": {
    title: {
      why: "the unsupported 90% statistic is inside the title; emoji violates the zero-emoji rule",
      from: "5 أخطاء يرتكبها 90% من المبتدئين (تقتل أسماكهم) ⚠️",
      to: "5 أخطاء شائعة عند البداية تكلّف المبتدئ أسماكه الأولى",
    },
    edits: [
      {
        why: "invented prevalence statistic presented as fact, plus fake-urgency close",
        from: "<p>90% من المبتدئين يفقدون أسماكهم الأولى خلال الشهر الأول. ليس لأن الأسماك ضعيفة، بل لأن هناك أخطاء شائعة يرتكبها الجميع بدون وعي. تعرف عليها الآن قبل أن تخسر أسماكك!</p>",
        to: "<p>خسارة الأسماك الأولى نادراً ما تكون بسبب ضعف السمكة نفسها. الأشيع أن الحوض لم يكن جاهزاً لاستقبالها بعد: ماء لم يُدوَّر، أو حمل أكبر من قدرة الفلتر، أو روتين عناية لم يبدأ. الأخطاء الخمسة أدناه هي الأكثر تكراراً في البداية، وكلها قابلة للتفادي قبل شراء أول سمكة — لا بعدها.</p>",
      },
    ],
  },

  // Defect 3 — promotional puffery guaranteeing an outcome. The replacement
  // keeps the conclusion's job (closing the article) but ends on the reader's
  // decision instead of on AQUAVO, and states the honest limit: some bettas
  // refuse company regardless of how well the tank mates were chosen.
  "betta-compatible-tank-mates": {
    edits: [
      {
        why: "unsupported business claim guaranteeing an outcome",
        from: "<p>اختيار الزملاء المناسبين لأسماك الفايتر (بيتا) يعتبر تحديًا، ولكن يمكن أن يكون تجربة ممتعة ومثمرة. يجب أن تأخذ في الاعتبار المتطلبات والطبيعة لأسماك الفايتر (بيتا)، وكذلك الظروف البيئية في العراق. في AQUAVO، نوفر لك الخبرة والجودة والموثوقية، لضمان تجربة ممتعة ومثمرة في تربية الأسماك الزينة.</p>",
        to: "<p>اختيار رفقاء الحوض لسمكة الفايتر (بيتا) قرار يعتمد على حجم الحوض ودرجة الحرارة وطباع السمكة نفسها، لا على ما هو متاح وقت الشراء. وبعد أي إضافة، راقب الحوض في الأيام الأولى: مطاردة متكرّرة أو زعانف ممزّقة إشارة إلى أن التركيبة لا تنجح، لا إلى أنها تحتاج وقتاً أطول. وابقَ مستعداً لفصل السمكة عند الحاجة — بعض أفراد الفايتر لا يقبلون رفقة مهما كان الاختيار موفقاً، وهذا سلوك فردي لا يُصلَح بتغيير الرفقاء.</p>",
      },
    ],
  },

  // Defect 4 — markup only. Two <p> elements are opened before a list and
  // never closed (4 open / 2 close). Not one character of prose changes.
  "ornamental-fish-import-middle-east-origins": {
    edits: [
      {
        why: "unclosed <p> before <ul> — markup only, no content change",
        from: "<p>تأتي أسماك الزينة إلى الشرق الأوسط من مختلف الدول، ولكن يمكن تقسيمها إلى ثلاث فئات رئيسية:\n<ul>",
        to: "<p>تأتي أسماك الزينة إلى الشرق الأوسط من مختلف الدول، ولكن يمكن تقسيمها إلى ثلاث فئات رئيسية:</p>\n<ul>",
      },
      {
        why: "unclosed <p> before <ol> — markup only, no content change",
        from: "<p>يواجه استيراد الأسماك الزينة إلى الشرق الأوسط عدة تحديات، بما في ذلك:\n<ol>",
        to: "<p>يواجه استيراد الأسماك الزينة إلى الشرق الأوسط عدة تحديات، بما في ذلك:</p>\n<ol>",
      },
    ],
  },
};

const q = (s) => "'" + s.replace(/'/g, "''") + "'";
const norm = (s) => s.replace(/\r\n/g, "\n");
// LIKE patterns must escape their own wildcards. The defect text literally
// contains "90%", and an unescaped % there turns a precise drift check into
// "matches anything" — precisely the looseness a pre-flight assertion exists
// to prevent. Paired with ESCAPE '\' at every use site.
const likeEsc = (s) => s.replace(/([\\%_])/g, "\\$1");

const results = [];
for (const [slug, spec] of Object.entries(PLAN)) {
  const before = norm(fs.readFileSync(path.join(BEFORE, `${slug}.html`), "utf8"));
  const meta = JSON.parse(fs.readFileSync(path.join(BEFORE, `${slug}.json`), "utf8"));
  let after = before;

  for (const e of spec.edits) {
    const from = norm(e.from);
    const hits = after.split(from).length - 1;
    if (hits !== 1) {
      console.error(`ABORT ${slug}: pattern matched ${hits} times, expected exactly 1`);
      console.error(`       ${from.slice(0, 90)}...`);
      process.exit(1);
    }
    after = after.split(from).join(norm(e.to));
  }

  if (spec.title && meta.title !== spec.title.from) {
    console.error(`ABORT ${slug}: title on record does not match the expected pre-state`);
    process.exit(1);
  }
  if (after === before && !spec.title) {
    console.error(`ABORT ${slug}: no change produced`);
    process.exit(1);
  }

  fs.writeFileSync(path.join(DIR, `_c-${slug}.html`), after);
  results.push({ slug, spec, before, after, meta });
  console.log(
    `${slug.padEnd(44)} ${String(before.length).padStart(5)} -> ${String(after.length).padStart(5)} chars` +
      (spec.title ? "  (+title)" : ""),
  );
}

// ---------------------------------------------------------------- migration
const stamp = "kc-cleanup-20260903";
const mig = [];
mig.push(`-- Migration ID: ${stamp}`);
mig.push(`-- Target:       Neon production, blog_posts`);
mig.push(`--               (4 article corrections, 1 title change, 0 inserts, 0 deletes)`);
mig.push(`-- Rollback:     rollback-cleanup.sql`);
mig.push(`-- Generated by: build-cleanup.mjs — do not hand-edit`);
mig.push(`--`);
mig.push(`-- MAINTENANCE cleanup. Removes the four defects recorded in`);
mig.push(`-- FINAL_KNOWLEDGE_CENTER_REPORT.md §5. No new articles, no new topics, no`);
mig.push(`-- discovery. The published article count MUST NOT change: 115 before, 115 after.`);
mig.push(`--`);
for (const { slug, spec } of results) {
  mig.push(`-- ${slug}`);
  if (spec.title) mig.push(`--   TITLE: ${spec.title.why}`);
  for (const e of spec.edits) mig.push(`--   ${e.why}`);
}
mig.push("");
mig.push("BEGIN;");
mig.push("");
mig.push(`-- Pre-flight: refuse to run against anything but the exact expected pre-state.`);
mig.push(`DO $$`);
mig.push(`DECLARE n int;`);
mig.push(`BEGIN`);
mig.push(`  SELECT count(*) INTO n FROM blog_posts WHERE is_published = true;`);
mig.push(`  IF n <> 115 THEN RAISE EXCEPTION 'pre-state: expected 115 published articles, found %', n; END IF;`);
for (const { slug, spec } of results) {
  for (const e of spec.edits) {
    mig.push(`  SELECT count(*) INTO n FROM blog_posts WHERE slug = ${q(slug)} AND is_published = true AND content LIKE ${q("%" + likeEsc(norm(e.from).slice(0, 60)) + "%")} ESCAPE '\\';`);
    mig.push(`  IF n <> 1 THEN RAISE EXCEPTION 'pre-state: ${slug} does not carry the expected defect text'; END IF;`);
  }
  if (spec.title) {
    mig.push(`  SELECT count(*) INTO n FROM blog_posts WHERE slug = ${q(slug)} AND title = ${q(spec.title.from)};`);
    mig.push(`  IF n <> 1 THEN RAISE EXCEPTION 'pre-state: ${slug} title is not the expected one'; END IF;`);
  }
}
mig.push(`END $$;`);
mig.push("");
for (const { slug, spec, after } of results) {
  mig.push(`-- ${slug}`);
  const sets = [`content = ${q(after)}`];
  if (spec.title) sets.unshift(`title = ${q(spec.title.to)}`);
  mig.push(`UPDATE blog_posts SET ${sets.join(", ")} WHERE slug = ${q(slug)};`);
  mig.push("");
}
mig.push(`-- Post-flight: the corrections landed, the corpus did not change size.`);
mig.push(`DO $$`);
mig.push(`DECLARE n int;`);
mig.push(`BEGIN`);
mig.push(`  SELECT count(*) INTO n FROM blog_posts WHERE is_published = true;`);
mig.push(`  IF n <> 115 THEN RAISE EXCEPTION 'post-state: article count changed to %, expected 115', n; END IF;`);
mig.push(`  -- No article may still carry a bare 90% prevalence/efficacy claim.`);
mig.push(`  SELECT count(*) INTO n FROM blog_posts WHERE is_published = true`);
mig.push(`    AND slug IN ('how-to-choose-aquarium-tank', 'top-5-mistakes')`);
mig.push(`    AND (content LIKE '%90%' OR title LIKE '%90%');`);
mig.push(`  IF n <> 0 THEN RAISE EXCEPTION 'post-state: a 90%% claim survives in % row(s)', n; END IF;`);
mig.push(`  -- No outcome guarantee may remain in the betta article.`);
mig.push(`  SELECT count(*) INTO n FROM blog_posts WHERE slug = 'betta-compatible-tank-mates'`);
mig.push(`    AND (content LIKE '%لضمان%' OR content LIKE '%نضمن%' OR content LIKE '%مضمون%');`);
mig.push(`  IF n <> 0 THEN RAISE EXCEPTION 'post-state: an outcome guarantee survives in the betta article'; END IF;`);
mig.push(`  -- The import article's <p> tags must balance.`);
mig.push(`  SELECT (length(content) - length(replace(content, '<p>', ''))) / 3`);
mig.push(`       - (length(content) - length(replace(content, '</p>', ''))) / 4 INTO n`);
mig.push(`    FROM blog_posts WHERE slug = 'ornamental-fish-import-middle-east-origins';`);
mig.push(`  IF n <> 0 THEN RAISE EXCEPTION 'post-state: import article still has % unclosed <p>', n; END IF;`);
mig.push(`END $$;`);
mig.push("");
mig.push("COMMIT;");
mig.push("");
fs.writeFileSync(path.join(DIR, "migration-cleanup.sql"), mig.join("\n"));

// ----------------------------------------------------------------- rollback
const rb = [];
rb.push(`-- Rollback for ${stamp}`);
rb.push(`-- Restores the four articles to the exact bytes production served on`);
rb.push(`-- 2026-09-03 before the cleanup, taken from before/*.html — not re-derived.`);
rb.push(`-- Generated by: build-cleanup.mjs — do not hand-edit`);
rb.push("");
rb.push("BEGIN;");
rb.push("");
for (const { slug, spec, before, meta } of results) {
  rb.push(`-- ${slug}`);
  const sets = [`content = ${q(before)}`];
  if (spec.title) sets.unshift(`title = ${q(meta.title)}`);
  rb.push(`UPDATE blog_posts SET ${sets.join(", ")} WHERE slug = ${q(slug)};`);
  rb.push("");
}
rb.push(`DO $$`);
rb.push(`DECLARE n int;`);
rb.push(`BEGIN`);
rb.push(`  SELECT count(*) INTO n FROM blog_posts WHERE is_published = true;`);
rb.push(`  IF n <> 115 THEN RAISE EXCEPTION 'rollback: article count changed to %, expected 115', n; END IF;`);
rb.push(`END $$;`);
rb.push("");
rb.push("COMMIT;");
rb.push("");
fs.writeFileSync(path.join(DIR, "rollback-cleanup.sql"), rb.join("\n"));

console.log(`\nwrote migration-cleanup.sql and rollback-cleanup.sql (${results.length} articles)`);
