/**
 * Corpus-wide claims ledger — batch 1.
 *
 * A different defect class from script contamination: the generator asserted
 * business facts it had no source for. Ground truth is the LIVE catalogue
 * (/api/products — 112 products across 11 categories), the governorate list in
 * client/src/components/cart/checkout/types.ts, client/src/lib/constants/shipping.ts,
 * and the published policy pages return-policy.tsx / terms.tsx / why-aquavo.tsx.
 *
 * Classification:
 *   REMOVE           — false or unsupported; the claim is deleted
 *   CORRECT          — repairable; restated truthfully
 *   VERIFIED         — checked and kept (recorded in audit.md, not here)
 *   RESEARCH BLOCKED — cannot be settled from an available source (audit.md)
 */
export const LEDGER = [
  // ---- AQUAVO sells live animals or plants: FALSE. The catalogue has neither. ----
  { slug: "saltwater-vs-freshwater-aquarium-beginners", cls: "REMOVE",
    old: "يجب دائمًا اختيار الأسماك المالحة من مورد موثوق به، مثل AQUAVO، الذي يوفر الأسماك المالحة عالية الجودة وضمانًا لمدة عام.",
    new: "يجب دائمًا اختيار الأسماك المالحة من مورد مختص، والتأكد من صحتها وحالتها قبل الشراء.",
    why: "AQUAVO sells no live fish at all, marine or freshwater, and no one-year fish guarantee exists. Two false claims in one sentence." },
  { slug: "saltwater-vs-freshwater-aquarium-beginners", cls: "REMOVE",
    old: "AQUAVO هي المورد الأول للمستلزمات Aquarium في العراق، وتوفر خدمات شاملة، بما في ذلك:",
    new: "AQUAVO متجر عراقي مختص بمستلزمات الأحواض، ويوفر:",
    why: "Unsupported 'first supplier in Iraq' claim; also drops a stray English word left mid-sentence." },
  { slug: "saltwater-vs-freshwater-aquarium-beginners", cls: "REMOVE",
    old: "  <li>ضمان لمدة عام على الأسماك المالحة.</li>\n",
    new: "",
    why: "A one-year warranty on live fish AQUAVO does not sell. return-policy.tsx limits any warranty to a product whose page names it explicitly." },

  { slug: "how-to-get-rid-of-green-algae", cls: "REMOVE",
    old: "مثل أسماك الكوريدوراس والأوتوسينكلس أسنينا المتوفرة في أكوافو، أو حلزونات النيريت (Nerite Snails)",
    new: "مثل أسماك الكوريدوراس والأوتوسينكلس، أو حلزونات النيريت (Nerite Snails)",
    why: "Claims live algae-eating fish and snails are stocked. They are not — the catalogue carries no live animals. The husbandry advice itself is sound and is kept." },

  { slug: "turtles-with-aquarium-fish", cls: "REMOVE",
    old: "حوض مائي للأسماك وحوض (تيراريوم/أكواتيراريوم) للسلاحف. كلاهما متوفر في AQUAVO مع كل المستلزمات.",
    new: "حوض مائي للأسماك وحوض (تيراريوم/أكواتيراريوم) للسلاحف.",
    why: "AQUAVO stocks two aquariums and no terrarium or turtle equipment. 'Both available with all supplies' is invented inventory." },

  { slug: "real-vs-fake-plants-iraq", cls: "REMOVE",
    old: " يمكنك إيجاد هذه الأنواع في متجرنا قسم \"النباتات المائية\".",
    new: "",
    why: "Invents both a product line and a store section. AQUAVO sells no live plants and has no النباتات المائية category; its 11 categories carry only substrate and anchoring accessories." },

  { slug: "saltwater-vs-freshwater-aquarium-beginners", cls: "REMOVE",
    old: "  <li>منتجات عالية الجودة مستوردة من الخارج.</li>",
    new: "  <li>مستلزمات فلترة وتهوية ومعالجة مياه.</li>",
    why: "Undocumented sourcing claim, replaced with categories that demonstrably exist." },

  { slug: "koi-fish-outdoor-pond-building-tips", cls: "REMOVE",
    old: "يمكنك العثور على أنظمة ترشيح عالية الجودة في متجر <strong>AQUAVO</strong>، الذي يُعتبر المورد الأول والرئيسي للمنتجات المائية في العراق. يُقدم <strong>AQUAVO</strong> ضمانات وخدمات توصيل إلى جميع أنحاء البلاد، ويركز على توفير أفضل المنتجات المستوردة لضمان صحة ورفاهية أسماك الكوي.",
    new: "يمكنك العثور على أنظمة ترشيح ومعالجات مياه في متجر <strong>AQUAVO</strong>، مع توصيل إلى 18 محافظة في العراق.",
    why: "'The first and principal supplier of aquatic products in Iraq' has no source, and the blanket warranty plus the import claim are unsupported. Filtration and water treatment are real categories, and the delivery claim is verified, so both are kept." },

  // ---- Invented physical branches: AQUAVO is online-only. ----
  { slug: "calculate-aquarium-capacity-liters", cls: "REMOVE",
    old: "يمكنك زيارة موقع شركة AQUAVO على الإنترنت، أو زيارة أحد فروعها في العراق، لاستشارة خبراء الشركة وشراء كل ما يحتاجه مربي الأسماك.",
    new: "يمكنك زيارة موقع AQUAVO على الإنترنت لشراء ما يحتاجه مربي الأسماك.",
    why: "Invents physical branches. Nothing in the codebase or the policy pages describes a physical location; checkout is delivery-only to 18 governorates." },
  { slug: "calculate-aquarium-capacity-liters", cls: "REMOVE",
    old: "تقدم شركة AQUAVO منتجات مستوردة ذات جودة عالية، مما يضمن لك تجربة مرضية وسهلة في تربية الأسماك.",
    new: "تقدم AQUAVO مستلزمات أحواض متنوعة تغطي الفلترة والتهوية ومعالجة المياه.",
    why: "The sourcing claim is undocumented anywhere; replaced with categories that demonstrably exist (18, 13 and 13 SKUs)." },

  // ---- Invented products. ----
  { slug: "aquarium-planted-led-lighting-guide", cls: "REMOVE",
    old: "لتفادي نمو الطحالب، اضبط مصباح حوضك عن طريق شاشة التحكم الذكية من متجرنا لمدة 7 ساعات باليوم فقط.",
    new: "لتفادي نمو الطحالب، اضبط إضاءة حوضك على 7 ساعات في اليوم فقط.",
    why: "No smart controller exists; the الإضاءة category holds exactly one product, a 3.5 W LED bar. The 7-hour advice stands on its own and is kept." },
  { slug: "driftwood-preparation-yellow-water-fix", cls: "REMOVE",
    old: " يمكنك أيضاً استخدام منتجات AQUAVO لتعقيم الأخشاب المتحجرة، مثل محلول التعقيم الذي نقدمه في متجرنا.",
    new: "",
    why: "No sterilising solution in the catalogue. The boiling method the same paragraph gives is the real procedure and is kept." },
  { slug: "amazon-biotope-aquarium-setup", cls: "REMOVE",
    old: "يمكن التغلب على هذه التحديات باستخدام <strong>مضخات احتياطية</strong> و<strong>أنظمة التبريد</strong> التي يمكن الحصول عليها من متجر AQUAVO.",
    new: "يمكن التغلب على هذه التحديات بمصدر طاقة احتياطي ومراقبة حرارة الحوض عن قرب في الصيف.",
    why: "Neither backup pumps nor cooling systems exist in the catalogue — zero matches across all 11 categories." },
  { slug: "co2-system-planted-aquarium-guide", cls: "REMOVE",
    old: "   <li>نظام ثاني أكسيد الكربون عالي الجودة.</li>\n   <li>ضمان على جميع المنتجات.</li>\n",
    new: "   <li>مستلزمات الإضاءة والفلترة والتسميد للأحواض المزروعة.</li>\n",
    why: "AQUAVO sells no CO2 system — zero matches. The blanket product warranty is separately contradicted by return-policy.tsx." },

  // ---- Warranty claims contradicted by AQUAVO's own published policy. ----
  { slug: "hardscape-rock-arrangement-visual-depth", cls: "REMOVE",
    old: " مع وجود warranties وضمانات لمدة تصل إلى 5 سنوات على منتجاتنا، يمكن لزباين AQUAVO التأكد من حصولهم على أفضل المنتجات والخدمات.",
    new: "",
    why: "A five-year warranty. return-policy.tsx caps it at a six-month limited warranty, only where a product page names it, and why-aquavo.tsx says explicitly that no document or warranty is generalised across the store. Also carries a stray English word." },
  { slug: "freshwater-pufferfish-care-guide", cls: "REMOVE",
    old: "في AQUAVO، نقدم لك \"<strong>ضمان صحي</strong>\" و \"<strong>دعم فني</strong>\" لجميع منتجاتنا، بالإضافة إلى \"<strong>توصيل سريع</strong>\" إلى جميع \"<strong>المحافظات</strong>\" في العراق.",
    new: "في AQUAVO، نوفر <strong>دعم فني</strong> و<strong>توصيل سريع</strong> إلى <strong>18 محافظة</strong> في العراق.",
    why: "A 'health guarantee' on all products is invented, and doubly wrong on a page about buying live pufferfish. Support and delivery are real and are kept." },
  { slug: "tetra-food-vs-budget-brands-comparison", cls: "REMOVE",
    old: "\n<p>بالإضافة إلى ذلك، يضمن AQUAVO جودة مياه الصنبور المستخدمة في حاوية الأسماك، حيث يتم تقليل نسبة الكلور إلى أدنى حد، مما يضمن صحة الأسماك ورفاهيتها.</p>",
    new: "",
    why: "Claims AQUAVO guarantees the quality of the reader's municipal tap water. A store cannot do this, and nothing in the corpus or the code suggests it tries to." },
  { slug: "tetra-food-vs-budget-brands-comparison", cls: "CORRECT",
    old: "مع ضمانات وضمان جودة المنتجات، وتوصيل المنتجات إلى 18 محافظة، يصبح اختيار العلف الصحيح أمراً سهلاً وآمناً.",
    new: "مع التوصيل إلى 18 محافظة، يصبح الحصول على العلف المناسب أسهل.",
    why: "Blanket product-quality guarantee removed; the delivery claim is verified and kept." },

  // ---- Unsupported 'first in Iraq'. ----
  { slug: "ammonia-spike-emergency-treatment", cls: "REMOVE",
    old: "AQUAVO هي أول متجر احترافي لأحواض السمك في العراق، وتقدم مجموعة واسعة من المنتجات عالية الجودة المستوردة من جميع أنحاء العالم. تقدم AQUAVO ضمانات على منتجاتها، وتقدم خدمة التوصيل إلى 18 محافظة في العراق.",
    new: "AQUAVO متجر عراقي مختص بمستلزمات الأحواض، ويوفر التوصيل إلى 18 محافظة في العراق.",
    why: "'First professional aquarium store in Iraq' has no source; nor does the worldwide-import claim; nor the blanket warranty. The delivery claim is verified and kept." },
  { slug: "flowerhorn-breeding-nuchal-hump-secrets", cls: "REMOVE",
    old: "AQUAVO، كأول متجر محترف لأسماك الزينة في العراق، يلعب دورًا هامًا في توفير كل ما يحتاجه هواة تربية الأسماك، بما في ذلك أسماك الفلورهورن.",
    new: "AQUAVO متجر عراقي مختص يوفر مستلزمات تربية أسماك الزينة.",
    why: "Same unsupported 'first' claim, and 'everything a keeper needs, including flowerhorn fish' implies AQUAVO sells the fish." },
  { slug: "flowerhorn-breeding-nuchal-hump-secrets", cls: "CORRECT",
    old: "مع ضمانات على المنتجات وتوصيل المنتجات إلى جميع أنحاء العراق، بما في ذلك 18 محافظة، يعتبر AQUAVO شريكًا موثوقًا لجميع هواة الأسماك.",
    new: "مع التوصيل إلى 18 محافظة في العراق.",
    why: "Blanket warranty removed; verified delivery kept." },
  { slug: "flowerhorn-breeding-nuchal-hump-secrets", cls: "CORRECT",
    old: "التي توفر أنظمة ترشيح عالية الجودة وضمانات على المنتجات.",
    new: "التي توفر أنظمة ترشيح ومعالجات مياه.",
    why: "Blanket warranty removed; filtration and water treatment are real categories (18 and 13 SKUs)." },

  // ---- Availability claim for a product line that is not stocked. ----
  { slug: "guppy-fish-care-breeding-guide", cls: "REMOVE",
    old: "الرقائق (Flakes) عالية الجودة من ماركات موثوقة (تباع في منيو أكوافو)",
    new: "الرقائق (Flakes) عالية الجودة من ماركات موثوقة",
    why: "AQUAVO stocks 13 fish foods but no flake product. The feeding advice is correct and is kept without the availability claim." },

  // ---- Dangerous care advice. ----
  { slug: "driftwood-preparation-yellow-water-fix", cls: "REMOVE",
    old: "يمكن معالجة إصفرار الماء باستخدام مواد كيميائية مثل الكلور أو الزيوليت.",
    new: "يمكن معالجة إصفرار الماء بالكربون النشط مع تغييرات ماء دورية.",
    why: "Telling a reader to put chlorine in an aquarium is a fish-health hazard and contradicts every other article in the corpus, which treats chlorine as the thing to remove. Activated carbon is the real remedy for tannin staining, and is stocked." },

  // ---- Foreign-language fragments the script guard cannot see. ----
  // Standalone Latin words carrying only Latin-1 diacritics, or bare English, are
  // neither welded to an Arabic letter nor inside Latin Extended, so all three
  // rules in shared/script-purity.ts miss them. See audit.md.
  { slug: "hardscape-rock-arrangement-visual-depth", cls: "CORRECT",
    old: "في دائرة حول نقطة trung tâm.",
    new: "في دائرة حول نقطة مركزية.",
    why: "Vietnamese 'trung tâm' = centre. Both occurrences; the surrounding text is about arranging rocks around and out from a central point, so the meaning is attested." },
  { slug: "hardscape-rock-arrangement-visual-depth", cls: "CORRECT",
    old: "شكل تفرع يمتد من نقطة trung tâm.",
    new: "شكل تفرع يمتد من نقطة مركزية.",
    why: "Second occurrence of the same Vietnamese fragment, in the adjacent list item." },
  { slug: "hardscape-rock-arrangement-visual-depth", cls: "CORRECT",
    old: "هواة صيدلة الأسماك",
    new: "هواة تربية الأسماك", n: 6,
    why: "صيدلة is pharmacy. The corpus writes هواة تربية الأسماك throughout." },
  { slug: "flowerhorn-breeding-nuchal-hump-secrets", cls: "CORRECT",
    old: "بسبب yüksek نسبة الكلور",
    new: "بسبب ارتفاع نسبة الكلور",
    why: "Turkish 'yüksek' = high. The sentence is about high chlorine in drinking water." },
  { slug: "ornamental-fish-import-middle-east-origins", cls: "CORRECT",
    old: "ولكن يمكن phânها إلى ثلاث فئات رئيسية:",
    new: "ولكن يمكن تقسيمها إلى ثلاث فئات رئيسية:",
    why: "Vietnamese 'phân' = divide. Followed immediately by a three-item list, so the meaning is fixed by the structure." },
  { slug: "driftwood-preparation-yellow-water-fix", cls: "CORRECT",
    old: "لتجف hoànًا",
    new: "لتجف تماماً",
    why: "Vietnamese 'hoàn', from 'hoàn toàn' = completely. The Arabic accusative ending ًا survived, which is exactly how تماماً is written." },
  { slug: "diy-3d-aquarium-background", cls: "CORRECT",
    old: "يجب também مراعاة",
    new: "يجب أيضاً مراعاة",
    why: "Portuguese 'também' = also." },
  { slug: "amazon-sword-plant-care-propagation", cls: "CORRECT",
    old: "التي تتناسب مع ظروف votre Aquarium.",
    new: "التي تتناسب مع ظروف حوضك.",
    why: "French 'votre' = your, welded to an English noun." },
  { slug: "corydoras-types-best-cleaner-fish", cls: "CORRECT",
    old: "دورًا هامًا في guarantein salud الحوض",
    new: "دورًا هامًا في الحفاظ على صحة الحوض",
    why: "Spanish 'salud' = health, preceded by a malformed pseudo-word for 'guarantee'." },
  { slug: "why-fish-die-suddenly-rescue-guide", cls: "CORRECT",
    old: "جودة الماء هو faktor آخر مهم",
    new: "جودة الماء عامل آخر مهم",
    why: "'faktor' = factor. The Arabic copula is adjusted so the sentence stays grammatical." },
  { slug: "black-beard-algae-removal-steps", cls: "CORRECT",
    old: "لا ت	require إلىخبرة كبيرة، بل يتطلب",
    new: "لا تتطلب خبرة كبيرة، بل تتطلب",
    why: "English 'require' spliced onto an Arabic prefix, plus a welded إلىخبرة and a gender disagreement in the following verb." },
];
