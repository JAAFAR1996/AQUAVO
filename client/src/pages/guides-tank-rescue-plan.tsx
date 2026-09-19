import { useTranslation } from "react-i18next";
export default function GuideTankRescuePlan() {
  const { t } = useTranslation("guides");
  return (
    <div className="rsc-wrap">

      <header className="rsc-bar">
        <a href="/" className="rsc-brand">AQUAVO</a>
      </header>

      <main className="rsc-main">

        {/* ── Hero ── */}
        <section className="rsc-hero">
          <span className="rsc-badge">{t("guides-tank-rescue-plan.s1")}</span>

          {/* Day-zero countdown ring */}
          <div className="rsc-ring" aria-hidden="true">
            <div className="rsc-ring-track"></div>
            <div className="rsc-ring-fill"></div>
            <div className="rsc-ring-core">
              <span className="rsc-ring-num">{t("guides-tank-rescue-plan.s2")}</span>
              <span className="rsc-ring-lbl">{t("guides-tank-rescue-plan.s3")}</span>
            </div>
          </div>

          <h1>{t("guides-tank-rescue-plan.s4")}</h1>
          <p className="rsc-sub">{t("guides-tank-rescue-plan.s5")}</p>
          <p className="rsc-intro">
            {t("guides-tank-rescue-plan.s6")}
          </p>
          <div className="rsc-meta">
            <span>{t("guides-tank-rescue-plan.s7")}</span>
            <span>{t("guides-tank-rescue-plan.s8")}</span>
          </div>
        </section>

        {/* ── قبل ما تبدأ ── */}
        <section className="rsc-section">
          <h2 className="rsc-title">{t("guides-tank-rescue-plan.s9")}</h2>
          <p className="rsc-body">
            {t("guides-tank-rescue-plan.s10")}
          </p>
          <div className="rsc-prereq-grid">
            <div className="rsc-prereq">
              <div className="rsc-prereq-num">{t("guides-tank-rescue-plan.s11")}</div>
              <div>
                <strong>{t("guides-tank-rescue-plan.s12")}</strong>
                <p>{t("guides-tank-rescue-plan.s13")}</p>
              </div>
            </div>
            <div className="rsc-prereq">
              <div className="rsc-prereq-num">{t("guides-tank-rescue-plan.s14")}</div>
              <div>
                <strong>{t("guides-tank-rescue-plan.s15")}</strong>
                <p>{t("guides-tank-rescue-plan.s16")}</p>
              </div>
            </div>
            <div className="rsc-prereq">
              <div className="rsc-prereq-num">{t("guides-tank-rescue-plan.s17")}</div>
              <div>
                <strong>{t("guides-tank-rescue-plan.s18")}</strong>
                <p>{t("guides-tank-rescue-plan.s19")}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Timeline ── */}
        <section className="rsc-section">
          <h2 className="rsc-title">{t("guides-tank-rescue-plan.s20")}</h2>
          <p className="rsc-body">{t("guides-tank-rescue-plan.s21")}</p>

          <div className="rsc-timeline">
            <div className="rsc-tline-rail" aria-hidden="true"></div>

            <div className="rsc-station">
              <div className="rsc-station-dot rsc-dot-zero">{t("guides-tank-rescue-plan.s22")}</div>
              <div className="rsc-station-content">
                <h3>{t("guides-tank-rescue-plan.s23")}</h3>
                <ul className="rsc-ul">
                  <li>{t("guides-tank-rescue-plan.s24")}</li>
                  <li>{t("guides-tank-rescue-plan.s25")}</li>
                  <li>{t("guides-tank-rescue-plan.s26")}</li>
                  <li>{t("guides-tank-rescue-plan.s27")}</li>
                  <li>{t("guides-tank-rescue-plan.s28")}</li>
                </ul>
              </div>
            </div>

            <div className="rsc-station">
              <div className="rsc-station-dot rsc-dot-week">{t("guides-tank-rescue-plan.s29")}</div>
              <div className="rsc-station-content">
                <h3>{t("guides-tank-rescue-plan.s30")}</h3>
                <ul className="rsc-ul">
                  <li>{t("guides-tank-rescue-plan.s31")}</li>
                  <li>{t("guides-tank-rescue-plan.s32")}</li>
                  <li>{t("guides-tank-rescue-plan.s33")}</li>
                  <li>{t("guides-tank-rescue-plan.s34")}</li>
                </ul>
              </div>
            </div>

            <div className="rsc-station">
              <div className="rsc-station-dot rsc-dot-week">{t("guides-tank-rescue-plan.s35")}</div>
              <div className="rsc-station-content">
                <h3>{t("guides-tank-rescue-plan.s36")}</h3>
                <ul className="rsc-ul">
                  <li>{t("guides-tank-rescue-plan.s37")}</li>
                  <li>{t("guides-tank-rescue-plan.s38")}</li>
                  <li>{t("guides-tank-rescue-plan.s39")}</li>
                  <li>{t("guides-tank-rescue-plan.s40")}</li>
                  <li>{t("guides-tank-rescue-plan.s41")}</li>
                </ul>
              </div>
            </div>

            <div className="rsc-station">
              <div className="rsc-station-dot rsc-dot-week">{t("guides-tank-rescue-plan.s42")}</div>
              <div className="rsc-station-content">
                <h3>{t("guides-tank-rescue-plan.s43")}</h3>
                <ul className="rsc-ul">
                  <li>{t("guides-tank-rescue-plan.s44")}</li>
                  <li>{t("guides-tank-rescue-plan.s45")}</li>
                  <li>{t("guides-tank-rescue-plan.s46")}</li>
                  <li>{t("guides-tank-rescue-plan.s47")}</li>
                </ul>
              </div>
            </div>

            <div className="rsc-station">
              <div className="rsc-station-dot rsc-dot-final">{t("guides-tank-rescue-plan.s2")}</div>
              <div className="rsc-station-content">
                <h3>{t("guides-tank-rescue-plan.s48")}</h3>
                <ul className="rsc-ul">
                  <li>{t("guides-tank-rescue-plan.s49")}</li>
                  <li>{t("guides-tank-rescue-plan.s50")}</li>
                  <li>{t("guides-tank-rescue-plan.s51")}</li>
                  <li>{t("guides-tank-rescue-plan.s52")}</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── علامات تقول الخطة ناجحة ── */}
        <section className="rsc-section">
          <h2 className="rsc-title">{t("guides-tank-rescue-plan.s53")}</h2>
          <div className="rsc-signs">
            <div className="rsc-sign rsc-sign-good">
              <span className="rsc-sign-icon">✓</span>
              <span>{t("guides-tank-rescue-plan.s54")}</span>
            </div>
            <div className="rsc-sign rsc-sign-good">
              <span className="rsc-sign-icon">✓</span>
              <span>{t("guides-tank-rescue-plan.s55")}</span>
            </div>
            <div className="rsc-sign rsc-sign-good">
              <span className="rsc-sign-icon">✓</span>
              <span>{t("guides-tank-rescue-plan.s56")}</span>
            </div>
            <div className="rsc-sign rsc-sign-good">
              <span className="rsc-sign-icon">✓</span>
              <span>{t("guides-tank-rescue-plan.s57")}</span>
            </div>
            <div className="rsc-sign rsc-sign-warn">
              <span className="rsc-sign-icon">⚠</span>
              <span>{t("guides-tank-rescue-plan.s58")}</span>
            </div>
            <div className="rsc-sign rsc-sign-warn">
              <span className="rsc-sign-icon">⚠</span>
              <span>{t("guides-tank-rescue-plan.s59")}</span>
            </div>
          </div>
        </section>

        {/* ── إذا الخطة ما نجحت ── */}
        <section className="rsc-section">
          <h2 className="rsc-title">{t("guides-tank-rescue-plan.s60")}</h2>
          <p className="rsc-body">
            {t("guides-tank-rescue-plan.s61")}
          </p>
          <div className="rsc-escalation">
            <div className="rsc-esc-step">
              <div className="rsc-esc-badge">A</div>
              <div className="rsc-esc-content">
                <strong>{t("guides-tank-rescue-plan.s62")}</strong>
                <p>{t("guides-tank-rescue-plan.s63")}</p>
              </div>
            </div>
            <div className="rsc-esc-step">
              <div className="rsc-esc-badge">B</div>
              <div className="rsc-esc-content">
                <strong>{t("guides-tank-rescue-plan.s64")}</strong>
                <p>{t("guides-tank-rescue-plan.s65")}</p>
              </div>
            </div>
            <div className="rsc-esc-step">
              <div className="rsc-esc-badge">C</div>
              <div className="rsc-esc-content">
                <strong>{t("guides-tank-rescue-plan.s66")}</strong>
                <p>{t("guides-tank-rescue-plan.s67")} <a href="/guides/treatment-basics" className="rsc-link">{t("guides-tank-rescue-plan.s68")}</a> {t("guides-tank-rescue-plan.s69")}</p>
              </div>
            </div>
            <div className="rsc-esc-step">
              <div className="rsc-esc-badge">D</div>
              <div className="rsc-esc-content">
                <strong>{t("guides-tank-rescue-plan.s70")}</strong>
                <p>{t("guides-tank-rescue-plan.s71")}</p>
              </div>
            </div>
          </div>
          <div className="rsc-warn-note">
            {t("guides-tank-rescue-plan.s72")}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="rsc-cta-section">
          <div className="rsc-cta-box">
            <h2 className="rsc-cta-title">{t("guides-tank-rescue-plan.s73")}</h2>
            <p className="rsc-cta-body">
              {t("guides-tank-rescue-plan.s74")}
            </p>
            <a
              href="https://www.instagram.com/aquavo_iq/"
              target="_blank"
              rel="noopener noreferrer"
              className="rsc-cta-btn"
            >
              {t("guides-tank-rescue-plan.s75")}
            </a>
          </div>
        </section>

      </main>

      <style>{`
        .rsc-wrap {
          min-height: 100vh;
          background: #0B1E28;
          color: #E2E8F0;
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
          direction: rtl;
        }
        .rsc-bar {
          position: sticky; top: 0; z-index: 50;
          height: 64px;
          background: rgba(1,6,17,0.96);
          backdrop-filter: blur(8px);
          border-bottom: 1px solid rgba(14,165,233,0.2);
          display: flex; align-items: center; padding: 0 1.25rem;
        }
        .rsc-brand {
          color: #0EA5E9; font-weight: 700;
          letter-spacing: 4px; font-size: 1.1rem; text-decoration: none;
        }
        .rsc-main {
          width: 100%; max-width: 720px;
          margin: 0 auto; padding: 2rem 1.25rem 5rem;
          display: flex; flex-direction: column; gap: 3.5rem;
        }

        /* Hero */
        .rsc-hero { text-align: center; padding: 2rem 0; }
        .rsc-badge {
          display: inline-block;
          border: 1px solid rgba(14,165,233,0.35);
          color: #0EA5E9; font-size: 0.7rem; font-weight: 700;
          letter-spacing: 1.5px; padding: 4px 14px; border-radius: 999px;
          margin-bottom: 1.75rem;
        }
        .rsc-hero h1 {
          font-size: clamp(2.2rem, 7vw, 3rem);
          font-weight: 900; color: #F0F6FF;
          margin: 0 0 0.5rem; line-height: 1.1;
        }
        .rsc-sub { font-size: 1.05rem; color: #0EA5E9; margin: 0 0 1rem; }
        .rsc-intro { font-size: 0.95rem; color: #94A3B8; line-height: 1.75; max-width: 560px; margin: 0 auto 1.25rem; }
        .rsc-meta {
          display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;
          font-size: 0.78rem; color: #64748B;
        }

        /* Countdown ring */
        .rsc-ring {
          width: 140px; height: 140px; margin: 0 auto 2rem;
          position: relative; display: flex; align-items: center; justify-content: center;
        }
        .rsc-ring-track {
          position: absolute; inset: 0;
          border-radius: 50%;
          border: 3px solid rgba(14,165,233,0.12);
        }
        .rsc-ring-fill {
          position: absolute; inset: 0;
          border-radius: 50%;
          border: 3px solid transparent;
          border-top-color: #0EA5E9;
          border-right-color: #0EA5E9;
          animation: rsc-spin 3s linear infinite;
        }
        @keyframes rsc-spin { to { transform: rotate(360deg); } }
        .rsc-ring-core {
          display: flex; flex-direction: column; align-items: center;
          z-index: 1;
        }
        .rsc-ring-num {
          font-size: 2.5rem; font-weight: 900; color: #E2E8F0; line-height: 1;
        }
        .rsc-ring-lbl { font-size: 0.75rem; color: #0EA5E9; letter-spacing: 1px; }

        /* Section */
        .rsc-section {}
        .rsc-title {
          font-size: 1.35rem; font-weight: 800; color: #E2E8F0;
          margin: 0 0 0.75rem; border-right: 3px solid #0EA5E9; padding-right: 0.75rem;
        }
        .rsc-body { font-size: 0.92rem; color: #94A3B8; line-height: 1.75; margin: 0 0 1.5rem; }

        /* Prerequisites */
        .rsc-prereq-grid { display: flex; flex-direction: column; gap: 1rem; }
        .rsc-prereq {
          display: flex; gap: 1rem; align-items: flex-start;
          background: rgba(14,165,233,0.04);
          border: 1px solid rgba(14,165,233,0.1);
          border-radius: 10px; padding: 1rem;
        }
        .rsc-prereq-num {
          min-width: 36px; height: 36px;
          background: rgba(14,165,233,0.15);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          color: #0EA5E9; font-weight: 800; font-size: 0.9rem;
        }
        .rsc-prereq strong { display: block; color: #E2E8F0; margin-bottom: 0.25rem; font-size: 0.95rem; }
        .rsc-prereq p { font-size: 0.85rem; color: #64748B; margin: 0; line-height: 1.6; }

        /* Timeline */
        .rsc-timeline { position: relative; padding-right: 28px; }
        .rsc-tline-rail {
          position: absolute; right: 17px; top: 20px; bottom: 20px;
          width: 2px; background: linear-gradient(to bottom, #0EA5E9, rgba(14,165,233,0.1));
        }
        .rsc-station {
          position: relative; display: flex; gap: 1.25rem;
          margin-bottom: 2.25rem; align-items: flex-start;
        }
        .rsc-station:last-child { margin-bottom: 0; }
        .rsc-station-dot {
          min-width: 40px; height: 40px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-weight: 800; font-size: 0.85rem;
          position: relative; z-index: 1; margin-top: 2px;
          flex-shrink: 0;
        }
        .rsc-dot-zero {
          background: rgba(14,165,233,0.2);
          border: 2px solid #0EA5E9; color: #0EA5E9;
        }
        .rsc-dot-week {
          background: rgba(14,165,233,0.08);
          border: 2px solid rgba(14,165,233,0.4); color: #7DD3F4;
        }
        .rsc-dot-final {
          background: rgba(16,185,129,0.15);
          border: 2px solid #10B981; color: #10B981;
        }
        .rsc-station-content { flex: 1; }
        .rsc-station-content h3 {
          font-size: 1rem; font-weight: 700; color: #E2E8F0;
          margin: 0 0 0.5rem;
        }
        .rsc-ul {
          list-style: none; padding: 0; margin: 0;
          display: flex; flex-direction: column; gap: 0.35rem;
        }
        .rsc-ul li {
          font-size: 0.87rem; color: #94A3B8; padding-right: 1rem;
          position: relative; line-height: 1.6;
        }
        .rsc-ul li::before {
          content: '—'; position: absolute; right: 0;
          color: rgba(14,165,233,0.5);
        }

        /* Signs */
        .rsc-signs { display: flex; flex-direction: column; gap: 0.75rem; }
        .rsc-sign {
          display: flex; gap: 0.75rem; align-items: center;
          padding: 0.75rem 1rem; border-radius: 8px;
          font-size: 0.9rem;
        }
        .rsc-sign-good { background: rgba(16,185,129,0.06); border: 1px solid rgba(16,185,129,0.2); color: #A7F3D0; }
        .rsc-sign-warn { background: rgba(245,158,11,0.06); border: 1px solid rgba(245,158,11,0.2); color: #FDE68A; }
        .rsc-sign-icon { font-size: 1rem; flex-shrink: 0; }

        /* CTA */
        .rsc-cta-section {}
        .rsc-cta-box {
          background: rgba(14,165,233,0.06);
          border: 1px solid rgba(14,165,233,0.2);
          border-radius: 14px; padding: 2rem; text-align: center;
        }
        .rsc-cta-title { font-size: 1.2rem; font-weight: 800; color: #E2E8F0; margin: 0 0 0.6rem; }
        .rsc-cta-body { font-size: 0.9rem; color: #94A3B8; line-height: 1.7; margin: 0 0 1.5rem; }
        .rsc-cta-btn {
          display: inline-block; background: #0EA5E9; color: #fff;
          font-weight: 700; font-size: 0.95rem; padding: 0.75rem 2rem;
          border-radius: 8px; text-decoration: none; transition: opacity 0.2s;
        }
        .rsc-cta-btn:hover { opacity: 0.88; }

        /* Escalation section */
        .rsc-escalation { display: flex; flex-direction: column; gap: 0; margin-bottom: 1rem; }
        .rsc-esc-step {
          display: flex; gap: 1rem; align-items: flex-start;
          padding: 1rem 0; border-bottom: 1px solid rgba(14,165,233,0.08);
        }
        .rsc-esc-step:last-child { border-bottom: none; }
        .rsc-esc-badge {
          min-width: 28px; height: 28px; border-radius: 50%;
          background: rgba(14,165,233,0.12); border: 1px solid rgba(14,165,233,0.3);
          display: flex; align-items: center; justify-content: center;
          font-size: 0.75rem; font-weight: 800; color: #0EA5E9; flex-shrink: 0;
        }
        .rsc-esc-content strong { display: block; color: #E2E8F0; font-size: 0.92rem; margin-bottom: 0.25rem; }
        .rsc-esc-content p { font-size: 0.83rem; color: #64748B; margin: 0; line-height: 1.65; }
        .rsc-link { color: #0EA5E9; text-decoration: underline; text-underline-offset: 2px; }
        .rsc-warn-note {
          background: rgba(245,158,11,0.05); border: 1px solid rgba(245,158,11,0.18);
          border-radius: 10px; padding: 0.85rem 1rem;
          font-size: 0.84rem; color: #FDE68A; line-height: 1.6;
        }
      `}</style>

    </div>
  );
}
