export default function GuideQuarantine() {
  return (
    <div className="qrn-wrap">

      <header className="qrn-bar">
        <a href="/" className="qrn-brand">AQUAVO</a>
      </header>

      <main className="qrn-main">

        {/* ── Hero ── */}
        <section className="qrn-hero">
          <span className="qrn-badge">دليل العزل — AQUAVO</span>

          {/* Quiet isolation tank — CSS only */}
          <div className="qrn-tank-wrap" aria-hidden="true">
            <div className="qrn-tank">
              <div className="qrn-water"></div>
              <div className="qrn-fish"></div>
              <div className="qrn-bubble qrn-bbl1"></div>
              <div className="qrn-bubble qrn-bbl2"></div>
            </div>
            <div className="qrn-label">حوض العزل</div>
          </div>

          <h1>الغرفة الهادية</h1>
          <p className="qrn-sub">أسبوعان تحمي فيهم الحوض كله من مرض واحد</p>
          <p className="qrn-intro">
            حوض العزل ليس رفاهية — هو ضرورة لكل من يضيف سمچ جديد.
            سمچة واحدة مريضة بدون عزل تكفي لتفشي مرض في الحوض بأكمله خلال أيام.
          </p>
          <div className="qrn-meta">
            <span>ضروري عند كل إضافة جديدة</span>
            <span>وقت القراءة: 5 دقائق</span>
          </div>
        </section>

        {/* ── متطلبات حوض العزل ── */}
        <section className="qrn-section">
          <h2 className="qrn-title">ما تحتاجه لحوض عزل بسيط</h2>
          <div className="qrn-req-grid">
            <div className="qrn-req">
              <div className="qrn-req-icon">⬡</div>
              <strong>حجم الحوض</strong>
              <p>١٠–٢٠ لتر تكفي لمعظم الأسماك الصغيرة. لا تحتاج حجماً كبيراً.</p>
            </div>
            <div className="qrn-req">
              <div className="qrn-req-icon">⬡</div>
              <strong>فلتر إسفنج بسيط</strong>
              <p>ضعه في الحوض الرئيسي أسبوعاً قبل الاستخدام لتنشيطه بالبكتيريا.</p>
            </div>
            <div className="qrn-req">
              <div className="qrn-req-icon">⬡</div>
              <strong>هيتر صغير</strong>
              <p>حافظ على نفس درجة حرارة الحوض الرئيسي — الفرق يضيف إجهاداً.</p>
            </div>
            <div className="qrn-req">
              <div className="qrn-req-icon">⬡</div>
              <strong>غطاء بسيط</strong>
              <p>السمچ المريض أو الخائف يقفز. غطاء يحمي ويقلل الإجهاد.</p>
            </div>
          </div>
        </section>

        {/* ── جدول العزل ── */}
        <section className="qrn-section">
          <h2 className="qrn-title">جدول الأسبوعين</h2>
          <div className="qrn-timeline">
            <div className="qrn-tl-item">
              <div className="qrn-tl-day">يوم ١</div>
              <div className="qrn-tl-body">
                <strong>الانتقال والتأقلم</strong>
                <p>أضف السمچ ببطء — خلط الماء التدريجي على ٣٠ دقيقة. راقب التنفس والحركة.</p>
              </div>
            </div>
            <div className="qrn-tl-item">
              <div className="qrn-tl-day">أيام ٢–٧</div>
              <div className="qrn-tl-body">
                <strong>المراقبة الأولى</strong>
                <p>راقب يومياً: بقع، أعراض، شهية. إذا ظهر شيء — ابدأ العلاج فوراً.</p>
              </div>
            </div>
            <div className="qrn-tl-item">
              <div className="qrn-tl-day">أيام ٨–١٤</div>
              <div className="qrn-tl-body">
                <strong>المراقبة النهائية</strong>
                <p>استمر بالمراقبة. بعض الأمراض لا تظهر قبل الأسبوع الثاني.</p>
              </div>
            </div>
            <div className="qrn-tl-item qrn-tl-done">
              <div className="qrn-tl-day">يوم ١٥+</div>
              <div className="qrn-tl-body">
                <strong>آمن للنقل</strong>
                <p>إذا لا أعراض طوال ١٤ يوماً — السمچ جاهز للانتقال للحوض الرئيسي.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── متى تعزل ── */}
        <section className="qrn-section">
          <h2 className="qrn-title">متى يجب العزل؟</h2>
          <div className="qrn-when-list">
            <div className="qrn-when qrn-when-must">
              <span className="qrn-when-tag">دائماً</span>
              <div>
                <strong>أي سمچ جديد قبل إضافته للحوض الرئيسي</strong>
              </div>
            </div>
            <div className="qrn-when qrn-when-must">
              <span className="qrn-when-tag">دائماً</span>
              <div>
                <strong>سمچ يظهر عليه بقع بيضاء أو يحك على الحصى</strong>
              </div>
            </div>
            <div className="qrn-when qrn-when-must">
              <span className="qrn-when-tag">دائماً</span>
              <div>
                <strong>سمچ متوقف عن الأكل أكثر من ٣ أيام مع أعراض</strong>
              </div>
            </div>
            <div className="qrn-when qrn-when-consider">
              <span className="qrn-when-tag qrn-tag-consider">فكّر</span>
              <div>
                <strong>سمچ تتعرض له الأسماك الأخرى بعدوانية</strong>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="qrn-cta-section">
          <div className="qrn-cta-box">
            <h2 className="qrn-cta-title">عندك سمچ محتاج عزل وما عندك حوض عزل؟</h2>
            <p className="qrn-cta-body">
              نساعدك تبني حوض عزل مؤقت بما لديك. أرسل لنا وضعك الحالي.
            </p>
            <a
              href="https://www.instagram.com/aquavoiq/"
              target="_blank"
              rel="noopener noreferrer"
              className="qrn-cta-btn"
            >
              راسلنا على إنستغرام
            </a>
          </div>
        </section>

      </main>

      <style>{`
        .qrn-wrap {
          min-height: 100vh;
          background: #040C14;
          color: #E2E8F0;
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
          direction: rtl;
        }
        .qrn-bar {
          position: sticky; top: 0; z-index: 50;
          height: 64px;
          background: rgba(4,12,20,0.96);
          backdrop-filter: blur(8px);
          border-bottom: 1px solid rgba(56,189,248,0.15);
          display: flex; align-items: center; padding: 0 1.25rem;
        }
        .qrn-brand {
          color: #38BDF8; font-weight: 700;
          letter-spacing: 4px; font-size: 1.1rem; text-decoration: none;
        }
        .qrn-main {
          width: 100%; max-width: 720px;
          margin: 0 auto; padding: 2rem 1.25rem 5rem;
          display: flex; flex-direction: column; gap: 3.5rem;
        }

        /* Hero */
        .qrn-hero { text-align: center; padding: 2rem 0; }
        .qrn-badge {
          display: inline-block;
          border: 1px solid rgba(56,189,248,0.3);
          color: #38BDF8; font-size: 0.7rem; font-weight: 700;
          letter-spacing: 1.5px; padding: 4px 14px; border-radius: 999px;
          margin-bottom: 1.75rem;
        }
        .qrn-hero h1 {
          font-size: clamp(1.8rem, 6vw, 2.7rem);
          font-weight: 900; color: #F0F9FF;
          margin: 0 0 0.5rem; line-height: 1.15;
        }
        .qrn-sub { font-size: 0.97rem; color: #38BDF8; margin: 0 0 1rem; }
        .qrn-intro { font-size: 0.93rem; color: #94A3B8; line-height: 1.75; max-width: 540px; margin: 0 auto 1.25rem; }
        .qrn-meta {
          display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;
          font-size: 0.78rem; color: #475569;
        }

        /* Tank visual */
        .qrn-tank-wrap { margin: 0 auto 2rem; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; width: 120px; }
        .qrn-tank {
          width: 100%; height: 75px;
          border: 2px solid rgba(56,189,248,0.25); border-radius: 6px 6px 4px 4px;
          background: rgba(4,20,35,0.9); position: relative; overflow: hidden;
        }
        .qrn-water {
          position: absolute; bottom: 0; left: 0; right: 0; height: 60%;
          background: rgba(56,189,248,0.07);
          border-top: 1px solid rgba(56,189,248,0.2);
        }
        .qrn-fish {
          position: absolute; top: 50%; right: 50%; transform: translate(50%, -50%);
          width: 18px; height: 10px;
          background: rgba(56,189,248,0.4); border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
        }
        .qrn-bubble {
          position: absolute; border-radius: 50%;
          background: rgba(56,189,248,0.2);
          animation: qrn-rise 3s ease-in-out infinite;
        }
        .qrn-bbl1 { width: 6px; height: 6px; right: 30%; bottom: 8%; }
        .qrn-bbl2 { width: 4px; height: 4px; right: 50%; bottom: 15%; animation-delay: 1.5s; }
        @keyframes qrn-rise {
          0% { transform: translateY(0); opacity: 0.6; }
          100% { transform: translateY(-50px); opacity: 0; }
        }
        .qrn-label { font-size: 0.65rem; color: #38BDF8; letter-spacing: 2px; font-weight: 700; }

        /* Titles */
        .qrn-title {
          font-size: 1.25rem; font-weight: 800; color: #E2E8F0;
          margin: 0 0 1rem; border-right: 3px solid #38BDF8; padding-right: 0.75rem;
        }

        /* Req grid */
        .qrn-req-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;
        }
        @media (max-width: 480px) { .qrn-req-grid { grid-template-columns: 1fr; } }
        .qrn-req {
          background: rgba(56,189,248,0.04);
          border: 1px solid rgba(56,189,248,0.12);
          border-radius: 12px; padding: 1.25rem;
        }
        .qrn-req-icon { font-size: 1.2rem; color: rgba(56,189,248,0.5); margin-bottom: 0.4rem; }
        .qrn-req strong { display: block; font-size: 0.9rem; color: #BAE6FD; margin-bottom: 0.3rem; }
        .qrn-req p { font-size: 0.82rem; color: #64748B; margin: 0; line-height: 1.6; }

        /* Timeline */
        .qrn-timeline { display: flex; flex-direction: column; gap: 0; }
        .qrn-tl-item {
          display: flex; gap: 1rem; align-items: flex-start;
          padding: 1rem;
          border-right: 2px solid rgba(56,189,248,0.2);
          margin-right: 0.75rem;
          position: relative;
        }
        .qrn-tl-item::before {
          content: '';
          position: absolute; right: -5px; top: 1.2rem;
          width: 8px; height: 8px; border-radius: 50%;
          background: rgba(56,189,248,0.4);
        }
        .qrn-tl-done::before { background: #38BDF8; }
        .qrn-tl-day {
          min-width: 80px; font-size: 0.72rem; font-weight: 700;
          color: #38BDF8; letter-spacing: 0.5px; padding-top: 2px; flex-shrink: 0;
        }
        .qrn-tl-body strong { display: block; color: #E2E8F0; font-size: 0.92rem; margin-bottom: 0.25rem; }
        .qrn-tl-body p { font-size: 0.83rem; color: #64748B; margin: 0; line-height: 1.6; }

        /* When list */
        .qrn-when-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .qrn-when {
          display: flex; gap: 0.9rem; align-items: center;
          padding: 0.85rem 1rem; border-radius: 10px; border: 1px solid transparent;
        }
        .qrn-when-must { background: rgba(239,68,68,0.05); border-color: rgba(239,68,68,0.15); }
        .qrn-when-consider { background: rgba(251,191,36,0.04); border-color: rgba(251,191,36,0.12); }
        .qrn-when-tag {
          min-width: 46px; font-size: 0.68rem; font-weight: 700;
          letter-spacing: 0.5px; text-align: center; flex-shrink: 0;
          padding: 2px 0;
          background: rgba(239,68,68,0.15); color: #F87171;
          border-radius: 4px;
        }
        .qrn-tag-consider { background: rgba(251,191,36,0.12); color: #FCD34D; }
        .qrn-when strong { font-size: 0.9rem; color: #E2E8F0; }

        /* CTA */
        .qrn-cta-box {
          background: rgba(56,189,248,0.05);
          border: 1px solid rgba(56,189,248,0.18);
          border-radius: 14px; padding: 2rem; text-align: center;
        }
        .qrn-cta-title { font-size: 1.2rem; font-weight: 800; color: #E2E8F0; margin: 0 0 0.6rem; }
        .qrn-cta-body { font-size: 0.9rem; color: #94A3B8; line-height: 1.7; margin: 0 0 1.5rem; }
        .qrn-cta-btn {
          display: inline-block; background: #0284C7; color: #fff;
          font-weight: 700; font-size: 0.95rem; padding: 0.75rem 2rem;
          border-radius: 8px; text-decoration: none; transition: opacity 0.2s;
        }
        .qrn-cta-btn:hover { opacity: 0.88; }
      `}</style>

    </div>
  );
}
