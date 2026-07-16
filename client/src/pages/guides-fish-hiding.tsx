import { Download, ExternalLink } from "lucide-react";

/*
  Sources — Researched May 2026:
  A: aquariumscience.org — fish stress, hiding behavior, disease symptoms, aggression
  A: aqueon.com — tank setup, acclimation, lighting, water quality, disease prevention
  B: aquariumcoop.com — acclimation methods, dither fish concept, stress ich
  B: fishkeepingworld.com — depression signs, disease guide, behavioral indicators
  B: petmd.com — new tank syndrome, 30-day new fish guide, stress effects in fish
*/

const PDF_URL = "/assets/guides/aquavo-fish-hiding-guide.pdf";

export default function GuideFishHiding() {
  return (
    <div className="g-wrap">

      <header className="g-bar">
        <a href="/" className="g-brand">AQUAVO</a>
        <div className="g-bar-actions">
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
            download="aquavo-fish-hiding-guide.pdf"
            className="flex items-center gap-1.5 bg-[#0B93A6] text-[#0B1E28] hover:bg-[#0B93A6]/85 text-xs sm:text-sm h-9 px-3 sm:px-4 rounded-full font-bold transition-colors"
          >
            <span>تحميل PDF</span>
            <Download className="w-4 h-4" />
          </a>
        </div>
      </header>

      <main className="g-main">

        {/* ── SECTION 1: Hero ── */}
        <section className="g-hero">
          <span className="g-badge">دليل عملي — AQUAVO</span>
          <h1>أسباب اختفاء السمچ</h1>
          <p className="g-sub">مو كل اختفاء يعني مرض… بس أكو علامات لازم تنتبهلها</p>
          <p className="g-intro">
            دليل عملي من AQUAVO يساعدك تعرف متى الاختفاء طبيعي، متى يصير إنذار،
            وشنو ترسل لنا حتى نشخص الحالة بشكل أدق.
          </p>
          <div className="g-meta-row">
            <span>لمن هذا: أصحاب الأحواض اللي لاحظوا سمچة تختفي</span>
            <span>وقت القراءة: 6–8 دقائق</span>
            <span className="g-pdf-tag g-ready">PDF: متوفر للتحميل</span>
          </div>
          <p className="g-disclaimer">
            هذا الدليل للتوعية العامة ولا يغني عن تشخيص الحالة من صورة واضحة للحوض.
          </p>
        </section>

        {/* ── SECTION 2: قبل لا تقلق ── */}
        <section className="g-section">
          <h2 className="g-title">قبل لا تقلق — اقرأ هذا أولاً</h2>
          <p className="g-section-intro">
            بعض السمچ طبيعته يختفي. خصوصاً بعد النقل، أو تغيير ترتيب الحوض، أو إضافة سمچ جديد.
            هذا سلوك بقاء غريزي — مو مرض. المشكلة الحقيقية تبدأ لما الاختفاء يجي ويا علامات ثانية.
          </p>
          <div className="g-diag-grid">
            <div className="g-diag g-safe">
              <div className="g-diag-label">طبيعي غالباً إذا:</div>
              <ul className="g-diag-list">
                <li>السمچة جديدة — وصلت من أقل من 48 ساعة</li>
                <li>تطلع وتاكل وترجع تختفي</li>
                <li>باقي السمچ يتصرف بشكل طبيعي</li>
                <li>الاختفاء صار بعد نقل أو تنظيف أو تغيير ترتيب</li>
                <li>النوع بطبيعته خجول أو ليلي</li>
              </ul>
            </div>
            <div className="g-diag g-warn">
              <div className="g-diag-label">يحتاج متابعة إذا:</div>
              <ul className="g-diag-list">
                <li>ما تطلع للأكل — رفض تام</li>
                <li>تتنفس بسرعة أو تلهث على السطح</li>
                <li>تبقى بالقاع أو خلف الفلتر طول الوقت</li>
                <li>لونها باهت أو تغير فجأة</li>
                <li>زعانفها مضمومة على الجسم</li>
                <li>أكو سمچة ثانية تطاردها</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── SECTION 3: التشخيص السريع ── */}
        <section className="g-section">
          <h2 className="g-title">التشخيص السريع</h2>
          <p className="g-section-intro">شنو تشوف بالضبط؟ ابحث عن الحالة الأقرب لوضعك:</p>
          <div className="g-table-wrap">
            <table className="g-table">
              <thead>
                <tr>
                  <th>الحالة</th>
                  <th>الاحتمال الأقرب</th>
                  <th>شنو تسوي الآن</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>اختفت بعد ما دخلتها للحوض مباشرة</td><td className="g-td-neutral">ضغط نقل — طبيعي</td><td>خفف الإضاءة وراقب الأكل — لا تتدخل</td></tr>
                <tr><td>تختفي بس تطلع وتاكل بانتظام</td><td className="g-td-safe">غالباً طبيعي</td><td>لا تلاحقها بالشبكة — هذا سلوك طبيعي</td></tr>
                <tr><td>تختفي وسمچة ثانية تطاردها</td><td className="g-td-warn">عدوانية / عدم توافق</td><td>راقب 10 دقائق — افصل إذا المطاردة مستمرة</td></tr>
                <tr><td>تختفي وما تاكل أكثر من يومين</td><td className="g-td-warn">إنذار — يحتاج تشخيص</td><td>دز صورة الحوض ونوع السمچة لـ AQUAVO</td></tr>
                <tr><td>تختفي قرب الفلتر أو السطح</td><td className="g-td-warn">ضعف تهوية أو ضغط بيئة</td><td>راقب التنفس وافحص جودة المي</td></tr>
                <tr><td>تختفي بالزوايا وتتحرك ببطء</td><td className="g-td-warn">ضغط بيئة أو مشكلة جودة مي</td><td>افحص الأمونيا والنيتريت — لازم يكونون صفر</td></tr>
                <tr><td>اختفت بعد تغيير المي</td><td className="g-td-neutral">صدمة تغيير — مؤقتة</td><td>تأكد من معالجة الكلور — راقب 24 ساعة</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ── SECTION 4 ── */}
        <section className="g-section">
          <div className="g-cause-header">
            <span className="g-cause-num-big">01</span>
            <h2 className="g-title g-title-inline">ضغط ما بعد النقل</h2>
          </div>
          <div className="g-cause-block">
            <h3 className="g-cause-sub">شنو يعني؟</h3>
            <p>لما تنقل السمچة لحوض جديد، كل شيء عليها مجهول: الإضاءة، الصوت، رائحة المي، حركة الفلتر، ووجود سمچ ثاني. هذا ضغط حقيقي — جسمها يطلق هرمونات التوتر ومناعتها تنخفض. لذلك طبيعي — ومتوقع — أن تختفي أول 24 إلى 48 ساعة. هذا سلوك بقاء غريزي مو مرض.</p>
          </div>
          <div className="g-two-col">
            <div className="g-col-box g-safe-box">
              <div className="g-col-label">علامات ضغط النقل الطبيعي:</div>
              <ul className="g-simple-list">
                <li>تختفي خلف الديكور أو الفلتر</li>
                <li>تطلع شوي وترجع تختفي</li>
                <li>تاكل قليل أو متأخر شوي</li>
                <li>تتحرك بحذر وببطء</li>
                <li>تبقى بجانب واحد من الحوض</li>
              </ul>
            </div>
            <div className="g-col-box g-warn-box">
              <div className="g-col-label">متى تقلق؟</div>
              <ul className="g-simple-list">
                <li>ما تاكل بعد 48 ساعة من الوصول</li>
                <li>تتنفس بسرعة أو تلهث على السطح</li>
                <li>خمول تام — ماكو حركة حتى بوقت الأكل</li>
                <li>بقت مخفية أكثر من يومين متواصلين</li>
              </ul>
            </div>
          </div>
          <div className="g-action-box">
            <div className="g-action-label">شنو تسوي الآن:</div>
            <ol className="g-numbered">
              <li>خفف الإضاءة — أو أطفيها 24 ساعة إذا ما عندك نباتات حية</li>
              <li>لا تغير ترتيب الحوض — خلي البيئة ثابتة وهادية</li>
              <li>لا تدخل يدك كل شوي — كل تدخل يزيد التوتر</li>
              <li>راقب من بعيد — شوف تطلع للأكل أو لا</li>
            </ol>
          </div>
          <div className="g-dont-inline">
            <div className="g-dont-label">شنو لا تسوي:</div>
            <div className="g-dont-items">
              <span className="g-dont-chip">لا تضيف علاج فوراً</span>
              <span className="g-dont-chip">لا تبدل كمية كبيرة من المي</span>
              <span className="g-dont-chip">لا تلاحق السمچة بالشبكة</span>
            </div>
          </div>
        </section>

        {/* ── SECTION 5 ── */}
        <section className="g-section">
          <div className="g-cause-header">
            <span className="g-cause-num-big">02</span>
            <h2 className="g-title g-title-inline">خوف أو مطاردة من سمچة ثانية</h2>
          </div>
          <div className="g-cause-block">
            <h3 className="g-cause-sub">شنو يعني؟</h3>
            <p>بعض السمچ يسيطر على منطقة بالحوض ويطارد أي سمچة تقترب. السمچة الأضعف أو الأصغر تختفي تجنباً للمواجهة. الاختفاء المفاجئ بعد إضافة سمچة جديدة — مؤشر قوي على هذا السبب.</p>
            <p style={{ marginTop: "10px" }}>الحوض الضيق أو الفارغ من الديكور يزيد العدوانية — لأن السمچ الإقليمية تحس إنها تحتاج تدافع عن كل مساحتها.</p>
          </div>
          <div className="g-two-col">
            <div className="g-col-box g-warn-box">
              <div className="g-col-label">علامات المطاردة والعدوانية:</div>
              <ul className="g-simple-list">
                <li>سمچة بعينها تطارد الباقي باستمرار</li>
                <li>المختفية تطلع فقط لما المطاردة توقف</li>
                <li>زعانف متضررة أو ممزقة الحواف</li>
                <li>الاختفاء دايماً بنفس الزاوية أو المكان</li>
                <li>المطاردة تزيد وقت التغذية</li>
              </ul>
            </div>
            <div className="g-col-box g-neutral-box">
              <div className="g-col-label">أنواع تعرف بعدوانيتها:</div>
              <ul className="g-simple-list">
                <li>السيكليدات — إقليمية جداً</li>
                <li>البيتا الذكر — لا يتسامح مع ذكر ثاني</li>
                <li>Tiger Barb — عدواني بالأرقام القليلة</li>
                <li>Rainbow Shark — يدافع عن منطقته</li>
                <li>بعض أنواع اللوتش</li>
              </ul>
            </div>
          </div>
          <div className="g-action-box">
            <div className="g-action-label">شنو تسوي:</div>
            <ol className="g-numbered">
              <li>راقب الحوض 10 دقائق من بعيد — بدون أي تدخل</li>
              <li>حدد منو يطارد منو بالضبط</li>
              <li>إذا المطاردة مستمرة، أضف مخابئ إضافية لتقسيم المناطق</li>
              <li>إذا الزعانف تضررت، افصل السمچة المطاردة مؤقتاً</li>
            </ol>
          </div>
          <div className="g-dont-inline">
            <div className="g-dont-label">شنو لا تسوي:</div>
            <div className="g-dont-items">
              <span className="g-dont-chip">لا تضيف سمچ جديد بنفس الوقت</span>
              <span className="g-dont-chip">لا تفترض مرض بدون مشاهدة السلوك</span>
              <span className="g-dont-chip">لا تنتظر أسبوع إذا الزعانف تتضرر</span>
            </div>
          </div>
        </section>

        {/* ── SECTION 6 ── */}
        <section className="g-section">
          <div className="g-cause-header">
            <span className="g-cause-num-big">03</span>
            <h2 className="g-title g-title-inline">الحوض مكشوف وما بيه أمان</h2>
          </div>
          <div className="g-cause-block">
            <h3 className="g-cause-sub">شنو يعني؟</h3>
            <p>الحوض الفارغ من الديكور يخلي بعض الأنواع تحس إنها مكشوفة — زي ما تكون بالعراء. هذا يسبب توتراً مستمراً حتى بدون وجود خطر حقيقي.</p>
            <p style={{ marginTop: "10px" }}>المفارقة: كلما وفرت مخابئ أكثر — كلما خرجت السمچة وسبحت بثقة أكثر. السمچة تحتاج تحس إن عندها مكان ترجعله لو خافت.</p>
          </div>
          <div className="g-two-col">
            <div className="g-col-box g-warn-box">
              <div className="g-col-label">علامات الحوض المكشوف:</div>
              <ul className="g-simple-list">
                <li>السمچ يبقى خلف الفلتر أو الهيتر دايماً</li>
                <li>يهرب كل مرة تقرب من الحوض</li>
                <li>الحركة تقل وقت الإضاءة القوية</li>
                <li>السمچ يتجمع بالزوايا</li>
                <li>الحوض خالي من الديكور أو النباتات</li>
              </ul>
            </div>
            <div className="g-col-box g-safe-box">
              <div className="g-col-label">الحل العملي:</div>
              <ul className="g-simple-list">
                <li>أضف حجارة أو خشب أو كهوف أو أنابيب</li>
                <li>أضف نباتات — حقيقية أو اصطناعية</li>
                <li>خلي أكو مناطق ظل بالحوض</li>
                <li>لا تخلي كل الحوض مساحة مفتوحة</li>
                <li>رتب الديكور بحيث السمچ يحس بالأمان مو بالازدحام</li>
              </ul>
            </div>
          </div>
          <div className="g-info-note">
            نصيحة AQUAVO: إذا السمچ يختفي هواية، الجواب غالباً مو إزالة الديكور — العكس تماماً. السمچ يحتاج مناطق يحس بيها بالأمان.
          </div>
        </section>

        {/* ── SECTION 7 ── */}
        <section className="g-section">
          <div className="g-cause-header">
            <span className="g-cause-num-big">04</span>
            <h2 className="g-title g-title-inline">الإضاءة القوية أو غير المنتظمة</h2>
          </div>
          <div className="g-cause-block">
            <h3 className="g-cause-sub">شنو يعني؟</h3>
            <p>الإضاءة القوية أو المفاجئة تسبب توتراً لبعض الأنواع. كثير من السمچ الشائعة جاية من بيئات طبيعية مضللة — تحت الأشجار، بالعمق، أو بالمياه الداكنة.</p>
            <p style={{ marginTop: "10px" }}>عدم انتظام دورة الإضاءة — تشغيل وإطفاء متكرر، أو ضوء ليلي قوي — يربك السمچ ويؤثر على نشاطها الطبيعي.</p>
          </div>
          <div className="g-two-col">
            <div className="g-col-box g-warn-box">
              <div className="g-col-label">علامات مشكلة الإضاءة:</div>
              <ul className="g-simple-list">
                <li>تختفي بمجرد تشغيل الإضاءة</li>
                <li>تتحرك أكثر لما الضوء يخف أو ينطفي</li>
                <li>تبقى تحت الديكور طول النهار</li>
                <li>تهرب من الواجهة الأمامية للحوض</li>
              </ul>
            </div>
            <div className="g-col-box g-safe-box">
              <div className="g-col-label">المعدل الصحيح:</div>
              <ul className="g-simple-list">
                <li>8 إلى 10 ساعات يومياً للحوض بدون نباتات</li>
                <li>12 ساعة للحوض النباتي</li>
                <li>لا تشغل ضوء قوي فجأة بعد الظلام</li>
                <li>استخدم تايمر لثبات الدورة</li>
              </ul>
            </div>
          </div>
          <div className="g-action-box">
            <div className="g-action-label">شنو تسوي:</div>
            <ol className="g-numbered">
              <li>قلل مدة الإضاءة لـ 8 ساعات وراقب الفرق خلال أسبوع</li>
              <li>إذا ما عندك تايمر — اشتريه، يساعد على الانتظام</li>
              <li>وفر مناطق ظل بالحوض حتى وقت الإضاءة الكاملة</li>
              <li>لا تطفي وتشغل الضوء بشكل متقطع خلال اليوم</li>
            </ol>
          </div>
        </section>

        {/* ── SECTION 8 ── */}
        <section className="g-section">
          <div className="g-cause-header">
            <span className="g-cause-num-big">05</span>
            <h2 className="g-title g-title-inline">تعب أو مرض محتمل</h2>
          </div>
          <div className="g-cause-block">
            <h3 className="g-cause-sub">اقرأ هذا بهدوء</h3>
            <p>اختفاء السمچة وحده ما يكفي حتى نكول مرض. بس إذا الاختفاء جاء ويا علامات ثانية، هنا لازم ننتبه ونشوف الصورة كاملة قبل أي تصرف.</p>
            <p style={{ marginTop: "10px" }}>أول شيء تفعله: افحص الأمونيا والنيتريت. هذين يسببان نفس أعراض المرض — خمول، لون باهت، لهاث على السطح — والناس تخلط بينهم كثير.</p>
          </div>
          <div className="g-warn-full">
            <div className="g-warn-full-label">علامات تحتاج متابعة:</div>
            <div className="g-warn-signs-grid">
              <div className="g-warn-sign"><div className="g-sign-name">رفض الأكل</div><div className="g-sign-desc">أكثر من 48 ساعة بدون أكل</div></div>
              <div className="g-warn-sign"><div className="g-sign-name">تنفس سريع</div><div className="g-sign-desc">الخياشيم تتحرك بسرعة ملحوظة</div></div>
              <div className="g-warn-sign"><div className="g-sign-name">زعانف مضمومة</div><div className="g-sign-desc">الزعانف ملصوقة على الجسم</div></div>
              <div className="g-warn-sign"><div className="g-sign-name">لون باهت</div><div className="g-sign-desc">فقدان الألوان الطبيعية فجأة</div></div>
              <div className="g-warn-sign"><div className="g-sign-name">نقاط أو بقع</div><div className="g-sign-desc">أي تغيير غير طبيعي على الجسم</div></div>
              <div className="g-warn-sign"><div className="g-sign-name">سباحة غير طبيعية</div><div className="g-sign-desc">دوران، اختلال توازن، أو سباحة بجنب</div></div>
            </div>
          </div>
          <div className="g-action-box">
            <div className="g-action-label">شنو تسوي:</div>
            <ol className="g-numbered">
              <li>افحص المي أولاً — أمونيا ونيتريت لازم = صفر</li>
              <li>صوّر الحوض كامل — إضاءة واضحة من الواجهة</li>
              <li>صوّر السمچة إذا تقدر — من جنب ومن فوق</li>
              <li>راقب باقي السمچ — هل الأعراض انتشرت؟</li>
              <li>لا تضيف علاج بدون تشخيص — الدواء الخاطئ يضر الفلتر البيولوجي</li>
            </ol>
          </div>
          <div className="g-important-note">
            مهم: الأمونيا والنيتريت بلا لون ولا ريحة — المي تبدو صافية وهي سامة. لا تحكم بعينك. الفحص بالكيت هو الطريقة الوحيدة.
          </div>
        </section>

        {/* ── SECTION 9: أخطاء ── */}
        <section className="g-section">
          <h2 className="g-title">أخطاء لا تسويها</h2>
          <p className="g-section-intro">
            لما تشوف سمچة مختفية، الغريزة تقول &ldquo;افعل شيء الآن.&rdquo; بعض هذه التصرفات تزيد الوضع سوءاً.
          </p>
          <div className="g-mistakes">
            <div className="g-mistake">
              <div className="g-mistake-title">لا تلاحق السمچة بالشبكة بدون سبب قوي</div>
              <div className="g-mistake-why">الصيد يسبب ضغط حاد على السمچة — يمكن يضر أكثر من الاختفاء نفسه. لا تلاحق إلا إذا كانت بخطر حقيقي وواضح.</div>
            </div>
            <div className="g-mistake">
              <div className="g-mistake-title">لا تبدل كل المي مرة وحدة</div>
              <div className="g-mistake-why">100% تغيير مي يصدم السمچ بتغيير مفاجئ بالحرارة والـPH. كذلك يمكن يضر البكتيريا النافعة. غيّر 25% فقط في كل مرة.</div>
            </div>
            <div className="g-mistake">
              <div className="g-mistake-title">لا تضيف علاج عشوائي</div>
              <div className="g-mistake-why">بدون تشخيص واضح للسبب، الدواء الخاطئ يقتل البكتيريا النافعة بالفلتر ويزيد المشكلة. الأمونيا والنيتريت يرتفعون بعدها.</div>
            </div>
            <div className="g-mistake">
              <div className="g-mistake-title">لا تغير الفلتر والديكور والمي بنفس اليوم</div>
              <div className="g-mistake-why">تغييرات كثيرة بيوم واحد = صدمة للسمچ والنظام البيولوجي. غيّر شيء واحد، راقب النتيجة، ثم انتقل للتالي.</div>
            </div>
            <div className="g-mistake">
              <div className="g-mistake-title">لا تحكم من الاختفاء وحده</div>
              <div className="g-mistake-why">الاختفاء ظاهرة — مو تشخيص. السبب ممكن يكون ضغط نقل أو عدوانية أو مشكلة بيئة. لازم تفرق بين الأسباب أولاً.</div>
            </div>
            <div className="g-mistake">
              <div className="g-mistake-title">لا تشتري سمچ جديد قبل ما تفهم المشكلة</div>
              <div className="g-mistake-why">إضافة سمچ جديد وقت الأزمة يزيد الضغط على الحوض ويمكن يجيب مرض إضافي — خصوصاً إذا ما عزلت السمچ الجديدة أولاً.</div>
            </div>
          </div>
        </section>

        {/* ── SECTION 10: شنو ترسل ── */}
        <section className="g-section">
          <h2 className="g-title">شنو ترسل لنا حتى نشخص؟</h2>
          <p className="g-section-intro">حتى نعطيك رأي أدق، اجمع هذه المعلومات قبل ما ترسل:</p>
          <div className="g-send-grid">
            <div className="g-send-card g-send-visual">
              <div className="g-send-card-title">الصور والفيديو</div>
              <ul className="g-send-list-inner">
                <li>صورة واضحة للحوض كامل — من الواجهة</li>
                <li>صورة قريبة للسمچة المختبئة إذا تقدر</li>
                <li>فيديو قصير إذا فيه مطاردة أو سلوك غريب</li>
              </ul>
            </div>
            <div className="g-send-card g-send-info">
              <div className="g-send-card-title">معلومات الحوض</div>
              <ul className="g-send-list-inner">
                <li>نوع السمچة وعدد السمچات بالحوض</li>
                <li>حجم الحوض (لتر تقريباً)</li>
                <li>نوع الفلتر المستخدم</li>
                <li>عمر الحوض (من متى تشتغل؟)</li>
              </ul>
            </div>
            <div className="g-send-card g-send-behavior">
              <div className="g-send-card-title">السلوك والتاريخ</div>
              <ul className="g-send-list-inner">
                <li>من متى بدأت تختفي؟</li>
                <li>هل تطلع للأكل أو ترفض تماماً؟</li>
                <li>أكو سمچة ثانية تطاردها؟</li>
                <li>هل غيرت شي بالحوض مؤخراً؟</li>
              </ul>
            </div>
          </div>
          <div className="g-send-footer">كلما الصورة أوضح، التشخيص يصير أدق.</div>
        </section>

        {/* ── CTA ── */}
        <section className="g-cta">
          <h2>إذا تريد تشخيص أدق</h2>
          <p>دز صورة الحوض ونوع السمچة وحجم الحوض.</p>
          <p>AQUAVO يراجع الحالة بهدوء ويعطيك الخطوة الأنسب.</p>
        </section>

      </main>

      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{background:#0B1E28}
        .g-wrap{min-height:100vh;background:#0B1E28;color:#e8edf5;direction:rtl;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;line-height:1.7}
        .g-bar{position:sticky;top:0;z-index:50;height:60px;background:rgba(1,6,17,.96);border-bottom:1px solid rgba(11,147,166,.3);display:flex;align-items:center;justify-content:space-between;padding:0 20px;backdrop-filter:blur(10px)}
        .g-brand{color:#0B93A6;font-weight:800;letter-spacing:4px;font-size:17px;text-decoration:none}
        .g-bar-actions{display:flex;gap:10px;align-items:center}
        .g-main{max-width:760px;margin:0 auto;padding:0 16px 60px}
        .g-hero{padding:48px 0 36px;border-bottom:1px solid rgba(11,147,166,.15);margin-bottom:44px}
        .g-badge{display:inline-block;background:rgba(11,147,166,.12);color:#0B93A6;border:1px solid rgba(11,147,166,.3);border-radius:999px;padding:4px 14px;font-size:12px;font-weight:700;letter-spacing:.5px;margin-bottom:14px}
        .g-hero h1{font-size:clamp(28px,5.5vw,42px);font-weight:800;color:#fff;line-height:1.25;margin-bottom:10px}
        .g-sub{font-size:18px;color:#9ab5c8;margin-bottom:12px;font-weight:500}
        .g-intro{font-size:15px;color:#7a9ab0;max-width:620px;margin-bottom:18px;line-height:1.75}
        .g-meta-row{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}
        .g-meta-row span{font-size:12px;color:#6a8fa8;background:rgba(255,255,255,.04);padding:4px 10px;border-radius:6px}
        .g-pdf-tag{font-size:12px;padding:4px 10px;border-radius:6px;font-weight:600}
        .g-ready{background:rgba(11,147,166,.12);color:#0B93A6}
        .g-disclaimer{font-size:12px;color:rgba(255,255,255,.28);border-right:2px solid rgba(255,255,255,.08);padding-right:10px;line-height:1.6}
        .g-section{margin-bottom:52px}
        .g-title{font-size:19px;font-weight:700;color:#0B93A6;margin-bottom:18px;padding-bottom:9px;border-bottom:1px solid rgba(11,147,166,.2)}
        .g-title.g-title-inline{border-bottom:none;padding-bottom:0;margin-bottom:0;font-size:18px}
        .g-section-intro{font-size:14px;color:#8aa8bc;margin-bottom:18px;line-height:1.75}
        .g-cause-header{display:flex;align-items:baseline;gap:14px;margin-bottom:18px;border-bottom:1px solid rgba(11,147,166,.2);padding-bottom:10px}
        .g-cause-num-big{font-size:32px;font-weight:900;color:rgba(11,147,166,.3);line-height:1;flex-shrink:0}
        .g-cause-block{background:rgba(10,22,40,.5);border:1px solid rgba(11,147,166,.1);border-radius:12px;padding:18px 20px;margin-bottom:16px}
        .g-cause-sub{font-size:13px;font-weight:700;color:#0B93A6;letter-spacing:.5px;margin-bottom:8px}
        .g-cause-block p{font-size:14px;color:#9ab5c8;line-height:1.8}
        .g-two-col{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px}
        .g-col-box{border-radius:12px;padding:16px}
        .g-safe-box{background:rgba(11,147,166,.06);border:1px solid rgba(11,147,166,.2)}
        .g-warn-box{background:rgba(255,100,60,.05);border:1px solid rgba(255,100,60,.2)}
        .g-neutral-box{background:rgba(201,122,46,.04);border:1px solid rgba(201,122,46,.15)}
        .g-col-label{font-size:11px;font-weight:700;letter-spacing:.5px;margin-bottom:10px}
        .g-safe-box .g-col-label{color:#0B93A6}
        .g-warn-box .g-col-label{color:#ff6c47}
        .g-neutral-box .g-col-label{color:rgba(201,122,46,.7)}
        .g-simple-list{list-style:none;display:flex;flex-direction:column;gap:7px}
        .g-simple-list li{font-size:13px;color:#b0c8d8;padding-right:14px;position:relative;line-height:1.5}
        .g-safe-box .g-simple-list li::before{content:"—";position:absolute;right:0;color:rgba(11,147,166,.6)}
        .g-warn-box .g-simple-list li::before{content:"—";position:absolute;right:0;color:rgba(255,108,71,.6)}
        .g-neutral-box .g-simple-list li::before{content:"—";position:absolute;right:0;color:rgba(201,122,46,.4)}
        .g-diag-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
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
        .g-table-wrap{overflow-x:auto;border-radius:12px;border:1px solid rgba(11,147,166,.15)}
        .g-table{width:100%;border-collapse:collapse;font-size:13px;min-width:520px}
        .g-table th{background:rgba(11,147,166,.1);color:#0B93A6;padding:10px 14px;text-align:right;font-weight:700;font-size:12px;letter-spacing:.3px}
        .g-table td{padding:10px 14px;color:#b0c8d8;border-top:1px solid rgba(255,255,255,.05);vertical-align:top;line-height:1.5}
        .g-table tr:nth-child(even) td{background:rgba(255,255,255,.015)}
        .g-table tr:hover td{background:rgba(11,147,166,.04)}
        .g-td-safe{color:rgba(11,147,166,.85)!important;font-weight:600}
        .g-td-warn{color:rgba(255,108,71,.8)!important;font-weight:600}
        .g-td-neutral{color:rgba(201,122,46,.65)!important;font-weight:600}
        .g-action-box{background:rgba(10,22,40,.6);border:1px solid rgba(11,147,166,.18);border-radius:12px;padding:16px 20px;margin-bottom:12px}
        .g-action-label{font-size:11px;font-weight:700;color:#0B93A6;letter-spacing:.5px;margin-bottom:10px}
        .g-numbered{list-style:none;display:flex;flex-direction:column;gap:8px;counter-reset:steps}
        .g-numbered li{counter-increment:steps;display:flex;gap:12px;align-items:flex-start;font-size:13px;color:#b0c8d8;line-height:1.55}
        .g-numbered li::before{content:counter(steps);color:#0B93A6;font-weight:700;font-size:12px;min-width:18px;text-align:center;background:rgba(11,147,166,.12);border-radius:4px;padding:1px 5px;flex-shrink:0}
        .g-dont-inline{margin-top:4px}
        .g-dont-label{font-size:11px;font-weight:700;color:rgba(255,108,71,.7);letter-spacing:.5px;margin-bottom:8px}
        .g-dont-items{display:flex;flex-wrap:wrap;gap:8px}
        .g-dont-chip{background:rgba(255,100,60,.05);color:rgba(255,140,120,.8);border:1px solid rgba(255,100,60,.15);border-radius:20px;padding:5px 12px;font-size:12px}
        .g-info-note{background:rgba(11,147,166,.06);border-right:3px solid rgba(11,147,166,.5);border-radius:0 10px 10px 0;padding:12px 16px;font-size:13px;color:#8acad8;line-height:1.6;margin-top:14px}
        .g-important-note{background:rgba(201,122,46,.05);border-right:3px solid rgba(201,122,46,.4);border-radius:0 10px 10px 0;padding:12px 16px;font-size:13px;color:#C97A2E;line-height:1.6;margin-top:14px}
        .g-warn-full{background:rgba(255,100,60,.04);border:1px solid rgba(255,100,60,.18);border-radius:12px;padding:18px;margin-bottom:14px}
        .g-warn-full-label{font-size:11px;font-weight:700;color:#ff6c47;letter-spacing:.5px;margin-bottom:14px}
        .g-warn-signs-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
        .g-warn-sign{background:rgba(255,100,60,.05);border:1px solid rgba(255,100,60,.12);border-radius:8px;padding:12px}
        .g-sign-name{font-size:13px;font-weight:700;color:rgba(255,160,140,.85);margin-bottom:4px}
        .g-sign-desc{font-size:11px;color:rgba(255,180,160,.5);line-height:1.4}
        .g-mistakes{display:flex;flex-direction:column;gap:10px}
        .g-mistake{background:rgba(10,22,40,.5);border:1px solid rgba(255,100,60,.1);border-radius:12px;padding:16px 18px}
        .g-mistake-title{font-size:14px;font-weight:700;color:rgba(255,160,140,.8);margin-bottom:6px}
        .g-mistake-title::before{content:"✕  ";color:rgba(255,100,60,.5)}
        .g-mistake-why{font-size:13px;color:#8aa0b0;line-height:1.6}
        .g-send-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px}
        .g-send-card{border-radius:12px;padding:16px}
        .g-send-visual{background:rgba(11,147,166,.06);border:1px solid rgba(11,147,166,.2)}
        .g-send-info{background:rgba(201,122,46,.04);border:1px solid rgba(201,122,46,.15)}
        .g-send-behavior{background:rgba(120,160,200,.05);border:1px solid rgba(120,160,200,.15)}
        .g-send-card-title{font-size:12px;font-weight:700;color:#0B93A6;letter-spacing:.5px;margin-bottom:10px}
        .g-send-info .g-send-card-title{color:rgba(201,122,46,.7)}
        .g-send-behavior .g-send-card-title{color:#8aaac8}
        .g-send-list-inner{list-style:none;display:flex;flex-direction:column;gap:7px}
        .g-send-list-inner li{font-size:12px;color:#8aa8bc;line-height:1.5;padding-right:12px;position:relative}
        .g-send-list-inner li::before{content:"—";position:absolute;right:0;color:rgba(11,147,166,.35)}
        .g-send-footer{background:rgba(11,147,166,.08);border:1px solid rgba(11,147,166,.2);border-radius:10px;padding:12px 16px;font-size:14px;color:#0B93A6;font-weight:600;text-align:center}
        .g-cta{background:linear-gradient(135deg,rgba(11,147,166,.08),rgba(10,22,40,.8));border:1px solid rgba(11,147,166,.25);border-radius:16px;padding:36px 28px;text-align:center}
        .g-cta h2{font-size:22px;font-weight:800;color:#fff;margin-bottom:10px}
        .g-cta p{font-size:15px;color:#9ab5c8;margin-bottom:6px}
        @media(max-width:640px){
          .g-bar{padding:0 12px}
          .g-brand{font-size:14px;letter-spacing:2px}
          .g-hero{padding:32px 0 24px}
          .g-hero h1{font-size:clamp(24px,7vw,32px)}
          .g-diag-grid{grid-template-columns:1fr}
          .g-two-col{grid-template-columns:1fr}
          .g-warn-signs-grid{grid-template-columns:1fr 1fr}
          .g-send-grid{grid-template-columns:1fr}
          .g-cause-header{gap:10px}
          .g-cause-num-big{font-size:24px}
          .g-cta{padding:24px 16px}
          .g-table{font-size:12px}
          .g-table td,.g-table th{padding:8px 10px}
        }
        @media(max-width:400px){.g-warn-signs-grid{grid-template-columns:1fr}}
      `}</style>
    </div>
  );
}
