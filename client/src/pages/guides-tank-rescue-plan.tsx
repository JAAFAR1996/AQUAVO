export default function GuideTankRescuePlan() {
  return (
    <div className="rsc-wrap">

      <header className="rsc-bar">
        <a href="/" className="rsc-brand">AQUAVO</a>
      </header>

      <main className="rsc-main">

        {/* ── Hero ── */}
        <section className="rsc-hero">
          <span className="rsc-badge">خطة الإنقاذ — AQUAVO</span>

          {/* Day-zero countdown ring */}
          <div className="rsc-ring" aria-hidden="true">
            <div className="rsc-ring-track"></div>
            <div className="rsc-ring-fill"></div>
            <div className="rsc-ring-core">
              <span className="rsc-ring-num">٣٠</span>
              <span className="rsc-ring-lbl">يوماً</span>
            </div>
          </div>

          <h1>خطة الإنقاذ</h1>
          <p className="rsc-sub">من يوم الصفر إلى الاستقرار — بدون عشوائية</p>
          <p className="rsc-intro">
            الحوض التعبان ما يحتاج عشوائية. يحتاج خطة واضحة تعرف فيها شنو تسوي كل أسبوع،
            وشنو تجنب حتى ما تعقد الموضوع أكثر. هاي الخطة ترتبلك الطريق من اليوم الأول إلى الاستقرار.
          </p>
          <div className="rsc-meta">
            <span>للأحواض اللي فيها مشاكل واضحة</span>
            <span>وقت القراءة: 6–8 دقائق</span>
          </div>
        </section>

        {/* ── قبل ما تبدأ ── */}
        <section className="rsc-section">
          <h2 className="rsc-title">قبل ما تبدأ الخطة</h2>
          <p className="rsc-body">
            الخطة ما تشتغل بدون تشخيص أولي. هاي الأشياء الثلاث لازم تعرفها قبل اليوم الأول:
          </p>
          <div className="rsc-prereq-grid">
            <div className="rsc-prereq">
              <div className="rsc-prereq-num">١</div>
              <div>
                <strong>فحص المي</strong>
                <p>pH، أمونيا، نترات، نتريت — بدون هاي الأرقام كل خطوة تخمين.</p>
              </div>
            </div>
            <div className="rsc-prereq">
              <div className="rsc-prereq-num">٢</div>
              <div>
                <strong>حجم الحوض والحمل البيولوجي</strong>
                <p>عدد السمچ وحجمهم يحدد قوة الفلتر اللي تحتاجه وسرعة التعافي.</p>
              </div>
            </div>
            <div className="rsc-prereq">
              <div className="rsc-prereq-num">٣</div>
              <div>
                <strong>حالة الفلتر</strong>
                <p>فلتر مكسور أو مشبع يعني الخطة كلها راح تفشل. تحقق منه أول شي.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Timeline ── */}
        <section className="rsc-section">
          <h2 className="rsc-title">خطة الثلاثين يوم — محطة بمحطة</h2>
          <p className="rsc-body">كل محطة تبني على اللي قبلها. لا تتخطى محطة حتى لو الحوض بدا أحسن.</p>

          <div className="rsc-timeline">
            <div className="rsc-tline-rail" aria-hidden="true"></div>

            <div className="rsc-station">
              <div className="rsc-station-dot rsc-dot-zero">٠</div>
              <div className="rsc-station-content">
                <h3>يوم الصفر — التشخيص</h3>
                <ul className="rsc-ul">
                  <li>افحص المي وسجّل الأرقام</li>
                  <li>شوف الفلتر — نظف الإسفنج بماء الحوض مو بالبوري</li>
                  <li>عزل أي سمچة عليها علامات مرض</li>
                  <li>وقف أي دواء كنت تستخدمه بدون تشخيص</li>
                  <li>خفف الأكل: مرة واحدة بالنهار فقط</li>
                </ul>
              </div>
            </div>

            <div className="rsc-station">
              <div className="rsc-station-dot rsc-dot-week">٧</div>
              <div className="rsc-station-content">
                <h3>يوم ٧ — الاستقرار الأولي</h3>
                <ul className="rsc-ul">
                  <li>غير 20٪ من المي يومياً لمدة 3–4 أيام أول ما تبدأ</li>
                  <li>تحقق من الأمونيا مرة بالنهار: أي قيمة فوق 0.5 ppm تحتاج تغيير فوري</li>
                  <li>لا تضيف سمچ جديد هالأسبوع</li>
                  <li>تحقق إن الهيتر يحافظ على درجة ثابتة</li>
                </ul>
              </div>
            </div>

            <div className="rsc-station">
              <div className="rsc-station-dot rsc-dot-week">١٤</div>
              <div className="rsc-station-content">
                <h3>يوم ١٤ — بناء البكتيريا</h3>
                <ul className="rsc-ul">
                  <li>راجع أرقام النترات — لو ارتفعت فالفلتر ما يشتغل صح بعد</li>
                  <li>نظف الحصى بالسايفون مرة</li>
                  <li>رجّع الأكل لمرتين بالنهار إذا الأمونيا صفر</li>
                  <li>لا تنظف الفلتر هالأسبوع — البكتيريا تتبنى</li>
                  <li>سجّل الأرقام مقارنة باليوم الصفر</li>
                </ul>
              </div>
            </div>

            <div className="rsc-station">
              <div className="rsc-station-dot rsc-dot-week">٢١</div>
              <div className="rsc-station-content">
                <h3>يوم ٢١ — تثبيت الدورة</h3>
                <ul className="rsc-ul">
                  <li>الأمونيا والنتريت لازم يكونون صفر بشكل منتظم</li>
                  <li>إذا النترات تحت 20 ppm، الدورة تعمل</li>
                  <li>ارجع لجدول تغيير المي العادي: 20٪ أسبوعياً</li>
                  <li>إذا فيه سمچة معزولة تحسنت، راجع قبل ترجعها</li>
                </ul>
              </div>
            </div>

            <div className="rsc-station">
              <div className="rsc-station-dot rsc-dot-final">٣٠</div>
              <div className="rsc-station-content">
                <h3>يوم ٣٠ — الاستقرار</h3>
                <ul className="rsc-ul">
                  <li>قارن الأرقام باليوم الصفر — المفروض فيه فرق واضح</li>
                  <li>السمچ نشيط ويأكل بشكل طبيعي</li>
                  <li>المي صافي والفلتر يشتغل بدون روائح</li>
                  <li>الحوض جاهز للخطوة الجاية: إضافة تدريجية</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── علامات تقول الخطة ناجحة ── */}
        <section className="rsc-section">
          <h2 className="rsc-title">علامات تقول الخطة تسير صح</h2>
          <div className="rsc-signs">
            <div className="rsc-sign rsc-sign-good">
              <span className="rsc-sign-icon">✓</span>
              <span>الأمونيا والنتريت راحوا تدريجياً</span>
            </div>
            <div className="rsc-sign rsc-sign-good">
              <span className="rsc-sign-icon">✓</span>
              <span>السمچ رجع يأكل بشكل طبيعي</span>
            </div>
            <div className="rsc-sign rsc-sign-good">
              <span className="rsc-sign-icon">✓</span>
              <span>المي واضح وما فيه رائحة</span>
            </div>
            <div className="rsc-sign rsc-sign-good">
              <span className="rsc-sign-icon">✓</span>
              <span>السمچ يسبح بنشاط وما يختبي</span>
            </div>
            <div className="rsc-sign rsc-sign-warn">
              <span className="rsc-sign-icon">⚠</span>
              <span>إذا الأمونيا رجعت بعد اليوم 14 — الفلتر يحتاج مراجعة</span>
            </div>
            <div className="rsc-sign rsc-sign-warn">
              <span className="rsc-sign-icon">⚠</span>
              <span>إذا السمچ ما أكل بعد اليوم 21 — أرسل صورة ونشوف</span>
            </div>
          </div>
        </section>

        {/* ── إذا الخطة ما نجحت ── */}
        <section className="rsc-section">
          <h2 className="rsc-title">إذا الخطة ما نجحت — شنو تسوي؟</h2>
          <p className="rsc-body">
            نفذت الخطوات بالتسلسل، وصلت اليوم ٣٠، والسمچ ما تحسن بشكل واضح — هذا مو فشل. يعني في متغير ما اكتشفناه بعد.
          </p>
          <div className="rsc-escalation">
            <div className="rsc-esc-step">
              <div className="rsc-esc-badge">A</div>
              <div className="rsc-esc-content">
                <strong>أعد فحص المي — كل المؤشرات</strong>
                <p>أمونيا، نتريت، نترات، pH. أحياناً المشكلة بالـ pH أو النترات المتراكمة — مو بالأمونيا فقط. فحص واحد في اليوم الصفر مو كافي.</p>
              </div>
            </div>
            <div className="rsc-esc-step">
              <div className="rsc-esc-badge">B</div>
              <div className="rsc-esc-content">
                <strong>تحقق من الفلتر بالتفصيل</strong>
                <p>الفلتر يبدو يشتغل بس ممكن التدفق ضعيف أو الوسط البيولوجي تضرر. نظف الوسط الميكانيكي فقط — لا تلمس البيولوجي بعد.</p>
              </div>
            </div>
            <div className="rsc-esc-step">
              <div className="rsc-esc-badge">C</div>
              <div className="rsc-esc-content">
                <strong>راجع دليل العلاج إذا السمچ فيها أعراض</strong>
                <p>إذا في سمچ عليها بقع أو علامات مرض، الخطة التالية هي <a href="/guides/treatment-basics" className="rsc-link">دليل العلاج الأساسي</a> — يحدد الدواء الصح حسب الأعراض.</p>
              </div>
            </div>
            <div className="rsc-esc-step">
              <div className="rsc-esc-badge">D</div>
              <div className="rsc-esc-content">
                <strong>إذا السمچ تواصل تموت — أرسل صورة لـ AQUAVO</strong>
                <p>الموت المتسارع (أكثر من سمچة بيوم) يعني إما تسمم حاد أو مرض معدٍ. أرسل صورة الحوض ونتائج الفحص — التشخيص من صورة واضحة أسرع وأدق من أي خطوة ثانية.</p>
              </div>
            </div>
          </div>
          <div className="rsc-warn-note">
            لا تبدأ خطة إنقاذ ثانية قبل ما تعرف ليش الأولى ما نجحت. كل خطوة عشوائية تضيف ضغط على الحوض — مو حل.
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="rsc-cta-section">
          <div className="rsc-cta-box">
            <h2 className="rsc-cta-title">حوضك يحتاج خطة مخصصة؟</h2>
            <p className="rsc-cta-body">
              دز صورة واضحة للحوض، حجمه، وأرقام الفحص — ونرتبلك خطة مباشرة.
            </p>
            <a
              href="https://www.instagram.com/aquavo_iq/"
              target="_blank"
              rel="noopener noreferrer"
              className="rsc-cta-btn"
            >
              راسلنا على إنستغرام
            </a>
          </div>
        </section>

      </main>

      <style>{`
        .rsc-wrap {
          min-height: 100vh;
          background: #0B1E28;
          color: #E2E8F0;
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
          direction: rtl;
        }
        .rsc-bar {
          position: sticky; top: 0; z-index: 50;
          height: 64px;
          background: rgba(1,6,17,0.96);
          backdrop-filter: blur(8px);
          border-bottom: 1px solid rgba(14,165,233,0.2);
          display: flex; align-items: center; padding: 0 1.25rem;
        }
        .rsc-brand {
          color: #0EA5E9; font-weight: 700;
          letter-spacing: 4px; font-size: 1.1rem; text-decoration: none;
        }
        .rsc-main {
          width: 100%; max-width: 720px;
          margin: 0 auto; padding: 2rem 1.25rem 5rem;
          display: flex; flex-direction: column; gap: 3.5rem;
        }

        /* Hero */
        .rsc-hero { text-align: center; padding: 2rem 0; }
        .rsc-badge {
          display: inline-block;
          border: 1px solid rgba(14,165,233,0.35);
          color: #0EA5E9; font-size: 0.7rem; font-weight: 700;
          letter-spacing: 1.5px; padding: 4px 14px; border-radius: 999px;
          margin-bottom: 1.75rem;
        }
        .rsc-hero h1 {
          font-size: clamp(2.2rem, 7vw, 3rem);
          font-weight: 900; color: #F0F6FF;
          margin: 0 0 0.5rem; line-height: 1.1;
        }
        .rsc-sub { font-size: 1.05rem; color: #0EA5E9; margin: 0 0 1rem; }
        .rsc-intro { font-size: 0.95rem; color: #94A3B8; line-height: 1.75; max-width: 560px; margin: 0 auto 1.25rem; }
        .rsc-meta {
          display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;
          font-size: 0.78rem; color: #64748B;
        }

        /* Countdown ring */
        .rsc-ring {
          width: 140px; height: 140px; margin: 0 auto 2rem;
          position: relative; display: flex; align-items: center; justify-content: center;
        }
        .rsc-ring-track {
          position: absolute; inset: 0;
          border-radius: 50%;
          border: 3px solid rgba(14,165,233,0.12);
        }
        .rsc-ring-fill {
          position: absolute; inset: 0;
          border-radius: 50%;
          border: 3px solid transparent;
          border-top-color: #0EA5E9;
          border-right-color: #0EA5E9;
          animation: rsc-spin 3s linear infinite;
        }
        @keyframes rsc-spin { to { transform: rotate(360deg); } }
        .rsc-ring-core {
          display: flex; flex-direction: column; align-items: center;
          z-index: 1;
        }
        .rsc-ring-num {
          font-size: 2.5rem; font-weight: 900; color: #E2E8F0; line-height: 1;
        }
        .rsc-ring-lbl { font-size: 0.75rem; color: #0EA5E9; letter-spacing: 1px; }

        /* Section */
        .rsc-section {}
        .rsc-title {
          font-size: 1.35rem; font-weight: 800; color: #E2E8F0;
          margin: 0 0 0.75rem; border-right: 3px solid #0EA5E9; padding-right: 0.75rem;
        }
        .rsc-body { font-size: 0.92rem; color: #94A3B8; line-height: 1.75; margin: 0 0 1.5rem; }

        /* Prerequisites */
        .rsc-prereq-grid { display: flex; flex-direction: column; gap: 1rem; }
        .rsc-prereq {
          display: flex; gap: 1rem; align-items: flex-start;
          background: rgba(14,165,233,0.04);
          border: 1px solid rgba(14,165,233,0.1);
          border-radius: 10px; padding: 1rem;
        }
        .rsc-prereq-num {
          min-width: 36px; height: 36px;
          background: rgba(14,165,233,0.15);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          color: #0EA5E9; font-weight: 800; font-size: 0.9rem;
        }
        .rsc-prereq strong { display: block; color: #E2E8F0; margin-bottom: 0.25rem; font-size: 0.95rem; }
        .rsc-prereq p { font-size: 0.85rem; color: #64748B; margin: 0; line-height: 1.6; }

        /* Timeline */
        .rsc-timeline { position: relative; padding-right: 28px; }
        .rsc-tline-rail {
          position: absolute; right: 17px; top: 20px; bottom: 20px;
          width: 2px; background: linear-gradient(to bottom, #0EA5E9, rgba(14,165,233,0.1));
        }
        .rsc-station {
          position: relative; display: flex; gap: 1.25rem;
          margin-bottom: 2.25rem; align-items: flex-start;
        }
        .rsc-station:last-child { margin-bottom: 0; }
        .rsc-station-dot {
          min-width: 40px; height: 40px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-weight: 800; font-size: 0.85rem;
          position: relative; z-index: 1; margin-top: 2px;
          flex-shrink: 0;
        }
        .rsc-dot-zero {
          background: rgba(14,165,233,0.2);
          border: 2px solid #0EA5E9; color: #0EA5E9;
        }
        .rsc-dot-week {
          background: rgba(14,165,233,0.08);
          border: 2px solid rgba(14,165,233,0.4); color: #7DD3F4;
        }
        .rsc-dot-final {
          background: rgba(16,185,129,0.15);
          border: 2px solid #10B981; color: #10B981;
        }
        .rsc-station-content { flex: 1; }
        .rsc-station-content h3 {
          font-size: 1rem; font-weight: 700; color: #E2E8F0;
          margin: 0 0 0.5rem;
        }
        .rsc-ul {
          list-style: none; padding: 0; margin: 0;
          display: flex; flex-direction: column; gap: 0.35rem;
        }
        .rsc-ul li {
          font-size: 0.87rem; color: #94A3B8; padding-right: 1rem;
          position: relative; line-height: 1.6;
        }
        .rsc-ul li::before {
          content: '—'; position: absolute; right: 0;
          color: rgba(14,165,233,0.5);
        }

        /* Signs */
        .rsc-signs { display: flex; flex-direction: column; gap: 0.75rem; }
        .rsc-sign {
          display: flex; gap: 0.75rem; align-items: center;
          padding: 0.75rem 1rem; border-radius: 8px;
          font-size: 0.9rem;
        }
        .rsc-sign-good { background: rgba(16,185,129,0.06); border: 1px solid rgba(16,185,129,0.2); color: #A7F3D0; }
        .rsc-sign-warn { background: rgba(245,158,11,0.06); border: 1px solid rgba(245,158,11,0.2); color: #FDE68A; }
        .rsc-sign-icon { font-size: 1rem; flex-shrink: 0; }

        /* CTA */
        .rsc-cta-section {}
        .rsc-cta-box {
          background: rgba(14,165,233,0.06);
          border: 1px solid rgba(14,165,233,0.2);
          border-radius: 14px; padding: 2rem; text-align: center;
        }
        .rsc-cta-title { font-size: 1.2rem; font-weight: 800; color: #E2E8F0; margin: 0 0 0.6rem; }
        .rsc-cta-body { font-size: 0.9rem; color: #94A3B8; line-height: 1.7; margin: 0 0 1.5rem; }
        .rsc-cta-btn {
          display: inline-block; background: #0EA5E9; color: #fff;
          font-weight: 700; font-size: 0.95rem; padding: 0.75rem 2rem;
          border-radius: 8px; text-decoration: none; transition: opacity 0.2s;
        }
        .rsc-cta-btn:hover { opacity: 0.88; }

        /* Escalation section */
        .rsc-escalation { display: flex; flex-direction: column; gap: 0; margin-bottom: 1rem; }
        .rsc-esc-step {
          display: flex; gap: 1rem; align-items: flex-start;
          padding: 1rem 0; border-bottom: 1px solid rgba(14,165,233,0.08);
        }
        .rsc-esc-step:last-child { border-bottom: none; }
        .rsc-esc-badge {
          min-width: 28px; height: 28px; border-radius: 50%;
          background: rgba(14,165,233,0.12); border: 1px solid rgba(14,165,233,0.3);
          display: flex; align-items: center; justify-content: center;
          font-size: 0.75rem; font-weight: 800; color: #0EA5E9; flex-shrink: 0;
        }
        .rsc-esc-content strong { display: block; color: #E2E8F0; font-size: 0.92rem; margin-bottom: 0.25rem; }
        .rsc-esc-content p { font-size: 0.83rem; color: #64748B; margin: 0; line-height: 1.65; }
        .rsc-link { color: #0EA5E9; text-decoration: underline; text-underline-offset: 2px; }
        .rsc-warn-note {
          background: rgba(245,158,11,0.05); border: 1px solid rgba(245,158,11,0.18);
          border-radius: 10px; padding: 0.85rem 1rem;
          font-size: 0.84rem; color: #FDE68A; line-height: 1.6;
        }
      `}</style>

    </div>
  );
}
