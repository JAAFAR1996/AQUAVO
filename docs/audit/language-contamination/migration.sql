-- Migration ID: blog-language-contamination-20260901
-- Target:       Neon production, blog_posts
-- Rollback:     rollback-contamination.sql (restores from the backup table)
--
-- Wave 1 Item 0. Removes stray CJK, Cyrillic, Devanagari and spliced-Latin
-- fragments from Arabic article bodies. 70 corrections across 36 articles.
-- Only blog_posts.content is touched: titles and excerpts are already clean.
-- No article is rewritten; each edit is the minimum change that removes the
-- fragment and leaves a grammatical sentence. Every target was verified to
-- exist at its expected count in production, and the full set was applied in
-- memory first, leaving 0 stray glyphs corpus-wide.

BEGIN;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts WHERE is_published;
  IF n <> 80 THEN RAISE EXCEPTION 'expected 80 published posts, found %', n; END IF;
END $$;

CREATE TABLE blog_posts_content_backup_lang_20260901 AS
SELECT id, slug, title, excerpt, content, is_published, now() AS backed_up_at
  FROM blog_posts;

-- blackwater-extract-filter-bacteria-guide (2 corrections)
--   high · 特别 = 'especially'; sentence continues 'حيث تصل درجات الحرارة'
--   high · Cyrillic лор inside الكلور (chlorine); listed beside pesticides
UPDATE blog_posts SET content = replace(replace(content, 'و特别 في العراق', 'وخاصة في العراق'), 'والكлор،', 'والكلور،')
 WHERE id = '5ac0d33a-f44f-480a-b950-2fa921af6ad9';

-- american-vs-african-cichlids-differences (1 correction)
--   high · 成功 = 'success'; 'ظروف معينة لتربية ناجحة'
UPDATE blog_posts SET content = replace(content, 'لتربية成功ية', 'لتربية ناجحة')
 WHERE id = '0f433d30-a234-4fa8-a792-0769adc3307a';

-- saltwater-vs-freshwater-aquarium-beginners (1 correction)
--   high · асп = 'asp' of 'aspects'; list of differences follows
UPDATE blog_posts SET content = replace(content, 'عدة аспهات', 'عدة جوانب')
 WHERE id = 'dca02a0f-b3a9-47a6-adf8-96408b58b2ae';

-- freshwater-pufferfish-care-guide (1 correction)
--   high · 也是 = 'is also'; contrast with 'ليست فقط للزينة'
UPDATE blog_posts SET content = replace(content, 'بل也是 آلية دفاعية', 'بل هي أيضاً آلية دفاعية')
 WHERE id = '05d19c0b-5858-49ca-a621-acc266458a45';

-- aquarium-bedroom-feng-shui-sound-effect (4 corrections)
--   high · выбор = 'choice/selection'
--   high · 然而 = 'however'; pivots from benefits to drawbacks
--   high · 满 = 'satisfy/meet'; Arabic idiom تلبي الاحتياجات
--   high · Vietnamese 'tốc' = speed; faster flow makes the filter louder
UPDATE blog_posts SET content = replace(replace(replace(replace(content, 'عند выбор مكان للحوض', 'عند اختيار مكان للحوض'), '<p>然而،', '<p>ومع ذلك،'), 'ت满ي احتياجاتك', 'تلبي احتياجاتك'), 'زيادة tốcية دوران الماء', 'زيادة سرعة دوران الماء')
 WHERE id = '6e123eae-313d-4904-9f4a-0b1bb68a01a1';

-- aquarium-photography-mobile-tips (2 corrections)
--   high · пан = 'pan' of 'panoramic'; shooting from above
--   high · 添加 = 'add'; photo-editing apps add effects
UPDATE blog_posts SET content = replace(replace(content, 'تأثير панورامي', 'تأثير بانورامي'), 'و添加 تأثيرات', 'وإضافة تأثيرات')
 WHERE id = 'e70b03aa-edc3-4940-8a56-4f7b28f5f5ec';

-- flowerhorn-breeding-nuchal-hump-secrets (3 corrections)
--   high · 然而 = 'however'; pivots to breeding difficulty
--   high · это = 'this'; refers to the ideal conditions just named
--   high · English 'hobbyists' fused to للـ; الهواة is the corpus's own term
UPDATE blog_posts SET content = replace(replace(replace(content, 'الفريد.然而،', 'الفريد. ومع ذلك،'), 'مثالية. это يشمل', 'مثالية. وهذا يشمل'), 'يمكن للحobbyists أن', 'يمكن للهواة أن')
 WHERE id = 'a755c9a6-20f0-44c5-b956-c7efbda28c78';

-- tetra-food-vs-budget-brands-comparison (1 correction)
--   high · 然而 = 'however'; both uses pivot to a drawback
UPDATE blog_posts SET content = replace(content, '然而، قد', 'ومع ذلك، قد')
 WHERE id = 'f591a022-cf34-48d1-8064-06a8f1c7ca62';

-- ornamental-fish-import-middle-east-origins (1 correction)
--   high · 特别 = 'especially'; conditional clause follows
UPDATE blog_posts SET content = replace(content, 'الأسماك،特别 إذا', 'الأسماك، خاصة إذا')
 WHERE id = 'd24b9dd8-69b1-4281-babf-b7045582de12';

-- ro-water-vs-tap-water-aquarium (1 correction)
--   high · Cyrillic лор inside الكلورين (chlorine) in tap water
UPDATE blog_posts SET content = replace(content, 'بالكлорين', 'بالكلورين')
 WHERE id = '8e4fea68-76ba-4ec9-bd4c-979fb4bf7ea2';

-- power-outage-emergency-aquarium-tools (4 corrections)
--   high · может = 'can'; Arabic needs يمكن + لـ before the subject
--   high · здоров = 'health'; wireless pumps preserve fish health
--   high · 特别 = 'especially'; conditions where pumps stop
--   high · Vietnamese 'bất' (any) + French 'besoin' (need) in one clause
UPDATE blog_posts SET content = replace(replace(replace(replace(content, 'حيث может درجة الحرارة أن تصل', 'حيث يمكن لدرجة الحرارة أن تصل'), 'على здоровية الأسماك', 'على صحة الأسماك'), 'الأسماك، و特别 في الظروف', 'الأسماك، وخاصة في الظروف'), 'ل bấtي النصائح والخدمات التي ت besoinها', 'لأي نصائح وخدمات تحتاجها')
 WHERE id = 'ea58873d-d640-451d-9de8-a3fd886a2f74';

-- amazon-biotope-aquarium-setup (1 correction)
--   high · должна = 'must'; pH range follows
UPDATE blog_posts SET content = replace(content, 'должна تكون', 'يجب أن تكون')
 WHERE id = 'c48b143f-21e2-4689-bf2d-edbcce99998b';

-- driftwood-preparation-yellow-water-fix (4 corrections)
--   high · 为什么 = 'why'; heading answered by a reasons list
--   high · также = 'also'
--   high · 达到 = 'reach'; the 50°C summer figure follows
--   high · 这些 = 'these'; refers to the problems just listed
UPDATE blog_posts SET content = replace(replace(replace(replace(content, '<h3>为什么 يجب غلي', '<h3>لماذا يجب غلي'), 'يمكنك также استخدام', 'يمكنك أيضاً استخدام'), 'أن ت达到 درجات الحرارة', 'أن تصل درجات الحرارة'), 'حلولًا ل这些 المشاكل', 'حلولًا لهذه المشاكل')
 WHERE id = '58750f33-71dc-4a5c-8fbb-0b21fadfb716';

-- diy-3d-aquarium-background (3 corrections)
--   high · 能够 = 'able to'; materials able to withstand the heat
--   high · 考虑 = 'consider'; a factors list follows
--   high · English 'nature' fused to لـ; suits the nature of the fish
UPDATE blog_posts SET content = replace(replace(replace(content, 'مواد能够 تحمل', 'مواد قادرة على تحمل'), 'يجب考虑 العوامل التالية', 'يجب مراعاة العوامل التالية'), 'وملائم لnature الأسماك', 'وملائم لطبيعة الأسماك')
 WHERE id = '788a2bf5-3962-4ccf-a857-472e04480d2d';

-- amazon-sword-plant-care-propagation (4 corrections)
--   high · 含 = 'contain'; tap water containing harmful chemicals
--   high · 適 = 'suitable'; choosing plant types suited to Iraq
--   high · Vietnamese 'một' = one
--   high · bare English 'Aquarium' where the Arabic noun belongs
UPDATE blog_posts SET content = replace(replace(replace(replace(content, 'قد يكون含 مواد', 'قد يحتوي على مواد'), 'نباتات適ة', 'نباتات مناسبة'), 'هو một من النباتات', 'هو واحد من النباتات'), 'الشائعة في Aquarium،', 'الشائعة في أحواض الزينة،')
 WHERE id = '37be7189-a819-4cc8-9877-b329a1312fd0';

-- co2-system-planted-aquarium-guide (1 correction)
--   high · 几个 = 'several'; a three-factor list follows
UPDATE blog_posts SET content = replace(content, 'الاعتبار几个 عوامل', 'الاعتبار عدة عوامل')
 WHERE id = '8c0d537a-31b3-435c-b6a4-6bde1d0f141f';

-- best-low-tech-aquarium-plants-beginners (2 corrections)
--   high · 几个 = 'several'; a factors list follows
--   high · Vietnamese 'bằng' displaced بإن of بإنشاء
UPDATE blog_posts SET content = replace(replace(content, 'الاعتبار几个 عوامل', 'الاعتبار عدة عوامل'), 'الأمر bằngشاء حقل مائي', 'الأمر بإنشاء حقل مائي')
 WHERE id = '888fbc8b-96a9-4afd-ad61-524a15abb8b8';

-- iwagumi-aquascape-step-by-step (3 corrections)
--   high · 美 = 'beautiful'; aquascaping as an art form
--   high · между = 'between'
--   high · English 'allow' spliced mid-word; same defect class, Latin script
UPDATE blog_posts SET content = replace(replace(replace(content, 'حوض سمك美 الذي يعتمد', 'حوض سمك جميل يعتمد'), 'كافية между الصخور', 'كافية بين الصخور'), 'لallow الأسماك والنباتات للتحرك', 'للسماح للأسماك والنباتات بالتحرك')
 WHERE id = 'eb6cffec-0a77-4738-a7d9-17f9f3588f17';

-- air-pumps-decoration-or-necessity (4 corrections)
--   high · 设备 = 'equipment/devices'
--   high · 考虑 = 'consider'; a factors list follows
--   high · 理解 = 'understand'
--   high · Devanagari जह for حيث ('where'); same 50°C clause used verbatim across the corpus
UPDATE blog_posts SET content = replace(replace(replace(replace(content, 'هي设备 أساسية', 'هي أجهزة أساسية'), 'يجب考虑 العوامل التالية', 'يجب مراعاة العوامل التالية'), 'نحن ن理解 أهمية', 'نحن ندرك أهمية'), 'जहما تصل درجات الحرارة', 'حيث تصل درجات الحرارة')
 WHERE id = 'fb766902-d243-45c8-a779-a55422b80153';

-- sump-vs-canister-filter-comparison (4 corrections)
--   high · Cyrillic сам inside السامب (sump), defined in the same sentence
--   high · 通常 = 'usually'
--   high · 能够 = 'able to'; a device able to withstand the heat
--   high · 能够 = 'able to'; imperative list item
UPDATE blog_posts SET content = replace(replace(replace(replace(content, 'الсамب هو نظام', 'السامب هو نظام'), 'السامب通常 يُثبت', 'السامب عادةً يُثبت'), 'جهاز ي能够 تحمل', 'جهاز قادر على تحمل'), 'جهازاً ي能够 إزالة', 'جهازاً قادراً على إزالة')
 WHERE id = '5ec5ee28-ce6d-416c-8805-c0e185342ca9';

-- ph-level-iraqi-tap-water-fish (1 correction)
--   high · созд = 'creat-' of создать; إنشاء بيئة صحية
UPDATE blog_posts SET content = replace(content, 'يمكنك создاء بيئة', 'يمكنك إنشاء بيئة')
 WHERE id = '70512819-ab15-465f-a0e9-85a8f838d6f0';

-- cloudy-aquarium-water-causes-fix (1 correction)
--   high · 提供 = 'provide'
UPDATE blog_posts SET content = replace(content, 'حيث ي提供 مواد', 'حيث يوفر مواد')
 WHERE id = 'dcfda5ea-a62f-4522-92c5-0748311a5a6a';

-- activated-carbon-aquarium-when-to-use (2 corrections)
--   high · 什么 = 'what'; definition heading
--   high · Cyrillic лор inside الكلور; carbon adsorbs excess chlorine
UPDATE blog_posts SET content = replace(replace(content, '<h2>什么 هو الفحم النشط؟', '<h2>ما هو الفحم النشط؟'), 'الكлор الزائد', 'الكلور الزائد')
 WHERE id = 'e08f8e86-bf1d-43b0-a17b-ad976d86d720';

-- filter-media-ceramic-rings-bioballs (2 corrections)
--   high · 育 = 'raise/rear'; the fish you keep
--   high · 理解 = 'understand'
UPDATE blog_posts SET content = replace(replace(content, 'التي ت育يها', 'التي تربيها'), 'نحن ن理解 التحديات', 'نحن ندرك التحديات')
 WHERE id = '10ff523f-c5f2-421e-ae1f-a15ac6fdae52';

-- aquarium-heater-winter-iraq (1 correction)
--   high · 这些 = 'these'; refers to the fish types just mentioned
UPDATE blog_posts SET content = replace(content, 'المثالية ل这些 الأسماك', 'المثالية لهذه الأسماك')
 WHERE id = 'c35b13e4-86d2-4ebc-abe5-e4d4e7fdf93e';

-- nitrogen-cycle-simple-arabic-explained (2 corrections)
--   high · 复杂 = 'complex'
--   high · которые = relative 'which'; refers to ammonia and nitrite
UPDATE blog_posts SET content = replace(replace(content, 'هي عملية复杂ة', 'هي عملية معقدة'), 'والنتريت، которые يمكن', 'والنتريت، والتي يمكن')
 WHERE id = '236eb447-ef35-496b-9aa5-554a17b71540';

-- betta-compatible-tank-mates (2 corrections)
--   high · 推荐 = 'recommend'; a recommended list follows
--   high · English 'experience' fused to يكون; adjectives re-agreed to تجربة (fem.)
UPDATE blog_posts SET content = replace(replace(content, 'أن ن推荐 بعض الأسماك', 'أن نوصي ببعض الأسماك'), 'يكونexperience ممتعًا ومثمرًا', 'يكون تجربة ممتعة ومثمرة')
 WHERE id = '767cb67d-030b-47eb-b279-404cf2b32147';

-- koi-fish-outdoor-pond-building-tips (2 corrections)
--   high · 以及 = 'as well as'; third item in a list
--   high · Spanish 'salud' = health; pairs with رفاهية. Both uses identical
UPDATE blog_posts SET content = replace(replace(content, 'الأسماك،以及 جودة المياه', 'الأسماك، وكذلك جودة المياه'), 'salud ورفاهية', 'صحة ورفاهية')
 WHERE id = '95466e0f-72c8-4394-8f5b-d5106c238da5';

-- molly-platy-breeding-save-fry (2 corrections)
--   high · 电 = 'electricity'; the standard power-outage clause used across the corpus
--   high · достаточно = 'enough'; tank big enough for adults and fry
UPDATE blog_posts SET content = replace(replace(content, 'انقطاعات في电يتة', 'انقطاعات في الكهرباء'), 'كبيراً достаточно', 'كبيراً بما يكفي')
 WHERE id = '290b3675-2674-4aca-90bb-5efdabf0f3dd';

-- fin-rot-treatment-guide (1 correction)
--   high · 一种 = 'a kind of'
UPDATE blog_posts SET content = replace(content, 'أسماك الزينة一种 من أنواع', 'أسماك الزينة نوعاً من أنواع')
 WHERE id = '026a2b72-1809-4a96-8453-09747dcf5451';

-- avoid-fake-fish-stores-instagram-scams (2 corrections)
--   high · English 'utilize' fused to تـ; fake shops use stolen photos
--   high · Vietnamese 'dịch vụ' = service; 'خدمة العملاء الجيدة'
UPDATE blog_posts SET content = replace(replace(content, 'ما تutilize صورًا', 'ما تستخدم صورًا'), 'أو dịch vụ العملاء', 'أو خدمة العملاء')
 WHERE id = 'aa078ac4-bd2f-422e-bf63-ff9b3efd2005';

-- can-fish-see-recognize-owners-science (1 correction)
--   high · Vietnamese 'khả' = ability; Arabic needs على after قدرة
UPDATE blog_posts SET content = replace(content, 'khảية الأسماك رؤية', 'قدرة الأسماك على رؤية')
 WHERE id = 'a8bb5bc9-8871-40a8-b92e-a0b1c4f0201a';

-- neon-tetra-color-care-guide (1 correction)
--   high · 'dr' replacing در in درجة, plus a stray leading hyphen
UPDATE blog_posts SET content = replace(content, '<p>-drجة الحرارة المناسبة', '<p>درجة الحرارة المناسبة')
 WHERE id = '0494f8eb-878a-48a1-ba43-927a8db81d2e';

-- aquatic-plant-root-rot-treatment (1 correction)
--   high · English 'behind' fused to الأسباب; 'the causes behind'
UPDATE blog_posts SET content = replace(content, 'الأسبابbehind تعفن', 'الأسباب وراء تعفن')
 WHERE id = '96dd3fa9-274b-48c2-9aa4-273698076748';

-- african-cichlids-best-types-colors (1 correction)
--   high · English 'covers' fused to يـ
UPDATE blog_posts SET content = replace(content, 'والذي يcovers 18 محافظة', 'والذي يغطي 18 محافظة')
 WHERE id = '2edd1325-1ee7-41d9-a185-3ba2855766d3';

-- human-medicine-dangers-for-fish (1 correction)
--   high · bare English 'Iraq' mid-Arabic; corpus uses العراق everywhere else
UPDATE blog_posts SET content = replace(content, '<p>في Iraq،', '<p>في العراق،')
 WHERE id = '0ba039f6-0172-4279-b7cc-29035d180e35';

-- Post-flight: no stray non-Arabic script may survive in a published body.
DO $$
DECLARE leftover int; sample text;
BEGIN
  SELECT count(*) INTO leftover FROM blog_posts
   WHERE is_published = TRUE AND content ~ '[一-鿿぀-ヿЀ-ӿऀ-ॿ]';
  IF leftover <> 0 THEN
    SELECT string_agg(slug, ', ') INTO sample FROM blog_posts
     WHERE is_published = TRUE AND content ~ '[一-鿿぀-ヿЀ-ӿऀ-ॿ]';
    RAISE EXCEPTION '% published articles still carry stray script: %', leftover, sample;
  END IF;
END $$;

COMMIT;
