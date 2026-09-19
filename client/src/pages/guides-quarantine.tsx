import { useTranslation } from "react-i18next";
export default function GuideQuarantine() {
  const { t } = useTranslation("guides");
  return (
    <div className="qrn-wrap">

      <header className="qrn-bar">
        <a href="/" className="qrn-brand">AQUAVO</a>
      </header>

      <main className="qrn-main">

        {/* ── Hero ── */}
        <section className="qrn-hero">
          <span className="qrn-badge">{t("guides-quarantine.s1")}</span>

          {/* Quiet isolation tank — CSS only */}
          <div className="qrn-tank-wrap" aria-hidden="true">
            <div className="qrn-tank">
              <div className="qrn-water"></div>
              <div className="qrn-fish"></div>
              <div className="qrn-bubble qrn-bbl1"></div>
              <div className="qrn-bubble qrn-bbl2"></div>
            </div>
            <div className="qrn-label">{t("guides-quarantine.s2")}</div>
          </div>

          <h1>{t("guides-quarantine.s3")}</h1>
          <p className="qrn-sub">{t("guides-quarantine.s4")}</p>
          <p className="qrn-intro">
            {t("guides-quarantine.s5")}
          </p>
          <div className="qrn-meta">
            <span>{t("guides-quarantine.s6")}</span>
            <span>{t("guides-quarantine.s7")}</span>
          </div>
        </section>

        {/* ── متطلبات حوض العزل ── */}
        <section className="qrn-section">
          <h2 className="qrn-title">{t("guides-quarantine.s8")}</h2>
          <div className="qrn-req-grid">
            <div className="qrn-req">
              <div className="qrn-req-icon">⬡</div>
              <strong>{t("guides-quarantine.s9")}</strong>
              <p>{t("guides-quarantine.s10")}</p>
            </div>
            <div className="qrn-req">
              <div className="qrn-req-icon">⬡</div>
              <strong>{t("guides-quarantine.s11")}</strong>
              <p>{t("guides-quarantine.s12")}</p>
            </div>
            <div className="qrn-req">
              <div className="qrn-req-icon">⬡</div>
              <strong>{t("guides-quarantine.s13")}</strong>
              <p>{t("guides-quarantine.s14")}</p>
            </div>
            <div className="qrn-req">
              <div className="qrn-req-icon">⬡</div>
              <strong>{t("guides-quarantine.s15")}</strong>
              <p>{t("guides-quarantine.s16")}</p>
            </div>
          </div>
        </section>

        {/* ── جدول العزل ── */}
        <section className="qrn-section">
          <h2 className="qrn-title">{t("guides-quarantine.s17")}</h2>
          <div className="qrn-timeline">
            <div className="qrn-tl-item">
              <div className="qrn-tl-day">{t("guides-quarantine.s18")}</div>
              <div className="qrn-tl-body">
                <strong>{t("guides-quarantine.s19")}</strong>
                <p>{t("guides-quarantine.s20")}</p>
              </div>
            </div>
            <div className="qrn-tl-item">
              <div className="qrn-tl-day">{t("guides-quarantine.s21")}</div>
              <div className="qrn-tl-body">
                <strong>{t("guides-quarantine.s22")}</strong>
                <p>{t("guides-quarantine.s23")}</p>
              </div>
            </div>
            <div className="qrn-tl-item">
              <div className="qrn-tl-day">{t("guides-quarantine.s24")}</div>
              <div className="qrn-tl-body">
                <strong>{t("guides-quarantine.s25")}</strong>
                <p>{t("guides-quarantine.s26")}</p>
              </div>
            </div>
            <div className="qrn-tl-item qrn-tl-done">
              <div className="qrn-tl-day">{t("guides-quarantine.s27")}</div>
              <div className="qrn-tl-body">
                <strong>{t("guides-quarantine.s28")}</strong>
                <p>{t("guides-quarantine.s29")}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── متى تعزل ── */}
        <section className="qrn-section">
          <h2 className="qrn-title">{t("guides-quarantine.s30")}</h2>
          <div className="qrn-when-list">
            <div className="qrn-when qrn-when-must">
              <span className="qrn-when-tag">{t("guides-quarantine.s31")}</span>
              <div>
                <strong>{t("guides-quarantine.s32")}</strong>
              </div>
            </div>
            <div className="qrn-when qrn-when-must">
              <span className="qrn-when-tag">{t("guides-quarantine.s31")}</span>
              <div>
                <strong>{t("guides-quarantine.s33")}</strong>
              </div>
            </div>
            <div className="qrn-when qrn-when-must">
              <span className="qrn-when-tag">{t("guides-quarantine.s31")}</span>
              <div>
                <strong>{t("guides-quarantine.s34")}</strong>
              </div>
            </div>
            <div className="qrn-when qrn-when-consider">
              <span className="qrn-when-tag qrn-tag-consider">{t("guides-quarantine.s35")}</span>
              <div>
                <strong>{t("guides-quarantine.s36")}</strong>
              </div>
            </div>
          </div>
        </section>

        {/* ── إذا ظهر مرض خلال العزل ── */}
        <section className="qrn-section">
          <h2 className="qrn-title">{t("guides-quarantine.s37")}</h2>
          <p className="qrn-body">
            {t("guides-quarantine.s38")}
          </p>
          <div className="qrn-disease-steps">
            <div className="qrn-ds-item">
              <div className="qrn-ds-num">{t("guides-quarantine.s39")}</div>
              <div className="qrn-ds-body">
                <strong>{t("guides-quarantine.s40")}</strong>
                <p>{t("guides-quarantine.s41")}</p>
              </div>
            </div>
            <div className="qrn-ds-item">
              <div className="qrn-ds-num">{t("guides-quarantine.s42")}</div>
              <div className="qrn-ds-body">
                <strong>{t("guides-quarantine.s43")}</strong>
                <p>{t("guides-quarantine.s44")} <a href="/guides/treatment-basics" className="qrn-link">{t("guides-quarantine.s45")}</a> {t("guides-quarantine.s46")}</p>
              </div>
            </div>
            <div className="qrn-ds-item">
              <div className="qrn-ds-num">{t("guides-quarantine.s47")}</div>
              <div className="qrn-ds-body">
                <strong>{t("guides-quarantine.s48")}</strong>
                <p>{t("guides-quarantine.s49")}</p>
              </div>
            </div>
            <div className="qrn-ds-item">
              <div className="qrn-ds-num">{t("guides-quarantine.s50")}</div>
              <div className="qrn-ds-body">
                <strong>{t("guides-quarantine.s51")}</strong>
                <p>{t("guides-quarantine.s52")}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="qrn-cta-section">
          <div className="qrn-cta-box">
            <h2 className="qrn-cta-title">{t("guides-quarantine.s53")}</h2>
            <p className="qrn-cta-body">
              {t("guides-quarantine.s54")}
            </p>
            <a
              href="https://www.instagram.com/aquavo_iq/"
              target="_blank"
              rel="noopener noreferrer"
              className="qrn-cta-btn"
            >
              {t("guides-quarantine.s55")}
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

        /* Disease during quarantine section */
        .qrn-body { font-size: 0.92rem; color: #94A3B8; line-height: 1.75; margin: 0 0 1rem; }
        .qrn-disease-steps { display: flex; flex-direction: column; gap: 0; }
        .qrn-ds-item {
          display: flex; gap: 0.9rem; align-items: flex-start;
          padding: 1rem 0; border-bottom: 1px solid rgba(56,189,248,0.08);
        }
        .qrn-ds-item:last-child { border-bottom: none; }
        .qrn-ds-num {
          min-width: 28px; height: 28px; border-radius: 50%;
          background: rgba(56,189,248,0.1); border: 1px solid rgba(56,189,248,0.25);
          display: flex; align-items: center; justify-content: center;
          font-size: 0.8rem; font-weight: 800; color: #38BDF8; flex-shrink: 0;
        }
        .qrn-ds-body strong { display: block; font-size: 0.92rem; color: #E2E8F0; margin-bottom: 0.25rem; }
        .qrn-ds-body p { font-size: 0.83rem; color: #64748B; margin: 0; line-height: 1.65; }
        .qrn-link { color: #38BDF8; text-decoration: underline; text-underline-offset: 2px; }
      `}</style>

    </div>
  );
}
