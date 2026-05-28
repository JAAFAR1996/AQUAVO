export default function GuideFilterMedia() {
  return (
    <div className="fmd-wrap">

      <header className="fmd-bar">
        <a href="/" className="fmd-brand">AQUAVO</a>
      </header>

      <main className="fmd-main">

        {/* ── Hero ── */}
        <section className="fmd-hero">
          <span className="fmd-badge">دليل الوسط — AQUAVO</span>

          {/* Stacked filter layers — CSS only */}
          <div className="fmd-layers" aria-hidden="true">
            <div className="fmd-layer fmd-layer-top">
              <span className="fmd-layer-lbl">ميكانيكي</span>
            </div>
            <div className="fmd-layer fmd-layer-mid">
              <span className="fmd-layer-lbl">بيولوجي</span>
            </div>
            <div className="fmd-layer fmd-layer-bot">
              <span className="fmd-layer-lbl">كيميائي</span>
            </div>
          </div>

          <h1>المدينة المخفية</h1>
          <p className="fmd-sub">داخل الفلتر مدينة كاملة — كل طابق له وظيفة</p>
          <p className="fmd-intro">
            الفلتر ما هو مجرد إسفنجة. داخله طبقات متخصصة كل واحدة تؤدي دور مختلف.
            الترتيب الصح يعني فلتر يشتغل بكفاءة لأشهر دون مشاكل.
          </p>
          <div className="fmd-meta">
            <span>للمتوسطين والمحترفين</span>
            <span>وقت القراءة: 6 دقائق</span>
          </div>
        </section>

        {/* ── الطبقات الثلاث ── */}
        <section className="fmd-section">
          <h2 className="fmd-title">الطبقات الثلاث — الترتيب مهم</h2>
          <p className="fmd-body">
            المي يدخل من الأعلى وينزل للأسفل. الترتيب الخطأ يخلي الطبقات تتشبع بسرعة وتوقف الكفاءة.
          </p>

          <div className="fmd-stack">
            <div className="fmd-block fmd-mech">
              <div className="fmd-block-num">١</div>
              <div className="fmd-block-body">
                <div className="fmd-block-tag">الطبقة الأولى — ميكانيكي</div>
                <h3>يمسك الأوساخ الكبيرة</h3>
                <p>إسفنج خشن أو وسائد ميكانيكية. يحجز بقايا الأكل والطحالب العائمة وجزيئات الحصى.</p>
                <div className="fmd-block-note">
                  <strong>صيانة:</strong> اغسله مرة بالأسبوع بمي الحوض نفسه — ما تستخدم مي الصنبور.
                </div>
              </div>
            </div>

            <div className="fmd-arrow">↓</div>

            <div className="fmd-block fmd-bio">
              <div className="fmd-block-num">٢</div>
              <div className="fmd-block-body">
                <div className="fmd-block-tag">الطبقة الثانية — بيولوجي</div>
                <h3>مستعمرة البكتيريا النافعة</h3>
                <p>حجارة بيو، سيراميك، سبونج ناعم. هنا تسكن البكتيريا التي تحول الأمونيا → نترات آمنة.</p>
                <div className="fmd-block-note">
                  <strong>لا تغسله أبداً بمي الصنبور</strong> — البكتيريا تموت. غسلة خفيفة بمي الحوض كل ٣–٤ أشهر فقط.
                </div>
              </div>
            </div>

            <div className="fmd-arrow">↓</div>

            <div className="fmd-block fmd-chem">
              <div className="fmd-block-num">٣</div>
              <div className="fmd-block-body">
                <div className="fmd-block-tag">الطبقة الثالثة — كيميائي (اختياري)</div>
                <h3>يُعالج المشاكل الخاصة</h3>
                <p>كربون نشط (يزيل الأدوية والروائح)، زيوليت (يمتص الأمونيا في الطوارئ)، فوسفات ريموفر.</p>
                <div className="fmd-block-note">
                  <strong>ليس دائماً:</strong> الكربون النشط يستنفد خلال ٤–٦ أسابيع. بعدها لا يفيد ويجب تبديله.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── جدول البيو ── */}
        <section className="fmd-section">
          <h2 className="fmd-title">مقارنة وسائط البيولوجي</h2>
          <div className="fmd-table">
            <div className="fmd-trow fmd-thead">
              <span>الوسيط</span>
              <span>المساحة السطحية</span>
              <span>العمر الافتراضي</span>
            </div>
            <div className="fmd-trow">
              <span>سيراميك رينج</span>
              <span>عالية جداً</span>
              <span>سنوات</span>
            </div>
            <div className="fmd-trow">
              <span>حجارة بيو بول</span>
              <span>عالية جداً</span>
              <span>دائم</span>
            </div>
            <div className="fmd-trow">
              <span>إسفنج ناعم</span>
              <span>متوسطة</span>
              <span>١–٢ سنة</span>
            </div>
            <div className="fmd-trow">
              <span>لافا روك</span>
              <span>عالية (طبيعي)</span>
              <span>دائم</span>
            </div>
          </div>
        </section>

        {/* ── لا تبدل كل شيء مرة ── */}
        <section className="fmd-section">
          <h2 className="fmd-title">القاعدة الأهم: لا تبدّل كل الوسائط مرة وحدة</h2>
          <p className="fmd-body">
            هذا الخطأ يهدم النظام البيولوجي كله دفعة وحدة — حتى لو الحوض عمره سنوات.
            الشخص يظن يصون الفلتر والواقع يحذف البكتيريا النافعة كلها بيوم واحد.
          </p>
          <div className="fmd-rule-grid">
            <div className="fmd-rule-bad">
              <div className="fmd-rule-tag fmd-tag-bad">✕ الخطأ الشائع</div>
              <ul className="fmd-rule-ul">
                <li>تبديل الإسفنج والسيراميك والكربون كلهم نفس اليوم</li>
                <li>غسيل كل شيء بمي الصنبور</li>
                <li>تنظيف الفلتر كامل كل شهر بطريقة عميقة</li>
              </ul>
              <div className="fmd-rule-result">النتيجة: أمونيا ترتفع خلال ٢٤–٤٨ ساعة. الدورة تبدأ من صفر.</div>
            </div>
            <div className="fmd-rule-good">
              <div className="fmd-rule-tag fmd-tag-good">✓ الطريقة الصحيحة</div>
              <ul className="fmd-rule-ul">
                <li>نظّف أو بدّل وسيطة وحدة كل مرة</li>
                <li>انتظر ٢–٤ أسابيع قبل الوسيطة الثانية</li>
                <li>نظّف دائماً بمي الحوض — مو مي الصنبور</li>
                <li>إذا لازم تبدل سيراميك قديم، أضف الجديد بجانبه أسبوعين أول</li>
              </ul>
            </div>
          </div>
          <div className="fmd-stagger-note">
            السبب: البكتيريا النافعة تحتاج وقت لتتكاثر وتستقر على الوسائط الجديدة. إزالة كل الوسائط القديمة دفعة وحدة = لا بكتيريا = لا حماية للسمچ.
          </div>
        </section>

        {/* ── علامات التحذير ── */}
        <section className="fmd-section">
          <h2 className="fmd-title">متى تعرف أن الوسط مشبع؟</h2>
          <div className="fmd-warn-list">
            <div className="fmd-warn">
              <span className="fmd-warn-dot"></span>
              <div>
                <strong>ضعف تدفق الفلتر فجأة</strong>
                <p>الوسط الميكانيكي مسدود — اغسله فوراً</p>
              </div>
            </div>
            <div className="fmd-warn">
              <span className="fmd-warn-dot"></span>
              <div>
                <strong>ارتفاع الأمونيا رغم الفلتر الشغال</strong>
                <p>البكتيريا ضعيفة — مشكلة في الوسط البيولوجي أو صدمة كيميائية</p>
              </div>
            </div>
            <div className="fmd-warn">
              <span className="fmd-warn-dot"></span>
              <div>
                <strong>رائحة كبريت أو تعفن من الفلتر</strong>
                <p>منطقة لاهوائية تتكون — نظف الوسط وزد التدفق</p>
              </div>
            </div>
            <div className="fmd-warn">
              <span className="fmd-warn-dot"></span>
              <div>
                <strong>لون المي يميل للصفرة</strong>
                <p>الكربون النشط استنفد — بدّله أو ابعده إذا ما تريد استبداله</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="fmd-cta-section">
          <div className="fmd-cta-box">
            <h2 className="fmd-cta-title">مو متأكد من الوسط المناسب لفلترك؟</h2>
            <p className="fmd-cta-body">
              أرسل نوع الفلتر وحجم الحوض — ننصحك بالترتيب الأمثل.
            </p>
            <a
              href="https://www.instagram.com/aquavoiq/"
              target="_blank"
              rel="noopener noreferrer"
              className="fmd-cta-btn"
            >
              راسلنا على إنستغرام
            </a>
          </div>
        </section>

      </main>

      <style>{`
        .fmd-wrap {
          min-height: 100vh;
          background: #060B14;
          color: #E2E8F0;
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
          direction: rtl;
        }
        .fmd-bar {
          position: sticky; top: 0; z-index: 50;
          height: 64px;
          background: rgba(6,11,20,0.96);
          backdrop-filter: blur(8px);
          border-bottom: 1px solid rgba(251,191,36,0.15);
          display: flex; align-items: center; padding: 0 1.25rem;
        }
        .fmd-brand {
          color: #FCD34D; font-weight: 700;
          letter-spacing: 4px; font-size: 1.1rem; text-decoration: none;
        }
        .fmd-main {
          width: 100%; max-width: 720px;
          margin: 0 auto; padding: 2rem 1.25rem 5rem;
          display: flex; flex-direction: column; gap: 3.5rem;
        }

        /* Hero */
        .fmd-hero { text-align: center; padding: 2rem 0; }
        .fmd-badge {
          display: inline-block;
          border: 1px solid rgba(251,191,36,0.3);
          color: #FCD34D; font-size: 0.7rem; font-weight: 700;
          letter-spacing: 1.5px; padding: 4px 14px; border-radius: 999px;
          margin-bottom: 1.75rem;
        }
        .fmd-hero h1 {
          font-size: clamp(1.8rem, 6vw, 2.7rem);
          font-weight: 900; color: #FFFBEB;
          margin: 0 0 0.5rem; line-height: 1.15;
        }
        .fmd-sub { font-size: 0.97rem; color: #FCD34D; margin: 0 0 1rem; }
        .fmd-intro { font-size: 0.93rem; color: #94A3B8; line-height: 1.75; max-width: 540px; margin: 0 auto 1.25rem; }
        .fmd-meta {
          display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;
          font-size: 0.78rem; color: #475569;
        }

        /* Layers visual */
        .fmd-layers {
          width: 180px; margin: 0 auto 2rem;
          display: flex; flex-direction: column; gap: 4px;
        }
        .fmd-layer {
          height: 32px; border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.72rem; font-weight: 700; letter-spacing: 1px;
        }
        .fmd-layer-top {
          background: rgba(251,191,36,0.15);
          border: 1px solid rgba(251,191,36,0.35);
          color: #FCD34D;
        }
        .fmd-layer-mid {
          background: rgba(52,211,153,0.12);
          border: 1px solid rgba(52,211,153,0.3);
          color: #6EE7B7; width: 90%; margin: 0 auto;
        }
        .fmd-layer-bot {
          background: rgba(148,163,184,0.07);
          border: 1px solid rgba(148,163,184,0.2);
          color: #94A3B8; width: 80%; margin: 0 auto;
        }
        .fmd-layer-lbl { font-size: 0.68rem; letter-spacing: 1.5px; }

        /* Titles */
        .fmd-title {
          font-size: 1.25rem; font-weight: 800; color: #E2E8F0;
          margin: 0 0 1rem; border-right: 3px solid #FCD34D; padding-right: 0.75rem;
        }
        .fmd-body { font-size: 0.92rem; color: #94A3B8; line-height: 1.75; margin: 0 0 1.25rem; }

        /* Stack blocks */
        .fmd-stack { display: flex; flex-direction: column; align-items: stretch; }
        .fmd-arrow {
          text-align: center; font-size: 1.4rem; color: rgba(148,163,184,0.3);
          margin: -4px 0; line-height: 1.4;
        }
        .fmd-block {
          display: flex; gap: 1rem; padding: 1.25rem;
          border-radius: 12px; border: 1px solid transparent;
          position: relative;
        }
        .fmd-mech { background: rgba(251,191,36,0.05); border-color: rgba(251,191,36,0.18); }
        .fmd-bio  { background: rgba(52,211,153,0.04); border-color: rgba(52,211,153,0.15); }
        .fmd-chem { background: rgba(148,163,184,0.04); border-color: rgba(148,163,184,0.12); }
        .fmd-block-num {
          min-width: 32px; height: 32px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.9rem; font-weight: 800; flex-shrink: 0;
        }
        .fmd-mech .fmd-block-num { background: rgba(251,191,36,0.15); color: #FCD34D; }
        .fmd-bio  .fmd-block-num { background: rgba(52,211,153,0.12); color: #6EE7B7; }
        .fmd-chem .fmd-block-num { background: rgba(148,163,184,0.1); color: #94A3B8; }
        .fmd-block-tag {
          font-size: 0.68rem; font-weight: 700; letter-spacing: 1px;
          margin-bottom: 0.3rem;
        }
        .fmd-mech .fmd-block-tag { color: #FCD34D; }
        .fmd-bio  .fmd-block-tag { color: #6EE7B7; }
        .fmd-chem .fmd-block-tag { color: #94A3B8; }
        .fmd-block-body h3 { font-size: 0.95rem; font-weight: 700; color: #E2E8F0; margin: 0 0 0.3rem; }
        .fmd-block-body p { font-size: 0.83rem; color: #64748B; margin: 0 0 0.6rem; line-height: 1.6; }
        .fmd-block-note {
          font-size: 0.8rem; color: #94A3B8;
          background: rgba(0,0,0,0.2); border-radius: 6px; padding: 0.5rem 0.75rem;
          line-height: 1.5;
        }
        .fmd-block-note strong { color: #CBD5E1; }

        /* Table */
        .fmd-table { display: flex; flex-direction: column; border-radius: 10px; overflow: hidden; border: 1px solid rgba(148,163,184,0.12); }
        .fmd-trow {
          display: grid; grid-template-columns: 1.5fr 1fr 1fr;
          padding: 0.7rem 1rem; font-size: 0.86rem; color: #94A3B8;
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        .fmd-trow:last-child { border-bottom: none; }
        .fmd-thead { background: rgba(148,163,184,0.07); font-weight: 700; color: #CBD5E1; font-size: 0.78rem; }

        /* Warnings */
        .fmd-warn-list { display: flex; flex-direction: column; gap: 0.9rem; }
        .fmd-warn { display: flex; gap: 0.9rem; align-items: flex-start; }
        .fmd-warn-dot { min-width: 8px; height: 8px; border-radius: 50%; background: #F87171; margin-top: 6px; flex-shrink: 0; }
        .fmd-warn strong { display: block; color: #E2E8F0; font-size: 0.92rem; margin-bottom: 0.2rem; }
        .fmd-warn p { font-size: 0.83rem; color: #64748B; margin: 0; line-height: 1.6; }

        /* CTA */
        .fmd-cta-box {
          background: rgba(251,191,36,0.05);
          border: 1px solid rgba(251,191,36,0.18);
          border-radius: 14px; padding: 2rem; text-align: center;
        }
        .fmd-cta-title { font-size: 1.2rem; font-weight: 800; color: #E2E8F0; margin: 0 0 0.6rem; }
        .fmd-cta-body { font-size: 0.9rem; color: #94A3B8; line-height: 1.7; margin: 0 0 1.5rem; }
        .fmd-cta-btn {
          display: inline-block; background: #D97706; color: #fff;
          font-weight: 700; font-size: 0.95rem; padding: 0.75rem 2rem;
          border-radius: 8px; text-decoration: none; transition: opacity 0.2s;
        }
        .fmd-cta-btn:hover { opacity: 0.88; }

        /* Staggered maintenance rule */
        .fmd-rule-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.9rem; margin-bottom: 0.9rem; }
        @media (max-width: 500px) { .fmd-rule-grid { grid-template-columns: 1fr; } }
        .fmd-rule-bad  { background: rgba(239,68,68,0.04); border: 1px solid rgba(239,68,68,0.18); border-radius: 10px; padding: 1rem; }
        .fmd-rule-good { background: rgba(52,211,153,0.04); border: 1px solid rgba(52,211,153,0.18); border-radius: 10px; padding: 1rem; }
        .fmd-rule-tag { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 0.65rem; }
        .fmd-tag-bad  { color: #F87171; }
        .fmd-tag-good { color: #6EE7B7; }
        .fmd-rule-ul { list-style: none; padding: 0; margin: 0 0 0.65rem; display: flex; flex-direction: column; gap: 0.3rem; }
        .fmd-rule-ul li { font-size: 0.82rem; color: #94A3B8; padding-right: 0.7rem; position: relative; line-height: 1.5; }
        .fmd-rule-bad .fmd-rule-ul li::before  { content: '–'; position: absolute; right: 0; color: rgba(239,68,68,0.4); }
        .fmd-rule-good .fmd-rule-ul li::before { content: '–'; position: absolute; right: 0; color: rgba(52,211,153,0.4); }
        .fmd-rule-result { font-size: 0.78rem; color: #F87171; background: rgba(239,68,68,0.06); border-radius: 6px; padding: 0.4rem 0.65rem; line-height: 1.5; }
        .fmd-stagger-note { background: rgba(52,211,153,0.05); border-right: 3px solid rgba(52,211,153,0.35); border-radius: 0 8px 8px 0; padding: 0.75rem 1rem; font-size: 0.83rem; color: #6EE7B7; line-height: 1.6; }
      `}</style>

    </div>
  );
}
