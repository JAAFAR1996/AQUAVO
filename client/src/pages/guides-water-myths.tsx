import { Download, ExternalLink } from "lucide-react";

/*
  Sources — Researched May 2026:
  A: aquariumscience.org — nitrogen cycle, ammonia/nitrite toxicity, biological filtration
  A: aqueon.com — water quality, water changes, filtration truth vs myth
  B: aquariumcoop.com — water testing, common beginner mistakes, tank cycling
  B: fishkeepingworld.com — water chemistry, tank myths debunked
*/

const PDF_STATUS: "ready" | "draft" = "ready";
const PDF_URL = "/assets/guides/aquavo-water-myths-guide.pdf";

export default function GuideWaterMyths() {
  const pdfReady = PDF_STATUS === "ready";
  return (
    <div className="g-wrap">

      <header className="g-bar">
        <a href="/" className="g-brand">AQUAVO</a>
        <div className="g-bar-actions">
          {pdfReady ? (
            <>
              <a
                href={PDF_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[#E8EDF2] border border-[#0B93A6]/45 hover:bg-[#0B93A6]/10 text-xs sm:text-sm h-9 px-3 rounded-full font-bold transition-colors"
              >
                <span className="hidden sm:inline">فتح PDF</span>
                <ExternalLink className="w-4 h-4" />
              </a>
              <a
                href={PDF_URL}
                download="aquavo-water-myths-guide.pdf"
                className="flex items-center gap-1.5 bg-[#0B93A6] text-[#0B1E28] hover:bg-[#0B93A6]/85 text-xs sm:text-sm h-9 px-3 sm:px-4 rounded-full font-bold transition-colors"
              >
                <span>تحميل PDF</span>
                <Download className="w-4 h-4" />
              </a>
            </>
          ) : (
            <span className="g-btn-off">PDF قيد التجهيز</span>
          )}
        </div>
      </header>

      <main className="g-main">

        {/* ── Hero ── */}
        <section className="g-hero">
          <span className="g-badge">دليل عملي — AQUAVO</span>
          <h1>خرافات عن مي الحوض</h1>
          <p className="g-sub">المي الصافية مو دليل على كلشي تمام — وهذا مجرد مثال</p>
          <p className="g-intro">
            ست خرافات شائعة عن مي الحوض — موثقة، مع الحقيقة العلمية وراء كل واحدة.
            كل خرافة منها ممكن تضر السمچ من حيث ما تدري.
          </p>
          <div className="g-meta-row">
            <span>لمن هذا: كل صاحب حوض — مبتدئ أو متقدم</span>
            <span>وقت القراءة: 7–9 دقائق</span>
            <span className={`g-pdf-tag ${pdfReady ? "g-ready" : "g-draft"}`}>
              PDF: {pdfReady ? "متوفر للتحميل" : "قيد التجهيز"}
            </span>
          </div>
          <p className="g-disclaimer">
            هذا الدليل للتوعية العامة. للتشخيص الدقيق، أرسل صورة الحوض لـ AQUAVO.
          </p>
        </section>

        {/* ── Section: ليش الخرافات خطرة ── */}
        <section className="g-section">
          <h2 className="g-title">ليش خرافات المي خطرة؟</h2>
          <p className="g-section-intro">
            المشكلة مو بس إن المعلومة خاطئة — المشكلة إن الإنسان يتصرف بناءً عليها.
            لما تعتقد إن المي الصافية = سليمة، ما تفحص. لما تفكر إن تغيير كل المي حل،
            تدمر البكتيريا النافعة. الخرافة تعطيك ثقة زائفة — وهذا هو الخطر الحقيقي.
          </p>
          <div className="g-two-col">
            <div className="g-col-box g-warn-box">
              <div className="g-col-label">ما يسببه التصديق بالخرافات:</div>
              <ul className="g-simple-list">
                <li>لا تفحص المي لأنك تظن إنها تبين بعينك</li>
                <li>تضيف منتجات بدون فهم ما تسويه</li>
                <li>تدمر الدورة البيولوجية وما تدري</li>
                <li>تتأخر في التدخل لأنك ما تلاحظ المشكلة</li>
                <li>تنفق فلوس على حلول لا تناسب المشكلة</li>
              </ul>
            </div>
            <div className="g-col-box g-safe-box">
              <div className="g-col-label">الأساس الصحيح:</div>
              <ul className="g-simple-list">
                <li>المي الصافية لا تعني المي الآمنة</li>
                <li>الكيمياء تحكمها الأرقام، مو المظهر</li>
                <li>البكتيريا النافعة هي اللي تحمي السمچ</li>
                <li>التغيير الجزئي المنتظم أفضل من الكامل</li>
                <li>الفهم أهم من المنتج</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── خرافة ١ ── */}
        <section className="g-section">
          <div className="g-cause-header">
            <span className="g-cause-num-big">01</span>
            <h2 className="g-title g-title-inline">المي الصافية = كلشي تمام</h2>
          </div>
          <div className="g-myth-badge g-myth-false">خرافة — مثبتة علمياً</div>
          <div className="g-cause-block">
            <h3 className="g-cause-sub">الحقيقة:</h3>
            <p>
              الأمونيا والنيتريت — أخطر المواد في حوض السمچ — بلا لون وبلا رائحة.
              المي ممكن تكون شفافة تماماً وفيها أمونيا بمستوى يقتل السمچ خلال ساعات.
              الصفاء يدل على غياب الجسيمات المعلقة فقط — مو على غياب السموم الكيميائية.
            </p>
          </div>
          <div className="g-two-col">
            <div className="g-col-box g-warn-box">
              <div className="g-col-label">ما لا تبينه العين:</div>
              <ul className="g-simple-list">
                <li>أمونيا (NH3) — سامة من أول ارتفاع</li>
                <li>نيتريت (NO2) — يمنع حمل الأكسجين بالدم</li>
                <li>نترات عالية (NO3 أكثر من 20 ppm)</li>
                <li>pH خاطئ أو متقلب</li>
                <li>صلابة المي (GH/KH) خارج النطاق</li>
              </ul>
            </div>
            <div className="g-col-box g-safe-box">
              <div className="g-col-label">شنو تعتمد عليه:</div>
              <ul className="g-simple-list">
                <li>كيت اختبار المي (API Master Test Kit)</li>
                <li>شرائط الفحص — للمتابعة السريعة</li>
                <li>فحص أسبوعي كحد أدنى</li>
                <li>يومي في أول شهر من تأسيس الحوض</li>
                <li>فوري إذا لاحظت تغيير بسلوك السمچ</li>
              </ul>
            </div>
          </div>
          <div className="g-important-note">
            أمونيا = 0. نيتريت = 0. نترات = أقل من 20 ppm. هذه هي الأرقام الصحيحة — مو لون المي.
          </div>
        </section>

        {/* ── خرافة ٢ ── */}
        <section className="g-section">
          <div className="g-cause-header">
            <span className="g-cause-num-big">02</span>
            <h2 className="g-title g-title-inline">تغيير كل المي أحسن حل</h2>
          </div>
          <div className="g-myth-badge g-myth-false">خرافة — وخطيرة على الحوض</div>
          <div className="g-cause-block">
            <h3 className="g-cause-sub">الحقيقة:</h3>
            <p>
              تغيير 100% من المي يسبب صدمة حرارية مفاجئة، تغيير مفاجئ بالـ pH، وضغطاً شديداً على السمچ.
              الأخطر: البكتيريا النافعة تعيش على أسطح الحصى والفلتر — مو بالمي نفسها.
              تغيير كل المي لا يدمر الدورة البيولوجية لكنه يصدم السمچ بكل هذه التغييرات المفاجئة.
            </p>
            <p style={{ marginTop: "10px" }}>
              تغيير كل المي كذلك لا يزيل المرض أو الطفيليات — هذه تبقى على جسم السمچ وعلى
              أسطح الحوض. الفكرة إن "تنظيف كل شيء" يحل المشكلة هي واحدة من أكثر الخرافات ضرراً.
            </p>
          </div>
          <div className="g-action-box">
            <div className="g-action-label">النسبة الصحيحة والوقت:</div>
            <ol className="g-numbered">
              <li>غيّر 25% إلى 30% من المي أسبوعياً — هذا المعدل الموصى به</li>
              <li>استخدم مزيل كلور قبل إضافة المي الجديدة</li>
              <li>تأكد من تقريب درجة حرارة المي الجديدة من حرارة الحوض</li>
              <li>لا تنظف الحصى والفلتر بنفس يوم تغيير المي</li>
              <li>إذا الأمونيا ارتفعت جداً، غيّر 50% على مرتين بفارق ساعات</li>
            </ol>
          </div>
          <div className="g-dont-inline">
            <div className="g-dont-label">شنو لا تسوي أبداً:</div>
            <div className="g-dont-items">
              <span className="g-dont-chip">لا تغير 100% من المي</span>
              <span className="g-dont-chip">لا تنظف الفلتر بمي الصنبور</span>
              <span className="g-dont-chip">لا تغير المي وتنظف الحصى بنفس اليوم</span>
            </div>
          </div>
        </section>

        {/* ── خرافة ٣ ── */}
        <section className="g-section">
          <div className="g-cause-header">
            <span className="g-cause-num-big">03</span>
            <h2 className="g-title g-title-inline">الفلتر وحده يكفي — المي ما تحتاج تغيير</h2>
          </div>
          <div className="g-myth-badge g-myth-false">خرافة — ناقصة المعلومة</div>
          <div className="g-cause-block">
            <h3 className="g-cause-sub">الحقيقة:</h3>
            <p>
              الفلتر يحول الأمونيا إلى نيتريت، والنيتريت إلى نترات — بس لا يزيل النترات.
              النترات تتراكم وتسبب ضغطاً على السمچ ومشاكل صحية على المدى البعيد. الطريقة الوحيدة
              لإزالة النترات من الحوض المغلق هي تغيير الماء بانتظام أو نباتات حية كثيفة.
            </p>
          </div>
          <div className="g-info-note">
            الدورة البيولوجية: أمونيا (NH3) ← بكتيريا نيتروسوموناس ← نيتريت (NO2) ← بكتيريا نيتروباكتر ← نترات (NO3). الفلتر يدير الدورة — لكنه لا ينهيها. تغيير المي هو "الخروج" الوحيد للنترات.
          </div>
          <div className="g-two-col">
            <div className="g-col-box g-warn-box">
              <div className="g-col-label">ما يسببه الاعتماد الكلي على الفلتر:</div>
              <ul className="g-simple-list">
                <li>تراكم النترات تدريجياً — بدون أعراض واضحة أولاً</li>
                <li>السمچ تبدو بخير لأشهر ثم تبدأ مشاكل مزمنة</li>
                <li>نمو الطحالب يزيد بسبب النترات العالية</li>
                <li>السمچ تصبح أقل مقاومة للأمراض</li>
              </ul>
            </div>
            <div className="g-col-box g-safe-box">
              <div className="g-col-label">الروتين الصحيح:</div>
              <ul className="g-simple-list">
                <li>فلتر جيد + تغيير أسبوعي 25%</li>
                <li>راقب النترات — لا تتجاوز 20 ppm</li>
                <li>نباتات حية تساعد لكنها لا تكفي وحدها</li>
                <li>لا تعتمد على تبخر المي كـ"تغيير" طبيعي</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── خرافة ٤ ── */}
        <section className="g-section">
          <div className="g-cause-header">
            <span className="g-cause-num-big">04</span>
            <h2 className="g-title g-title-inline">إضافة منتج تعديل المي تحل كل شيء</h2>
          </div>
          <div className="g-myth-badge g-myth-partial">نصف حقيقة — يحتاج فهم</div>
          <div className="g-cause-block">
            <h3 className="g-cause-sub">الحقيقة:</h3>
            <p>
              المنتجات مثل مزيل الكلور، معدّلات الـ pH، ومنتجات الأمونيا — كل واحد منها له
              وظيفة محددة وشروط محددة. استخدامها بدون فهم السبب ممكن يخلط كيمياء المي أو يخفي
              مشكلة بدل ما يحلها.
            </p>
            <p style={{ marginTop: "10px" }}>
              مثال: بعض منتجات "detoxifier" تحول الأمونيا لشكل أقل سمية مؤقتاً — الكيت يبين
              صفر لكنها ما زالت موجودة. السمچة بخير ظاهرياً — المشكلة ما انحلت.
            </p>
          </div>
          <div className="g-two-col">
            <div className="g-col-box g-safe-box">
              <div className="g-col-label">منتجات تستخدمها بثقة:</div>
              <ul className="g-simple-list">
                <li>مزيل الكلور — ضروري مع كل تغيير مي</li>
                <li>بكتيريا بيولوجية — لتأسيس حوض جديد</li>
                <li>ملح للحوض العذب — بكميات دقيقة فقط إذا لزم</li>
              </ul>
            </div>
            <div className="g-col-box g-warn-box">
              <div className="g-col-label">منتجات تحتاج حذر:</div>
              <ul className="g-simple-list">
                <li>معدّلات pH — سبب المشكلة أهم من العلاج</li>
                <li>Ammonia detoxifiers — حل مؤقت فقط</li>
                <li>أي علاج بدون تشخيص واضح للمشكلة</li>
                <li>تركيبات "كل شيء" — نادراً ما تفيد</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── خرافة ٥ ── */}
        <section className="g-section">
          <div className="g-cause-header">
            <span className="g-cause-num-big">05</span>
            <h2 className="g-title g-title-inline">الريحة من الحوض شيء طبيعي</h2>
          </div>
          <div className="g-myth-badge g-myth-false">خرافة — علامة تحتاج تدخل</div>
          <div className="g-cause-block">
            <h3 className="g-cause-sub">الحقيقة:</h3>
            <p>
              الحوض الصحي يكاد ما يكون عنده ريحة — أو ريحة خفيفة طبيعية من التربة والنباتات.
              أي ريحة كريهة أو قوية هي إنذار حقيقي. الريحة الأكثر شيوعاً هي ريحة الكبريت
              (البيض المسروق) — وهذه تعني أكسجين ناقص بالقاع أو مواد عضوية متحللة.
            </p>
          </div>
          <div className="g-diag-grid">
            <div className="g-diag g-safe">
              <div className="g-diag-label">ريحة طبيعية:</div>
              <ul className="g-diag-list">
                <li>ريحة ترابية خفيفة من الحصى أو التربة</li>
                <li>ريحة نباتية هادية</li>
                <li>ما في ريحة واضحة — هذا الأفضل</li>
              </ul>
            </div>
            <div className="g-diag g-warn">
              <div className="g-diag-label">ريحة تحتاج تدخل:</div>
              <ul className="g-diag-list">
                <li>ريحة كبريت — قاع بدون أكسجين</li>
                <li>ريحة تعفن — مواد عضوية متراكمة</li>
                <li>ريحة أمونيا حادة — الحوض في أزمة</li>
                <li>ريحة كيميائية — تلوث خارجي</li>
              </ul>
            </div>
          </div>
          <div className="g-action-box">
            <div className="g-action-label">شنو تسوي عند وجود ريحة:</div>
            <ol className="g-numbered">
              <li>افحص الأمونيا والنيتريت فوراً</li>
              <li>تفقد القاع — أكو مواد متعفنة؟</li>
              <li>افحص الفلتر — ما يشتغل صح؟</li>
              <li>نظف القاع بالسيفون لكن بدون مبالغة</li>
              <li>غيّر 25% من المي إذا القراءات سيئة</li>
            </ol>
          </div>
        </section>

        {/* ── خرافة ٦ ── */}
        <section className="g-section">
          <div className="g-cause-header">
            <span className="g-cause-num-big">06</span>
            <h2 className="g-title g-title-inline">الحوض الصغير أسهل للمبتدئ</h2>
          </div>
          <div className="g-myth-badge g-myth-false">خرافة — العكس صحيح</div>
          <div className="g-cause-block">
            <h3 className="g-cause-sub">الحقيقة:</h3>
            <p>
              الحوض الصغير أصعب — مو أسهل. الحوض الكبير فيه عازل طبيعي (buffer) ضد التغييرات
              المفاجئة في الكيمياء. لو ارتفعت الأمونيا قليلاً بحوض 200 لتر، التأثير بطيء.
              بحوض 20 لتر، نفس الكمية من الطعام الزائد تضاعف تركيز الأمونيا فوراً.
            </p>
          </div>
          <div className="g-two-col">
            <div className="g-col-box g-warn-box">
              <div className="g-col-label">مشاكل الحوض الصغير:</div>
              <ul className="g-simple-list">
                <li>الكيمياء تتغير بسرعة — خطأ صغير يتضاعف</li>
                <li>الحرارة تتذبذب أسرع مع تغيير درجة الغرفة</li>
                <li>الدورة البيولوجية أقل استقراراً</li>
                <li>عدد السمچ المسموح به محدود جداً</li>
                <li>يحتاج متابعة أكثر — مو أقل</li>
              </ul>
            </div>
            <div className="g-col-box g-safe-box">
              <div className="g-col-label">التوصية للمبتدئ:</div>
              <ul className="g-simple-list">
                <li>60 لتر هو الحد الأدنى المريح للبداية</li>
                <li>100 لتر أفضل بكثير للمبتدئ</li>
                <li>السمچ الأسهل: البلاطي، الغبي، الجولدفيش</li>
                <li>ابدأ بعدد قليل — أضف تدريجياً بعد شهر</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── شنو تراقب فعلياً ── */}
        <section className="g-section">
          <h2 className="g-title">شنو تراقب فعلياً؟</h2>
          <p className="g-section-intro">
            بدل ما تراقب المظهر — راقب الأرقام. هذه هي المؤشرات الحقيقية لصحة الحوض:
          </p>
          <div className="g-send-grid">
            <div className="g-send-card g-send-visual">
              <div className="g-send-card-title">أسبوعياً</div>
              <ul className="g-send-list-inner">
                <li>أمونيا: 0 ppm</li>
                <li>نيتريت: 0 ppm</li>
                <li>نترات: أقل من 20 ppm</li>
                <li>pH: ثابت حسب نوع السمچ</li>
              </ul>
            </div>
            <div className="g-send-card g-send-info">
              <div className="g-send-card-title">شهرياً</div>
              <ul className="g-send-list-inner">
                <li>صلابة المي (GH/KH)</li>
                <li>سلوك السمچ — تغذية وحركة</li>
                <li>حالة الفلتر — تدفق ثابت؟</li>
                <li>نمو الطحالب — أكثر من المعتاد؟</li>
              </ul>
            </div>
            <div className="g-send-card g-send-behavior">
              <div className="g-send-card-title">فوراً عند:</div>
              <ul className="g-send-list-inner">
                <li>سمچة ميتة — افحص الأمونيا</li>
                <li>سلوك غريب أو خمول</li>
                <li>ريحة غير طبيعية</li>
                <li>مي عكرة فجأة</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── Checklist عملي ── */}
        <section className="g-section">
          <h2 className="g-title">Checklist عملي — قبل أي تغيير كبير</h2>
          <p className="g-section-intro">
            قبل ما تغير أي شيء بالحوض — اتبع هذا الترتيب:
          </p>
          <div className="g-mistakes">
            <div className="g-mistake g-check-item">
              <div className="g-mistake-title g-check-title">افحص المي أولاً</div>
              <div className="g-mistake-why">قبل أي تدخل — أمونيا، نيتريت، نترات. الأرقام تحدد الخطوة التالية.</div>
            </div>
            <div className="g-mistake g-check-item">
              <div className="g-mistake-title g-check-title">حدد المشكلة بوضوح</div>
              <div className="g-mistake-why">السمچة مريضة؟ المي عكرة؟ الأرقام سيئة؟ كل مشكلة لها حل مختلف.</div>
            </div>
            <div className="g-mistake g-check-item">
              <div className="g-mistake-title g-check-title">غيّر شيء واحد فقط</div>
              <div className="g-mistake-why">تغيير متعدد بنفس اليوم يجعلك لا تعرف ما الذي نجح وما الذي ضر.</div>
            </div>
            <div className="g-mistake g-check-item">
              <div className="g-mistake-title g-check-title">راقب 24–48 ساعة</div>
              <div className="g-mistake-why">أعط الحوض وقتاً للاستجابة قبل ما تحكم أو تضيف شيء آخر.</div>
            </div>
            <div className="g-mistake g-check-item">
              <div className="g-mistake-title g-check-title">وثّق ما سويته</div>
              <div className="g-mistake-why">سجّل التاريخ، ما غيرت، والنتيجة. يساعدك تفهم نمط حوضك مع الوقت.</div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="g-cta">
          <h2>إذا تحتاج مساعدة أدق</h2>
          <p>أرسل صورة الحوض وقراءات المي وحجم الحوض لـ AQUAVO.</p>
          <p>نراجع الحالة بهدوء ونعطيك الخطوة الأنسب.</p>
        </section>

      </main>

      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{background:#0B1E28}
        .g-wrap{min-height:100vh;background:#0B1E28;color:#e8edf5;direction:rtl;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;line-height:1.7}
        .g-bar{position:sticky;top:0;z-index:50;height:60px;background:rgba(1,6,17,.96);border-bottom:1px solid rgba(11,147,166,.3);display:flex;align-items:center;justify-content:space-between;padding:0 20px;backdrop-filter:blur(10px)}
        .g-brand{color:#0B93A6;font-weight:800;letter-spacing:4px;font-size:17px;text-decoration:none}
        .g-bar-actions{display:flex;gap:10px;align-items:center}
        .g-btn-off{background:rgba(11,147,166,.1);color:rgba(11,147,166,.45);padding:8px 16px;border-radius:999px;font-size:14px;font-weight:600;cursor:not-allowed;border:1px solid rgba(11,147,166,.15);white-space:nowrap}
        .g-main{max-width:760px;margin:0 auto;padding:0 16px 60px}
        .g-hero{padding:48px 0 36px;border-bottom:1px solid rgba(11,147,166,.15);margin-bottom:44px}
        .g-badge{display:inline-block;background:rgba(11,147,166,.12);color:#0B93A6;border:1px solid rgba(11,147,166,.3);border-radius:999px;padding:4px 14px;font-size:12px;font-weight:700;letter-spacing:.5px;margin-bottom:14px}
        .g-hero h1{font-size:clamp(28px,5.5vw,42px);font-weight:800;color:#fff;line-height:1.25;margin-bottom:10px}
        .g-sub{font-size:18px;color:#9ab5c8;margin-bottom:12px;font-weight:500}
        .g-intro{font-size:15px;color:#7a9ab0;max-width:620px;margin-bottom:18px;line-height:1.75}
        .g-meta-row{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}
        .g-meta-row span{font-size:12px;color:#6a8fa8;background:rgba(255,255,255,.04);padding:4px 10px;border-radius:6px}
        .g-pdf-tag{font-size:12px;padding:4px 10px;border-radius:6px;font-weight:600}
        .g-draft{background:rgba(255,215,0,.08);color:rgba(255,215,0,.6)}
        .g-ready{background:rgba(11,147,166,.12);color:#0B93A6}
        .g-disclaimer{font-size:12px;color:rgba(255,255,255,.28);border-right:2px solid rgba(255,255,255,.08);padding-right:10px;line-height:1.6}
        .g-section{margin-bottom:52px}
        .g-title{font-size:19px;font-weight:700;color:#0B93A6;margin-bottom:18px;padding-bottom:9px;border-bottom:1px solid rgba(11,147,166,.2)}
        .g-title.g-title-inline{border-bottom:none;padding-bottom:0;margin-bottom:0;font-size:18px}
        .g-section-intro{font-size:14px;color:#8aa8bc;margin-bottom:18px;line-height:1.75}
        .g-cause-header{display:flex;align-items:baseline;gap:14px;margin-bottom:12px;border-bottom:1px solid rgba(11,147,166,.2);padding-bottom:10px}
        .g-cause-num-big{font-size:32px;font-weight:900;color:rgba(11,147,166,.3);line-height:1;flex-shrink:0}
        .g-myth-badge{display:inline-block;border-radius:6px;padding:4px 12px;font-size:12px;font-weight:700;letter-spacing:.4px;margin-bottom:14px}
        .g-myth-false{background:rgba(255,80,60,.08);color:rgba(255,100,80,.8);border:1px solid rgba(255,80,60,.2)}
        .g-myth-partial{background:rgba(255,215,0,.07);color:rgba(255,200,60,.8);border:1px solid rgba(255,200,60,.2)}
        .g-cause-block{background:rgba(10,22,40,.5);border:1px solid rgba(11,147,166,.1);border-radius:12px;padding:18px 20px;margin-bottom:16px}
        .g-cause-sub{font-size:13px;font-weight:700;color:#0B93A6;letter-spacing:.5px;margin-bottom:8px}
        .g-cause-block p{font-size:14px;color:#9ab5c8;line-height:1.8}
        .g-two-col{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px}
        .g-col-box{border-radius:12px;padding:16px}
        .g-safe-box{background:rgba(11,147,166,.06);border:1px solid rgba(11,147,166,.2)}
        .g-warn-box{background:rgba(255,100,60,.05);border:1px solid rgba(255,100,60,.2)}
        .g-col-label{font-size:11px;font-weight:700;letter-spacing:.5px;margin-bottom:10px}
        .g-safe-box .g-col-label{color:#0B93A6}
        .g-warn-box .g-col-label{color:#ff6c47}
        .g-simple-list{list-style:none;display:flex;flex-direction:column;gap:7px}
        .g-simple-list li{font-size:13px;color:#b0c8d8;padding-right:14px;position:relative;line-height:1.5}
        .g-safe-box .g-simple-list li::before{content:"—";position:absolute;right:0;color:rgba(11,147,166,.6)}
        .g-warn-box .g-simple-list li::before{content:"—";position:absolute;right:0;color:rgba(255,108,71,.6)}
        .g-diag-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px}
        .g-diag{border-radius:12px;padding:18px}
        .g-safe{background:rgba(11,147,166,.06);border:1px solid rgba(11,147,166,.22)}
        .g-warn{background:rgba(255,100,60,.05);border:1px solid rgba(255,100,60,.22)}
        .g-diag-label{font-size:11px;font-weight:700;letter-spacing:.5px;margin-bottom:10px}
        .g-safe .g-diag-label{color:#0B93A6}
        .g-warn .g-diag-label{color:#ff6c47}
        .g-diag-list{list-style:none;display:flex;flex-direction:column;gap:7px}
        .g-diag-list li{font-size:13px;color:#b8ccd8;padding-right:14px;position:relative;line-height:1.5}
        .g-safe .g-diag-list li::before{content:"—";position:absolute;right:0;color:rgba(11,147,166,.6)}
        .g-warn .g-diag-list li::before{content:"—";position:absolute;right:0;color:rgba(255,108,71,.6)}
        .g-action-box{background:rgba(10,22,40,.6);border:1px solid rgba(11,147,166,.18);border-radius:12px;padding:16px 20px;margin-bottom:12px}
        .g-action-label{font-size:11px;font-weight:700;color:#0B93A6;letter-spacing:.5px;margin-bottom:10px}
        .g-numbered{list-style:none;display:flex;flex-direction:column;gap:8px;counter-reset:steps}
        .g-numbered li{counter-increment:steps;display:flex;gap:12px;align-items:flex-start;font-size:13px;color:#b0c8d8;line-height:1.55}
        .g-numbered li::before{content:counter(steps);color:#0B93A6;font-weight:700;font-size:12px;min-width:18px;text-align:center;background:rgba(11,147,166,.12);border-radius:4px;padding:1px 5px;flex-shrink:0}
        .g-dont-inline{margin-top:4px}
        .g-dont-label{font-size:11px;font-weight:700;color:rgba(255,108,71,.7);letter-spacing:.5px;margin-bottom:8px}
        .g-dont-items{display:flex;flex-wrap:wrap;gap:8px}
        .g-dont-chip{background:rgba(255,100,60,.05);color:rgba(255,140,120,.8);border:1px solid rgba(255,100,60,.15);border-radius:20px;padding:5px 12px;font-size:12px}
        .g-info-note{background:rgba(11,147,166,.06);border-right:3px solid rgba(11,147,166,.5);border-radius:0 10px 10px 0;padding:12px 16px;font-size:13px;color:#8acad8;line-height:1.6;margin-bottom:14px}
        .g-important-note{background:rgba(255,215,0,.05);border-right:3px solid rgba(255,215,0,.4);border-radius:0 10px 10px 0;padding:12px 16px;font-size:13px;color:#c8b060;line-height:1.6;margin-top:14px}
        .g-mistakes{display:flex;flex-direction:column;gap:10px}
        .g-mistake{background:rgba(10,22,40,.5);border:1px solid rgba(255,100,60,.1);border-radius:12px;padding:16px 18px}
        .g-check-item{border-color:rgba(11,147,166,.15)!important}
        .g-mistake-title{font-size:14px;font-weight:700;color:rgba(255,160,140,.8);margin-bottom:6px}
        .g-mistake-title::before{content:"✕  ";color:rgba(255,100,60,.5)}
        .g-check-title{color:rgba(11,147,166,.9)!important}
        .g-check-title::before{content:"✓  "!important;color:rgba(11,147,166,.6)!important}
        .g-mistake-why{font-size:13px;color:#8aa0b0;line-height:1.6}
        .g-send-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px}
        .g-send-card{border-radius:12px;padding:16px}
        .g-send-visual{background:rgba(11,147,166,.06);border:1px solid rgba(11,147,166,.2)}
        .g-send-info{background:rgba(255,215,0,.04);border:1px solid rgba(255,215,0,.15)}
        .g-send-behavior{background:rgba(255,100,60,.04);border:1px solid rgba(255,100,60,.15)}
        .g-send-card-title{font-size:12px;font-weight:700;color:#0B93A6;letter-spacing:.5px;margin-bottom:10px}
        .g-send-info .g-send-card-title{color:rgba(255,215,0,.7)}
        .g-send-behavior .g-send-card-title{color:#ff6c47}
        .g-send-list-inner{list-style:none;display:flex;flex-direction:column;gap:7px}
        .g-send-list-inner li{font-size:12px;color:#8aa8bc;line-height:1.5;padding-right:12px;position:relative}
        .g-send-list-inner li::before{content:"—";position:absolute;right:0;color:rgba(11,147,166,.35)}
        .g-cta{background:linear-gradient(135deg,rgba(11,147,166,.08),rgba(10,22,40,.8));border:1px solid rgba(11,147,166,.25);border-radius:16px;padding:36px 28px;text-align:center}
        .g-cta h2{font-size:22px;font-weight:800;color:#fff;margin-bottom:10px}
        .g-cta p{font-size:15px;color:#9ab5c8;margin-bottom:6px}
        @media(max-width:640px){
          .g-bar{padding:0 12px}
          .g-brand{font-size:14px;letter-spacing:2px}
          .g-hero{padding:32px 0 24px}
          .g-hero h1{font-size:clamp(24px,7vw,32px)}
          .g-diag-grid,.g-two-col{grid-template-columns:1fr}
          .g-send-grid{grid-template-columns:1fr}
          .g-cause-header{gap:10px}
          .g-cause-num-big{font-size:24px}
          .g-cta{padding:24px 16px}
        }
      `}</style>
    </div>
  );
}
