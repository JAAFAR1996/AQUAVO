// Correction ledger — language-contamination pass 2 (residue).
//
// Pass 1 (blog-language-contamination-20260901) applied 70 corrections across
// 36 articles and declared the corpus clean. Its post-flight guard used
// `[一-鿿぀-ヿЀ-ӿऀ-ॿ]`, which covers Han, Kana, Cyrillic and Devanagari — and
// nothing else. Hangul, Thai, Hebrew and Latin-Extended (Vietnamese) all fall
// outside that class, so four contaminated articles passed the gate.
//
// This pass re-scans with the real guard from shared/script-purity.ts, which is
// the authority, and fixes everything it finds. Same discipline as pass 1: every
// entry names the exact substring live in production, its replacement, why the
// intended Arabic is recoverable, and a confidence. No article is rewritten.
//
// Two entries are NOT recoveries. `bằngرارها` and `ط Ard` were recorded as
// RESEARCH BLOCKED in pass 1 and remain unrecoverable. Rather than leave visible
// corruption or guess at a meaning, the affected fragment is removed and the
// surrounding sentence closes cleanly. Nothing is invented; a claim the corpus
// never supported is simply not made.

export const LEDGER = [
  // ---- Hebrew -------------------------------------------------------------
  {
    slug: "common-fish-diseases-white-spot",
    id: "2141ca04-398a-4303-9a91-c40bf9069fd9",
    n: 1,
    old: "לעلاجه بسرعة:",
    new: "لعلاجه بسرعة:",
    why:
      "Hebrew ל+ע substituted 1:1 for Arabic ل+ع. The surviving 'لاجه' plus that " +
      "prefix gives 'لعلاجه' and nothing else, and the next clause is the " +
      "treatment protocol ('1. ارفع درجة حرارة السخان').",
    conf: "high",
  },

  // ---- Hangul -------------------------------------------------------------
  {
    slug: "american-vs-african-cichlids-differences",
    id: "0f433d30-a234-4fa8-a792-0769adc3307a",
    n: 1,
    old: "لتربية 성공ية",
    new: "لتربية ناجحة",
    why:
      "성공 = 'success'. The same article already writes 'ظروف معينة لتربية ناجحة' " +
      "verbatim twice, so the intended wording is attested in the row itself. " +
      "Pass 1 fixed the Han spelling 成功 of this same phrase and missed the " +
      "Hangul one.",
    conf: "high",
  },

  // ---- Thai ---------------------------------------------------------------
  {
    slug: "ph-level-iraqi-tap-water-fish",
    id: "70512819-ab15-465f-a0e9-85a8f838d6f0",
    n: 1,
    old: "للคลور بكميات زائدة",
    new: "للكلور بكميات زائدة",
    why:
      "Thai ค+ล substituted 1:1 for Arabic ك+ل inside 'للكلور' (chlorine). The " +
      "paragraph is about over-chlorinated Iraqi tap water. Pass 1 made the " +
      "identical repair on a Cyrillic spelling ('والكлор،' → 'والكلور،').",
    conf: "high",
  },

  // ---- RESEARCH BLOCKED — removed, not guessed ----------------------------
  {
    slug: "american-vs-african-cichlids-differences",
    id: "0f433d30-a234-4fa8-a792-0769adc3307a",
    n: 1,
    old: "التي تمتاز bằngرارها وعدوانيتها",
    new: "التي تمتاز بعدوانيتها",
    why:
      "UNRECOVERABLE. Vietnamese 'bằng' displaced a prefix; the surviving 'رارها' " +
      "fits باستمرارها / بإصرارها / باحمرارها / بفرارها and the bullet is about " +
      "behaviour, so no reading is safely inferable. The corrupted trait is " +
      "dropped and the sentence keeps only what survived intact ('وعدوانيتها'), " +
      "which is also the well-attested trait of African rift-lake cichlids. " +
      "Grammatical, and no claim is invented. The bullet is not load-bearing: " +
      "the article's behaviour comparison stands without it.",
    conf: "removal — meaning not recoverable",
  },
  {
    slug: "neon-tetra-color-care-guide",
    id: "0494f8eb-878a-48a1-ba43-927a8db81d2e",
    n: 1,
    old: "استخدام ط Ard معقم المياه",
    new: "استخدام معقم المياه",
    why:
      "UNRECOVERABLE. 'ط Ard' is two fragments with a space in a list of " +
      "water-quality equipment; it could be a product type, a brand or a verb " +
      "and the list item gives no further signal. Removing it leaves " +
      "'استخدام معقم المياه لمنع تلوث المياه' — complete, grammatical, and " +
      "exactly the advice the sentence already carried. Nothing is invented.",
    conf: "removal — meaning not recoverable",
  },

  // ---- Guard false positive, fixed in the content -------------------------
  {
    slug: "algae-war-guide",
    id: "20296a10-0f15-40a5-a032-9e917af50529",
    n: 1,
    old: "والمغذيات وCO2</p>",
    new: "والمغذيات و CO2</p>",
    why:
      "NOT corruption. 'وCO2' is correct Arabic — the conjunction و proclitic on " +
      "a Latin technical term. It trips SPLICED_LATIN, which fails closed on any " +
      "Latin run welded to an Arabic letter because the proclitics ب and ل are " +
      "exactly how real corruption arrived ('بbehind', 'لallow'). Relaxing the " +
      "rule would readmit those, so the space is added here instead and the " +
      "guard stays strict. Reads identically.",
    conf: "high",
  },

  // ---- Structural corruption in the same row ------------------------------
  {
    slug: "neon-tetra-color-care-guide",
    id: "0494f8eb-878a-48a1-ba43-927a8db81d2e",
    n: 1,
    old: '<p>"<h2>مقدمة حول أسماك النيون تيترا</h2>',
    new: "<h2>مقدمة حول أسماك النيون تيترا</h2>",
    why:
      "The whole body was persisted wrapped in a paragraph and a literal double " +
      "quote, so the page opens with a stray \" before its first heading and " +
      "block elements sit inside a <p>. Removes the wrapper opening only.",
    conf: "high",
  },
  {
    slug: "neon-tetra-color-care-guide",
    id: "0494f8eb-878a-48a1-ba43-927a8db81d2e",
    n: 1,
    old: 'عالية الجودة.</p>"</p>',
    new: "عالية الجودة.</p>",
    why: "Closing half of the same stray wrapper — a trailing \" and an unmatched </p>.",
    conf: "high",
  },
];
