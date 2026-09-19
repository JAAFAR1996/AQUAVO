import { useTranslation } from "react-i18next";
export default function GuideWaterChangeSchedule() {
  const { t } = useTranslation("guides");
  return (
    <div className="wc-wrap">

      <header className="wc-bar">
        <a href="/" className="wc-brand">AQUAVO</a>
      </header>

      <main className="wc-main">

        {/* ── SECTION 1: Hero ── */}
        <section className="wc-hero">
          <span className="wc-badge">{t("guides-water-change-schedule.s1")}</span>

          {/* ساعة المي — circular water-clock */}
          <div className="wc-clock-ring" aria-hidden="true">
            <div className="wc-ripple wc-ripple-1"></div>
            <div className="wc-ripple wc-ripple-2"></div>
            <div className="wc-ripple wc-ripple-3"></div>
            <div className="wc-clock-core">
              <span className="wc-clock-pct">{t("guides-water-change-schedule.s2")}</span>
              <span className="wc-clock-label">{t("guides-water-change-schedule.s3")}</span>
            </div>
          </div>

          <h1>{t("guides-water-change-schedule.s4")}</h1>
          <p className="wc-sub">{t("guides-water-change-schedule.s5")}</p>
          <p className="wc-intro">
            {t("guides-water-change-schedule.s6")}
          </p>
          <div className="wc-meta-row">
            <span>{t("guides-water-change-schedule.s7")}</span>
            <span>{t("guides-water-change-schedule.s8")}</span>
          </div>
        </section>

        {/* ── SECTION 2: ليش تغيير منتظم ── */}
        <section className="wc-section">
          <h2 className="wc-title">{t("guides-water-change-schedule.s9")}</h2>
          <p className="wc-section-intro">
            {t("guides-water-change-schedule.s10")}
          </p>
          <div className="wc-reason-grid">
            <div className="wc-reason-card">
              <div className="wc-reason-icon">⬇</div>
              <div className="wc-reason-text">
                <strong>{t("guides-water-change-schedule.s11")}</strong>
                <p>{t("guides-water-change-schedule.s12")}</p>
              </div>
            </div>
            <div className="wc-reason-card">
              <div className="wc-reason-icon">⚖</div>
              <div className="wc-reason-text">
                <strong>{t("guides-water-change-schedule.s13")}</strong>
                <p>{t("guides-water-change-schedule.s14")}</p>
              </div>
            </div>
            <div className="wc-reason-card">
              <div className="wc-reason-icon">✦</div>
              <div className="wc-reason-text">
                <strong>{t("guides-water-change-schedule.s15")}</strong>
                <p>{t("guides-water-change-schedule.s16")}</p>
              </div>
            </div>
            <div className="wc-reason-card">
              <div className="wc-reason-icon">◎</div>
              <div className="wc-reason-text">
                <strong>{t("guides-water-change-schedule.s17")}</strong>
                <p>{t("guides-water-change-schedule.s18")}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 3: الجدول حسب حجم الحوض ── */}
        <section className="wc-section">
          <h2 className="wc-title">{t("guides-water-change-schedule.s19")}</h2>
          <p className="wc-section-intro">
            {t("guides-water-change-schedule.s20")}
          </p>

          <div className="wc-schedule-grid">
            <div className="wc-sched-card wc-sched-sm">
              <div className="wc-sched-header">
                <span className="wc-sched-size">{t("guides-water-change-schedule.s21")}</span>
                <span className="wc-sched-liters">{t("guides-water-change-schedule.s22")}</span>
              </div>
              <div className="wc-sched-body">
                <div className="wc-sched-row">
                  <span className="wc-sched-key">{t("guides-water-change-schedule.s23")}</span>
                  <span className="wc-sched-val">{t("guides-water-change-schedule.s24")}</span>
                </div>
                <div className="wc-sched-row">
                  <span className="wc-sched-key">{t("guides-water-change-schedule.s25")}</span>
                  <span className="wc-sched-val">{t("guides-water-change-schedule.s26")}</span>
                </div>
                <div className="wc-sched-row">
                  <span className="wc-sched-key">{t("guides-water-change-schedule.s27")}</span>
                  <span className="wc-sched-val wc-warn-text">{t("guides-water-change-schedule.s28")}</span>
                </div>
              </div>
            </div>

            <div className="wc-sched-card wc-sched-md">
              <div className="wc-sched-header">
                <span className="wc-sched-size">{t("guides-water-change-schedule.s29")}</span>
                <span className="wc-sched-liters">{t("guides-water-change-schedule.s30")}</span>
              </div>
              <div className="wc-sched-body">
                <div className="wc-sched-row">
                  <span className="wc-sched-key">{t("guides-water-change-schedule.s23")}</span>
                  <span className="wc-sched-val">{t("guides-water-change-schedule.s31")}</span>
                </div>
                <div className="wc-sched-row">
                  <span className="wc-sched-key">{t("guides-water-change-schedule.s25")}</span>
                  <span className="wc-sched-val">{t("guides-water-change-schedule.s32")}</span>
                </div>
                <div className="wc-sched-row">
                  <span className="wc-sched-key">{t("guides-water-change-schedule.s33")}</span>
                  <span className="wc-sched-val">{t("guides-water-change-schedule.s34")}</span>
                </div>
              </div>
            </div>

            <div className="wc-sched-card wc-sched-lg">
              <div className="wc-sched-header">
                <span className="wc-sched-size">{t("guides-water-change-schedule.s35")}</span>
                <span className="wc-sched-liters">{t("guides-water-change-schedule.s36")}</span>
              </div>
              <div className="wc-sched-body">
                <div className="wc-sched-row">
                  <span className="wc-sched-key">{t("guides-water-change-schedule.s23")}</span>
                  <span className="wc-sched-val">{t("guides-water-change-schedule.s37")}</span>
                </div>
                <div className="wc-sched-row">
                  <span className="wc-sched-key">{t("guides-water-change-schedule.s25")}</span>
                  <span className="wc-sched-val">{t("guides-water-change-schedule.s26")}</span>
                </div>
                <div className="wc-sched-row">
                  <span className="wc-sched-key">{t("guides-water-change-schedule.s33")}</span>
                  <span className="wc-sched-val">{t("guides-water-change-schedule.s38")}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="wc-sched-note">
            {t("guides-water-change-schedule.s39")}
          </div>
        </section>

        {/* ── SECTION 4: علامات المي يحتاج تغيير ── */}
        <section className="wc-section">
          <h2 className="wc-title">{t("guides-water-change-schedule.s40")}</h2>
          <p className="wc-section-intro">
            {t("guides-water-change-schedule.s41")}
          </p>
          <div className="wc-signs-grid">
            <div className="wc-sign">
              <span className="wc-sign-dot wc-dot-warn"></span>
              <div>
                <strong>{t("guides-water-change-schedule.s42")}</strong>
                <p>{t("guides-water-change-schedule.s43")}</p>
              </div>
            </div>
            <div className="wc-sign">
              <span className="wc-sign-dot wc-dot-warn"></span>
              <div>
                <strong>{t("guides-water-change-schedule.s44")}</strong>
                <p>{t("guides-water-change-schedule.s45")}</p>
              </div>
            </div>
            <div className="wc-sign">
              <span className="wc-sign-dot wc-dot-danger"></span>
              <div>
                <strong>{t("guides-water-change-schedule.s46")}</strong>
                <p>{t("guides-water-change-schedule.s47")}</p>
              </div>
            </div>
            <div className="wc-sign">
              <span className="wc-sign-dot wc-dot-warn"></span>
              <div>
                <strong>{t("guides-water-change-schedule.s48")}</strong>
                <p>{t("guides-water-change-schedule.s49")}</p>
              </div>
            </div>
            <div className="wc-sign">
              <span className="wc-sign-dot wc-dot-warn"></span>
              <div>
                <strong>{t("guides-water-change-schedule.s50")}</strong>
                <p>{t("guides-water-change-schedule.s51")}</p>
              </div>
            </div>
            <div className="wc-sign">
              <span className="wc-sign-dot wc-dot-danger"></span>
              <div>
                <strong>{t("guides-water-change-schedule.s52")}</strong>
                <p>{t("guides-water-change-schedule.s53")}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 5: خطوات التغيير ── */}
        <section className="wc-section">
          <h2 className="wc-title">{t("guides-water-change-schedule.s54")}</h2>
          <p className="wc-section-intro">
            {t("guides-water-change-schedule.s55")}
          </p>
          <ol className="wc-steps">
            <li className="wc-step">
              <span className="wc-step-num">{t("guides-water-change-schedule.s56")}</span>
              <div className="wc-step-content">
                <strong>{t("guides-water-change-schedule.s57")}</strong>
                <p>{t("guides-water-change-schedule.s58")}</p>
              </div>
            </li>
            <li className="wc-step">
              <span className="wc-step-num">{t("guides-water-change-schedule.s59")}</span>
              <div className="wc-step-content">
                <strong>{t("guides-water-change-schedule.s60")}</strong>
                <p>{t("guides-water-change-schedule.s61")}</p>
              </div>
            </li>
            <li className="wc-step">
              <span className="wc-step-num">{t("guides-water-change-schedule.s62")}</span>
              <div className="wc-step-content">
                <strong>{t("guides-water-change-schedule.s63")}</strong>
                <p>{t("guides-water-change-schedule.s64")}</p>
              </div>
            </li>
            <li className="wc-step">
              <span className="wc-step-num">{t("guides-water-change-schedule.s65")}</span>
              <div className="wc-step-content">
                <strong>{t("guides-water-change-schedule.s66")}</strong>
                <p>{t("guides-water-change-schedule.s67")}</p>
              </div>
            </li>
            <li className="wc-step">
              <span className="wc-step-num">{t("guides-water-change-schedule.s68")}</span>
              <div className="wc-step-content">
                <strong>{t("guides-water-change-schedule.s69")}</strong>
                <p>{t("guides-water-change-schedule.s70")}</p>
              </div>
            </li>
            <li className="wc-step">
              <span className="wc-step-num">{t("guides-water-change-schedule.s71")}</span>
              <div className="wc-step-content">
                <strong>{t("guides-water-change-schedule.s72")}</strong>
                <p>{t("guides-water-change-schedule.s73")}</p>
              </div>
            </li>
          </ol>
        </section>

        {/* ── SECTION 6: CTA ── */}
        <section className="wc-cta-section">
          <div className="wc-cta-box">
            <h2 className="wc-cta-title">{t("guides-water-change-schedule.s74")}</h2>
            <p className="wc-cta-body">
              {t("guides-water-change-schedule.s75")}
            </p>
            <a
              href="https://www.instagram.com/aquavo_iq/"
              target="_blank"
              rel="noopener noreferrer"
              className="wc-cta-btn"
            >
              {t("guides-water-change-schedule.s76")}
            </a>
          </div>
        </section>

      </main>

      <style>{`
        /* ── Base ── */
        .wc-wrap {
          min-height: 100vh;
          background: #0B1E28;
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
          border-bottom: 1px solid rgba(11,147,166,0.25);
          display: flex;
          align-items: center;
          padding: 0 1rem;
        }
        .wc-brand {
          color: #0B93A6;
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
          border: 1px solid rgba(11,147,166,0.4);
          color: #0B93A6;
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
          color: #0B93A6;
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
          border: 2px solid rgba(11,147,166,0.45);
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
          border-color: rgba(11,147,166,0.3);
        }
        .wc-ripple-3 {
          width: 50%;
          height: 50%;
          animation-delay: 1.6s;
          border-color: rgba(11,147,166,0.2);
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
          background: #0B1E28;
          border: 2px solid #0B93A6;
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 24px rgba(11,147,166,0.25);
        }
        .wc-clock-pct {
          font-size: 1.15rem;
          font-weight: 800;
          color: #0B93A6;
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
          border-right: 3px solid #0B93A6;
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
          background: #0B1E28;
          border: 1px solid rgba(11,147,166,0.18);
          border-radius: 12px;
          padding: 1rem;
          display: flex;
          gap: 0.875rem;
          align-items: flex-start;
        }
        .wc-reason-icon {
          font-size: 1.2rem;
          color: #0B93A6;
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
          background: #0B1E28;
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid rgba(11,147,166,0.15);
        }
        .wc-sched-sm { border-top: 3px solid #F5A832; }
        .wc-sched-md { border-top: 3px solid #0B93A6; }
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
          background: #0B1E28;
          border: 1px solid rgba(11,147,166,0.12);
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
          background: rgba(11,147,166,0.18);
        }
        .wc-step-num {
          flex-shrink: 0;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #0B1E28;
          border: 2px solid #0B93A6;
          color: #0B93A6;
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
          background: linear-gradient(135deg, #0B1E28 0%, #071020 100%);
          border: 1px solid rgba(11,147,166,0.3);
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
          background: #0B93A6;
          color: #0B1E28;
          font-weight: 700;
          font-size: 0.95rem;
          padding: 0.75rem 2rem;
          border-radius: 999px;
          text-decoration: none;
          transition: background 0.18s;
        }
        .wc-cta-btn:hover { background: rgba(11,147,166,0.85); }
      `}</style>
    </div>
  );
}
