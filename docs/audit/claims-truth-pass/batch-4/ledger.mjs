/**
 * Claims batch 4 — the residue the *guard* found and the hand-written sweep did not.
 *
 * Batches 1-3 were driven by a list of banned phrases I wrote by hand. Once
 * `shared/business-truth.ts` existed and was pointed at production, it found 21
 * more false claims across 15 articles that the phrase list had never asked
 * about. That is the same failure mode as pass 1 of the language cleanup: a
 * bespoke check certifies only what it thought to look for.
 *
 * Every entry here is a claim the guard rejects, corrected so that the guard
 * accepts the result. Verified terms — the 18 governorates, delivery, real
 * stocked products, technical support — are kept.
 */
export const LEDGER = [
  // ---- Blanket warranties. return-policy.tsx: limited, per-product, opt-in. ----
  { slug: "aquarium-bedroom-feng-shui-sound-effect", cls: "REMOVE",
    old: "لدينا ضمانات طويلة الأجل وخدمة توصيل سريعة إلى جميع أنحاء البلاد.",
    new: "ولدينا خدمة توصيل إلى 18 محافظة في العراق.",
    why: "Long-term warranties across the store. The return policy grants none." },

  { slug: "human-medicine-dangers-for-fish", cls: "REMOVE",
    old: "حيث نقدم مجموعة واسعة من الأدوية السمكية و منتجات الرعاية الصحية للأسماك، مع ضمانات و توصيل إلى 18 محافظة في العراق.",
    new: "حيث نقدم أدوية ومعالجات مياه للأحواض، مع توصيل إلى 18 محافظة في العراق.",
    why: "Blanket warranty removed; the medicines are genuinely stocked and the delivery term is verified, so both stay." },

  { slug: "amazon-sword-plant-care-propagation", cls: "REMOVE",
    old: "ضمان جودة: متجر AQUAVO يوفر ضمان جودة على جميع المنتجات.",
    new: "دعم فني: متجر AQUAVO يوفر دعماً فنياً لهواة تربية الأسماك.",
    why: "A quality warranty on every product. Replaced with support, which is real." },

  { slug: "black-beard-algae-removal-steps", cls: "REMOVE",
    old: "يمكن أن توفر AQUAVO منتجات عالية الجودة وموثوقة، مع ضمانات وخدمة عملاء ممتازة.",
    new: "يمكن أن توفر AQUAVO منتجات معالجة المياه ومزيلات الطحالب، مع خدمة عملاء.",
    why: "Blanket warranty removed; the named categories exist (13 SKUs in معالجة المياه, including two algae removers)." },

  { slug: "iwagumi-aquascape-step-by-step", cls: "REMOVE",
    old: "ويمكن استخدام خدمات شركة AQUAVO التي توفر أفضل أنواع المكونات وضمانات لجميع المنتجات، بالإضافة إلى خدمات التوصيل إلى جميع محافظات العراق.", n: 2,
    new: "ويمكن استخدام خدمات AQUAVO التي توفر مواد الأكواسكيب والتربة والصخور، بالإضافة إلى التوصيل إلى 18 محافظة في العراق.",
    why: "Warranty for all products, plus an unsupported 'best'. The aquascaping materials are real (27 SKUs in تربة وديكور) and the governorate count is now the verified one." },

  { slug: "air-pumps-decoration-or-necessity", cls: "REMOVE",
    old: "جميع منتجاتنا مدعومة بضمانات مطولة، وتتوفر للاستلام في جميع أنحاء العراق عبر 18 محافظة.",
    new: "وتتوفر منتجاتنا للتوصيل عبر 18 محافظة في العراق.",
    why: "Extended warranties on everything. The delivery half is verified and is kept." },

  { slug: "cloudy-aquarium-water-causes-fix", cls: "REMOVE",
    old: "متجر AQUAVO يعتبر الوجهة الأولى للمهتمين بتربية الأسماك في العراق، حيث يوفر مواد مرشحة عالية الجودة وضمانات طويلة الأمد، وتوصيل المنتجات إلى جميع محافظات العراق البالغ عددها 18 محافظة.",
    new: "يوفر متجر AQUAVO ميديا فلترة للأحواض، مع توصيل إلى 18 محافظة في العراق.",
    why: "Two claims in one sentence: 'the first destination' and long-term warranties. Filtration media is real (18 SKUs) and the delivery term is verified." },

  { slug: "activated-carbon-aquarium-when-to-use", cls: "REMOVE",
    old: "نوصي باستخدام الفحم النشط من ماركات موثوقة، مثل تلك التي تقدمها AQUAVO، التي توفر منتجات عالية الجودة وضمانات طويلة الأمد.",
    new: "نوصي باستخدام الفحم النشط من ماركات موثوقة، مثل الكربون النشط المتوفر في AQUAVO.",
    why: "Long-term warranties removed. Activated carbon is genuinely stocked, so the availability claim stays." },

  { slug: "activated-carbon-aquarium-when-to-use", cls: "REMOVE",
    old: "نحن في AQUAVO، نسعد بتقديم منتجات عالية الجودة وضمانات طويلة الأمد، بما في ذلك الفحم النشط، لجميع عملائنا في العراق.",
    new: "نحن في AQUAVO، نوفر الكربون النشط ضمن مستلزمات الفلترة لعملائنا في العراق.",
    why: "Same blanket warranty; the product itself is real and is kept." },

  { slug: "african-cichlids-best-types-colors", cls: "REMOVE",
    old: "يمكنك الاستفادة من خدمات وضمانات AQUAVO، التي تضم مجموعة واسعة من المنتجات عالية الجودة والمستوردة، والذي يغطي 18 محافظة في العراق.", n: 2,
    new: "يمكنك الاستفادة من خدمات AQUAVO، التي تضم مجموعة واسعة من مستلزمات الأحواض، مع توصيل يغطي 18 محافظة في العراق.",
    why: "Warranty and import claims removed; range and the verified delivery term kept." },

  { slug: "molly-platy-breeding-save-fry", cls: "REMOVE",
    old: "بالإضافة إلى ذلك، فإن AQUAVO توفر ضمانات لجميع منتجاتها، وتقدم خدمة توصيل إلى جميع أنحاء العراق، بما في ذلك 18 محافظة.",
    new: "بالإضافة إلى ذلك، توفر AQUAVO مستلزمات العزل والتفريخ، مع خدمة توصيل إلى 18 محافظة في العراق.",
    why: "Warranties for all products removed. العزل والتفريخ is a real category (7 SKUs) and is the one this article needs." },

  { slug: "fin-rot-treatment-guide", cls: "REMOVE",
    old: "كما يوفر متجر AQUAVO خدمات التوصيل إلى جميع محافظات العراق البالغ عددها 18 محافظة، ويوفر ضمانات على جميع المنتجات.",
    new: "كما يوفر متجر AQUAVO التوصيل إلى 18 محافظة في العراق.",
    why: "Warranties on all products removed; delivery is verified and kept." },

  // ---- Sourcing claims with no documentation anywhere. ----
  { slug: "fish-keeping-stress-relief-mental-health", cls: "REMOVE",
    old: "ويقدم ضمانات وخدمات توصيل إلى 18 محافظة في العراق. بالإضافة إلى ذلك، يقدم <strong>AQUAVO</strong> منتجات عالية الجودة ومستوردة من أفضل الشركات في العالم.",
    new: "ويقدم خدمات توصيل إلى 18 محافظة في العراق. بالإضافة إلى ذلك، يقدم <strong>AQUAVO</strong> مستلزمات الأحواض من الفلترة والتهوية ومعالجة المياه.",
    why: "'Imported from the best companies in the world' has no source. Replaced with categories that exist." },

  { slug: "aquarium-soil-volcanic-substrate-secrets", cls: "REMOVE",
    old: "وتعد منتجات AQUAVO المصرح بها ومستوردة من أفضل المصانع العالمية خياراً مثاليًا لمحبي الأسماك في العراق، مع ضمانات وخدمة توصيل إلى جميع المحافظات الـ 18.",
    new: "وتتوفر التربة والصخور البركانية في AQUAVO، مع خدمة توصيل إلى 18 محافظة في العراق.",
    why: "Authorised-and-imported-from-the-best-factories plus a blanket warranty. Volcanic rock and aquascaping soil are both genuinely stocked." },

  { slug: "aquarium-soil-volcanic-substrate-secrets", cls: "REMOVE",
    old: "يمكنهم الحصول على التربة البركانية وجميع المنتجات اللازمة لإنشاء حوض سمك مثالي من متجر AQUAVO، مع ضمان جودة وخدمة توصيل سريعة إلى جميع المناطق.",
    new: "يمكنهم الحصول على التربة والصخور البركانية من متجر AQUAVO، مع توصيل إلى 18 محافظة في العراق.",
    why: "Quality guarantee and 'all regions' removed; the verified delivery term replaces the vague one." },

  { slug: "filter-media-ceramic-rings-bioballs", cls: "REMOVE",
    old: "بالإضافة إلى ذلك، نقدم لك مجموعة واسعة من المنتجات المستوردة من أفضل الشركات العالمية، والتي تُعتبر من أفضل الخيارات لآحواض المائية في العراق.",
    new: "بالإضافة إلى ذلك، نقدم مجموعة واسعة من ميديا الفلترة وحلقات السيراميك للأحواض.",
    why: "Import claim and a superlative. Ceramic rings and filter media are real products, and naming them is both truthful and more useful." },

  { slug: "fin-rot-treatment-guide", cls: "REMOVE",
    old: "حيث يُقدم مجموعة واسعة من المنتجات عالية الجودة والمستوردة من أفضل الشركات العالمية.",
    new: "حيث يوفر معالجات المياه وأدوية الأحواض.",
    why: "Same undocumented sourcing claim; replaced with the real category, which is what a fin-rot article should point at." },

  // ---- Unsupported ranking. ----
  { slug: "best-aquarium-store-iraq-2026", cls: "REMOVE", field: "excerpt",
    old: "تعرف على أول وأكبر متجر إلكتروني متخصص في أسماك الزينة ومستلزمات الأحواض في العراق (AQUAVO) ولماذا يتفوق على الأسواق التقليدية.",
    new: "تعرف على متجر AQUAVO الإلكتروني المتخصص بمستلزمات أحواض الأسماك في العراق، ولماذا يختلف عن الأسواق التقليدية.",
    why: "'First and biggest' has no source, and 'متخصص في أسماك الزينة' reads as selling the fish. The page's comparison purpose is untouched — only the two unsupported claims go. Flagged to the owner twice as a positioning decision; corrected here because an unsupported superlative is exactly what this pass exists to remove." },
];
