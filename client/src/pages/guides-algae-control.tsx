import { useTranslation } from "react-i18next";
export default function GuideAlgaeControl() {
  const { t } = useTranslation("guides");
  return (
    <div className="alg-wrap">

      <header className="alg-bar">
        <a href="/" className="alg-brand">AQUAVO</a>
      </header>

      <main className="alg-main">

        {/* ── Hero ── */}
        <section className="alg-hero">
          <span className="alg-badge">{t("guides-algae-control.s1")}</span>

          {/* Glass pane with algae creep — CSS only */}
          <div className="alg-glass" aria-hidden="true">
            <div className="alg-pane">
              <div className="alg-creep alg-c1"></div>
              <div className="alg-creep alg-c2"></div>
              <div className="alg-creep alg-c3"></div>
              <div className="alg-clear-zone"></div>
            </div>
          </div>

          <h1>{t("guides-algae-control.s2")}</h1>
          <p className="alg-sub">{t("guides-algae-control.s3")}</p>
          <p className="alg-intro">
            {t("guides-algae-control.s4")}
          </p>
          <div className="alg-meta">
            <span>{t("guides-algae-control.s5")}</span>
            <span>{t("guides-algae-control.s6")}</span>
          </div>
        </section>

        {/* ── أنواع الطحالب ── */}
        <section className="alg-section">
          <h2 className="alg-title">{t("guides-algae-control.s7")}</h2>
          <div className="alg-type-list">
            <div className="alg-type">
              <div className="alg-type-color" style={{background:'#4ADE80'}}></div>
              <div>
                <strong>{t("guides-algae-control.s8")}</strong>
                <p>{t("guides-algae-control.s9")}</p>
              </div>
            </div>
            <div className="alg-type">
              <div className="alg-type-color" style={{background:'#78350F'}}></div>
              <div>
                <strong>{t("guides-algae-control.s10")}</strong>
                <p>{t("guides-algae-control.s11")}</p>
              </div>
            </div>
            <div className="alg-type">
              <div className="alg-type-color" style={{background:'#1F2937'}}></div>
              <div>
                <strong>{t("guides-algae-control.s12")}</strong>
                <p>{t("guides-algae-control.s13")}</p>
              </div>
            </div>
            <div className="alg-type">
              <div className="alg-type-color" style={{background:'#86EFAC'}}></div>
              <div>
                <strong>{t("guides-algae-control.s14")}</strong>
                <p>{t("guides-algae-control.s15")}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── خطة الوقاية ── */}
        <section className="alg-section">
          <h2 className="alg-title">{t("guides-algae-control.s16")}</h2>
          <div className="alg-plan-grid">
            <div className="alg-plan-card">
              <div className="alg-plan-icon">◑</div>
              <h3>{t("guides-algae-control.s17")}</h3>
              <p>{t("guides-algae-control.s18")}</p>
            </div>
            <div className="alg-plan-card">
              <div className="alg-plan-icon">⬡</div>
              <h3>{t("guides-algae-control.s19")}</h3>
              <p>{t("guides-algae-control.s20")}</p>
            </div>
            <div className="alg-plan-card">
              <div className="alg-plan-icon">↺</div>
              <h3>{t("guides-algae-control.s21")}</h3>
              <p>{t("guides-algae-control.s22")}</p>
            </div>
            <div className="alg-plan-card">
              <div className="alg-plan-icon">⬢</div>
              <h3>{t("guides-algae-control.s23")}</h3>
              <p>{t("guides-algae-control.s24")}</p>
            </div>
          </div>
        </section>

        {/* ── جدول الفحص ── */}
        <section className="alg-section">
          <h2 className="alg-title">{t("guides-algae-control.s25")}</h2>
          <div className="alg-scale">
            <div className="alg-scale-row alg-ok">
              <span className="alg-scale-label">{t("guides-algae-control.s26")}</span>
              <div>
                <strong>{t("guides-algae-control.s27")}</strong>
                <p>{t("guides-algae-control.s28")}</p>
              </div>
            </div>
            <div className="alg-scale-row alg-watch">
              <span className="alg-scale-label">{t("guides-algae-control.s29")}</span>
              <div>
                <strong>{t("guides-algae-control.s30")}</strong>
                <p>{t("guides-algae-control.s31")}</p>
              </div>
            </div>
            <div className="alg-scale-row alg-act">
              <span className="alg-scale-label">{t("guides-algae-control.s32")}</span>
              <div>
                <strong>{t("guides-algae-control.s33")}</strong>
                <p>{t("guides-algae-control.s34")}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── ملاحظة الكيماويات ── */}
        <section className="alg-section">
          <div className="alg-note-box">
            <p className="alg-note-text">
              {t("guides-algae-control.s35")}
            </p>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="alg-cta-section">
          <div className="alg-cta-box">
            <h2 className="alg-cta-title">{t("guides-algae-control.s36")}</h2>
            <p className="alg-cta-body">
              {t("guides-algae-control.s37")}
            </p>
            <a
              href="https://www.instagram.com/aquavo_iq/"
              target="_blank"
              rel="noopener noreferrer"
              className="alg-cta-btn"
            >
              {t("guides-algae-control.s38")}
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
