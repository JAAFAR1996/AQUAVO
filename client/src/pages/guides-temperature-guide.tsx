import { useTranslation } from "react-i18next";
export default function GuideTemperatureGuide() {
  const { t } = useTranslation("guides");
  return (
    <div className="tmp-wrap">

      <header className="tmp-bar">
        <a href="/" className="tmp-brand">AQUAVO</a>
      </header>

      <main className="tmp-main">

        {/* ── Hero ── */}
        <section className="tmp-hero">
          <span className="tmp-badge">{t("guides-temperature-guide.s1")}</span>

          {/* Thermal gradient bar */}
          <div className="tmp-gradient-bar" aria-hidden="true">
            <div className="tmp-gradient-track">
              <div className="tmp-gradient-fill"></div>
              <div className="tmp-comfort-zone"></div>
              <div className="tmp-needle"></div>
            </div>
            <div className="tmp-bar-labels">
              <span>18°</span>
              <span className="tmp-comfort-lbl">{t("guides-temperature-guide.s2")}</span>
              <span>32°</span>
            </div>
          </div>

          <h1>{t("guides-temperature-guide.s3")}</h1>
          <p className="tmp-sub">{t("guides-temperature-guide.s4")}</p>
          <p className="tmp-intro">
            {t("guides-temperature-guide.s5")}
          </p>
          <div className="tmp-meta">
            <span>{t("guides-temperature-guide.s6")}</span>
            <span>{t("guides-temperature-guide.s7")}</span>
          </div>
        </section>

        {/* ── المناطق ── */}
        <section className="tmp-section">
          <h2 className="tmp-title">{t("guides-temperature-guide.s8")}</h2>
          <div className="tmp-zones">
            <div className="tmp-zone tmp-zone-cold">
              <div className="tmp-zone-range">{t("guides-temperature-guide.s9")}</div>
              <div className="tmp-zone-name">{t("guides-temperature-guide.s10")}</div>
              <ul className="tmp-zone-ul">
                <li>{t("guides-temperature-guide.s11")}</li>
                <li>{t("guides-temperature-guide.s12")}</li>
                <li>{t("guides-temperature-guide.s13")}</li>
              </ul>
            </div>
            <div className="tmp-zone tmp-zone-safe">
              <div className="tmp-zone-range">24° – 28°</div>
              <div className="tmp-zone-name">{t("guides-temperature-guide.s14")}</div>
              <ul className="tmp-zone-ul">
                <li>{t("guides-temperature-guide.s15")}</li>
                <li>{t("guides-temperature-guide.s16")}</li>
                <li>{t("guides-temperature-guide.s17")}</li>
              </ul>
            </div>
            <div className="tmp-zone tmp-zone-hot">
              <div className="tmp-zone-range">{t("guides-temperature-guide.s18")}</div>
              <div className="tmp-zone-name">{t("guides-temperature-guide.s19")}</div>
              <ul className="tmp-zone-ul">
                <li>{t("guides-temperature-guide.s20")}</li>
                <li>{t("guides-temperature-guide.s21")}</li>
                <li>{t("guides-temperature-guide.s22")}</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── حسب نوع السمچ ── */}
        <section className="tmp-section">
          <h2 className="tmp-title">{t("guides-temperature-guide.s23")}</h2>
          <div className="tmp-fish-table">
            <div className="tmp-fish-row tmp-fish-header">
              <span>{t("guides-temperature-guide.s24")}</span>
              <span>{t("guides-temperature-guide.s25")}</span>
            </div>
            <div className="tmp-fish-row">
              <span>{t("guides-temperature-guide.s26")}</span>
              <span>24° – 27°</span>
            </div>
            <div className="tmp-fish-row">
              <span>{t("guides-temperature-guide.s27")}</span>
              <span>18° – 22°</span>
            </div>
            <div className="tmp-fish-row">
              <span>{t("guides-temperature-guide.s28")}</span>
              <span>26° – 30°</span>
            </div>
            <div className="tmp-fish-row">
              <span>{t("guides-temperature-guide.s29")}</span>
              <span>28° – 31°</span>
            </div>
            <div className="tmp-fish-row">
              <span>{t("guides-temperature-guide.s30")}</span>
              <span>20° – 24°</span>
            </div>
            <div className="tmp-fish-row">
              <span>{t("guides-temperature-guide.s31")}</span>
              <span>25° – 27°</span>
            </div>
          </div>
        </section>

        {/* ── علامات المشكلة ── */}
        <section className="tmp-section">
          <h2 className="tmp-title">{t("guides-temperature-guide.s32")}</h2>
          <div className="tmp-signs">
            <div className="tmp-sign">
              <span className="tmp-sign-dot tmp-dot-hot"></span>
              <div>
                <strong>{t("guides-temperature-guide.s33")}</strong>
                <p>{t("guides-temperature-guide.s34")}</p>
              </div>
            </div>
            <div className="tmp-sign">
              <span className="tmp-sign-dot tmp-dot-hot"></span>
              <div>
                <strong>{t("guides-temperature-guide.s35")}</strong>
                <p>{t("guides-temperature-guide.s36")}</p>
              </div>
            </div>
            <div className="tmp-sign">
              <span className="tmp-sign-dot tmp-dot-cold"></span>
              <div>
                <strong>{t("guides-temperature-guide.s37")}</strong>
                <p>{t("guides-temperature-guide.s38")}</p>
              </div>
            </div>
            <div className="tmp-sign">
              <span className="tmp-sign-dot tmp-dot-cold"></span>
              <div>
                <strong>{t("guides-temperature-guide.s39")}</strong>
                <p>{t("guides-temperature-guide.s40")}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── نصائح الثبات ── */}
        <section className="tmp-section">
          <h2 className="tmp-title">{t("guides-temperature-guide.s41")}</h2>
          <div className="tmp-tips">
            <div className="tmp-tip">
              <span className="tmp-tip-num">{t("guides-temperature-guide.s42")}</span>
              <div>
                <strong>{t("guides-temperature-guide.s43")}</strong>
                <p>{t("guides-temperature-guide.s44")}</p>
              </div>
            </div>
            <div className="tmp-tip">
              <span className="tmp-tip-num">{t("guides-temperature-guide.s45")}</span>
              <div>
                <strong>{t("guides-temperature-guide.s46")}</strong>
                <p>{t("guides-temperature-guide.s47")}</p>
              </div>
            </div>
            <div className="tmp-tip">
              <span className="tmp-tip-num">{t("guides-temperature-guide.s48")}</span>
              <div>
                <strong>{t("guides-temperature-guide.s49")}</strong>
                <p>{t("guides-temperature-guide.s50")}</p>
              </div>
            </div>
            <div className="tmp-tip">
              <span className="tmp-tip-num">{t("guides-temperature-guide.s51")}</span>
              <div>
                <strong>{t("guides-temperature-guide.s52")}</strong>
                <p>{t("guides-temperature-guide.s53")}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── مشكلة الصيف العراقي ── */}
        <section className="tmp-section">
          <h2 className="tmp-title">{t("guides-temperature-guide.s54")}</h2>
          <p className="tmp-body">
            {t("guides-temperature-guide.s55")}
          </p>
          <div className="tmp-iraq-grid">
            <div className="tmp-iraq-box tmp-iraq-warn">
              <div className="tmp-iraq-label">{t("guides-temperature-guide.s56")}</div>
              <ul className="tmp-iraq-ul">
                <li>{t("guides-temperature-guide.s57")}</li>
                <li>{t("guides-temperature-guide.s58")}</li>
                <li>{t("guides-temperature-guide.s59")}</li>
                <li>{t("guides-temperature-guide.s60")}</li>
              </ul>
            </div>
            <div className="tmp-iraq-box tmp-iraq-safe">
              <div className="tmp-iraq-label">{t("guides-temperature-guide.s61")}</div>
              <ul className="tmp-iraq-ul">
                <li>{t("guides-temperature-guide.s62")}</li>
                <li>{t("guides-temperature-guide.s63")}</li>
                <li>{t("guides-temperature-guide.s64")}</li>
                <li>{t("guides-temperature-guide.s65")}</li>
              </ul>
            </div>
          </div>
          <div className="tmp-cooling-list">
            <div className="tmp-cooling-title">{t("guides-temperature-guide.s66")}</div>
            <div className="tmp-cooling-item">
              <span className="tmp-cooling-num">{t("guides-temperature-guide.s42")}</span>
              <div>
                <strong>{t("guides-temperature-guide.s67")}</strong>
                <p>{t("guides-temperature-guide.s68")}</p>
              </div>
            </div>
            <div className="tmp-cooling-item">
              <span className="tmp-cooling-num">{t("guides-temperature-guide.s45")}</span>
              <div>
                <strong>{t("guides-temperature-guide.s69")}</strong>
                <p>{t("guides-temperature-guide.s70")}</p>
              </div>
            </div>
            <div className="tmp-cooling-item">
              <span className="tmp-cooling-num">{t("guides-temperature-guide.s48")}</span>
              <div>
                <strong>{t("guides-temperature-guide.s71")}</strong>
                <p>{t("guides-temperature-guide.s72")}</p>
                <div className="tmp-cooling-warn">{t("guides-temperature-guide.s73")}</div>
              </div>
            </div>
            <div className="tmp-cooling-item">
              <span className="tmp-cooling-num">{t("guides-temperature-guide.s51")}</span>
              <div>
                <strong>{t("guides-temperature-guide.s74")}</strong>
                <p>{t("guides-temperature-guide.s75")}</p>
              </div>
            </div>
          </div>
          <div className="tmp-iraq-note">
            {t("guides-temperature-guide.s76")}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="tmp-cta-section">
          <div className="tmp-cta-box">
            <h2 className="tmp-cta-title">{t("guides-temperature-guide.s77")}</h2>
            <p className="tmp-cta-body">
              {t("guides-temperature-guide.s78")}
            </p>
            <a
              href="https://www.instagram.com/aquavo_iq/"
              target="_blank"
              rel="noopener noreferrer"
              className="tmp-cta-btn"
            >
              {t("guides-temperature-guide.s79")}
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
