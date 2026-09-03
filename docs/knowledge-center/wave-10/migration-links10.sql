-- Migration ID: kc-wave10-links-20260903
-- Target:       Neon production, blog_posts (2 link-only appends)
-- Rollback:     rollback-links10.sql
--
-- migration-wave10.sql asserted an inbound link for the article it renamed, but
-- not for the three it inserted. Two of those link to each other;
-- dwarf-cichlids-guide had none, so it simply replaced the renamed article as
-- the corpus's single orphan. This closes that.
--
-- Both sources are articles that currently have zero outbound links, so the
-- same edit also begins on the other half of the graph problem rather than
-- adding links from pages that already carry plenty.

BEGIN;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM blog_posts WHERE slug = 'american-vs-african-cichlids-differences' AND is_published
     AND length(content) = 2290;
  IF n <> 1 THEN RAISE EXCEPTION 'american-vs-african-cichlids-differences: source missing or changed since drafting'; END IF;
  SELECT count(*) INTO n FROM blog_posts WHERE slug = 'flowerhorn-breeding-nuchal-hump-secrets' AND is_published
     AND length(content) = 2148;
  IF n <> 1 THEN RAISE EXCEPTION 'flowerhorn-breeding-nuchal-hump-secrets: source missing or changed since drafting'; END IF;
END $$;

CREATE TABLE blog_posts_backup_links10_20260903 AS
SELECT id, slug, title, excerpt, content, is_published, now() AS backed_up_at
  FROM blog_posts;

UPDATE blog_posts SET content = '

<h2>مقدمة</h2>
<p>أماكن تربية الأسماك في العراق تواجه تحديات كبيرة، خاصة مع درجات الحرارة العالية التي تصل إلى 50 درجة مئوية في الصيف، وانقطاع التيار الكهربائي المتكرر، ومياه الحنفية المكلورة بشكل كبير. لذلك، من المهم اختيار الأسماك المناسبة لبيئة تربيتها. وفي هذا السياق، نجد أن أسماك السيكلد الأمريكية والإفريقية تحظيان بشعبية كبيرة بين هواة تربية الأسماك في العراق.</p>

<h2>الفرق بين أسماك السيكلد الأمريكية والإفريقية</h2>
<p>تختلف أسماك السيكلد الأمريكية والإفريقية في عدة نواح، منها:</p>
<ul>
  <li>الشكل: تمتاز السيكلد الأمريكية بالجسم الطويل والذيل الطويل، أما السيكلد الإفريقية فتمتاز بالجسم المستدير.</li>
  <li>اللون: تتميز السيكلد الأمريكية باللون الفاتح، أما السيكلد الإفريقية فتمتاز باللون الغامق.</li>
  <li>السلوك: تعتبر السيكلد الأمريكية أكثر هدوءاً من السيكلد الإفريقية، التي تمتاز بعدوانيتها.</li>
</ul>

<h3>تكوين السيكلد الأمريكية</h3>
<p>تعتبر السيكلد الأمريكية من الأسماك الشائعة في العراق، ويمكن تربيتها في الأحواض المنزلية. ومع ذلك، فإنها تتطلب ظروف معينة لتربية ناجحة، مثل:</p>
<ol>
  <li>درجة حرارة الماء: يجب أن تكون درجة حرارة الماء بين 24-28 درجة مئوية.</li>
  <li>مستوى الرقم الهيدروجيني: يجب أن يكون مستوى الرقم الهيدروجيني بين 6.5-7.5.</li>
  <li>مستوى الكلور: يجب أن يكون مستوى الكلور منخفضاً، حيث إن السيكلد الأمريكية حساسة للكلور.</li>
</ol>

<h3>تكوين السيكلد الإفريقية</h3>
<p>تعتبر السيكلد الإفريقية من الأسماك الشائعة في العراق، ويمكن تربيتها في الأحواض المنزلية. ومع ذلك، فإنها تتطلب ظروف معينة لتربية ناجحة، مثل:</p>
<ol>
  <li>درجة حرارة الماء: يجب أن تكون درجة حرارة الماء بين 24-28 درجة مئوية.</li>
  <li>مستوى الرقم الهيدروجيني: يجب أن يكون مستوى الرقم الهيدروجيني بين 7.5-8.5.</li>
  <li>مستوى الكلور: يجب أن يكون مستوى الكلور منخفضاً، حيث إن السيكلد الإفريقية حساسة للكلور.</li>
</ol>

<blockquote>نصيحة ذهبية من AQUAVO: عند تربية أسماك السيكلد الأمريكية أو الإفريقية، يجب أن تختار أحواض ذات جودة عالية وتوفر ظروف مثالية لتربية الأسماك، مثل أحواض AQUAVO التي توفر ضمانات عالية وتصميمات متقدمة.</blockquote>

<h2>استنتاج</h2>
<p>تختلف أسماك السيكلد الأمريكية والإفريقية في الشكل واللون والسلوك، ويمكن تربيتها في الأحواض المنزلية في العراق. ومع ذلك، فإنها تتطلب ظروف معينة لتربية ناجحة. ويمكنك الحصول على أحواض ومتطلبات تربية الأسماك من خلال زيارة موقع AQUAVO، الذي يوفر ضمانات عالية وتصميمات متقدمة، وخدمة توصيل إلى 18 محافظة في العراق.</p>
<p>وهذا التقسيم لا يقتصر على الأسماك الكبيرة. العائلة فيها قسم قزم كامل يحمل نفس السلوك الترابي بحجم يناسب الحوض المجتمعي، ويتوزع على الجهتين — <a href="/blog/dwarf-cichlids-guide">السيكلد القزم: رام وأبيستو</a>.</p>' WHERE slug = 'american-vs-african-cichlids-differences';

UPDATE blog_posts SET content = '

<h2>مقدمة في أسماك الفلورهورن</h2>
<p>أسماك الفلورهورن هي من أنواع الأسماك الزينة التي تتميز برأسها الكبير واللون الجميل، وهي من الأسماك الشهيرة في العراق بسبب جمالها الفريد. ومع ذلك، يعتبر تربية هذه الأسماك تحديًا بسبب متطلباتها الخاصة.</p>

<h3>أهمية الظروف المثالية</h3>
<p>لتربية أسماك الفلورهورن بنجاح، يجب توفير ظروف معيشة مثالية. وهذا يشمل استخدام حوض كبير بما يكفي لاستيعاب الأسماك، مع نظام ترشيح فعال لتقليل التلوث. كما يجب مراعاة درجات الحرارة، حيث تفضل أسماك الفلورهورن درجات حرارة بين 25-30 درجة مئوية. في العراق، حيث يمكن أن تصل درجات الحرارة إلى 50 درجة مئوية في الصيف، يجب اتخاذ إجراءات خاصة لمنع ارتفاع درجات حرارة الحوض.</p>

<h2>تضخيم رأس أسماك الفلورهورن</h2>
<p>تضخيم رأس أسماك الفلورهورن، أو ما يُعرف بالحُب (Nuchal Hump)، هو سمة مميزة لهذه الأسماك. هذا التضخيم يعتمد على جودة الغذاء ووفرة المغذيات. يجب توفير نظام غذائي متوازن يحتوي على البروتين والفيتامينات اللازمة لنمو الأسماك بشكل صحي.</p>

<h3>نصائح لتربية أسماك الفلورهورن</h3>
<ul>
   <li>استخدام حوض كبير وعميق لاستيعاب الأسماك.</li>
   <li>توفير نظام ترشيح فعال لمنع التلوث.</li>
   <li>مراقبة درجات الحرارة وضمان استقرارها.</li>
   <li>توفير نظام غذائي متوازن وغني بالمغذيات.</li>
</ul>

<blockquote>نصيحة ذهبية من AQUAVO: عند شراء أسماك الفلورهورن، يجب اختيار الأفراد الصحية وذات الرأس الكبير، كما يجب الاهتمام بنظام غذائي جيد لتعزيز نمو رأس الأسماك.</blockquote>

<h2>تحديات تربية أسماك الفلورهورن في العراق</h2>
<p>في العراق، توجد تحديات إضافية عند تربية أسماك الفلورهورن، مثل انقطاع التيار الكهربائي ودرجات الحرارة العالية. بالإضافة إلى ذلك، قد يكون استخدام مياه الحوض معرضًا للمخاطر بسبب ارتفاع نسبة الكلور في مياه الشرب. لحل هذه المشاكل، يمكن الاعتماد على محلات موثوقة مثل AQUAVO التي توفر أنظمة ترشيح ومعالجات مياه.</p>

<h3>دور AQUAVO في تسهيل تربية أسماك الفلورهورن</h3>
<p>AQUAVO متجر عراقي مختص بمستلزمات الأحواض. مع التوصيل إلى 18 محافظة في العراق.</p>

<p>باستخدام منتجات وخدمات AQUAVO، يمكن لجميع هواة الأسماك في العراق، حتى في ظل التحديات، أن يربوا أسماك الفلورهورن بنجاح وينعموا بجمالها الفريد. مع التركيز على توفير ظروف معيشة مثالية وتقديم نظام غذائي جيد، يمكن للهواة أن يستمتعوا بتربية أسماك الفلورهورن ويتعلموا المزيد عن هذه الأسماك الرائعة.</p>
<p>وللخلفية العامة عن استراتيجيات التكاثر — ولود أم بايض، ولماذا يتغير سلوك الزوج بعد التزاوج — راجع <a href="/blog/fish-breeding-basics">التفريخ كقرار</a>. وبعد الفقس تبدأ مرحلة لها متطلباتها الخاصة: <a href="/blog/raising-fish-fry">تربية الصغار</a>.</p>' WHERE slug = 'flowerhorn-breeding-nuchal-hump-secrets';

-- Post-flight.
DO $$
DECLARE n int;
BEGIN
  -- Every article this cycle created or renamed must now have an inbound link.
  SELECT count(*) INTO n FROM (
    SELECT t.slug FROM blog_posts t
     WHERE t.slug IN ('dwarf-cichlids-guide', 'fish-breeding-basics', 'raising-fish-fry',
                      'aquarium-substrate-and-decor-guide')
       AND NOT EXISTS (
         SELECT 1 FROM blog_posts b
          CROSS JOIN LATERAL regexp_matches(b.content, 'href="/blog/([^"#?]+)"', 'g') AS m(parts)
          WHERE b.is_published AND b.slug <> t.slug AND m.parts[1] = t.slug)
  ) AS still_orphaned;
  IF n <> 0 THEN RAISE EXCEPTION '% Cycle 10 articles still have no inbound link', n; END IF;

  -- No published article may link to an unpublished one, corpus-wide.
  SELECT count(*) INTO n
    FROM blog_posts b
    CROSS JOIN LATERAL regexp_matches(b.content, 'href="/blog/([^"#?]+)"', 'g') AS m(parts)
   WHERE b.is_published
     AND NOT EXISTS (SELECT 1 FROM blog_posts t WHERE t.slug = m.parts[1] AND t.is_published);
  IF n <> 0 THEN RAISE EXCEPTION '% internal links point at unpublished articles', n; END IF;

  SELECT count(*) INTO n
    FROM blog_posts b
    CROSS JOIN LATERAL regexp_matches(b.content, 'href="/blog/([^"#?]+)"', 'g') AS m(parts)
   WHERE b.is_published AND m.parts[1] = b.slug;
  IF n <> 0 THEN RAISE EXCEPTION '% self links', n; END IF;

  SELECT count(*) INTO n FROM blog_posts
   WHERE slug IN ('american-vs-african-cichlids-differences', 'flowerhorn-breeding-nuchal-hump-secrets')
     AND content ~ '[一-鿿぀-ヿ가-힯Ѐ-ӿऀ-ॿ฀-๿֐-׿Ā-ɏḀ-ỿ]';
  IF n <> 0 THEN RAISE EXCEPTION 'stray script in an edited article'; END IF;
END $$;

COMMIT;
