export default function GuideTemperatureGuide() {
  return (
    <div className="tmp-wrap">

      <header className="tmp-bar">
        <a href="/" className="tmp-brand">AQUAVO</a>
      </header>

      <main className="tmp-main">

        {/* ── Hero ── */}
        <section className="tmp-hero">
          <span className="tmp-badge">دليل الحرارة — AQUAVO</span>

          {/* Thermal gradient bar */}
          <div className="tmp-gradient-bar" aria-hidden="true">
            <div className="tmp-gradient-track">
              <div className="tmp-gradient-fill"></div>
              <div className="tmp-comfort-zone"></div>
              <div className="tmp-needle"></div>
            </div>
            <div className="tmp-bar-labels">
              <span>18°</span>
              <span className="tmp-comfort-lbl">المنطقة الآمنة ✓</span>
              <span>32°</span>
            </div>
          </div>

          <h1>درجة وحدة تكفي</h1>
          <p className="tmp-sub">الثبات أهم من الرقم الصحيح</p>
          <p className="tmp-intro">
            السمچ يتحمل 24° أو 27°، لكن ما يتحمل 24° الصبح و28° المساء.
            التذبذب اليومي — مو الرقم نفسه — هو اللي يضعف المناعة ويفتح باب الأمراض.
          </p>
          <div className="tmp-meta">
            <span>لكل أصحاب الأحواض</span>
            <span>وقت القراءة: 5 دقائق</span>
          </div>
        </section>

        {/* ── المناطق ── */}
        <section className="tmp-section">
          <h2 className="tmp-title">مناطق الحرارة وتأثيرها</h2>
          <div className="tmp-zones">
            <div className="tmp-zone tmp-zone-cold">
              <div className="tmp-zone-range">أقل من 22°</div>
              <div className="tmp-zone-name">بارد</div>
              <ul className="tmp-zone-ul">
                <li>بطء في الهضم والحركة</li>
                <li>ضعف المناعة تدريجياً</li>
                <li>مناسب فقط للسمچ البارد (الكوي، الذهبي)</li>
              </ul>
            </div>
            <div className="tmp-zone tmp-zone-safe">
              <div className="tmp-zone-range">24° – 28°</div>
              <div className="tmp-zone-name">آمن ✓</div>
              <ul className="tmp-zone-ul">
                <li>نشاط طبيعي وهضم جيد</li>
                <li>دورة بيولوجية مثالية</li>
                <li>مناسب لأغلب السمچ الاستوائي</li>
              </ul>
            </div>
            <div className="tmp-zone tmp-zone-hot">
              <div className="tmp-zone-range">فوق 30°</div>
              <div className="tmp-zone-name">خطر</div>
              <ul className="tmp-zone-ul">
                <li>أكسجين المي ينخفض</li>
                <li>تسريع دورة الأمراض</li>
                <li>الإجهاد الحراري يؤدي للنفوق السريع</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── حسب نوع السمچ ── */}
        <section className="tmp-section">
          <h2 className="tmp-title">الحرارة المناسبة حسب النوع</h2>
          <div className="tmp-fish-table">
            <div className="tmp-fish-row tmp-fish-header">
              <span>النوع</span>
              <span>المدى المثالي</span>
            </div>
            <div className="tmp-fish-row">
              <span>نيون / كارديناله</span>
              <span>24° – 27°</span>
            </div>
            <div className="tmp-fish-row">
              <span>جولدن فيش / كوي</span>
              <span>18° – 22°</span>
            </div>
            <div className="tmp-fish-row">
              <span>بيتا / أوسكار</span>
              <span>26° – 30°</span>
            </div>
            <div className="tmp-fish-row">
              <span>ديسكس</span>
              <span>28° – 31°</span>
            </div>
            <div className="tmp-fish-row">
              <span>جمبري</span>
              <span>20° – 24°</span>
            </div>
            <div className="tmp-fish-row">
              <span>الأحواض المختلطة (عامة)</span>
              <span>25° – 27°</span>
            </div>
          </div>
        </section>

        {/* ── علامات المشكلة ── */}
        <section className="tmp-section">
          <h2 className="tmp-title">علامات مشكلة في الحرارة</h2>
          <div className="tmp-signs">
            <div className="tmp-sign">
              <span className="tmp-sign-dot tmp-dot-hot"></span>
              <div>
                <strong>السمچ على السطح يشرب</strong>
                <p>أكسجين منخفض — الحرارة مرتفعة أو التهوية ناقصة</p>
              </div>
            </div>
            <div className="tmp-sign">
              <span className="tmp-sign-dot tmp-dot-hot"></span>
              <div>
                <strong>خمول مفاجئ وقلة الأكل</strong>
                <p>تغيير مفاجئ بالحرارة — تحقق من الهيتر والمحرار</p>
              </div>
            </div>
            <div className="tmp-sign">
              <span className="tmp-sign-dot tmp-dot-cold"></span>
              <div>
                <strong>تجمع السمچ في أسفل الحوض</strong>
                <p>الحرارة منخفضة — فحص الهيتر فوراً</p>
              </div>
            </div>
            <div className="tmp-sign">
              <span className="tmp-sign-dot tmp-dot-cold"></span>
              <div>
                <strong>بطء في السباحة وصعوبة التوازن</strong>
                <p>إجهاد حراري — تغيير المي الجديد بنفس الدرجة</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── نصائح الثبات ── */}
        <section className="tmp-section">
          <h2 className="tmp-title">كيف تحافظ على الثبات؟</h2>
          <div className="tmp-tips">
            <div className="tmp-tip">
              <span className="tmp-tip-num">١</span>
              <div>
                <strong>اشتري هيتر بثرموستات — مو هيتر ثابت</strong>
                <p>الهيتر الثابت يسخن بدون إيقاف — خطر على الحوض.</p>
              </div>
            </div>
            <div className="tmp-tip">
              <span className="tmp-tip-num">٢</span>
              <div>
                <strong>ضع المحرار بعيد عن الهيتر</strong>
                <p>القراءة بجانب الهيتر مو دقيقة — الزاوية الثانية أصح.</p>
              </div>
            </div>
            <div className="tmp-tip">
              <span className="tmp-tip-num">٣</span>
              <div>
                <strong>سوّي ماء التغيير قبل الإضافة</strong>
                <p>المي البارد مباشرة يصدم السمچ — سخّنه قبل لا تصبه.</p>
              </div>
            </div>
            <div className="tmp-tip">
              <span className="tmp-tip-num">٤</span>
              <div>
                <strong>ما تحط الحوض قرب النافذة أو المكيف</strong>
                <p>التغيير اليومي بالحرارة يضر أكثر من الرقم نفسه.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── مشكلة الصيف العراقي ── */}
        <section className="tmp-section">
          <h2 className="tmp-title">مشكلة الصيف العراقي — أهم قسم في هذا الدليل</h2>
          <p className="tmp-body">
            درجة حرارة الغرفة بالصيف تتجاوز ٣٥–٤٢°C بشكل طبيعي. يعني الحوض بدون تبريد يوصل لـ ٣٢–٣٦°C.
            عند هذه الدرجات الأكسجين ينخفض، الأمراض تتسارع، والسمچ يبدأ يتعرض لإجهاد حراري حقيقي.
          </p>
          <div className="tmp-iraq-grid">
            <div className="tmp-iraq-box tmp-iraq-warn">
              <div className="tmp-iraq-label">علامات الحوض الساخن جداً:</div>
              <ul className="tmp-iraq-ul">
                <li>السمچ يلهث قرب السطح</li>
                <li>تنفس سريع وخياشيم تتحرك بشكل ملحوظ</li>
                <li>خمول وقلة الأكل</li>
                <li>أمراض تنتشر فجأة بعد موجة حر</li>
              </ul>
            </div>
            <div className="tmp-iraq-box tmp-iraq-safe">
              <div className="tmp-iraq-label">الهدف العملي بالعراق:</div>
              <ul className="tmp-iraq-ul">
                <li>أبقِ الحوض تحت ٣٠°C قدر المستطاع</li>
                <li>الثبات أهم من مطاردة ٢٦°C</li>
                <li>٢٨–٣٠°C ثابتة أفضل من ٢٦°C متقلبة</li>
                <li>راقب مرتين يومياً — صباح ومساء — يكفي</li>
              </ul>
            </div>
          </div>
          <div className="tmp-cooling-list">
            <div className="tmp-cooling-title">كيف تخفض حرارة الحوض بأمان:</div>
            <div className="tmp-cooling-item">
              <span className="tmp-cooling-num">١</span>
              <div>
                <strong>مروحة فوق الحوض</strong>
                <p>مروحة صغيرة تنفخ على سطح الماء تخفض الحرارة ٢–٤°C بالتبخر. الأفضل عملياً ومو تسبب صدمة.</p>
              </div>
            </div>
            <div className="tmp-cooling-item">
              <span className="tmp-cooling-num">٢</span>
              <div>
                <strong>تغيير جزء من المي بماء أبرد بـ ٢–٣°C</strong>
                <p>١٥–٢٠٪ فقط. لا تستخدم ماء الثلاجة مباشرة — الفرق الكبير يصدم السمچ. الإضافة التدريجية أهم من الكمية.</p>
              </div>
            </div>
            <div className="tmp-cooling-item">
              <span className="tmp-cooling-num">٣</span>
              <div>
                <strong>زجاجة ماء مجمد مغلقة داخل الحوض</strong>
                <p>تخفض الحرارة ببطء تدريجي. راقب كل ٣٠ دقيقة.</p>
                <div className="tmp-cooling-warn">⚠ لا تضع ثلج مباشرة في الحوض — يصدم السمچ بتغيير مفاجئ. زجاجة مغلقة فقط.</div>
              </div>
            </div>
            <div className="tmp-cooling-item">
              <span className="tmp-cooling-num">٤</span>
              <div>
                <strong>تكييف الغرفة</strong>
                <p>الحل الجذري على المدى البعيد. إذا الغرفة على ٢٦–٢٨°C، الحوض يثبت معها تلقائياً.</p>
              </div>
            </div>
          </div>
          <div className="tmp-iraq-note">
            نصيحة عملية: بأشد أيام الصيف، قلل كمية الأكل للنصف. المي الدافئة تحلل الأكل الزائد أسرع وترفع الأمونيا.
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="tmp-cta-section">
          <div className="tmp-cta-box">
            <h2 className="tmp-cta-title">مشكلة بالحرارة وما تعرف السبب؟</h2>
            <p className="tmp-cta-body">
              أرسل درجة الحرارة الحالية ونوع السمچ — ونعطيك رأي واضح.
            </p>
            <a
              href="https://www.instagram.com/aquavo_iq/"
              target="_blank"
              rel="noopener noreferrer"
              className="tmp-cta-btn"
            >
              راسلنا على إنستغرام
            </a>
          </div>
        </section>

      </main>

      <style>{`
        .tmp-wrap {
          min-height: 100vh;
          background: #060812;
          color: #E2E8F0;
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
          direction: rtl;
        }
        .tmp-bar {
          position: sticky; top: 0; z-index: 50;
          height: 64px;
          background: rgba(6,8,18,0.96);
          backdrop-filter: blur(8px);
          border-bottom: 1px solid rgba(251,146,60,0.18);
          display: flex; align-items: center; padding: 0 1.25rem;
        }
        .tmp-brand {
          color: #FB923C; font-weight: 700;
          letter-spacing: 4px; font-size: 1.1rem; text-decoration: none;
        }
        .tmp-main {
          width: 100%; max-width: 720px;
          margin: 0 auto; padding: 2rem 1.25rem 5rem;
          display: flex; flex-direction: column; gap: 3.5rem;
        }

        /* Hero */
        .tmp-hero { text-align: center; padding: 2rem 0; }
        .tmp-badge {
          display: inline-block;
          border: 1px solid rgba(251,146,60,0.35);
          color: #FB923C; font-size: 0.7rem; font-weight: 700;
          letter-spacing: 1.5px; padding: 4px 14px; border-radius: 999px;
          margin-bottom: 1.75rem;
        }
        .tmp-hero h1 {
          font-size: clamp(2rem, 6.5vw, 2.9rem);
          font-weight: 900; color: #FFF7ED;
          margin: 0 0 0.5rem;
        }
        .tmp-sub { font-size: 1rem; color: #FB923C; margin: 0 0 1rem; }
        .tmp-intro { font-size: 0.93rem; color: #94A3B8; line-height: 1.75; max-width: 540px; margin: 0 auto 1.25rem; }
        .tmp-meta {
          display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;
          font-size: 0.78rem; color: #64748B;
        }

        /* Gradient bar */
        .tmp-gradient-bar { width: 100%; max-width: 400px; margin: 0 auto 2rem; }
        .tmp-gradient-track {
          height: 14px; border-radius: 7px; position: relative;
          background: linear-gradient(to left, #EF4444 0%, #FB923C 25%, #22C55E 50%, #3B82F6 100%);
          overflow: visible;
        }
        .tmp-comfort-zone {
          position: absolute;
          right: 35%; left: 30%; top: -3px; bottom: -3px;
          border: 2px solid rgba(255,255,255,0.6); border-radius: 10px;
        }
        .tmp-needle {
          position: absolute; right: 48%; top: -8px;
          width: 3px; height: 30px;
          background: #fff; border-radius: 2px;
          box-shadow: 0 0 8px rgba(255,255,255,0.5);
        }
        .tmp-bar-labels {
          display: flex; justify-content: space-between;
          font-size: 0.75rem; color: #64748B; margin-top: 0.5rem;
        }
        .tmp-comfort-lbl { color: #86EFAC; font-weight: 600; }

        /* Titles */
        .tmp-title {
          font-size: 1.3rem; font-weight: 800; color: #E2E8F0;
          margin: 0 0 1rem; border-right: 3px solid #FB923C; padding-right: 0.75rem;
        }

        /* Zones */
        .tmp-zones { display: flex; flex-direction: column; gap: 1rem; }
        @media (min-width: 520px) { .tmp-zones { flex-direction: row; } }
        .tmp-zone {
          flex: 1; border-radius: 12px; padding: 1.25rem;
          border: 1px solid transparent;
        }
        .tmp-zone-cold { background: rgba(59,130,246,0.06); border-color: rgba(59,130,246,0.2); }
        .tmp-zone-safe { background: rgba(34,197,94,0.06); border-color: rgba(34,197,94,0.25); }
        .tmp-zone-hot { background: rgba(239,68,68,0.06); border-color: rgba(239,68,68,0.2); }
        .tmp-zone-range { font-size: 1.1rem; font-weight: 800; margin-bottom: 0.25rem; }
        .tmp-zone-cold .tmp-zone-range { color: #93C5FD; }
        .tmp-zone-safe .tmp-zone-range { color: #86EFAC; }
        .tmp-zone-hot .tmp-zone-range { color: #FCA5A5; }
        .tmp-zone-name { font-size: 0.78rem; font-weight: 600; margin-bottom: 0.75rem; color: #94A3B8; }
        .tmp-zone-ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.3rem; }
        .tmp-zone-ul li { font-size: 0.82rem; color: #64748B; padding-right: 0.75rem; position: relative; line-height: 1.5; }
        .tmp-zone-ul li::before { content: '–'; position: absolute; right: 0; }

        /* Fish table */
        .tmp-fish-table { display: flex; flex-direction: column; border-radius: 10px; overflow: hidden; border: 1px solid rgba(251,146,60,0.12); }
        .tmp-fish-row {
          display: grid; grid-template-columns: 1fr 1fr;
          padding: 0.65rem 1rem; font-size: 0.88rem; color: #94A3B8;
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        .tmp-fish-row:last-child { border-bottom: none; }
        .tmp-fish-header { background: rgba(251,146,60,0.08); font-weight: 700; color: #FDBA74; font-size: 0.8rem; }

        /* Signs */
        .tmp-signs { display: flex; flex-direction: column; gap: 0.9rem; }
        .tmp-sign { display: flex; gap: 0.9rem; align-items: flex-start; }
        .tmp-sign-dot { min-width: 10px; height: 10px; border-radius: 50%; margin-top: 5px; flex-shrink: 0; }
        .tmp-dot-hot { background: #EF4444; }
        .tmp-dot-cold { background: #60A5FA; }
        .tmp-sign strong { display: block; color: #E2E8F0; font-size: 0.92rem; margin-bottom: 0.2rem; }
        .tmp-sign p { font-size: 0.83rem; color: #64748B; margin: 0; line-height: 1.6; }

        /* Tips */
        .tmp-tips { display: flex; flex-direction: column; gap: 1rem; }
        .tmp-tip { display: flex; gap: 1rem; align-items: flex-start; padding: 1rem; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 10px; }
        .tmp-tip-num { min-width: 32px; height: 32px; border-radius: 50%; background: rgba(251,146,60,0.12); border: 1px solid rgba(251,146,60,0.3); color: #FB923C; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.85rem; flex-shrink: 0; }
        .tmp-tip strong { display: block; color: #E2E8F0; font-size: 0.92rem; margin-bottom: 0.25rem; }
        .tmp-tip p { font-size: 0.83rem; color: #64748B; margin: 0; line-height: 1.6; }

        /* CTA */
        .tmp-cta-box {
          background: rgba(251,146,60,0.06);
          border: 1px solid rgba(251,146,60,0.2);
          border-radius: 14px; padding: 2rem; text-align: center;
        }
        .tmp-cta-title { font-size: 1.2rem; font-weight: 800; color: #E2E8F0; margin: 0 0 0.6rem; }
        .tmp-cta-body { font-size: 0.9rem; color: #94A3B8; line-height: 1.7; margin: 0 0 1.5rem; }
        .tmp-cta-btn {
          display: inline-block; background: #FB923C; color: #fff;
          font-weight: 700; font-size: 0.95rem; padding: 0.75rem 2rem;
          border-radius: 8px; text-decoration: none; transition: opacity 0.2s;
        }
        .tmp-cta-btn:hover { opacity: 0.88; }

        /* Iraq summer section */
        .tmp-iraq-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.9rem; margin-bottom: 1.25rem; }
        @media (max-width: 500px) { .tmp-iraq-grid { grid-template-columns: 1fr; } }
        .tmp-iraq-box { border-radius: 10px; padding: 1rem; }
        .tmp-iraq-warn { background: rgba(239,68,68,0.05); border: 1px solid rgba(239,68,68,0.18); }
        .tmp-iraq-safe { background: rgba(34,197,94,0.04); border: 1px solid rgba(34,197,94,0.15); }
        .tmp-iraq-label { font-size: 0.72rem; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 0.6rem; }
        .tmp-iraq-warn .tmp-iraq-label { color: #F87171; }
        .tmp-iraq-safe .tmp-iraq-label { color: #86EFAC; }
        .tmp-iraq-ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.35rem; }
        .tmp-iraq-ul li { font-size: 0.82rem; color: #94A3B8; padding-right: 0.75rem; position: relative; line-height: 1.5; }
        .tmp-iraq-ul li::before { content: '–'; position: absolute; right: 0; color: rgba(255,255,255,0.2); }
        .tmp-cooling-list { display: flex; flex-direction: column; gap: 0.9rem; margin-bottom: 1rem; }
        .tmp-cooling-title { font-size: 0.8rem; font-weight: 700; color: #CBD5E1; margin-bottom: 0.5rem; letter-spacing: 0.3px; }
        .tmp-cooling-item { display: flex; gap: 0.9rem; align-items: flex-start; padding: 0.9rem; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 10px; }
        .tmp-cooling-num { min-width: 28px; height: 28px; border-radius: 50%; background: rgba(251,146,60,0.12); border: 1px solid rgba(251,146,60,0.28); color: #FB923C; display: flex; align-items: center; justify-content: center; font-size: 0.82rem; font-weight: 800; flex-shrink: 0; }
        .tmp-cooling-item strong { display: block; font-size: 0.9rem; color: #E2E8F0; margin-bottom: 0.2rem; }
        .tmp-cooling-item p { font-size: 0.82rem; color: #64748B; margin: 0 0 0.35rem; line-height: 1.6; }
        .tmp-cooling-warn { font-size: 0.78rem; color: #FDE68A; background: rgba(245,158,11,0.06); border: 1px solid rgba(245,158,11,0.15); border-radius: 6px; padding: 0.4rem 0.65rem; line-height: 1.5; }
        .tmp-iraq-note { background: rgba(251,146,60,0.06); border-right: 3px solid rgba(251,146,60,0.4); border-radius: 0 8px 8px 0; padding: 0.75rem 1rem; font-size: 0.83rem; color: #FDBA74; line-height: 1.6; }
      `}</style>

    </div>
  );
}
