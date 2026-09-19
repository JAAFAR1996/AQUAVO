import { useTranslation } from "react-i18next";
export default function GuideHeaterChoice() {
  const { t } = useTranslation("guides");
  return (
    <div className="htr-wrap">

      <header className="htr-bar">
        <a href="/" className="htr-brand">AQUAVO</a>
      </header>

      <main className="htr-main">

        {/* ── Hero ── */}
        <section className="htr-hero">
          <span className="htr-badge">{t("guides-heater-choice.s1")}</span>

          {/* Wattage gauge — CSS only */}
          <div className="htr-gauge-wrap" aria-hidden="true">
            <div className="htr-gauge">
              <div className="htr-gauge-arc"></div>
              <div className="htr-gauge-needle"></div>
              <div className="htr-gauge-center"></div>
            </div>
            <div className="htr-gauge-labels">
              <span>{t("guides-heater-choice.s2")}</span>
              <span className="htr-gauge-safe">{t("guides-heater-choice.s3")}</span>
              <span>{t("guides-heater-choice.s4")}</span>
            </div>
          </div>

          <h1>{t("guides-heater-choice.s5")}</h1>
          <p className="htr-sub">{t("guides-heater-choice.s6")}</p>
          <p className="htr-intro">
            {t("guides-heater-choice.s7")}
          </p>
          <div className="htr-meta">
            <span>{t("guides-heater-choice.s8")}</span>
            <span>{t("guides-heater-choice.s9")}</span>
          </div>
        </section>

        {/* ── تحذير: هيتر بدون ثرموستات ── */}
        <section className="htr-section">
          <h2 className="htr-title">{t("guides-heater-choice.s10")}</h2>
          <div className="htr-thermo-warn">
            <div className="htr-thermo-badge">{t("guides-heater-choice.s11")}</div>
            <p className="htr-thermo-text">
              {t("guides-heater-choice.s12")}
            </p>
          </div>
          <div className="htr-thermo-compare">
            <div className="htr-tc-bad">
              <div className="htr-tc-label htr-tc-label-bad">{t("guides-heater-choice.s13")}</div>
              <ul className="htr-tc-ul">
                <li>{t("guides-heater-choice.s14")}</li>
                <li>{t("guides-heater-choice.s15")}</li>
                <li>{t("guides-heater-choice.s16")}</li>
                <li>{t("guides-heater-choice.s17")}</li>
              </ul>
            </div>
            <div className="htr-tc-good">
              <div className="htr-tc-label htr-tc-label-good">{t("guides-heater-choice.s18")}</div>
              <ul className="htr-tc-ul">
                <li>{t("guides-heater-choice.s19")}</li>
                <li>{t("guides-heater-choice.s20")}</li>
                <li>{t("guides-heater-choice.s21")}</li>
                <li>{t("guides-heater-choice.s22")}</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── حساب الواط ── */}
        <section className="htr-section">
          <h2 className="htr-title">{t("guides-heater-choice.s23")}</h2>
          <p className="htr-body">
            {t("guides-heater-choice.s24")} <strong className="htr-hl">{t("guides-heater-choice.s25")}</strong> {t("guides-heater-choice.s26")}
          </p>
          <div className="htr-calc-table">
            <div className="htr-calc-row htr-calc-head">
              <span>{t("guides-heater-choice.s27")}</span>
              <span>{t("guides-heater-choice.s28")}</span>
              <span>{t("guides-heater-choice.s29")}</span>
            </div>
            <div className="htr-calc-row">
              <span>{t("guides-heater-choice.s30")}</span>
              <span>{t("guides-heater-choice.s31")}</span>
              <span>{t("guides-heater-choice.s32")}</span>
            </div>
            <div className="htr-calc-row">
              <span>{t("guides-heater-choice.s33")}</span>
              <span>{t("guides-heater-choice.s34")}</span>
              <span>{t("guides-heater-choice.s35")}</span>
            </div>
            <div className="htr-calc-row">
              <span>{t("guides-heater-choice.s36")}</span>
              <span>{t("guides-heater-choice.s37")}</span>
              <span>{t("guides-heater-choice.s38")}</span>
            </div>
            <div className="htr-calc-row">
              <span>{t("guides-heater-choice.s39")}</span>
              <span>{t("guides-heater-choice.s40")}</span>
              <span>{t("guides-heater-choice.s41")}</span>
            </div>
          </div>
          <p className="htr-note">
            {t("guides-heater-choice.s42")}
          </p>
        </section>

        {/* ── عوامل الاختيار ── */}
        <section className="htr-section">
          <h2 className="htr-title">{t("guides-heater-choice.s43")}</h2>
          <div className="htr-factors">
            <div className="htr-factor">
              <div className="htr-factor-num">{t("guides-heater-choice.s44")}</div>
              <div>
                <strong>{t("guides-heater-choice.s45")}</strong>
                <p>{t("guides-heater-choice.s46")}</p>
              </div>
            </div>
            <div className="htr-factor">
              <div className="htr-factor-num">{t("guides-heater-choice.s47")}</div>
              <div>
                <strong>{t("guides-heater-choice.s48")}</strong>
                <p>{t("guides-heater-choice.s49")}</p>
              </div>
            </div>
            <div className="htr-factor">
              <div className="htr-factor-num">{t("guides-heater-choice.s50")}</div>
              <div>
                <strong>{t("guides-heater-choice.s51")}</strong>
                <p>{t("guides-heater-choice.s52")}</p>
              </div>
            </div>
            <div className="htr-factor">
              <div className="htr-factor-num">{t("guides-heater-choice.s53")}</div>
              <div>
                <strong>{t("guides-heater-choice.s54")}</strong>
                <p>{t("guides-heater-choice.s55")}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── علامات الهيتر الخاطئ ── */}
        <section className="htr-section">
          <h2 className="htr-title">{t("guides-heater-choice.s56")}</h2>
          <div className="htr-warn-list">
            <div className="htr-warn htr-warn-low">
              <span className="htr-warn-tag">{t("guides-heater-choice.s57")}</span>
              <div>
                <strong>{t("guides-heater-choice.s58")}</strong>
                <p>{t("guides-heater-choice.s59")}</p>
              </div>
            </div>
            <div className="htr-warn htr-warn-low">
              <span className="htr-warn-tag">{t("guides-heater-choice.s57")}</span>
              <div>
                <strong>{t("guides-heater-choice.s60")}</strong>
                <p>{t("guides-heater-choice.s61")}</p>
              </div>
            </div>
            <div className="htr-warn htr-warn-high">
              <span className="htr-warn-tag htr-tag-high">{t("guides-heater-choice.s62")}</span>
              <div>
                <strong>{t("guides-heater-choice.s63")}</strong>
                <p>{t("guides-heater-choice.s64")}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="htr-cta-section">
          <div className="htr-cta-box">
            <h2 className="htr-cta-title">{t("guides-heater-choice.s65")}</h2>
            <p className="htr-cta-body">
              {t("guides-heater-choice.s66")}
            </p>
            <a
              href="https://www.instagram.com/aquavo_iq/"
              target="_blank"
              rel="noopener noreferrer"
              className="htr-cta-btn"
            >
              {t("guides-heater-choice.s67")}
            </a>
          </div>
        </section>

      </main>

      <style>{`
        .htr-wrap {
          min-height: 100vh;
          background: #0A0608;
          color: #E2E8F0;
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
          direction: rtl;
        }
        .htr-bar {
          position: sticky; top: 0; z-index: 50;
          height: 64px;
          background: rgba(10,6,8,0.96);
          backdrop-filter: blur(8px);
          border-bottom: 1px solid rgba(251,113,133,0.18);
          display: flex; align-items: center; padding: 0 1.25rem;
        }
        .htr-brand {
          color: #FB7185; font-weight: 700;
          letter-spacing: 4px; font-size: 1.1rem; text-decoration: none;
        }
        .htr-main {
          width: 100%; max-width: 720px;
          margin: 0 auto; padding: 2rem 1.25rem 5rem;
          display: flex; flex-direction: column; gap: 3.5rem;
        }

        /* Hero */
        .htr-hero { text-align: center; padding: 2rem 0; }
        .htr-badge {
          display: inline-block;
          border: 1px solid rgba(251,113,133,0.3);
          color: #FB7185; font-size: 0.7rem; font-weight: 700;
          letter-spacing: 1.5px; padding: 4px 14px; border-radius: 999px;
          margin-bottom: 1.75rem;
        }
        .htr-hero h1 {
          font-size: clamp(1.8rem, 6vw, 2.7rem);
          font-weight: 900; color: #FFF1F2;
          margin: 0 0 0.5rem; line-height: 1.15;
        }
        .htr-sub { font-size: 0.97rem; color: #FB7185; margin: 0 0 1rem; }
        .htr-intro { font-size: 0.93rem; color: #94A3B8; line-height: 1.75; max-width: 540px; margin: 0 auto 1.25rem; }
        .htr-meta {
          display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;
          font-size: 0.78rem; color: #475569;
        }

        /* Gauge visual */
        .htr-gauge-wrap { margin: 0 auto 2rem; display: flex; flex-direction: column; align-items: center; gap: 0.4rem; }
        .htr-gauge {
          width: 110px; height: 60px;
          position: relative; overflow: hidden;
        }
        .htr-gauge-arc {
          position: absolute; bottom: 0; left: 5px; right: 5px; height: 100px;
          border-radius: 100px 100px 0 0;
          background: conic-gradient(from 180deg at 50% 100%, #3B82F6 0deg, #22C55E 60deg, #EAB308 90deg, #EF4444 120deg, transparent 120deg);
          border: 2px solid rgba(255,255,255,0.07);
        }
        .htr-gauge-needle {
          position: absolute; bottom: 2px; left: 50%; width: 2px; height: 48px;
          background: #FB7185; transform-origin: bottom center;
          transform: translateX(-50%) rotate(-30deg);
          border-radius: 2px 2px 0 0;
        }
        .htr-gauge-center {
          position: absolute; bottom: -4px; left: 50%;
          width: 10px; height: 10px; border-radius: 50%;
          background: #FB7185; transform: translateX(-50%);
        }
        .htr-gauge-labels {
          display: flex; justify-content: space-between; width: 110px;
          font-size: 0.65rem; color: #64748B; font-weight: 600;
        }
        .htr-gauge-safe { color: #22C55E; }

        /* Titles */
        .htr-title {
          font-size: 1.25rem; font-weight: 800; color: #E2E8F0;
          margin: 0 0 1rem; border-right: 3px solid #FB7185; padding-right: 0.75rem;
        }
        .htr-body { font-size: 0.92rem; color: #94A3B8; line-height: 1.75; margin: 0 0 1rem; }
        .htr-hl { color: #FB7185; }

        /* Calc table */
        .htr-calc-table { display: flex; flex-direction: column; border-radius: 10px; overflow: hidden; border: 1px solid rgba(148,163,184,0.12); margin-bottom: 1rem; }
        .htr-calc-row {
          display: grid; grid-template-columns: 1.5fr 1fr 1fr;
          padding: 0.7rem 1rem; font-size: 0.86rem; color: #94A3B8;
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        .htr-calc-row:last-child { border-bottom: none; }
        .htr-calc-head { background: rgba(148,163,184,0.07); font-weight: 700; color: #CBD5E1; font-size: 0.78rem; }
        .htr-note { font-size: 0.82rem; color: #F59E0B; background: rgba(245,158,11,0.05); border: 1px solid rgba(245,158,11,0.15); border-radius: 8px; padding: 0.75rem 1rem; line-height: 1.6; }

        /* Factors */
        .htr-factors { display: flex; flex-direction: column; gap: 0.85rem; }
        .htr-factor {
          display: flex; gap: 0.9rem; align-items: flex-start;
          padding: 0.9rem; background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05); border-radius: 10px;
        }
        .htr-factor-num {
          min-width: 28px; height: 28px; border-radius: 50%;
          background: rgba(251,113,133,0.12); color: #FB7185;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.82rem; font-weight: 700; flex-shrink: 0;
        }
        .htr-factor strong { display: block; color: #E2E8F0; font-size: 0.92rem; margin-bottom: 0.25rem; }
        .htr-factor p { font-size: 0.83rem; color: #64748B; margin: 0; line-height: 1.6; }

        /* Warnings */
        .htr-warn-list { display: flex; flex-direction: column; gap: 0.8rem; }
        .htr-warn {
          display: flex; gap: 0.9rem; align-items: flex-start;
          padding: 0.9rem 1rem; border-radius: 10px; border: 1px solid transparent;
        }
        .htr-warn-low  { background: rgba(56,189,248,0.04); border-color: rgba(56,189,248,0.12); }
        .htr-warn-high { background: rgba(239,68,68,0.05); border-color: rgba(239,68,68,0.15); }
        .htr-warn-tag {
          min-width: 70px; font-size: 0.68rem; font-weight: 700;
          letter-spacing: 0.5px; flex-shrink: 0; padding-top: 3px;
          color: #38BDF8;
        }
        .htr-tag-high { color: #F87171; }
        .htr-warn strong { display: block; color: #E2E8F0; font-size: 0.9rem; margin-bottom: 0.2rem; }
        .htr-warn p { font-size: 0.82rem; color: #64748B; margin: 0; line-height: 1.5; }

        /* CTA */
        .htr-cta-box {
          background: rgba(251,113,133,0.05);
          border: 1px solid rgba(251,113,133,0.18);
          border-radius: 14px; padding: 2rem; text-align: center;
        }
        .htr-cta-title { font-size: 1.2rem; font-weight: 800; color: #E2E8F0; margin: 0 0 0.6rem; }
        .htr-cta-body { font-size: 0.9rem; color: #94A3B8; line-height: 1.7; margin: 0 0 1.5rem; }
        .htr-cta-btn {
          display: inline-block; background: #BE123C; color: #fff;
          font-weight: 700; font-size: 0.95rem; padding: 0.75rem 2rem;
          border-radius: 8px; text-decoration: none; transition: opacity 0.2s;
        }
        .htr-cta-btn:hover { opacity: 0.88; }

        /* Thermostat warning section */
        .htr-thermo-warn {
          background: rgba(239,68,68,0.06); border: 1px solid rgba(239,68,68,0.25);
          border-radius: 10px; padding: 1rem 1.1rem; margin-bottom: 1rem;
        }
        .htr-thermo-badge { font-size: 0.72rem; font-weight: 700; color: #F87171; letter-spacing: 0.5px; margin-bottom: 0.5rem; }
        .htr-thermo-text { font-size: 0.86rem; color: #CBD5E1; line-height: 1.7; margin: 0; }
        .htr-thermo-compare { display: grid; grid-template-columns: 1fr 1fr; gap: 0.9rem; margin-bottom: 0.5rem; }
        @media (max-width: 500px) { .htr-thermo-compare { grid-template-columns: 1fr; } }
        .htr-tc-bad  { background: rgba(239,68,68,0.04); border: 1px solid rgba(239,68,68,0.18); border-radius: 10px; padding: 1rem; }
        .htr-tc-good { background: rgba(34,197,94,0.04); border: 1px solid rgba(34,197,94,0.18); border-radius: 10px; padding: 1rem; }
        .htr-tc-label { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 0.6rem; }
        .htr-tc-label-bad  { color: #F87171; }
        .htr-tc-label-good { color: #86EFAC; }
        .htr-tc-ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.35rem; }
        .htr-tc-ul li { font-size: 0.82rem; color: #94A3B8; padding-right: 0.7rem; position: relative; line-height: 1.5; }
        .htr-tc-bad .htr-tc-ul li::before  { content: '–'; position: absolute; right: 0; color: rgba(239,68,68,0.4); }
        .htr-tc-good .htr-tc-ul li::before { content: '–'; position: absolute; right: 0; color: rgba(34,197,94,0.4); }
      `}</style>

    </div>
  );
}
