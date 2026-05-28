export default function GuideFilterChoice() {
  return (
    <div className="fltr-wrap">

      <header className="fltr-bar">
        <a href="/" className="fltr-brand">AQUAVO</a>
      </header>

      <main className="fltr-main">

        {/* ── Hero ── */}
        <section className="fltr-hero">
          <span className="fltr-badge">دليل الفلتر — AQUAVO</span>

          {/* Engine-room pump visual */}
          <div className="fltr-engine" aria-hidden="true">
            <div className="fltr-flow fltr-flow-1"></div>
            <div className="fltr-flow fltr-flow-2"></div>
            <div className="fltr-flow fltr-flow-3"></div>
            <div className="fltr-pump-body">
              <span className="fltr-pump-icon">⬡</span>
            </div>
          </div>

          <h1>قلب الحوض</h1>
          <p className="fltr-sub">الفلتر الغلط يتعب السمچ قبل ما تلاحظ</p>
          <p className="fltr-intro">
            الفلتر مو مجرد جهاز — هو النظام اللي يبقي الحوض حياً. اختيار غير مناسب
            يعني فلترة ناقصة حتى لو الجهاز يشتغل. هذا الدليل يوضحلك شنو يناسب حوضك.
          </p>
          <div className="fltr-meta">
            <span>للمبتدئين وأصحاب الأحواض الحالية</span>
            <span>وقت القراءة: 7 دقائق</span>
          </div>
        </section>

        {/* ── أنواع الفلاتر ── */}
        <section className="fltr-section">
          <h2 className="fltr-title">أنواع الفلاتر — شنو يختلف؟</h2>
          <p className="fltr-body">أربعة أنواع رئيسية — كل نوع له مكانه الصح:</p>

          <div className="fltr-types">
            <div className="fltr-type-card">
              <div className="fltr-type-header">
                <span className="fltr-type-label">داخلي</span>
                <span className="fltr-type-tag">للأحواض الصغيرة</span>
              </div>
              <div className="fltr-type-body">
                <p>يتركب داخل الحوض مباشرة. سهل التركيب والتنظيف. مناسب للأحواض أقل من 80 لتر.</p>
                <div className="fltr-pros-cons">
                  <div className="fltr-pros">
                    <span>✓ رخيص وسهل</span>
                    <span>✓ مناسب للمبتدئين</span>
                  </div>
                  <div className="fltr-cons">
                    <span>✗ طاقة فلترة محدودة</span>
                    <span>✗ يأخذ مساحة داخل الحوض</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="fltr-type-card fltr-type-featured">
              <div className="fltr-type-header">
                <span className="fltr-type-label">خارجي (كانستر)</span>
                <span className="fltr-type-tag fltr-tag-best">الأقوى</span>
              </div>
              <div className="fltr-type-body">
                <p>خارج الحوض، سعة عالية للميديا. مناسب للأحواض فوق 80 لتر أو الأحواض المكتظة.</p>
                <div className="fltr-pros-cons">
                  <div className="fltr-pros">
                    <span>✓ فلترة قوية ومتكاملة</span>
                    <span>✓ هادي وما يأثر على المظهر</span>
                  </div>
                  <div className="fltr-cons">
                    <span>✗ أغلى سعراً</span>
                    <span>✗ تنظيفه أطول</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="fltr-type-card">
              <div className="fltr-type-header">
                <span className="fltr-type-label">إسفنج / سبونج</span>
                <span className="fltr-type-tag">للأحواض الخاصة</span>
              </div>
              <div className="fltr-type-body">
                <p>فلترة بيولوجية فقط. مثالي لأحواض العزل والأحواض اللي فيها صغار أو جمبري.</p>
                <div className="fltr-pros-cons">
                  <div className="fltr-pros">
                    <span>✓ آمن للصغار</span>
                    <span>✓ فلترة بيولوجية قوية</span>
                  </div>
                  <div className="fltr-cons">
                    <span>✗ ما يشيل الشوائب الصلبة كافي</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="fltr-type-card">
              <div className="fltr-type-header">
                <span className="fltr-type-label">HMF / جانبي</span>
                <span className="fltr-type-tag">للأحواض الكبيرة</span>
              </div>
              <div className="fltr-type-body">
                <p>جدار إسفنج جانبي مدمج في الحوض. تدفق مائي طبيعي وفلترة بيولوجية ممتازة.</p>
                <div className="fltr-pros-cons">
                  <div className="fltr-pros">
                    <span>✓ مساحة بيولوجية كبيرة</span>
                    <span>✓ تدفق طبيعي</span>
                  </div>
                  <div className="fltr-cons">
                    <span>✗ يأخذ مساحة جانبية</span>
                    <span>✗ يحتاج تركيب مبكر</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── دليل الحجم ── */}
        <section className="fltr-section">
          <h2 className="fltr-title">شنو يناسب حجم حوضك؟</h2>
          <p className="fltr-body">
            قاعدة أساسية: الفلتر يضخ حجم الحوض كامل ٣–٤ مرات بالساعة.
            حوض 100 لتر → محرك 300–400 L/h على الأقل.
          </p>
          <div className="fltr-size-table">
            <div className="fltr-size-row fltr-size-header">
              <span>حجم الحوض</span>
              <span>الفلو المطلوب</span>
              <span>النوع المناسب</span>
            </div>
            <div className="fltr-size-row">
              <span>أقل من 40L</span>
              <span>120–160 L/h</span>
              <span>داخلي صغير</span>
            </div>
            <div className="fltr-size-row">
              <span>40–80L</span>
              <span>160–320 L/h</span>
              <span>داخلي متوسط</span>
            </div>
            <div className="fltr-size-row">
              <span>80–200L</span>
              <span>320–800 L/h</span>
              <span>خارجي / داخلي قوي</span>
            </div>
            <div className="fltr-size-row">
              <span>فوق 200L</span>
              <span>600–1000+ L/h</span>
              <span>خارجي أو HMF</span>
            </div>
          </div>
        </section>

        {/* ── جدول الصيانة ── */}
        <section className="fltr-section">
          <h2 className="fltr-title">جدول صيانة الفلتر</h2>
          <div className="fltr-maint-list">
            <div className="fltr-maint-row">
              <div className="fltr-maint-period">أسبوعياً</div>
              <p>تحقق من تدفق الماء — لو قل، الإسفنج يحتاج تنظيف</p>
            </div>
            <div className="fltr-maint-row">
              <div className="fltr-maint-period">شهرياً</div>
              <p>نظّف الإسفنج بماء الحوض مو بالبوري — حتى ما تقتل البكتيريا النافعة</p>
            </div>
            <div className="fltr-maint-row">
              <div className="fltr-maint-period">3–4 أشهر</div>
              <p>راجع المحرك والمراوح — تنظيف عميق للفلتر الخارجي</p>
            </div>
            <div className="fltr-maint-row fltr-maint-warn">
              <div className="fltr-maint-period">مهم!</div>
              <p>لا تنظف الفلتر وتغير المي في نفس اليوم — صدمة للبكتيريا النافعة</p>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="fltr-cta-section">
          <div className="fltr-cta-box">
            <h2 className="fltr-cta-title">مو عارف أي فلتر يناسب حوضك؟</h2>
            <p className="fltr-cta-body">
              أرسل حجم الحوض وعدد السمچ — ونرشدك لأنسب خيار بميزانيتك.
            </p>
            <a
              href="https://www.instagram.com/aquavoiq/"
              target="_blank"
              rel="noopener noreferrer"
              className="fltr-cta-btn"
            >
              راسلنا على إنستغرام
            </a>
          </div>
        </section>

      </main>

      <style>{`
        .fltr-wrap {
          min-height: 100vh;
          background: #050A12;
          color: #E2E8F0;
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
          direction: rtl;
        }
        .fltr-bar {
          position: sticky; top: 0; z-index: 50;
          height: 64px;
          background: rgba(5,10,18,0.96);
          backdrop-filter: blur(8px);
          border-bottom: 1px solid rgba(6,182,212,0.18);
          display: flex; align-items: center; padding: 0 1.25rem;
        }
        .fltr-brand {
          color: #06B6D4; font-weight: 700;
          letter-spacing: 4px; font-size: 1.1rem; text-decoration: none;
        }
        .fltr-main {
          width: 100%; max-width: 720px;
          margin: 0 auto; padding: 2rem 1.25rem 5rem;
          display: flex; flex-direction: column; gap: 3.5rem;
        }

        /* Hero */
        .fltr-hero { text-align: center; padding: 2rem 0; }
        .fltr-badge {
          display: inline-block;
          border: 1px solid rgba(6,182,212,0.35);
          color: #06B6D4; font-size: 0.7rem; font-weight: 700;
          letter-spacing: 1.5px; padding: 4px 14px; border-radius: 999px;
          margin-bottom: 1.75rem;
        }
        .fltr-hero h1 {
          font-size: clamp(2.2rem, 7vw, 3rem);
          font-weight: 900; color: #F0F9FF;
          margin: 0 0 0.5rem;
        }
        .fltr-sub { font-size: 1rem; color: #06B6D4; margin: 0 0 1rem; }
        .fltr-intro { font-size: 0.93rem; color: #94A3B8; line-height: 1.75; max-width: 540px; margin: 0 auto 1.25rem; }
        .fltr-meta {
          display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;
          font-size: 0.78rem; color: #64748B;
        }

        /* Engine visual */
        .fltr-engine {
          width: 120px; height: 120px; margin: 0 auto 2rem;
          position: relative; display: flex; align-items: center; justify-content: center;
        }
        .fltr-flow {
          position: absolute; border-radius: 50%;
          border: 1.5px solid rgba(6,182,212,0.25);
        }
        .fltr-flow-1 { inset: 0; animation: fltr-pulse 2s ease-in-out infinite; }
        .fltr-flow-2 { inset: 12px; animation: fltr-pulse 2s ease-in-out infinite 0.6s; }
        .fltr-flow-3 { inset: 24px; animation: fltr-pulse 2s ease-in-out infinite 1.2s; }
        @keyframes fltr-pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; border-color: rgba(6,182,212,0.6); }
        }
        .fltr-pump-body {
          width: 40px; height: 40px; border-radius: 50%;
          background: rgba(6,182,212,0.15);
          border: 2px solid #06B6D4;
          display: flex; align-items: center; justify-content: center;
          z-index: 1;
        }
        .fltr-pump-icon { font-size: 1.2rem; color: #06B6D4; }

        /* Section */
        .fltr-title {
          font-size: 1.3rem; font-weight: 800; color: #E2E8F0;
          margin: 0 0 0.75rem; border-right: 3px solid #06B6D4; padding-right: 0.75rem;
        }
        .fltr-body { font-size: 0.92rem; color: #94A3B8; line-height: 1.75; margin: 0 0 1.25rem; }

        /* Filter types */
        .fltr-types { display: flex; flex-direction: column; gap: 1rem; }
        .fltr-type-card {
          background: rgba(6,182,212,0.04);
          border: 1px solid rgba(6,182,212,0.1);
          border-radius: 12px; overflow: hidden;
        }
        .fltr-type-featured {
          border-color: rgba(6,182,212,0.3);
          background: rgba(6,182,212,0.07);
        }
        .fltr-type-header {
          display: flex; align-items: center; gap: 0.75rem;
          padding: 0.75rem 1rem;
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        .fltr-type-label { font-weight: 700; color: #E2E8F0; font-size: 0.95rem; }
        .fltr-type-tag {
          font-size: 0.7rem; padding: 2px 10px; border-radius: 999px;
          background: rgba(6,182,212,0.12); color: #67E8F9;
          border: 1px solid rgba(6,182,212,0.2);
        }
        .fltr-tag-best { background: rgba(6,182,212,0.2); color: #06B6D4; border-color: rgba(6,182,212,0.4); }
        .fltr-type-body { padding: 0.75rem 1rem; }
        .fltr-type-body > p { font-size: 0.87rem; color: #94A3B8; margin: 0 0 0.75rem; line-height: 1.6; }
        .fltr-pros-cons { display: flex; gap: 1rem; flex-wrap: wrap; }
        .fltr-pros, .fltr-cons {
          display: flex; flex-direction: column; gap: 0.2rem; flex: 1; min-width: 120px;
        }
        .fltr-pros span { font-size: 0.8rem; color: #86EFAC; }
        .fltr-cons span { font-size: 0.8rem; color: #FCA5A5; }

        /* Size table */
        .fltr-size-table { display: flex; flex-direction: column; gap: 0; border-radius: 10px; overflow: hidden; border: 1px solid rgba(6,182,212,0.12); }
        .fltr-size-row {
          display: grid; grid-template-columns: 1.2fr 1.2fr 1.5fr;
          padding: 0.75rem 1rem; gap: 0.5rem;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          font-size: 0.87rem; color: #94A3B8;
        }
        .fltr-size-row:last-child { border-bottom: none; }
        .fltr-size-header {
          background: rgba(6,182,212,0.08);
          font-weight: 700; color: #67E8F9; font-size: 0.8rem;
        }
        .fltr-size-row:not(.fltr-size-header):hover { background: rgba(6,182,212,0.04); }

        /* Maintenance */
        .fltr-maint-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .fltr-maint-row {
          display: flex; gap: 1rem; align-items: flex-start;
          padding: 0.9rem 1rem;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 8px;
        }
        .fltr-maint-warn {
          background: rgba(245,158,11,0.04);
          border-color: rgba(245,158,11,0.15);
        }
        .fltr-maint-period {
          min-width: 70px; font-size: 0.78rem; font-weight: 700;
          color: #06B6D4; padding-top: 1px;
        }
        .fltr-maint-warn .fltr-maint-period { color: #F59E0B; }
        .fltr-maint-row p { font-size: 0.87rem; color: #94A3B8; margin: 0; line-height: 1.6; }

        /* CTA */
        .fltr-cta-box {
          background: rgba(6,182,212,0.06);
          border: 1px solid rgba(6,182,212,0.2);
          border-radius: 14px; padding: 2rem; text-align: center;
        }
        .fltr-cta-title { font-size: 1.2rem; font-weight: 800; color: #E2E8F0; margin: 0 0 0.6rem; }
        .fltr-cta-body { font-size: 0.9rem; color: #94A3B8; line-height: 1.7; margin: 0 0 1.5rem; }
        .fltr-cta-btn {
          display: inline-block; background: #06B6D4; color: #fff;
          font-weight: 700; font-size: 0.95rem; padding: 0.75rem 2rem;
          border-radius: 8px; text-decoration: none; transition: opacity 0.2s;
        }
        .fltr-cta-btn:hover { opacity: 0.88; }
      `}</style>

    </div>
  );
}
