/**
 * Wave 1 deepening, batch 1 — three high-intent articles rewritten in place.
 *
 *   node docs/knowledge-center/wave-1/build-deepen-batch1.mjs
 *
 * No merges and no slug changes: these three have no duplicate competing with
 * them. Each keeps its URL and gets a body that answers the question.
 */
import fs from "node:fs";
import path from "node:path";

const BASE = "https://aquavoiq.com";
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const ID = "kc-wave1-deepen-batch1-20260902";
const BACKUP = "blog_posts_backup_deepen_b1_20260902";

const ITEMS = [
  {
    slug: "common-fish-diseases-white-spot",
    draft: "white-spot.html",
    title: "النقط البيضاء (Ich): ليش الدواء ما يقتل النقط اللي تشوفها؟",
    excerpt:
      "طور واحد فقط من الطفيلي مكشوف للدواء، والنقطة اللي تشوفها ليست منه. هذا يفسّر ليش تزيد النقط بعد بدء العلاج، وليش اختفاؤها لا يعني الشفاء.",
    why:
      "The old page gave the right protocol and never said why it works. The parasite has four stages and only the free-swimming theront is exposed to medication; the visible white spot is under the fish's epithelium and the reproductive stage is inside a cyst. That single fact explains the two things that make keepers stop too early — spots increasing after treatment starts, and spots disappearing before the parasite is gone.",
  },
  {
    slug: "how-to-treat-tap-water-for-fish-iraq",
    draft: "tap-water.html",
    title: "معالجة ماء الحنفية للأسماك: كلور أم كلورامين، والفرق العملي",
    excerpt:
      "المعالجة الصحيحة تعتمد على نوع المعقّم في شبكتك، وطريقة الترك تحت الشمس تنفع مع واحد ولا تنفع مع الآخر. وفحص بسيط يعطيك الجواب عن مصدرك أنت.",
    why:
      "The old page asserted that Iraqi treatment plants switched to chloramine. The nitrogen-cycle dossier records that exact question as RESEARCH BLOCKED — no source was found establishing which disinfectant is used, and the truth contract forbids generalising Iraqi water chemistry. The rewrite gives the reader a test that answers it for their own supply (ammonia present right after a water change means chloramine the conditioner did not cover) instead of asserting it for a country.",
  },
  {
    slug: "aquarium-heaters-cheap-vs-premium",
    draft: "heaters.html",
    title: "السخان الرخيص مقابل الجيد: الفرق في طريقة الفشل، لا في التسخين",
    excerpt:
      "كل سخان يسخّن؛ الفرق في دقة المنظّم وفي ماذا يحدث حين يتعطل. السخان الذي يعلق شغالاً أخطر من الذي ينطفئ، وهذا ما يحدد ما تشتريه.",
    why:
      "The old page was 93 words: a wattage rule of thumb and a link to a calculator. The rewrite gives the wattage as a table that accounts for room temperature, explains that two smaller heaters beat one large one because a stuck heater then lacks the power to cook the tank, and reframes the cheap-versus-good question around failure mode — the real risk is a thermostat that sticks ON, which kills by suffocation rather than heat.",
  },
];

const q = (s) => "'" + s.replace(/'/g, "''") + "'";
const lf = (t) => t.split(String.fromCharCode(13) + String.fromCharCode(10)).join(String.fromCharCode(10));

let body = "";
for (const it of ITEMS) {
  const res = await fetch(`${BASE}/api/blog/posts/${it.slug}`);
  if (!res.ok) throw new Error(`${it.slug}: ${res.status}`);
  const data = await res.json();
  const row = data.post ?? data;
  if (!row?.id) throw new Error(`${it.slug}: no id`);
  const html = fs.readFileSync(path.join(HERE, it.draft), "utf8").trim();
  console.log(`${it.slug}: ${row.content.length} -> ${html.length} chars`);

  body += `-- ${it.slug}
--   ${it.why}
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts WHERE slug = ${q(it.slug)} AND is_published
     AND length(content) = ${row.content.length};
  IF n <> 1 THEN RAISE EXCEPTION '${it.slug}: missing or changed since drafting'; END IF;
END $$;

UPDATE blog_posts SET title = ${q(it.title)}, excerpt = ${q(it.excerpt)}, content = ${q(html)}
 WHERE slug = ${q(it.slug)};

`;
}

const sql = `-- Migration ID: ${ID}
-- Target:       Neon production, blog_posts (${ITEMS.length} rows)
-- Rollback:     rollback-deepen-batch1.sql
--
-- Wave 1 deepening, batch 1. Three articles with high search intent and no
-- duplicate to merge; each keeps its URL and gets a body that answers the
-- question rather than restating it.
--
-- All three drafts passed script-purity, editorial and business-truth via
-- scripts/gate-draft.ts before this file was generated.

BEGIN;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts WHERE is_published;
  IF n <> 75 THEN RAISE EXCEPTION 'expected 75 published posts, found %', n; END IF;
END $$;

CREATE TABLE ${BACKUP} AS
SELECT id, slug, title, excerpt, content, is_published, now() AS backed_up_at
  FROM blog_posts;

${body}-- Post-flight: every rewrite carries its structure, nothing was unpublished,
-- and exactly the drafted rows changed.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts
   WHERE slug IN (${ITEMS.map((i) => q(i.slug)).join(", ")})
     AND is_published AND length(content) > 3000
     AND content LIKE '%<table%' AND content LIKE '%href="/blog/%';
  IF n <> ${ITEMS.length} THEN RAISE EXCEPTION 'only % of ${ITEMS.length} rewrites carry their structure', n; END IF;

  SELECT count(*) INTO n FROM blog_posts WHERE is_published;
  IF n <> 75 THEN RAISE EXCEPTION 'publication count moved: %', n; END IF;

  SELECT count(*) INTO n FROM blog_posts b JOIN ${BACKUP} k USING (id)
   WHERE b.content IS DISTINCT FROM k.content;
  IF n <> ${ITEMS.length} THEN RAISE EXCEPTION 'expected ${ITEMS.length} content rewrites, got %', n; END IF;

  -- The one guard rule SQL can state faithfully. The context-sensitive rules
  -- are enforced by gate-draft.ts before this file exists and by the three
  -- corpus audits after it is applied.
  SELECT count(*) INTO n FROM blog_posts
   WHERE slug IN (${ITEMS.map((i) => q(i.slug)).join(", ")})
     AND content ~ '[一-鿿぀-ヿ가-힯Ѐ-ӿऀ-ॿ฀-๿֐-׿Ā-ɏḀ-ỿ]';
  IF n <> 0 THEN RAISE EXCEPTION 'a rewrite introduced stray script'; END IF;

  -- The claim this batch exists to remove must not survive.
  SELECT count(*) INTO n FROM blog_posts
   WHERE slug = 'how-to-treat-tap-water-for-fish-iraq'
     AND content LIKE '%' || 'تعمدت محطات التنقية' || '%';
  IF n <> 0 THEN RAISE EXCEPTION 'the unsourced Iraq-wide chloramine claim survived'; END IF;
END $$;

COMMIT;
`;

fs.writeFileSync(path.join(HERE, "migration-deepen-batch1.sql"), lf(sql));
fs.writeFileSync(
  path.join(HERE, "rollback-deepen-batch1.sql"),
  lf(`-- Rollback for ${ID}. Restores title, excerpt and content verbatim.

BEGIN;

UPDATE blog_posts b
   SET title = k.title, excerpt = k.excerpt, content = k.content
  FROM ${BACKUP} k
 WHERE b.id = k.id AND b.content IS DISTINCT FROM k.content;

COMMIT;
`),
);
console.log(`emitted migration-deepen-batch1.sql (${ITEMS.length} rows) and rollback`);
