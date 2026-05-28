export default function GuideWaterChangeSchedule() {
  return (
    <div className="wc-wrap">

      <header className="wc-bar">
        <a href="/" className="wc-brand">AQUAVO</a>
      </header>

      <main className="wc-main">

        {/* ── SECTION 1: Hero ── */}
        <section className="wc-hero">
          <span className="wc-badge">دليل عملي — AQUAVO</span>

          {/* ساعة المي — circular water-clock */}
          <div className="wc-clock-ring" aria-hidden="true">
            <div className="wc-ripple wc-ripple-1"></div>
            <div className="wc-ripple wc-ripple-2"></div>
            <div className="wc-ripple wc-ripple-3"></div>
            <div className="wc-clock-core">
              <span className="wc-clock-pct">20٪</span>
              <span className="wc-clock-label">أسبوعياً</span>
            </div>
          </div>

          <h1>ساعة المي</h1>
          <p className="wc-sub">مو كل مي صافي يعني ما يحتاج تغيير</p>
          <p className="wc-intro">
            المي اللي يبين نظيف ممكن يكون مليان نترات وأمونيا بدون ما تحس بي.
            دليل AQUAVO يعطيك جدول واضح حسب حجم حوضك ويبين متى المي يصرخ يحتاج تجديد.
          </p>
          <div className="wc-meta-row">
            <span>لمن هذا: كل صاحب حوض يريد يحافظ على سمچه</span>
            <span>وقت القراءة: 5–7 دقائق</span>
          </div>
        </section>

        {/* ── SECTION 2: ليش تغيير منتظم ── */}
        <section className="wc-section">
          <h2 className="wc-title">ليش التغيير المنتظم مهم؟</h2>
          <p className="wc-section-intro">
            الفلتر يشيل الشوائب الصلبة، لكن ما يشيل النترات. النترات تتراكم بصمت وتضعف
            السمچ وتشجع الطحالب. التغيير المنتظم هو الطريقة الوحيدة للتخلص منها بشكل طبيعي.
          </p>
          <div className="wc-reason-grid">
            <div className="wc-reason-card">
              <div className="wc-reason-icon">⬇</div>
              <div className="wc-reason-text">
                <strong>تخفيض النترات</strong>
                <p>النترات تتراكم كل أسبوع حتى لو ما شفت فرق بالمظهر</p>
              </div>
            </div>
            <div className="wc-reason-card">
              <div className="wc-reason-icon">⚖</div>
              <div className="wc-reason-text">
                <strong>استقرار المعادن والـ pH</strong>
                <p>المي القديم يتحمض تدريجياً ويؤثر على صحة السمچ والمرجان</p>
              </div>
            </div>
            <div className="wc-reason-card">
              <div className="wc-reason-icon">✦</div>
              <div className="wc-reason-text">
                <strong>تجديد المعادن الضرورية</strong>
                <p>بعض المعادن تستهلكها الأحياء ولا يضيفها الفلتر</p>
              </div>
            </div>
            <div className="wc-reason-card">
              <div className="wc-reason-icon">◎</div>
              <div className="wc-reason-text">
                <strong>تقليل الإجهاد</strong>
                <p>المي القديم يرفع مستوى الكورتيزول عند السمچ ويضعف مناعته</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 3: الجدول حسب حجم الحوض ── */}
        <section className="wc-section">
          <h2 className="wc-title">الجدول الصح حسب حجم حوضك</h2>
          <p className="wc-section-intro">
            ما أكو جدول واحد يناسب الكل. حجم الحوض وعدد الأسماك والتغذية اليومية كلها
            تأثر على سرعة تراكم النترات.
          </p>

          <div className="wc-schedule-grid">
            <div className="wc-sched-card wc-sched-sm">
              <div className="wc-sched-header">
                <span className="wc-sched-size">صغير</span>
                <span className="wc-sched-liters">أقل من 60 لتر</span>
              </div>
              <div className="wc-sched-body">
                <div className="wc-sched-row">
                  <span className="wc-sched-key">التكرار</span>
                  <span className="wc-sched-val">كل 5 إلى 7 أيام</span>
                </div>
                <div className="wc-sched-row">
                  <span className="wc-sched-key">الكمية</span>
                  <span className="wc-sched-val">20 إلى 25٪</span>
                </div>
                <div className="wc-sched-row">
                  <span className="wc-sched-key">تنبيه</span>
                  <span className="wc-sched-val wc-warn-text">أحواض صغيرة تتأثر بسرعة — لا تهمل التغيير</span>
                </div>
              </div>
            </div>

            <div className="wc-sched-card wc-sched-md">
              <div className="wc-sched-header">
                <span className="wc-sched-size">متوسط</span>
                <span className="wc-sched-liters">60 إلى 200 لتر</span>
              </div>
              <div className="wc-sched-body">
                <div className="wc-sched-row">
                  <span className="wc-sched-key">التكرار</span>
                  <span className="wc-sched-val">كل 7 إلى 10 أيام</span>
                </div>
                <div className="wc-sched-row">
                  <span className="wc-sched-key">الكمية</span>
                  <span className="wc-sched-val">20 إلى 30٪</span>
                </div>
                <div className="wc-sched-row">
                  <span className="wc-sched-key">نصيحة</span>
                  <span className="wc-sched-val">الحجم المثالي للمبتدئين — مستقر نسبياً</span>
                </div>
              </div>
            </div>

            <div className="wc-sched-card wc-sched-lg">
              <div className="wc-sched-header">
                <span className="wc-sched-size">كبير</span>
                <span className="wc-sched-liters">أكثر من 200 لتر</span>
              </div>
              <div className="wc-sched-body">
                <div className="wc-sched-row">
                  <span className="wc-sched-key">التكرار</span>
                  <span className="wc-sched-val">كل 10 إلى 14 يوم</span>
                </div>
                <div className="wc-sched-row">
                  <span className="wc-sched-key">الكمية</span>
                  <span className="wc-sched-val">20 إلى 25٪</span>
                </div>
                <div className="wc-sched-row">
                  <span className="wc-sched-key">نصيحة</span>
                  <span className="wc-sched-val">الأحواض الكبيرة تستحمل أكثر — لكن لا تتأخر أكثر من أسبوعين</span>
                </div>
              </div>
            </div>
          </div>

          <div className="wc-sched-note">
            هذا جدول أساسي. إذا عندك حوض مكتظ أو تغذي كثير، زود التغيير بيوم أو يومين.
          </div>
        </section>

        {/* ── SECTION 4: علامات المي يحتاج تغيير ── */}
        <section className="wc-section">
          <h2 className="wc-title">متى المي يصرخ يحتاج تجديد؟</h2>
          <p className="wc-section-intro">
            هذه العلامات تبين إن النترات وصلت مستوى خطر أو المي بدأ يفقد توازنه.
            إذا شفت واحدة منها، غير المي هالحين.
          </p>
          <div className="wc-signs-grid">
            <div className="wc-sign">
              <span className="wc-sign-dot wc-dot-warn"></span>
              <div>
                <strong>رغوة على السطح</strong>
                <p>تراكم البروتين والمواد العضوية — علامة واضحة إن المي تعبان</p>
              </div>
            </div>
            <div className="wc-sign">
              <span className="wc-sign-dot wc-dot-warn"></span>
              <div>
                <strong>لون أصفر أو بني للمي</strong>
                <p>الحمضيات العضوية تتراكم وتغير لون الماء تدريجياً</p>
              </div>
            </div>
            <div className="wc-sign">
              <span className="wc-sign-dot wc-dot-danger"></span>
              <div>
                <strong>السمچ على السطح يلهث</strong>
                <p>نقص أوكسجين أو تراكم أمونيا — اغير المي فوراً وافحصه</p>
              </div>
            </div>
            <div className="wc-sign">
              <span className="wc-sign-dot wc-dot-warn"></span>
              <div>
                <strong>رائحة كريهة من الحوض</strong>
                <p>المي الصحي ما يشم بنفسه. رائحة تعني تراكم عضوي زيادة</p>
              </div>
            </div>
            <div className="wc-sign">
              <span className="wc-sign-dot wc-dot-warn"></span>
              <div>
                <strong>طحالب تزيد فجأة</strong>
                <p>الطحالب تحب النترات. إذا طلعت فجأة، المي محتاج تجديد</p>
              </div>
            </div>
            <div className="wc-sign">
              <span className="wc-sign-dot wc-dot-danger"></span>
              <div>
                <strong>السمچ خامل أو ما تاكل</strong>
                <p>جودة المي الرديئة تأثر على الشهية والنشاط — لا تتأخر</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 5: خطوات التغيير ── */}
        <section className="wc-section">
          <h2 className="wc-title">خطوات تغيير المي بشكل صحيح</h2>
          <p className="wc-section-intro">
            التغيير الخاطئ ممكن يصدم السمچ أكثر من المي القديم. اتبع هذا الترتيب.
          </p>
          <ol className="wc-steps">
            <li className="wc-step">
              <span className="wc-step-num">١</span>
              <div className="wc-step-content">
                <strong>جهز الماء الجديد قبل البداية</strong>
                <p>الماء الجديد لازم يكون بنفس درجة حرارة الحوض ± درجة. فرق الحرارة يصدم السمچ.</p>
              </div>
            </li>
            <li className="wc-step">
              <span className="wc-step-num">٢</span>
              <div className="wc-step-content">
                <strong>وقف الهيتر والفلتر</strong>
                <p>مهم تطفيهم قبل ما تنزل مستوى المي — الهيتر المكشوف ممكن يحترق.</p>
              </div>
            </li>
            <li className="wc-step">
              <span className="wc-step-num">٣</span>
              <div className="wc-step-content">
                <strong>شيل 20 إلى 30٪ بالسايفون</strong>
                <p>استخدم السايفون تمشي على الحصى وتشيل المخلفات مع المي نفس الوقت.</p>
              </div>
            </li>
            <li className="wc-step">
              <span className="wc-step-num">٤</span>
              <div className="wc-step-content">
                <strong>أضف الماء الجديد ببطء</strong>
                <p>ما تصب بسرعة. اصب بهدوء على الجانب أو على صخرة حتى ما تقلقل الحصى.</p>
              </div>
            </li>
            <li className="wc-step">
              <span className="wc-step-num">٥</span>
              <div className="wc-step-content">
                <strong>أضف معالج الكلور</strong>
                <p>ماء البوري يحتوي كلور. أضف محلل الكلور للمي الجديد قبل أو بعد الإضافة مباشرة.</p>
              </div>
            </li>
            <li className="wc-step">
              <span className="wc-step-num">٦</span>
              <div className="wc-step-content">
                <strong>شغل الفلتر والهيتر</strong>
                <p>انتظر 10 دقائق بعد انتهاء التغيير قبل ما تشغلهم.</p>
              </div>
            </li>
          </ol>
        </section>

        {/* ── SECTION 6: CTA ── */}
        <section className="wc-cta-section">
          <div className="wc-cta-box">
            <h2 className="wc-cta-title">تريد جدول مناسب لحوضك تحديداً؟</h2>
            <p className="wc-cta-body">
              دز حجم حوضك بالليتر وعدد الأسماك تقريباً — ونرتبلك جدول مناسب لوضعك مباشرة.
            </p>
            <a
              href="https://www.instagram.com/aquavoiq/"
              target="_blank"
              rel="noopener noreferrer"
              className="wc-cta-btn"
            >
              راسلنا على إنستغرام
            </a>
          </div>
        </section>

      </main>

      <style>{`
        /* ── Base ── */
        .wc-wrap {
          min-height: 100vh;
          background: #010611;
          color: #E8EDF2;
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
          direction: rtl;
        }

        /* ── Top bar ── */
        .wc-bar {
          position: sticky;
          top: 0;
          z-index: 50;
          height: 64px;
          background: rgba(1,6,17,0.96);
          backdrop-filter: blur(8px);
          border-bottom: 1px solid rgba(25,155,184,0.25);
          display: flex;
          align-items: center;
          padding: 0 1rem;
        }
        .wc-brand {
          color: #199BB8;
          font-weight: 700;
          letter-spacing: 4px;
          font-size: 1.1rem;
          text-decoration: none;
        }

        /* ── Main layout ── */
        .wc-main {
          width: 100%;
          max-width: 720px;
          margin: 0 auto;
          padding: 2rem 1.25rem 4rem;
          display: flex;
          flex-direction: column;
          gap: 3rem;
        }

        /* ── Badge ── */
        .wc-badge {
          display: inline-block;
          border: 1px solid rgba(25,155,184,0.4);
          color: #199BB8;
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 1px;
          padding: 4px 12px;
          border-radius: 999px;
          margin-bottom: 1.5rem;
        }

        /* ── Hero ── */
        .wc-hero {
          text-align: center;
          padding: 2rem 0 1rem;
        }
        .wc-hero h1 {
          font-size: clamp(2rem, 6vw, 2.8rem);
          font-weight: 800;
          color: #E8EDF2;
          margin: 0 0 0.5rem;
          line-height: 1.2;
        }
        .wc-sub {
          font-size: 1.05rem;
          color: #199BB8;
          font-weight: 600;
          margin: 0 0 1rem;
        }
        .wc-intro {
          font-size: 0.95rem;
          line-height: 1.75;
          color: #9BABC0;
          max-width: 560px;
          margin: 0 auto 1.25rem;
        }
        .wc-meta-row {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 0.5rem 1.25rem;
          font-size: 0.78rem;
          color: #4A6278;
          margin-top: 0.75rem;
        }

        /* ── Circular water clock ── */
        .wc-clock-ring {
          position: relative;
          width: 160px;
          height: 160px;
          margin: 0 auto 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .wc-ripple {
          position: absolute;
          border-radius: 50%;
          border: 2px solid rgba(25,155,184,0.45);
          animation: wc-ripple-expand 3s ease-out infinite;
        }
        .wc-ripple-1 {
          width: 100%;
          height: 100%;
          animation-delay: 0s;
        }
        .wc-ripple-2 {
          width: 75%;
          height: 75%;
          animation-delay: 0.8s;
          border-color: rgba(25,155,184,0.3);
        }
        .wc-ripple-3 {
          width: 50%;
          height: 50%;
          animation-delay: 1.6s;
          border-color: rgba(25,155,184,0.2);
        }
        @keyframes wc-ripple-expand {
          0%   { transform: scale(0.85); opacity: 0.9; }
          50%  { transform: scale(1);    opacity: 0.5; }
          100% { transform: scale(1.15); opacity: 0; }
        }
        .wc-clock-core {
          position: relative;
          z-index: 2;
          width: 70px;
          height: 70px;
          background: #0A1628;
          border: 2px solid #199BB8;
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 24px rgba(25,155,184,0.25);
        }
        .wc-clock-pct {
          font-size: 1.15rem;
          font-weight: 800;
          color: #199BB8;
          line-height: 1;
        }
        .wc-clock-label {
          font-size: 0.58rem;
          color: #4A6278;
          margin-top: 2px;
        }

        /* ── Section shared ── */
        .wc-section {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .wc-title {
          font-size: 1.3rem;
          font-weight: 700;
          color: #E8EDF2;
          border-right: 3px solid #199BB8;
          padding-right: 0.75rem;
          margin: 0;
        }
        .wc-section-intro {
          font-size: 0.93rem;
          line-height: 1.75;
          color: #9BABC0;
          margin: 0;
        }

        /* ── Why reasons grid ── */
        .wc-reason-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.875rem;
        }
        @media (max-width: 520px) {
          .wc-reason-grid { grid-template-columns: 1fr; }
        }
        .wc-reason-card {
          background: #0A1628;
          border: 1px solid rgba(25,155,184,0.18);
          border-radius: 12px;
          padding: 1rem;
          display: flex;
          gap: 0.875rem;
          align-items: flex-start;
        }
        .wc-reason-icon {
          font-size: 1.2rem;
          color: #199BB8;
          margin-top: 2px;
          flex-shrink: 0;
          width: 24px;
          text-align: center;
        }
        .wc-reason-text strong {
          display: block;
          font-size: 0.9rem;
          color: #E8EDF2;
          margin-bottom: 0.3rem;
        }
        .wc-reason-text p {
          font-size: 0.82rem;
          color: #6B8299;
          line-height: 1.6;
          margin: 0;
        }

        /* ── Schedule grid ── */
        .wc-schedule-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 0.875rem;
        }
        @media (max-width: 600px) {
          .wc-schedule-grid { grid-template-columns: 1fr; }
        }
        .wc-sched-card {
          background: #0A1628;
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid rgba(25,155,184,0.15);
        }
        .wc-sched-sm { border-top: 3px solid #F5A832; }
        .wc-sched-md { border-top: 3px solid #199BB8; }
        .wc-sched-lg { border-top: 3px solid #5BCBCB; }
        .wc-sched-header {
          padding: 0.875rem 1rem 0.5rem;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .wc-sched-size {
          font-size: 1rem;
          font-weight: 700;
          color: #E8EDF2;
        }
        .wc-sched-liters {
          font-size: 0.75rem;
          color: #4A6278;
        }
        .wc-sched-body {
          padding: 0.5rem 1rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .wc-sched-row {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .wc-sched-key {
          font-size: 0.68rem;
          color: #4A6278;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .wc-sched-val {
          font-size: 0.85rem;
          color: #C4D0DC;
          line-height: 1.5;
        }
        .wc-warn-text { color: #F5A832; }
        .wc-sched-note {
          background: rgba(245,168,50,0.06);
          border: 1px solid rgba(245,168,50,0.2);
          border-radius: 10px;
          padding: 0.875rem 1rem;
          font-size: 0.85rem;
          color: #F5A832;
          line-height: 1.6;
        }

        /* ── Warning signs ── */
        .wc-signs-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.875rem;
        }
        @media (max-width: 520px) {
          .wc-signs-grid { grid-template-columns: 1fr; }
        }
        .wc-sign {
          display: flex;
          gap: 0.75rem;
          align-items: flex-start;
          background: #0A1628;
          border: 1px solid rgba(25,155,184,0.12);
          border-radius: 12px;
          padding: 0.875rem;
        }
        .wc-sign-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
          margin-top: 5px;
        }
        .wc-dot-warn   { background: #F5A832; box-shadow: 0 0 6px rgba(245,168,50,0.5); }
        .wc-dot-danger { background: #E8523A; box-shadow: 0 0 6px rgba(232,82,58,0.5); }
        .wc-sign strong {
          display: block;
          font-size: 0.88rem;
          color: #E8EDF2;
          margin-bottom: 0.3rem;
        }
        .wc-sign p {
          font-size: 0.8rem;
          color: #6B8299;
          line-height: 1.55;
          margin: 0;
        }

        /* ── Steps ── */
        .wc-steps {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        .wc-step {
          display: flex;
          gap: 1rem;
          align-items: flex-start;
          position: relative;
          padding-bottom: 1.5rem;
        }
        .wc-step:last-child { padding-bottom: 0; }
        .wc-step:not(:last-child)::before {
          content: '';
          position: absolute;
          right: 18px;
          top: 40px;
          bottom: 0;
          width: 2px;
          background: rgba(25,155,184,0.18);
        }
        .wc-step-num {
          flex-shrink: 0;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #0A1628;
          border: 2px solid #199BB8;
          color: #199BB8;
          font-size: 0.9rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          z-index: 1;
        }
        .wc-step-content strong {
          display: block;
          font-size: 0.93rem;
          color: #E8EDF2;
          margin-bottom: 0.3rem;
          padding-top: 6px;
        }
        .wc-step-content p {
          font-size: 0.84rem;
          color: #6B8299;
          line-height: 1.6;
          margin: 0;
        }

        /* ── CTA ── */
        .wc-cta-section {
          padding: 1rem 0;
        }
        .wc-cta-box {
          background: linear-gradient(135deg, #0A1628 0%, #071020 100%);
          border: 1px solid rgba(25,155,184,0.3);
          border-radius: 18px;
          padding: 2rem 1.5rem;
          text-align: center;
          box-shadow: 0 16px 48px rgba(0,0,0,0.4);
        }
        .wc-cta-title {
          font-size: 1.2rem;
          font-weight: 700;
          color: #E8EDF2;
          margin: 0 0 0.75rem;
        }
        .wc-cta-body {
          font-size: 0.9rem;
          color: #9BABC0;
          line-height: 1.7;
          margin: 0 0 1.5rem;
          max-width: 440px;
          margin-left: auto;
          margin-right: auto;
        }
        .wc-cta-btn {
          display: inline-block;
          background: #199BB8;
          color: #010611;
          font-weight: 700;
          font-size: 0.95rem;
          padding: 0.75rem 2rem;
          border-radius: 999px;
          text-decoration: none;
          transition: background 0.18s;
        }
        .wc-cta-btn:hover { background: rgba(25,155,184,0.85); }
      `}</style>
    </div>
  );
}
