import { useTranslation } from "react-i18next";
export default function GuideFilterMedia() {
  const { t } = useTranslation("guides");
  return (
    <div className="fmd-wrap">

      <header className="fmd-bar">
        <a href="/" className="fmd-brand">AQUAVO</a>
      </header>

      <main className="fmd-main">

        {/* ── Hero ── */}
        <section className="fmd-hero">
          <span className="fmd-badge">{t("guides-filter-media.s1")}</span>

          {/* Stacked filter layers — CSS only */}
          <div className="fmd-layers" aria-hidden="true">
            <div className="fmd-layer fmd-layer-top">
              <span className="fmd-layer-lbl">{t("guides-filter-media.s2")}</span>
            </div>
            <div className="fmd-layer fmd-layer-mid">
              <span className="fmd-layer-lbl">{t("guides-filter-media.s3")}</span>
            </div>
            <div className="fmd-layer fmd-layer-bot">
              <span className="fmd-layer-lbl">{t("guides-filter-media.s4")}</span>
            </div>
          </div>

          <h1>{t("guides-filter-media.s5")}</h1>
          <p className="fmd-sub">{t("guides-filter-media.s6")}</p>
          <p className="fmd-intro">
            {t("guides-filter-media.s7")}
          </p>
          <div className="fmd-meta">
            <span>{t("guides-filter-media.s8")}</span>
            <span>{t("guides-filter-media.s9")}</span>
          </div>
        </section>

        {/* ── الطبقات الثلاث ── */}
        <section className="fmd-section">
          <h2 className="fmd-title">{t("guides-filter-media.s10")}</h2>
          <p className="fmd-body">
            {t("guides-filter-media.s11")}
          </p>

          <div className="fmd-stack">
            <div className="fmd-block fmd-mech">
              <div className="fmd-block-num">{t("guides-filter-media.s12")}</div>
              <div className="fmd-block-body">
                <div className="fmd-block-tag">{t("guides-filter-media.s13")}</div>
                <h3>{t("guides-filter-media.s14")}</h3>
                <p>{t("guides-filter-media.s15")}</p>
                <div className="fmd-block-note">
                  <strong>{t("guides-filter-media.s16")}</strong> {t("guides-filter-media.s17")}
                </div>
              </div>
            </div>

            <div className="fmd-arrow">↓</div>

            <div className="fmd-block fmd-bio">
              <div className="fmd-block-num">{t("guides-filter-media.s18")}</div>
              <div className="fmd-block-body">
                <div className="fmd-block-tag">{t("guides-filter-media.s19")}</div>
                <h3>{t("guides-filter-media.s20")}</h3>
                <p>{t("guides-filter-media.s21")}</p>
                <div className="fmd-block-note">
                  <strong>{t("guides-filter-media.s22")}</strong> {t("guides-filter-media.s23")}
                </div>
              </div>
            </div>

            <div className="fmd-arrow">↓</div>

            <div className="fmd-block fmd-chem">
              <div className="fmd-block-num">{t("guides-filter-media.s24")}</div>
              <div className="fmd-block-body">
                <div className="fmd-block-tag">{t("guides-filter-media.s25")}</div>
                <h3>{t("guides-filter-media.s26")}</h3>
                <p>{t("guides-filter-media.s27")}</p>
                <div className="fmd-block-note">
                  <strong>{t("guides-filter-media.s28")}</strong> {t("guides-filter-media.s29")}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── جدول البيو ── */}
        <section className="fmd-section">
          <h2 className="fmd-title">{t("guides-filter-media.s30")}</h2>
          <div className="fmd-table">
            <div className="fmd-trow fmd-thead">
              <span>{t("guides-filter-media.s31")}</span>
              <span>{t("guides-filter-media.s32")}</span>
              <span>{t("guides-filter-media.s33")}</span>
            </div>
            <div className="fmd-trow">
              <span>{t("guides-filter-media.s34")}</span>
              <span>{t("guides-filter-media.s35")}</span>
              <span>{t("guides-filter-media.s36")}</span>
            </div>
            <div className="fmd-trow">
              <span>{t("guides-filter-media.s37")}</span>
              <span>{t("guides-filter-media.s35")}</span>
              <span>{t("guides-filter-media.s38")}</span>
            </div>
            <div className="fmd-trow">
              <span>{t("guides-filter-media.s39")}</span>
              <span>{t("guides-filter-media.s40")}</span>
              <span>{t("guides-filter-media.s41")}</span>
            </div>
            <div className="fmd-trow">
              <span>{t("guides-filter-media.s42")}</span>
              <span>{t("guides-filter-media.s43")}</span>
              <span>{t("guides-filter-media.s38")}</span>
            </div>
          </div>
        </section>

        {/* ── لا تبدل كل شيء مرة ── */}
        <section className="fmd-section">
          <h2 className="fmd-title">{t("guides-filter-media.s44")}</h2>
          <p className="fmd-body">
            {t("guides-filter-media.s45")}
          </p>
          <div className="fmd-rule-grid">
            <div className="fmd-rule-bad">
              <div className="fmd-rule-tag fmd-tag-bad">{t("guides-filter-media.s46")}</div>
              <ul className="fmd-rule-ul">
                <li>{t("guides-filter-media.s47")}</li>
                <li>{t("guides-filter-media.s48")}</li>
                <li>{t("guides-filter-media.s49")}</li>
              </ul>
              <div className="fmd-rule-result">{t("guides-filter-media.s50")}</div>
            </div>
            <div className="fmd-rule-good">
              <div className="fmd-rule-tag fmd-tag-good">{t("guides-filter-media.s51")}</div>
              <ul className="fmd-rule-ul">
                <li>{t("guides-filter-media.s52")}</li>
                <li>{t("guides-filter-media.s53")}</li>
                <li>{t("guides-filter-media.s54")}</li>
                <li>{t("guides-filter-media.s55")}</li>
              </ul>
            </div>
          </div>
          <div className="fmd-stagger-note">
            {t("guides-filter-media.s56")}
          </div>
        </section>

        {/* ── علامات التحذير ── */}
        <section className="fmd-section">
          <h2 className="fmd-title">{t("guides-filter-media.s57")}</h2>
          <div className="fmd-warn-list">
            <div className="fmd-warn">
              <span className="fmd-warn-dot"></span>
              <div>
                <strong>{t("guides-filter-media.s58")}</strong>
                <p>{t("guides-filter-media.s59")}</p>
              </div>
            </div>
            <div className="fmd-warn">
              <span className="fmd-warn-dot"></span>
              <div>
                <strong>{t("guides-filter-media.s60")}</strong>
                <p>{t("guides-filter-media.s61")}</p>
              </div>
            </div>
            <div className="fmd-warn">
              <span className="fmd-warn-dot"></span>
              <div>
                <strong>{t("guides-filter-media.s62")}</strong>
                <p>{t("guides-filter-media.s63")}</p>
              </div>
            </div>
            <div className="fmd-warn">
              <span className="fmd-warn-dot"></span>
              <div>
                <strong>{t("guides-filter-media.s64")}</strong>
                <p>{t("guides-filter-media.s65")}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="fmd-cta-section">
          <div className="fmd-cta-box">
            <h2 className="fmd-cta-title">{t("guides-filter-media.s66")}</h2>
            <p className="fmd-cta-body">
              {t("guides-filter-media.s67")}
            </p>
            <a
              href="https://www.instagram.com/aquavo_iq/"
              target="_blank"
              rel="noopener noreferrer"
              className="fmd-cta-btn"
            >
              {t("guides-filter-media.s68")}
            </a>
          </div>
        </section>

      </main>

      <style>{`
        .fmd-wrap {
          min-height: 100vh;
          background: #060B14;
          color: #E2E8F0;
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
          direction: rtl;
        }
        .fmd-bar {
          position: sticky; top: 0; z-index: 50;
          height: 64px;
          background: rgba(6,11,20,0.96);
          backdrop-filter: blur(8px);
          border-bottom: 1px solid rgba(251,191,36,0.15);
          display: flex; align-items: center; padding: 0 1.25rem;
        }
        .fmd-brand {
          color: #FCD34D; font-weight: 700;
          letter-spacing: 4px; font-size: 1.1rem; text-decoration: none;
        }
        .fmd-main {
          width: 100%; max-width: 720px;
          margin: 0 auto; padding: 2rem 1.25rem 5rem;
          display: flex; flex-direction: column; gap: 3.5rem;
        }

        /* Hero */
        .fmd-hero { text-align: center; padding: 2rem 0; }
        .fmd-badge {
          display: inline-block;
          border: 1px solid rgba(251,191,36,0.3);
          color: #FCD34D; font-size: 0.7rem; font-weight: 700;
          letter-spacing: 1.5px; padding: 4px 14px; border-radius: 999px;
          margin-bottom: 1.75rem;
        }
        .fmd-hero h1 {
          font-size: clamp(1.8rem, 6vw, 2.7rem);
          font-weight: 900; color: #FFFBEB;
          margin: 0 0 0.5rem; line-height: 1.15;
        }
        .fmd-sub { font-size: 0.97rem; color: #FCD34D; margin: 0 0 1rem; }
        .fmd-intro { font-size: 0.93rem; color: #94A3B8; line-height: 1.75; max-width: 540px; margin: 0 auto 1.25rem; }
        .fmd-meta {
          display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;
          font-size: 0.78rem; color: #475569;
        }

        /* Layers visual */
        .fmd-layers {
          width: 180px; margin: 0 auto 2rem;
          display: flex; flex-direction: column; gap: 4px;
        }
        .fmd-layer {
          height: 32px; border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.72rem; font-weight: 700; letter-spacing: 1px;
        }
        .fmd-layer-top {
          background: rgba(251,191,36,0.15);
          border: 1px solid rgba(251,191,36,0.35);
          color: #FCD34D;
        }
        .fmd-layer-mid {
          background: rgba(52,211,153,0.12);
          border: 1px solid rgba(52,211,153,0.3);
          color: #6EE7B7; width: 90%; margin: 0 auto;
        }
        .fmd-layer-bot {
          background: rgba(148,163,184,0.07);
          border: 1px solid rgba(148,163,184,0.2);
          color: #94A3B8; width: 80%; margin: 0 auto;
        }
        .fmd-layer-lbl { font-size: 0.68rem; letter-spacing: 1.5px; }

        /* Titles */
        .fmd-title {
          font-size: 1.25rem; font-weight: 800; color: #E2E8F0;
          margin: 0 0 1rem; border-right: 3px solid #FCD34D; padding-right: 0.75rem;
        }
        .fmd-body { font-size: 0.92rem; color: #94A3B8; line-height: 1.75; margin: 0 0 1.25rem; }

        /* Stack blocks */
        .fmd-stack { display: flex; flex-direction: column; align-items: stretch; }
        .fmd-arrow {
          text-align: center; font-size: 1.4rem; color: rgba(148,163,184,0.3);
          margin: -4px 0; line-height: 1.4;
        }
        .fmd-block {
          display: flex; gap: 1rem; padding: 1.25rem;
          border-radius: 12px; border: 1px solid transparent;
          position: relative;
        }
        .fmd-mech { background: rgba(251,191,36,0.05); border-color: rgba(251,191,36,0.18); }
        .fmd-bio  { background: rgba(52,211,153,0.04); border-color: rgba(52,211,153,0.15); }
        .fmd-chem { background: rgba(148,163,184,0.04); border-color: rgba(148,163,184,0.12); }
        .fmd-block-num {
          min-width: 32px; height: 32px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.9rem; font-weight: 800; flex-shrink: 0;
        }
        .fmd-mech .fmd-block-num { background: rgba(251,191,36,0.15); color: #FCD34D; }
        .fmd-bio  .fmd-block-num { background: rgba(52,211,153,0.12); color: #6EE7B7; }
        .fmd-chem .fmd-block-num { background: rgba(148,163,184,0.1); color: #94A3B8; }
        .fmd-block-tag {
          font-size: 0.68rem; font-weight: 700; letter-spacing: 1px;
          margin-bottom: 0.3rem;
        }
        .fmd-mech .fmd-block-tag { color: #FCD34D; }
        .fmd-bio  .fmd-block-tag { color: #6EE7B7; }
        .fmd-chem .fmd-block-tag { color: #94A3B8; }
        .fmd-block-body h3 { font-size: 0.95rem; font-weight: 700; color: #E2E8F0; margin: 0 0 0.3rem; }
        .fmd-block-body p { font-size: 0.83rem; color: #64748B; margin: 0 0 0.6rem; line-height: 1.6; }
        .fmd-block-note {
          font-size: 0.8rem; color: #94A3B8;
          background: rgba(0,0,0,0.2); border-radius: 6px; padding: 0.5rem 0.75rem;
          line-height: 1.5;
        }
        .fmd-block-note strong { color: #CBD5E1; }

        /* Table */
        .fmd-table { display: flex; flex-direction: column; border-radius: 10px; overflow: hidden; border: 1px solid rgba(148,163,184,0.12); }
        .fmd-trow {
          display: grid; grid-template-columns: 1.5fr 1fr 1fr;
          padding: 0.7rem 1rem; font-size: 0.86rem; color: #94A3B8;
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        .fmd-trow:last-child { border-bottom: none; }
        .fmd-thead { background: rgba(148,163,184,0.07); font-weight: 700; color: #CBD5E1; font-size: 0.78rem; }

        /* Warnings */
        .fmd-warn-list { display: flex; flex-direction: column; gap: 0.9rem; }
        .fmd-warn { display: flex; gap: 0.9rem; align-items: flex-start; }
        .fmd-warn-dot { min-width: 8px; height: 8px; border-radius: 50%; background: #F87171; margin-top: 6px; flex-shrink: 0; }
        .fmd-warn strong { display: block; color: #E2E8F0; font-size: 0.92rem; margin-bottom: 0.2rem; }
        .fmd-warn p { font-size: 0.83rem; color: #64748B; margin: 0; line-height: 1.6; }

        /* CTA */
        .fmd-cta-box {
          background: rgba(251,191,36,0.05);
          border: 1px solid rgba(251,191,36,0.18);
          border-radius: 14px; padding: 2rem; text-align: center;
        }
        .fmd-cta-title { font-size: 1.2rem; font-weight: 800; color: #E2E8F0; margin: 0 0 0.6rem; }
        .fmd-cta-body { font-size: 0.9rem; color: #94A3B8; line-height: 1.7; margin: 0 0 1.5rem; }
        .fmd-cta-btn {
          display: inline-block; background: #D97706; color: #fff;
          font-weight: 700; font-size: 0.95rem; padding: 0.75rem 2rem;
          border-radius: 8px; text-decoration: none; transition: opacity 0.2s;
        }
        .fmd-cta-btn:hover { opacity: 0.88; }

        /* Staggered maintenance rule */
        .fmd-rule-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.9rem; margin-bottom: 0.9rem; }
        @media (max-width: 500px) { .fmd-rule-grid { grid-template-columns: 1fr; } }
        .fmd-rule-bad  { background: rgba(239,68,68,0.04); border: 1px solid rgba(239,68,68,0.18); border-radius: 10px; padding: 1rem; }
        .fmd-rule-good { background: rgba(52,211,153,0.04); border: 1px solid rgba(52,211,153,0.18); border-radius: 10px; padding: 1rem; }
        .fmd-rule-tag { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 0.65rem; }
        .fmd-tag-bad  { color: #F87171; }
        .fmd-tag-good { color: #6EE7B7; }
        .fmd-rule-ul { list-style: none; padding: 0; margin: 0 0 0.65rem; display: flex; flex-direction: column; gap: 0.3rem; }
        .fmd-rule-ul li { font-size: 0.82rem; color: #94A3B8; padding-right: 0.7rem; position: relative; line-height: 1.5; }
        .fmd-rule-bad .fmd-rule-ul li::before  { content: '–'; position: absolute; right: 0; color: rgba(239,68,68,0.4); }
        .fmd-rule-good .fmd-rule-ul li::before { content: '–'; position: absolute; right: 0; color: rgba(52,211,153,0.4); }
        .fmd-rule-result { font-size: 0.78rem; color: #F87171; background: rgba(239,68,68,0.06); border-radius: 6px; padding: 0.4rem 0.65rem; line-height: 1.5; }
        .fmd-stagger-note { background: rgba(52,211,153,0.05); border-right: 3px solid rgba(52,211,153,0.35); border-radius: 0 8px 8px 0; padding: 0.75rem 1rem; font-size: 0.83rem; color: #6EE7B7; line-height: 1.6; }
      `}</style>

    </div>
  );
}
