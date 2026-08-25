import { Link } from "wouter";
import { MetaTags, FAQSchema, BreadcrumbSchema } from "@/components/seo/meta-tags";

const BASE_URL = "https://www.aquavoiq.com";

const FAQ_ITEMS = [
  {
    question: "شنو تفحص شرائط ماء الحوض؟",
    answer:
      "شرائط ماء الحوض تقيس: الأمونيا (NH3)، النتريت (NO2)، النترات (NO3)، درجة الحموضة (pH)، وأحياناً الكلور والصلابة. هذي هي المؤشرات الأساسية لصحة ماء الحوض.",
  },
  {
    question: "شنو معنى الأمونيا ولتى تكون خطيرة؟",
    answer:
      "الأمونيا ناتجة من فضلات السمك وبقايا الطعام. حتى 0.25 ppm تسبب إجهاداً للسمك. فوق 1 ppm خطر حقيقي. القراءة الآمنة هي صفر ppm في حوض ناضج.",
  },
  {
    question: "شنو الفرق بين النتريت والنترات؟",
    answer:
      "النتريت (NO2) أخطر بكثير من النترات (NO3). النتريت يمنع الدم من حمل الأوكسجين ويقتل السمك بسرعة. النترات أقل خطراً ويُخفَّض بتغيير الماء بانتظام.",
  },
  {
    question: "شنو pH الصحيح لحوض السمك؟",
    answer:
      "معظم أسماك المياه العذبة تحتاج pH بين 6.8-7.5. الأسماك الاستوائية مثل الغوبي والتتراس تفضل 7.0-7.2. تغيير مفاجئ في pH بأكثر من 0.5 يسبب صدمة للسمك.",
  },
  {
    question: "شنو أسوي إذا الأمونيا ارتفعت؟",
    answer:
      "فوراً: غيّر 25-30% من الماء. أوقف الأكل يوم أو يومين. افحص الفلتر وتأكد من شغله. أضف مزيل أمونيا طارئ مؤقت. افحص الماء مرة ثانية بعد 24 ساعة.",
  },
  {
    question: "هل الشرائط مناسبة للمبتدئين أو أحتاج مقياس؟",
    answer:
      "الشرائط مناسبة جداً للمبتدئين وكافية للاستخدام اليومي. المقاييس الرقمية أدق للـ pH والتوصيلية، لكن الشرائط تعطي نتائج كافية لمعرفة إذا الوضع خطير أو آمن.",
  },
  {
    question: "كم مرة أفحص ماء الحوض؟",
    answer:
      "في الأشهر الأولى: أسبوعياً على الأقل. بعد استقرار الحوض: كل أسبوعين. عند إضافة سمك جديد أو ملاحظة تصرف غريب: مباشرة. افحص دائماً بعد تغيير الماء بيوم.",
  },
  {
    question: "شنو الكلور في ماء الحوض ومتى يظهر؟",
    answer:
      "الكلور يظهر عند تغيير الماء بدون استخدام مزيل كلور. ماء الإسالة في العراق يحتوي كلور وكلورامين — لازم تضيف مزيل الكلور في كل تغيير جزئي للماء.",
  },
];

const WATER_PARAMS = [
  {
    name: "الأمونيا (NH3/NH4)",
    meaning: "فضلات السمك والطعام الزايد",
    danger: "أكثر من 0.5 ppm",
    action: "غيّر 25% من الماء فوراً + أوقف الأكل يومين",
    safe: "0 ppm",
  },
  {
    name: "النتريت (NO2)",
    meaning: "مرحلة وسطى في الدورة البايولوجية",
    danger: "أكثر من 0.2 ppm",
    action: "غيّر 30% من الماء + أضف ملح جدول طبيعي (يساعد مؤقتاً)",
    safe: "0 ppm",
  },
  {
    name: "النترات (NO3)",
    meaning: "نهاية الدورة البايولوجية — أقل خطراً",
    danger: "أكثر من 40 ppm",
    action: "تغيير منتظم 20-25% أسبوعياً",
    safe: "أقل من 20 ppm",
  },
  {
    name: "درجة الحموضة (pH)",
    meaning: "حموضة وقلوية الماء",
    danger: "أقل من 6.5 أو أكثر من 8.0",
    action: "استخدم منظمات pH أو افحص مصدر الماء",
    safe: "6.8 – 7.5",
  },
  {
    name: "الكلور",
    meaning: "مادة تعقيم موجودة في ماء الإسالة",
    danger: "أي تركيز — حتى الطفيف يقتل البكتيريا",
    action: "أضف مزيل كلور فوراً عند كل تغيير ماء",
    safe: "0 ppm",
  },
];

export default function GuideWaterTestGuide() {
  return (
    <>
      <MetaTags
        title="شرائط فحص ماء الحوض — دليل كامل لقراءة النتائج"
        description="شرح كامل لشرائط فحص ماء الحوض: الأمونيا، النتريت، النترات، pH، والكلور. شنو معنى كل قراءة؟ متى تكون خطيرة؟ وشنو تسوي؟ دليل AQUAVO العراق."
        keywords={[
          "شرائط فحص ماء الحوض",
          "فحص ماء حوض السمك",
          "اختبار ماء الحوض",
          "الأمونيا في الحوض",
          "pH حوض السمك",
          "مستلزمات أحواض الزينة العراق",
        ]}
        url={`${BASE_URL}/guides/aquarium-water-test-guide`}
        canonicalUrl={`${BASE_URL}/guides/aquarium-water-test-guide`}
        type="article"
      />

      <BreadcrumbSchema
        items={[
          { name: "الرئيسية", url: BASE_URL },
          { name: "الأدلة", url: `${BASE_URL}/guides` },
          { name: "دليل فحص ماء الحوض", url: `${BASE_URL}/guides/aquarium-water-test-guide` },
        ]}
      />

      <FAQSchema questions={FAQ_ITEMS} />

      <div className="wt-wrap" dir="rtl">
        <header className="wt-bar">
          <Link href="/" className="wt-brand">AQUAVO</Link>
          <nav className="wt-nav">
            <a href="/guides/new-aquarium-setup-iraq" className="wt-nav-link">تجهيز الحوض</a>
            <Link href="/guides/heater-choice" className="wt-nav-link">السخانات</Link>
            <a href="/guides/aquarium-decor-stones-guide" className="wt-nav-link">الديكور</a>
          </nav>
        </header>

        <main className="wt-main" id="main-content">

          <nav className="wt-breadcrumb" aria-label="مسار التنقل">
            <Link href="/">الرئيسية</Link>
            <span> / </span>
            <a href="/guides">الأدلة</a>
            <span> / </span>
            <span>فحص ماء الحوض</span>
          </nav>

          {/* Hero */}
          <section className="wt-hero" id="hero-headline">
            <span className="wt-badge">دليل جودة الماء — AQUAVO</span>
            <h1 className="wt-h1">شرائط فحص ماء الحوض — كيف تقرأ النتائج وشنو تسوي</h1>

            {/* AEO Answer Block */}
            <div className="wt-answer-block" id="quick-answer">
              <p className="wt-answer-text">
                شرائط فحص ماء الحوض تقيس الأمونيا والنتريت والنترات وpH والكلور. القراءة الآمنة: الأمونيا والنتريت = صفر، النترات أقل من 40 ppm، pH بين 6.8-7.5. إذا ارتفعت قيم الأمونيا أو النتريت — غيّر 25-30% من الماء فوراً وأوقف الأكل يومين. AQUAVO متجر عراقي يوفر شرائط الفحص مع توصيل لكل العراق ودفع عند الاستلام أو إلكترونياً.
              </p>
            </div>

            <div className="wt-meta">
              <span>وقت القراءة: 6 دقائق</span>
              <span>•</span>
              <span>آخر تحديث: 2026</span>
            </div>
          </section>

          {/* AQUAVO Identity */}
          <div className="wt-store-note">
            <strong>AQUAVO</strong> متجر عراقي متخصص في مستلزمات أحواض الزينة. شرائط فحص الماء، مزيل الكلور، الفلاتر، السخانات — كلها متوفرة مع توصيل لكل محافظات العراق. الدفع عند الاستلام أو إلكترونياً.
            <Link href="/products" className="wt-store-link"> تصفح المنتجات ←</Link>
          </div>

          {/* Why Test */}
          <section className="wt-section">
            <h2 className="wt-title">ليش فحص الماء ضروري؟</h2>
            <p className="wt-body">
              مشاكل الماء هي السبب الأول لموت السمك — وغالباً الماء يبدو نظيف وصافي حتى لما تكون مستوياته خطيرة. الفحص الدوري يخليك تكشف المشكلة قبل ما تتفاقم.
            </p>
            <ul className="wt-list">
              <li>الأمونيا ما لها لون أو رائحة تحس فيها</li>
              <li>النتريت ما يظهر بصرياً</li>
              <li>انخفاض pH يحصل تدريجياً بدون تغيير واضح</li>
              <li>السمك اللي يحتك بالزجاج أو يسبح بشكل غريب — غالباً جودة الماء هي السبب</li>
            </ul>
          </section>

          {/* Main Table */}
          <section className="wt-section" id="water-params-table">
            <h2 className="wt-title">جدول مؤشرات ماء الحوض — القراءات والتصرف</h2>
            <div className="wt-table-wrap">
              <table className="wt-table">
                <thead>
                  <tr>
                    <th>المؤشر</th>
                    <th>شنو يعني</th>
                    <th>القراءة الآمنة</th>
                    <th>متى يصير خطر</th>
                    <th>شنو التصرف الأول</th>
                  </tr>
                </thead>
                <tbody>
                  {WATER_PARAMS.map((p, i) => (
                    <tr key={i}>
                      <td><strong>{p.name}</strong></td>
                      <td>{p.meaning}</td>
                      <td className="wt-safe">{p.safe}</td>
                      <td className="wt-danger">{p.danger}</td>
                      <td>{p.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Ammonia Deep Dive */}
          <section className="wt-section">
            <h2 className="wt-title">الأمونيا — أخطر مؤشر في الحوض</h2>
            <p className="wt-body">
              الأمونيا تنتج من: فضلات السمك، بقايا الطعام، نباتات ميتة، وأي مادة عضوية تتحلل في الماء. البكتيريا النافعة في الفلتر تحولها إلى نتريت ثم نترات — وهذا هو معنى الدورة البايولوجية.
            </p>
            <div className="wt-scale">
              {[
                { range: "0 ppm", label: "آمن تماماً", cls: "wt-scale-safe" },
                { range: "0.25 ppm", label: "إجهاد خفيف — راقب", cls: "wt-scale-warn" },
                { range: "0.5 ppm", label: "خطر — غيّر الماء", cls: "wt-scale-danger" },
                { range: "1+ ppm", label: "خطر حاد — تصرف الحين", cls: "wt-scale-critical" },
              ].map((s, i) => (
                <div key={i} className={`wt-scale-row ${s.cls}`}>
                  <span className="wt-scale-range">{s.range}</span>
                  <span className="wt-scale-label">{s.label}</span>
                </div>
              ))}
            </div>
          </section>

          {/* How to Use Strips */}
          <section className="wt-section">
            <h2 className="wt-title">كيف تستخدم شرائط الفحص بشكل صحيح</h2>
            <ol className="wt-steps">
              <li>غمس الشريط في ماء الحوض لمدة ثانية واحدة فقط</li>
              <li>ارفعه وهزه مرة واحدة لإزالة الماء الزايد</li>
              <li>انتظر 60 ثانية بالضبط قبل مقارنة الألوان</li>
              <li>قارن الألوان بضوء طبيعي — لا ضوء أصفر</li>
              <li>سجّل النتيجة مع التاريخ وعدد السمكات الحالي</li>
            </ol>
            <div className="wt-tip">
              لا تلمس الأجزاء الملونة من الشريط بأصابعك — الزيوت الطبيعية تؤثر على الدقة.
            </div>
          </section>

          {/* When To Test */}
          <section className="wt-section">
            <h2 className="wt-title">متى تفحص؟</h2>
            <div className="wt-when-grid">
              {[
                { time: "أسبوعياً", reason: "روتين أساسي في الأشهر الأولى" },
                { time: "بعد تغيير الماء بيوم", reason: "تأكيد أن الماء الجديد لا يغيّر التوازن" },
                { time: "عند إضافة سمك جديد", reason: "الحمل البيولوجي يزيد — الأمونيا قد ترتفع" },
                { time: "عند ملاحظة تصرف غريب", reason: "سمك فوق السطح أو سباحة غير طبيعية" },
                { time: "بعد علاج مرض", reason: "بعض الأدوية تقتل البكتيريا النافعة" },
                { time: "عند انقطاع الكهرباء لساعات", reason: "الفلتر يتوقف — الأمونيا قد ترتفع" },
              ].map((w, i) => (
                <div key={i} className="wt-when-card">
                  <div className="wt-when-time">{w.time}</div>
                  <div className="wt-when-reason">{w.reason}</div>
                </div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="wt-cta-section">
            <div className="wt-cta-box">
              <h2 className="wt-cta-title">محتاج شرائط فحص ماء الحوض؟</h2>
              <p className="wt-cta-body">AQUAVO يوفر شرائط الفحص ومزيل الكلور وكل مستلزمات الأحواض — توصيل لكل العراق، دفع عند الاستلام أو إلكترونياً.</p>
              <Link href="/products" className="wt-cta-btn" id="water-test-cta">تصفح المنتجات</Link>
            </div>
          </section>

          {/* FAQ */}
          <section className="wt-section" id="faq">
            <h2 className="wt-title">أسئلة شائعة — فحص ماء الحوض</h2>
            <div className="wt-faq-list">
              {FAQ_ITEMS.map((item, i) => (
                <details key={i} className="wt-faq-item">
                  <summary className="wt-faq-q">{item.question}</summary>
                  <p className="wt-faq-a">{item.answer}</p>
                </details>
              ))}
            </div>
          </section>

          {/* Related Guides */}
          <section className="wt-section">
            <h2 className="wt-title">أدلة ذات صلة</h2>
            <div className="wt-related-grid">
              <a href="/guides/new-aquarium-setup-iraq" className="wt-related-card">
                <span className="wt-related-icon">🐠</span>
                <div>
                  <div className="wt-related-title">دليل تجهيز حوض سمك جديد</div>
                  <div className="wt-related-desc">كل خطوات البداية الصحيحة</div>
                </div>
              </a>
              <Link href="/guides/water-change-schedule" className="wt-related-card">
                <span className="wt-related-icon">💧</span>
                <div>
                  <div className="wt-related-title">جدول تغيير الماء</div>
                  <div className="wt-related-desc">كم مرة وكم نسبة التغيير</div>
                </div>
              </Link>
              <Link href="/guides/algae-control" className="wt-related-card">
                <span className="wt-related-icon">🌿</span>
                <div>
                  <div className="wt-related-title">مكافحة الطحالب</div>
                  <div className="wt-related-desc">الأسباب والحلول</div>
                </div>
              </Link>
              <Link href="/guides/filter-choice" className="wt-related-card">
                <span className="wt-related-icon">⚙️</span>
                <div>
                  <div className="wt-related-title">اختيار الفلتر المناسب</div>
                  <div className="wt-related-desc">أنواع الفلاتر لكل حجم</div>
                </div>
              </Link>
            </div>
          </section>

        </main>

        <style>{`
          .wt-wrap { min-height: 100vh; background: #0B1E28; color: #e2e8f0; font-family: 'Cairo','Segoe UI',system-ui,sans-serif; direction: rtl; }
          .wt-bar { position: sticky; top:0; z-index:50; height:64px; background:rgba(10,22,40,0.96); backdrop-filter:blur(10px); border-bottom:1px solid rgba(11,147,166,0.2); display:flex; align-items:center; justify-content:space-between; padding:0 1.5rem; }
          .wt-brand { color:#0B93A6; font-weight:800; letter-spacing:3px; font-size:1.1rem; text-decoration:none; }
          .wt-nav { display:flex; gap:1rem; }
          .wt-nav-link { color:#94a3b8; font-size:0.82rem; text-decoration:none; transition:color 0.2s; }
          .wt-nav-link:hover { color:#0B93A6; }
          .wt-main { width:100%; max-width:780px; margin:0 auto; padding:2rem 1.25rem 6rem; display:flex; flex-direction:column; gap:3rem; }
          .wt-breadcrumb { font-size:0.78rem; color:#64748b; display:flex; gap:0.4rem; flex-wrap:wrap; }
          .wt-breadcrumb a { color:#94a3b8; text-decoration:none; }
          .wt-breadcrumb a:hover { color:#0B93A6; }
          .wt-hero { text-align:center; }
          .wt-badge { display:inline-block; border:1px solid rgba(11,147,166,0.35); color:#0B93A6; font-size:0.7rem; font-weight:700; letter-spacing:1.5px; padding:4px 14px; border-radius:999px; margin-bottom:1.25rem; }
          .wt-h1 { font-size:clamp(1.5rem,5vw,2.4rem); font-weight:900; color:#f0f9ff; margin:0 0 1.25rem; line-height:1.2; }
          .wt-answer-block { background:rgba(11,147,166,0.07); border:1px solid rgba(11,147,166,0.2); border-radius:12px; padding:1.25rem 1.5rem; text-align:right; margin-bottom:1rem; }
          .wt-answer-text { font-size:0.97rem; color:#cbd5e1; line-height:1.8; margin:0; }
          .wt-meta { font-size:0.78rem; color:#475569; display:flex; gap:0.75rem; justify-content:center; }
          .wt-store-note { background:rgba(201,122,46,0.05); border:1px solid rgba(201,122,46,0.15); border-radius:10px; padding:1rem 1.25rem; font-size:0.88rem; color:#94a3b8; line-height:1.7; }
          .wt-store-note strong { color:var(--aqv-warning); }
          .wt-store-link { color:#0B93A6; text-decoration:none; font-weight:600; }
          .wt-section { display:flex; flex-direction:column; gap:1rem; }
          .wt-title { font-size:1.2rem; font-weight:800; color:#e2e8f0; margin:0 0 0.5rem; border-right:3px solid #0B93A6; padding-right:0.75rem; }
          .wt-body { font-size:0.92rem; color:#94a3b8; line-height:1.8; margin:0; }
          .wt-list { list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:0.5rem; }
          .wt-list li { font-size:0.9rem; color:#94a3b8; padding-right:1.25rem; position:relative; }
          .wt-list li::before { content:'→'; position:absolute; right:0; color:#0B93A6; }
          .wt-table-wrap { overflow-x:auto; }
          .wt-table { width:100%; border-collapse:collapse; font-size:0.84rem; min-width:600px; }
          .wt-table th { background:rgba(11,147,166,0.12); color:#cbd5e1; padding:0.75rem 0.9rem; text-align:right; font-weight:700; border-bottom:1px solid rgba(11,147,166,0.2); white-space:nowrap; }
          .wt-table td { color:#94a3b8; padding:0.65rem 0.9rem; border-bottom:1px solid rgba(255,255,255,0.04); vertical-align:top; }
          .wt-table tr:last-child td { border-bottom:none; }
          .wt-table tr:hover td { background:rgba(255,255,255,0.02); }
          .wt-safe { color:#86efac; font-weight:700; }
          .wt-danger { color:#fca5a5; }
          .wt-scale { display:flex; flex-direction:column; gap:0.5rem; }
          .wt-scale-row { display:flex; align-items:center; gap:1rem; padding:0.7rem 1rem; border-radius:8px; }
          .wt-scale-safe { background:rgba(34,197,94,0.06); border:1px solid rgba(34,197,94,0.2); }
          .wt-scale-warn { background:rgba(234,179,8,0.06); border:1px solid rgba(234,179,8,0.2); }
          .wt-scale-danger { background:rgba(249,115,22,0.06); border:1px solid rgba(249,115,22,0.2); }
          .wt-scale-critical { background:rgba(239,68,68,0.07); border:1px solid rgba(239,68,68,0.25); }
          .wt-scale-range { font-size:0.82rem; font-weight:700; color:#e2e8f0; min-width:70px; }
          .wt-scale-label { font-size:0.85rem; color:#94a3b8; }
          .wt-steps { padding: 0 0 0 1rem; margin:0; display:flex; flex-direction:column; gap:0.6rem; counter-reset:steps; list-style:none; }
          .wt-steps li { font-size:0.9rem; color:#94a3b8; padding-right:2rem; position:relative; counter-increment:steps; }
          .wt-steps li::before { content:counter(steps); position:absolute; right:0; width:22px; height:22px; background:rgba(11,147,166,0.15); color:#0B93A6; border-radius:50%; font-size:0.75rem; font-weight:700; display:flex; align-items:center; justify-content:center; }
          .wt-tip { background:rgba(11,147,166,0.07); border:1px solid rgba(11,147,166,0.2); border-radius:8px; padding:0.85rem 1rem; font-size:0.85rem; color:#7dd3fc; }
          .wt-when-grid { display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; }
          @media(max-width:560px){.wt-when-grid{grid-template-columns:1fr;}}
          .wt-when-card { background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:0.9rem 1rem; }
          .wt-when-time { font-size:0.88rem; font-weight:700; color:#e2e8f0; margin-bottom:0.25rem; }
          .wt-when-reason { font-size:0.82rem; color:#64748b; }
          .wt-cta-section {}
          .wt-cta-box { background:rgba(11,147,166,0.05); border:1px solid rgba(11,147,166,0.18); border-radius:14px; padding:2rem; text-align:center; }
          .wt-cta-title { font-size:1.2rem; font-weight:800; color:#e2e8f0; margin:0 0 0.6rem; }
          .wt-cta-body { font-size:0.9rem; color:#94a3b8; line-height:1.7; margin:0 0 1.5rem; }
          .wt-cta-btn { display:inline-block; background:linear-gradient(135deg,#0B93A6,#0e7490); color:#fff; font-weight:700; font-size:0.95rem; padding:0.85rem 2rem; border-radius:10px; text-decoration:none; transition:opacity 0.2s; }
          .wt-cta-btn:hover{opacity:0.88;}
          .wt-faq-list { display:flex; flex-direction:column; gap:0.75rem; }
          .wt-faq-item { background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.07); border-radius:10px; overflow:hidden; }
          .wt-faq-q { padding:1rem 1.1rem; font-size:0.92rem; font-weight:700; color:#e2e8f0; cursor:pointer; list-style:none; }
          .wt-faq-q::-webkit-details-marker{display:none;}
          .wt-faq-a { padding:0 1.1rem 1rem; font-size:0.87rem; color:#94a3b8; line-height:1.75; margin:0; }
          .wt-related-grid { display:grid; grid-template-columns:1fr 1fr; gap:0.85rem; }
          @media(max-width:560px){.wt-related-grid{grid-template-columns:1fr;}}
          .wt-related-card { background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.07); border-radius:12px; padding:1rem; text-decoration:none; display:flex; gap:0.85rem; align-items:flex-start; transition:border-color 0.2s; }
          .wt-related-card:hover{border-color:rgba(11,147,166,0.4);}
          .wt-related-icon { font-size:1.5rem; flex-shrink:0; }
          .wt-related-title { font-size:0.9rem; font-weight:700; color:#e2e8f0; margin-bottom:0.2rem; }
          .wt-related-desc { font-size:0.8rem; color:#64748b; }
        `}</style>
      </div>
    </>
  );
}
