import { useTranslation } from "react-i18next";
export default function GuideTreatmentBasics() {
  const { t } = useTranslation("guides");
  return (
    <div className="trt-wrap">

      <header className="trt-bar">
        <a href="/" className="trt-brand">AQUAVO</a>
      </header>

      <main className="trt-main">

        {/* ── Hero ── */}
        <section className="trt-hero">
          <span className="trt-badge">{t("guides-treatment-basics.s1")}</span>

          {/* 4-step decision path — CSS only */}
          <div className="trt-path" aria-hidden="true">
            <div className="trt-step trt-s1"><span>?</span></div>
            <div className="trt-connector"></div>
            <div className="trt-step trt-s2"><span>⬡</span></div>
            <div className="trt-connector"></div>
            <div className="trt-step trt-s3"><span>⬡</span></div>
            <div className="trt-connector"></div>
            <div className="trt-step trt-s4"><span>✓</span></div>
          </div>

          <h1>{t("guides-treatment-basics.s2")}</h1>
          <p className="trt-sub">{t("guides-treatment-basics.s3")}</p>
          <p className="trt-intro">
            {t("guides-treatment-basics.s4")}
          </p>
          <div className="trt-meta">
            <span>{t("guides-treatment-basics.s5")}</span>
            <span>{t("guides-treatment-basics.s6")}</span>
          </div>
        </section>

        {/* ── شجرة القرار ── */}
        <section className="trt-section">
          <h2 className="trt-title">{t("guides-treatment-basics.s7")}</h2>

          <div className="trt-steps">
            <div className="trt-card trt-card-1">
              <div className="trt-card-num">{t("guides-treatment-basics.s8")}</div>
              <div className="trt-card-body">
                <h3>{t("guides-treatment-basics.s9")}</h3>
                <p>
                  {t("guides-treatment-basics.s10")}
                </p>
                <div className="trt-card-tip">
                  {t("guides-treatment-basics.s11")}
                </div>
              </div>
            </div>

            <div className="trt-card trt-card-2">
              <div className="trt-card-num">{t("guides-treatment-basics.s12")}</div>
              <div className="trt-card-body">
                <h3>{t("guides-treatment-basics.s13")}</h3>
                <p>
                  {t("guides-treatment-basics.s14")}
                </p>
                <div className="trt-card-tip">
                  {t("guides-treatment-basics.s15")}
                </div>
              </div>
            </div>

            <div className="trt-card trt-card-3">
              <div className="trt-card-num">{t("guides-treatment-basics.s16")}</div>
              <div className="trt-card-body">
                <h3>{t("guides-treatment-basics.s17")}</h3>
                <p>
                  {t("guides-treatment-basics.s18")}
                </p>
                <div className="trt-card-tip">
                  {t("guides-treatment-basics.s19")}
                </div>
              </div>
            </div>

            <div className="trt-card trt-card-4">
              <div className="trt-card-num">{t("guides-treatment-basics.s20")}</div>
              <div className="trt-card-body">
                <h3>{t("guides-treatment-basics.s21")}</h3>
                <p>
                  {t("guides-treatment-basics.s22")}
                </p>
                <div className="trt-card-tip">
                  {t("guides-treatment-basics.s23")}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── أخطاء شائعة ── */}
        <section className="trt-section">
          <h2 className="trt-title">{t("guides-treatment-basics.s24")}</h2>
          <div className="trt-err-list">
            <div className="trt-err">
              <span className="trt-err-x">✗</span>
              <div>
                <strong>{t("guides-treatment-basics.s25")}</strong>
                <p>{t("guides-treatment-basics.s26")}</p>
              </div>
            </div>
            <div className="trt-err">
              <span className="trt-err-x">✗</span>
              <div>
                <strong>{t("guides-treatment-basics.s27")}</strong>
                <p>{t("guides-treatment-basics.s28")}</p>
              </div>
            </div>
            <div className="trt-err">
              <span className="trt-err-x">✗</span>
              <div>
                <strong>{t("guides-treatment-basics.s29")}</strong>
                <p>{t("guides-treatment-basics.s30")}</p>
              </div>
            </div>
            <div className="trt-err">
              <span className="trt-err-x">✗</span>
              <div>
                <strong>{t("guides-treatment-basics.s31")}</strong>
                <p>{t("guides-treatment-basics.s32")}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="trt-cta-section">
          <div className="trt-cta-box">
            <h2 className="trt-cta-title">{t("guides-treatment-basics.s33")}</h2>
            <p className="trt-cta-body">
              {t("guides-treatment-basics.s34")}
            </p>
            <a
              href="https://www.instagram.com/aquavo_iq/"
              target="_blank"
              rel="noopener noreferrer"
              className="trt-cta-btn"
            >
              {t("guides-treatment-basics.s35")}
            </a>
          </div>
        </section>

      </main>

      <style>{`
        .trt-wrap {
          min-height: 100vh;
          background: #060510;
          color: #E2E8F0;
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
          direction: rtl;
        }
        .trt-bar {
          position: sticky; top: 0; z-index: 50;
          height: 64px;
          background: rgba(6,5,16,0.96);
          backdrop-filter: blur(8px);
          border-bottom: 1px solid rgba(167,139,250,0.18);
          display: flex; align-items: center; padding: 0 1.25rem;
        }
        .trt-brand {
          color: #A78BFA; font-weight: 700;
          letter-spacing: 4px; font-size: 1.1rem; text-decoration: none;
        }
        .trt-main {
          width: 100%; max-width: 720px;
          margin: 0 auto; padding: 2rem 1.25rem 5rem;
          display: flex; flex-direction: column; gap: 3.5rem;
        }

        /* Hero */
        .trt-hero { text-align: center; padding: 2rem 0; }
        .trt-badge {
          display: inline-block;
          border: 1px solid rgba(167,139,250,0.3);
          color: #A78BFA; font-size: 0.7rem; font-weight: 700;
          letter-spacing: 1.5px; padding: 4px 14px; border-radius: 999px;
          margin-bottom: 1.75rem;
        }
        .trt-hero h1 {
          font-size: clamp(1.8rem, 6vw, 2.8rem);
          font-weight: 900; color: #F5F3FF;
          margin: 0 0 0.5rem; line-height: 1.15;
        }
        .trt-sub { font-size: 0.97rem; color: #A78BFA; margin: 0 0 1rem; }
        .trt-intro { font-size: 0.93rem; color: #94A3B8; line-height: 1.75; max-width: 540px; margin: 0 auto 1.25rem; }
        .trt-meta {
          display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;
          font-size: 0.78rem; color: #475569;
        }

        /* Path visual */
        .trt-path {
          display: flex; align-items: center; justify-content: center;
          gap: 0; margin: 0 auto 2rem;
        }
        .trt-step {
          width: 36px; height: 36px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.9rem; font-weight: 700; border: 2px solid transparent;
        }
        .trt-s1 { background: rgba(148,163,184,0.1); border-color: rgba(148,163,184,0.2); color: #94A3B8; }
        .trt-s2 { background: rgba(167,139,250,0.08); border-color: rgba(167,139,250,0.2); color: rgba(167,139,250,0.6); font-size: 0.7rem; }
        .trt-s3 { background: rgba(167,139,250,0.1); border-color: rgba(167,139,250,0.25); color: rgba(167,139,250,0.75); font-size: 0.7rem; }
        .trt-s4 { background: rgba(167,139,250,0.15); border-color: rgba(167,139,250,0.4); color: #A78BFA; }
        .trt-connector {
          width: 24px; height: 2px;
          background: linear-gradient(to left, rgba(167,139,250,0.3), rgba(148,163,184,0.15));
        }

        /* Titles */
        .trt-title {
          font-size: 1.25rem; font-weight: 800; color: #E2E8F0;
          margin: 0 0 1.25rem; border-right: 3px solid #A78BFA; padding-right: 0.75rem;
        }

        /* Steps */
        .trt-steps { display: flex; flex-direction: column; gap: 1rem; }
        .trt-card {
          display: flex; gap: 1rem; align-items: flex-start;
          padding: 1.25rem; border-radius: 12px; border: 1px solid transparent;
        }
        .trt-card-1 { background: rgba(167,139,250,0.04); border-color: rgba(167,139,250,0.12); }
        .trt-card-2 { background: rgba(167,139,250,0.05); border-color: rgba(167,139,250,0.15); }
        .trt-card-3 { background: rgba(167,139,250,0.06); border-color: rgba(167,139,250,0.18); }
        .trt-card-4 { background: rgba(167,139,250,0.07); border-color: rgba(167,139,250,0.22); }
        .trt-card-num {
          min-width: 32px; height: 32px; border-radius: 50%;
          background: rgba(167,139,250,0.15); color: #A78BFA;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.9rem; font-weight: 800; flex-shrink: 0;
        }
        .trt-card-body h3 { font-size: 0.97rem; font-weight: 700; color: #E2E8F0; margin: 0 0 0.4rem; }
        .trt-card-body p { font-size: 0.85rem; color: #64748B; margin: 0 0 0.6rem; line-height: 1.65; }
        .trt-card-tip {
          font-size: 0.8rem; color: #A78BFA;
          background: rgba(167,139,250,0.07); border-radius: 6px;
          padding: 0.45rem 0.7rem; line-height: 1.5;
        }

        /* Errors */
        .trt-err-list { display: flex; flex-direction: column; gap: 0.85rem; }
        .trt-err {
          display: flex; gap: 0.9rem; align-items: flex-start;
          padding: 0.9rem; background: rgba(239,68,68,0.04);
          border: 1px solid rgba(239,68,68,0.12); border-radius: 10px;
        }
        .trt-err-x {
          min-width: 24px; height: 24px; border-radius: 50%;
          background: rgba(239,68,68,0.12); color: #EF4444;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.8rem; font-weight: 700; flex-shrink: 0;
        }
        .trt-err strong { display: block; color: #E2E8F0; font-size: 0.9rem; margin-bottom: 0.25rem; }
        .trt-err p { font-size: 0.82rem; color: #64748B; margin: 0; line-height: 1.6; }

        /* CTA */
        .trt-cta-box {
          background: rgba(167,139,250,0.06);
          border: 1px solid rgba(167,139,250,0.2);
          border-radius: 14px; padding: 2rem; text-align: center;
        }
        .trt-cta-title { font-size: 1.2rem; font-weight: 800; color: #E2E8F0; margin: 0 0 0.6rem; }
        .trt-cta-body { font-size: 0.9rem; color: #94A3B8; line-height: 1.7; margin: 0 0 1.5rem; }
        .trt-cta-btn {
          display: inline-block; background: #7C3AED; color: #fff;
          font-weight: 700; font-size: 0.95rem; padding: 0.75rem 2rem;
          border-radius: 8px; text-decoration: none; transition: opacity 0.2s;
        }
        .trt-cta-btn:hover { opacity: 0.88; }
      `}</style>

    </div>
  );
}
