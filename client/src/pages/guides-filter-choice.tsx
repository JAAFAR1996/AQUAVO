import { MetaTags } from "@/components/seo/meta-tags";
import { useTranslation } from "react-i18next";

export default function GuideFilterChoice() {
  const { t } = useTranslation("guides");
  return (
    <>
      {/* SEO / GEO / AEO 2026 */}
      <MetaTags
        title={t("guides-filter-choice.s1")}
        description={t("guides-filter-choice.s2")}
        keywords={[t("guides-filter-choice.s3"), t("guides-filter-choice.s4"), t("guides-filter-choice.s5"), t("guides-filter-choice.s6"), t("guides-filter-choice.s7"), "AQUAVO"]}
        url="https://www.aquavoiq.com/guides-filter-choice"
        canonicalUrl="https://www.aquavoiq.com/guides-filter-choice"
      />
    <div className="fltr-wrap">

      <header className="fltr-bar">
        <a href="/" className="fltr-brand">AQUAVO</a>
      </header>

      <main className="fltr-main">

        {/* ── Hero ── */}
        <section className="fltr-hero">
          <span className="fltr-badge">{t("guides-filter-choice.s8")}</span>

          {/* Engine-room pump visual */}
          <div className="fltr-engine" aria-hidden="true">
            <div className="fltr-flow fltr-flow-1"></div>
            <div className="fltr-flow fltr-flow-2"></div>
            <div className="fltr-flow fltr-flow-3"></div>
            <div className="fltr-pump-body">
              <span className="fltr-pump-icon">⬡</span>
            </div>
          </div>

          <h1>{t("guides-filter-choice.s9")}</h1>
          <p className="fltr-sub">{t("guides-filter-choice.s10")}</p>
          <p className="fltr-intro">
            {t("guides-filter-choice.s11")}
          </p>
          <div className="fltr-meta">
            <span>{t("guides-filter-choice.s12")}</span>
            <span>{t("guides-filter-choice.s13")}</span>
          </div>
        </section>

        {/* ── أنواع الفلاتر ── */}
        <section className="fltr-section">
          <h2 className="fltr-title">{t("guides-filter-choice.s14")}</h2>
          <p className="fltr-body">{t("guides-filter-choice.s15")}</p>

          <div className="fltr-types">
            <div className="fltr-type-card">
              <div className="fltr-type-header">
                <span className="fltr-type-label">{t("guides-filter-choice.s16")}</span>
                <span className="fltr-type-tag">{t("guides-filter-choice.s17")}</span>
              </div>
              <div className="fltr-type-body">
                <p>{t("guides-filter-choice.s18")}</p>
                <div className="fltr-pros-cons">
                  <div className="fltr-pros">
                    <span>{t("guides-filter-choice.s19")}</span>
                    <span>{t("guides-filter-choice.s20")}</span>
                  </div>
                  <div className="fltr-cons">
                    <span>{t("guides-filter-choice.s21")}</span>
                    <span>{t("guides-filter-choice.s22")}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="fltr-type-card fltr-type-featured">
              <div className="fltr-type-header">
                <span className="fltr-type-label">{t("guides-filter-choice.s23")}</span>
                <span className="fltr-type-tag fltr-tag-best">{t("guides-filter-choice.s24")}</span>
              </div>
              <div className="fltr-type-body">
                <p>{t("guides-filter-choice.s25")}</p>
                <div className="fltr-pros-cons">
                  <div className="fltr-pros">
                    <span>{t("guides-filter-choice.s26")}</span>
                    <span>{t("guides-filter-choice.s27")}</span>
                  </div>
                  <div className="fltr-cons">
                    <span>{t("guides-filter-choice.s28")}</span>
                    <span>{t("guides-filter-choice.s29")}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="fltr-type-card">
              <div className="fltr-type-header">
                <span className="fltr-type-label">{t("guides-filter-choice.s30")}</span>
                <span className="fltr-type-tag">{t("guides-filter-choice.s31")}</span>
              </div>
              <div className="fltr-type-body">
                <p>{t("guides-filter-choice.s32")}</p>
                <div className="fltr-pros-cons">
                  <div className="fltr-pros">
                    <span>{t("guides-filter-choice.s33")}</span>
                    <span>{t("guides-filter-choice.s34")}</span>
                  </div>
                  <div className="fltr-cons">
                    <span>{t("guides-filter-choice.s35")}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="fltr-type-card">
              <div className="fltr-type-header">
                <span className="fltr-type-label">{t("guides-filter-choice.s36")}</span>
                <span className="fltr-type-tag">{t("guides-filter-choice.s37")}</span>
              </div>
              <div className="fltr-type-body">
                <p>{t("guides-filter-choice.s38")}</p>
                <div className="fltr-pros-cons">
                  <div className="fltr-pros">
                    <span>{t("guides-filter-choice.s39")}</span>
                    <span>{t("guides-filter-choice.s40")}</span>
                  </div>
                  <div className="fltr-cons">
                    <span>{t("guides-filter-choice.s41")}</span>
                    <span>{t("guides-filter-choice.s42")}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── دليل الحجم ── */}
        <section className="fltr-section">
          <h2 className="fltr-title">{t("guides-filter-choice.s43")}</h2>
          <p className="fltr-body">
            {t("guides-filter-choice.s44")}
          </p>
          <div className="fltr-size-table">
            <div className="fltr-size-row fltr-size-header">
              <span>{t("guides-filter-choice.s45")}</span>
              <span>{t("guides-filter-choice.s46")}</span>
              <span>{t("guides-filter-choice.s47")}</span>
            </div>
            <div className="fltr-size-row">
              <span>{t("guides-filter-choice.s48")}</span>
              <span>120–160 L/h</span>
              <span>{t("guides-filter-choice.s49")}</span>
            </div>
            <div className="fltr-size-row">
              <span>40–80L</span>
              <span>160–320 L/h</span>
              <span>{t("guides-filter-choice.s50")}</span>
            </div>
            <div className="fltr-size-row">
              <span>80–200L</span>
              <span>320–800 L/h</span>
              <span>{t("guides-filter-choice.s51")}</span>
            </div>
            <div className="fltr-size-row">
              <span>{t("guides-filter-choice.s52")}</span>
              <span>600–1000+ L/h</span>
              <span>{t("guides-filter-choice.s53")}</span>
            </div>
          </div>
        </section>

        {/* ── جدول الصيانة ── */}
        <section className="fltr-section">
          <h2 className="fltr-title">{t("guides-filter-choice.s54")}</h2>
          <div className="fltr-maint-list">
            <div className="fltr-maint-row">
              <div className="fltr-maint-period">{t("guides-filter-choice.s55")}</div>
              <p>{t("guides-filter-choice.s56")}</p>
            </div>
            <div className="fltr-maint-row">
              <div className="fltr-maint-period">{t("guides-filter-choice.s57")}</div>
              <p>{t("guides-filter-choice.s58")}</p>
            </div>
            <div className="fltr-maint-row">
              <div className="fltr-maint-period">{t("guides-filter-choice.s59")}</div>
              <p>{t("guides-filter-choice.s60")}</p>
            </div>
            <div className="fltr-maint-row fltr-maint-warn">
              <div className="fltr-maint-period">{t("guides-filter-choice.s61")}</div>
              <p>{t("guides-filter-choice.s62")}</p>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="fltr-cta-section">
          <div className="fltr-cta-box">
            <h2 className="fltr-cta-title">{t("guides-filter-choice.s63")}</h2>
            <p className="fltr-cta-body">
              {t("guides-filter-choice.s64")}
            </p>
            <a
              href="https://www.instagram.com/aquavo_iq/"
              target="_blank"
              rel="noopener noreferrer"
              className="fltr-cta-btn"
            >
              {t("guides-filter-choice.s65")}
            </a>
          </div>
        </section>

      </main>

      <style>{`
        .fltr-wrap {
          min-height: 100vh;
          background: #050A12;
          color: #E2E8F0;
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
          direction: rtl;
        }
        .fltr-bar {
          position: sticky; top: 0; z-index: 50;
          height: 64px;
          background: rgba(5,10,18,0.96);
          backdrop-filter: blur(8px);
          border-bottom: 1px solid rgba(6,182,212,0.18);
          display: flex; align-items: center; padding: 0 1.25rem;
        }
        .fltr-brand {
          color: #06B6D4; font-weight: 700;
          letter-spacing: 4px; font-size: 1.1rem; text-decoration: none;
        }
        .fltr-main {
          width: 100%; max-width: 720px;
          margin: 0 auto; padding: 2rem 1.25rem 5rem;
          display: flex; flex-direction: column; gap: 3.5rem;
        }

        /* Hero */
        .fltr-hero { text-align: center; padding: 2rem 0; }
        .fltr-badge {
          display: inline-block;
          border: 1px solid rgba(6,182,212,0.35);
          color: #06B6D4; font-size: 0.7rem; font-weight: 700;
          letter-spacing: 1.5px; padding: 4px 14px; border-radius: 999px;
          margin-bottom: 1.75rem;
        }
        .fltr-hero h1 {
          font-size: clamp(2.2rem, 7vw, 3rem);
          font-weight: 900; color: #F0F9FF;
          margin: 0 0 0.5rem;
        }
        .fltr-sub { font-size: 1rem; color: #06B6D4; margin: 0 0 1rem; }
        .fltr-intro { font-size: 0.93rem; color: #94A3B8; line-height: 1.75; max-width: 540px; margin: 0 auto 1.25rem; }
        .fltr-meta {
          display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;
          font-size: 0.78rem; color: #64748B;
        }

        /* Engine visual */
        .fltr-engine {
          width: 120px; height: 120px; margin: 0 auto 2rem;
          position: relative; display: flex; align-items: center; justify-content: center;
        }
        .fltr-flow {
          position: absolute; border-radius: 50%;
          border: 1.5px solid rgba(6,182,212,0.25);
        }
        .fltr-flow-1 { inset: 0; animation: fltr-pulse 2s ease-in-out infinite; }
        .fltr-flow-2 { inset: 12px; animation: fltr-pulse 2s ease-in-out infinite 0.6s; }
        .fltr-flow-3 { inset: 24px; animation: fltr-pulse 2s ease-in-out infinite 1.2s; }
        @keyframes fltr-pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; border-color: rgba(6,182,212,0.6); }
        }
        .fltr-pump-body {
          width: 40px; height: 40px; border-radius: 50%;
          background: rgba(6,182,212,0.15);
          border: 2px solid #06B6D4;
          display: flex; align-items: center; justify-content: center;
          z-index: 1;
        }
        .fltr-pump-icon { font-size: 1.2rem; color: #06B6D4; }

        /* Section */
        .fltr-title {
          font-size: 1.3rem; font-weight: 800; color: #E2E8F0;
          margin: 0 0 0.75rem; border-right: 3px solid #06B6D4; padding-right: 0.75rem;
        }
        .fltr-body { font-size: 0.92rem; color: #94A3B8; line-height: 1.75; margin: 0 0 1.25rem; }

        /* Filter types */
        .fltr-types { display: flex; flex-direction: column; gap: 1rem; }
        .fltr-type-card {
          background: rgba(6,182,212,0.04);
          border: 1px solid rgba(6,182,212,0.1);
          border-radius: 12px; overflow: hidden;
        }
        .fltr-type-featured {
          border-color: rgba(6,182,212,0.3);
          background: rgba(6,182,212,0.07);
        }
        .fltr-type-header {
          display: flex; align-items: center; gap: 0.75rem;
          padding: 0.75rem 1rem;
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        .fltr-type-label { font-weight: 700; color: #E2E8F0; font-size: 0.95rem; }
        .fltr-type-tag {
          font-size: 0.7rem; padding: 2px 10px; border-radius: 999px;
          background: rgba(6,182,212,0.12); color: #67E8F9;
          border: 1px solid rgba(6,182,212,0.2);
        }
        .fltr-tag-best { background: rgba(6,182,212,0.2); color: #06B6D4; border-color: rgba(6,182,212,0.4); }
        .fltr-type-body { padding: 0.75rem 1rem; }
        .fltr-type-body > p { font-size: 0.87rem; color: #94A3B8; margin: 0 0 0.75rem; line-height: 1.6; }
        .fltr-pros-cons { display: flex; gap: 1rem; flex-wrap: wrap; }
        .fltr-pros, .fltr-cons {
          display: flex; flex-direction: column; gap: 0.2rem; flex: 1; min-width: 120px;
        }
        .fltr-pros span { font-size: 0.8rem; color: #86EFAC; }
        .fltr-cons span { font-size: 0.8rem; color: #FCA5A5; }

        /* Size table */
        .fltr-size-table { display: flex; flex-direction: column; gap: 0; border-radius: 10px; overflow: hidden; border: 1px solid rgba(6,182,212,0.12); }
        .fltr-size-row {
          display: grid; grid-template-columns: 1.2fr 1.2fr 1.5fr;
          padding: 0.75rem 1rem; gap: 0.5rem;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          font-size: 0.87rem; color: #94A3B8;
        }
        .fltr-size-row:last-child { border-bottom: none; }
        .fltr-size-header {
          background: rgba(6,182,212,0.08);
          font-weight: 700; color: #67E8F9; font-size: 0.8rem;
        }
        .fltr-size-row:not(.fltr-size-header):hover { background: rgba(6,182,212,0.04); }

        /* Maintenance */
        .fltr-maint-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .fltr-maint-row {
          display: flex; gap: 1rem; align-items: flex-start;
          padding: 0.9rem 1rem;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 8px;
        }
        .fltr-maint-warn {
          background: rgba(245,158,11,0.04);
          border-color: rgba(245,158,11,0.15);
        }
        .fltr-maint-period {
          min-width: 70px; font-size: 0.78rem; font-weight: 700;
          color: #06B6D4; padding-top: 1px;
        }
        .fltr-maint-warn .fltr-maint-period { color: #F59E0B; }
        .fltr-maint-row p { font-size: 0.87rem; color: #94A3B8; margin: 0; line-height: 1.6; }

        /* CTA */
        .fltr-cta-box {
          background: rgba(6,182,212,0.06);
          border: 1px solid rgba(6,182,212,0.2);
          border-radius: 14px; padding: 2rem; text-align: center;
        }
        .fltr-cta-title { font-size: 1.2rem; font-weight: 800; color: #E2E8F0; margin: 0 0 0.6rem; }
        .fltr-cta-body { font-size: 0.9rem; color: #94A3B8; line-height: 1.7; margin: 0 0 1.5rem; }
        .fltr-cta-btn {
          display: inline-block; background: #06B6D4; color: #fff;
          font-weight: 700; font-size: 0.95rem; padding: 0.75rem 2rem;
          border-radius: 8px; text-decoration: none; transition: opacity 0.2s;
        }
        .fltr-cta-btn:hover { opacity: 0.88; }
      `}</style>

    </div>
    </>
  );
}
