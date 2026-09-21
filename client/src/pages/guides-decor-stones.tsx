import { Link } from "wouter";
import { MetaTags, FAQSchema, BreadcrumbSchema } from "@/components/seo/meta-tags";
import { useTranslation } from "react-i18next";
import { i18next } from "@/i18n";

const BASE_URL = "https://www.aquavoiq.com";

const FAQ_ITEMS = [
  {
    question: i18next.t("guides:guides-decor-stones.s1"),
    answer:
      i18next.t("guides:guides-decor-stones.s2"),
  },
  {
    question: i18next.t("guides:guides-decor-stones.s3"),
    answer:
      i18next.t("guides:guides-decor-stones.s4"),
  },
  {
    question: i18next.t("guides:guides-decor-stones.s5"),
    answer:
      i18next.t("guides:guides-decor-stones.s6"),
  },
  {
    question: i18next.t("guides:guides-decor-stones.s7"),
    answer:
      i18next.t("guides:guides-decor-stones.s8"),
  },
  {
    question: i18next.t("guides:guides-decor-stones.s9"),
    answer:
      i18next.t("guides:guides-decor-stones.s10"),
  },
  {
    question: i18next.t("guides:guides-decor-stones.s11"),
    answer:
      i18next.t("guides:guides-decor-stones.s12"),
  },
  {
    question: i18next.t("guides:guides-decor-stones.s13"),
    answer:
      i18next.t("guides:guides-decor-stones.s14"),
  },
  {
    question: i18next.t("guides:guides-decor-stones.s15"),
    answer:
      i18next.t("guides:guides-decor-stones.s16"),
  },
];

const DECOR_TYPES = [
  {
    type: i18next.t("guides:guides-decor-stones.type1"),
    safe: true,
    phEffect: i18next.t("guides:guides-decor-stones.s17"),
    notes: i18next.t("guides:guides-decor-stones.s18"),
  },
  {
    type: i18next.t("guides:guides-decor-stones.type2"),
    safe: true,
    phEffect: i18next.t("guides:guides-decor-stones.s17"),
    notes: i18next.t("guides:guides-decor-stones.s19"),
  },
  {
    type: i18next.t("guides:guides-decor-stones.type3"),
    safe: true,
    phEffect: i18next.t("guides:guides-decor-stones.s17"),
    notes: i18next.t("guides:guides-decor-stones.s20"),
  },
  {
    type: i18next.t("guides:guides-decor-stones.type4"),
    safe: false,
    phEffect: i18next.t("guides:guides-decor-stones.s21"),
    notes: i18next.t("guides:guides-decor-stones.s22"),
  },
  {
    type: i18next.t("guides:guides-decor-stones.type5"),
    safe: false,
    phEffect: i18next.t("guides:guides-decor-stones.s23"),
    notes: i18next.t("guides:guides-decor-stones.s24"),
  },
  {
    type: i18next.t("guides:guides-decor-stones.type6"),
    safe: true,
    phEffect: i18next.t("guides:guides-decor-stones.s25"),
    notes: i18next.t("guides:guides-decor-stones.s26"),
  },
  {
    type: i18next.t("guides:guides-decor-stones.type7"),
    safe: true,
    phEffect: i18next.t("guides:guides-decor-stones.s17"),
    notes: i18next.t("guides:guides-decor-stones.s27"),
  },
  {
    type: i18next.t("guides:guides-decor-stones.type8"),
    safe: true,
    phEffect: i18next.t("guides:guides-decor-stones.s17"),
    notes: i18next.t("guides:guides-decor-stones.s28"),
  },
];

export default function GuideDecorStonesGuide() {
  const { t: tr } = useTranslation("guides");
  return (
    <>
      <MetaTags
        title={tr("guides-decor-stones.s29")}
        description={tr("guides-decor-stones.s30")}
        keywords={[
          tr("guides-decor-stones.s31"),
          tr("guides-decor-stones.s32"),
          tr("guides-decor-stones.s33"),
          tr("guides-decor-stones.s34"),
          tr("guides-decor-stones.s35"),
          tr("guides-decor-stones.s36"),
        ]}
        url={`${BASE_URL}/guides/aquarium-decor-stones-guide`}
        canonicalUrl={`${BASE_URL}/guides/aquarium-decor-stones-guide`}
        type="article"
      />

      <BreadcrumbSchema
        items={[
          { name: tr("guides-decor-stones.s37"), url: BASE_URL },
          { name: tr("guides-decor-stones.s38"), url: `${BASE_URL}/guides` },
          { name: tr("guides-decor-stones.s39"), url: `${BASE_URL}/guides/aquarium-decor-stones-guide` },
        ]}
      />

      <FAQSchema questions={FAQ_ITEMS} />

      <div className="dc-wrap" dir="rtl">
        <header className="dc-bar">
          <Link href="/" className="dc-brand">AQUAVO</Link>
          <nav className="dc-nav">
            <a href="/guides/new-aquarium-setup-iraq" className="dc-nav-link">{tr("guides-decor-stones.s40")}</a>
            <a href="/guides/aquarium-water-test-guide" className="dc-nav-link">{tr("guides-decor-stones.s41")}</a>
            <Link href="/guides/heater-choice" className="dc-nav-link">{tr("guides-decor-stones.s42")}</Link>
          </nav>
        </header>

        <main className="dc-main" id="main-content">

          <nav className="dc-breadcrumb" aria-label={tr("guides-decor-stones.s43")}>
            <Link href="/">{tr("guides-decor-stones.s37")}</Link>
            <span> / </span>
            <a href="/guides">{tr("guides-decor-stones.s38")}</a>
            <span> / </span>
            <span>{tr("guides-decor-stones.s44")}</span>
          </nav>

          {/* Hero */}
          <section className="dc-hero" id="hero-headline">
            <span className="dc-badge">{tr("guides-decor-stones.s45")}</span>
            <h1 className="dc-h1">{tr("guides-decor-stones.s46")}</h1>

            {/* AEO Answer Block */}
            <div className="dc-answer-block" id="quick-answer">
              <p className="dc-answer-text">
                {tr("guides-decor-stones.s47")}
              </p>
            </div>

            <div className="dc-meta">
              <span>{tr("guides-decor-stones.s48")}</span>
              <span>•</span>
              <span>{tr("guides-decor-stones.s49")}</span>
            </div>
          </section>

          {/* AQUAVO Identity */}
          <div className="dc-store-note">
            <strong>AQUAVO</strong> {tr("guides-decor-stones.s50")}
            <Link href="/products" className="dc-store-link"> {tr("guides-decor-stones.s51")}</Link>
          </div>

          {/* Vinegar Test */}
          <section className="dc-section">
            <h2 className="dc-title">{tr("guides-decor-stones.s52")}</h2>
            <p className="dc-body">
              {tr("guides-decor-stones.s53")}
            </p>
            <div className="dc-test-steps">
              <div className="dc-test-step">
                <span className="dc-step-num">{tr("guides-decor-stones.s54")}</span>
                <span>{tr("guides-decor-stones.s55")}</span>
              </div>
              <div className="dc-test-step">
                <span className="dc-step-num">{tr("guides-decor-stones.s56")}</span>
                <span>{tr("guides-decor-stones.s57")}</span>
              </div>
              <div className="dc-test-step">
                <span className="dc-step-num">{tr("guides-decor-stones.s58")}</span>
                <span>{tr("guides-decor-stones.s59")}</span>
              </div>
            </div>
            <div className="dc-results">
              <div className="dc-result-safe">
                <span className="dc-result-icon">✓</span>
                <div>
                  <strong>{tr("guides-decor-stones.s60")}</strong>
                  <p>{tr("guides-decor-stones.s61")}</p>
                </div>
              </div>
              <div className="dc-result-danger">
                <span className="dc-result-icon">✗</span>
                <div>
                  <strong>{tr("guides-decor-stones.s62")}</strong>
                  <p>{tr("guides-decor-stones.s63")}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Types Table */}
          <section className="dc-section" id="decor-types">
            <h2 className="dc-title">{tr("guides-decor-stones.s64")}</h2>
            <div className="dc-table-wrap">
              <table className="dc-table">
                <thead>
                  <tr>
                    <th>{tr("guides-decor-stones.s65")}</th>
                    <th>{tr("guides-decor-stones.s66")}</th>
                    <th>{tr("guides-decor-stones.s67")}</th>
                    <th>{tr("guides-decor-stones.s68")}</th>
                  </tr>
                </thead>
                <tbody>
                  {DECOR_TYPES.map((d, i) => (
                    <tr key={i}>
                      <td><strong>{d.type}</strong></td>
                      <td className={d.safe ? "dc-safe" : "dc-unsafe"}>{d.safe ? tr("guides-decor-stones.s69") : tr("guides-decor-stones.s70")}</td>
                      <td>{d.phEffect}</td>
                      <td>{d.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Driftwood */}
          <section className="dc-section">
            <h2 className="dc-title">{tr("guides-decor-stones.s71")}</h2>
            <p className="dc-body">
              {tr("guides-decor-stones.s72")}
            </p>
            <div className="dc-wood-steps">
              {[
                { step: tr("guides-decor-stones.s73"), detail: tr("guides-decor-stones.s74") },
                { step: tr("guides-decor-stones.s75"), detail: tr("guides-decor-stones.s76") },
                { step: tr("guides-decor-stones.s77"), detail: tr("guides-decor-stones.s78") },
                { step: tr("guides-decor-stones.s79"), detail: tr("guides-decor-stones.s80") },
              ].map((s, i) => (
                <div key={i} className="dc-wood-step">
                  <div className="dc-wood-num">{i + 1}</div>
                  <div>
                    <strong>{s.step}</strong>
                    <p>{s.detail}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="dc-tip">
              {tr("guides-decor-stones.s81")}
            </div>
          </section>

          {/* Natural vs Artificial */}
          <section className="dc-section">
            <h2 className="dc-title">{tr("guides-decor-stones.s82")}</h2>
            <div className="dc-compare">
              <div className="dc-compare-col dc-natural">
                <div className="dc-compare-title">{tr("guides-decor-stones.s83")}</div>
                <ul className="dc-compare-list">
                  <li>{tr("guides-decor-stones.s84")}</li>
                  <li>{tr("guides-decor-stones.s85")}</li>
                  <li>{tr("guides-decor-stones.s86")}</li>
                  <li>{tr("guides-decor-stones.s87")}</li>
                  <li>{tr("guides-decor-stones.s88")}</li>
                </ul>
              </div>
              <div className="dc-compare-col dc-artificial">
                <div className="dc-compare-title">{tr("guides-decor-stones.s89")}</div>
                <ul className="dc-compare-list">
                  <li>{tr("guides-decor-stones.s90")}</li>
                  <li>{tr("guides-decor-stones.s91")}</li>
                  <li>{tr("guides-decor-stones.s92")}</li>
                  <li>{tr("guides-decor-stones.s93")}</li>
                  <li>{tr("guides-decor-stones.s94")}</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Placement Tips */}
          <section className="dc-section">
            <h2 className="dc-title">{tr("guides-decor-stones.s95")}</h2>
            <div className="dc-tips-grid">
              {[
                { icon: "⚙️", tip: tr("guides-decor-stones.s96") },
                { icon: "🔱", tip: tr("guides-decor-stones.s97") },
                { icon: "🏠", tip: tr("guides-decor-stones.s98") },
                { icon: "📐", tip: tr("guides-decor-stones.s99") },
                { icon: "🌡️", tip: tr("guides-decor-stones.s100") },
                { icon: "💡", tip: tr("guides-decor-stones.s101") },
              ].map((t, i) => (
                <div key={i} className="dc-tip-card">
                  <span className="dc-tip-icon">{t.icon}</span>
                  <span className="dc-tip-text">{t.tip}</span>
                </div>
              ))}
            </div>
          </section>

          {/* AQUAVO Products */}
          <section className="dc-section dc-aquavo-cta">
            <h2 className="dc-title">{tr("guides-decor-stones.s102")}</h2>
            <p className="dc-body">
              {tr("guides-decor-stones.s103")}
            </p>
            <div className="dc-prod-list">
              <div className="dc-prod-item">
                <span className="dc-prod-icon">⚪</span>
                <div>
                  <strong>{tr("guides-decor-stones.s104")}</strong>
                  <p>{tr("guides-decor-stones.s105")}</p>
                </div>
              </div>
              <div className="dc-prod-item">
                <span className="dc-prod-icon">🟤</span>
                <div>
                  <strong>{tr("guides-decor-stones.s106")}</strong>
                  <p>{tr("guides-decor-stones.s107")}</p>
                </div>
              </div>
              <div className="dc-prod-item">
                <span className="dc-prod-icon">🏺</span>
                <div>
                  <strong>{tr("guides-decor-stones.s108")}</strong>
                  <p>{tr("guides-decor-stones.s109")}</p>
                </div>
              </div>
            </div>
            <Link href="/products" className="dc-cta-btn" id="decor-cta">
              {tr("guides-decor-stones.s110")}
            </Link>
            <p className="dc-cta-note">{tr("guides-decor-stones.s111")}</p>
          </section>

          {/* FAQ */}
          <section className="dc-section" id="faq">
            <h2 className="dc-title">{tr("guides-decor-stones.s112")}</h2>
            <div className="dc-faq-list">
              {FAQ_ITEMS.map((item, i) => (
                <details key={i} className="dc-faq-item">
                  <summary className="dc-faq-q">{item.question}</summary>
                  <p className="dc-faq-a">{item.answer}</p>
                </details>
              ))}
            </div>
          </section>

          {/* Related Guides */}
          <section className="dc-section">
            <h2 className="dc-title">{tr("guides-decor-stones.s113")}</h2>
            <div className="dc-related-grid">
              <a href="/guides/new-aquarium-setup-iraq" className="dc-related-card">
                <span className="dc-related-icon">🐠</span>
                <div>
                  <div className="dc-related-title">{tr("guides-decor-stones.s114")}</div>
                  <div className="dc-related-desc">{tr("guides-decor-stones.s115")}</div>
                </div>
              </a>
              <a href="/guides/aquarium-water-test-guide" className="dc-related-card">
                <span className="dc-related-icon">🧪</span>
                <div>
                  <div className="dc-related-title">{tr("guides-decor-stones.s116")}</div>
                  <div className="dc-related-desc">{tr("guides-decor-stones.s117")}</div>
                </div>
              </a>
              <Link href="/guides/heater-choice" className="dc-related-card">
                <span className="dc-related-icon">🌡️</span>
                <div>
                  <div className="dc-related-title">{tr("guides-decor-stones.s118")}</div>
                  <div className="dc-related-desc">{tr("guides-decor-stones.s119")}</div>
                </div>
              </Link>
              <Link href="/guides/filter-choice" className="dc-related-card">
                <span className="dc-related-icon">⚙️</span>
                <div>
                  <div className="dc-related-title">{tr("guides-decor-stones.s120")}</div>
                  <div className="dc-related-desc">{tr("guides-decor-stones.s121")}</div>
                </div>
              </Link>
            </div>
          </section>

        </main>

        <style>{`
          .dc-wrap { min-height:100vh; background:#0B1E28; color:#e2e8f0; font-family:'Cairo','Segoe UI',system-ui,sans-serif; direction:rtl; }
          .dc-bar { position:sticky; top:0; z-index:50; height:64px; background:rgba(10,22,40,0.96); backdrop-filter:blur(10px); border-bottom:1px solid rgba(11,147,166,0.2); display:flex; align-items:center; justify-content:space-between; padding:0 1.5rem; }
          .dc-brand { color:#0B93A6; font-weight:800; letter-spacing:3px; font-size:1.1rem; text-decoration:none; }
          .dc-nav { display:flex; gap:1rem; }
          .dc-nav-link { color:#94a3b8; font-size:0.82rem; text-decoration:none; transition:color 0.2s; }
          .dc-nav-link:hover { color:#0B93A6; }
          .dc-main { width:100%; max-width:760px; margin:0 auto; padding:2rem 1.25rem 6rem; display:flex; flex-direction:column; gap:3rem; }
          .dc-breadcrumb { font-size:0.78rem; color:#64748b; display:flex; gap:0.4rem; flex-wrap:wrap; }
          .dc-breadcrumb a { color:#94a3b8; text-decoration:none; }
          .dc-breadcrumb a:hover { color:#0B93A6; }
          .dc-hero { text-align:center; }
          .dc-badge { display:inline-block; border:1px solid rgba(11,147,166,0.35); color:#0B93A6; font-size:0.7rem; font-weight:700; letter-spacing:1.5px; padding:4px 14px; border-radius:999px; margin-bottom:1.25rem; }
          .dc-h1 { font-size:clamp(1.5rem,5vw,2.4rem); font-weight:900; color:#f0f9ff; margin:0 0 1.25rem; line-height:1.2; }
          .dc-answer-block { background:rgba(11,147,166,0.07); border:1px solid rgba(11,147,166,0.2); border-radius:12px; padding:1.25rem 1.5rem; text-align:right; margin-bottom:1rem; }
          .dc-answer-text { font-size:0.97rem; color:#cbd5e1; line-height:1.8; margin:0; }
          .dc-meta { font-size:0.78rem; color:#475569; display:flex; gap:0.75rem; justify-content:center; }
          .dc-store-note { background:rgba(201,122,46,0.05); border:1px solid rgba(201,122,46,0.15); border-radius:10px; padding:1rem 1.25rem; font-size:0.88rem; color:#94a3b8; line-height:1.7; }
          .dc-store-note strong { color:var(--aqv-warning); }
          .dc-store-link { color:#0B93A6; text-decoration:none; font-weight:600; }
          .dc-section { display:flex; flex-direction:column; gap:1rem; }
          .dc-title { font-size:1.2rem; font-weight:800; color:#e2e8f0; margin:0 0 0.5rem; border-right:3px solid #0B93A6; padding-right:0.75rem; }
          .dc-body { font-size:0.92rem; color:#94a3b8; line-height:1.8; margin:0; }
          .dc-test-steps { display:flex; flex-direction:column; gap:0.5rem; margin-bottom:1rem; }
          .dc-test-step { display:flex; gap:0.85rem; align-items:center; font-size:0.9rem; color:#94a3b8; }
          .dc-step-num { min-width:28px; height:28px; border-radius:50%; background:rgba(11,147,166,0.12); color:#0B93A6; display:flex; align-items:center; justify-content:center; font-size:0.8rem; font-weight:700; flex-shrink:0; }
          .dc-results { display:grid; grid-template-columns:1fr 1fr; gap:0.85rem; }
          @media(max-width:500px){.dc-results{grid-template-columns:1fr;}}
          .dc-result-safe { background:rgba(34,197,94,0.05); border:1px solid rgba(34,197,94,0.2); border-radius:10px; padding:1rem; display:flex; gap:0.85rem; align-items:flex-start; }
          .dc-result-danger { background:rgba(239,68,68,0.05); border:1px solid rgba(239,68,68,0.2); border-radius:10px; padding:1rem; display:flex; gap:0.85rem; align-items:flex-start; }
          .dc-result-icon { font-size:1.4rem; flex-shrink:0; }
          .dc-result-safe strong { color:#86efac; display:block; margin-bottom:0.2rem; font-size:0.9rem; }
          .dc-result-danger strong { color:#fca5a5; display:block; margin-bottom:0.2rem; font-size:0.9rem; }
          .dc-result-safe p,.dc-result-danger p { font-size:0.82rem; color:#94a3b8; margin:0; }
          .dc-table-wrap { overflow-x:auto; }
          .dc-table { width:100%; border-collapse:collapse; font-size:0.84rem; min-width:580px; }
          .dc-table th { background:rgba(11,147,166,0.12); color:#cbd5e1; padding:0.75rem 0.9rem; text-align:right; font-weight:700; border-bottom:1px solid rgba(11,147,166,0.2); }
          .dc-table td { color:#94a3b8; padding:0.65rem 0.9rem; border-bottom:1px solid rgba(255,255,255,0.04); vertical-align:top; }
          .dc-table tr:last-child td { border-bottom:none; }
          .dc-safe { color:#86efac; font-weight:700; }
          .dc-unsafe { color:#fca5a5; font-weight:700; }
          .dc-wood-steps { display:flex; flex-direction:column; gap:0.75rem; }
          .dc-wood-step { display:flex; gap:0.9rem; align-items:flex-start; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:10px; padding:0.9rem 1rem; }
          .dc-wood-num { min-width:28px; height:28px; border-radius:50%; background:rgba(180,120,60,0.15); color:#d4a257; display:flex; align-items:center; justify-content:center; font-size:0.8rem; font-weight:700; flex-shrink:0; }
          .dc-wood-step strong { display:block; color:#e2e8f0; font-size:0.9rem; margin-bottom:0.2rem; }
          .dc-wood-step p { font-size:0.83rem; color:#64748b; margin:0; line-height:1.5; }
          .dc-tip { background:rgba(11,147,166,0.07); border:1px solid rgba(11,147,166,0.2); border-radius:8px; padding:0.85rem 1rem; font-size:0.85rem; color:#7dd3fc; }
          .dc-compare { display:grid; grid-template-columns:1fr 1fr; gap:1rem; }
          @media(max-width:500px){.dc-compare{grid-template-columns:1fr;}}
          .dc-compare-col { border-radius:12px; padding:1.25rem; }
          .dc-natural { background:rgba(11,147,166,0.04); border:1px solid rgba(11,147,166,0.15); }
          .dc-artificial { background:rgba(148,163,184,0.04); border:1px solid rgba(148,163,184,0.12); }
          .dc-compare-title { font-size:0.88rem; font-weight:700; color:#e2e8f0; margin-bottom:0.75rem; }
          .dc-compare-list { list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:0.4rem; }
          .dc-compare-list li { font-size:0.83rem; color:#94a3b8; padding-right:1rem; position:relative; }
          .dc-compare-list li::before { content:'•'; position:absolute; right:0; color:#0B93A6; }
          .dc-tips-grid { display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; }
          @media(max-width:500px){.dc-tips-grid{grid-template-columns:1fr;}}
          .dc-tip-card { background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:0.85rem 1rem; display:flex; gap:0.75rem; align-items:flex-start; }
          .dc-tip-icon { font-size:1.2rem; flex-shrink:0; }
          .dc-tip-text { font-size:0.83rem; color:#94a3b8; line-height:1.5; }
          .dc-aquavo-cta { background:rgba(11,147,166,0.04); border:1px solid rgba(11,147,166,0.15); border-radius:14px; padding:1.5rem; }
          .dc-prod-list { display:flex; flex-direction:column; gap:0.75rem; margin-bottom:1.5rem; }
          .dc-prod-item { display:flex; gap:0.85rem; align-items:flex-start; }
          .dc-prod-icon { font-size:1.3rem; flex-shrink:0; margin-top:2px; }
          .dc-prod-item strong { display:block; color:#e2e8f0; font-size:0.9rem; margin-bottom:0.15rem; }
          .dc-prod-item p { font-size:0.82rem; color:#64748b; margin:0; }
          .dc-cta-btn { display:inline-block; background:linear-gradient(135deg,#0B93A6,#0e7490); color:#fff; font-weight:700; font-size:0.95rem; padding:0.85rem 2rem; border-radius:10px; text-decoration:none; transition:opacity 0.2s; }
          .dc-cta-btn:hover{opacity:0.88;}
          .dc-cta-note { font-size:0.8rem; color:#64748b; margin-top:0.5rem; }
          .dc-faq-list { display:flex; flex-direction:column; gap:0.75rem; }
          .dc-faq-item { background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.07); border-radius:10px; overflow:hidden; }
          .dc-faq-q { padding:1rem 1.1rem; font-size:0.92rem; font-weight:700; color:#e2e8f0; cursor:pointer; list-style:none; }
          .dc-faq-q::-webkit-details-marker{display:none;}
          .dc-faq-a { padding:0 1.1rem 1rem; font-size:0.87rem; color:#94a3b8; line-height:1.75; margin:0; }
          .dc-related-grid { display:grid; grid-template-columns:1fr 1fr; gap:0.85rem; }
          @media(max-width:560px){.dc-related-grid{grid-template-columns:1fr;}}
          .dc-related-card { background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.07); border-radius:12px; padding:1rem; text-decoration:none; display:flex; gap:0.85rem; align-items:flex-start; transition:border-color 0.2s; }
          .dc-related-card:hover{border-color:rgba(11,147,166,0.4);}
          .dc-related-icon { font-size:1.5rem; flex-shrink:0; }
          .dc-related-title { font-size:0.9rem; font-weight:700; color:#e2e8f0; margin-bottom:0.2rem; }
          .dc-related-desc { font-size:0.8rem; color:#64748b; }
        `}</style>
      </div>
    </>
  );
}
