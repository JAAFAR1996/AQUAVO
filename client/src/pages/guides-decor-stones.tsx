import { Link } from "wouter";
import { MetaTags, FAQSchema, BreadcrumbSchema } from "@/components/seo/meta-tags";

const BASE_URL = "https://www.aquavoiq.com";

const FAQ_ITEMS = [
  {
    question: "شنو الأحجار الآمنة لحوض السمك؟",
    answer:
      "الأحجار الآمنة هي الأحجار الخاملة التي لا تغير كيمياء الماء: حجر البازلت، الكوارتز، الصخر الرملي الداكن، الأردواز (Slate)، والأحجار النهرية المصقولة. تجنب الأحجار الكلسية مثل الرخام والحجر الجيري التي ترفع pH والصلابة.",
  },
  {
    question: "هل الحجر يغير pH الماء؟",
    answer:
      "نعم، الأحجار الكلسية (رخام، حجر جيري، مرجان) ترفع pH وتزيد صلابة الماء. الأحجار الجرانيتية والبازلتية والصخور النهرية المصقولة خاملة ولا تؤثر على pH.",
  },
  {
    question: "كيف أعرف إذا الحجر كلسي؟",
    answer:
      "اختبار بسيط: ضع قطرة خل أبيض على الحجر. إذا فقع أو صدر فوران — الحجر كلسي وغير مناسب لأحواض المياه العذبة المحايدة. بدون فوران = غالباً آمن.",
  },
  {
    question: "هل لازم أغسل الحجر قبل الاستخدام؟",
    answer:
      "نعم دائماً. اغسل كل ديكور (أحجار، خشب، رمل، زجاج) بماء نظيف دافئ بدون صابون. الصابون والمنظفات يقتلون البكتيريا النافعة ويسممون الماء. بعض الأحجار تحتاج نقعاً يوم أو يومين لإزالة الغبار.",
  },
  {
    question: "هل خشب الحوض يغير لون الماء؟",
    answer:
      "نعم، خشب الحوض الطبيعي (مثل الـ Driftwood) يفرز تانينات تحول الماء للون الشاي الأصفر أو البني الخفيف. هذا طبيعي وغير ضار — بل يفيد بعض الأسماك الاستوائية. لإزالة الصبغة: نقع الخشب في ماء ساخن أسبوعاً قبل وضعه في الحوض.",
  },
  {
    question: "شنو الفرق بين الديكور الطبيعي والصناعي؟",
    answer:
      "الديكور الطبيعي (أحجار، خشب، رمل) يعطي مظهراً واقعياً لكن يحتاج تحضيراً وقد يؤثر على كيمياء الماء. الديكور الصناعي (راتنج، بلاستيك، خزف) أسهل في التنظيف وآمن للماء إذا كان مصنوع لأحواض السمك، لكن يبدو أقل واقعية.",
  },
  {
    question: "شنو المسافة الآمنة بين الديكور وفوهة الفلتر؟",
    answer:
      "اترك على الأقل 5-10 سم بين الديكور وفوهة الفلتر حتى لا تقلل تدفق الماء. الفلتر المحجوب جزئياً يقل كفاءته وترتفع الأمونيا في الحوض.",
  },
  {
    question: "كيف أنظف الأحجار والديكور؟",
    answer:
      "للتنظيف الدوري: افركها بفرشاة قديمة تحت ماء الحوض (لا ماء الصنبور) للحفاظ على البكتيريا النافعة. للتنظيف العميق: ماء ساخن فقط بدون صابون، ثم اتركها تجف قبل العودة للحوض.",
  },
];

const DECOR_TYPES = [
  {
    type: "أحجار بازلتية وجرانيتية",
    safe: true,
    phEffect: "لا",
    notes: "خاملة تماماً، لا تغير كيمياء الماء، مظهر طبيعي رائع",
  },
  {
    type: "صخر رملي (Sandstone) داكن",
    safe: true,
    phEffect: "لا",
    notes: "آمن في الغالب — تحقق بالخل. الألوان الفاتحة قد تكون كلسية",
  },
  {
    type: "أردواز (Slate)",
    safe: true,
    phEffect: "لا",
    notes: "من أفضل الخيارات — يمكن تكسيره وترتيبه بأشكال جميلة",
  },
  {
    type: "الرخام والحجر الجيري",
    safe: false,
    phEffect: "يرفع pH",
    notes: "كلسي — يرفع pH والصلابة. غير مناسب لأسماك المياه العذبة المحايدة",
  },
  {
    type: "المرجان والشعاب",
    safe: false,
    phEffect: "يرفع pH بقوة",
    notes: "مناسب فقط لأحواض البحرية. يرفع pH لأكثر من 8.2",
  },
  {
    type: "خشب الحوض الطبيعي",
    safe: true,
    phEffect: "يخفض pH قليلاً",
    notes: "يفرز تانينات تلون الماء بالأصفر — آمن وطبيعي للأسماك الاستوائية",
  },
  {
    type: "ديكور راتنج/خزف",
    safe: true,
    phEffect: "لا",
    notes: "آمن إذا كان مصنوع خصيصاً للأحواض — تحقق من علامة aquarium safe",
  },
  {
    type: "رمل حوض (Silica Sand)",
    safe: true,
    phEffect: "لا",
    notes: "الأفضل لأسماك القاع مثل الكوري. لا تستخدم رمل البناء",
  },
];

export default function GuideDecorStonesGuide() {
  return (
    <>
      <MetaTags
        title="ديكور وأحجار حوض السمك — الآمن وغير الآمن"
        description="دليل كامل لديكور وأحجار أحواض الزينة: شنو الأحجار الآمنة؟ هل الحجر يغير pH؟ كيف تغسل الديكور؟ فرق الطبيعي والصناعي. AQUAVO متجر عراقي يوصل لكل العراق."
        keywords={[
          "ديكور حوض السمك",
          "أحجار آمنة لحوض السمك",
          "خشب حوض السمك",
          "مستلزمات أحواض الزينة العراق",
          "حصى حوض سمك",
          "ديكور أحواض الزينة",
        ]}
        url={`${BASE_URL}/guides/aquarium-decor-stones-guide`}
        canonicalUrl={`${BASE_URL}/guides/aquarium-decor-stones-guide`}
        type="article"
      />

      <BreadcrumbSchema
        items={[
          { name: "الرئيسية", url: BASE_URL },
          { name: "الأدلة", url: `${BASE_URL}/guides` },
          { name: "ديكور وأحجار حوض السمك", url: `${BASE_URL}/guides/aquarium-decor-stones-guide` },
        ]}
      />

      <FAQSchema questions={FAQ_ITEMS} />

      <div className="dc-wrap" dir="rtl">
        <header className="dc-bar">
          <Link href="/" className="dc-brand">AQUAVO</Link>
          <nav className="dc-nav">
            <a href="/guides/new-aquarium-setup-iraq" className="dc-nav-link">تجهيز الحوض</a>
            <a href="/guides/aquarium-water-test-guide" className="dc-nav-link">فحص الماء</a>
            <Link href="/guides/heater-choice" className="dc-nav-link">السخانات</Link>
          </nav>
        </header>

        <main className="dc-main" id="main-content">

          <nav className="dc-breadcrumb" aria-label="مسار التنقل">
            <Link href="/">الرئيسية</Link>
            <span> / </span>
            <a href="/guides">الأدلة</a>
            <span> / </span>
            <span>ديكور وأحجار الحوض</span>
          </nav>

          {/* Hero */}
          <section className="dc-hero" id="hero-headline">
            <span className="dc-badge">دليل الديكور — AQUAVO</span>
            <h1 className="dc-h1">ديكور وأحجار حوض السمك — شنو آمن وشنو يغير الماء</h1>

            {/* AEO Answer Block */}
            <div className="dc-answer-block" id="quick-answer">
              <p className="dc-answer-text">
                الأحجار الآمنة لحوض السمك هي الأحجار الخاملة التي لا تغير كيمياء الماء: البازلت، الكوارتز، الأردواز، والأحجار النهرية المصقولة. تجنب الرخام والحجر الجيري لأنهما يرفعان pH. اغسل كل ديكور بماء نظيف بدون صابون قبل وضعه في الحوض. خشب الحوض آمن لكن قد يلون الماء بالأصفر من التانينات — وهذا طبيعي. AQUAVO يوفر ديكور أحواض الزينة مع توصيل لكل العراق ودفع عند الاستلام.
              </p>
            </div>

            <div className="dc-meta">
              <span>وقت القراءة: 6 دقائق</span>
              <span>•</span>
              <span>آخر تحديث: 2026</span>
            </div>
          </section>

          {/* AQUAVO Identity */}
          <div className="dc-store-note">
            <strong>AQUAVO</strong> متجر عراقي متخصص في مستلزمات أحواض الزينة. حصى، ديكور، خشب حوض، رمل، وإكسسوارات — كلها متوفرة مع توصيل لكل محافظات العراق. الدفع عند الاستلام.
            <Link href="/products" className="dc-store-link"> تصفح المنتجات ←</Link>
          </div>

          {/* Vinegar Test */}
          <section className="dc-section">
            <h2 className="dc-title">اختبار الخل — اعرف إذا الحجر آمن في ثانية</h2>
            <p className="dc-body">
              قبل ما تضع أي حجر في الحوض، اعمل هذا الاختبار البسيط:
            </p>
            <div className="dc-test-steps">
              <div className="dc-test-step">
                <span className="dc-step-num">١</span>
                <span>خذ قطرة خل أبيض (حامض الخليك)</span>
              </div>
              <div className="dc-test-step">
                <span className="dc-step-num">٢</span>
                <span>ضعها مباشرة على سطح الحجر</span>
              </div>
              <div className="dc-test-step">
                <span className="dc-step-num">٣</span>
                <span>انتظر 30 ثانية</span>
              </div>
            </div>
            <div className="dc-results">
              <div className="dc-result-safe">
                <span className="dc-result-icon">✓</span>
                <div>
                  <strong>لا فوران / لا فقاعات</strong>
                  <p>الحجر خامل — آمن للحوض</p>
                </div>
              </div>
              <div className="dc-result-danger">
                <span className="dc-result-icon">✗</span>
                <div>
                  <strong>فوران أو فقاعات ظاهرة</strong>
                  <p>الحجر كلسي — يرفع pH — لا تستخدمه</p>
                </div>
              </div>
            </div>
          </section>

          {/* Types Table */}
          <section className="dc-section" id="decor-types">
            <h2 className="dc-title">أنواع الديكور — الآمن وغير الآمن</h2>
            <div className="dc-table-wrap">
              <table className="dc-table">
                <thead>
                  <tr>
                    <th>النوع</th>
                    <th>آمن؟</th>
                    <th>يغير pH؟</th>
                    <th>ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {DECOR_TYPES.map((d, i) => (
                    <tr key={i}>
                      <td><strong>{d.type}</strong></td>
                      <td className={d.safe ? "dc-safe" : "dc-unsafe"}>{d.safe ? "✓ آمن" : "✗ غير آمن"}</td>
                      <td>{d.phEffect}</td>
                      <td>{d.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Driftwood */}
          <section className="dc-section">
            <h2 className="dc-title">خشب الحوض — الجمال مع التحضير</h2>
            <p className="dc-body">
              خشب الحوض الطبيعي (Driftwood) يعطي مظهراً طبيعياً رائعاً ويوفر مخابئ للسمك. لكنه يحتاج تحضيراً قبل الاستخدام:
            </p>
            <div className="dc-wood-steps">
              {[
                { step: "انقع الخشب", detail: "في ماء ساخن لمدة 3-7 أيام، غيّر الماء يومياً حتى يقل الصبغ" },
                { step: "اغسله بالفرشاة", detail: "ازل الغبار والملوثات بفرشاة صلبة تحت الماء الجاري" },
                { step: "اغليه اختيارياً", detail: "الغليان لمدة ساعة يعقمه ويسرع إزالة التانينات" },
                { step: "ضعه في الحوض", detail: "قد يظل الماء أصفر خفيف — طبيعي، يزول بتغيير الماء تدريجياً" },
              ].map((s, i) => (
                <div key={i} className="dc-wood-step">
                  <div className="dc-wood-num">{i + 1}</div>
                  <div>
                    <strong>{s.step}</strong>
                    <p>{s.detail}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="dc-tip">
              اللون الأصفر للماء من التانينات طبيعي ومفيد لبعض الأسماك الاستوائية مثل التتراس والديسكس. لو ما تريده، استخدم كربون مُشط في الفلتر.
            </div>
          </section>

          {/* Natural vs Artificial */}
          <section className="dc-section">
            <h2 className="dc-title">الديكور الطبيعي مقابل الصناعي</h2>
            <div className="dc-compare">
              <div className="dc-compare-col dc-natural">
                <div className="dc-compare-title">طبيعي (حجر، خشب، رمل)</div>
                <ul className="dc-compare-list">
                  <li>مظهر واقعي وجمالي</li>
                  <li>يوفر بيئة طبيعية للسمك</li>
                  <li>يحتاج تحضير وغسل مسبق</li>
                  <li>قد يؤثر على كيمياء الماء</li>
                  <li>ثقيل — احسب وزن الحوض</li>
                </ul>
              </div>
              <div className="dc-compare-col dc-artificial">
                <div className="dc-compare-title">صناعي (راتنج، بلاستيك)</div>
                <ul className="dc-compare-list">
                  <li>آمن 100% إذا مصنوع للأحواض</li>
                  <li>سهل التنظيف</li>
                  <li>لا يؤثر على كيمياء الماء</li>
                  <li>أخف وزناً</li>
                  <li>مظهر أقل واقعية</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Placement Tips */}
          <section className="dc-section">
            <h2 className="dc-title">نصائح ترتيب الديكور</h2>
            <div className="dc-tips-grid">
              {[
                { icon: "⚙️", tip: "اترك 5-10 سم حول فوهة الفلتر حتى لا تعيق تدفق الماء" },
                { icon: "🔱", tip: "ضع الديكور الثقيل أولاً قبل إضافة الماء" },
                { icon: "🏠", tip: "أنشئ مخابئ ومناطق خصوصية للسمك — يقلل الإجهاد" },
                { icon: "📐", tip: "اترك منطقة مفتوحة في المقدمة للسمك يسبح فيها" },
                { icon: "🌡️", tip: "لا تضع الديكور الكثيف حول السخان — يحتاج تدفق ماء" },
                { icon: "💡", tip: "الديكور الفاتح يعكس الضوء — يجعل الحوض يبدو أكبر" },
              ].map((t, i) => (
                <div key={i} className="dc-tip-card">
                  <span className="dc-tip-icon">{t.icon}</span>
                  <span className="dc-tip-text">{t.tip}</span>
                </div>
              ))}
            </div>
          </section>

          {/* AQUAVO Products */}
          <section className="dc-section dc-aquavo-cta">
            <h2 className="dc-title">ديكور الأحواض المتوفر في AQUAVO</h2>
            <p className="dc-body">
              AQUAVO متجر عراقي متخصص في مستلزمات أحواض الزينة — يوفر حصى ألوان، رمل طبيعي، وخيارات ديكور مناسبة للأحواض العراقية.
            </p>
            <div className="dc-prod-list">
              <div className="dc-prod-item">
                <span className="dc-prod-icon">⚪</span>
                <div>
                  <strong>حصى ألوان للأحواض</strong>
                  <p>حصى مغسول ومعالج جاهز للاستخدام بدون غسل إضافي</p>
                </div>
              </div>
              <div className="dc-prod-item">
                <span className="dc-prod-icon">🟤</span>
                <div>
                  <strong>رمل حوض طبيعي</strong>
                  <p>مناسب لأسماك القاع والنباتات المائية</p>
                </div>
              </div>
              <div className="dc-prod-item">
                <span className="dc-prod-icon">🏺</span>
                <div>
                  <strong>ديكور خزف وراتنج</strong>
                  <p>مغارات، صخور زخرفية، وشخصيات — آمنة 100% للأحواض</p>
                </div>
              </div>
            </div>
            <Link href="/products" className="dc-cta-btn" id="decor-cta">
              تصفح ديكور الأحواض
            </Link>
            <p className="dc-cta-note">توصيل لكل العراق — دفع عند الاستلام</p>
          </section>

          {/* FAQ */}
          <section className="dc-section" id="faq">
            <h2 className="dc-title">أسئلة شائعة — ديكور وأحجار الحوض</h2>
            <div className="dc-faq-list">
              {FAQ_ITEMS.map((item, i) => (
                <details key={i} className="dc-faq-item">
                  <summary className="dc-faq-q">{item.question}</summary>
                  <p className="dc-faq-a">{item.answer}</p>
                </details>
              ))}
            </div>
          </section>

          {/* Related Guides */}
          <section className="dc-section">
            <h2 className="dc-title">أدلة ذات صلة</h2>
            <div className="dc-related-grid">
              <a href="/guides/new-aquarium-setup-iraq" className="dc-related-card">
                <span className="dc-related-icon">🐠</span>
                <div>
                  <div className="dc-related-title">دليل تجهيز حوض سمك جديد</div>
                  <div className="dc-related-desc">كل خطوات البداية الصحيحة</div>
                </div>
              </a>
              <a href="/guides/aquarium-water-test-guide" className="dc-related-card">
                <span className="dc-related-icon">🧪</span>
                <div>
                  <div className="dc-related-title">فحص ماء الحوض</div>
                  <div className="dc-related-desc">تفسير القراءات والتصرف الصحيح</div>
                </div>
              </a>
              <Link href="/guides/heater-choice" className="dc-related-card">
                <span className="dc-related-icon">🌡️</span>
                <div>
                  <div className="dc-related-title">دليل اختيار السخان</div>
                  <div className="dc-related-desc">الواط المناسب لكل حجم حوض</div>
                </div>
              </Link>
              <Link href="/guides/filter-choice" className="dc-related-card">
                <span className="dc-related-icon">⚙️</span>
                <div>
                  <div className="dc-related-title">اختيار الفلتر</div>
                  <div className="dc-related-desc">أنواع الفلاتر ومتى تختار كل نوع</div>
                </div>
              </Link>
            </div>
          </section>

        </main>

        <style>{`
          .dc-wrap { min-height:100vh; background:#0a1628; color:#e2e8f0; font-family:'Cairo','Segoe UI',system-ui,sans-serif; direction:rtl; }
          .dc-bar { position:sticky; top:0; z-index:50; height:64px; background:rgba(10,22,40,0.96); backdrop-filter:blur(10px); border-bottom:1px solid rgba(25,155,184,0.2); display:flex; align-items:center; justify-content:space-between; padding:0 1.5rem; }
          .dc-brand { color:#199bb8; font-weight:800; letter-spacing:3px; font-size:1.1rem; text-decoration:none; }
          .dc-nav { display:flex; gap:1rem; }
          .dc-nav-link { color:#94a3b8; font-size:0.82rem; text-decoration:none; transition:color 0.2s; }
          .dc-nav-link:hover { color:#199bb8; }
          .dc-main { width:100%; max-width:760px; margin:0 auto; padding:2rem 1.25rem 6rem; display:flex; flex-direction:column; gap:3rem; }
          .dc-breadcrumb { font-size:0.78rem; color:#64748b; display:flex; gap:0.4rem; flex-wrap:wrap; }
          .dc-breadcrumb a { color:#94a3b8; text-decoration:none; }
          .dc-breadcrumb a:hover { color:#199bb8; }
          .dc-hero { text-align:center; }
          .dc-badge { display:inline-block; border:1px solid rgba(25,155,184,0.35); color:#199bb8; font-size:0.7rem; font-weight:700; letter-spacing:1.5px; padding:4px 14px; border-radius:999px; margin-bottom:1.25rem; }
          .dc-h1 { font-size:clamp(1.5rem,5vw,2.4rem); font-weight:900; color:#f0f9ff; margin:0 0 1.25rem; line-height:1.2; }
          .dc-answer-block { background:rgba(25,155,184,0.07); border:1px solid rgba(25,155,184,0.2); border-radius:12px; padding:1.25rem 1.5rem; text-align:right; margin-bottom:1rem; }
          .dc-answer-text { font-size:0.97rem; color:#cbd5e1; line-height:1.8; margin:0; }
          .dc-meta { font-size:0.78rem; color:#475569; display:flex; gap:0.75rem; justify-content:center; }
          .dc-store-note { background:rgba(255,215,0,0.05); border:1px solid rgba(255,215,0,0.15); border-radius:10px; padding:1rem 1.25rem; font-size:0.88rem; color:#94a3b8; line-height:1.7; }
          .dc-store-note strong { color:#ffd700; }
          .dc-store-link { color:#199bb8; text-decoration:none; font-weight:600; }
          .dc-section { display:flex; flex-direction:column; gap:1rem; }
          .dc-title { font-size:1.2rem; font-weight:800; color:#e2e8f0; margin:0 0 0.5rem; border-right:3px solid #199bb8; padding-right:0.75rem; }
          .dc-body { font-size:0.92rem; color:#94a3b8; line-height:1.8; margin:0; }
          .dc-test-steps { display:flex; flex-direction:column; gap:0.5rem; margin-bottom:1rem; }
          .dc-test-step { display:flex; gap:0.85rem; align-items:center; font-size:0.9rem; color:#94a3b8; }
          .dc-step-num { min-width:28px; height:28px; border-radius:50%; background:rgba(25,155,184,0.12); color:#199bb8; display:flex; align-items:center; justify-content:center; font-size:0.8rem; font-weight:700; flex-shrink:0; }
          .dc-results { display:grid; grid-template-columns:1fr 1fr; gap:0.85rem; }
          @media(max-width:500px){.dc-results{grid-template-columns:1fr;}}
          .dc-result-safe { background:rgba(34,197,94,0.05); border:1px solid rgba(34,197,94,0.2); border-radius:10px; padding:1rem; display:flex; gap:0.85rem; align-items:flex-start; }
          .dc-result-danger { background:rgba(239,68,68,0.05); border:1px solid rgba(239,68,68,0.2); border-radius:10px; padding:1rem; display:flex; gap:0.85rem; align-items:flex-start; }
          .dc-result-icon { font-size:1.4rem; flex-shrink:0; }
          .dc-result-safe strong { color:#86efac; display:block; margin-bottom:0.2rem; font-size:0.9rem; }
          .dc-result-danger strong { color:#fca5a5; display:block; margin-bottom:0.2rem; font-size:0.9rem; }
          .dc-result-safe p,.dc-result-danger p { font-size:0.82rem; color:#94a3b8; margin:0; }
          .dc-table-wrap { overflow-x:auto; }
          .dc-table { width:100%; border-collapse:collapse; font-size:0.84rem; min-width:580px; }
          .dc-table th { background:rgba(25,155,184,0.12); color:#cbd5e1; padding:0.75rem 0.9rem; text-align:right; font-weight:700; border-bottom:1px solid rgba(25,155,184,0.2); }
          .dc-table td { color:#94a3b8; padding:0.65rem 0.9rem; border-bottom:1px solid rgba(255,255,255,0.04); vertical-align:top; }
          .dc-table tr:last-child td { border-bottom:none; }
          .dc-safe { color:#86efac; font-weight:700; }
          .dc-unsafe { color:#fca5a5; font-weight:700; }
          .dc-wood-steps { display:flex; flex-direction:column; gap:0.75rem; }
          .dc-wood-step { display:flex; gap:0.9rem; align-items:flex-start; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:10px; padding:0.9rem 1rem; }
          .dc-wood-num { min-width:28px; height:28px; border-radius:50%; background:rgba(180,120,60,0.15); color:#d4a257; display:flex; align-items:center; justify-content:center; font-size:0.8rem; font-weight:700; flex-shrink:0; }
          .dc-wood-step strong { display:block; color:#e2e8f0; font-size:0.9rem; margin-bottom:0.2rem; }
          .dc-wood-step p { font-size:0.83rem; color:#64748b; margin:0; line-height:1.5; }
          .dc-tip { background:rgba(25,155,184,0.07); border:1px solid rgba(25,155,184,0.2); border-radius:8px; padding:0.85rem 1rem; font-size:0.85rem; color:#7dd3fc; }
          .dc-compare { display:grid; grid-template-columns:1fr 1fr; gap:1rem; }
          @media(max-width:500px){.dc-compare{grid-template-columns:1fr;}}
          .dc-compare-col { border-radius:12px; padding:1.25rem; }
          .dc-natural { background:rgba(25,155,184,0.04); border:1px solid rgba(25,155,184,0.15); }
          .dc-artificial { background:rgba(148,163,184,0.04); border:1px solid rgba(148,163,184,0.12); }
          .dc-compare-title { font-size:0.88rem; font-weight:700; color:#e2e8f0; margin-bottom:0.75rem; }
          .dc-compare-list { list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:0.4rem; }
          .dc-compare-list li { font-size:0.83rem; color:#94a3b8; padding-right:1rem; position:relative; }
          .dc-compare-list li::before { content:'•'; position:absolute; right:0; color:#199bb8; }
          .dc-tips-grid { display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; }
          @media(max-width:500px){.dc-tips-grid{grid-template-columns:1fr;}}
          .dc-tip-card { background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:0.85rem 1rem; display:flex; gap:0.75rem; align-items:flex-start; }
          .dc-tip-icon { font-size:1.2rem; flex-shrink:0; }
          .dc-tip-text { font-size:0.83rem; color:#94a3b8; line-height:1.5; }
          .dc-aquavo-cta { background:rgba(25,155,184,0.04); border:1px solid rgba(25,155,184,0.15); border-radius:14px; padding:1.5rem; }
          .dc-prod-list { display:flex; flex-direction:column; gap:0.75rem; margin-bottom:1.5rem; }
          .dc-prod-item { display:flex; gap:0.85rem; align-items:flex-start; }
          .dc-prod-icon { font-size:1.3rem; flex-shrink:0; margin-top:2px; }
          .dc-prod-item strong { display:block; color:#e2e8f0; font-size:0.9rem; margin-bottom:0.15rem; }
          .dc-prod-item p { font-size:0.82rem; color:#64748b; margin:0; }
          .dc-cta-btn { display:inline-block; background:linear-gradient(135deg,#199bb8,#0e7490); color:#fff; font-weight:700; font-size:0.95rem; padding:0.85rem 2rem; border-radius:10px; text-decoration:none; transition:opacity 0.2s; }
          .dc-cta-btn:hover{opacity:0.88;}
          .dc-cta-note { font-size:0.8rem; color:#64748b; margin-top:0.5rem; }
          .dc-faq-list { display:flex; flex-direction:column; gap:0.75rem; }
          .dc-faq-item { background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.07); border-radius:10px; overflow:hidden; }
          .dc-faq-q { padding:1rem 1.1rem; font-size:0.92rem; font-weight:700; color:#e2e8f0; cursor:pointer; list-style:none; }
          .dc-faq-q::-webkit-details-marker{display:none;}
          .dc-faq-a { padding:0 1.1rem 1rem; font-size:0.87rem; color:#94a3b8; line-height:1.75; margin:0; }
          .dc-related-grid { display:grid; grid-template-columns:1fr 1fr; gap:0.85rem; }
          @media(max-width:560px){.dc-related-grid{grid-template-columns:1fr;}}
          .dc-related-card { background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.07); border-radius:12px; padding:1rem; text-decoration:none; display:flex; gap:0.85rem; align-items:flex-start; transition:border-color 0.2s; }
          .dc-related-card:hover{border-color:rgba(25,155,184,0.4);}
          .dc-related-icon { font-size:1.5rem; flex-shrink:0; }
          .dc-related-title { font-size:0.9rem; font-weight:700; color:#e2e8f0; margin-bottom:0.2rem; }
          .dc-related-desc { font-size:0.8rem; color:#64748b; }
        `}</style>
      </div>
    </>
  );
}
