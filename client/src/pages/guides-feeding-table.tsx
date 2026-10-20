import { useTranslation } from "react-i18next";
export default function GuideFeedingTable() {
  const { t } = useTranslation("guides");
  return (
    <div className="fd-wrap">

      <header className="fd-bar">
        <a href="/" className="fd-brand">AQUAVO</a>
      </header>

      <main className="fd-main">

        {/* ── Hero ── */}
        <section className="fd-hero">
          <span className="fd-badge">{t("guides-feeding-table.s1")}</span>

          {/* Portion guidance, not a universal two-minute feeding timer. */}
          <div className="fd-portion" role="note">
            <strong>{t("guides-feeding-table.s2")}</strong>
            <span>{t("guides-feeding-table.s3")}</span>
          </div>

          <h1>{t("guides-feeding-table.s4")}</h1>
          <p className="fd-sub">{t("guides-feeding-table.s5")}</p>
          <p className="fd-intro">
            {t("guides-feeding-table.s6")}
          </p>
          <div className="fd-meta">
            <span>{t("guides-feeding-table.s7")}</span>
            <span>{t("guides-feeding-table.s8")}</span>
          </div>
        </section>

        {/* ── الكمية الصحيحة ── */}
        <section className="fd-section">
          <h2 className="fd-title">{t("guides-feeding-table.s9")}</h2>
          <p className="fd-body">
            {t("guides-feeding-table.s10")}
          </p>

          <div className="fd-size-grid">
            <div className="fd-size-card">
              <div className="fd-size-icon">◉</div>
              <div className="fd-size-name">{t("guides-feeding-table.s11")}</div>
              <div className="fd-size-sub">{t("guides-feeding-table.s12")}</div>
              <div className="fd-size-rule">{t("guides-feeding-table.s13")}<br/>{t("guides-feeding-table.s14")}</div>
              <div className="fd-size-note">{t("guides-feeding-table.s15")}</div>
            </div>
            <div className="fd-size-card">
              <div className="fd-size-icon">◎</div>
              <div className="fd-size-name">{t("guides-feeding-table.s16")}</div>
              <div className="fd-size-sub">{t("guides-feeding-table.s17")}</div>
              <div className="fd-size-rule">{t("guides-feeding-table.s18")}<br/>{t("guides-feeding-table.s14")}</div>
              <div className="fd-size-note">{t("guides-feeding-table.s19")}</div>
            </div>
            <div className="fd-size-card">
              <div className="fd-size-icon">○</div>
              <div className="fd-size-name">{t("guides-feeding-table.s20")}</div>
              <div className="fd-size-sub">{t("guides-feeding-table.s21")}</div>
              <div className="fd-size-rule">{t("guides-feeding-table.s22")}<br/>{t("guides-feeding-table.s23")}</div>
              <div className="fd-size-note">{t("guides-feeding-table.s24")}</div>
            </div>
          </div>
        </section>

        {/* ── التوقيت ── */}
        <section className="fd-section">
          <h2 className="fd-title">{t("guides-feeding-table.s25")}</h2>
          <div className="fd-timing-list">
            <div className="fd-timing-row">
              <div className="fd-timing-time">{t("guides-feeding-table.s26")}</div>
              <div className="fd-timing-desc">
                <strong>{t("guides-feeding-table.s27")}</strong>
                <p>{t("guides-feeding-table.s28")}</p>
              </div>
            </div>
            <div className="fd-timing-row">
              <div className="fd-timing-time">{t("guides-feeding-table.s29")}</div>
              <div className="fd-timing-desc">
                <strong>{t("guides-feeding-table.s30")}</strong>
                <p>{t("guides-feeding-table.s31")}</p>
              </div>
            </div>
            <div className="fd-timing-row">
              <div className="fd-timing-time">{t("guides-feeding-table.s32")}</div>
              <div className="fd-timing-desc">
                <strong>{t("guides-feeding-table.s33")}</strong>
                <p>{t("guides-feeding-table.s34")}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── علامات الإفراط ── */}
        <section className="fd-section">
          <h2 className="fd-title">{t("guides-feeding-table.s35")}</h2>
          <p className="fd-body">{t("guides-feeding-table.s36")}</p>
          <div className="fd-warning-list">
            <div className="fd-warning">
              <span className="fd-w-dot"></span>
              <div>
                <strong>{t("guides-feeding-table.s37")}</strong>
                <p>{t("guides-feeding-table.s38")}</p>
              </div>
            </div>
            <div className="fd-warning">
              <span className="fd-w-dot"></span>
              <div>
                <strong>{t("guides-feeding-table.s39")}</strong>
                <p>{t("guides-feeding-table.s40")}</p>
              </div>
            </div>
            <div className="fd-warning">
              <span className="fd-w-dot"></span>
              <div>
                <strong>{t("guides-feeding-table.s41")}</strong>
                <p>{t("guides-feeding-table.s42")}</p>
              </div>
            </div>
            <div className="fd-warning">
              <span className="fd-w-dot"></span>
              <div>
                <strong>{t("guides-feeding-table.s43")}</strong>
                <p>{t("guides-feeding-table.s44")}</p>
              </div>
            </div>
            <div className="fd-warning">
              <span className="fd-w-dot"></span>
              <div>
                <strong>{t("guides-feeding-table.s45")}</strong>
                <p>{t("guides-feeding-table.s46")}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── يوم الصيام ── */}
        <section className="fd-section">
          <h2 className="fd-title">{t("guides-feeding-table.s47")}</h2>
          <p className="fd-body">
            {t("guides-feeding-table.s48")}
          </p>
        </section>

        {/* ── CTA ── */}
        <section className="fd-cta-section">
          <div className="fd-cta-box">
            <h2 className="fd-cta-title">{t("guides-feeding-table.s49")}</h2>
            <p className="fd-cta-body">
              {t("guides-feeding-table.s50")}
            </p>
            <a
              href="https://www.instagram.com/aquavo_iq/"
              target="_blank"
              rel="noopener noreferrer"
              className="fd-cta-btn"
            >
              {t("guides-feeding-table.s51")}
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

        /* Portion guide — no arbitrary two-minute countdown. */
        .fd-portion {
          display: inline-flex; align-items: center; justify-content: center; gap: 0.45rem;
          margin: 0 auto 2rem; padding: 0.8rem 1.4rem;
          border: 1px solid rgba(99,102,241,0.32);
          background: rgba(99,102,241,0.08); border-radius: 999px;
          color: #E2E8F0; line-height: 1.3;
        }
        .fd-portion strong { font-size: 1.3rem; font-weight: 800; }
        .fd-portion span { font-size: 1rem; color: #A5B4FC; }

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
        .fd-timing-time {
          min-width: 52px; text-align: center;
          font-size: 0.72rem; font-weight: 700; color: #818CF8;
          letter-spacing: 1px; padding-top: 2px;
        }
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
