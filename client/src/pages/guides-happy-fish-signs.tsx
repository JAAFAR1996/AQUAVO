export default function GuideHappyFishSigns() {
  return (
    <div className="hfs-wrap">

      <header className="hfs-bar">
        <a href="/" className="hfs-brand">AQUAVO</a>
      </header>

      <main className="hfs-main">

        {/* ── Hero ── */}
        <section className="hfs-hero">
          <span className="hfs-badge">دليل المراقبة — AQUAVO</span>

          {/* Porthole — observation window */}
          <div className="hfs-porthole" aria-hidden="true">
            <div className="hfs-porthole-glass">
              <div className="hfs-bubble hfs-b1"></div>
              <div className="hfs-bubble hfs-b2"></div>
              <div className="hfs-bubble hfs-b3"></div>
              <div className="hfs-porthole-water"></div>
            </div>
            <div className="hfs-porthole-ring"></div>
          </div>

          <h1>إشارات الهدوء</h1>
          <p className="hfs-sub">السمچ الصحي يقولك بجسمه — لو تعرف كيف تسمع</p>
          <p className="hfs-intro">
            ما تحتاج مختبر تعرف وضع السمچ. دقيقتين يومياً تراقب فيها الحركة والسلوك
            تكفي تكشف أي مشكلة قبل ما تتحول لأزمة.
          </p>
          <div className="hfs-meta">
            <span>للمتابعة اليومية</span>
            <span>وقت القراءة: 5 دقائق</span>
          </div>
        </section>

        {/* ── العلامات الست ── */}
        <section className="hfs-section">
          <h2 className="hfs-title">٦ علامات تقول السمچ بخير</h2>
          <p className="hfs-body">هذه الإشارات تعني الحوض يسير صح وما يحتاج تدخل:</p>

          <div className="hfs-signs-grid">
            <div className="hfs-sign-card">
              <div className="hfs-sign-num">١</div>
              <h3>السباحة بنشاط وتوازن</h3>
              <p>
                السمچ الصحي يسبح بخط مستقيم دون انحراف أو تأرجح.
                إذا تحرك بشكل طبيعي دون جهد — جيد.
              </p>
            </div>
            <div className="hfs-sign-card">
              <div className="hfs-sign-num">٢</div>
              <h3>يأكل بشهية عند التغذية</h3>
              <p>
                السمچ يجي للأعلى أو يسبح نحو الأكل بسرعة.
                الرفض المتكرر للأكل إشارة مبكرة لمشكلة.
              </p>
            </div>
            <div className="hfs-sign-card">
              <div className="hfs-sign-num">٣</div>
              <h3>ألوانه واضحة وثابتة</h3>
              <p>
                شحوب الألوان أو ظهور بقع بيضاء أو داكنة
                يحتاج مراجعة. الألوان الطبيعية = صحة طبيعية.
              </p>
            </div>
            <div className="hfs-sign-card">
              <div className="hfs-sign-num">٤</div>
              <h3>الزعانف مفتوحة ومتحركة</h3>
              <p>
                زعانف مطوية أو ملصقة بالجسم تعني إجهاد أو مرض.
                الزعانف المفتوحة = راحة واستقرار.
              </p>
            </div>
            <div className="hfs-sign-card">
              <div className="hfs-sign-num">٥</div>
              <h3>يستكشف ولا يختبي باستمرار</h3>
              <p>
                السمچ الصحي فضولي ويتحرك في الحوض.
                الاختباء المستمر أو التجمع في زاوية يحتاج انتباه.
              </p>
            </div>
            <div className="hfs-sign-card">
              <div className="hfs-sign-num">٦</div>
              <h3>تنفسه هادي ومنتظم</h3>
              <p>
                حركة الخياشيم سريعة جداً تعني نقص أكسجين أو إجهاد.
                التنفس الهادي والمنتظم = مؤشر صحة جيد.
              </p>
            </div>
          </div>
        </section>

        {/* ── الروتين اليومي ── */}
        <section className="hfs-section">
          <h2 className="hfs-title">روتين المراقبة اليومي — دقيقتان</h2>
          <div className="hfs-routine">
            <div className="hfs-routine-step">
              <span className="hfs-r-time">صباح</span>
              <div>
                <strong>قبل التغذية</strong>
                <p>شوف كل سمچة تسبح. لاحظ أي حركة غريبة أو بقعة جديدة.</p>
              </div>
            </div>
            <div className="hfs-routine-step">
              <span className="hfs-r-time">أثناء الأكل</span>
              <div>
                <strong>راقب الشهية</strong>
                <p>من ما أكل أو ما جاء للسطح؟ هذا أول مؤشر على مشكلة صحية.</p>
              </div>
            </div>
            <div className="hfs-routine-step">
              <span className="hfs-r-time">مساء</span>
              <div>
                <strong>تفقد الزجاج والقاع</strong>
                <p>أي بقع بيضاء، طحالب جديدة، أو سمچة على القاع بدون حراك.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── علامات التحذير ── */}
        <section className="hfs-section">
          <h2 className="hfs-title">متى تقلق؟ — علامات التحذير</h2>
          <div className="hfs-warn-list">
            <div className="hfs-warn">
              <span className="hfs-warn-dot"></span>
              <div>
                <strong>السمچ على السطح يشرب الهواء</strong>
                <p>نقص أكسجين — راجع التهوية والحرارة فوراً</p>
              </div>
            </div>
            <div className="hfs-warn">
              <span className="hfs-warn-dot"></span>
              <div>
                <strong>حك على الحصى أو الزجاج</strong>
                <p>علامة لطفيليات خارجية — عزل وفحص</p>
              </div>
            </div>
            <div className="hfs-warn">
              <span className="hfs-warn-dot"></span>
              <div>
                <strong>انتفاخ في الجسم أو البطن</strong>
                <p>احتمال إمساك أو عدوى داخلية — يحتاج تشخيص</p>
              </div>
            </div>
            <div className="hfs-warn">
              <span className="hfs-warn-dot"></span>
              <div>
                <strong>بقع بيضاء صغيرة كالملح على الجسم</strong>
                <p>ايچ — طفيلي شائع يحتاج علاج سريع</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="hfs-cta-section">
          <div className="hfs-cta-box">
            <h2 className="hfs-cta-title">لاحظت شي مو طبيعي؟</h2>
            <p className="hfs-cta-body">
              أرسل صورة أو فيديو للسمچة — نساعدك تشخص الموضوع بشكل أدق.
            </p>
            <a
              href="https://www.instagram.com/aquavoiq/"
              target="_blank"
              rel="noopener noreferrer"
              className="hfs-cta-btn"
            >
              راسلنا على إنستغرام
            </a>
          </div>
        </section>

      </main>

      <style>{`
        .hfs-wrap {
          min-height: 100vh;
          background: #030A10;
          color: #E2E8F0;
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
          direction: rtl;
        }
        .hfs-bar {
          position: sticky; top: 0; z-index: 50;
          height: 64px;
          background: rgba(3,10,16,0.96);
          backdrop-filter: blur(8px);
          border-bottom: 1px solid rgba(16,185,129,0.18);
          display: flex; align-items: center; padding: 0 1.25rem;
        }
        .hfs-brand {
          color: #10B981; font-weight: 700;
          letter-spacing: 4px; font-size: 1.1rem; text-decoration: none;
        }
        .hfs-main {
          width: 100%; max-width: 720px;
          margin: 0 auto; padding: 2rem 1.25rem 5rem;
          display: flex; flex-direction: column; gap: 3.5rem;
        }

        /* Hero */
        .hfs-hero { text-align: center; padding: 2rem 0; }
        .hfs-badge {
          display: inline-block;
          border: 1px solid rgba(16,185,129,0.35);
          color: #10B981; font-size: 0.7rem; font-weight: 700;
          letter-spacing: 1.5px; padding: 4px 14px; border-radius: 999px;
          margin-bottom: 1.75rem;
        }
        .hfs-hero h1 {
          font-size: clamp(2rem, 6.5vw, 2.9rem);
          font-weight: 900; color: #ECFDF5;
          margin: 0 0 0.5rem;
        }
        .hfs-sub { font-size: 1rem; color: #10B981; margin: 0 0 1rem; }
        .hfs-intro { font-size: 0.93rem; color: #94A3B8; line-height: 1.75; max-width: 540px; margin: 0 auto 1.25rem; }
        .hfs-meta {
          display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;
          font-size: 0.78rem; color: #64748B;
        }

        /* Porthole */
        .hfs-porthole {
          width: 130px; height: 130px; margin: 0 auto 2rem;
          position: relative;
        }
        .hfs-porthole-ring {
          position: absolute; inset: 0; border-radius: 50%;
          border: 4px solid rgba(16,185,129,0.35);
        }
        .hfs-porthole-glass {
          position: absolute; inset: 8px; border-radius: 50%;
          background: radial-gradient(circle at 40% 35%, rgba(16,185,129,0.15), rgba(3,10,16,0.9));
          overflow: hidden;
        }
        .hfs-porthole-water {
          position: absolute; bottom: 0; left: 0; right: 0; height: 40%;
          background: rgba(16,185,129,0.08);
          border-top: 1px solid rgba(16,185,129,0.2);
        }
        .hfs-bubble {
          position: absolute; border-radius: 50%;
          background: rgba(16,185,129,0.25);
          animation: hfs-rise 3s ease-in-out infinite;
        }
        .hfs-b1 { width: 8px; height: 8px; right: 35%; bottom: 10%; animation-delay: 0s; }
        .hfs-b2 { width: 5px; height: 5px; right: 55%; bottom: 20%; animation-delay: 1s; }
        .hfs-b3 { width: 6px; height: 6px; right: 25%; bottom: 30%; animation-delay: 2s; }
        @keyframes hfs-rise {
          0% { transform: translateY(0); opacity: 0.6; }
          100% { transform: translateY(-60px); opacity: 0; }
        }

        /* Titles */
        .hfs-title {
          font-size: 1.3rem; font-weight: 800; color: #E2E8F0;
          margin: 0 0 0.75rem; border-right: 3px solid #10B981; padding-right: 0.75rem;
        }
        .hfs-body { font-size: 0.92rem; color: #94A3B8; line-height: 1.75; margin: 0 0 1.25rem; }

        /* Signs grid */
        .hfs-signs-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;
        }
        @media (max-width: 480px) { .hfs-signs-grid { grid-template-columns: 1fr; } }
        .hfs-sign-card {
          background: rgba(16,185,129,0.04);
          border: 1px solid rgba(16,185,129,0.1);
          border-radius: 12px; padding: 1.25rem;
          position: relative;
        }
        .hfs-sign-num {
          position: absolute; top: 1rem; left: 1rem;
          font-size: 0.7rem; font-weight: 800;
          color: rgba(16,185,129,0.6); letter-spacing: 0.5px;
        }
        .hfs-sign-card h3 {
          font-size: 0.9rem; font-weight: 700; color: #A7F3D0;
          margin: 0 0 0.4rem; line-height: 1.3;
        }
        .hfs-sign-card p { font-size: 0.82rem; color: #64748B; margin: 0; line-height: 1.6; }

        /* Routine */
        .hfs-routine { display: flex; flex-direction: column; gap: 1rem; }
        .hfs-routine-step {
          display: flex; gap: 1rem; align-items: flex-start;
          padding: 1rem; background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05); border-radius: 10px;
        }
        .hfs-r-time {
          min-width: 80px; font-size: 0.75rem; font-weight: 700;
          color: #10B981; letter-spacing: 0.5px; padding-top: 2px;
        }
        .hfs-routine-step strong { display: block; color: #E2E8F0; font-size: 0.92rem; margin-bottom: 0.25rem; }
        .hfs-routine-step p { font-size: 0.85rem; color: #64748B; margin: 0; line-height: 1.6; }

        /* Warnings */
        .hfs-warn-list { display: flex; flex-direction: column; gap: 0.9rem; }
        .hfs-warn { display: flex; gap: 0.9rem; align-items: flex-start; }
        .hfs-warn-dot { min-width: 8px; height: 8px; border-radius: 50%; background: #F87171; margin-top: 6px; flex-shrink: 0; }
        .hfs-warn strong { display: block; color: #E2E8F0; font-size: 0.92rem; margin-bottom: 0.2rem; }
        .hfs-warn p { font-size: 0.83rem; color: #64748B; margin: 0; line-height: 1.6; }

        /* CTA */
        .hfs-cta-box {
          background: rgba(16,185,129,0.06);
          border: 1px solid rgba(16,185,129,0.2);
          border-radius: 14px; padding: 2rem; text-align: center;
        }
        .hfs-cta-title { font-size: 1.2rem; font-weight: 800; color: #E2E8F0; margin: 0 0 0.6rem; }
        .hfs-cta-body { font-size: 0.9rem; color: #94A3B8; line-height: 1.7; margin: 0 0 1.5rem; }
        .hfs-cta-btn {
          display: inline-block; background: #10B981; color: #fff;
          font-weight: 700; font-size: 0.95rem; padding: 0.75rem 2rem;
          border-radius: 8px; text-decoration: none; transition: opacity 0.2s;
        }
        .hfs-cta-btn:hover { opacity: 0.88; }
      `}</style>

    </div>
  );
}
