import { Link } from "wouter";
import { MetaTags, FAQSchema, BreadcrumbSchema } from "@/components/seo/meta-tags";
import { useTranslation } from "react-i18next";
import { i18next } from "@/i18n";

const BASE_URL = "https://www.aquavoiq.com";

const FAQ_ITEMS = [
  {
    question: i18next.t("guides:guides-water-test-guide.s1"),
    answer:
      i18next.t("guides:guides-water-test-guide.s2"),
  },
  {
    question: i18next.t("guides:guides-water-test-guide.s3"),
    answer:
      i18next.t("guides:guides-water-test-guide.s4"),
  },
  {
    question: i18next.t("guides:guides-water-test-guide.s5"),
    answer:
      i18next.t("guides:guides-water-test-guide.s6"),
  },
  {
    question: i18next.t("guides:guides-water-test-guide.s7"),
    answer:
      i18next.t("guides:guides-water-test-guide.s8"),
  },
  {
    question: i18next.t("guides:guides-water-test-guide.s9"),
    answer:
      i18next.t("guides:guides-water-test-guide.s10"),
  },
  {
    question: i18next.t("guides:guides-water-test-guide.s11"),
    answer:
      i18next.t("guides:guides-water-test-guide.s12"),
  },
  {
    question: i18next.t("guides:guides-water-test-guide.s13"),
    answer:
      i18next.t("guides:guides-water-test-guide.s14"),
  },
  {
    question: i18next.t("guides:guides-water-test-guide.s15"),
    answer:
      i18next.t("guides:guides-water-test-guide.s16"),
  },
];

const WATER_PARAMS = [
  {
    name: i18next.t("guides:guides-water-test-guide.s17"),
    meaning: i18next.t("guides:guides-water-test-guide.s18"),
    danger: i18next.t("guides:guides-water-test-guide.s19"),
    action: i18next.t("guides:guides-water-test-guide.s20"),
    safe: "0 ppm",
  },
  {
    name: i18next.t("guides:guides-water-test-guide.s21"),
    meaning: i18next.t("guides:guides-water-test-guide.s22"),
    danger: i18next.t("guides:guides-water-test-guide.s23"),
    action: i18next.t("guides:guides-water-test-guide.s24"),
    safe: "0 ppm",
  },
  {
    name: i18next.t("guides:guides-water-test-guide.s25"),
    meaning: i18next.t("guides:guides-water-test-guide.s26"),
    danger: i18next.t("guides:guides-water-test-guide.s27"),
    action: i18next.t("guides:guides-water-test-guide.s28"),
    safe: i18next.t("guides:guides-water-test-guide.s29"),
  },
  {
    name: i18next.t("guides:guides-water-test-guide.s30"),
    meaning: i18next.t("guides:guides-water-test-guide.s31"),
    danger: i18next.t("guides:guides-water-test-guide.s32"),
    action: i18next.t("guides:guides-water-test-guide.s33"),
    safe: "6.8 – 7.5",
  },
  {
    name: i18next.t("guides:guides-water-test-guide.s34"),
    meaning: i18next.t("guides:guides-water-test-guide.s35"),
    danger: i18next.t("guides:guides-water-test-guide.s36"),
    action: i18next.t("guides:guides-water-test-guide.s37"),
    safe: "0 ppm",
  },
];

export default function GuideWaterTestGuide() {
  const { t } = useTranslation("guides");
  return (
    <>
      <MetaTags
        title={t("guides-water-test-guide.s38")}
        description={t("guides-water-test-guide.s39")}
        keywords={[
          t("guides-water-test-guide.s40"),
          t("guides-water-test-guide.s41"),
          t("guides-water-test-guide.s42"),
          t("guides-water-test-guide.s43"),
          t("guides-water-test-guide.s44"),
          t("guides-water-test-guide.s45"),
        ]}
        url={`${BASE_URL}/guides/aquarium-water-test-guide`}
        canonicalUrl={`${BASE_URL}/guides/aquarium-water-test-guide`}
        type="article"
      />

      <BreadcrumbSchema
        items={[
          { name: t("guides-water-test-guide.s46"), url: BASE_URL },
          { name: t("guides-water-test-guide.s47"), url: `${BASE_URL}/guides` },
          { name: t("guides-water-test-guide.s48"), url: `${BASE_URL}/guides/aquarium-water-test-guide` },
        ]}
      />

      <FAQSchema questions={FAQ_ITEMS} />

      <div className="wt-wrap" dir="rtl">
        <header className="wt-bar">
          <Link href="/" className="wt-brand">AQUAVO</Link>
          <nav className="wt-nav">
            <a href="/guides/new-aquarium-setup-iraq" className="wt-nav-link">{t("guides-water-test-guide.s49")}</a>
            <Link href="/guides/heater-choice" className="wt-nav-link">{t("guides-water-test-guide.s50")}</Link>
            <a href="/guides/aquarium-decor-stones-guide" className="wt-nav-link">{t("guides-water-test-guide.s51")}</a>
          </nav>
        </header>

        <main className="wt-main" id="main-content">

          <nav className="wt-breadcrumb" aria-label={t("guides-water-test-guide.s52")}>
            <Link href="/">{t("guides-water-test-guide.s46")}</Link>
            <span> / </span>
            <a href="/guides">{t("guides-water-test-guide.s47")}</a>
            <span> / </span>
            <span>{t("guides-water-test-guide.s53")}</span>
          </nav>

          {/* Hero */}
          <section className="wt-hero" id="hero-headline">
            <span className="wt-badge">{t("guides-water-test-guide.s54")}</span>
            <h1 className="wt-h1">{t("guides-water-test-guide.s55")}</h1>

            {/* AEO Answer Block */}
            <div className="wt-answer-block" id="quick-answer">
              <p className="wt-answer-text">
                {t("guides-water-test-guide.s56")}
              </p>
            </div>

            <div className="wt-meta">
              <span>{t("guides-water-test-guide.s57")}</span>
              <span>•</span>
              <span>{t("guides-water-test-guide.s58")}</span>
            </div>
          </section>

          {/* AQUAVO Identity */}
          <div className="wt-store-note">
            <strong>AQUAVO</strong> {t("guides-water-test-guide.s59")}
            <Link href="/products" className="wt-store-link"> {t("guides-water-test-guide.s60")}</Link>
          </div>

          {/* Why Test */}
          <section className="wt-section">
            <h2 className="wt-title">{t("guides-water-test-guide.s61")}</h2>
            <p className="wt-body">
              {t("guides-water-test-guide.s62")}
            </p>
            <ul className="wt-list">
              <li>{t("guides-water-test-guide.s63")}</li>
              <li>{t("guides-water-test-guide.s64")}</li>
              <li>{t("guides-water-test-guide.s65")}</li>
              <li>{t("guides-water-test-guide.s66")}</li>
            </ul>
          </section>

          {/* Main Table */}
          <section className="wt-section" id="water-params-table">
            <h2 className="wt-title">{t("guides-water-test-guide.s67")}</h2>
            <div className="wt-table-wrap">
              <table className="wt-table">
                <thead>
                  <tr>
                    <th>{t("guides-water-test-guide.s68")}</th>
                    <th>{t("guides-water-test-guide.s69")}</th>
                    <th>{t("guides-water-test-guide.s70")}</th>
                    <th>{t("guides-water-test-guide.s71")}</th>
                    <th>{t("guides-water-test-guide.s72")}</th>
                  </tr>
                </thead>
                <tbody>
                  {WATER_PARAMS.map((p, i) => (
                    <tr key={i}>
                      <td><strong>{p.name}</strong></td>
                      <td>{p.meaning}</td>
                      <td className="wt-safe">{p.safe}</td>
                      <td className="wt-danger">{p.danger}</td>
                      <td>{p.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Ammonia Deep Dive */}
          <section className="wt-section">
            <h2 className="wt-title">{t("guides-water-test-guide.s73")}</h2>
            <p className="wt-body">
              {t("guides-water-test-guide.s74")}
            </p>
            <div className="wt-scale">
              {[
                { range: "0 ppm", label: t("guides-water-test-guide.s75"), cls: "wt-scale-safe" },
                { range: "0.25 ppm", label: t("guides-water-test-guide.s76"), cls: "wt-scale-warn" },
                { range: "0.5 ppm", label: t("guides-water-test-guide.s77"), cls: "wt-scale-danger" },
                { range: "1+ ppm", label: t("guides-water-test-guide.s78"), cls: "wt-scale-critical" },
              ].map((s, i) => (
                <div key={i} className={`wt-scale-row ${s.cls}`}>
                  <span className="wt-scale-range">{s.range}</span>
                  <span className="wt-scale-label">{s.label}</span>
                </div>
              ))}
            </div>
          </section>

          {/* How to Use Strips */}
          <section className="wt-section">
            <h2 className="wt-title">{t("guides-water-test-guide.s79")}</h2>
            <ol className="wt-steps">
              <li>{t("guides-water-test-guide.s80")}</li>
              <li>{t("guides-water-test-guide.s81")}</li>
              <li>{t("guides-water-test-guide.s82")}</li>
              <li>{t("guides-water-test-guide.s83")}</li>
              <li>{t("guides-water-test-guide.s84")}</li>
            </ol>
            <div className="wt-tip">
              {t("guides-water-test-guide.s85")}
            </div>
          </section>

          {/* When To Test */}
          <section className="wt-section">
            <h2 className="wt-title">{t("guides-water-test-guide.s86")}</h2>
            <div className="wt-when-grid">
              {[
                { time: t("guides-water-test-guide.s87"), reason: t("guides-water-test-guide.s88") },
                { time: t("guides-water-test-guide.s89"), reason: t("guides-water-test-guide.s90") },
                { time: t("guides-water-test-guide.s91"), reason: t("guides-water-test-guide.s92") },
                { time: t("guides-water-test-guide.s93"), reason: t("guides-water-test-guide.s94") },
                { time: t("guides-water-test-guide.s95"), reason: t("guides-water-test-guide.s96") },
                { time: t("guides-water-test-guide.s97"), reason: t("guides-water-test-guide.s98") },
              ].map((w, i) => (
                <div key={i} className="wt-when-card">
                  <div className="wt-when-time">{w.time}</div>
                  <div className="wt-when-reason">{w.reason}</div>
                </div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="wt-cta-section">
            <div className="wt-cta-box">
              <h2 className="wt-cta-title">{t("guides-water-test-guide.s99")}</h2>
              <p className="wt-cta-body">{t("guides-water-test-guide.s100")}</p>
              <Link href="/products" className="wt-cta-btn" id="water-test-cta">{t("guides-water-test-guide.s101")}</Link>
            </div>
          </section>

          {/* FAQ */}
          <section className="wt-section" id="faq">
            <h2 className="wt-title">{t("guides-water-test-guide.s102")}</h2>
            <div className="wt-faq-list">
              {FAQ_ITEMS.map((item, i) => (
                <details key={i} className="wt-faq-item">
                  <summary className="wt-faq-q">{item.question}</summary>
                  <p className="wt-faq-a">{item.answer}</p>
                </details>
              ))}
            </div>
          </section>

          {/* Related Guides */}
          <section className="wt-section">
            <h2 className="wt-title">{t("guides-water-test-guide.s103")}</h2>
            <div className="wt-related-grid">
              <a href="/guides/new-aquarium-setup-iraq" className="wt-related-card">
                <span className="wt-related-icon">🐠</span>
                <div>
                  <div className="wt-related-title">{t("guides-water-test-guide.s104")}</div>
                  <div className="wt-related-desc">{t("guides-water-test-guide.s105")}</div>
                </div>
              </a>
              <Link href="/guides/water-change-schedule" className="wt-related-card">
                <span className="wt-related-icon">💧</span>
                <div>
                  <div className="wt-related-title">{t("guides-water-test-guide.s106")}</div>
                  <div className="wt-related-desc">{t("guides-water-test-guide.s107")}</div>
                </div>
              </Link>
              <Link href="/guides/algae-control" className="wt-related-card">
                <span className="wt-related-icon">🌿</span>
                <div>
                  <div className="wt-related-title">{t("guides-water-test-guide.s108")}</div>
                  <div className="wt-related-desc">{t("guides-water-test-guide.s109")}</div>
                </div>
              </Link>
              <Link href="/guides/filter-choice" className="wt-related-card">
                <span className="wt-related-icon">⚙️</span>
                <div>
                  <div className="wt-related-title">{t("guides-water-test-guide.s110")}</div>
                  <div className="wt-related-desc">{t("guides-water-test-guide.s111")}</div>
                </div>
              </Link>
            </div>
          </section>

        </main>

        <style>{`
          .wt-wrap { min-height: 100vh; background: #0B1E28; color: #e2e8f0; font-family: 'Cairo','Segoe UI',system-ui,sans-serif; direction: rtl; }
          .wt-bar { position: sticky; top:0; z-index:50; height:64px; background:rgba(10,22,40,0.96); backdrop-filter:blur(10px); border-bottom:1px solid rgba(11,147,166,0.2); display:flex; align-items:center; justify-content:space-between; padding:0 1.5rem; }
          .wt-brand { color:#0B93A6; font-weight:800; letter-spacing:3px; font-size:1.1rem; text-decoration:none; }
          .wt-nav { display:flex; gap:1rem; }
          .wt-nav-link { color:#94a3b8; font-size:0.82rem; text-decoration:none; transition:color 0.2s; }
          .wt-nav-link:hover { color:#0B93A6; }
          .wt-main { width:100%; max-width:780px; margin:0 auto; padding:2rem 1.25rem 6rem; display:flex; flex-direction:column; gap:3rem; }
          .wt-breadcrumb { font-size:0.78rem; color:#64748b; display:flex; gap:0.4rem; flex-wrap:wrap; }
          .wt-breadcrumb a { color:#94a3b8; text-decoration:none; }
          .wt-breadcrumb a:hover { color:#0B93A6; }
          .wt-hero { text-align:center; }
          .wt-badge { display:inline-block; border:1px solid rgba(11,147,166,0.35); color:#0B93A6; font-size:0.7rem; font-weight:700; letter-spacing:1.5px; padding:4px 14px; border-radius:999px; margin-bottom:1.25rem; }
          .wt-h1 { font-size:clamp(1.5rem,5vw,2.4rem); font-weight:900; color:#f0f9ff; margin:0 0 1.25rem; line-height:1.2; }
          .wt-answer-block { background:rgba(11,147,166,0.07); border:1px solid rgba(11,147,166,0.2); border-radius:12px; padding:1.25rem 1.5rem; text-align:right; margin-bottom:1rem; }
          .wt-answer-text { font-size:0.97rem; color:#cbd5e1; line-height:1.8; margin:0; }
          .wt-meta { font-size:0.78rem; color:#475569; display:flex; gap:0.75rem; justify-content:center; }
          .wt-store-note { background:rgba(201,122,46,0.05); border:1px solid rgba(201,122,46,0.15); border-radius:10px; padding:1rem 1.25rem; font-size:0.88rem; color:#94a3b8; line-height:1.7; }
          .wt-store-note strong { color:var(--aqv-warning); }
          .wt-store-link { color:#0B93A6; text-decoration:none; font-weight:600; }
          .wt-section { display:flex; flex-direction:column; gap:1rem; }
          .wt-title { font-size:1.2rem; font-weight:800; color:#e2e8f0; margin:0 0 0.5rem; border-right:3px solid #0B93A6; padding-right:0.75rem; }
          .wt-body { font-size:0.92rem; color:#94a3b8; line-height:1.8; margin:0; }
          .wt-list { list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:0.5rem; }
          .wt-list li { font-size:0.9rem; color:#94a3b8; padding-right:1.25rem; position:relative; }
          .wt-list li::before { content:'→'; position:absolute; right:0; color:#0B93A6; }
          .wt-table-wrap { overflow-x:auto; }
          .wt-table { width:100%; border-collapse:collapse; font-size:0.84rem; min-width:600px; }
          .wt-table th { background:rgba(11,147,166,0.12); color:#cbd5e1; padding:0.75rem 0.9rem; text-align:right; font-weight:700; border-bottom:1px solid rgba(11,147,166,0.2); white-space:nowrap; }
          .wt-table td { color:#94a3b8; padding:0.65rem 0.9rem; border-bottom:1px solid rgba(255,255,255,0.04); vertical-align:top; }
          .wt-table tr:last-child td { border-bottom:none; }
          .wt-table tr:hover td { background:rgba(255,255,255,0.02); }
          .wt-safe { color:#86efac; font-weight:700; }
          .wt-danger { color:#fca5a5; }
          .wt-scale { display:flex; flex-direction:column; gap:0.5rem; }
          .wt-scale-row { display:flex; align-items:center; gap:1rem; padding:0.7rem 1rem; border-radius:8px; }
          .wt-scale-safe { background:rgba(34,197,94,0.06); border:1px solid rgba(34,197,94,0.2); }
          .wt-scale-warn { background:rgba(234,179,8,0.06); border:1px solid rgba(234,179,8,0.2); }
          .wt-scale-danger { background:rgba(249,115,22,0.06); border:1px solid rgba(249,115,22,0.2); }
          .wt-scale-critical { background:rgba(239,68,68,0.07); border:1px solid rgba(239,68,68,0.25); }
          .wt-scale-range { font-size:0.82rem; font-weight:700; color:#e2e8f0; min-width:70px; }
          .wt-scale-label { font-size:0.85rem; color:#94a3b8; }
          .wt-steps { padding: 0 0 0 1rem; margin:0; display:flex; flex-direction:column; gap:0.6rem; counter-reset:steps; list-style:none; }
          .wt-steps li { font-size:0.9rem; color:#94a3b8; padding-right:2rem; position:relative; counter-increment:steps; }
          .wt-steps li::before { content:counter(steps); position:absolute; right:0; width:22px; height:22px; background:rgba(11,147,166,0.15); color:#0B93A6; border-radius:50%; font-size:0.75rem; font-weight:700; display:flex; align-items:center; justify-content:center; }
          .wt-tip { background:rgba(11,147,166,0.07); border:1px solid rgba(11,147,166,0.2); border-radius:8px; padding:0.85rem 1rem; font-size:0.85rem; color:#7dd3fc; }
          .wt-when-grid { display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; }
          @media(max-width:560px){.wt-when-grid{grid-template-columns:1fr;}}
          .wt-when-card { background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:0.9rem 1rem; }
          .wt-when-time { font-size:0.88rem; font-weight:700; color:#e2e8f0; margin-bottom:0.25rem; }
          .wt-when-reason { font-size:0.82rem; color:#64748b; }
          .wt-cta-section {}
          .wt-cta-box { background:rgba(11,147,166,0.05); border:1px solid rgba(11,147,166,0.18); border-radius:14px; padding:2rem; text-align:center; }
          .wt-cta-title { font-size:1.2rem; font-weight:800; color:#e2e8f0; margin:0 0 0.6rem; }
          .wt-cta-body { font-size:0.9rem; color:#94a3b8; line-height:1.7; margin:0 0 1.5rem; }
          .wt-cta-btn { display:inline-block; background:linear-gradient(135deg,#0B93A6,#0e7490); color:#fff; font-weight:700; font-size:0.95rem; padding:0.85rem 2rem; border-radius:10px; text-decoration:none; transition:opacity 0.2s; }
          .wt-cta-btn:hover{opacity:0.88;}
          .wt-faq-list { display:flex; flex-direction:column; gap:0.75rem; }
          .wt-faq-item { background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.07); border-radius:10px; overflow:hidden; }
          .wt-faq-q { padding:1rem 1.1rem; font-size:0.92rem; font-weight:700; color:#e2e8f0; cursor:pointer; list-style:none; }
          .wt-faq-q::-webkit-details-marker{display:none;}
          .wt-faq-a { padding:0 1.1rem 1rem; font-size:0.87rem; color:#94a3b8; line-height:1.75; margin:0; }
          .wt-related-grid { display:grid; grid-template-columns:1fr 1fr; gap:0.85rem; }
          @media(max-width:560px){.wt-related-grid{grid-template-columns:1fr;}}
          .wt-related-card { background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.07); border-radius:12px; padding:1rem; text-decoration:none; display:flex; gap:0.85rem; align-items:flex-start; transition:border-color 0.2s; }
          .wt-related-card:hover{border-color:rgba(11,147,166,0.4);}
          .wt-related-icon { font-size:1.5rem; flex-shrink:0; }
          .wt-related-title { font-size:0.9rem; font-weight:700; color:#e2e8f0; margin-bottom:0.2rem; }
          .wt-related-desc { font-size:0.8rem; color:#64748b; }
        `}</style>
      </div>
    </>
  );
}
