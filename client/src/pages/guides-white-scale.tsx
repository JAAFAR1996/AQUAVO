export default function GuideWhiteScale() {
  return (
    <div className="whl-wrap">

      <header className="whl-bar">
        <a href="/" className="whl-brand">AQUAVO</a>
      </header>

      <main className="whl-main">

        {/* ── Hero ── */}
        <section className="whl-hero">
          <span className="whl-badge">دليل الترسبات — AQUAVO</span>

          {/* Glass pane with white scale lines — CSS only */}
          <div className="whl-glass-wrap" aria-hidden="true">
            <div className="whl-glass">
              <div className="whl-line whl-l1"></div>
              <div className="whl-line whl-l2"></div>
              <div className="whl-line whl-l3"></div>
              <div className="whl-line whl-l4"></div>
              <div className="whl-waterline"></div>
            </div>
          </div>

          <h1>الخط الأبيض</h1>
          <p className="whl-sub">الطبشور على الزجاج مو وسخ — معدن من المي نفسه</p>
          <p className="whl-intro">
            الترسبات البيضاء على حواف الحوض وعند خط الماء هي كالسيوم وماغنيسيوم.
            تظهر في كل حوض ولا تضر الأسماك — لكن يمكن إزالتها بسهولة بدون كيماويات.
          </p>
          <div className="whl-meta">
            <span>صيانة دورية</span>
            <span>وقت القراءة: 4 دقائق</span>
          </div>
        </section>

        {/* ── ليش تظهر ── */}
        <section className="whl-section">
          <h2 className="whl-title">ليش تظهر الترسبات البيضاء؟</h2>
          <div className="whl-reason-list">
            <div className="whl-reason">
              <div className="whl-reason-num">١</div>
              <div>
                <strong>تبخر المي يترك المعادن خلفه</strong>
                <p>عند خط الماء، المي يتبخر لكن الكالسيوم يبقى ويتراكم يوم بعد يوم.</p>
              </div>
            </div>
            <div className="whl-reason">
              <div className="whl-reason-num">٢</div>
              <div>
                <strong>رذاذ الفلتر أو الهيتر</strong>
                <p>كل قطرة ترش على الزجاج وتجف تترك أثر معدني. مع الوقت تصبح طبقة واضحة.</p>
              </div>
            </div>
            <div className="whl-reason">
              <div className="whl-reason-num">٣</div>
              <div>
                <strong>صلابة المي العالية (GH)</strong>
                <p>مي الصنبور في معظم المناطق صلب — كلما ارتفع GH، كلما زادت الترسبات.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── طريقة الإزالة ── */}
        <section className="whl-section">
          <h2 className="whl-title">إزالتها — ٣ طرق بدون كيماويات</h2>
          <div className="whl-method-list">
            <div className="whl-method whl-m-easy">
              <div className="whl-method-tag">الأسهل</div>
              <h3>الخل الأبيض</h3>
              <p>
                بلّل قطعة قماش بخل أبيض طبيعي. اتركها على المنطقة المتراكمة ٥–١٠ دقائق.
                امسح بلطف.
              </p>
              <div className="whl-rinse-box">
                <div className="whl-rinse-label">خطوة لازم تسويها قبل أي تلامس مع الماء:</div>
                <p className="whl-rinse-text">
                  بعد الانتهاء من الخل، امسح المنطقة بقطعة قماش مبللة بماء عادي نظيف —
                  أو اشطف الزجاج من الخارج قبل إعادة الماء أو السمچ. الخل الحمضي يغيّر
                  الـ pH لما يدخل الحوض حتى بكميات صغيرة.
                </p>
              </div>
              <div className="whl-method-note">✓ آمن على الأسماك بعد الشطف الجيد</div>
            </div>
            <div className="whl-method whl-m-mid">
              <div className="whl-method-tag">للطبقات السميكة</div>
              <h3>ماء الليمون (حمض الليمون)</h3>
              <p>
                ملعقة صغيرة حمض ليمون بكوب مي دافئ. نفس طريقة الخل.
                أقوى تأثير على الترسبات القديمة الصلبة.
              </p>
              <div className="whl-method-note">✓ لا تتركه طويلاً على السيليكون</div>
            </div>
            <div className="whl-method whl-m-hard">
              <div className="whl-method-tag">الأصعب</div>
              <h3>المكشطة المغناطيسية</h3>
              <p>
                اكشط وأنت تعيد الملء التدريجي. لا تحاول إزالة طبقات جافة سميكة بالمكشطة — الخل أولاً.
              </p>
              <div className="whl-method-note">⚠ لا تستخدم مكشطة على أحواض الأكريليك</div>
            </div>
          </div>
        </section>

        {/* ── الوقاية ── */}
        <section className="whl-section">
          <h2 className="whl-title">تقليل الترسبات مستقبلاً</h2>
          <div className="whl-tips">
            <div className="whl-tip">
              <span className="whl-tip-dot"></span>
              <p>امسح خط الماء مرة بالأسبوع قبل ما تتراكم الطبقات</p>
            </div>
            <div className="whl-tip">
              <span className="whl-tip-dot"></span>
              <p>لو GH عالي جداً، قلل صلابة المي بمزج مي الصنبور مع مي مقطر</p>
            </div>
            <div className="whl-tip">
              <span className="whl-tip-dot"></span>
              <p>اضبط مخرج الفلتر بحيث الرذاذ يكون داخل الحوض مو على الزجاج</p>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="whl-cta-section">
          <div className="whl-cta-box">
            <h2 className="whl-cta-title">الترسبات عندك مو بيضاء — بيج أو صفراء؟</h2>
            <p className="whl-cta-body">
              الألوان الأخرى تدل على مشاكل مختلفة. أرسل صورة نشخصها لك.
            </p>
            <a
              href="https://www.instagram.com/aquavo_iq/"
              target="_blank"
              rel="noopener noreferrer"
              className="whl-cta-btn"
            >
              راسلنا على إنستغرام
            </a>
          </div>
        </section>

      </main>

      <style>{`
        .whl-wrap {
          min-height: 100vh;
          background: #070810;
          color: #E2E8F0;
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
          direction: rtl;
        }
        .whl-bar {
          position: sticky; top: 0; z-index: 50;
          height: 64px;
          background: rgba(7,8,16,0.96);
          backdrop-filter: blur(8px);
          border-bottom: 1px solid rgba(226,232,240,0.1);
          display: flex; align-items: center; padding: 0 1.25rem;
        }
        .whl-brand {
          color: #CBD5E1; font-weight: 700;
          letter-spacing: 4px; font-size: 1.1rem; text-decoration: none;
        }
        .whl-main {
          width: 100%; max-width: 720px;
          margin: 0 auto; padding: 2rem 1.25rem 5rem;
          display: flex; flex-direction: column; gap: 3.5rem;
        }

        /* Hero */
        .whl-hero { text-align: center; padding: 2rem 0; }
        .whl-badge {
          display: inline-block;
          border: 1px solid rgba(226,232,240,0.25);
          color: #CBD5E1; font-size: 0.7rem; font-weight: 700;
          letter-spacing: 1.5px; padding: 4px 14px; border-radius: 999px;
          margin-bottom: 1.75rem;
        }
        .whl-hero h1 {
          font-size: clamp(1.8rem, 6vw, 2.8rem);
          font-weight: 900; color: #F8FAFC;
          margin: 0 0 0.5rem; line-height: 1.15;
        }
        .whl-sub { font-size: 0.97rem; color: #94A3B8; margin: 0 0 1rem; }
        .whl-intro { font-size: 0.93rem; color: #64748B; line-height: 1.75; max-width: 540px; margin: 0 auto 1.25rem; }
        .whl-meta {
          display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;
          font-size: 0.78rem; color: #475569;
        }

        /* Glass visual */
        .whl-glass-wrap {
          width: 140px; margin: 0 auto 2rem;
        }
        .whl-glass {
          width: 100%; height: 80px;
          border: 2px solid rgba(226,232,240,0.2);
          border-radius: 4px; overflow: hidden;
          background: rgba(10,12,20,0.9);
          position: relative;
        }
        .whl-line {
          position: absolute; right: 0; left: 0; height: 2px;
          background: rgba(255,255,255,0.35);
          border-radius: 1px;
        }
        .whl-l1 { top: 12px; opacity: 0.6; }
        .whl-l2 { top: 22px; opacity: 0.45; width: 70%; }
        .whl-l3 { top: 30px; opacity: 0.3; width: 55%; }
        .whl-l4 { top: 37px; opacity: 0.2; width: 40%; }
        .whl-waterline {
          position: absolute; bottom: 0; left: 0; right: 0; height: 35%;
          background: rgba(56,189,248,0.07);
          border-top: 1px solid rgba(56,189,248,0.2);
        }

        /* Titles */
        .whl-title {
          font-size: 1.25rem; font-weight: 800; color: #E2E8F0;
          margin: 0 0 1rem; border-right: 3px solid #94A3B8; padding-right: 0.75rem;
        }

        /* Reasons */
        .whl-reason-list { display: flex; flex-direction: column; gap: 0.85rem; }
        .whl-reason {
          display: flex; gap: 0.9rem; align-items: flex-start;
          padding: 1rem; background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06); border-radius: 10px;
        }
        .whl-reason-num {
          min-width: 28px; height: 28px; border-radius: 50%;
          background: rgba(148,163,184,0.1); color: #94A3B8;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.82rem; font-weight: 700; flex-shrink: 0;
        }
        .whl-reason strong { display: block; color: #E2E8F0; font-size: 0.92rem; margin-bottom: 0.25rem; }
        .whl-reason p { font-size: 0.83rem; color: #64748B; margin: 0; line-height: 1.6; }

        /* Methods */
        .whl-method-list { display: flex; flex-direction: column; gap: 1rem; }
        .whl-method {
          padding: 1.25rem; border-radius: 12px; border: 1px solid transparent;
        }
        .whl-m-easy  { background: rgba(34,197,94,0.04); border-color: rgba(34,197,94,0.15); }
        .whl-m-mid   { background: rgba(251,191,36,0.04); border-color: rgba(251,191,36,0.12); }
        .whl-m-hard  { background: rgba(148,163,184,0.04); border-color: rgba(148,163,184,0.1); }
        .whl-method-tag {
          font-size: 0.68rem; font-weight: 700; letter-spacing: 1px;
          margin-bottom: 0.4rem;
        }
        .whl-m-easy .whl-method-tag  { color: #22C55E; }
        .whl-m-mid  .whl-method-tag  { color: #FCD34D; }
        .whl-m-hard .whl-method-tag  { color: #94A3B8; }
        .whl-method h3 { font-size: 0.97rem; font-weight: 700; color: #E2E8F0; margin: 0 0 0.4rem; }
        .whl-method p  { font-size: 0.85rem; color: #64748B; margin: 0 0 0.6rem; line-height: 1.6; }
        .whl-method-note { font-size: 0.78rem; color: #94A3B8; }

        /* Tips */
        .whl-tips { display: flex; flex-direction: column; gap: 0.75rem; }
        .whl-tip { display: flex; gap: 0.75rem; align-items: flex-start; }
        .whl-tip-dot { min-width: 6px; height: 6px; border-radius: 50%; background: #94A3B8; margin-top: 7px; flex-shrink: 0; }
        .whl-tip p { font-size: 0.88rem; color: #94A3B8; margin: 0; line-height: 1.6; }

        /* CTA */
        .whl-cta-box {
          background: rgba(148,163,184,0.05);
          border: 1px solid rgba(148,163,184,0.15);
          border-radius: 14px; padding: 2rem; text-align: center;
        }
        .whl-cta-title { font-size: 1.2rem; font-weight: 800; color: #E2E8F0; margin: 0 0 0.6rem; }
        .whl-cta-body { font-size: 0.9rem; color: #94A3B8; line-height: 1.7; margin: 0 0 1.5rem; }
        .whl-cta-btn {
          display: inline-block; background: #475569; color: #fff;
          font-weight: 700; font-size: 0.95rem; padding: 0.75rem 2rem;
          border-radius: 8px; text-decoration: none; transition: opacity 0.2s;
        }
        .whl-cta-btn:hover { opacity: 0.88; }

        /* Rinse step highlight */
        .whl-rinse-box {
          background: rgba(56,189,248,0.06); border: 1px solid rgba(56,189,248,0.22);
          border-radius: 8px; padding: 0.75rem 0.9rem; margin: 0.6rem 0;
        }
        .whl-rinse-label { font-size: 0.72rem; font-weight: 700; color: #38BDF8; letter-spacing: 0.4px; margin-bottom: 0.35rem; }
        .whl-rinse-text { font-size: 0.82rem; color: #94A3B8; margin: 0; line-height: 1.65; }
      `}</style>

    </div>
  );
}
