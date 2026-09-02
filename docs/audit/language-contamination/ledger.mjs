// Correction ledger for Wave 1 Item 0 — language-contamination cleanup.
//
// Every entry: the exact substring live in production, the replacement, why the
// intended Arabic is recoverable from the surrounding sentence, and confidence.
// Each replacement is the minimum edit that removes the foreign fragment and
// leaves a grammatical Arabic sentence. No article is rewritten.
//
// `n` is the number of occurrences expected in production. Postgres replace()
// is global, so one entry covers all occurrences of an identical string.

export const LEDGER = [
  // ---- CJK ----------------------------------------------------------------
  { slug: "blackwater-extract-filter-bacteria-guide", n: 1,
    old: "و特别 في العراق", new: "وخاصة في العراق",
    why: "特别 = 'especially'; sentence continues 'حيث تصل درجات الحرارة'", conf: "high" },
  { slug: "blackwater-extract-filter-bacteria-guide", n: 1,
    old: "والكлор،", new: "والكلور،",
    why: "Cyrillic лор inside الكلور (chlorine); listed beside pesticides", conf: "high" },

  { slug: "american-vs-african-cichlids-differences", n: 2,
    old: "لتربية成功ية", new: "لتربية ناجحة",
    why: "成功 = 'success'; 'ظروف معينة لتربية ناجحة'", conf: "high" },

  { slug: "saltwater-vs-freshwater-aquarium-beginners", n: 1,
    old: "عدة аспهات", new: "عدة جوانب",
    why: "асп = 'asp' of 'aspects'; list of differences follows", conf: "high" },

  { slug: "freshwater-pufferfish-care-guide", n: 1,
    old: "بل也是 آلية دفاعية", new: "بل هي أيضاً آلية دفاعية",
    why: "也是 = 'is also'; contrast with 'ليست فقط للزينة'", conf: "high" },

  { slug: "aquarium-bedroom-feng-shui-sound-effect", n: 1,
    old: "عند выбор مكان للحوض", new: "عند اختيار مكان للحوض",
    why: "выбор = 'choice/selection'", conf: "high" },
  { slug: "aquarium-bedroom-feng-shui-sound-effect", n: 1,
    old: "<p>然而،", new: "<p>ومع ذلك،",
    why: "然而 = 'however'; pivots from benefits to drawbacks", conf: "high" },
  { slug: "aquarium-bedroom-feng-shui-sound-effect", n: 1,
    old: "ت满ي احتياجاتك", new: "تلبي احتياجاتك",
    why: "满 = 'satisfy/meet'; Arabic idiom تلبي الاحتياجات", conf: "high" },

  { slug: "aquarium-photography-mobile-tips", n: 1,
    old: "تأثير панورامي", new: "تأثير بانورامي",
    why: "пан = 'pan' of 'panoramic'; shooting from above", conf: "high" },
  { slug: "aquarium-photography-mobile-tips", n: 1,
    old: "و添加 تأثيرات", new: "وإضافة تأثيرات",
    why: "添加 = 'add'; photo-editing apps add effects", conf: "high" },

  { slug: "flowerhorn-breeding-nuchal-hump-secrets", n: 1,
    old: "الفريد.然而،", new: "الفريد. ومع ذلك،",
    why: "然而 = 'however'; pivots to breeding difficulty", conf: "high" },
  { slug: "flowerhorn-breeding-nuchal-hump-secrets", n: 1,
    old: "مثالية. это يشمل", new: "مثالية. وهذا يشمل",
    why: "это = 'this'; refers to the ideal conditions just named", conf: "high" },

  { slug: "tetra-food-vs-budget-brands-comparison", n: 2,
    old: "然而، قد", new: "ومع ذلك، قد",
    why: "然而 = 'however'; both uses pivot to a drawback", conf: "high" },

  { slug: "ornamental-fish-import-middle-east-origins", n: 1,
    old: "الأسماك،特别 إذا", new: "الأسماك، خاصة إذا",
    why: "特别 = 'especially'; conditional clause follows", conf: "high" },

  { slug: "ro-water-vs-tap-water-aquarium", n: 1,
    old: "بالكлорين", new: "بالكلورين",
    why: "Cyrillic лор inside الكلورين (chlorine) in tap water", conf: "high" },

  { slug: "power-outage-emergency-aquarium-tools", n: 1,
    old: "حيث может درجة الحرارة أن تصل", new: "حيث يمكن لدرجة الحرارة أن تصل",
    why: "может = 'can'; Arabic needs يمكن + لـ before the subject", conf: "high" },
  { slug: "power-outage-emergency-aquarium-tools", n: 1,
    old: "على здоровية الأسماك", new: "على صحة الأسماك",
    why: "здоров = 'health'; wireless pumps preserve fish health", conf: "high" },
  { slug: "power-outage-emergency-aquarium-tools", n: 1,
    old: "الأسماك، و特别 في الظروف", new: "الأسماك، وخاصة في الظروف",
    why: "特别 = 'especially'; conditions where pumps stop", conf: "high" },

  { slug: "amazon-biotope-aquarium-setup", n: 1,
    old: "должна تكون", new: "يجب أن تكون",
    why: "должна = 'must'; pH range follows", conf: "high" },

  { slug: "driftwood-preparation-yellow-water-fix", n: 1,
    old: "<h3>为什么 يجب غلي", new: "<h3>لماذا يجب غلي",
    why: "为什么 = 'why'; heading answered by a reasons list", conf: "high" },
  { slug: "driftwood-preparation-yellow-water-fix", n: 1,
    old: "يمكنك также استخدام", new: "يمكنك أيضاً استخدام",
    why: "также = 'also'", conf: "high" },
  { slug: "driftwood-preparation-yellow-water-fix", n: 1,
    old: "أن ت达到 درجات الحرارة", new: "أن تصل درجات الحرارة",
    why: "达到 = 'reach'; the 50°C summer figure follows", conf: "high" },
  { slug: "driftwood-preparation-yellow-water-fix", n: 1,
    old: "حلولًا ل这些 المشاكل", new: "حلولًا لهذه المشاكل",
    why: "这些 = 'these'; refers to the problems just listed", conf: "high" },

  { slug: "diy-3d-aquarium-background", n: 1,
    old: "مواد能够 تحمل", new: "مواد قادرة على تحمل",
    why: "能够 = 'able to'; materials able to withstand the heat", conf: "high" },
  { slug: "diy-3d-aquarium-background", n: 1,
    old: "يجب考虑 العوامل التالية", new: "يجب مراعاة العوامل التالية",
    why: "考虑 = 'consider'; a factors list follows", conf: "high" },

  { slug: "amazon-sword-plant-care-propagation", n: 1,
    old: "قد يكون含 مواد", new: "قد يحتوي على مواد",
    why: "含 = 'contain'; tap water containing harmful chemicals", conf: "high" },
  { slug: "amazon-sword-plant-care-propagation", n: 2,
    old: "نباتات適ة", new: "نباتات مناسبة",
    why: "適 = 'suitable'; choosing plant types suited to Iraq", conf: "high" },

  { slug: "co2-system-planted-aquarium-guide", n: 1,
    old: "الاعتبار几个 عوامل", new: "الاعتبار عدة عوامل",
    why: "几个 = 'several'; a three-factor list follows", conf: "high" },

  { slug: "best-low-tech-aquarium-plants-beginners", n: 1,
    old: "الاعتبار几个 عوامل", new: "الاعتبار عدة عوامل",
    why: "几个 = 'several'; a factors list follows", conf: "high" },

  { slug: "iwagumi-aquascape-step-by-step", n: 1,
    old: "حوض سمك美 الذي يعتمد", new: "حوض سمك جميل يعتمد",
    why: "美 = 'beautiful'; aquascaping as an art form", conf: "high" },
  { slug: "iwagumi-aquascape-step-by-step", n: 1,
    old: "كافية между الصخور", new: "كافية بين الصخور",
    why: "между = 'between'", conf: "high" },
  { slug: "iwagumi-aquascape-step-by-step", n: 1,
    old: "لallow الأسماك والنباتات للتحرك", new: "للسماح للأسماك والنباتات بالتحرك",
    why: "English 'allow' spliced mid-word; same defect class, Latin script", conf: "high" },

  { slug: "air-pumps-decoration-or-necessity", n: 1,
    old: "هي设备 أساسية", new: "هي أجهزة أساسية",
    why: "设备 = 'equipment/devices'", conf: "high" },
  { slug: "air-pumps-decoration-or-necessity", n: 1,
    old: "يجب考虑 العوامل التالية", new: "يجب مراعاة العوامل التالية",
    why: "考虑 = 'consider'; a factors list follows", conf: "high" },
  { slug: "air-pumps-decoration-or-necessity", n: 1,
    old: "نحن ن理解 أهمية", new: "نحن ندرك أهمية",
    why: "理解 = 'understand'", conf: "high" },
  { slug: "air-pumps-decoration-or-necessity", n: 1,
    old: "जहما تصل درجات الحرارة", new: "حيث تصل درجات الحرارة",
    why: "Devanagari जह for حيث ('where'); same 50°C clause used verbatim across the corpus", conf: "high" },

  { slug: "sump-vs-canister-filter-comparison", n: 1,
    old: "الсамب هو نظام", new: "السامب هو نظام",
    why: "Cyrillic сам inside السامب (sump), defined in the same sentence", conf: "high" },
  { slug: "sump-vs-canister-filter-comparison", n: 1,
    old: "السامب通常 يُثبت", new: "السامب عادةً يُثبت",
    why: "通常 = 'usually'", conf: "high" },
  { slug: "sump-vs-canister-filter-comparison", n: 1,
    old: "جهاز ي能够 تحمل", new: "جهاز قادر على تحمل",
    why: "能够 = 'able to'; a device able to withstand the heat", conf: "high" },
  { slug: "sump-vs-canister-filter-comparison", n: 1,
    old: "جهازاً ي能够 إزالة", new: "جهازاً قادراً على إزالة",
    why: "能够 = 'able to'; imperative list item", conf: "high" },

  { slug: "ph-level-iraqi-tap-water-fish", n: 1,
    old: "يمكنك создاء بيئة", new: "يمكنك إنشاء بيئة",
    why: "созд = 'creat-' of создать; إنشاء بيئة صحية", conf: "high" },

  { slug: "cloudy-aquarium-water-causes-fix", n: 1,
    old: "حيث ي提供 مواد", new: "حيث يوفر مواد",
    why: "提供 = 'provide'", conf: "high" },

  { slug: "activated-carbon-aquarium-when-to-use", n: 1,
    old: "<h2>什么 هو الفحم النشط؟", new: "<h2>ما هو الفحم النشط؟",
    why: "什么 = 'what'; definition heading", conf: "high" },
  { slug: "activated-carbon-aquarium-when-to-use", n: 1,
    old: "الكлор الزائد", new: "الكلور الزائد",
    why: "Cyrillic лор inside الكلور; carbon adsorbs excess chlorine", conf: "high" },

  { slug: "filter-media-ceramic-rings-bioballs", n: 1,
    old: "التي ت育يها", new: "التي تربيها",
    why: "育 = 'raise/rear'; the fish you keep", conf: "high" },
  { slug: "filter-media-ceramic-rings-bioballs", n: 1,
    old: "نحن ن理解 التحديات", new: "نحن ندرك التحديات",
    why: "理解 = 'understand'", conf: "high" },

  { slug: "aquarium-heater-winter-iraq", n: 1,
    old: "المثالية ل这些 الأسماك", new: "المثالية لهذه الأسماك",
    why: "这些 = 'these'; refers to the fish types just mentioned", conf: "high" },

  { slug: "nitrogen-cycle-simple-arabic-explained", n: 1,
    old: "هي عملية复杂ة", new: "هي عملية معقدة",
    why: "复杂 = 'complex'", conf: "high" },
  { slug: "nitrogen-cycle-simple-arabic-explained", n: 1,
    old: "والنتريت، которые يمكن", new: "والنتريت، والتي يمكن",
    why: "которые = relative 'which'; refers to ammonia and nitrite", conf: "high" },

  { slug: "betta-compatible-tank-mates", n: 1,
    old: "أن ن推荐 بعض الأسماك", new: "أن نوصي ببعض الأسماك",
    why: "推荐 = 'recommend'; a recommended list follows", conf: "high" },

  { slug: "koi-fish-outdoor-pond-building-tips", n: 1,
    old: "الأسماك،以及 جودة المياه", new: "الأسماك، وكذلك جودة المياه",
    why: "以及 = 'as well as'; third item in a list", conf: "high" },
  { slug: "koi-fish-outdoor-pond-building-tips", n: 2,
    old: "salud ورفاهية", new: "صحة ورفاهية",
    why: "Spanish 'salud' = health; pairs with رفاهية. Both uses identical", conf: "high" },

  { slug: "molly-platy-breeding-save-fry", n: 1,
    old: "انقطاعات في电يتة", new: "انقطاعات في الكهرباء",
    why: "电 = 'electricity'; the standard power-outage clause used across the corpus", conf: "high" },
  { slug: "molly-platy-breeding-save-fry", n: 1,
    old: "كبيراً достаточно", new: "كبيراً بما يكفي",
    why: "достаточно = 'enough'; tank big enough for adults and fry", conf: "high" },

  { slug: "fin-rot-treatment-guide", n: 1,
    old: "أسماك الزينة一种 من أنواع", new: "أسماك الزينة نوعاً من أنواع",
    why: "一种 = 'a kind of'", conf: "high" },

  // ---- Vietnamese / French / spliced Latin --------------------------------
  // Same generator defect, different source language. Found by widening the
  // scan to Latin-Extended diacritics and Latin-fused-to-Arabic splices.
  { slug: "avoid-fake-fish-stores-instagram-scams", n: 1,
    old: "ما تutilize صورًا", new: "ما تستخدم صورًا",
    why: "English 'utilize' fused to تـ; fake shops use stolen photos", conf: "high" },
  { slug: "avoid-fake-fish-stores-instagram-scams", n: 1,
    old: "أو dịch vụ العملاء", new: "أو خدمة العملاء",
    why: "Vietnamese 'dịch vụ' = service; 'خدمة العملاء الجيدة'", conf: "high" },

  { slug: "can-fish-see-recognize-owners-science", n: 2,
    old: "khảية الأسماك رؤية", new: "قدرة الأسماك على رؤية",
    why: "Vietnamese 'khả' = ability; Arabic needs على after قدرة", conf: "high" },

  { slug: "aquarium-bedroom-feng-shui-sound-effect", n: 2,
    old: "زيادة tốcية دوران الماء", new: "زيادة سرعة دوران الماء",
    why: "Vietnamese 'tốc' = speed; faster flow makes the filter louder", conf: "high" },

  { slug: "neon-tetra-color-care-guide", n: 1,
    old: "<p>-drجة الحرارة المناسبة", new: "<p>درجة الحرارة المناسبة",
    why: "'dr' replacing در in درجة, plus a stray leading hyphen", conf: "high" },

  { slug: "flowerhorn-breeding-nuchal-hump-secrets", n: 1,
    old: "يمكن للحobbyists أن", new: "يمكن للهواة أن",
    why: "English 'hobbyists' fused to للـ; الهواة is the corpus's own term", conf: "high" },

  { slug: "power-outage-emergency-aquarium-tools", n: 1,
    old: "ل bấtي النصائح والخدمات التي ت besoinها", new: "لأي نصائح وخدمات تحتاجها",
    why: "Vietnamese 'bất' (any) + French 'besoin' (need) in one clause", conf: "high" },

  { slug: "diy-3d-aquarium-background", n: 1,
    old: "وملائم لnature الأسماك", new: "وملائم لطبيعة الأسماك",
    why: "English 'nature' fused to لـ; suits the nature of the fish", conf: "high" },

  { slug: "aquatic-plant-root-rot-treatment", n: 1,
    old: "الأسبابbehind تعفن", new: "الأسباب وراء تعفن",
    why: "English 'behind' fused to الأسباب; 'the causes behind'", conf: "high" },

  { slug: "best-low-tech-aquarium-plants-beginners", n: 1,
    old: "الأمر bằngشاء حقل مائي", new: "الأمر بإنشاء حقل مائي",
    why: "Vietnamese 'bằng' displaced بإن of بإنشاء", conf: "high" },

  { slug: "betta-compatible-tank-mates", n: 1,
    old: "يكونexperience ممتعًا ومثمرًا", new: "يكون تجربة ممتعة ومثمرة",
    why: "English 'experience' fused to يكون; adjectives re-agreed to تجربة (fem.)", conf: "high" },

  { slug: "african-cichlids-best-types-colors", n: 1,
    old: "والذي يcovers 18 محافظة", new: "والذي يغطي 18 محافظة",
    why: "English 'covers' fused to يـ", conf: "high" },

  { slug: "amazon-sword-plant-care-propagation", n: 1,
    old: "هو một من النباتات", new: "هو واحد من النباتات",
    why: "Vietnamese 'một' = one", conf: "high" },
  { slug: "amazon-sword-plant-care-propagation", n: 1,
    old: "الشائعة في Aquarium،", new: "الشائعة في أحواض الزينة،",
    why: "bare English 'Aquarium' where the Arabic noun belongs", conf: "high" },

  { slug: "human-medicine-dangers-for-fish", n: 1,
    old: "<p>في Iraq،", new: "<p>في العراق،",
    why: "bare English 'Iraq' mid-Arabic; corpus uses العراق everywhere else", conf: "high" },
];

// RESEARCH BLOCKED — meaning cannot be recovered confidently from context.
// Left untouched deliberately. Both are Latin-script, so the post-flight guard
// (CJK/Cyrillic/Devanagari) still passes; they need a human decision.
export const BLOCKED = [
  { slug: "american-vs-african-cichlids-differences", frag: "bằngرارها",
    context: "السيكلد الإفريقية، التي تمتاز bằngرارها وعدوانيتها",
    why: "Vietnamese 'bằng' displaced an unknown prefix. The surviving suffix رارها fits " +
         "several different words (باستمرارها / بإصرارها / باحمرارها), and the sentence is " +
         "about behaviour, not colour, so no reading is safely inferable." },
  { slug: "neon-tetra-color-care-guide", frag: "ط Ard",
    context: "استخدام ط Ard معقم المياه لمنع تلوث المياه",
    why: "Two fragments with a space. Could be a product type or a verb; the list item " +
         "gives no further signal." },
];
