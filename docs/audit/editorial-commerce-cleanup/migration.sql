-- Migration ID: blog-editorial-commerce-20260901
-- Target:       Neon project shiny-tree-43710630 (fishweb), production default branch
-- Rollback:     rollback.sql in this directory (restores from the backup table)
--
-- Removes every external commercial referral, invented-availability claim,
-- false physical-shop claim and unsupported Iraqi-water generalisation the
-- corpus audit found. 75 edits across 27 articles, plus one article withdrawn.
--
-- Each edit is a replace() of an exact substring read out of the live row, so a
-- statement that no longer matches changes nothing rather than corrupting text.
-- A post-flight check re-counts the marketplace names and fails the whole
-- transaction if any survive.
--
-- Verified before writing: the corrected corpus was rebuilt in memory and
-- re-scanned with shared/editorial-guard.ts — the same guard the generator
-- enforces — and returned 0 violations across all 80 remaining articles.
-- See scripts/verify-corrected-corpus.ts.

BEGIN;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts;
  IF n < 81 THEN RAISE EXCEPTION 'expected at least 81 posts, found %', n; END IF;
END $$;

-- Snapshot inside the same transaction as the edits, so the backup is provably
-- of the state being modified.
CREATE TABLE blog_posts_content_backup_20260901 AS
SELECT id, slug, title, excerpt, content, is_published, now() AS backed_up_at
  FROM blog_posts;


-- activated-carbon-aquarium-when-to-use (1 edit)
UPDATE blog_posts SET content = replace(content, 'كما يمكن أن يكون الفحم النشط مفيدًا في ظل ظروف المياه العراقية، والتي يمكن أن تكون معرضة للاستخدام المفرط للكлор.', 'والفحم النشط يزيل الكلور وبقايا الأدوية والروائح، لكنه لا يعالج الأمونيا ويفقد فعاليته خلال أسابيع فيحتاج استبدالاً دورياً.')
 WHERE id = 'e08f8e86-bf1d-43b0-a17b-ad976d86d720';

-- african-cichlids-best-types-colors (3 edits)
UPDATE blog_posts SET content = replace(replace(replace(content, '<h2>استخدام أسماك السيكلد الأفريقي في سوق الغزل</h2>', ''), 'في سوق الغزل الشهير في بغداد، يمكنك العثور على العديد من الأسماك الزينة، بما في ذلك أسماك السيكلد الأفريقي.', 'سيكلد البحيرات الأفريقية يحتاج ماءً عسراً وقلوياً نسبياً، وهذا يجعله غير متوافق مع أسماك الماء الطري في الحوض نفسه.'), ' بدلاً من ذلك، يمكنك التوجه إلى متجر AQUAVO الموثوق به، الذي يضمن جودة الأسماك ويوفر ضمانات وخدمة عملاء ممتازة.', '')
 WHERE id = '2edd1325-1ee7-41d9-a185-3ba2855766d3';

-- amazon-biotope-aquarium-setup (1 edit)
UPDATE blog_posts SET content = replace(content, '، ويمكنك الحصول على أدوات المعالجة من متجر AQUAVO', '')
 WHERE id = 'c48b143f-21e2-4689-bf2d-edbcce99998b';

-- amazon-sword-plant-care-propagation (4 edits)
UPDATE blog_posts SET content = replace(replace(replace(replace(content, '، ويمكنك الحصول على أنواع不同的 النباتات من متجر AQUAVO', ''), '<h3>استفادة من متجر AQUAVO</h3>
<p>متجر AQUAVO يوفر جميع ما تحتاجه لزراعة نبات الأمازون سورد، مثل:</p>', ''), '<li>أنواع نباتات مختلفة: متجر AQUAVO يوفر أنواع نباتات مختلفة، بما في ذلك نبات الأمازون سورد.</li>', ''), '<li>معدات ومستلزمات: متجر AQUAVO يوفر جميع المعدات والمستلزمات اللازمة لزراعة النباتات المائية.</li>', '')
 WHERE id = '37be7189-a819-4cc8-9877-b329a1312fd0';

-- aquarium-bedroom-feng-shui-sound-effect (1 edit)
UPDATE blog_posts SET content = replace(content, '<p>في AQUAVO، نسعى دائماً لتقديم أفضل الحلول لجميع محبي الأسماك في العراق. يمكنك زيارة موقعنا الإلكتروني للاطلاع على مجموعة واسعة من أحواض السمك ومرشحات الماء عالية الجودة.</p>', '')
 WHERE id = '6e123eae-313d-4904-9f4a-0b1bb68a01a1';

-- aquarium-fish-prices-iraq-2026 (1 edit)
UPDATE blog_posts SET content = replace(content, 'في <strong>AQUAVO</strong>، نحن نحجز الأسماك المستوردة (Quarantine) لعدة أيام قبل عرضها للعملاء في بغداد لضمان صحتها وتمتعها بالحيوية التامة.', 'أياً كان مصدر السمكة، اسأل عن مدة بقائها لدى البائع بعد الاستيراد: السمكة التي عُرضت للبيع فور وصولها تكون تحت ضغط شديد ومعدل نفوقها أعلى.')
 WHERE id = '9e169966-022a-4d22-85a5-a4bab0daf7e2';

-- aquarium-heater-winter-iraq (3 edits)
UPDATE blog_posts SET content = replace(replace(replace(content, '<h2>خدمات AQUAVO لأسماك الزينة في العراق</h2>', ''), '<p>AQUAVO هو المورد الرئيسي لأسماك الزينة في العراق، ويوفر مجموعة واسعة من المنتجات عالية الجودة، بما في ذلك السخانات والمرشحات والمغذيات. كما يوفر AQUAVO خدمة التوصيل إلى جميع أنحاء العراق، ويلتزم بتقديم ضمانات طويلة الأمد على جميع المنتجات.</p>', ''), '<p>يمكن لمالكي أسماك الزينة في العراق أن يثقوا في AQUAVO لتقديم جميع احتياجاتهم لأسماك الزينة، بما في ذلك السخانات والمنتجات الأخرى. كما يمكنهم زيارة موقع AQUAVO الإلكتروني أو زيارة متجرهم في سوق الغزل للاطلاع على المزيد من المعلومات حول المنتجات والخدمات التي يقدمونها.</p>', '<p>القاعدة العملية لاختيار قدرة السخان هي نحو 1 واط لكل لتر في غرفة معتدلة، مع زيادة القدرة إذا كانت الغرفة باردة أو الحوض قرب نافذة.</p>')
 WHERE id = 'c35b13e4-86d2-4ebc-abe5-e4d4e7fdf93e';

-- aquarium-photography-mobile-tips (2 edits)
UPDATE blog_posts SET content = replace(replace(content, 'استخدم حوض أسماك زينة عالي الجودة من AQUAVO، الذي يوفر لك ضمانًا لمدة عامين وخدمة توصيل إلى 18 محافظة في العراق.', 'صوّر من زاوية عمودية على زجاج الحوض لا مائلة، وأطفئ فلاش الهاتف واعتمد على إضاءة الحوض نفسها: الفلاش ينعكس على الزجاج ويُفزع الأسماك.'), ' إذا كنت تبحث عن حوض أسماك زينة عالي الجودة، فلا تتردد في زيارة متجر AQUAVO عبر الإنترنت.', '')
 WHERE id = 'e70b03aa-edc3-4940-8a56-4f7b28f5f5ec';

-- aquarium-planted-led-lighting-guide (1 edit)
UPDATE blog_posts SET content = replace(content, ' وتوفر متجر AQUAVO أحدث موديلاتها (مثل Twinstar أو Hygger و غيرها)، والتي تعطيك', ' والتي تعطيك')
 WHERE id = 'fd7d56fc-a535-4ca8-b8d4-02775bd437d6';

-- aquarium-soil-volcanic-substrate-secrets (2 edits)
UPDATE blog_posts SET content = replace(replace(content, '<h2>التغلب على مشاكل المياه في العراق</h2>', '<h2>معالجة الماء قبل الاستخدام</h2>'), 'في العراق، حيث تتميز المياه بالكلور العالي، يمكن أن تسبب مشاكل خطيرة للنباتات والأسماك.', 'ماء الصنبور المعالَج بالكلور أو الكلورامين يضر النبات والبكتيريا النافعة، ولهذا يُعالج قبل إضافته للحوض.')
 WHERE id = 'cf464423-36d0-4187-938a-c328cb5e5d41';

-- aquatic-plant-root-rot-treatment (2 edits)
UPDATE blog_posts SET content = replace(replace(content, '<p>AQUAVO توفر مجموعة واسعة من المنتجات عالية الجودة لمزارعي النباتات المائية في العراق. يمكن استخدام منتجاتنا لتنقية المياه وتهوية الحوض وتقديم الرعاية اللازمة للنباتات. نحن نقدم ضمانات على منتجاتنا وخدمات التوصيل إلى 18 محافظة في العراق.</p>', ''), ' يمكن استخدام منتجات وخدمات AQUAVO لضمان صحة النباتات وتقديم الرعاية اللازمة لها.', '')
 WHERE id = '96dd3fa9-274b-48c2-9aa4-273698076748';

-- arowana-fish-care-guide-prices (3 edits)
UPDATE blog_posts SET content = replace(replace(replace(content, 'يمكن شراء سمكة الأروانا من سوق الغزل أو من متجر AQUAVO، الذي يعتبر واحد من أفضل المتاجر لبيع الأسماك في العراق، مع ضمان جودة عالية وخدمة توصيل إلى جميع محافظات العراق.', 'الأروانا سمكة تصل إلى أطوال كبيرة وتحتاج حوضاً طويلاً وغطاءً محكماً لأنها قافزة قوية، وهذان العاملان أهم بكثير من سعر السمكة نفسها.'), 'يمكن شراء حوض السمك وجميع مستلزماته من متجر AQUAVO، الذي يعتبر واحد من أفضل المتاجر لبيع الأسماك ومستلزماتها في العراق، مع ضمان جودة عالية وخدمة توصيل إلى جميع محافظات العراق.', 'احسب حجم الحوض ومتطلبات الفلترة قبل أي شيء آخر: الأروانا تنتج كمية فضلات كبيرة وتحتاج فلترة وتغييرات ماء منتظمة.'), 'يمكن شراء سمكة الأروانا وجميع مستلزماتها من متجر AQUAVO، الذي يعتبر واحد من أفضل المتاجر لبيع الأسماك ومستلزماتها في العراق.', '')
 WHERE id = '2e1c0680-c0bd-4ff5-a1cd-19b32e3407f6';

-- avoid-fake-fish-stores-instagram-scams (2 edits)
UPDATE blog_posts SET content = replace(replace(content, '<p>في العراق، حيث يواجه هواة أسماك الزينة تحديات كبيرة، يعتبر <strong>AQUAVO</strong> خيارًا موثوقًا لشراء أسماك الزينة ومعداتها. يتميز AQUAVO بضمانات المنتجات، وخدمة التوصيل السريعة في جميع أنحاء البلاد، وفرع متوفر في 18 محافظة، مما يجعله خيارًا首选ًا للمستهلكين.</p>', ''), '<h2>استمتع بتجربة شراء آمنة وموثوقة مع AQUAVO</h2>
<p>بفضل خبراتنا العريضة في مجال أسماك الزينة، ونظامنا المطور لضمان جودة المنتجات، نقدم لك في AQUAVO تجربة شراء فريدة من نوعها. لا تتردد في التواصل معنا للاستفادة من خدماتنا وضماناتنا، واكتشف الفرق الذي يمكن أن يحدثه متجر متخصص وموثوق في عالم أسماك الزينة.</p>', '')
 WHERE id = 'aa078ac4-bd2f-422e-bf63-ff9b3efd2005';

-- best-aquarium-store-iraq-2026 (1 edit)
UPDATE blog_posts SET content = replace(content, 'في الماضي، كان الهواة يعانون من محدودية الخيارات في الأسواق المحلية أو سوق الغزل في بغداد، حيث كانت الأسعار متفاوتة والجودة غير مضمونة.', 'التسوق المتخصص يختلف عن الشراء العابر في أن المنتج يأتي بمواصفات مكتوبة وضمان يمكن الرجوع إليه.')
 WHERE id = '07c25472-20f8-4166-81a5-f51d98398488';

-- best-low-tech-aquarium-plants-beginners (4 edits)
UPDATE blog_posts SET content = replace(replace(replace(replace(content, ' لهذا السبب، نقترح في <strong>AQUAVO</strong> مجموعة من النباتات التي لا تحتاج إلى ثاني أكسيد الكربون، مما يجعلها مثالية للمبتدئين.', ' ولهذا فإن النباتات منخفضة الاحتياج — مثل الأنوبياس والميكروسوريم والفاليسنيريا — هي الخيار الأنسب للمبتدئ: تنمو بإضاءة متوسطة وبدون حقن ثاني أكسيد الكربون.'), ' بالإضافة إلى ذلك، تكون المياه التي تستخدم في تربية الأسماك غالبًا ماءً محلىً يتميز بالكثير من الكلور، مما يمكن أن يكون ضارًا بالنباتات المائية.', ' كما أن ماء الصنبور يحتاج معالجة من الكلور قبل استخدامه، لأن الكلور يضر النبات والبكتيريا النافعة.'), '<p>في <strong>AQUAVO</strong>، نقدم لك مجموعة واسعة من النباتات المائية التي تتناسب مع احتياجاتك، مع ضمان جودة عالية وخدمة توصيل إلى جميع أنحاء العراق، في 18 محافظة.</p>', ''), '<p>كما أننا في <strong>AQUAVO</strong> نقدم لك دائمًا نصائح وخدمات احترافية لضمان نجاح مشروعك المائي. سواء كنت تبحث عن نباتات مائية جميلة أو أجهزة مائية متقدمة، نحن هنا لنساعدك. زوروا موقعنا على الإنترنت أو زورونا في سوق الغزل لاستكشاف عالم النباتات المائية الرائع.</p>', '')
 WHERE id = '888fbc8b-96a9-4afd-ad61-524a15abb8b8';

-- betta-compatible-tank-mates (2 edits)
UPDATE blog_posts SET content = replace(replace(content, ' في AQUAVO، نوفر لك مجموعة واسعة من الأسماك الزينة، مع ضمان جودة عالية وخدمة توصيل سريعة إلى جميع المحافظات العراقية.', ''), 'في سوق الغزل، يمكنك أن تجد مجموعة واسعة من الأسماك الزينة، ولكن يجب أن تختار بعناية الأسماك التي تتناسب مع ظروفك البيئية.', 'اختر رفقاء الحوض بحسب حجم الحوض ودرجة الحرارة وطباع السمكة، لا بحسب ما هو متاح أمامك وقت الشراء.')
 WHERE id = '767cb67d-030b-47eb-b279-404cf2b32147';

-- blackwater-extract-filter-bacteria-guide (1 edit)
UPDATE blog_posts SET content = replace(content, '<p>في سوق الغزل و الأسواق الأخرى في بغداد والمدن العراقية، يجد هواة تربية الأسماك صعوبة في الحصول على مواد عالية الجودة تعزز بيئة حوض السمك. ولكن مع وجود <strong>AQUAVO</strong>، أصبحت هذه المواد متاحة بسهولة، حيث توفر متجرنا عبر الإنترنت ضمانات عالية الجودة وخدمة توصيل سريعة إلى 18 محافظة في العراق.</p>', '<p>مستخلص الماء الأسود ومنتجات البكتيريا النافعة تتفاوت كثيراً في التركيز وطريقة الحفظ، ولهذا يهم أن تقرأ الملصق: تاريخ الصلاحية، وطريقة التخزين، والجرعة المذكورة لحجم حوضك.</p>')
 WHERE id = '5ac0d33a-f44f-480a-b950-2fa921af6ad9';

-- can-fish-see-recognize-owners-science (2 edits)
UPDATE blog_posts SET content = replace(replace(content, ' يمكنك الحصول على أفضل أنواع الطعام والمنتجات لأسماكك من متجر AQUAVO، الذي يضمن لك جودة عالية وضمانًا لجميع المنتجات.', ''), ' في AQUAVO، نضمن لك الحصول على أفضل أنواع الأسماك و المنتجات، مع ضمان لجميع المنتجات وتصميمها لتناسب احتياجاتك في العراق.', '')
 WHERE id = 'a8bb5bc9-8871-40a8-b92e-a0b1c4f0201a';

-- cloudy-aquarium-water-causes-fix (1 edit)
UPDATE blog_posts SET content = replace(content, '<h3>دور متجر AQUAVO في حل هذه المشكلة</h3>', '')
 WHERE id = 'dcfda5ea-a62f-4522-92c5-0748311a5a6a';

-- co2-system-planted-aquarium-guide (2 edits)
UPDATE blog_posts SET content = replace(replace(content, '، و يمكنك الحصول على نظام ثاني أكسيد الكربون من متجر AQUAVO، الذي يوفر مجموعة واسعة من الأنظمة عالية الجودة', ''), ' في AQUAVO، نقدم لك الحلول المثالية لجميع احتياجاتك في أحواض الأسماك، ويمكنك زيارة موقعنا الإلكتروني للاطلاع على المزيد من المعلومات.', '')
 WHERE id = '8c0d537a-31b3-435c-b6a4-6bde1d0f141f';

-- diy-3d-aquarium-background (2 edits)
UPDATE blog_posts SET content = replace(replace(content, ' في سوق الغزل، يمكن العثور على بعض المواد المحلية، ولكن أحيانًا تكون جودة هذه المواد غير مناسبة للاستخدام في أحواض الأسماك. هنا يأتي دور <strong>أكوافو</strong>، التاجر الرائد في مجال أحواض الأسماك في العراق، الذي يقدم مواد عالية الجودة وضمانات لمساعدة هواة الأسماك على بناء بيئة مثالية لسمكهم.', ' والمعيار الوحيد الذي يهم عند اختيار المواد هو أن تكون خاملة وغير سامة في الماء: فوم بوليسترين غير معالج كيميائياً، وأسمنت مقاوم للماء خالٍ من الإضافات، وطلاء إيبوكسي مخصص للاستخدام المائي.'), ' في حال استخدام نباتات حية، يجب اختيار أنواع تتحمل ظروف المياه في العراق، مثل المياه الشديدة التكلور.', ' في حال استخدام نباتات حية، عالج ماء الصنبور من الكلور قبل إضافته، لأن الكلور يضر النبات والبكتيريا النافعة معاً.')
 WHERE id = '788a2bf5-3962-4ccf-a857-472e04480d2d';

-- driftwood-preparation-yellow-water-fix (1 edit)
UPDATE blog_posts SET content = replace(content, ' في AQUAVO، نسعى دائمًا لتقديم أفضل المنتجات والخدمات لاحتياجاتك في مجال الأحواض المائية. يمكنك زيارة متجرنا في أحداث سوق الغزل أو عبر الإنترنت لاستكشاف منتجاتنا وخدماتنا.', '')
 WHERE id = '58750f33-71dc-4a5c-8fbb-0b21fadfb716';

-- feeding-fish-vegetables-cucumber-peas (2 edits)
UPDATE blog_posts SET content = replace(replace(content, ' مع توافر الخضروات مثل الخيارات والقرع والبازلاء في أسواقنا المحلية مثل <strong>سوق الغزل</strong>، يمكن لمحبي الأسماك في العراق أن يغذوا أسماكهم بطعام صحي ومغذي.', ' والخضروات المستخدمة هنا — الخيار والقرع والبازلاء — متوفرة في أي بقالية، ولا تحتاج إلى شراء خاص.'), ' خاصة مع مشكلة المياه المكلورة في العراق', ' خاصة إذا كان ماء الصنبور لديك مكلوراً')
 WHERE id = '5db06436-061a-4719-94bc-646bc31b8d11';

-- fin-rot-treatment-guide (1 edit)
UPDATE blog_posts SET content = replace(content, ' يمكنك الحصول على أفضل المنتجات وأدوات الرعاية الصحية لأسماكك من متجر AQUAVO، الذي يُقدم خدمات التوصيل إلى جميع أنحاء العراق ويوفر ضمانات على جميع المنتجات.', '')
 WHERE id = '026a2b72-1809-4a96-8453-09747dcf5451';

-- fish-keeping-stress-relief-mental-health (1 edit)
UPDATE blog_posts SET content = replace(content, '<blockquote>نصيحة ذهبية من AQUAVO: عند شراء حوض أسماك، تأكد من اختيار حوض مناسب لحجم منزلك وعدد الأسماك التي تريد تربيتها. بالإضافة إلى ذلك، تأكد من اختيار أسماك سهلة العناية والصيانة، مثل الأسماك الزينة أو الأسماك الشعبية.</blockquote>', '<blockquote>ابدأ بحوض أكبر مما تظن أنك تحتاج: الحوض الكبير أثبت كيميائياً وأسهل في الصيانة من الصغير، لأن أي خطأ يذوب في حجم ماء أكبر.</blockquote>')
 WHERE id = '03c3b718-1f60-4401-98fa-8ca6dc613714';

-- fish-that-live-without-filter (4 edits)
UPDATE blog_posts SET content = replace(replace(replace(replace(content, '<h3>اهمية اختيار الأسماك والنباتات المائية المناسبة</h3>', '<h3>أهمية اختيار الأسماك المناسبة</h3>'), 'في سوق الغزل، يمكن العثور على أنواع مختلفة من الأسماك والنباتات المائية، ولكن يجب اختيارها بعناية لضمان نجاح حوض الأسماك بدون فلتر أو أوكسجين.', 'الحوض بلا فلتر يعتمد على عدد أسماك قليل جداً وتغييرات ماء متكررة. أي زيادة في عدد الأسماك تجعل الأمونيا ترتفع أسرع من قدرة الحوض على معالجتها.'), '<blockquote>نصيحة ذهبية من AQUAVO: يجب دائمًا شراء الأسماك والنباتات المائية من مصادر موثوقة، مثل متجر AQUAVO، الذي يوفر ضمانًا وخدمة توصيل إلى 18 محافظة في العراق، بالإضافة إلى منتجات مستوردة عالية الجودة.</blockquote>', '<blockquote>افحص الأمونيا والنيتريت أسبوعياً في الحوض بلا فلتر. هذان الرقمان هما ما يقرر إن كان العدد الحالي من الأسماك آمناً أم لا.</blockquote>'), ' مع متجر AQUAVO، يمكنك الحصول على الأسماك والنباتات المائية عالية الجودة وخدمة توصيل إلى 18 محافظة في العراق.', '')
 WHERE id = 'd933520e-ac90-4204-b911-69ef91f7cb87';

-- freshwater-pufferfish-care-guide (1 edit)
UPDATE blog_posts SET content = replace(content, ' في AQUAVO، نسعى دائمًا لتقديم "<strong>أفضل المنتجات</strong>" و "<strong>الدعم الفني</strong>" لجميع عشاق الأسماك في العراق.', '')
 WHERE id = '05d19c0b-5858-49ca-a621-acc266458a45';

-- goldfish-5-deadly-mistakes-beginners (1 edit)
UPDATE blog_posts SET content = replace(content, ' يمكنك الحصول على جميع الأدوات والمنتجات اللازمة لتربية أسماك الجولد فيش من متجر AQUAVO، الذي يُقدم ضمانًا لجودة المنتجات وخدمة شحن سريعة إلى جميع أنحاء العراق.', '')
 WHERE id = '979974c8-05ec-443e-a79d-5914e7910f9f';

-- hardscape-rock-arrangement-visual-depth (2 edits)
UPDATE blog_posts SET content = replace(replace(content, 'في سوق الغزل، يمكن العثور على أنواع مختلفة من الصخور التي يمكن استخدامها في حوض السمك، ولكن يجب على هواة صيدلة الأسماك التأكد من جودة الصخور قبل شرائها.', 'قبل إدخال أي صخرة إلى الحوض، تأكد أنها خاملة كيميائياً: ضع بضع قطرات من الخل عليها، فإذا تفاعلت وأطلقت فقاعات فهي جيرية وسترفع العسر والقلوية مع الوقت.'), ' خاصة مع وجود المياه الكلورينة الثقيلة في العراق', ' مع معالجة ماء الصنبور من الكلور قبل استخدامه')
 WHERE id = 'c05e8795-896c-4491-8ef2-b0738a2a463e';

-- how-to-choose-aquarium-tank (1 edit)
UPDATE blog_posts SET content = replace(content, 'تفضل بزيارة قسم <strong>أحواض الأسماك</strong> في متجر AQUAVO واختر من بين أفضل الموديلات الجاهزة والقياسية المتوفرة مع ضمان على التسريب.', 'عند اختيار حوض جاهز، افحص جودة اللصق عند الزوايا ووجود إطار سفلي مستوٍ، فهذان أكثر موضعين يبدأ منهما التسريب.')
 WHERE id = '55d6442a-51b6-40fb-9fc7-652c45c76654';

-- human-medicine-dangers-for-fish (1 edit)
UPDATE blog_posts SET content = replace(content, 'في سوق الغزل، يمكن أن تجد أنواعًا مختلفة من الأسماك و معدات الحوض، ولكن من المهم دائمًا استشارة خبير أو استخدام أدوية سمكية مصممة خصيصًا لاحتياجات الأسماك.', 'استخدم دائماً أدوية مصممة للأسماك وبجرعة مذكورة على العبوة، ولا تقس جرعة بشرية على حجم الحوض. إذا لم تتضح الأعراض، فالأصل هو تحسين جودة الماء أولاً قبل أي دواء.')
 WHERE id = '0ba039f6-0172-4279-b7cc-29035d180e35';

-- iwagumi-aquascape-step-by-step (3 edits)
UPDATE blog_posts SET content = replace(replace(replace(content, ' ويجب أن يتم اختيار الأسماك التي تتحمل الظروف المائية في العراق، مثل المياه المالحة أو العسر.', ' واختر الأسماك بناءً على قياس ماء حوضك فعلياً (pH والعسر الكلي GH)، لأن خصائص الماء تختلف بين المدن ومصادر التجهيز.'), '<blockquote>نصيحة ذهبية من AQUAVO: يجب دائمًا أن يتم اختيار المكونات التي تتحمل الظروف المائية في العراق، مثل المياه المالحة أو العسر، ولذلك ننصح بزيارة سوق الغزل في بغداد لشراء أفضل أنواع الأسماك والنباتات.</blockquote>', '<blockquote>قبل اختيار الصخور والنباتات، افحص ماءك: بعض الصخور الجيرية ترفع العسر والقلوية تدريجياً، وهذا يناسب أنواعاً ولا يناسب أخرى. القياس قبل الشراء يوفّر عليك إعادة التصميم لاحقاً.</blockquote>'), ' ويجب أن يتم اختيار النباتات التي تتحمل الظروف المائية في العراق، مثل المياه المالحة أو العسر.', ' واختر النباتات بحسب قياس ماء حوضك، لا بحسب افتراض عام عن الماء.')
 WHERE id = 'eb6cffec-0a77-4738-a7d9-17f9f3588f17';

-- koi-fish-outdoor-pond-building-tips (1 edit)
UPDATE blog_posts SET content = replace(content, 'يمكنك العثور على حلول مبتكرة في سوق الغزل وسوق الشورجة في بغداد، حيث يمكنك العثور على بائعين محليين يُقدمون حلول تقليدية واعدة لتحديات برك الأسماك.', 'أغلب حلول البرك تعتمد على مواد بناء عامة: عازل EPDM أو حوض مبطّن، ومضخة بتصريف يناسب حجم البركة، وتظليل يقلل التبخر وارتفاع الحرارة.')
 WHERE id = '95466e0f-72c8-4394-8f5b-d5106c238da5';

-- molly-platy-breeding-save-fry (1 edit)
UPDATE blog_posts SET content = replace(content, ' يمكن أن تثق في AQUAVO لتقديم أفضل المنتجات وخدمات ممتازة لتربية أسماكك.', '')
 WHERE id = '290b3675-2674-4aca-90bb-5efdabf0f3dd';

-- ornamental-fish-import-middle-east-origins (2 edits)
UPDATE blog_posts SET content = replace(replace(content, '<blockquote>نصيحة ذهبية من AQUAVO: عند شراء أسماك الزينة، تأكد من اختيار متجر موثوق به يوفر ضمانات وخدمات عالية الجودة، مثل AQUAVO، التي توفر ضمانًا لمدة عام على الأسماك وتسليمها إلى 18 محافظة في العراق.</blockquote>', '<blockquote>مهما كان مصدر السمكة، اعزلها في حوض حجر صحي لأسبوعين قبل إدخالها إلى الحوض الرئيسي. هذه الخطوة وحدها تمنع أغلب حالات انتقال المرض إلى بقية الأسماك.</blockquote>'), ' يواجه استيراد الأسماك الزينة عدة تحديات، ولكن يمكن التغلب عليها باختيار متجر موثوق به مثل AQUAVO. مع ضمانات وخدمات عالية الجودة، يمكنك أن تطمئن إلى أن أسماكك الزينة ستكون في أيد أمينة.', '')
 WHERE id = 'd24b9dd8-69b1-4281-babf-b7045582de12';

-- power-outage-emergency-aquarium-tools (3 edits)
UPDATE blog_posts SET content = replace(replace(replace(content, ' استفد من خدمات وضمانات متجر AQUAVO لضمان حياة أسماكك.', ''), ' يمكنك استشارة خبراء متجر AQUAVO لتحديد أفضل طريقة لتحضير مياه الصرف الصحي لأسماكك.', ''), ' وخدمات متجر AQUAVO', '')
 WHERE id = 'ea58873d-d640-451d-9de8-a3fd886a2f74';

-- real-vs-fake-plants (1 edit)
UPDATE blog_posts SET content = replace(content, ' ومع AQUAVO، نوفر لك نباتات مائية طبيعية جاهزة للزراعة مع التوصيل لكل المحافظات.', '')
 WHERE id = 'd260cf7c-829f-4ca9-b637-0cdba4dd1168';

-- real-vs-fake-plants-iraq (1 edit)
UPDATE blog_posts SET content = replace(content, ' ومع ذلك، <strong>النباتات الصناعية (الحريرية أو البلاستيكية الناعمة)</strong> من متجر AQUAVO تعد بديلاً ممتازاً ومثالياً للمبتدئين في العراق لأنها لا تتطلب إضاءة خاصة (LED زراعي) ولا تسمدة مستمرة ولا تموت مع انقطاعات التيار الكهربائي.', ' ومع ذلك، <strong>النباتات الصناعية (الحريرية أو البلاستيكية الناعمة)</strong> تبقى بديلاً عملياً للمبتدئ لأنها لا تتطلب إضاءة خاصة ولا تسميداً مستمراً ولا تموت مع انقطاع التيار. اختر الأنواع الحريرية الناعمة، فالبلاستيك الصلب قد يمزّق زعانف الأسماك طويلة الزعنفة.')
 WHERE id = '20423c35-134b-4131-ad32-cf699d72d573';

-- ro-water-vs-tap-water-aquarium (2 edits)
UPDATE blog_posts SET content = replace(replace(content, '<h3>نصيحة ذهبية من AQUAVO</h3>
<blockquote>الأسماك والنباتات المائية تحتاج إلى بيئة مائية ملائمة لتكاثرها وازدهارها. مياه RO توفر هذه البيئة المناسبة، ويمكنك الحصول عليها بسهولة من معرض AQUAVO الذي يضمن لك جودة عالية وضمانات طويلة الأمد، مع خدمة توصيل إلى جميع أنحاء العراق عبر 18 محافظة.</blockquote>', '<blockquote>مياه RO نقية إلى درجة أنها بلا معادن تقريباً، ولهذا لا تُستخدم وحدها: تُمزج مع ماء صنبور معالَج أو تُضاف لها أملاح إعادة تمعدن، وإلا صار الماء غير مستقر الأس الهيدروجيني.</blockquote>'), '<p>معرض AQUAVO هو المكان الأمثل لشراء جميع احتياجاتك لأحواض المائية. نحن نضمن لك جودة عالية وضمانات طويلة الأمد، مع خدمة توصيل إلى جميع أنحاء العراق عبر 18 محافظة. زورونا في سوق الغزل أو через موقعنا الإلكتروني لاستكشاف جميع الخدمات والمنتجات التي نقدمها.</p>', '')
 WHERE id = '8e4fea68-76ba-4ec9-bd4c-979fb4bf7ea2';

-- saltwater-vs-freshwater-aquarium-beginners (1 edit)
UPDATE blog_posts SET content = replace(content, 'بفضل خدمات AQUAVO وضمانها و منتجاتها عالية الجودة، يمكنك تربية الأسماك المالحة بنجاح في العراق.', 'حوض المياه المالحة يحتاج جهاز قياس ملوحة (Refractometer) وملحاً بحرياً مخصصاً وصبراً أطول في مرحلة التدوير مقارنة بحوض المياه العذبة.')
 WHERE id = 'dca02a0f-b3a9-47a6-adf8-96408b58b2ae';

-- sump-vs-canister-filter-comparison (1 edit)
UPDATE blog_posts SET content = replace(content, ' كما يجب أن تأخذ في الاعتبار تلوث الماء في العراق، والذي يمكن أن يؤثر على صحة الأسماك.', '')
 WHERE id = '5ec5ee28-ce6d-416c-8805-c0e185342ca9';

-- tetra-food-vs-budget-brands-comparison (1 edit)
UPDATE blog_posts SET content = replace(content, 'AQUAVO، كواحدة من أفضل المتاجر عبر الإنترنت لأسماك الزينة في العراق، توفر مجموعة واسعة من علف الأسماك، بما في ذلك العلف التترا والعلائق الاقتصادية.', 'عند المقارنة بين علف وآخر، اقرأ ترتيب المكونات على العبوة: العلف الذي يبدأ بمسحوق السمك أو الروبيان أفضل من الذي يبدأ بالقمح أو فتات الحبوب.')
 WHERE id = 'f591a022-cf34-48d1-8064-06a8f1c7ca62';

-- why-fish-die-suddenly-rescue-guide (2 edits)
UPDATE blog_posts SET content = replace(replace(content, 'يمكنك شراء هذه الأنظمة من متجر AQUAVO، الذي يُعتبر الأول في العراق في بيع المنتجات المائية.', ''), 'يمكنك الحصول على هذه الأنظمة من متجر AQUAVO، الذي يُعتبر الأول في العراق في بيع المنتجات المائية.', '')
 WHERE id = '10fe0ec2-2dbd-4e63-9643-3feeaf894c51';

-- ghazal-market-baghdad-fish-buying-tips — withdrawn, not edited.
-- The article's title, excerpt, headings and conclusion are all a buying guide
-- for a competing market; there is no sentence surgery that leaves an article
-- behind. The row is kept so the decision stays reversible, and how-to-choose-aquarium-tank
-- covers the same reader intent.
UPDATE blog_posts SET is_published = FALSE WHERE id = '3851b1ab-73dd-44ce-a0e3-1e98e4ab317e';

-- Post-flight: no named marketplace may survive in a published article.
DO $$
DECLARE leftover int;
BEGIN
  SELECT count(*) INTO leftover
    FROM blog_posts
   WHERE is_published = TRUE
     AND (content ILIKE '%سوق الغزل%' OR content ILIKE '%الشورجة%'
          OR title ILIKE '%سوق الغزل%' OR excerpt ILIKE '%سوق الغزل%');
  IF leftover <> 0 THEN
    RAISE EXCEPTION '% published articles still name an external marketplace', leftover;
  END IF;
END $$;

COMMIT;
