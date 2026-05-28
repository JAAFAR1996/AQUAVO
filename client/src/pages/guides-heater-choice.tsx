export default function GuideHeaterChoice() {
  return (
    <div className="htr-wrap">

      <header className="htr-bar">
        <a href="/" className="htr-brand">AQUAVO</a>
      </header>

      <main className="htr-main">

        {/* ── Hero ── */}
        <section className="htr-hero">
          <span className="htr-badge">دليل الهيتر — AQUAVO</span>

          {/* Wattage gauge — CSS only */}
          <div className="htr-gauge-wrap" aria-hidden="true">
            <div className="htr-gauge">
              <div className="htr-gauge-arc"></div>
              <div className="htr-gauge-needle"></div>
              <div className="htr-gauge-center"></div>
            </div>
            <div className="htr-gauge-labels">
              <span>ضعيف</span>
              <span className="htr-gauge-safe">آمن</span>
              <span>زيادة</span>
            </div>
          </div>

          <h1>واط مو تخمين</h1>
          <p className="htr-sub">هيتر صغير جداً يُجهد السمچ — هيتر كبير جداً يحرق الحوض</p>
          <p className="htr-intro">
            قاعدة الواط لكل لتر هي الخطوة الأولى، لكن عوامل أخرى تحدد الاختيار الصح.
            هذا الدليل يعطيك الحساب الدقيق بدون تخمين.
          </p>
          <div className="htr-meta">
            <span>قبل كل شراء جديد</span>
            <span>وقت القراءة: 5 دقائق</span>
          </div>
        </section>

        {/* ── حساب الواط ── */}
        <section className="htr-section">
          <h2 className="htr-title">حساب واط الهيتر المناسب</h2>
          <p className="htr-body">
            القاعدة الأساسية: <strong className="htr-hl">١ واط لكل لتر</strong> كحد أدنى.
            لكن هذا فقط نقطة البداية.
          </p>
          <div className="htr-calc-table">
            <div className="htr-calc-row htr-calc-head">
              <span>حجم الحوض</span>
              <span>واط أدنى</span>
              <span>واط موصى</span>
            </div>
            <div className="htr-calc-row">
              <span>٢٠–٣٠ لتر</span>
              <span>٢٠–٣٠ واط</span>
              <span>٥٠ واط</span>
            </div>
            <div className="htr-calc-row">
              <span>٤٠–٦٠ لتر</span>
              <span>٤٠–٦٠ واط</span>
              <span>١٠٠ واط</span>
            </div>
            <div className="htr-calc-row">
              <span>٨٠–١٢٠ لتر</span>
              <span>٨٠–١٢٠ واط</span>
              <span>٢٠٠ واط</span>
            </div>
            <div className="htr-calc-row">
              <span>١٥٠–٢٠٠ لتر</span>
              <span>١٥٠–٢٠٠ واط</span>
              <span>٣٠٠ واط</span>
            </div>
          </div>
          <p className="htr-note">
            ⚠ إذا الجو بارد جداً في الغرفة أو الحوض بالقرب من مكيف — زد ٢٠–٣٠٪ إضافية.
          </p>
        </section>

        {/* ── عوامل الاختيار ── */}
        <section className="htr-section">
          <h2 className="htr-title">٤ عوامل تؤثر على الاختيار</h2>
          <div className="htr-factors">
            <div className="htr-factor">
              <div className="htr-factor-num">١</div>
              <div>
                <strong>فرق درجة الحرارة</strong>
                <p>كلما كان الفرق بين الغرفة ودرجة الحوض المطلوبة أكبر، كلما تحتاج واط أعلى.</p>
              </div>
            </div>
            <div className="htr-factor">
              <div className="htr-factor-num">٢</div>
              <div>
                <strong>نوع الهيتر (داخلي / خارجي / inline)</strong>
                <p>الهيتر الخارجي وinline أكثر كفاءة. الداخلي مناسب للأحواض الصغيرة.</p>
              </div>
            </div>
            <div className="htr-factor">
              <div className="htr-factor-num">٣</div>
              <div>
                <strong>موقع الهيتر في الحوض</strong>
                <p>ضعه بالقرب من مصدر تدفق الماء — يوزع الحرارة بشكل أفضل.</p>
              </div>
            </div>
            <div className="htr-factor">
              <div className="htr-factor-num">٤</div>
              <div>
                <strong>ثرموستات مستقل أو مدمج</strong>
                <p>الثرموستات المستقل يعطي تحكم أدق ويحمي من ارتفاع درجة الحرارة المفاجئ.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── علامات الهيتر الخاطئ ── */}
        <section className="htr-section">
          <h2 className="htr-title">علامات الهيتر غير المناسب</h2>
          <div className="htr-warn-list">
            <div className="htr-warn htr-warn-low">
              <span className="htr-warn-tag">واط قليل</span>
              <div>
                <strong>الحوض ما يوصل لدرجة الحرارة المطلوبة</strong>
                <p>الهيتر يشتغل بلا توقف ويستهلك — ويفشل بسرعة</p>
              </div>
            </div>
            <div className="htr-warn htr-warn-low">
              <span className="htr-warn-tag">واط قليل</span>
              <div>
                <strong>درجة الحرارة تتذبذب مع تغيرات الغرفة</strong>
                <p>تذبذب يومي يسبب إجهاد مزمن للسمچ</p>
              </div>
            </div>
            <div className="htr-warn htr-warn-high">
              <span className="htr-warn-tag htr-tag-high">واط زيادة</span>
              <div>
                <strong>درجة الحرارة ترتفع بسرعة لو الثرموستات فشل</strong>
                <p>هيتر ٣٠٠ واط في حوض ٢٠ لتر = خطر حقيقي</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="htr-cta-section">
          <div className="htr-cta-box">
            <h2 className="htr-cta-title">غير متأكد من الواط المناسب لحوضك؟</h2>
            <p className="htr-cta-body">
              أرسل حجم الحوض وموقعه (داخلي/خارجي) ودرجة الحرارة المطلوبة — نحسبها معك.
            </p>
            <a
              href="https://www.instagram.com/aquavoiq/"
              target="_blank"
              rel="noopener noreferrer"
              className="htr-cta-btn"
            >
              راسلنا على إنستغرام
            </a>
          </div>
        </section>

      </main>

      <style>{`
        .htr-wrap {
          min-height: 100vh;
          background: #0A0608;
          color: #E2E8F0;
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
          direction: rtl;
        }
        .htr-bar {
          position: sticky; top: 0; z-index: 50;
          height: 64px;
          background: rgba(10,6,8,0.96);
          backdrop-filter: blur(8px);
          border-bottom: 1px solid rgba(251,113,133,0.18);
          display: flex; align-items: center; padding: 0 1.25rem;
        }
        .htr-brand {
          color: #FB7185; font-weight: 700;
          letter-spacing: 4px; font-size: 1.1rem; text-decoration: none;
        }
        .htr-main {
          width: 100%; max-width: 720px;
          margin: 0 auto; padding: 2rem 1.25rem 5rem;
          display: flex; flex-direction: column; gap: 3.5rem;
        }

        /* Hero */
        .htr-hero { text-align: center; padding: 2rem 0; }
        .htr-badge {
          display: inline-block;
          border: 1px solid rgba(251,113,133,0.3);
          color: #FB7185; font-size: 0.7rem; font-weight: 700;
          letter-spacing: 1.5px; padding: 4px 14px; border-radius: 999px;
          margin-bottom: 1.75rem;
        }
        .htr-hero h1 {
          font-size: clamp(1.8rem, 6vw, 2.7rem);
          font-weight: 900; color: #FFF1F2;
          margin: 0 0 0.5rem; line-height: 1.15;
        }
        .htr-sub { font-size: 0.97rem; color: #FB7185; margin: 0 0 1rem; }
        .htr-intro { font-size: 0.93rem; color: #94A3B8; line-height: 1.75; max-width: 540px; margin: 0 auto 1.25rem; }
        .htr-meta {
          display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;
          font-size: 0.78rem; color: #475569;
        }

        /* Gauge visual */
        .htr-gauge-wrap { margin: 0 auto 2rem; display: flex; flex-direction: column; align-items: center; gap: 0.4rem; }
        .htr-gauge {
          width: 110px; height: 60px;
          position: relative; overflow: hidden;
        }
        .htr-gauge-arc {
          position: absolute; bottom: 0; left: 5px; right: 5px; height: 100px;
          border-radius: 100px 100px 0 0;
          background: conic-gradient(from 180deg at 50% 100%, #3B82F6 0deg, #22C55E 60deg, #EAB308 90deg, #EF4444 120deg, transparent 120deg);
          border: 2px solid rgba(255,255,255,0.07);
        }
        .htr-gauge-needle {
          position: absolute; bottom: 2px; left: 50%; width: 2px; height: 48px;
          background: #FB7185; transform-origin: bottom center;
          transform: translateX(-50%) rotate(-30deg);
          border-radius: 2px 2px 0 0;
        }
        .htr-gauge-center {
          position: absolute; bottom: -4px; left: 50%;
          width: 10px; height: 10px; border-radius: 50%;
          background: #FB7185; transform: translateX(-50%);
        }
        .htr-gauge-labels {
          display: flex; justify-content: space-between; width: 110px;
          font-size: 0.65rem; color: #64748B; font-weight: 600;
        }
        .htr-gauge-safe { color: #22C55E; }

        /* Titles */
        .htr-title {
          font-size: 1.25rem; font-weight: 800; color: #E2E8F0;
          margin: 0 0 1rem; border-right: 3px solid #FB7185; padding-right: 0.75rem;
        }
        .htr-body { font-size: 0.92rem; color: #94A3B8; line-height: 1.75; margin: 0 0 1rem; }
        .htr-hl { color: #FB7185; }

        /* Calc table */
        .htr-calc-table { display: flex; flex-direction: column; border-radius: 10px; overflow: hidden; border: 1px solid rgba(148,163,184,0.12); margin-bottom: 1rem; }
        .htr-calc-row {
          display: grid; grid-template-columns: 1.5fr 1fr 1fr;
          padding: 0.7rem 1rem; font-size: 0.86rem; color: #94A3B8;
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        .htr-calc-row:last-child { border-bottom: none; }
        .htr-calc-head { background: rgba(148,163,184,0.07); font-weight: 700; color: #CBD5E1; font-size: 0.78rem; }
        .htr-note { font-size: 0.82rem; color: #F59E0B; background: rgba(245,158,11,0.05); border: 1px solid rgba(245,158,11,0.15); border-radius: 8px; padding: 0.75rem 1rem; line-height: 1.6; }

        /* Factors */
        .htr-factors { display: flex; flex-direction: column; gap: 0.85rem; }
        .htr-factor {
          display: flex; gap: 0.9rem; align-items: flex-start;
          padding: 0.9rem; background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05); border-radius: 10px;
        }
        .htr-factor-num {
          min-width: 28px; height: 28px; border-radius: 50%;
          background: rgba(251,113,133,0.12); color: #FB7185;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.82rem; font-weight: 700; flex-shrink: 0;
        }
        .htr-factor strong { display: block; color: #E2E8F0; font-size: 0.92rem; margin-bottom: 0.25rem; }
        .htr-factor p { font-size: 0.83rem; color: #64748B; margin: 0; line-height: 1.6; }

        /* Warnings */
        .htr-warn-list { display: flex; flex-direction: column; gap: 0.8rem; }
        .htr-warn {
          display: flex; gap: 0.9rem; align-items: flex-start;
          padding: 0.9rem 1rem; border-radius: 10px; border: 1px solid transparent;
        }
        .htr-warn-low  { background: rgba(56,189,248,0.04); border-color: rgba(56,189,248,0.12); }
        .htr-warn-high { background: rgba(239,68,68,0.05); border-color: rgba(239,68,68,0.15); }
        .htr-warn-tag {
          min-width: 70px; font-size: 0.68rem; font-weight: 700;
          letter-spacing: 0.5px; flex-shrink: 0; padding-top: 3px;
          color: #38BDF8;
        }
        .htr-tag-high { color: #F87171; }
        .htr-warn strong { display: block; color: #E2E8F0; font-size: 0.9rem; margin-bottom: 0.2rem; }
        .htr-warn p { font-size: 0.82rem; color: #64748B; margin: 0; line-height: 1.5; }

        /* CTA */
        .htr-cta-box {
          background: rgba(251,113,133,0.05);
          border: 1px solid rgba(251,113,133,0.18);
          border-radius: 14px; padding: 2rem; text-align: center;
        }
        .htr-cta-title { font-size: 1.2rem; font-weight: 800; color: #E2E8F0; margin: 0 0 0.6rem; }
        .htr-cta-body { font-size: 0.9rem; color: #94A3B8; line-height: 1.7; margin: 0 0 1.5rem; }
        .htr-cta-btn {
          display: inline-block; background: #BE123C; color: #fff;
          font-weight: 700; font-size: 0.95rem; padding: 0.75rem 2rem;
          border-radius: 8px; text-decoration: none; transition: opacity 0.2s;
        }
        .htr-cta-btn:hover { opacity: 0.88; }
      `}</style>

    </div>
  );
}
