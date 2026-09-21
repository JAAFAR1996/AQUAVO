import { useTranslation } from "react-i18next";
export default function GuideAquariumSalt() {
  const { t } = useTranslation("guides");
  return (
    <div className="slt-wrap">

      <header className="slt-bar">
        <a href="/" className="slt-brand">AQUAVO</a>
      </header>

      <main className="slt-main">

        {/* ── Hero ── */}
        <section className="slt-hero">
          <span className="slt-badge">{t("guides-aquarium-salt.s1")}</span>

          {/* Salt crystal — CSS only */}
          <div className="slt-crystal-wrap" aria-hidden="true">
            <div className="slt-crystal">
              <div className="slt-crystal-face slt-face-top"></div>
              <div className="slt-crystal-face slt-face-left"></div>
              <div className="slt-crystal-face slt-face-right"></div>
            </div>
            <div className="slt-crystal-glow"></div>
          </div>

          <h1>{t("guides-aquarium-salt.s2")}</h1>
          <p className="slt-sub">{t("guides-aquarium-salt.s3")}</p>
          <p className="slt-intro">
            {t("guides-aquarium-salt.s4")}
          </p>
          <div className="slt-meta">
            <span>{t("guides-aquarium-salt.s5")}</span>
            <span>{t("guides-aquarium-salt.s6")}</span>
          </div>
        </section>

        {/* ── متى تستخدم ── */}
        <section className="slt-section">
          <h2 className="slt-title slt-title-yes">{t("guides-aquarium-salt.s7")}</h2>
          <div className="slt-card-list">
            <div className="slt-card slt-card-yes">
              <div className="slt-card-icon">✓</div>
              <div>
                <strong>{t("guides-aquarium-salt.s8")}</strong>
                <p>{t("guides-aquarium-salt.s9")}</p>
              </div>
            </div>
            <div className="slt-card slt-card-yes">
              <div className="slt-card-icon">✓</div>
              <div>
                <strong>{t("guides-aquarium-salt.s10")}</strong>
                <p>{t("guides-aquarium-salt.s11")}</p>
              </div>
            </div>
            <div className="slt-card slt-card-yes">
              <div className="slt-card-icon">✓</div>
              <div>
                <strong>{t("guides-aquarium-salt.s12")}</strong>
                <p>{t("guides-aquarium-salt.s13")}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── متى لا تستخدم ── */}
        <section className="slt-section">
          <h2 className="slt-title slt-title-no">{t("guides-aquarium-salt.s14")}</h2>
          <div className="slt-card-list">
            <div className="slt-card slt-card-no">
              <div className="slt-card-icon">✗</div>
              <div>
                <strong>{t("guides-aquarium-salt.s15")}</strong>
                <p>{t("guides-aquarium-salt.s16")}</p>
              </div>
            </div>
            <div className="slt-card slt-card-no">
              <div className="slt-card-icon">✗</div>
              <div>
                <strong>{t("guides-aquarium-salt.s17")}</strong>
                <p>{t("guides-aquarium-salt.s18")}</p>
              </div>
            </div>
            <div className="slt-card slt-card-no">
              <div className="slt-card-icon">✗</div>
              <div>
                <strong>{t("guides-aquarium-salt.s19")}</strong>
                <p>{t("guides-aquarium-salt.s20")}</p>
              </div>
            </div>
            <div className="slt-card slt-card-no">
              <div className="slt-card-icon">✗</div>
              <div>
                <strong>{t("guides-aquarium-salt.s21")}</strong>
                <p>{t("guides-aquarium-salt.s22")}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── الجرعة ── */}
        <section className="slt-section">
          <h2 className="slt-title">{t("guides-aquarium-salt.s23")}</h2>
          <p className="slt-body">
            {t("guides-aquarium-salt.s24")}
          </p>
          <div className="slt-dose-table">
            <div className="slt-dose-row slt-dose-header">
              <span>{t("guides-aquarium-salt.s25")}</span>
              <span>{t("guides-aquarium-salt.s26")}</span>
              <span>{t("guides-aquarium-salt.s27")}</span>
            </div>
            <div className="slt-dose-row">
              <span>{t("guides-aquarium-salt.s28")}</span>
              <span>{t("guides-aquarium-salt.s29")}</span>
              <span>{t("guides-aquarium-salt.s30")}</span>
            </div>
            <div className="slt-dose-row">
              <span>{t("guides-aquarium-salt.s31")}</span>
              <span>{t("guides-aquarium-salt.s32")}</span>
              <span>{t("guides-aquarium-salt.s33")}</span>
            </div>
            <div className="slt-dose-row">
              <span>{t("guides-aquarium-salt.s34")}</span>
              <span>{t("guides-aquarium-salt.s35")}</span>
              <span>{t("guides-aquarium-salt.s36")}</span>
            </div>
          </div>
          <p className="slt-note">
            {t("guides-aquarium-salt.s37")}
          </p>
        </section>

        {/* ── CTA ── */}
        <section className="slt-cta-section">
          <div className="slt-cta-box">
            <h2 className="slt-cta-title">{t("guides-aquarium-salt.s38")}</h2>
            <p className="slt-cta-body">
              {t("guides-aquarium-salt.s39")}
            </p>
            <a
              href="https://www.instagram.com/aquavo_iq/"
              target="_blank"
              rel="noopener noreferrer"
              className="slt-cta-btn"
            >
              {t("guides-aquarium-salt.s40")}
            </a>
          </div>
        </section>

      </main>

      <style>{`
        .slt-wrap {
          min-height: 100vh;
          background: #080810;
          color: #E2E8F0;
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
          direction: rtl;
        }
        .slt-bar {
          position: sticky; top: 0; z-index: 50;
          height: 64px;
          background: rgba(8,8,16,0.96);
          backdrop-filter: blur(8px);
          border-bottom: 1px solid rgba(148,163,184,0.12);
          display: flex; align-items: center; padding: 0 1.25rem;
        }
        .slt-brand {
          color: #CBD5E1; font-weight: 700;
          letter-spacing: 4px; font-size: 1.1rem; text-decoration: none;
        }
        .slt-main {
          width: 100%; max-width: 720px;
          margin: 0 auto; padding: 2rem 1.25rem 5rem;
          display: flex; flex-direction: column; gap: 3.5rem;
        }

        /* Hero */
        .slt-hero { text-align: center; padding: 2rem 0; }
        .slt-badge {
          display: inline-block;
          border: 1px solid rgba(148,163,184,0.3);
          color: #94A3B8; font-size: 0.7rem; font-weight: 700;
          letter-spacing: 1.5px; padding: 4px 14px; border-radius: 999px;
          margin-bottom: 1.75rem;
        }
        .slt-hero h1 {
          font-size: clamp(1.8rem, 6vw, 2.7rem);
          font-weight: 900; color: #F8FAFC;
          margin: 0 0 0.5rem; line-height: 1.15;
        }
        .slt-sub { font-size: 0.97rem; color: #94A3B8; margin: 0 0 1rem; }
        .slt-intro { font-size: 0.93rem; color: #64748B; line-height: 1.75; max-width: 540px; margin: 0 auto 1.25rem; }
        .slt-meta {
          display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;
          font-size: 0.78rem; color: #475569;
        }

        /* Crystal */
        .slt-crystal-wrap {
          width: 100px; height: 100px; margin: 0 auto 2rem;
          position: relative; display: flex; align-items: center; justify-content: center;
        }
        .slt-crystal {
          width: 48px; height: 48px; position: relative; z-index: 1;
          transform: rotate(45deg);
        }
        .slt-crystal-face {
          position: absolute; border-radius: 3px;
        }
        .slt-face-top {
          inset: 0;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.3);
        }
        .slt-face-left {
          inset: 0; transform: translateX(-4px) translateY(4px);
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.15);
        }
        .slt-face-right {
          inset: 0; transform: translateX(4px) translateY(4px);
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
        }
        .slt-crystal-glow {
          position: absolute; inset: 15px; border-radius: 50%;
          background: rgba(255,255,255,0.08);
          filter: blur(12px);
          animation: slt-glow 3s ease-in-out infinite;
        }
        @keyframes slt-glow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.9; }
        }

        /* Titles */
        .slt-title {
          font-size: 1.25rem; font-weight: 800; color: #E2E8F0;
          margin: 0 0 1rem; padding-right: 0.75rem;
          border-right: 3px solid #94A3B8;
        }
        .slt-title-yes { border-right-color: #22C55E; color: #DCFCE7; }
        .slt-title-no { border-right-color: #EF4444; color: #FEE2E2; }
        .slt-body { font-size: 0.92rem; color: #94A3B8; line-height: 1.75; margin: 0 0 1.25rem; }

        /* Cards */
        .slt-card-list { display: flex; flex-direction: column; gap: 0.85rem; }
        .slt-card {
          display: flex; gap: 0.9rem; align-items: flex-start;
          padding: 1rem; border-radius: 10px; border: 1px solid transparent;
        }
        .slt-card-yes { background: rgba(34,197,94,0.05); border-color: rgba(34,197,94,0.15); }
        .slt-card-no { background: rgba(239,68,68,0.05); border-color: rgba(239,68,68,0.15); }
        .slt-card-icon {
          min-width: 28px; height: 28px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.85rem; font-weight: 700; flex-shrink: 0;
        }
        .slt-card-yes .slt-card-icon { background: rgba(34,197,94,0.15); color: #22C55E; }
        .slt-card-no .slt-card-icon { background: rgba(239,68,68,0.15); color: #EF4444; }
        .slt-card strong { display: block; color: #E2E8F0; font-size: 0.92rem; margin-bottom: 0.25rem; }
        .slt-card p { font-size: 0.83rem; color: #64748B; margin: 0; line-height: 1.6; }

        /* Dose table */
        .slt-dose-table { display: flex; flex-direction: column; border-radius: 10px; overflow: hidden; border: 1px solid rgba(148,163,184,0.12); margin-bottom: 1rem; }
        .slt-dose-row {
          display: grid; grid-template-columns: 1.5fr 1fr 1.2fr;
          padding: 0.7rem 1rem; font-size: 0.86rem; color: #94A3B8;
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        .slt-dose-row:last-child { border-bottom: none; }
        .slt-dose-header { background: rgba(148,163,184,0.07); font-weight: 700; color: #CBD5E1; font-size: 0.78rem; }
        .slt-note {
          font-size: 0.82rem; color: #F59E0B; background: rgba(245,158,11,0.05);
          border: 1px solid rgba(245,158,11,0.15); border-radius: 8px;
          padding: 0.75rem 1rem; line-height: 1.6;
        }

        /* CTA */
        .slt-cta-box {
          background: rgba(148,163,184,0.05);
          border: 1px solid rgba(148,163,184,0.15);
          border-radius: 14px; padding: 2rem; text-align: center;
        }
        .slt-cta-title { font-size: 1.2rem; font-weight: 800; color: #E2E8F0; margin: 0 0 0.6rem; }
        .slt-cta-body { font-size: 0.9rem; color: #94A3B8; line-height: 1.7; margin: 0 0 1.5rem; }
        .slt-cta-btn {
          display: inline-block; background: #475569; color: #fff;
          font-weight: 700; font-size: 0.95rem; padding: 0.75rem 2rem;
          border-radius: 8px; text-decoration: none; transition: opacity 0.2s;
        }
        .slt-cta-btn:hover { opacity: 0.88; }
      `}</style>

    </div>
  );
}
