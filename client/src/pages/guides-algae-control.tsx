export default function GuideAlgaeControl() {
  return (
    <div className="alg-wrap">

      <header className="alg-bar">
        <a href="/" className="alg-brand">AQUAVO</a>
      </header>

      <main className="alg-main">

        {/* ── Hero ── */}
        <section className="alg-hero">
          <span className="alg-badge">دليل الطحالب — AQUAVO</span>

          {/* Glass pane with algae creep — CSS only */}
          <div className="alg-glass" aria-hidden="true">
            <div className="alg-pane">
              <div className="alg-creep alg-c1"></div>
              <div className="alg-creep alg-c2"></div>
              <div className="alg-creep alg-c3"></div>
              <div className="alg-clear-zone"></div>
            </div>
          </div>

          <h1>الظل الأخضر</h1>
          <p className="alg-sub">الطحالب ما هي عدوك — هي عَرَض، مو سبب</p>
          <p className="alg-intro">
            كل حوض يكون فيه طحالب. السؤال الصح: ليش تكثر؟ إذا عرفت السبب،
            توقفها بدون كيماويات وبدون ما تمحيها يومياً.
          </p>
          <div className="alg-meta">
            <span>للمبتدئين والمتوسطين</span>
            <span>وقت القراءة: 5 دقائق</span>
          </div>
        </section>

        {/* ── أنواع الطحالب ── */}
        <section className="alg-section">
          <h2 className="alg-title">٤ أنواع شائعة — كل نوع له سبب</h2>
          <div className="alg-type-list">
            <div className="alg-type">
              <div className="alg-type-color" style={{background:'#4ADE80'}}></div>
              <div>
                <strong>الطحالب الخضراء (على الزجاج)</strong>
                <p>ضوء زيادة أو نترات عالية. اكشط الزجاج + قلل ساعات الإضاءة.</p>
              </div>
            </div>
            <div className="alg-type">
              <div className="alg-type-color" style={{background:'#78350F'}}></div>
              <div>
                <strong>الطحالب البنية (على الحصى والديكور)</strong>
                <p>ضوء ضعيف + سيليكات في المي. شائعة في الأحواض الجديدة — تختفي وحدها.</p>
              </div>
            </div>
            <div className="alg-type">
              <div className="alg-type-color" style={{background:'#1F2937'}}></div>
              <div>
                <strong>الطحالب السوداء / الأزرق-خضراء</strong>
                <p>نترات وفوسفات عالية جداً + تدفق ضعيف. تحتاج تدخل: غسل وتحسين تدوير الماء.</p>
              </div>
            </div>
            <div className="alg-type">
              <div className="alg-type-color" style={{background:'#86EFAC'}}></div>
              <div>
                <strong>المي الأخضر (عوالق)</strong>
                <p>بكتيريا خضراء عائمة. سببها ضوء شمس مباشر أو تغذية زيادة. تحتاج UV أو تغطية.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── خطة الوقاية ── */}
        <section className="alg-section">
          <h2 className="alg-title">خطة الوقاية — ٤ محاور</h2>
          <div className="alg-plan-grid">
            <div className="alg-plan-card">
              <div className="alg-plan-icon">◑</div>
              <h3>الإضاءة</h3>
              <p>٨–١٠ ساعات بالنهار فقط. تايمر يضمن الانتظام. لا تشغل الضوء ليل النهار.</p>
            </div>
            <div className="alg-plan-card">
              <div className="alg-plan-icon">⬡</div>
              <h3>التغذية</h3>
              <p>دقيقتان تكفي. ما يُكل يصبح نترات — وقود الطحالب الرئيسي.</p>
            </div>
            <div className="alg-plan-card">
              <div className="alg-plan-icon">↺</div>
              <h3>تغيير المي</h3>
              <p>٢٠–٣٠٪ أسبوعياً يسحب النترات قبل تراكمها. هذا أفضل علاج وقائي.</p>
            </div>
            <div className="alg-plan-card">
              <div className="alg-plan-icon">⬢</div>
              <h3>الكائنات المساعدة</h3>
              <p>حلزون نيريت، أوتوسينكلوس، جمبري أمانو — يأكلون الطحالب طبيعياً دون كيماويات.</p>
            </div>
          </div>
        </section>

        {/* ── جدول الفحص ── */}
        <section className="alg-section">
          <h2 className="alg-title">متى تقلق؟ — مقياس السيطرة</h2>
          <div className="alg-scale">
            <div className="alg-scale-row alg-ok">
              <span className="alg-scale-label">طبيعي</span>
              <div>
                <strong>طبقة خفيفة على الزجاج بعد أسبوع</strong>
                <p>اكشطها وتابع الروتين — مو مشكلة.</p>
              </div>
            </div>
            <div className="alg-scale-row alg-watch">
              <span className="alg-scale-label">راقب</span>
              <div>
                <strong>تعود سريع خلال يومين</strong>
                <p>قلل الإضاءة ١ ساعة، راجع التغذية.</p>
              </div>
            </div>
            <div className="alg-scale-row alg-act">
              <span className="alg-scale-label">تصرف</span>
              <div>
                <strong>تغطي الديكور والنباتات</strong>
                <p>فحص فوري للنترات والفوسفات + تغيير مي ٤٠٪.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── ملاحظة الكيماويات ── */}
        <section className="alg-section">
          <div className="alg-note-box">
            <p className="alg-note-text">
              ⚠ منتجات قتل الطحالب الكيميائية تقتل البكتيريا النافعة في الفلتر وتضر بعض الأسماك.
              استخدمها فقط كآخر حل، وبعدها أعد بناء الدورة البيولوجية.
            </p>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="alg-cta-section">
          <div className="alg-cta-box">
            <h2 className="alg-cta-title">طحالبك ما تشبه أي نوع فوق؟</h2>
            <p className="alg-cta-body">
              أرسل صورة للحوض — نحدد النوع ونعطيك الخطوة الأولى الصح.
            </p>
            <a
              href="https://www.instagram.com/aquavo_iq/"
              target="_blank"
              rel="noopener noreferrer"
              className="alg-cta-btn"
            >
              راسلنا على إنستغرام
            </a>
          </div>
        </section>

      </main>

      <style>{`
        .alg-wrap {
          min-height: 100vh;
          background: #020B06;
          color: #E2E8F0;
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
          direction: rtl;
        }
        .alg-bar {
          position: sticky; top: 0; z-index: 50;
          height: 64px;
          background: rgba(2,11,6,0.96);
          backdrop-filter: blur(8px);
          border-bottom: 1px solid rgba(74,222,128,0.18);
          display: flex; align-items: center; padding: 0 1.25rem;
        }
        .alg-brand {
          color: #4ADE80; font-weight: 700;
          letter-spacing: 4px; font-size: 1.1rem; text-decoration: none;
        }
        .alg-main {
          width: 100%; max-width: 720px;
          margin: 0 auto; padding: 2rem 1.25rem 5rem;
          display: flex; flex-direction: column; gap: 3.5rem;
        }

        /* Hero */
        .alg-hero { text-align: center; padding: 2rem 0; }
        .alg-badge {
          display: inline-block;
          border: 1px solid rgba(74,222,128,0.3);
          color: #4ADE80; font-size: 0.7rem; font-weight: 700;
          letter-spacing: 1.5px; padding: 4px 14px; border-radius: 999px;
          margin-bottom: 1.75rem;
        }
        .alg-hero h1 {
          font-size: clamp(1.8rem, 6vw, 2.7rem);
          font-weight: 900; color: #F0FDF4;
          margin: 0 0 0.5rem; line-height: 1.15;
        }
        .alg-sub { font-size: 0.97rem; color: #4ADE80; margin: 0 0 1rem; }
        .alg-intro { font-size: 0.93rem; color: #94A3B8; line-height: 1.75; max-width: 540px; margin: 0 auto 1.25rem; }
        .alg-meta {
          display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;
          font-size: 0.78rem; color: #475569;
        }

        /* Glass visual */
        .alg-glass {
          width: 120px; height: 90px; margin: 0 auto 2rem;
          position: relative;
        }
        .alg-pane {
          width: 100%; height: 100%;
          border: 2px solid rgba(74,222,128,0.25);
          border-radius: 6px; overflow: hidden;
          background: rgba(2,20,10,0.8);
          position: relative;
        }
        .alg-creep {
          position: absolute; border-radius: 50%;
          background: rgba(74,222,128,0.25);
          filter: blur(8px);
          animation: alg-pulse 4s ease-in-out infinite;
        }
        .alg-c1 { width: 50px; height: 50px; bottom: -10px; right: -10px; }
        .alg-c2 { width: 35px; height: 35px; top: -5px; left: 10px; animation-delay: 1.3s; }
        .alg-c3 { width: 25px; height: 25px; bottom: 5px; left: 25px; animation-delay: 2.5s; }
        .alg-clear-zone {
          position: absolute; inset: 20px; border-radius: 4px;
          background: rgba(0,0,0,0.5);
        }
        @keyframes alg-pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }

        /* Titles */
        .alg-title {
          font-size: 1.25rem; font-weight: 800; color: #E2E8F0;
          margin: 0 0 1rem; border-right: 3px solid #4ADE80; padding-right: 0.75rem;
        }

        /* Algae types */
        .alg-type-list { display: flex; flex-direction: column; gap: 0.85rem; }
        .alg-type {
          display: flex; gap: 0.9rem; align-items: flex-start;
          padding: 0.9rem; background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05); border-radius: 10px;
        }
        .alg-type-color {
          min-width: 12px; height: 12px; border-radius: 50%;
          margin-top: 4px; flex-shrink: 0;
        }
        .alg-type strong { display: block; color: #E2E8F0; font-size: 0.9rem; margin-bottom: 0.2rem; }
        .alg-type p { font-size: 0.82rem; color: #64748B; margin: 0; line-height: 1.6; }

        /* Plan grid */
        .alg-plan-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;
        }
        @media (max-width: 480px) { .alg-plan-grid { grid-template-columns: 1fr; } }
        .alg-plan-card {
          background: rgba(74,222,128,0.04);
          border: 1px solid rgba(74,222,128,0.12);
          border-radius: 12px; padding: 1.25rem;
        }
        .alg-plan-icon { font-size: 1.4rem; color: #4ADE80; margin-bottom: 0.5rem; }
        .alg-plan-card h3 { font-size: 0.95rem; font-weight: 700; color: #E2E8F0; margin: 0 0 0.3rem; }
        .alg-plan-card p { font-size: 0.82rem; color: #64748B; margin: 0; line-height: 1.6; }

        /* Scale */
        .alg-scale { display: flex; flex-direction: column; gap: 0.7rem; }
        .alg-scale-row {
          display: flex; gap: 1rem; align-items: flex-start;
          padding: 0.9rem 1rem; border-radius: 10px; border: 1px solid transparent;
        }
        .alg-ok   { background: rgba(74,222,128,0.05); border-color: rgba(74,222,128,0.15); }
        .alg-watch{ background: rgba(251,191,36,0.05); border-color: rgba(251,191,36,0.15); }
        .alg-act  { background: rgba(239,68,68,0.05); border-color: rgba(239,68,68,0.15); }
        .alg-scale-label {
          min-width: 52px; font-size: 0.72rem; font-weight: 700;
          letter-spacing: 0.5px; padding-top: 3px; flex-shrink: 0;
        }
        .alg-ok   .alg-scale-label { color: #4ADE80; }
        .alg-watch .alg-scale-label { color: #FCD34D; }
        .alg-act  .alg-scale-label { color: #F87171; }
        .alg-scale-row strong { display: block; color: #E2E8F0; font-size: 0.9rem; margin-bottom: 0.2rem; }
        .alg-scale-row p { font-size: 0.82rem; color: #64748B; margin: 0; line-height: 1.5; }

        /* Note */
        .alg-note-box {
          background: rgba(239,68,68,0.05);
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 10px; padding: 1rem 1.25rem;
        }
        .alg-note-text { font-size: 0.85rem; color: #FCA5A5; line-height: 1.7; margin: 0; }

        /* CTA */
        .alg-cta-box {
          background: rgba(74,222,128,0.05);
          border: 1px solid rgba(74,222,128,0.2);
          border-radius: 14px; padding: 2rem; text-align: center;
        }
        .alg-cta-title { font-size: 1.2rem; font-weight: 800; color: #E2E8F0; margin: 0 0 0.6rem; }
        .alg-cta-body { font-size: 0.9rem; color: #94A3B8; line-height: 1.7; margin: 0 0 1.5rem; }
        .alg-cta-btn {
          display: inline-block; background: #16A34A; color: #fff;
          font-weight: 700; font-size: 0.95rem; padding: 0.75rem 2rem;
          border-radius: 8px; text-decoration: none; transition: opacity 0.2s;
        }
        .alg-cta-btn:hover { opacity: 0.88; }
      `}</style>

    </div>
  );
}
