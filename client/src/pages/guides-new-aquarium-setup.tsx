import { Link } from "wouter";
import { MetaTags, FAQSchema, BreadcrumbSchema, HowToSchema } from "@/components/seo/meta-tags";
import { useTranslation } from "react-i18next";
import { i18next } from "@/i18n";

const BASE_URL = "https://www.aquavoiq.com";

const FAQ_ITEMS = [
  {
    question: i18next.t("guides:guides-new-aquarium-setup.s1"),
    answer:
      i18next.t("guides:guides-new-aquarium-setup.s2"),
  },
  {
    question: i18next.t("guides:guides-new-aquarium-setup.s3"),
    answer:
      i18next.t("guides:guides-new-aquarium-setup.s4"),
  },
  {
    question: i18next.t("guides:guides-new-aquarium-setup.s5"),
    answer:
      i18next.t("guides:guides-new-aquarium-setup.s6"),
  },
  {
    question: i18next.t("guides:guides-new-aquarium-setup.s7"),
    answer:
      i18next.t("guides:guides-new-aquarium-setup.s8"),
  },
  {
    question: i18next.t("guides:guides-new-aquarium-setup.s9"),
    answer:
      i18next.t("guides:guides-new-aquarium-setup.s10"),
  },
  {
    question: i18next.t("guides:guides-new-aquarium-setup.s11"),
    answer:
      i18next.t("guides:guides-new-aquarium-setup.s12"),
  },
  {
    question: i18next.t("guides:guides-new-aquarium-setup.s13"),
    answer:
      i18next.t("guides:guides-new-aquarium-setup.s14"),
  },
  {
    question: i18next.t("guides:guides-new-aquarium-setup.s15"),
    answer:
      i18next.t("guides:guides-new-aquarium-setup.s16"),
  },
];

const HOW_TO_STEPS = [
  {
    name: i18next.t("guides:guides-new-aquarium-setup.s17"),
    text: i18next.t("guides:guides-new-aquarium-setup.s18"),
    url: `${BASE_URL}/guides/new-aquarium-setup-iraq#step-1`,
  },
  {
    name: i18next.t("guides:guides-new-aquarium-setup.s19"),
    text: i18next.t("guides:guides-new-aquarium-setup.s20"),
    url: `${BASE_URL}/guides/new-aquarium-setup-iraq#step-2`,
  },
  {
    name: i18next.t("guides:guides-new-aquarium-setup.s21"),
    text: i18next.t("guides:guides-new-aquarium-setup.s22"),
    url: `${BASE_URL}/guides/new-aquarium-setup-iraq#step-3`,
  },
  {
    name: i18next.t("guides:guides-new-aquarium-setup.s23"),
    text: i18next.t("guides:guides-new-aquarium-setup.s24"),
    url: `${BASE_URL}/guides/new-aquarium-setup-iraq#step-4`,
  },
  {
    name: i18next.t("guides:guides-new-aquarium-setup.s25"),
    text: i18next.t("guides:guides-new-aquarium-setup.s26"),
    url: `${BASE_URL}/guides/new-aquarium-setup-iraq#step-5`,
  },
  {
    name: i18next.t("guides:guides-new-aquarium-setup.s27"),
    text: i18next.t("guides:guides-new-aquarium-setup.s28"),
    url: `${BASE_URL}/guides/new-aquarium-setup-iraq#step-6`,
  },
];

export default function GuideNewAquariumSetup() {
  const { t } = useTranslation("guides");
  return (
    <>
      <MetaTags
        title={t("guides-new-aquarium-setup.s29")}
        description={t("guides-new-aquarium-setup.s30")}
        keywords={[
          t("guides-new-aquarium-setup.s31"),
          t("guides-new-aquarium-setup.s32"),
          t("guides-new-aquarium-setup.s33"),
          t("guides-new-aquarium-setup.s34"),
          t("guides-new-aquarium-setup.s35"),
          t("guides-new-aquarium-setup.s36"),
        ]}
        url={`${BASE_URL}/guides/new-aquarium-setup-iraq`}
        canonicalUrl={`${BASE_URL}/guides/new-aquarium-setup-iraq`}
        type="article"
      />

      <BreadcrumbSchema
        items={[
          { name: t("guides-new-aquarium-setup.s37"), url: BASE_URL },
          { name: t("guides-new-aquarium-setup.s38"), url: `${BASE_URL}/guides` },
          { name: t("guides-new-aquarium-setup.s31"), url: `${BASE_URL}/guides/new-aquarium-setup-iraq` },
        ]}
      />

      <HowToSchema
        name={t("guides-new-aquarium-setup.howToName")}
        description={t("guides-new-aquarium-setup.s39")}
        totalTime="PT7D"
        supply={[
          t("guides-new-aquarium-setup.s40"),
          t("guides-new-aquarium-setup.s41"),
          t("guides-new-aquarium-setup.s42"),
          t("guides-new-aquarium-setup.s43"),
          t("guides-new-aquarium-setup.s44"),
          t("guides-new-aquarium-setup.s45"),
        ]}
        steps={HOW_TO_STEPS}
      />

      <FAQSchema questions={FAQ_ITEMS} />

      <div className="nas-wrap" dir="rtl">
        {/* Header */}
        <header className="nas-bar">
          <Link href="/" className="nas-brand">AQUAVO</Link>
          <nav className="nas-nav">
            <a href="/guides/aquarium-water-test-guide" className="nas-nav-link">{t("guides-new-aquarium-setup.s46")}</a>
            <Link href="/guides/heater-choice" className="nas-nav-link">{t("guides-new-aquarium-setup.s47")}</Link>
            <a href="/guides/aquarium-decor-stones-guide" className="nas-nav-link">{t("guides-new-aquarium-setup.s48")}</a>
          </nav>
        </header>

        <main className="nas-main" id="main-content">

          {/* Breadcrumb */}
          <nav className="nas-breadcrumb" aria-label={t("guides-new-aquarium-setup.s49")}>
            <Link href="/">{t("guides-new-aquarium-setup.s37")}</Link>
            <span> / </span>
            <a href="/guides">{t("guides-new-aquarium-setup.s38")}</a>
            <span> / </span>
            <span>{t("guides-new-aquarium-setup.s31")}</span>
          </nav>

          {/* Hero */}
          <section className="nas-hero" id="hero-headline">
            <span className="nas-badge">{t("guides-new-aquarium-setup.s50")}</span>
            <h1 className="nas-h1">{t("guides-new-aquarium-setup.s51")}</h1>

            {/* Answer Block — AEO snippet target */}
            <div className="nas-answer-block" id="quick-answer">
              <p className="nas-answer-text">
                {t("guides-new-aquarium-setup.s52")}
              </p>
            </div>

            <div className="nas-meta">
              <span>{t("guides-new-aquarium-setup.s53")}</span>
              <span>•</span>
              <span>{t("guides-new-aquarium-setup.s54")}</span>
            </div>
          </section>

          {/* AQUAVO Identity */}
          <div className="nas-store-note">
            <strong>{t("guides-new-aquarium-setup.s55")}</strong> {t("guides-new-aquarium-setup.s56")}
            <Link href="/products" className="nas-store-link"> {t("guides-new-aquarium-setup.s57")}</Link>
          </div>

          {/* Step by Step */}
          <section className="nas-section" id="step-1">
            <h2 className="nas-title">{t("guides-new-aquarium-setup.s58")}</h2>
            <p className="nas-body">
              {t("guides-new-aquarium-setup.s59")} <strong>{t("guides-new-aquarium-setup.s60")}</strong> {t("guides-new-aquarium-setup.s61")}
            </p>
            <div className="nas-tip">
              {t("guides-new-aquarium-setup.s62")}
            </div>
          </section>

          <section className="nas-section" id="step-2">
            <h2 className="nas-title">{t("guides-new-aquarium-setup.s63")}</h2>
            <p className="nas-body">
              {t("guides-new-aquarium-setup.s64")}
            </p>
            <div className="nas-related-links">
              <Link href="/guides/filter-choice" className="nas-related-link">{t("guides-new-aquarium-setup.s65")}</Link>
              <Link href="/guides/heater-choice" className="nas-related-link">{t("guides-new-aquarium-setup.s66")}</Link>
            </div>
          </section>

          <section className="nas-section" id="step-3">
            <h2 className="nas-title">{t("guides-new-aquarium-setup.s67")}</h2>
            <p className="nas-body">
              {t("guides-new-aquarium-setup.s68")} <strong>{t("guides-new-aquarium-setup.s69")}</strong>{t("guides-new-aquarium-setup.s70")}
            </p>
            <div className="nas-warn-box">
              {t("guides-new-aquarium-setup.s71")}
            </div>
          </section>

          <section className="nas-section" id="step-4">
            <h2 className="nas-title">{t("guides-new-aquarium-setup.s72")}</h2>
            <p className="nas-body">
              {t("guides-new-aquarium-setup.s73")}
            </p>
            <ul className="nas-list">
              <li>{t("guides-new-aquarium-setup.s74")}</li>
              <li>{t("guides-new-aquarium-setup.s75")}</li>
              <li>{t("guides-new-aquarium-setup.s76")}</li>
            </ul>
          </section>

          <section className="nas-section" id="step-5">
            <h2 className="nas-title">{t("guides-new-aquarium-setup.s77")}</h2>
            <p className="nas-body">
              {t("guides-new-aquarium-setup.s78")}
            </p>
            <div className="nas-table-wrap">
              <table className="nas-table">
                <thead>
                  <tr>
                    <th>{t("guides-new-aquarium-setup.s79")}</th>
                    <th>{t("guides-new-aquarium-setup.s80")}</th>
                    <th>{t("guides-new-aquarium-setup.s81")}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{t("guides-new-aquarium-setup.s82")}</td>
                    <td>0 ppm</td>
                    <td>{t("guides-new-aquarium-setup.s83")}</td>
                  </tr>
                  <tr>
                    <td>{t("guides-new-aquarium-setup.s84")}</td>
                    <td>0 ppm</td>
                    <td>{t("guides-new-aquarium-setup.s85")}</td>
                  </tr>
                  <tr>
                    <td>pH</td>
                    <td>6.8 – 7.5</td>
                    <td>{t("guides-new-aquarium-setup.s86")}</td>
                  </tr>
                  <tr>
                    <td>{t("guides-new-aquarium-setup.s87")}</td>
                    <td>{t("guides-new-aquarium-setup.s88")}</td>
                    <td>{t("guides-new-aquarium-setup.s89")}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="nas-related-links">
              <a href="/guides/aquarium-water-test-guide" className="nas-related-link">{t("guides-new-aquarium-setup.s90")}</a>
            </div>
          </section>

          <section className="nas-section" id="step-6">
            <h2 className="nas-title">{t("guides-new-aquarium-setup.s91")}</h2>
            <p className="nas-body">
              {t("guides-new-aquarium-setup.s92")}
            </p>
          </section>

          {/* Common Mistakes */}
          <section className="nas-section">
            <h2 className="nas-title">{t("guides-new-aquarium-setup.s93")}</h2>
            <div className="nas-mistakes-grid">
              {[
                { x: t("guides-new-aquarium-setup.s94"), fix: t("guides-new-aquarium-setup.s95") },
                { x: t("guides-new-aquarium-setup.s96"), fix: t("guides-new-aquarium-setup.s97") },
                { x: t("guides-new-aquarium-setup.s98"), fix: t("guides-new-aquarium-setup.s99") },
                { x: t("guides-new-aquarium-setup.s100"), fix: t("guides-new-aquarium-setup.s101") },
                { x: t("guides-new-aquarium-setup.s102"), fix: t("guides-new-aquarium-setup.s103") },
                { x: t("guides-new-aquarium-setup.s104"), fix: t("guides-new-aquarium-setup.s105") },
              ].map((m, i) => (
                <div key={i} className="nas-mistake-card">
                  <div className="nas-mistake-x">✗ {m.x}</div>
                  <div className="nas-mistake-fix">✓ {m.fix}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Starter Pack */}
          <section className="nas-section nas-starter">
            <h2 className="nas-title">{t("guides-new-aquarium-setup.s106")}</h2>
            <p className="nas-body">
              {t("guides-new-aquarium-setup.s107")}
            </p>
            <ul className="nas-pack-list">
              <li><span className="nas-pack-icon">🔵</span> <strong>{t("guides-new-aquarium-setup.s108")}</strong> {t("guides-new-aquarium-setup.s109")}</li>
              <li><span className="nas-pack-icon">🔴</span> <strong>{t("guides-new-aquarium-setup.s41")}</strong> {t("guides-new-aquarium-setup.s110")}</li>
              <li><span className="nas-pack-icon">🟢</span> <strong>{t("guides-new-aquarium-setup.s42")}</strong> {t("guides-new-aquarium-setup.s111")}</li>
              <li><span className="nas-pack-icon">🟡</span> <strong>{t("guides-new-aquarium-setup.s112")}</strong> {t("guides-new-aquarium-setup.s113")}</li>
              <li><span className="nas-pack-icon">⚪</span> <strong>{t("guides-new-aquarium-setup.s114")}</strong> {t("guides-new-aquarium-setup.s115")}</li>
            </ul>
            <Link href="/products" className="nas-cta-btn" id="starter-pack-cta">
              {t("guides-new-aquarium-setup.s116")}
            </Link>
            <p className="nas-cta-note">{t("guides-new-aquarium-setup.s117")}</p>
          </section>

          {/* FAQ */}
          <section className="nas-section" id="faq">
            <h2 className="nas-title">{t("guides-new-aquarium-setup.s118")}</h2>
            <div className="nas-faq-list">
              {FAQ_ITEMS.map((item, i) => (
                <details key={i} className="nas-faq-item">
                  <summary className="nas-faq-q">{item.question}</summary>
                  <p className="nas-faq-a">{item.answer}</p>
                </details>
              ))}
            </div>
          </section>

          {/* Related Guides */}
          <section className="nas-section">
            <h2 className="nas-title">{t("guides-new-aquarium-setup.s119")}</h2>
            <div className="nas-related-grid">
              <a href="/guides/aquarium-water-test-guide" className="nas-related-card">
                <span className="nas-related-icon">🧪</span>
                <div>
                  <div className="nas-related-title">{t("guides-new-aquarium-setup.s120")}</div>
                  <div className="nas-related-desc">{t("guides-new-aquarium-setup.s121")}</div>
                </div>
              </a>
              <Link href="/guides/heater-choice" className="nas-related-card">
                <span className="nas-related-icon">🌡️</span>
                <div>
                  <div className="nas-related-title">{t("guides-new-aquarium-setup.s122")}</div>
                  <div className="nas-related-desc">{t("guides-new-aquarium-setup.s123")}</div>
                </div>
              </Link>
              <Link href="/guides/filter-choice" className="nas-related-card">
                <span className="nas-related-icon">💧</span>
                <div>
                  <div className="nas-related-title">{t("guides-new-aquarium-setup.s124")}</div>
                  <div className="nas-related-desc">{t("guides-new-aquarium-setup.s125")}</div>
                </div>
              </Link>
              <a href="/guides/aquarium-decor-stones-guide" className="nas-related-card">
                <span className="nas-related-icon">🪨</span>
                <div>
                  <div className="nas-related-title">{t("guides-new-aquarium-setup.s126")}</div>
                  <div className="nas-related-desc">{t("guides-new-aquarium-setup.s127")}</div>
                </div>
              </a>
            </div>
          </section>

        </main>

        <style>{`
          .nas-wrap {
            min-height: 100vh;
            background: #0B1E28;
            color: #e2e8f0;
            font-family: 'Cairo', 'Segoe UI', system-ui, sans-serif;
            direction: rtl;
          }
          .nas-bar {
            position: sticky; top: 0; z-index: 50;
            height: 64px;
            background: rgba(10,22,40,0.96);
            backdrop-filter: blur(10px);
            border-bottom: 1px solid rgba(11,147,166,0.2);
            display: flex; align-items: center;
            justify-content: space-between;
            padding: 0 1.5rem;
          }
          .nas-brand { color: #0B93A6; font-weight: 800; letter-spacing: 3px; font-size: 1.1rem; text-decoration: none; }
          .nas-nav { display: flex; gap: 1rem; }
          .nas-nav-link { color: #94a3b8; font-size: 0.82rem; text-decoration: none; transition: color 0.2s; }
          .nas-nav-link:hover { color: #0B93A6; }
          .nas-main { width: 100%; max-width: 760px; margin: 0 auto; padding: 2rem 1.25rem 6rem; display: flex; flex-direction: column; gap: 3rem; }
          .nas-breadcrumb { font-size: 0.78rem; color: #64748b; display: flex; gap: 0.4rem; flex-wrap: wrap; }
          .nas-breadcrumb a { color: #94a3b8; text-decoration: none; }
          .nas-breadcrumb a:hover { color: #0B93A6; }
          .nas-hero { text-align: center; }
          .nas-badge { display: inline-block; border: 1px solid rgba(11,147,166,0.35); color: #0B93A6; font-size: 0.7rem; font-weight: 700; letter-spacing: 1.5px; padding: 4px 14px; border-radius: 999px; margin-bottom: 1.25rem; }
          .nas-h1 { font-size: clamp(1.6rem, 5vw, 2.5rem); font-weight: 900; color: #f0f9ff; margin: 0 0 1.25rem; line-height: 1.2; }
          .nas-answer-block { background: rgba(11,147,166,0.07); border: 1px solid rgba(11,147,166,0.2); border-radius: 12px; padding: 1.25rem 1.5rem; text-align: right; margin-bottom: 1rem; }
          .nas-answer-text { font-size: 0.97rem; color: #cbd5e1; line-height: 1.8; margin: 0; }
          .nas-meta { font-size: 0.78rem; color: #475569; display: flex; gap: 0.75rem; justify-content: center; }
          .nas-store-note { background: rgba(201,122,46,0.05); border: 1px solid rgba(201,122,46,0.15); border-radius: 10px; padding: 1rem 1.25rem; font-size: 0.88rem; color: #94a3b8; line-height: 1.7; }
          .nas-store-note strong { color: var(--aqv-warning); }
          .nas-store-link { color: #0B93A6; text-decoration: none; font-weight: 600; }
          .nas-section { display: flex; flex-direction: column; gap: 1rem; }
          .nas-title { font-size: 1.2rem; font-weight: 800; color: #e2e8f0; margin: 0 0 0.5rem; border-right: 3px solid #0B93A6; padding-right: 0.75rem; }
          .nas-body { font-size: 0.92rem; color: #94a3b8; line-height: 1.8; margin: 0; }
          .nas-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.5rem; }
          .nas-list li { font-size: 0.9rem; color: #94a3b8; padding-right: 1.25rem; position: relative; }
          .nas-list li::before { content: '→'; position: absolute; right: 0; color: #0B93A6; }
          .nas-tip { background: rgba(11,147,166,0.07); border: 1px solid rgba(11,147,166,0.2); border-radius: 8px; padding: 0.85rem 1rem; font-size: 0.85rem; color: #7dd3fc; }
          .nas-warn-box { background: rgba(239,68,68,0.06); border: 1px solid rgba(239,68,68,0.2); border-radius: 8px; padding: 0.85rem 1rem; font-size: 0.88rem; color: #fca5a5; }
          .nas-related-links { display: flex; flex-direction: column; gap: 0.5rem; }
          .nas-related-link { color: #0B93A6; font-size: 0.88rem; text-decoration: none; }
          .nas-related-link:hover { text-decoration: underline; }
          .nas-table-wrap { overflow-x: auto; }
          .nas-table { width: 100%; border-collapse: collapse; font-size: 0.86rem; }
          .nas-table th { background: rgba(11,147,166,0.12); color: #cbd5e1; padding: 0.7rem 1rem; text-align: right; font-weight: 700; border-bottom: 1px solid rgba(11,147,166,0.2); }
          .nas-table td { color: #94a3b8; padding: 0.65rem 1rem; border-bottom: 1px solid rgba(255,255,255,0.04); }
          .nas-table tr:last-child td { border-bottom: none; }
          .nas-mistakes-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem; }
          @media (max-width: 560px) { .nas-mistakes-grid { grid-template-columns: 1fr; } }
          .nas-mistake-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 0.85rem 1rem; display: flex; flex-direction: column; gap: 0.4rem; }
          .nas-mistake-x { font-size: 0.83rem; color: #f87171; }
          .nas-mistake-fix { font-size: 0.83rem; color: #86efac; }
          .nas-starter { background: rgba(11,147,166,0.04); border: 1px solid rgba(11,147,166,0.15); border-radius: 14px; padding: 1.5rem; }
          .nas-pack-list { list-style: none; padding: 0; margin: 0 0 1.5rem; display: flex; flex-direction: column; gap: 0.7rem; }
          .nas-pack-list li { font-size: 0.9rem; color: #cbd5e1; display: flex; gap: 0.75rem; align-items: flex-start; }
          .nas-pack-icon { font-size: 1.1rem; flex-shrink: 0; }
          .nas-cta-btn { display: inline-block; background: linear-gradient(135deg, #0B93A6, #0e7490); color: #fff; font-weight: 700; font-size: 0.95rem; padding: 0.85rem 2rem; border-radius: 10px; text-decoration: none; transition: opacity 0.2s; }
          .nas-cta-btn:hover { opacity: 0.88; }
          .nas-cta-note { font-size: 0.8rem; color: #64748b; margin-top: 0.5rem; }
          .nas-faq-list { display: flex; flex-direction: column; gap: 0.75rem; }
          .nas-faq-item { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07); border-radius: 10px; overflow: hidden; }
          .nas-faq-q { padding: 1rem 1.1rem; font-size: 0.92rem; font-weight: 700; color: #e2e8f0; cursor: pointer; list-style: none; }
          .nas-faq-q::-webkit-details-marker { display: none; }
          .nas-faq-a { padding: 0 1.1rem 1rem; font-size: 0.87rem; color: #94a3b8; line-height: 1.75; margin: 0; }
          .nas-related-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem; }
          @media (max-width: 560px) { .nas-related-grid { grid-template-columns: 1fr; } }
          .nas-related-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 1rem; text-decoration: none; display: flex; gap: 0.85rem; align-items: flex-start; transition: border-color 0.2s; }
          .nas-related-card:hover { border-color: rgba(11,147,166,0.4); }
          .nas-related-icon { font-size: 1.5rem; flex-shrink: 0; }
          .nas-related-title { font-size: 0.9rem; font-weight: 700; color: #e2e8f0; margin-bottom: 0.2rem; }
          .nas-related-desc { font-size: 0.8rem; color: #64748b; }
        `}</style>
      </div>
    </>
  );
}
