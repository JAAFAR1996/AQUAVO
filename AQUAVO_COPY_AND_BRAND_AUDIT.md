# AQUAVO — Copy & Brand Audit (read-only, propose-only)

Scope: `client/src/pages/`, `client/src/components/`, `api/ssr-meta.ts`.
Brand rules enforced: ZERO emoji; premium Baghdadi voice; no physical showroom/visit copy; COD-only; 5,000 IQD flat shipping; 24/7 support; no live fish/plants; no overclaiming, fake urgency, or invented stats.

Note: All line numbers are at time of audit. No source files were modified.

---

## A. EMOJI VIOLATIONS (brand rule = ZERO emoji in customer-facing copy)

Emoji used as decorative/voice elements in real customer copy. (Distinct from icon-glyphs `✓ ✗ → ↓ ⬡` used as bullet/diagram markers — those are flagged separately in section F as lower priority.) Proposed fix for ALL: remove the emoji; rely on the existing lucide icons / layout. Where the emoji carried meaning, fold it into words.

### order-confirmation.tsx (the known offender)
- **367** `🛒 {items.length} منتجات` → `{items.length} منتجات`
- **397** `🚚 التوصيل` → `التوصيل`
- **409** `🎁 الخصم` → `الخصم`
- **419** `💰 الدفع نقداً عند الاستلام` → `الدفع نقداً عند الاستلام`
- **455** `🎉 تهانينا! ترقيت للمستوى ... 💎/🥇/🥈/🥉` → `تهانينا، ترقيت لمستوى {tier}` (drop all medal/gem emoji; the tier name is enough)

### order/invoice/receipt copy
- **invoice-view.tsx:35,38** `مقبولة ✅` / `مكتملة ✅` → `مقبولة` / `مكتملة`
- **invoice-view.tsx:275** `تم تأكيد طلبك! 🎉` → `تم تأكيد طلبك`
- **cart/invoice-dialog.tsx:109,115,122,172** `🚚 التوصيل / 🎁 خصم الكوبون / 💰 مدفوع من رصيد الباقي / 📍 {address}` → drop emoji, keep labels
- **fish-breeding-calculator.tsx:165** toast `✓ تم تحميل الخطة بنجاح!` → `تم تحميل الخطة بنجاح`
- **wishlist.tsx:54** toast `تمت الإضافة للسلة ✓` → `تمت الإضافة للسلة`
- **home/product-of-the-week.tsx:33** toast `تمت الإضافة للسلة ✓` → `تمت الإضافة للسلة`
- **winner-notification-banner.tsx:50,85** `✅ تم نسخ الرمز! / 🎉 مبروك! فزت...` → `تم نسخ الرمز` / `مبروك، فزت بألبوم العائلة`

### auth / account
- **login.tsx:123** `أهلاً بك في عائلتك الثانية! اشتقنا لرؤيتك 💙` → see section B (tone + emoji); propose `أهلاً بيك من جديد` (no emoji)
- **register.tsx:97** toast `تم إنشاء الحساب بنجاح! 🎉` → `تم إنشاء حسابك`
- **register.tsx:164** `🎉 تم استخدام كود دعوة! ستحصل على خصم 5%...` → `تم تفعيل كود الدعوة — خصمك 5% يطبّق بعد أول طلب`
- **saved-plan-view.tsx:23** `مرحباً بعودتك! 👋` → `أهلاً بيك من جديد`

### onboarding-tour.tsx (heavy emoji-as-voice)
- **31** `طبيب أسماك ذكي بجيبك 🩺` → `طبيب أسماك ذكي بجيبك`
- **44** `ارفع صورة سمكتك 📷`, **55** `نتيجة التشخيص 📋`, **71** `حسابات الأحواض بدون دوخة راس 🧮`, **84** `📊`, **95** `✍️`, **111** `📸`, **124** `🌟`, **135** `💬`, **151** `🚀`, **164** `📍`, **175** `🛠️`, **186** `➡️` → remove all trailing emoji; titles stand on their own.

### gamification/shrimp-mascot.tsx (emoji IS the mascot art)
- **24-32, 40-47** mascot uses `🦐 😢 🤔 🎉 💼 🥤 🛡️ 🩳` and lines like `يا هلا! 😊`, `بالعافية! 🥤`, `ارتاح يا بطل ❤️`.
- This is a deliberate emoji mascot — it directly violates the zero-emoji rule. **Recommendation:** replace the emoji mascot with the brand shrimp illustration asset and strip trailing emoji from the speech lines (`يا هلا`, `بالعافية`, `ارتاح يا بطل`). Flag to design for an SVG/PNG mascot.

### diagnosis / fish records (very high emoji density — premium medical tool should read clinical, not chatty)
- **fish-health-diagnosis.tsx** lines 585, 618, 669, 676, 686, 696, 706, 731, 849, 1031, 1035, 1156, 1170, 1185, 1225, 1246, 1254, 1262, 1301, 1313, 1320, 1337/1345 (star rating), 1380, 1392, 1414, 1415, 1466, 1493, 1522, 1640, 1649 → strip all `💡 🧪 🌡️ ⚗️ ⚠️ 🔬 ✅ ❌ 🚨 📅 📊 ✏️ 🤷 ⭐ 📤 📋 ⏳ 📤` from labels/headings/feedback. Use the existing lucide icons (AlertTriangle, CheckCircle, etc.) instead. The medical "محكمة الألف سيناريو" and "Dr. AQUAVO" framing reads more premium without the emoji clutter.
- **fish-patients.tsx** lines 186-189 (status labels `✅ تعافى / ⚠️ ساءت / 📊 مستقر / 💀 نفق`), 204, 230, 249, 314, 340, 416, 426, 459, 535, 577-580, 599 → strip emoji; status labels become `تعافى / تراجعت حالتها / مستقرة / نفقت` with color already conveying state.

### community / misc
- **community-gallery.tsx:184** `شاركنا إبداعك في ألبوم العائلة! 📸`, **459** `📋 الشروط`, **485** `🎁 الجوائز`, **488/492/496/500** `🏆 ⭐ 📱 👑` → strip; use lucide icons.
- **beginner-guide.tsx:59,510,542,608** `🌊 🧪 🎉` in step labels/celebration → strip.
- **cultural-twin.tsx:70,305** decorative `🐠` → acceptable only if purely illustrative; prefer brand illustration.
- **invest.tsx:49,224,230,236,242** `🚀 📦 📢 💻 💵` — investor page, still AQUAVO-branded → strip, use lucide icons.
- **links.tsx:30,48,67,96** `🇮🇶 🐟 🔥 📍` in linktree taglines → strip; `محتوى فيرال 🔥` also overclaims (section C).
- **temperature-guide.tsx:424** `📱` → strip.
- **journey/fish-selection.tsx:615-621** food-type labels `🥣 💊 🧊 🪱 🌿 🥬 💚` → strip (note 🪱 "أكل حي" relates to live food, fine to keep concept but drop emoji).
- **journey/tank-selection.tsx:81-84** `🐟 🐠 🐡 🐳` size hints → strip.
- **journey/journey-summary.tsx:261** `...خصيصاً لك 🤖🐠` → strip.
- **profile/profile-loyalty.tsx:266,706**, **profile-referral.tsx:87** (`🎁` in share text), **profile-addresses.tsx:169** (`📞`) → strip.
- **fish/compatibility-calculator.tsx:468-470**, **fish/fish-comparison-tool.tsx:195-199**, **ai/SentimentIndicator.tsx:164-167**, **ai/VisualAnalyzer.tsx:144** (`🔍`) → strip; keep words + color.
- **why-aquavo.tsx:157** `AQUAVO ✓` → keep `✓` only if it's a comparison-table check glyph; otherwise drop.

### Admin-facing (lower priority — not customer-facing, but same brand rule)
- **admin-dashboard.tsx:720-728, 1629**, **admin/admin-ai.tsx:165,170,178,181,392** → emoji in admin tabs/toasts. Internal-only; fix in a later pass.

---

## B. GENERIC AI / NON-PREMIUM / NON-BAGHDADI TONE

1. **login.tsx:123** — `أهلاً بك في عائلتك الثانية! اشتقنا لرؤيتك 💙`
   - Issue: saccharine, generic-AI warmth + Modern-Standard "أهلاً بك" (not Baghdadi) + emoji.
   - Rewrite: `أهلاً بيك من جديد`.

2. **contact.tsx:18** — `فريق AQUAVO جاهز يساعدك — اختار الطريقة الأسهل عليك`
   - Mostly fine/Baghdadi. Keep. (Good example of the target voice.)

3. **about.tsx:35** — `نحن هواة أحواض زينة قبل أن نكون متجراً.`
   - Tone fine but fully MSA. The About page is MSA throughout; acceptable for a formal page, but consider light Baghdadi warmth in the hero. Low priority.

4. **journey-summary.tsx:261** — `يقوم الذكاء الاصطناعي باختيار أفضل المنتجات خصيصاً لك`
   - Generic AI phrasing + MSA. Rewrite: `نختار لك المنتجات المناسبة لحوضك` (drops "الذكاء الاصطناعي" buzzword as voice, less robotic).

5. **shrimp-mascot.tsx:46** — `ولا يهمك، الشرمب حارس عليه!`
   - Baghdadi and on-brand voice-wise; only the emoji is the problem.

---

## C. OVERCLAIMING / TOO-STRONG PROMISES

1. **about.tsx:106-107** — `هو أول وأكبر متجر إلكتروني متخصص...` and **96** `أول متجر اونلاين متخصص في العراق`
   - Issue: "أكبر" (biggest) is an unverifiable superiority claim; "الأول" is a strong claim. Combined "أول وأكبر" is the riskiest.
   - Rewrite: keep a defensible single claim — `متجر إلكتروني عراقي متخصص في مستلزمات أحواض الزينة` (drop "أكبر"; if "الأول" is genuinely true and dated to 2024, it can stay, but never paired with "أكبر").

2. **about.tsx:30 & VALUES** — `توصيل خلال 24 ساعة فقط` ; **ssr-meta.ts:311** — `التوصيل خلال 24 ساعة`
   - Issue: a hard 24-hour delivery promise to all 18 provinces is very strong and risky operationally.
   - Rewrite: `توصيل سريع لكل محافظات العراق` or `عادةً خلال 24–72 ساعة حسب المحافظة`. Honor the real 5,000 IQD flat fee (already correct).

3. **about.tsx:25** — `جميع منتجاتنا أصلية 100%`
   - Issue: absolute guarantee. Keep only if contractually true; safer: `منتجات أصلية من ماركات عالمية موثوقة`.

4. **ssr-meta.ts:43,55,97,364 etc.** — repeated `أفضل مستلزمات أحواض الزينة في العراق`, **142** `أقوى العروض`, **364** `أفضل خيار ... مضمونة`
   - Issue: "أفضل"/"أقوى"/"مضمونة" are superlative overclaims in meta/JSON-LD.
   - Rewrite: `تشكيلة متخصصة من مستلزمات أحواض الزينة في العراق`, `عروض وتخفيضات على...`, drop `مضمونة`. (Meta descriptions don't need superlatives to rank; specificity wins.)

5. **links.tsx:67** — `@aquavo.iq — محتوى فيرال 🔥`
   - Issue: "فيرال" is hype/overclaim + emoji.
   - Rewrite: `@aquavo.iq — متابعونا على انستغرام`.

6. **about.tsx:40 / 158** — `استشارات مجانية لكل عملائنا` / `دعمنا الفني المتخصص المجاني`
   - Consistent with 24/7 support claim; fine as long as honored.

---

## D. PHYSICAL-STORE / SHOWROOM IMPLICATIONS  (AQUAVO has NO physical store)

No Arabic "زورونا / محلنا / معرضنا / تعالوا" copy exists anywhere — good. But two structural issues imply a physical, walk-in business:

1. **CRITICAL — ssr-meta.ts:65-68** `openingHoursSpecification` (Sat–Thu 09:00–21:00, Fri 14:00–21:00) on a `LocalBusiness`-style schema with **geo coordinates (33.3152, 44.3661)** and a Baghdad `PostalAddress`.
   - Issue: `openingHoursSpecification` + precise `geo` strongly imply a physical premises customers can visit during "opening hours." AQUAVO is online-only with **24/7 support** — this both implies a showroom AND contradicts the 24/7 rule.
   - Proposed fix: remove `openingHoursSpecification` and `geo` (or model as `OnlineStore` / `OnlineBusiness`). Keep `address` only as a registered locality (addressLocality: بغداد) without implying walk-in hours. Represent support availability via `contactPoint` with `hoursAvailable` Mo-Su 00:00–23:59 if 24/7 is to be expressed in schema.

2. **about.tsx:235-238 & contact.tsx:88-92** — "ساعات العمل: السبت–الخميس 9ص–9م" (about) / "10ص–9م ... واتساب متاح على مدار الساعة" (contact)
   - Issue: "ساعات العمل" with day/time ranges reads like store hours and implies limited availability, contradicting the 24/7 support rule. The two pages also **disagree** (9am vs 10am; about omits the 24/7 WhatsApp note).
   - Proposed fix: reframe both as **support hours, not store hours**, and lead with 24/7: e.g. `الدعم متاح 24/7 عبر واتساب. للاتصال الهاتفي: السبت–الخميس`. Make the two pages consistent and align with the CLAUDE.md 24/7 rule.

No live-fish/live-plant selling claims were found in the audited copy (encyclopedia/guides are educational, not sales). JSON-LD product/business descriptions correctly say "مستلزمات أحواض الزينة" — compliant.

---

## E. FAKE URGENCY / SCARCITY / SOCIAL PROOF

- No fabricated countdowns, "only X left", or invented review counts found in the audited static copy. (deals.tsx uses real discount data; verify any "ينتهي خلال" timers are backed by real end dates before publishing.)
- **about.tsx:15** STAT `"18" محافظة عراقية` and `"2024" سنة التأسيس` are factual — fine. The `"بريميوم"` stat (line 14) is a vibe-label, not a number — acceptable but soft.
- **links.tsx:67** "فيرال" is the only hype/social-proof-flavored claim — see C5.

---

## F. ICON-GLYPHS (lower priority — not emoji-as-voice, but review for premium polish)

Many guide pages use `✓ ✗ ✕ → ↓ ⬡ ⬢ ↺ ⚠ ✦ ⬇ ⬆ ⚖ ★ ☆` as bullet/diagram markers (e.g. guides-filter-choice.tsx, guides-aquarium-salt.tsx, guides-treatment-basics.tsx, footer.tsx:247-259/400, why-aquavo.tsx:157). These are typographic symbols, not color emoji, and are generally acceptable in a premium dark UI. Recommendation: leave as-is for now, but for top consistency consider swapping `✓/✗` to lucide Check/X icons where they appear inline with body copy. `⚠`/`🚨` warning markers in guides should standardize on one style (lucide AlertTriangle).

---

## SUMMARY — TOP 12 COPY FIXES

1. **order-confirmation.tsx (367,397,409,419,455)** — strip `🛒🚚🎁💰🎉💎🥇🥈🥉`; this is the flagship checkout screen and the known offender. Highest priority.
2. **ssr-meta.ts:65-68 + geo** — remove `openingHoursSpecification` + precise `geo`; they imply a walk-in showroom AND contradict 24/7 support. (Physical-store implication #1.)
3. **about.tsx:106 / 96** — drop "أكبر" from "أول وأكبر"; unverifiable superlative.
4. **about.tsx:30 + ssr-meta.ts:311** — soften hard "24 ساعة فقط" delivery promise to "سريع / 24–72 ساعة حسب المحافظة".
5. **about.tsx:235-238 vs contact.tsx:88-92** — reframe "ساعات العمل" as support hours, lead with 24/7, and reconcile the 9am-vs-10am contradiction. (Physical-store implication #2.)
6. **ssr-meta.ts (multiple)** — replace superlatives "أفضل / أقوى / مضمونة" with specific, defensible descriptions.
7. **fish-health-diagnosis.tsx** — strip the ~30 emoji throughout the medical tool; use lucide icons so "Dr. AQUAVO" reads clinical/premium.
8. **shrimp-mascot.tsx** — replace emoji mascot + emoji-laden speech with brand illustration asset and clean Baghdadi lines (flag to design).
9. **onboarding-tour.tsx** — remove trailing emoji from all 12 step titles.
10. **login.tsx:123** — replace generic-AI "أهلاً بك في عائلتك الثانية! اشتقنا لرؤيتك 💙" with Baghdadi "أهلاً بيك من جديد".
11. **register.tsx:97,164 / saved-plan-view.tsx:23 / winner-notification-banner.tsx / invoice-view.tsx** — strip celebration emoji from all confirmations/toasts.
12. **links.tsx:67** — remove "محتوى فيرال 🔥" hype claim; use a factual social handle line.

## PHYSICAL-STORE IMPLICATIONS FOUND (no Arabic "visit us" copy anywhere)
- **ssr-meta.ts:65-68** `openingHoursSpecification` + **:60** precise `geo` coordinates on a Baghdad address → implies a visitable premises during set hours. Online-only business should drop these (also fixes the 24/7 contradiction).
- **about.tsx:235-238** & **contact.tsx:88-92** "ساعات العمل" day/time ranges → reads as store opening hours; reframe as support hours and lead with the 24/7 WhatsApp availability. The two pages currently contradict each other (Sat–Thu 9am vs 10am).
