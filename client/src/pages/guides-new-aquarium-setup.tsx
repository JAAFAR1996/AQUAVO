import { Link } from "wouter";
import { MetaTags, FAQSchema, BreadcrumbSchema, HowToSchema } from "@/components/seo/meta-tags";

const BASE_URL = "https://www.aquavoiq.com";

const FAQ_ITEMS = [
  {
    question: "شنو أحتاج حتى أجهز حوض سمك جديد؟",
    answer:
      "تحتاج: حوض بالحجم المناسب، فلتر، سخان (للأسماك الاستوائية)، حصى أو رمل، مزيل كلور، شرائط فحص ماء، وإضاءة. هذي هي المعدات الأساسية لأي حوض مبتدئ.",
  },
  {
    question: "هل أحتاج فلتر للحوض؟",
    answer:
      "نعم، الفلتر ضروري في كل حوض. يزيل الأمونيا والمواد الضارة ويحافظ على توازن الماء. بدون فلتر، الماء يتلوث بسرعة ويموت السمك.",
  },
  {
    question: "هل أحتاج سخان؟",
    answer:
      "يعتمد على نوع السمك. الأسماك الاستوائية (مثل الغوبي، المولي، الأنجيل) تحتاج حرارة ثابتة بين 24-28 درجة. الأسماك الباردة مثل الذهبية ما تحتاج سخان.",
  },
  {
    question: "ليش مزيل الكلور مهم؟",
    answer:
      "ماء الإسالة يحتوي على كلور وكلورامين يقتل السمك والبكتيريا النافعة. مزيل الكلور يحيّد هذه المواد فوراً ويجعل الماء آمناً للسمك.",
  },
  {
    question: "ليش شرائط الفحص مهمة؟",
    answer:
      "شرائط فحص الماء تقيس الأمونيا، النتريت، النترات، وpH. هذي المؤشرات تخليك تعرف إذا الحوض آمن قبل ما تضيف السمك أو بعدها. بدون فحص، ما تعرف إذا كاد خطر.",
  },
  {
    question: "شنو ترتيب تجهيز الحوض؟",
    answer:
      "١) نظف الحوض بماء فقط. ٢) ضع الحصى المغسول. ٣) ركب الفلتر والسخان. ٤) أملأ بالماء وأضف مزيل كلور. ٥) شغل الفلتر. ٦) انتظر 3-7 أيام للدورة البايولوجية. ٧) افحص الماء. ٨) أضف السمك تدريجياً.",
  },
  {
    question: "شنو الأخطاء الشائعة للمبتدئين؟",
    answer:
      "أكثر الأخطاء: إضافة السمك مباشرة بدون انتظار دورة البكتيريا، ما استخدام مزيل كلور، زيادة الأكل، شراء حوض صغير جداً، وعدم فحص الماء بانتظام.",
  },
  {
    question: "كم يوم أنتظر قبل ما أضيف السمك؟",
    answer:
      "الحد الأدنى 3 أيام لو استخدمت بكتيريا جاهزة، و7-14 يوم بدونها. الأحسن تفحص الماء أولاً: لما الأمونيا والنتريت يصيرون صفر، الحوض جاهز.",
  },
];

const HOW_TO_STEPS = [
  {
    name: "نظف الحوض وحدد موقعه",
    text: "انظف الحوض بماء فقط بدون صابون. اختر مكان بعيد عن أشعة الشمس المباشرة والتيارات الهوائية. الحوض الممتلئ ثقيل — تأكد من قاعدة متينة.",
    url: `${BASE_URL}/guides/new-aquarium-setup-iraq#step-1`,
  },
  {
    name: "ضع الحصى وركب المعدات",
    text: "اغسل الحصى جيداً بماء بارد حتى يصفو الماء. ضعه بسماكة 5-7 سم. ركب الفلتر على جانب الحوض والسخان قرب تدفق الماء.",
    url: `${BASE_URL}/guides/new-aquarium-setup-iraq#step-2`,
  },
  {
    name: "أملأ بالماء وأضف مزيل الكلور",
    text: "أملأ الحوض بماء الإسالة ببطء حتى لا تزعزع الحصى. أضف مزيل الكلور مباشرة حسب الجرعة المكتوبة على العبوة.",
    url: `${BASE_URL}/guides/new-aquarium-setup-iraq#step-3`,
  },
  {
    name: "شغل الفلتر وانتظر الدورة البايولوجية",
    text: "شغل الفلتر والسخان. يمكنك إضافة بكتيريا جاهزة لتسريع الدورة البايولوجية. انتظر 3-7 أيام على الأقل.",
    url: `${BASE_URL}/guides/new-aquarium-setup-iraq#step-4`,
  },
  {
    name: "افحص الماء قبل إضافة السمك",
    text: "استخدم شرائط فحص الماء للتأكد من قراءات الأمونيا والنتريت (يجب أن تكون صفر) والpH (6.8-7.5). لما القراءات سليمة، الحوض جاهز.",
    url: `${BASE_URL}/guides/new-aquarium-setup-iraq#step-5`,
  },
  {
    name: "أضف السمك تدريجياً",
    text: "أضف 2-3 سمكات فقط في البداية. طوّف الكيس في الحوض 15 دقيقة لمعادلة الحرارة قبل الإطلاق. انتظر أسبوع قبل إضافة المزيد.",
    url: `${BASE_URL}/guides/new-aquarium-setup-iraq#step-6`,
  },
];

export default function GuideNewAquariumSetup() {
  return (
    <>
      <MetaTags
        title="كيف تجهز حوض سمك جديد — دليل المبتدئين"
        description="دليل شامل خطوة بخطوة لتجهيز حوض سمك جديد في العراق: المعدات الأساسية، مزيل الكلور، الفلتر، السخان، وأسرار نجاح الحوض الأول. AQUAVO يوصل لكل العراق."
        keywords={[
          "تجهيز حوض سمك جديد",
          "حوض سمك للمبتدئين",
          "معدات حوض السمك",
          "مزيل كلور للحوض",
          "فلتر حوض",
          "مستلزمات أحواض الزينة العراق",
        ]}
        url={`${BASE_URL}/guides/new-aquarium-setup-iraq`}
        canonicalUrl={`${BASE_URL}/guides/new-aquarium-setup-iraq`}
        type="article"
      />

      <BreadcrumbSchema
        items={[
          { name: "الرئيسية", url: BASE_URL },
          { name: "الأدلة", url: `${BASE_URL}/guides` },
          { name: "تجهيز حوض سمك جديد", url: `${BASE_URL}/guides/new-aquarium-setup-iraq` },
        ]}
      />

      <HowToSchema
        name="كيف تجهز حوض سمك جديد في العراق — خطوة بخطوة"
        description="دليل كامل لتجهيز أول حوض سمك: من اختيار المعدات حتى إضافة السمك بأمان"
        totalTime="PT7D"
        supply={[
          "فلتر مائي",
          "سخان حوض بثرموستات",
          "مزيل كلور وكلورامين",
          "شرائط فحص ماء",
          "حصى أو رمل مغسول",
          "إضاءة LED للحوض",
        ]}
        steps={HOW_TO_STEPS}
      />

      <FAQSchema questions={FAQ_ITEMS} />

      <div className="nas-wrap" dir="rtl">
        {/* Header */}
        <header className="nas-bar">
          <Link href="/" className="nas-brand">AQUAVO</Link>
          <nav className="nas-nav">
            <a href="/guides/aquarium-water-test-guide" className="nas-nav-link">فحص الماء</a>
            <Link href="/guides/heater-choice" className="nas-nav-link">السخانات</Link>
            <a href="/guides/aquarium-decor-stones-guide" className="nas-nav-link">الديكور</a>
          </nav>
        </header>

        <main className="nas-main" id="main-content">

          {/* Breadcrumb */}
          <nav className="nas-breadcrumb" aria-label="مسار التنقل">
            <Link href="/">الرئيسية</Link>
            <span> / </span>
            <a href="/guides">الأدلة</a>
            <span> / </span>
            <span>تجهيز حوض سمك جديد</span>
          </nav>

          {/* Hero */}
          <section className="nas-hero" id="hero-headline">
            <span className="nas-badge">دليل المبتدئين — AQUAVO</span>
            <h1 className="nas-h1">كيف تجهز حوض سمك جديد في العراق</h1>

            {/* Answer Block — AEO snippet target */}
            <div className="nas-answer-block" id="quick-answer">
              <p className="nas-answer-text">
                لتجهيز حوض سمك جديد تحتاج: حوض، فلتر مائي، سخان (للأسماك الاستوائية)، حصى مغسول، مزيل كلور، وشرائط فحص ماء. بعد تركيب المعدات وتشغيل الفلتر، انتظر 3-7 أيام للدورة البايولوجية، افحص الماء، ثم أضف السمك تدريجياً. AQUAVO متجر عراقي يوفر كل هذه المستلزمات مع توصيل لكل العراق ودفع عند الاستلام.
              </p>
            </div>

            <div className="nas-meta">
              <span>وقت القراءة: 7 دقائق</span>
              <span>•</span>
              <span>آخر تحديث: 2026</span>
            </div>
          </section>

          {/* AQUAVO Identity */}
          <div className="nas-store-note">
            <strong>عن AQUAVO:</strong> متجر إلكتروني عراقي متخصص في مستلزمات أحواض الزينة — فلاتر، سخانات، مزيل كلور، شرائط فحص، حصى، وإضاءة. توصيل لكل محافظات العراق بـ 5,000 دينار. الدفع عند الاستلام.
            <Link href="/products" className="nas-store-link"> تصفح المنتجات ←</Link>
          </div>

          {/* Step by Step */}
          <section className="nas-section" id="step-1">
            <h2 className="nas-title">الخطوة الأولى: اختر الحوض وحدد موقعه</h2>
            <p className="nas-body">
              أول قرار: حجم الحوض. للمبتدئين، الأفضل حوض بين <strong>60-100 لتر</strong> — لا صغير جداً (الماء يتلوث بسرعة) ولا كبير جداً (صعب الإدارة). ضع الحوض على سطح متين، بعيد عن أشعة الشمس المباشرة والتيارات الهوائية.
            </p>
            <div className="nas-tip">
              الحوض الممتلئ بالماء يزن تقريباً 1 كيلوغرام لكل لتر — حوض 80 لتر = 80 كيلو زائد وزن الزجاج.
            </div>
          </section>

          <section className="nas-section" id="step-2">
            <h2 className="nas-title">الخطوة الثانية: اغسل الحصى وركب المعدات</h2>
            <p className="nas-body">
              اغسل الحصى بماء بارد جاري في غربال حتى يصفو الماء تماماً — يأخذ من 5-10 دقائق. ضعه بسماكة 5-7 سم في قاع الحوض. ركب الفلتر حسب تعليمات المنتج، والسخان قرب مصدر تدفق الماء لتوزيع الحرارة بالتساوي.
            </p>
            <div className="nas-related-links">
              <Link href="/guides/filter-choice" className="nas-related-link">← دليل اختيار الفلتر المناسب</Link>
              <Link href="/guides/heater-choice" className="nas-related-link">← دليل اختيار السخان بالواط الصحيح</Link>
            </div>
          </section>

          <section className="nas-section" id="step-3">
            <h2 className="nas-title">الخطوة الثالثة: أملأ بالماء وأضف مزيل الكلور</h2>
            <p className="nas-body">
              أملأ الحوض بماء الإسالة ببطء — ضع صحناً فوق الحصى حتى لا تتزعزع. بمجرد ملء الحوض، <strong>أضف مزيل الكلور فوراً</strong>. ماء الإسالة في العراق يحتوي على كلور وكلورامين — هذه المواد تقتل السمك والبكتيريا النافعة مباشرة.
            </p>
            <div className="nas-warn-box">
              لا تنتظر ولا دقيقة — أضف مزيل الكلور قبل أي شيء ثاني بعد الملء.
            </div>
          </section>

          <section className="nas-section" id="step-4">
            <h2 className="nas-title">الخطوة الرابعة: الدورة البايولوجية — الأهم</h2>
            <p className="nas-body">
              بعد تشغيل الفلتر، الحوض يحتاج وقت لتكوين مستعمرات من البكتيريا النافعة (Nitrosomonas وNitrobacter) اللي تحول الأمونيا السامة إلى نترات أقل خطراً. هذه تسمى الدورة النيتروجينية أو الدورة البايولوجية.
            </p>
            <ul className="nas-list">
              <li>بدون بكتيريا: الدورة تأخذ 4-6 أسابيع</li>
              <li>مع بكتيريا جاهزة من المتجر: تنتهي خلال 3-7 أيام</li>
              <li>علامة الاكتمال: الأمونيا والنتريت = صفر في فحص الماء</li>
            </ul>
          </section>

          <section className="nas-section" id="step-5">
            <h2 className="nas-title">الخطوة الخامسة: فحص الماء قبل السمك</h2>
            <p className="nas-body">
              قبل ما تضيف أي سمكة، افحص الماء بشرائط فحص الماء. القراءات الآمنة:
            </p>
            <div className="nas-table-wrap">
              <table className="nas-table">
                <thead>
                  <tr>
                    <th>المؤشر</th>
                    <th>القراءة الآمنة</th>
                    <th>ليش مهم</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>الأمونيا (NH3)</td>
                    <td>0 ppm</td>
                    <td>سام جداً للسمك حتى بتركيز منخفض</td>
                  </tr>
                  <tr>
                    <td>النتريت (NO2)</td>
                    <td>0 ppm</td>
                    <td>يمنع الدم من حمل الأوكسجين</td>
                  </tr>
                  <tr>
                    <td>pH</td>
                    <td>6.8 – 7.5</td>
                    <td>حموضة مناسبة لمعظم الأسماك</td>
                  </tr>
                  <tr>
                    <td>النترات (NO3)</td>
                    <td>أقل من 40 ppm</td>
                    <td>أقل خطراً — يُخفَّض بتغيير الماء</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="nas-related-links">
              <a href="/guides/aquarium-water-test-guide" className="nas-related-link">← دليل كامل: شرائط فحص ماء الحوض وتفسير القراءات</a>
            </div>
          </section>

          <section className="nas-section" id="step-6">
            <h2 className="nas-title">الخطوة السادسة: أضف السمك تدريجياً</h2>
            <p className="nas-body">
              ابدأ بـ 2-3 سمكات صغيرة فقط. طوّف الكيس في الحوض 15 دقيقة لمعادلة الحرارة. بعد أسبوع وبعد فحص الماء من جديد، يمكنك إضافة المزيد.
            </p>
          </section>

          {/* Common Mistakes */}
          <section className="nas-section">
            <h2 className="nas-title">الأخطاء الشائعة للمبتدئين</h2>
            <div className="nas-mistakes-grid">
              {[
                { x: "إضافة السمك فوراً بدون انتظار", fix: "انتظر 3-7 أيام مع الفلتر مشغّل" },
                { x: "ما استخدام مزيل الكلور", fix: "ضروري مع أول ماء وعند كل تغيير جزئي" },
                { x: "كثرة الأكل", fix: "أعطِ كمية تنتهي خلال دقيقتين فقط" },
                { x: "حوض صغير جداً (أقل من 30 لتر)", fix: "الماء يتلوث بسرعة — الأفضل 60+ لتر للمبتدئ" },
                { x: "عدم فحص الماء", fix: "افحص أسبوعياً خصوصاً في الأشهر الأولى" },
                { x: "إضافة أسماك كثيرة دفعة واحدة", fix: "أضف تدريجياً حتى لا تتجاوز طاقة الفلتر" },
              ].map((m, i) => (
                <div key={i} className="nas-mistake-card">
                  <div className="nas-mistake-x">✗ {m.x}</div>
                  <div className="nas-mistake-fix">✓ {m.fix}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Starter Pack */}
          <section className="nas-section nas-starter">
            <h2 className="nas-title">بكج البداية المقترح من AQUAVO</h2>
            <p className="nas-body">
              هذه هي المعدات الأساسية اللي تحتاجها لأول حوض — كلها متوفرة في AQUAVO مع توصيل لكل العراق:
            </p>
            <ul className="nas-pack-list">
              <li><span className="nas-pack-icon">🔵</span> <strong>فلتر مائي داخلي</strong> — مناسب لأحواض 20-60 لتر</li>
              <li><span className="nas-pack-icon">🔴</span> <strong>سخان حوض بثرموستات</strong> — للأسماك الاستوائية (25-28 درجة)</li>
              <li><span className="nas-pack-icon">🟢</span> <strong>مزيل كلور وكلورامين</strong> — ضروري مع أول ماء وعند التغيير</li>
              <li><span className="nas-pack-icon">🟡</span> <strong>شرائط فحص الماء</strong> — تقيس الأمونيا، النتريت، النترات، pH</li>
              <li><span className="nas-pack-icon">⚪</span> <strong>حصى أو رمل ديكور</strong> — قاع طبيعي للحوض</li>
            </ul>
            <Link href="/products" className="nas-cta-btn" id="starter-pack-cta">
              تصفح مستلزمات الأحواض في AQUAVO
            </Link>
            <p className="nas-cta-note">توصيل لكل العراق — دفع عند الاستلام</p>
          </section>

          {/* FAQ */}
          <section className="nas-section" id="faq">
            <h2 className="nas-title">أسئلة شائعة — تجهيز حوض سمك جديد</h2>
            <div className="nas-faq-list">
              {FAQ_ITEMS.map((item, i) => (
                <details key={i} className="nas-faq-item">
                  <summary className="nas-faq-q">{item.question}</summary>
                  <p className="nas-faq-a">{item.answer}</p>
                </details>
              ))}
            </div>
          </section>

          {/* Related Guides */}
          <section className="nas-section">
            <h2 className="nas-title">أدلة ذات صلة</h2>
            <div className="nas-related-grid">
              <a href="/guides/aquarium-water-test-guide" className="nas-related-card">
                <span className="nas-related-icon">🧪</span>
                <div>
                  <div className="nas-related-title">دليل شرائط فحص ماء الحوض</div>
                  <div className="nas-related-desc">شنو تعني القراءات؟ ومتى تكون خطيرة؟</div>
                </div>
              </a>
              <Link href="/guides/heater-choice" className="nas-related-card">
                <span className="nas-related-icon">🌡️</span>
                <div>
                  <div className="nas-related-title">دليل اختيار سخان الحوض</div>
                  <div className="nas-related-desc">شلون تحسب الواط الصحيح لحوضك</div>
                </div>
              </Link>
              <Link href="/guides/filter-choice" className="nas-related-card">
                <span className="nas-related-icon">💧</span>
                <div>
                  <div className="nas-related-title">دليل اختيار الفلتر</div>
                  <div className="nas-related-desc">أنواع الفلاتر والفرق بينها</div>
                </div>
              </Link>
              <a href="/guides/aquarium-decor-stones-guide" className="nas-related-card">
                <span className="nas-related-icon">🪨</span>
                <div>
                  <div className="nas-related-title">دليل الديكور والأحجار</div>
                  <div className="nas-related-desc">شنو الأحجار الآمنة وكيف تختارها</div>
                </div>
              </a>
            </div>
          </section>

        </main>

        <style>{`
          .nas-wrap {
            min-height: 100vh;
            background: #0a1628;
            color: #e2e8f0;
            font-family: 'Cairo', 'Segoe UI', system-ui, sans-serif;
            direction: rtl;
          }
          .nas-bar {
            position: sticky; top: 0; z-index: 50;
            height: 64px;
            background: rgba(10,22,40,0.96);
            backdrop-filter: blur(10px);
            border-bottom: 1px solid rgba(25,155,184,0.2);
            display: flex; align-items: center;
            justify-content: space-between;
            padding: 0 1.5rem;
          }
          .nas-brand { color: #199bb8; font-weight: 800; letter-spacing: 3px; font-size: 1.1rem; text-decoration: none; }
          .nas-nav { display: flex; gap: 1rem; }
          .nas-nav-link { color: #94a3b8; font-size: 0.82rem; text-decoration: none; transition: color 0.2s; }
          .nas-nav-link:hover { color: #199bb8; }
          .nas-main { width: 100%; max-width: 760px; margin: 0 auto; padding: 2rem 1.25rem 6rem; display: flex; flex-direction: column; gap: 3rem; }
          .nas-breadcrumb { font-size: 0.78rem; color: #64748b; display: flex; gap: 0.4rem; flex-wrap: wrap; }
          .nas-breadcrumb a { color: #94a3b8; text-decoration: none; }
          .nas-breadcrumb a:hover { color: #199bb8; }
          .nas-hero { text-align: center; }
          .nas-badge { display: inline-block; border: 1px solid rgba(25,155,184,0.35); color: #199bb8; font-size: 0.7rem; font-weight: 700; letter-spacing: 1.5px; padding: 4px 14px; border-radius: 999px; margin-bottom: 1.25rem; }
          .nas-h1 { font-size: clamp(1.6rem, 5vw, 2.5rem); font-weight: 900; color: #f0f9ff; margin: 0 0 1.25rem; line-height: 1.2; }
          .nas-answer-block { background: rgba(25,155,184,0.07); border: 1px solid rgba(25,155,184,0.2); border-radius: 12px; padding: 1.25rem 1.5rem; text-align: right; margin-bottom: 1rem; }
          .nas-answer-text { font-size: 0.97rem; color: #cbd5e1; line-height: 1.8; margin: 0; }
          .nas-meta { font-size: 0.78rem; color: #475569; display: flex; gap: 0.75rem; justify-content: center; }
          .nas-store-note { background: rgba(255,215,0,0.05); border: 1px solid rgba(255,215,0,0.15); border-radius: 10px; padding: 1rem 1.25rem; font-size: 0.88rem; color: #94a3b8; line-height: 1.7; }
          .nas-store-note strong { color: #ffd700; }
          .nas-store-link { color: #199bb8; text-decoration: none; font-weight: 600; }
          .nas-section { display: flex; flex-direction: column; gap: 1rem; }
          .nas-title { font-size: 1.2rem; font-weight: 800; color: #e2e8f0; margin: 0 0 0.5rem; border-right: 3px solid #199bb8; padding-right: 0.75rem; }
          .nas-body { font-size: 0.92rem; color: #94a3b8; line-height: 1.8; margin: 0; }
          .nas-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.5rem; }
          .nas-list li { font-size: 0.9rem; color: #94a3b8; padding-right: 1.25rem; position: relative; }
          .nas-list li::before { content: '→'; position: absolute; right: 0; color: #199bb8; }
          .nas-tip { background: rgba(25,155,184,0.07); border: 1px solid rgba(25,155,184,0.2); border-radius: 8px; padding: 0.85rem 1rem; font-size: 0.85rem; color: #7dd3fc; }
          .nas-warn-box { background: rgba(239,68,68,0.06); border: 1px solid rgba(239,68,68,0.2); border-radius: 8px; padding: 0.85rem 1rem; font-size: 0.88rem; color: #fca5a5; }
          .nas-related-links { display: flex; flex-direction: column; gap: 0.5rem; }
          .nas-related-link { color: #199bb8; font-size: 0.88rem; text-decoration: none; }
          .nas-related-link:hover { text-decoration: underline; }
          .nas-table-wrap { overflow-x: auto; }
          .nas-table { width: 100%; border-collapse: collapse; font-size: 0.86rem; }
          .nas-table th { background: rgba(25,155,184,0.12); color: #cbd5e1; padding: 0.7rem 1rem; text-align: right; font-weight: 700; border-bottom: 1px solid rgba(25,155,184,0.2); }
          .nas-table td { color: #94a3b8; padding: 0.65rem 1rem; border-bottom: 1px solid rgba(255,255,255,0.04); }
          .nas-table tr:last-child td { border-bottom: none; }
          .nas-mistakes-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem; }
          @media (max-width: 560px) { .nas-mistakes-grid { grid-template-columns: 1fr; } }
          .nas-mistake-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 0.85rem 1rem; display: flex; flex-direction: column; gap: 0.4rem; }
          .nas-mistake-x { font-size: 0.83rem; color: #f87171; }
          .nas-mistake-fix { font-size: 0.83rem; color: #86efac; }
          .nas-starter { background: rgba(25,155,184,0.04); border: 1px solid rgba(25,155,184,0.15); border-radius: 14px; padding: 1.5rem; }
          .nas-pack-list { list-style: none; padding: 0; margin: 0 0 1.5rem; display: flex; flex-direction: column; gap: 0.7rem; }
          .nas-pack-list li { font-size: 0.9rem; color: #cbd5e1; display: flex; gap: 0.75rem; align-items: flex-start; }
          .nas-pack-icon { font-size: 1.1rem; flex-shrink: 0; }
          .nas-cta-btn { display: inline-block; background: linear-gradient(135deg, #199bb8, #0e7490); color: #fff; font-weight: 700; font-size: 0.95rem; padding: 0.85rem 2rem; border-radius: 10px; text-decoration: none; transition: opacity 0.2s; }
          .nas-cta-btn:hover { opacity: 0.88; }
          .nas-cta-note { font-size: 0.8rem; color: #64748b; margin-top: 0.5rem; }
          .nas-faq-list { display: flex; flex-direction: column; gap: 0.75rem; }
          .nas-faq-item { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07); border-radius: 10px; overflow: hidden; }
          .nas-faq-q { padding: 1rem 1.1rem; font-size: 0.92rem; font-weight: 700; color: #e2e8f0; cursor: pointer; list-style: none; }
          .nas-faq-q::-webkit-details-marker { display: none; }
          .nas-faq-a { padding: 0 1.1rem 1rem; font-size: 0.87rem; color: #94a3b8; line-height: 1.75; margin: 0; }
          .nas-related-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem; }
          @media (max-width: 560px) { .nas-related-grid { grid-template-columns: 1fr; } }
          .nas-related-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 1rem; text-decoration: none; display: flex; gap: 0.85rem; align-items: flex-start; transition: border-color 0.2s; }
          .nas-related-card:hover { border-color: rgba(25,155,184,0.4); }
          .nas-related-icon { font-size: 1.5rem; flex-shrink: 0; }
          .nas-related-title { font-size: 0.9rem; font-weight: 700; color: #e2e8f0; margin-bottom: 0.2rem; }
          .nas-related-desc { font-size: 0.8rem; color: #64748b; }
        `}</style>
      </div>
    </>
  );
}
