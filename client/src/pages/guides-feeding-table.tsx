export default function GuideFeedingTable() {
  return (
    <div className="fd-wrap">

      <header className="fd-bar">
        <a href="/" className="fd-brand">AQUAVO</a>
      </header>

      <main className="fd-main">

        {/* ── Hero ── */}
        <section className="fd-hero">
          <span className="fd-badge">جدول التغذية — AQUAVO</span>

          {/* Two-minute visual timer */}
          <div className="fd-timer" aria-hidden="true">
            <svg viewBox="0 0 120 120" className="fd-timer-svg">
              <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(99,102,241,0.12)" strokeWidth="6"/>
              <circle cx="60" cy="60" r="52" fill="none" stroke="#6366F1" strokeWidth="6"
                strokeDasharray="326.7" strokeDashoffset="81.7"
                strokeLinecap="round"
                transform="rotate(-90 60 60)"/>
            </svg>
            <div className="fd-timer-inner">
              <span className="fd-timer-num">٢</span>
              <span className="fd-timer-lbl">دقيقة</span>
            </div>
          </div>

          <h1>دقيقتين تكفي</h1>
          <p className="fd-sub">الإفراط في الأكل يعكر المي أسرع من أي شي ثاني</p>
          <p className="fd-intro">
            القاعدة الذهبية: ما يأكله السمچ خلال دقيقتين — هذا هو الحد. كل ما يبقى
            بالمي يتحلل ويرفع الأمونيا ويدمر الدورة البيولوجية.
          </p>
          <div className="fd-meta">
            <span>لكل أصحاب الأحواض</span>
            <span>وقت القراءة: 5 دقائق</span>
          </div>
        </section>

        {/* ── الكمية الصحيحة ── */}
        <section className="fd-section">
          <h2 className="fd-title">الكمية الصحيحة حسب حجم السمچ</h2>
          <p className="fd-body">
            ما فيه كمية ثابتة بالغرام — القاعدة هي دقيقتين. لكن حجم السمچ يحدد كم حبة تبدأ بيها.
          </p>

          <div className="fd-size-grid">
            <div className="fd-size-card">
              <div className="fd-size-icon">◉</div>
              <div className="fd-size-name">سمچ صغير</div>
              <div className="fd-size-sub">أقل من 3 سم</div>
              <div className="fd-size-rule">٣–٤ حبات<br/>مرتين بالنهار</div>
              <div className="fd-size-note">الحبات الصغيرة أو الغبار — حجم الفم</div>
            </div>
            <div className="fd-size-card">
              <div className="fd-size-icon">◎</div>
              <div className="fd-size-name">سمچ متوسط</div>
              <div className="fd-size-sub">٣–٨ سم</div>
              <div className="fd-size-rule">٥–٧ حبات<br/>مرتين بالنهار</div>
              <div className="fd-size-note">حبات أكبر مناسبة لحجم الفم</div>
            </div>
            <div className="fd-size-card">
              <div className="fd-size-icon">○</div>
              <div className="fd-size-name">سمچ كبير</div>
              <div className="fd-size-sub">فوق 8 سم</div>
              <div className="fd-size-rule">٨–١٢ حبة<br/>مرة أو مرتين</div>
              <div className="fd-size-note">راقب خلال دقيقتين — ما يبقى = ما يأكله</div>
            </div>
          </div>
        </section>

        {/* ── التوقيت ── */}
        <section className="fd-section">
          <h2 className="fd-title">التوقيت الصح — متى تطعم؟</h2>
          <div className="fd-timing-list">
            <div className="fd-timing-row">
              <div className="fd-timing-time">صباح</div>
              <div className="fd-timing-desc">
                <strong>الوجبة الأولى</strong>
                <p>بعد ساعة من تشغيل الإضاءة — السمچ أنشط وأكثر استعداداً</p>
              </div>
            </div>
            <div className="fd-timing-row">
              <div className="fd-timing-time">مساء</div>
              <div className="fd-timing-desc">
                <strong>الوجبة الثانية</strong>
                <p>قبل ساعتين من إطفاء الإضاءة — وقت كافٍ للهضم قبل النوم</p>
              </div>
            </div>
            <div className="fd-timing-row fd-timing-never">
              <div className="fd-timing-time">ليل</div>
              <div className="fd-timing-desc">
                <strong>لا تطعم بالليل</strong>
                <p>السمچ نائم والأكل يتحلل بالمي طول الليل — ضرر بدون فائدة</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── علامات الإفراط ── */}
        <section className="fd-section">
          <h2 className="fd-title">كيف تعرف أنك تطعم كثير؟</h2>
          <p className="fd-body">هاي العلامات تظهر قبل ما ترى أي سمچة تتأثر:</p>
          <div className="fd-warning-list">
            <div className="fd-warning">
              <span className="fd-w-dot"></span>
              <div>
                <strong>المي يبين ضبابي أو أبيض</strong>
                <p>تكاثر بكتيري بسبب بقايا الأكل — علامة واضحة على إفراط</p>
              </div>
            </div>
            <div className="fd-warning">
              <span className="fd-w-dot"></span>
              <div>
                <strong>رائحة من الحوض</strong>
                <p>الأكل يتعفن على قاع الحوض أو في الحصى</p>
              </div>
            </div>
            <div className="fd-warning">
              <span className="fd-w-dot"></span>
              <div>
                <strong>طحالب تنمو سريع</strong>
                <p>بقايا الأكل ترفع النترات — وقود الطحالب</p>
              </div>
            </div>
            <div className="fd-warning">
              <span className="fd-w-dot"></span>
              <div>
                <strong>السمچ يوقف الأكل بسرعة</strong>
                <p>معدة ممتلئة من الوجبة السابقة — خفف الكمية</p>
              </div>
            </div>
            <div className="fd-warning">
              <span className="fd-w-dot"></span>
              <div>
                <strong>بقايا أكل على القاع</strong>
                <p>تشيلها مباشرة بالسايفون وتوقف التغذية يوماً</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── يوم الصيام ── */}
        <section className="fd-section">
          <h2 className="fd-title">يوم الصيام — مرة بالأسبوع</h2>
          <p className="fd-body">
            يوم بدون أكل مرة بالأسبوع يفيد الحوض: يعطي الفلتر وقت يستعيد، ويقلل بقايا الأكل
            المتراكمة في الحصى. السمچ الصحي يتحمله بدون مشكلة.
          </p>
        </section>

        {/* ── CTA ── */}
        <section className="fd-cta-section">
          <div className="fd-cta-box">
            <h2 className="fd-cta-title">تريد جدول مناسب لسمچك تحديداً؟</h2>
            <p className="fd-cta-body">
              أرسل نوع السمچ وحجمه وعدده — ونرتبلك جدول تغذية مناسب.
            </p>
            <a
              href="https://www.instagram.com/aquavo_iq/"
              target="_blank"
              rel="noopener noreferrer"
              className="fd-cta-btn"
            >
              راسلنا على إنستغرام
            </a>
          </div>
        </section>

      </main>

      <style>{`
        .fd-wrap {
          min-height: 100vh;
          background: #06050F;
          color: #E2E8F0;
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
          direction: rtl;
        }
        .fd-bar {
          position: sticky; top: 0; z-index: 50;
          height: 64px;
          background: rgba(6,5,15,0.96);
          backdrop-filter: blur(8px);
          border-bottom: 1px solid rgba(99,102,241,0.2);
          display: flex; align-items: center; padding: 0 1.25rem;
        }
        .fd-brand {
          color: #818CF8; font-weight: 700;
          letter-spacing: 4px; font-size: 1.1rem; text-decoration: none;
        }
        .fd-main {
          width: 100%; max-width: 720px;
          margin: 0 auto; padding: 2rem 1.25rem 5rem;
          display: flex; flex-direction: column; gap: 3.5rem;
        }

        /* Hero */
        .fd-hero { text-align: center; padding: 2rem 0; }
        .fd-badge {
          display: inline-block;
          border: 1px solid rgba(99,102,241,0.35);
          color: #818CF8; font-size: 0.7rem; font-weight: 700;
          letter-spacing: 1.5px; padding: 4px 14px; border-radius: 999px;
          margin-bottom: 1.75rem;
        }
        .fd-hero h1 {
          font-size: clamp(2rem, 6.5vw, 2.8rem);
          font-weight: 900; color: #F0F0FF;
          margin: 0 0 0.5rem; line-height: 1.1;
        }
        .fd-sub { font-size: 1rem; color: #818CF8; margin: 0 0 1rem; }
        .fd-intro { font-size: 0.93rem; color: #94A3B8; line-height: 1.75; max-width: 540px; margin: 0 auto 1.25rem; }
        .fd-meta {
          display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;
          font-size: 0.78rem; color: #64748B;
        }

        /* Timer */
        .fd-timer {
          width: 130px; height: 130px; margin: 0 auto 2rem;
          position: relative; display: flex; align-items: center; justify-content: center;
        }
        .fd-timer-svg {
          position: absolute; inset: 0; width: 100%; height: 100%;
        }
        .fd-timer-inner {
          display: flex; flex-direction: column; align-items: center; z-index: 1;
        }
        .fd-timer-num {
          font-size: 2.8rem; font-weight: 900; color: #E2E8F0; line-height: 1;
        }
        .fd-timer-lbl { font-size: 0.72rem; color: #818CF8; letter-spacing: 1px; }

        /* Section */
        .fd-title {
          font-size: 1.3rem; font-weight: 800; color: #E2E8F0;
          margin: 0 0 0.75rem; border-right: 3px solid #818CF8; padding-right: 0.75rem;
        }
        .fd-body { font-size: 0.92rem; color: #94A3B8; line-height: 1.75; margin: 0 0 1.5rem; }

        /* Size grid */
        .fd-size-grid {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;
        }
        @media (max-width: 480px) { .fd-size-grid { grid-template-columns: 1fr; } }
        .fd-size-card {
          background: rgba(99,102,241,0.05);
          border: 1px solid rgba(99,102,241,0.15);
          border-radius: 12px; padding: 1.25rem; text-align: center;
        }
        .fd-size-icon { font-size: 1.4rem; color: #818CF8; margin-bottom: 0.5rem; }
        .fd-size-name { font-size: 0.95rem; font-weight: 700; color: #E2E8F0; }
        .fd-size-sub { font-size: 0.75rem; color: #64748B; margin-bottom: 0.6rem; }
        .fd-size-rule {
          font-size: 0.9rem; color: #A5B4FC; font-weight: 600;
          background: rgba(99,102,241,0.1); border-radius: 6px;
          padding: 0.4rem 0.6rem; margin-bottom: 0.5rem; line-height: 1.5;
        }
        .fd-size-note { font-size: 0.77rem; color: #64748B; line-height: 1.5; }

        /* Timing */
        .fd-timing-list { display: flex; flex-direction: column; gap: 1rem; }
        .fd-timing-row {
          display: flex; gap: 1rem; align-items: flex-start;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 10px; padding: 1rem;
        }
        .fd-timing-never {
          background: rgba(239,68,68,0.04);
          border-color: rgba(239,68,68,0.12);
        }
        .fd-timing-time {
          min-width: 52px; text-align: center;
          font-size: 0.72rem; font-weight: 700; color: #818CF8;
          letter-spacing: 1px; padding-top: 2px;
        }
        .fd-timing-never .fd-timing-time { color: #F87171; }
        .fd-timing-desc strong { display: block; color: #E2E8F0; font-size: 0.95rem; margin-bottom: 0.25rem; }
        .fd-timing-desc p { font-size: 0.85rem; color: #64748B; margin: 0; line-height: 1.6; }

        /* Warnings */
        .fd-warning-list { display: flex; flex-direction: column; gap: 0.9rem; }
        .fd-warning {
          display: flex; gap: 0.9rem; align-items: flex-start;
        }
        .fd-w-dot {
          min-width: 8px; height: 8px; border-radius: 50%;
          background: #F87171; margin-top: 6px; flex-shrink: 0;
        }
        .fd-warning strong { display: block; color: #E2E8F0; font-size: 0.92rem; margin-bottom: 0.2rem; }
        .fd-warning p { font-size: 0.83rem; color: #64748B; margin: 0; line-height: 1.6; }

        /* CTA */
        .fd-cta-box {
          background: rgba(99,102,241,0.06);
          border: 1px solid rgba(99,102,241,0.2);
          border-radius: 14px; padding: 2rem; text-align: center;
        }
        .fd-cta-title { font-size: 1.2rem; font-weight: 800; color: #E2E8F0; margin: 0 0 0.6rem; }
        .fd-cta-body { font-size: 0.9rem; color: #94A3B8; line-height: 1.7; margin: 0 0 1.5rem; }
        .fd-cta-btn {
          display: inline-block; background: #818CF8; color: #fff;
          font-weight: 700; font-size: 0.95rem; padding: 0.75rem 2rem;
          border-radius: 8px; text-decoration: none; transition: opacity 0.2s;
        }
        .fd-cta-btn:hover { opacity: 0.88; }
      `}</style>

    </div>
  );
}
