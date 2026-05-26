import { Download, ExternalLink } from "lucide-react";

/*
  Sources — Researched May 2026:
  A: aquariumscience.org — filtration types, biological media, heater sizing
  A: aqueon.com — beginner equipment guide, tank setup essentials
  B: aquariumcoop.com — beginner fish keeping, equipment reviews, filter media
  B: fishkeepingworld.com — essential equipment lists, beginner mistakes
*/

const PDF_STATUS: "ready" | "draft" = "ready";
const PDF_URL = "/assets/guides/aquavo-essential-tools-guide.pdf";

export default function GuideEssentialTools() {
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
                className="flex items-center gap-1.5 text-[#E8EDF2] border border-[#199BB8]/45 hover:bg-[#199BB8]/10 text-xs sm:text-sm h-9 px-3 rounded-full font-bold transition-colors"
              >
                <span className="hidden sm:inline">فتح PDF</span>
                <ExternalLink className="w-4 h-4" />
              </a>
              <a
                href={PDF_URL}
                download="aquavo-essential-tools-guide.pdf"
                className="flex items-center gap-1.5 bg-[#199BB8] text-[#010611] hover:bg-[#199BB8]/85 text-xs sm:text-sm h-9 px-3 sm:px-4 rounded-full font-bold transition-colors"
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
          <h1>الأدوات الأساسية لكل صاحب حوض</h1>
          <p className="g-sub">شنو تشتري أولاً، شنو تؤجله، وشنو لا تشتريه بالبداية</p>
          <p className="g-intro">
            دليل عملي مرتب حسب الأولوية — مو حسب السعر أو الشكل.
            كل أداة مذكورة بسبب واضح: شنو تسوي وليش تحتاجها.
          </p>
          <div className="g-meta-row">
            <span>لمن هذا: المبتدئ + من يريد يراجع معداته</span>
            <span>وقت القراءة: 8–10 دقائق</span>
            <span className={`g-pdf-tag ${pdfReady ? "g-ready" : "g-draft"}`}>
              PDF: {pdfReady ? "متوفر للتحميل" : "قيد التجهيز"}
            </span>
          </div>
          <p className="g-disclaimer">
            هذا الدليل للتوعية العامة. للتشخيص الدقيق، أرسل صورة الحوض لـ AQUAVO.
          </p>
        </section>

        {/* ── شنو يعني أدوات أساسية ── */}
        <section className="g-section">
          <h2 className="g-title">شنو يعني "أساسية"؟</h2>
          <p className="g-section-intro">
            الأداة الأساسية هي اللي بدونها الحوض ما يستقر أو السمچ تعاني.
            مو كل ما بيعه المحل ضروري — وليس كل ما يبدو جميل يفيد.
            الترتيب هنا حسب الأثر الفعلي على السمچ، مو حسب السعر أو الشكل.
          </p>
          <div className="g-two-col">
            <div className="g-col-box g-warn-box">
              <div className="g-col-label">الحوض بدونها يفشل:</div>
              <ul className="g-simple-list">
                <li>فلتر بيولوجي مناسب</li>
                <li>هيتر (إذا السمچ استوائي)</li>
                <li>مزيل كلور</li>
                <li>كيت فحص المي</li>
                <li>ثيرمومتر</li>
              </ul>
            </div>
            <div className="g-col-box g-safe-box">
              <div className="g-col-label">مفيدة جداً — مو ضرورة:</div>
              <ul className="g-simple-list">
                <li>سيفون أو شبكة تنظيف القاع</li>
                <li>إضاءة مناسبة</li>
                <li>ميديا فلترة إضافية</li>
                <li>طعام متنوع ومناسب للنوع</li>
                <li>ديكور يوفر مخابئ</li>
              </ul>
            </div>
          </div>
          <div className="g-important-note">
            الحوض الصغير أصعب — مو أسهل. 60 لتر هو الحد الأدنى المريح للمبتدئ. أقل من ذلك يعني كيمياء تتقلب بسرعة ومتابعة أكثر.
          </div>
        </section>

        {/* ── الفلتر ── */}
        <section className="g-section">
          <div className="g-cause-header">
            <span className="g-cause-num-big">01</span>
            <h2 className="g-title g-title-inline">الفلتر البيولوجي</h2>
          </div>
          <div className="g-tool-priority g-priority-must">لازم — أهم أداة بالحوض</div>
          <div className="g-cause-block">
            <h3 className="g-cause-sub">ليش أهم أداة؟</h3>
            <p>
              الفلتر البيولوجي يستضيف البكتيريا النافعة اللي تحول الأمونيا الخطيرة
              (فضلات السمچ) إلى نيتريت، ثم إلى نترات. بدون هذه البكتيريا، الأمونيا
              ترتفع وتقتل السمچ خلال أيام.
            </p>
            <p style={{ marginTop: "10px" }}>
              البكتيريا تعيش على الأسطح داخل الفلتر — مو بالمي. لذلك مساحة السطح
              داخل وسط الفلترة (البيومديا) هي ما يحدد قوة الفلتر — مو حجم الفلتر من الخارج.
            </p>
          </div>
          <div className="g-two-col">
            <div className="g-col-box g-safe-box">
              <div className="g-col-label">أنواع الفلترة الثلاثة:</div>
              <ul className="g-simple-list">
                <li>ميكانيكية — يشبك الجسيمات الكبيرة (إسفنج)</li>
                <li>بيولوجية — بكتيريا على أسطح الميديا (الأهم)</li>
                <li>كيميائية — كربون نشط (اختياري، محدود الفترة)</li>
              </ul>
            </div>
            <div className="g-col-box g-warn-box">
              <div className="g-col-label">شنو تتجنب:</div>
              <ul className="g-simple-list">
                <li>لا تنظف الفلتر بمي الصنبور — يقتل البكتيريا</li>
                <li>لا تغير كل الميديا مرة وحدة</li>
                <li>لا تشغل فلتر صغير على حوض كبير</li>
                <li>لا تطفي الفلتر حتى لفترة قصيرة — يموت البكتيريا</li>
              </ul>
            </div>
          </div>
          <div className="g-action-box">
            <div className="g-action-label">كيف تختار الفلتر المناسب:</div>
            <ol className="g-numbered">
              <li>حوض حتى 60 لتر: فلتر داخلي أو سبونج فلتر مع هواء</li>
              <li>60–150 لتر: Hang-on-Back (HOB) أو داخلي قوي</li>
              <li>أكثر من 150 لتر: Canister Filter أو Sump</li>
              <li>الفلتر لازم يصفي حجم الحوض 4–8 مرات بالساعة</li>
            </ol>
          </div>
        </section>

        {/* ── الهيتر ── */}
        <section className="g-section">
          <div className="g-cause-header">
            <span className="g-cause-num-big">02</span>
            <h2 className="g-title g-title-inline">الهيتر والثيرمومتر</h2>
          </div>
          <div className="g-tool-priority g-priority-must">لازم — للسمچ الاستوائي</div>
          <div className="g-cause-block">
            <h3 className="g-cause-sub">ليش مهم؟</h3>
            <p>
              معظم السمچ الشائعة (بلاطي، غبي، أنجلفيش، بيتا) جاية من بيئات استوائية
              تتراوح درجة حرارتها بين 24 و28 درجة مئوية. تذبذب الحرارة — حتى لو بقيت
              ضمن النطاق — يضعف المناعة ويزيد قابلية الإصابة بالأمراض.
            </p>
          </div>
          <div className="g-two-col">
            <div className="g-col-box g-safe-box">
              <div className="g-col-label">كيف تختار الهيتر:</div>
              <ul className="g-simple-list">
                <li>1 واط لكل لتر — القاعدة العامة</li>
                <li>حوض 60 لتر: 60–100 واط</li>
                <li>حوض 100 لتر: 100–150 واط</li>
                <li>اختر نوع submersible — أكثر دقة</li>
              </ul>
            </div>
            <div className="g-col-box g-warn-box">
              <div className="g-col-label">الثيرمومتر — ضروري دايماً:</div>
              <ul className="g-simple-list">
                <li>لا تعتمد على ضبط الهيتر وحده</li>
                <li>الثيرمومتر الرقمي أدق من الزجاجي</li>
                <li>افحص الحرارة يومياً في الأسبوع الأول</li>
                <li>ضبط خاطئ بفارق 3 درجات يسبب مشاكل</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── مزيل الكلور ── */}
        <section className="g-section">
          <div className="g-cause-header">
            <span className="g-cause-num-big">03</span>
            <h2 className="g-title g-title-inline">مزيل الكلور (Dechlorinator)</h2>
          </div>
          <div className="g-tool-priority g-priority-must">لازم — قبل كل تغيير مي</div>
          <div className="g-cause-block">
            <h3 className="g-cause-sub">ليش ضروري؟</h3>
            <p>
              مي الصنبور فيها كلور وكلورامين — مضافة للقضاء على البكتيريا لسلامة
              الشرب. هذه المواد تقتل بكتيريا الفلتر النافعة وتضر خياشيم السمچ.
              مزيل الكلور يحول هذه المواد فوراً — نقطة واحدة تكفي لكل 10 لتر.
            </p>
          </div>
          <div className="g-info-note">
            استخدم مزيل الكلور قبل أو أثناء إضافة المي الجديدة للحوض — مو بعدها. المنتجات الشائعة: Seachem Prime، Tetra AquaSafe. Prime أقوى لأنه يتعامل مع الكلورامين أيضاً.
          </div>
        </section>

        {/* ── كيت الفحص ── */}
        <section className="g-section">
          <div className="g-cause-header">
            <span className="g-cause-num-big">04</span>
            <h2 className="g-title g-title-inline">كيت فحص المي</h2>
          </div>
          <div className="g-tool-priority g-priority-must">لازم — ما في بديل</div>
          <div className="g-cause-block">
            <h3 className="g-cause-sub">ليش ضروري؟</h3>
            <p>
              الأمونيا والنيتريت — أخطر ما يمكن أن يكون بالحوض — بلا لون وبلا رائحة.
              بدون كيت فحص، لا تعرف إذا الحوض بخير أو إذا السمچ في خطر.
              الشرائط (test strips) أسرع لكن أقل دقة — الكيت السائل (API Master) هو
              المعيار الموصى به.
            </p>
          </div>
          <div className="g-two-col">
            <div className="g-col-box g-safe-box">
              <div className="g-col-label">الأرقام الصحيحة:</div>
              <ul className="g-simple-list">
                <li>أمونيا (NH3): 0 ppm</li>
                <li>نيتريت (NO2): 0 ppm</li>
                <li>نترات (NO3): أقل من 20 ppm</li>
                <li>pH: 6.8–7.4 للأنواع الشائعة</li>
              </ul>
            </div>
            <div className="g-col-box g-warn-box">
              <div className="g-col-label">متى تفحص:</div>
              <ul className="g-simple-list">
                <li>يومياً — أول شهر من التأسيس</li>
                <li>أسبوعياً — بعد استقرار الحوض</li>
                <li>فوراً — عند أي سلوك غريب</li>
                <li>بعد إضافة سمچ جديد</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── شبكة وسيفون ── */}
        <section className="g-section">
          <div className="g-cause-header">
            <span className="g-cause-num-big">05</span>
            <h2 className="g-title g-title-inline">شبكة وسيفون</h2>
          </div>
          <div className="g-tool-priority g-priority-good">مهم — وتحتاجه بانتظام</div>
          <div className="g-cause-block">
            <h3 className="g-cause-sub">ليش تحتاجهم؟</h3>
            <p>
              السيفون (Gravel Vacuum) يسحب الفضلات من بين الحصى بدون إزالة الحصى.
              هذا يمنع تراكم المواد العضوية اللي تحولها البكتيريا اللاهوائية إلى
              كبريتيد الهيدروجين — السام والكريه الريحة.
              الشبكة ضرورية للنقل أو العزل — ليس للملاحقة.
            </p>
          </div>
          <div className="g-action-box">
            <div className="g-action-label">كيف تستخدم السيفون:</div>
            <ol className="g-numbered">
              <li>استخدمه أثناء تغيير المي الأسبوعي</li>
              <li>نظف ثلث القاع كل مرة — مو كله</li>
              <li>لا تحرك الحصى بقوة — فقط مرره عليه</li>
              <li>ما تحتاج تسيفون كل أسبوع إذا الحوض متوازن</li>
            </ol>
          </div>
        </section>

        {/* ── الإضاءة ── */}
        <section className="g-section">
          <div className="g-cause-header">
            <span className="g-cause-num-big">06</span>
            <h2 className="g-title g-title-inline">الإضاءة المناسبة</h2>
          </div>
          <div className="g-tool-priority g-priority-good">مهم — حسب نوع الحوض</div>
          <div className="g-cause-block">
            <h3 className="g-cause-sub">مو كل ضوء مناسب:</h3>
            <p>
              الحوض العادي يحتاج 8–10 ساعات إضاءة يومياً. الحوض النباتي يحتاج 10–12 ساعة.
              الإضاءة القوية جداً بدون نباتات كافية تسبب انفجار الطحالب.
              الإضاءة الضعيفة أو غير المنتظمة تربك السمچ.
            </p>
          </div>
          <div className="g-two-col">
            <div className="g-col-box g-safe-box">
              <div className="g-col-label">التوصية العملية:</div>
              <ul className="g-simple-list">
                <li>استخدم تايمر — الانتظام أهم من الشدة</li>
                <li>8 ساعات للحوض بدون نباتات</li>
                <li>10–12 ساعة للحوض النباتي</li>
                <li>LED أفضل — أقل حرارة وأطول عمر</li>
              </ul>
            </div>
            <div className="g-col-box g-warn-box">
              <div className="g-col-label">شنو تتجنب:</div>
              <ul className="g-simple-list">
                <li>لا تضع الحوض قرب نافذة — شمس مباشرة</li>
                <li>لا تشغل أكثر من 12 ساعة — يشجع الطحالب</li>
                <li>لا تطفي وتشغل الضوء بشكل متقطع</li>
                <li>لا تستخدم ضوء بيضاء ساطع جداً للسمچ الخجولة</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── الأكل ── */}
        <section className="g-section">
          <div className="g-cause-header">
            <span className="g-cause-num-big">07</span>
            <h2 className="g-title g-title-inline">الأكل المناسب</h2>
          </div>
          <div className="g-tool-priority g-priority-must">لازم — الأكل الخاطئ يضر</div>
          <div className="g-cause-block">
            <h3 className="g-cause-sub">كلشي يأكل نفس الأكل؟ لا.</h3>
            <p>
              السمچ تنقسم إلى آكل نباتات (Herbivore)، آكل لحوم (Carnivore)، وآكل
              كل شيء (Omnivore). الأكل الخاطئ — حتى لو أكلته السمچة — يسبب نقص
              تغذوي على المدى البعيد. الزيادة في الأكل أخطر من النقص — تلوث المي
              سريعاً وترتفع الأمونيا.
            </p>
          </div>
          <div className="g-action-box">
            <div className="g-action-label">قواعد التغذية الأساسية:</div>
            <ol className="g-numbered">
              <li>مرتين يومياً — كمية صغيرة تخلص خلال دقيقتين</li>
              <li>الأكل المتبقي بعد 5 دقائق — أزله فوراً</li>
              <li>تجويعة يوم أسبوعياً — يساعد الجهاز الهضمي</li>
              <li>نوّع بين حبوب وفريز دراي وأكل حي حسب النوع</li>
            </ol>
          </div>
          <div className="g-dont-inline">
            <div className="g-dont-label">أخطاء شائعة بالتغذية:</div>
            <div className="g-dont-items">
              <span className="g-dont-chip">الإفراط في الكمية</span>
              <span className="g-dont-chip">أكل واحد طول العمر</span>
              <span className="g-dont-chip">إطعام السمچ أكل الصنبور</span>
            </div>
          </div>
        </section>

        {/* ── الميديا ── */}
        <section className="g-section">
          <div className="g-cause-header">
            <span className="g-cause-num-big">08</span>
            <h2 className="g-title g-title-inline">ميديا الفلترة البيولوجية</h2>
          </div>
          <div className="g-tool-priority g-priority-good">مهم — قلبها موجود بالفلتر</div>
          <div className="g-cause-block">
            <h3 className="g-cause-sub">شنو هي الميديا؟</h3>
            <p>
              الميديا البيولوجية هي المواد الإسفنجية أو الخزفية أو البلاستيكية داخل
              الفلتر. مساحة السطح الكبيرة الخاصة بها هي ما تسمح للبكتيريا النافعة
              بالنمو والتكاثر.
            </p>
            <p style={{ marginTop: "10px" }}>
              البيوفيلم (طبقة البكتيريا) ينمو على هذه الأسطح — لا تنظفها بالصنبور.
              نظّفها فقط بمي الحوض نفسها في وعاء منفصل.
            </p>
          </div>
          <div className="g-info-note">
            أنواع الميديا: إسفنج (يمكن تنظيفه)، حبيبات خزف (Ceramic Rings — طويلة الأمد)، Bioball (للفلاتر الكبيرة). الكمية والجودة أهم من النوع.
          </div>
        </section>

        {/* ── شنو تشتري أولاً ── */}
        <section className="g-section">
          <h2 className="g-title">شنو تشتري أولاً؟ — ترتيب المبتدئ</h2>
          <p className="g-section-intro">
            إذا بدأت من الصفر، هذا هو الترتيب الأمثل لشراء المعدات:
          </p>
          <div className="g-mistakes">
            <div className="g-mistake g-check-item">
              <div className="g-mistake-title g-check-title">المرحلة الأولى — أساس الحوض</div>
              <div className="g-mistake-why">حوض مناسب (60 لتر فأكثر) + فلتر + هيتر + ثيرمومتر + مزيل كلور + كيت فحص المي.</div>
            </div>
            <div className="g-mistake g-check-item">
              <div className="g-mistake-title g-check-title">المرحلة الثانية — قبل السمچ</div>
              <div className="g-mistake-why">تأسيس الدورة البيولوجية أولاً (2–6 أسابيع). أضف بكتيريا من المحل أو انتظر حتى تصفر الأمونيا والنيتريت.</div>
            </div>
            <div className="g-mistake g-check-item">
              <div className="g-mistake-title g-check-title">المرحلة الثالثة — بعد الاستقرار</div>
              <div className="g-mistake-why">ديكور + إضاءة مناسبة + سيفون + شبكة. هذه تزيد راحة السمچ وتسهّل الصيانة.</div>
            </div>
            <div className="g-mistake">
              <div className="g-mistake-title">أجّل هذه لاحقاً:</div>
              <div className="g-mistake-why">CO2 system، UV sterilizer، chiller، Dosing pump — هذه للحوض المتقدم. لا تشتريها في البداية.</div>
            </div>
          </div>
        </section>

        {/* ── Checklist ── */}
        <section className="g-section">
          <h2 className="g-title">Checklist المبتدئ — قبل إضافة أول سمچة</h2>
          <div className="g-send-grid">
            <div className="g-send-card g-send-visual">
              <div className="g-send-card-title">المعدات موجودة؟</div>
              <ul className="g-send-list-inner">
                <li>فلتر يشتغل</li>
                <li>هيتر مضبوط على 26°</li>
                <li>ثيرمومتر يبين الصح</li>
                <li>مزيل كلور عندك</li>
                <li>كيت فحص مي عندك</li>
              </ul>
            </div>
            <div className="g-send-card g-send-info">
              <div className="g-send-card-title">الأرقام صح؟</div>
              <ul className="g-send-list-inner">
                <li>أمونيا: 0 ppm</li>
                <li>نيتريت: 0 ppm</li>
                <li>نترات: أقل من 20 ppm</li>
                <li>الحرارة: 24–28°</li>
                <li>الفلتر شتغل أسبوعين على الأقل</li>
              </ul>
            </div>
            <div className="g-send-card g-send-behavior">
              <div className="g-send-card-title">الحوض جاهز؟</div>
              <ul className="g-send-list-inner">
                <li>أكو مخابئ أو ديكور</li>
                <li>الإضاءة مضبوطة 8–10 ساعات</li>
                <li>عندك أكل مناسب للنوع</li>
                <li>عندك شبكة للطوارئ</li>
                <li>ما تزيد على سمچة كل 10 لتر</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="g-cta">
          <h2>إذا تحتاج مساعدة أدق</h2>
          <p>أرسل صورة الحوض ونوع الأدوات اللي عندك وحجم الحوض لـ AQUAVO.</p>
          <p>نراجع الوضع بهدوء ونعطيك الخطوة الأنسب.</p>
        </section>

      </main>

      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{background:#010611}
        .g-wrap{min-height:100vh;background:#010611;color:#e8edf5;direction:rtl;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;line-height:1.7}
        .g-bar{position:sticky;top:0;z-index:50;height:60px;background:rgba(1,6,17,.96);border-bottom:1px solid rgba(25,155,184,.3);display:flex;align-items:center;justify-content:space-between;padding:0 20px;backdrop-filter:blur(10px)}
        .g-brand{color:#199BB8;font-weight:800;letter-spacing:4px;font-size:17px;text-decoration:none}
        .g-bar-actions{display:flex;gap:10px;align-items:center}
        .g-btn-off{background:rgba(25,155,184,.1);color:rgba(25,155,184,.45);padding:8px 16px;border-radius:999px;font-size:14px;font-weight:600;cursor:not-allowed;border:1px solid rgba(25,155,184,.15);white-space:nowrap}
        .g-main{max-width:760px;margin:0 auto;padding:0 16px 60px}
        .g-hero{padding:48px 0 36px;border-bottom:1px solid rgba(25,155,184,.15);margin-bottom:44px}
        .g-badge{display:inline-block;background:rgba(25,155,184,.12);color:#199BB8;border:1px solid rgba(25,155,184,.3);border-radius:999px;padding:4px 14px;font-size:12px;font-weight:700;letter-spacing:.5px;margin-bottom:14px}
        .g-hero h1{font-size:clamp(26px,5vw,40px);font-weight:800;color:#fff;line-height:1.25;margin-bottom:10px}
        .g-sub{font-size:17px;color:#9ab5c8;margin-bottom:12px;font-weight:500}
        .g-intro{font-size:15px;color:#7a9ab0;max-width:620px;margin-bottom:18px;line-height:1.75}
        .g-meta-row{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}
        .g-meta-row span{font-size:12px;color:#6a8fa8;background:rgba(255,255,255,.04);padding:4px 10px;border-radius:6px}
        .g-pdf-tag{font-size:12px;padding:4px 10px;border-radius:6px;font-weight:600}
        .g-draft{background:rgba(255,215,0,.08);color:rgba(255,215,0,.6)}
        .g-ready{background:rgba(25,155,184,.12);color:#199BB8}
        .g-disclaimer{font-size:12px;color:rgba(255,255,255,.28);border-right:2px solid rgba(255,255,255,.08);padding-right:10px;line-height:1.6}
        .g-section{margin-bottom:52px}
        .g-title{font-size:19px;font-weight:700;color:#199BB8;margin-bottom:18px;padding-bottom:9px;border-bottom:1px solid rgba(25,155,184,.2)}
        .g-title.g-title-inline{border-bottom:none;padding-bottom:0;margin-bottom:0;font-size:18px}
        .g-section-intro{font-size:14px;color:#8aa8bc;margin-bottom:18px;line-height:1.75}
        .g-cause-header{display:flex;align-items:baseline;gap:14px;margin-bottom:12px;border-bottom:1px solid rgba(25,155,184,.2);padding-bottom:10px}
        .g-cause-num-big{font-size:32px;font-weight:900;color:rgba(25,155,184,.3);line-height:1;flex-shrink:0}
        .g-tool-priority{display:inline-block;border-radius:6px;padding:4px 12px;font-size:12px;font-weight:700;letter-spacing:.4px;margin-bottom:14px}
        .g-priority-must{background:rgba(255,80,60,.08);color:rgba(255,100,80,.8);border:1px solid rgba(255,80,60,.2)}
        .g-priority-good{background:rgba(255,215,0,.07);color:rgba(255,200,60,.8);border:1px solid rgba(255,200,60,.2)}
        .g-cause-block{background:rgba(10,22,40,.5);border:1px solid rgba(25,155,184,.1);border-radius:12px;padding:18px 20px;margin-bottom:16px}
        .g-cause-sub{font-size:13px;font-weight:700;color:#199BB8;letter-spacing:.5px;margin-bottom:8px}
        .g-cause-block p{font-size:14px;color:#9ab5c8;line-height:1.8}
        .g-two-col{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px}
        .g-col-box{border-radius:12px;padding:16px}
        .g-safe-box{background:rgba(25,155,184,.06);border:1px solid rgba(25,155,184,.2)}
        .g-warn-box{background:rgba(255,100,60,.05);border:1px solid rgba(255,100,60,.2)}
        .g-col-label{font-size:11px;font-weight:700;letter-spacing:.5px;margin-bottom:10px}
        .g-safe-box .g-col-label{color:#199BB8}
        .g-warn-box .g-col-label{color:#ff6c47}
        .g-simple-list{list-style:none;display:flex;flex-direction:column;gap:7px}
        .g-simple-list li{font-size:13px;color:#b0c8d8;padding-right:14px;position:relative;line-height:1.5}
        .g-safe-box .g-simple-list li::before{content:"—";position:absolute;right:0;color:rgba(25,155,184,.6)}
        .g-warn-box .g-simple-list li::before{content:"—";position:absolute;right:0;color:rgba(255,108,71,.6)}
        .g-action-box{background:rgba(10,22,40,.6);border:1px solid rgba(25,155,184,.18);border-radius:12px;padding:16px 20px;margin-bottom:12px}
        .g-action-label{font-size:11px;font-weight:700;color:#199BB8;letter-spacing:.5px;margin-bottom:10px}
        .g-numbered{list-style:none;display:flex;flex-direction:column;gap:8px;counter-reset:steps}
        .g-numbered li{counter-increment:steps;display:flex;gap:12px;align-items:flex-start;font-size:13px;color:#b0c8d8;line-height:1.55}
        .g-numbered li::before{content:counter(steps);color:#199BB8;font-weight:700;font-size:12px;min-width:18px;text-align:center;background:rgba(25,155,184,.12);border-radius:4px;padding:1px 5px;flex-shrink:0}
        .g-dont-inline{margin-top:4px}
        .g-dont-label{font-size:11px;font-weight:700;color:rgba(255,108,71,.7);letter-spacing:.5px;margin-bottom:8px}
        .g-dont-items{display:flex;flex-wrap:wrap;gap:8px}
        .g-dont-chip{background:rgba(255,100,60,.05);color:rgba(255,140,120,.8);border:1px solid rgba(255,100,60,.15);border-radius:20px;padding:5px 12px;font-size:12px}
        .g-info-note{background:rgba(25,155,184,.06);border-right:3px solid rgba(25,155,184,.5);border-radius:0 10px 10px 0;padding:12px 16px;font-size:13px;color:#8acad8;line-height:1.6;margin-bottom:14px}
        .g-important-note{background:rgba(255,215,0,.05);border-right:3px solid rgba(255,215,0,.4);border-radius:0 10px 10px 0;padding:12px 16px;font-size:13px;color:#c8b060;line-height:1.6;margin-top:14px}
        .g-mistakes{display:flex;flex-direction:column;gap:10px}
        .g-mistake{background:rgba(10,22,40,.5);border:1px solid rgba(255,100,60,.1);border-radius:12px;padding:16px 18px}
        .g-check-item{border-color:rgba(25,155,184,.15)!important}
        .g-mistake-title{font-size:14px;font-weight:700;color:rgba(255,160,140,.8);margin-bottom:6px}
        .g-mistake-title::before{content:"✕  ";color:rgba(255,100,60,.5)}
        .g-check-title{color:rgba(25,155,184,.9)!important}
        .g-check-title::before{content:"✓  "!important;color:rgba(25,155,184,.6)!important}
        .g-mistake-why{font-size:13px;color:#8aa0b0;line-height:1.6}
        .g-send-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px}
        .g-send-card{border-radius:12px;padding:16px}
        .g-send-visual{background:rgba(25,155,184,.06);border:1px solid rgba(25,155,184,.2)}
        .g-send-info{background:rgba(255,215,0,.04);border:1px solid rgba(255,215,0,.15)}
        .g-send-behavior{background:rgba(120,160,200,.05);border:1px solid rgba(120,160,200,.15)}
        .g-send-card-title{font-size:12px;font-weight:700;color:#199BB8;letter-spacing:.5px;margin-bottom:10px}
        .g-send-info .g-send-card-title{color:rgba(255,215,0,.7)}
        .g-send-behavior .g-send-card-title{color:#8aaac8}
        .g-send-list-inner{list-style:none;display:flex;flex-direction:column;gap:7px}
        .g-send-list-inner li{font-size:12px;color:#8aa8bc;line-height:1.5;padding-right:12px;position:relative}
        .g-send-list-inner li::before{content:"—";position:absolute;right:0;color:rgba(25,155,184,.35)}
        .g-cta{background:linear-gradient(135deg,rgba(25,155,184,.08),rgba(10,22,40,.8));border:1px solid rgba(25,155,184,.25);border-radius:16px;padding:36px 28px;text-align:center}
        .g-cta h2{font-size:22px;font-weight:800;color:#fff;margin-bottom:10px}
        .g-cta p{font-size:15px;color:#9ab5c8;margin-bottom:6px}
        @media(max-width:640px){
          .g-bar{padding:0 12px}
          .g-brand{font-size:14px;letter-spacing:2px}
          .g-hero{padding:32px 0 24px}
          .g-hero h1{font-size:clamp(22px,6.5vw,32px)}
          .g-two-col{grid-template-columns:1fr}
          .g-send-grid{grid-template-columns:1fr}
          .g-cause-header{gap:10px}
          .g-cause-num-big{font-size:24px}
          .g-cta{padding:24px 16px}
        }
      `}</style>
    </div>
  );
}
