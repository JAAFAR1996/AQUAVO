export default function GuideAquariumSalt() {
  return (
    <div className="slt-wrap">

      <header className="slt-bar">
        <a href="/" className="slt-brand">AQUAVO</a>
      </header>

      <main className="slt-main">

        {/* ── Hero ── */}
        <section className="slt-hero">
          <span className="slt-badge">دليل الملح — AQUAVO</span>

          {/* Salt crystal — CSS only */}
          <div className="slt-crystal-wrap" aria-hidden="true">
            <div className="slt-crystal">
              <div className="slt-crystal-face slt-face-top"></div>
              <div className="slt-crystal-face slt-face-left"></div>
              <div className="slt-crystal-face slt-face-right"></div>
            </div>
            <div className="slt-crystal-glow"></div>
          </div>

          <h1>حبة ملح… بس بحساب</h1>
          <p className="slt-sub">الملح ما هو دواء شامل — له وقته الصح وكميته الصحيحة</p>
          <p className="slt-intro">
            ملح الأحواض أداة محدودة الاستخدام. يفيد في حالات معينة ويضر في حالات أخرى.
            هذا الدليل يوضحلك متى تستخدمه، متى تتجنبه، وكيف تحسب الكمية.
          </p>
          <div className="slt-meta">
            <span>مهم — اقرأ قبل أي استخدام</span>
            <span>وقت القراءة: 5 دقائق</span>
          </div>
        </section>

        {/* ── متى تستخدم ── */}
        <section className="slt-section">
          <h2 className="slt-title slt-title-yes">متى يفيد الملح؟</h2>
          <div className="slt-card-list">
            <div className="slt-card slt-card-yes">
              <div className="slt-card-icon">✓</div>
              <div>
                <strong>إجهاد السمچ بعد نقله أو تغيير المي المفاجئ</strong>
                <p>جرعة خفيفة تساعد على استقرار الأملاح الطبيعية وتقليل الإجهاد.</p>
              </div>
            </div>
            <div className="slt-card slt-card-yes">
              <div className="slt-card-icon">✓</div>
              <div>
                <strong>الوقاية من بعض الطفيليات الخارجية</strong>
                <p>الملح بتركيز خفيف يرفع مستوى الأملاح ويقلل من قدرة بعض الطفيليات على البقاء.</p>
              </div>
            </div>
            <div className="slt-card slt-card-yes">
              <div className="slt-card-icon">✓</div>
              <div>
                <strong>دعم إصابات الزعانف والجروح الخفيفة</strong>
                <p>يساعد على تقليل العدوى البكتيرية في الجروح السطحية مع عدم الإفراط.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── متى لا تستخدم ── */}
        <section className="slt-section">
          <h2 className="slt-title slt-title-no">متى تتجنب الملح؟</h2>
          <div className="slt-card-list">
            <div className="slt-card slt-card-no">
              <div className="slt-card-icon">✗</div>
              <div>
                <strong>أحواض الجمبري وسرطان المي العذب</strong>
                <p>الجمبري لا يتحمل حتى الجرعات الخفيفة — أي كمية قد تقتله.</p>
              </div>
            </div>
            <div className="slt-card slt-card-no">
              <div className="slt-card-icon">✗</div>
              <div>
                <strong>أحواض النباتات المائية</strong>
                <p>الملح المستمر يضر الجذور ويوقف النمو تدريجياً.</p>
              </div>
            </div>
            <div className="slt-card slt-card-no">
              <div className="slt-card-icon">✗</div>
              <div>
                <strong>السمچ الحساس للملوحة (كالكوريدوراس)</strong>
                <p>بعض الأنواع أكثر حساسية من غيرها — تحقق من متطلبات نوعك أولاً.</p>
              </div>
            </div>
            <div className="slt-card slt-card-no">
              <div className="slt-card-icon">✗</div>
              <div>
                <strong>كبديل للعلاج الحقيقي</strong>
                <p>الملح لا يعالج الأمراض البكتيرية أو الفطرية الداخلية — أرسل صورة للتشخيص.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── الجرعة ── */}
        <section className="slt-section">
          <h2 className="slt-title">الجرعة الصحيحة</h2>
          <p className="slt-body">
            استخدم ملح الطعام النقي (بدون يود) أو ملح الأحواض المخصص.
            لا تستخدم ملح البحر أو ملح المائدة المعالج بمضادات التكتل.
          </p>
          <div className="slt-dose-table">
            <div className="slt-dose-row slt-dose-header">
              <span>الغرض</span>
              <span>الجرعة لكل 10L</span>
              <span>المدة</span>
            </div>
            <div className="slt-dose-row">
              <span>تقليل الإجهاد</span>
              <span>1 غرام</span>
              <span>مع كل تغيير مي</span>
            </div>
            <div className="slt-dose-row">
              <span>دعم الجروح السطحية</span>
              <span>1–2 غرام</span>
              <span>3–5 أيام</span>
            </div>
            <div className="slt-dose-row">
              <span>مكافحة طفيليات خارجية</span>
              <span>3 غرام</span>
              <span>لا تتجاوز أسبوعاً</span>
            </div>
          </div>
          <p className="slt-note">
            ⚠ الملح لا يتبخر مع المي — يتراكم. عند كل تغيير مي، أضف الكمية فقط على النسبة المغيّرة مو الحوض كله.
          </p>
        </section>

        {/* ── CTA ── */}
        <section className="slt-cta-section">
          <div className="slt-cta-box">
            <h2 className="slt-cta-title">مو واثق من الكمية المناسبة لحوضك؟</h2>
            <p className="slt-cta-body">
              أرسل حجم حوضك ونوع السمچ — نحسبها لك بدقة.
            </p>
            <a
              href="https://www.instagram.com/aquavo_iq/"
              target="_blank"
              rel="noopener noreferrer"
              className="slt-cta-btn"
            >
              راسلنا على إنستغرام
            </a>
          </div>
        </section>

      </main>

      <style>{`
        .slt-wrap {
          min-height: 100vh;
          background: #080810;
          color: #E2E8F0;
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
          direction: rtl;
        }
        .slt-bar {
          position: sticky; top: 0; z-index: 50;
          height: 64px;
          background: rgba(8,8,16,0.96);
          backdrop-filter: blur(8px);
          border-bottom: 1px solid rgba(148,163,184,0.12);
          display: flex; align-items: center; padding: 0 1.25rem;
        }
        .slt-brand {
          color: #CBD5E1; font-weight: 700;
          letter-spacing: 4px; font-size: 1.1rem; text-decoration: none;
        }
        .slt-main {
          width: 100%; max-width: 720px;
          margin: 0 auto; padding: 2rem 1.25rem 5rem;
          display: flex; flex-direction: column; gap: 3.5rem;
        }

        /* Hero */
        .slt-hero { text-align: center; padding: 2rem 0; }
        .slt-badge {
          display: inline-block;
          border: 1px solid rgba(148,163,184,0.3);
          color: #94A3B8; font-size: 0.7rem; font-weight: 700;
          letter-spacing: 1.5px; padding: 4px 14px; border-radius: 999px;
          margin-bottom: 1.75rem;
        }
        .slt-hero h1 {
          font-size: clamp(1.8rem, 6vw, 2.7rem);
          font-weight: 900; color: #F8FAFC;
          margin: 0 0 0.5rem; line-height: 1.15;
        }
        .slt-sub { font-size: 0.97rem; color: #94A3B8; margin: 0 0 1rem; }
        .slt-intro { font-size: 0.93rem; color: #64748B; line-height: 1.75; max-width: 540px; margin: 0 auto 1.25rem; }
        .slt-meta {
          display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;
          font-size: 0.78rem; color: #475569;
        }

        /* Crystal */
        .slt-crystal-wrap {
          width: 100px; height: 100px; margin: 0 auto 2rem;
          position: relative; display: flex; align-items: center; justify-content: center;
        }
        .slt-crystal {
          width: 48px; height: 48px; position: relative; z-index: 1;
          transform: rotate(45deg);
        }
        .slt-crystal-face {
          position: absolute; border-radius: 3px;
        }
        .slt-face-top {
          inset: 0;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.3);
        }
        .slt-face-left {
          inset: 0; transform: translateX(-4px) translateY(4px);
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.15);
        }
        .slt-face-right {
          inset: 0; transform: translateX(4px) translateY(4px);
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
        }
        .slt-crystal-glow {
          position: absolute; inset: 15px; border-radius: 50%;
          background: rgba(255,255,255,0.08);
          filter: blur(12px);
          animation: slt-glow 3s ease-in-out infinite;
        }
        @keyframes slt-glow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.9; }
        }

        /* Titles */
        .slt-title {
          font-size: 1.25rem; font-weight: 800; color: #E2E8F0;
          margin: 0 0 1rem; padding-right: 0.75rem;
          border-right: 3px solid #94A3B8;
        }
        .slt-title-yes { border-right-color: #22C55E; color: #DCFCE7; }
        .slt-title-no { border-right-color: #EF4444; color: #FEE2E2; }
        .slt-body { font-size: 0.92rem; color: #94A3B8; line-height: 1.75; margin: 0 0 1.25rem; }

        /* Cards */
        .slt-card-list { display: flex; flex-direction: column; gap: 0.85rem; }
        .slt-card {
          display: flex; gap: 0.9rem; align-items: flex-start;
          padding: 1rem; border-radius: 10px; border: 1px solid transparent;
        }
        .slt-card-yes { background: rgba(34,197,94,0.05); border-color: rgba(34,197,94,0.15); }
        .slt-card-no { background: rgba(239,68,68,0.05); border-color: rgba(239,68,68,0.15); }
        .slt-card-icon {
          min-width: 28px; height: 28px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.85rem; font-weight: 700; flex-shrink: 0;
        }
        .slt-card-yes .slt-card-icon { background: rgba(34,197,94,0.15); color: #22C55E; }
        .slt-card-no .slt-card-icon { background: rgba(239,68,68,0.15); color: #EF4444; }
        .slt-card strong { display: block; color: #E2E8F0; font-size: 0.92rem; margin-bottom: 0.25rem; }
        .slt-card p { font-size: 0.83rem; color: #64748B; margin: 0; line-height: 1.6; }

        /* Dose table */
        .slt-dose-table { display: flex; flex-direction: column; border-radius: 10px; overflow: hidden; border: 1px solid rgba(148,163,184,0.12); margin-bottom: 1rem; }
        .slt-dose-row {
          display: grid; grid-template-columns: 1.5fr 1fr 1.2fr;
          padding: 0.7rem 1rem; font-size: 0.86rem; color: #94A3B8;
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        .slt-dose-row:last-child { border-bottom: none; }
        .slt-dose-header { background: rgba(148,163,184,0.07); font-weight: 700; color: #CBD5E1; font-size: 0.78rem; }
        .slt-note {
          font-size: 0.82rem; color: #F59E0B; background: rgba(245,158,11,0.05);
          border: 1px solid rgba(245,158,11,0.15); border-radius: 8px;
          padding: 0.75rem 1rem; line-height: 1.6;
        }

        /* CTA */
        .slt-cta-box {
          background: rgba(148,163,184,0.05);
          border: 1px solid rgba(148,163,184,0.15);
          border-radius: 14px; padding: 2rem; text-align: center;
        }
        .slt-cta-title { font-size: 1.2rem; font-weight: 800; color: #E2E8F0; margin: 0 0 0.6rem; }
        .slt-cta-body { font-size: 0.9rem; color: #94A3B8; line-height: 1.7; margin: 0 0 1.5rem; }
        .slt-cta-btn {
          display: inline-block; background: #475569; color: #fff;
          font-weight: 700; font-size: 0.95rem; padding: 0.75rem 2rem;
          border-radius: 8px; text-decoration: none; transition: opacity 0.2s;
        }
        .slt-cta-btn:hover { opacity: 0.88; }
      `}</style>

    </div>
  );
}
