import { Download, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";

/*
  Sources — Researched May 2026:
  A: aquariumscience.org — fish stress, hiding behavior, disease symptoms, aggression
  A: aqueon.com — tank setup, acclimation, lighting, water quality, disease prevention
  B: aquariumcoop.com — acclimation methods, dither fish concept, stress ich
  B: fishkeepingworld.com — depression signs, disease guide, behavioral indicators
  B: petmd.com — new tank syndrome, 30-day new fish guide, stress effects in fish
*/

const PDF_URL = "/assets/guides/aquavo-fish-hiding-guide.pdf";

export default function GuideFishHiding() {
  const { t } = useTranslation("guides");
  return (
    <div className="g-wrap">

      <header className="g-bar">
        <a href="/" className="g-brand">AQUAVO</a>
        <div className="g-bar-actions">
          <a
            href={PDF_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[#E8EDF2] border border-primary/45 hover:bg-[#0B93A6]/10 text-xs sm:text-sm h-9 px-3 rounded-full font-bold transition-colors"
          >
            <span className="hidden sm:inline">{t("guides-fish-hiding.s1")}</span>
            <ExternalLink className="w-4 h-4" />
          </a>
          <a
            href={PDF_URL}
            download="aquavo-fish-hiding-guide.pdf"
            className="flex items-center gap-1.5 bg-primary text-foreground hover:bg-[#0B93A6]/85 text-xs sm:text-sm h-9 px-3 sm:px-4 rounded-full font-bold transition-colors"
          >
            <span>{t("guides-fish-hiding.s2")}</span>
            <Download className="w-4 h-4" />
          </a>
        </div>
      </header>

      <main className="g-main">

        {/* ── SECTION 1: Hero ── */}
        <section className="g-hero">
          <span className="g-badge">{t("guides-fish-hiding.s3")}</span>
          <h1>{t("guides-fish-hiding.s4")}</h1>
          <p className="g-sub">{t("guides-fish-hiding.s5")}</p>
          <p className="g-intro">
            {t("guides-fish-hiding.s6")}
          </p>
          <div className="g-meta-row">
            <span>{t("guides-fish-hiding.s7")}</span>
            <span>{t("guides-fish-hiding.s8")}</span>
            <span className="g-pdf-tag g-ready">{t("guides-fish-hiding.s9")}</span>
          </div>
          <p className="g-disclaimer">
            {t("guides-fish-hiding.s10")}
          </p>
        </section>

        {/* ── SECTION 2: قبل لا تقلق ── */}
        <section className="g-section">
          <h2 className="g-title">{t("guides-fish-hiding.s11")}</h2>
          <p className="g-section-intro">
            {t("guides-fish-hiding.s12")}
          </p>
          <div className="g-diag-grid">
            <div className="g-diag g-safe">
              <div className="g-diag-label">{t("guides-fish-hiding.s13")}</div>
              <ul className="g-diag-list">
                <li>{t("guides-fish-hiding.s14")}</li>
                <li>{t("guides-fish-hiding.s15")}</li>
                <li>{t("guides-fish-hiding.s16")}</li>
                <li>{t("guides-fish-hiding.s17")}</li>
                <li>{t("guides-fish-hiding.s18")}</li>
              </ul>
            </div>
            <div className="g-diag g-warn">
              <div className="g-diag-label">{t("guides-fish-hiding.s19")}</div>
              <ul className="g-diag-list">
                <li>{t("guides-fish-hiding.s20")}</li>
                <li>{t("guides-fish-hiding.s21")}</li>
                <li>{t("guides-fish-hiding.s22")}</li>
                <li>{t("guides-fish-hiding.s23")}</li>
                <li>{t("guides-fish-hiding.s24")}</li>
                <li>{t("guides-fish-hiding.s25")}</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── SECTION 3: التشخيص السريع ── */}
        <section className="g-section">
          <h2 className="g-title">{t("guides-fish-hiding.s26")}</h2>
          <p className="g-section-intro">{t("guides-fish-hiding.s27")}</p>
          <div className="g-table-wrap">
            <table className="g-table">
              <thead>
                <tr>
                  <th>{t("guides-fish-hiding.s28")}</th>
                  <th>{t("guides-fish-hiding.s29")}</th>
                  <th>{t("guides-fish-hiding.s30")}</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>{t("guides-fish-hiding.s31")}</td><td className="g-td-neutral">{t("guides-fish-hiding.s32")}</td><td>{t("guides-fish-hiding.s33")}</td></tr>
                <tr><td>{t("guides-fish-hiding.s34")}</td><td className="g-td-safe">{t("guides-fish-hiding.s35")}</td><td>{t("guides-fish-hiding.s36")}</td></tr>
                <tr><td>{t("guides-fish-hiding.s37")}</td><td className="g-td-warn">{t("guides-fish-hiding.s38")}</td><td>{t("guides-fish-hiding.s39")}</td></tr>
                <tr><td>{t("guides-fish-hiding.s40")}</td><td className="g-td-warn">{t("guides-fish-hiding.s41")}</td><td>{t("guides-fish-hiding.s42")}</td></tr>
                <tr><td>{t("guides-fish-hiding.s43")}</td><td className="g-td-warn">{t("guides-fish-hiding.s44")}</td><td>{t("guides-fish-hiding.s45")}</td></tr>
                <tr><td>{t("guides-fish-hiding.s46")}</td><td className="g-td-warn">{t("guides-fish-hiding.s47")}</td><td>{t("guides-fish-hiding.s48")}</td></tr>
                <tr><td>{t("guides-fish-hiding.s49")}</td><td className="g-td-neutral">{t("guides-fish-hiding.s50")}</td><td>{t("guides-fish-hiding.s51")}</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ── SECTION 4 ── */}
        <section className="g-section">
          <div className="g-cause-header">
            <span className="g-cause-num-big">01</span>
            <h2 className="g-title g-title-inline">{t("guides-fish-hiding.s52")}</h2>
          </div>
          <div className="g-cause-block">
            <h3 className="g-cause-sub">{t("guides-fish-hiding.s53")}</h3>
            <p>{t("guides-fish-hiding.s54")}</p>
          </div>
          <div className="g-two-col">
            <div className="g-col-box g-safe-box">
              <div className="g-col-label">{t("guides-fish-hiding.s55")}</div>
              <ul className="g-simple-list">
                <li>{t("guides-fish-hiding.s56")}</li>
                <li>{t("guides-fish-hiding.s57")}</li>
                <li>{t("guides-fish-hiding.s58")}</li>
                <li>{t("guides-fish-hiding.s59")}</li>
                <li>{t("guides-fish-hiding.s60")}</li>
              </ul>
            </div>
            <div className="g-col-box g-warn-box">
              <div className="g-col-label">{t("guides-fish-hiding.s61")}</div>
              <ul className="g-simple-list">
                <li>{t("guides-fish-hiding.s62")}</li>
                <li>{t("guides-fish-hiding.s21")}</li>
                <li>{t("guides-fish-hiding.s63")}</li>
                <li>{t("guides-fish-hiding.s64")}</li>
              </ul>
            </div>
          </div>
          <div className="g-action-box">
            <div className="g-action-label">{t("guides-fish-hiding.s65")}</div>
            <ol className="g-numbered">
              <li>{t("guides-fish-hiding.s66")}</li>
              <li>{t("guides-fish-hiding.s67")}</li>
              <li>{t("guides-fish-hiding.s68")}</li>
              <li>{t("guides-fish-hiding.s69")}</li>
            </ol>
          </div>
          <div className="g-dont-inline">
            <div className="g-dont-label">{t("guides-fish-hiding.s70")}</div>
            <div className="g-dont-items">
              <span className="g-dont-chip">{t("guides-fish-hiding.s71")}</span>
              <span className="g-dont-chip">{t("guides-fish-hiding.s72")}</span>
              <span className="g-dont-chip">{t("guides-fish-hiding.s73")}</span>
            </div>
          </div>
        </section>

        {/* ── SECTION 5 ── */}
        <section className="g-section">
          <div className="g-cause-header">
            <span className="g-cause-num-big">02</span>
            <h2 className="g-title g-title-inline">{t("guides-fish-hiding.s74")}</h2>
          </div>
          <div className="g-cause-block">
            <h3 className="g-cause-sub">{t("guides-fish-hiding.s53")}</h3>
            <p>{t("guides-fish-hiding.s75")}</p>
            <p style={{ marginTop: "10px" }}>{t("guides-fish-hiding.s76")}</p>
          </div>
          <div className="g-two-col">
            <div className="g-col-box g-warn-box">
              <div className="g-col-label">{t("guides-fish-hiding.s77")}</div>
              <ul className="g-simple-list">
                <li>{t("guides-fish-hiding.s78")}</li>
                <li>{t("guides-fish-hiding.s79")}</li>
                <li>{t("guides-fish-hiding.s80")}</li>
                <li>{t("guides-fish-hiding.s81")}</li>
                <li>{t("guides-fish-hiding.s82")}</li>
              </ul>
            </div>
            <div className="g-col-box g-neutral-box">
              <div className="g-col-label">{t("guides-fish-hiding.s83")}</div>
              <ul className="g-simple-list">
                <li>{t("guides-fish-hiding.s84")}</li>
                <li>{t("guides-fish-hiding.s85")}</li>
                <li>{t("guides-fish-hiding.s86")}</li>
                <li>{t("guides-fish-hiding.s87")}</li>
                <li>{t("guides-fish-hiding.s88")}</li>
              </ul>
            </div>
          </div>
          <div className="g-action-box">
            <div className="g-action-label">{t("guides-fish-hiding.s89")}</div>
            <ol className="g-numbered">
              <li>{t("guides-fish-hiding.s90")}</li>
              <li>{t("guides-fish-hiding.s91")}</li>
              <li>{t("guides-fish-hiding.s92")}</li>
              <li>{t("guides-fish-hiding.s93")}</li>
            </ol>
          </div>
          <div className="g-dont-inline">
            <div className="g-dont-label">{t("guides-fish-hiding.s70")}</div>
            <div className="g-dont-items">
              <span className="g-dont-chip">{t("guides-fish-hiding.s94")}</span>
              <span className="g-dont-chip">{t("guides-fish-hiding.s95")}</span>
              <span className="g-dont-chip">{t("guides-fish-hiding.s96")}</span>
            </div>
          </div>
        </section>

        {/* ── SECTION 6 ── */}
        <section className="g-section">
          <div className="g-cause-header">
            <span className="g-cause-num-big">03</span>
            <h2 className="g-title g-title-inline">{t("guides-fish-hiding.s97")}</h2>
          </div>
          <div className="g-cause-block">
            <h3 className="g-cause-sub">{t("guides-fish-hiding.s53")}</h3>
            <p>{t("guides-fish-hiding.s98")}</p>
            <p style={{ marginTop: "10px" }}>{t("guides-fish-hiding.s99")}</p>
          </div>
          <div className="g-two-col">
            <div className="g-col-box g-warn-box">
              <div className="g-col-label">{t("guides-fish-hiding.s100")}</div>
              <ul className="g-simple-list">
                <li>{t("guides-fish-hiding.s101")}</li>
                <li>{t("guides-fish-hiding.s102")}</li>
                <li>{t("guides-fish-hiding.s103")}</li>
                <li>{t("guides-fish-hiding.s104")}</li>
                <li>{t("guides-fish-hiding.s105")}</li>
              </ul>
            </div>
            <div className="g-col-box g-safe-box">
              <div className="g-col-label">{t("guides-fish-hiding.s106")}</div>
              <ul className="g-simple-list">
                <li>{t("guides-fish-hiding.s107")}</li>
                <li>{t("guides-fish-hiding.s108")}</li>
                <li>{t("guides-fish-hiding.s109")}</li>
                <li>{t("guides-fish-hiding.s110")}</li>
                <li>{t("guides-fish-hiding.s111")}</li>
              </ul>
            </div>
          </div>
          <div className="g-info-note">
            {t("guides-fish-hiding.s112")}
          </div>
        </section>

        {/* ── SECTION 7 ── */}
        <section className="g-section">
          <div className="g-cause-header">
            <span className="g-cause-num-big">04</span>
            <h2 className="g-title g-title-inline">{t("guides-fish-hiding.s113")}</h2>
          </div>
          <div className="g-cause-block">
            <h3 className="g-cause-sub">{t("guides-fish-hiding.s53")}</h3>
            <p>{t("guides-fish-hiding.s114")}</p>
            <p style={{ marginTop: "10px" }}>{t("guides-fish-hiding.s115")}</p>
          </div>
          <div className="g-two-col">
            <div className="g-col-box g-warn-box">
              <div className="g-col-label">{t("guides-fish-hiding.s116")}</div>
              <ul className="g-simple-list">
                <li>{t("guides-fish-hiding.s117")}</li>
                <li>{t("guides-fish-hiding.s118")}</li>
                <li>{t("guides-fish-hiding.s119")}</li>
                <li>{t("guides-fish-hiding.s120")}</li>
              </ul>
            </div>
            <div className="g-col-box g-safe-box">
              <div className="g-col-label">{t("guides-fish-hiding.s121")}</div>
              <ul className="g-simple-list">
                <li>{t("guides-fish-hiding.s122")}</li>
                <li>{t("guides-fish-hiding.s123")}</li>
                <li>{t("guides-fish-hiding.s124")}</li>
                <li>{t("guides-fish-hiding.s125")}</li>
              </ul>
            </div>
          </div>
          <div className="g-action-box">
            <div className="g-action-label">{t("guides-fish-hiding.s89")}</div>
            <ol className="g-numbered">
              <li>{t("guides-fish-hiding.s126")}</li>
              <li>{t("guides-fish-hiding.s127")}</li>
              <li>{t("guides-fish-hiding.s128")}</li>
              <li>{t("guides-fish-hiding.s129")}</li>
            </ol>
          </div>
        </section>

        {/* ── SECTION 8 ── */}
        <section className="g-section">
          <div className="g-cause-header">
            <span className="g-cause-num-big">05</span>
            <h2 className="g-title g-title-inline">{t("guides-fish-hiding.s130")}</h2>
          </div>
          <div className="g-cause-block">
            <h3 className="g-cause-sub">{t("guides-fish-hiding.s131")}</h3>
            <p>{t("guides-fish-hiding.s132")}</p>
            <p style={{ marginTop: "10px" }}>{t("guides-fish-hiding.s133")}</p>
          </div>
          <div className="g-warn-full">
            <div className="g-warn-full-label">{t("guides-fish-hiding.s134")}</div>
            <div className="g-warn-signs-grid">
              <div className="g-warn-sign"><div className="g-sign-name">{t("guides-fish-hiding.s135")}</div><div className="g-sign-desc">{t("guides-fish-hiding.s136")}</div></div>
              <div className="g-warn-sign"><div className="g-sign-name">{t("guides-fish-hiding.s137")}</div><div className="g-sign-desc">{t("guides-fish-hiding.s138")}</div></div>
              <div className="g-warn-sign"><div className="g-sign-name">{t("guides-fish-hiding.s139")}</div><div className="g-sign-desc">{t("guides-fish-hiding.s140")}</div></div>
              <div className="g-warn-sign"><div className="g-sign-name">{t("guides-fish-hiding.s141")}</div><div className="g-sign-desc">{t("guides-fish-hiding.s142")}</div></div>
              <div className="g-warn-sign"><div className="g-sign-name">{t("guides-fish-hiding.s143")}</div><div className="g-sign-desc">{t("guides-fish-hiding.s144")}</div></div>
              <div className="g-warn-sign"><div className="g-sign-name">{t("guides-fish-hiding.s145")}</div><div className="g-sign-desc">{t("guides-fish-hiding.s146")}</div></div>
            </div>
          </div>
          <div className="g-action-box">
            <div className="g-action-label">{t("guides-fish-hiding.s89")}</div>
            <ol className="g-numbered">
              <li>{t("guides-fish-hiding.s147")}</li>
              <li>{t("guides-fish-hiding.s148")}</li>
              <li>{t("guides-fish-hiding.s149")}</li>
              <li>{t("guides-fish-hiding.s150")}</li>
              <li>{t("guides-fish-hiding.s151")}</li>
            </ol>
          </div>
          <div className="g-important-note">
            {t("guides-fish-hiding.s152")}
          </div>
        </section>

        {/* ── SECTION 9: أخطاء ── */}
        <section className="g-section">
          <h2 className="g-title">{t("guides-fish-hiding.s153")}</h2>
          <p className="g-section-intro">
            {t("guides-fish-hiding.s154")}
          </p>
          <div className="g-mistakes">
            <div className="g-mistake">
              <div className="g-mistake-title">{t("guides-fish-hiding.s155")}</div>
              <div className="g-mistake-why">{t("guides-fish-hiding.s156")}</div>
            </div>
            <div className="g-mistake">
              <div className="g-mistake-title">{t("guides-fish-hiding.s157")}</div>
              <div className="g-mistake-why">{t("guides-fish-hiding.s158")}</div>
            </div>
            <div className="g-mistake">
              <div className="g-mistake-title">{t("guides-fish-hiding.s159")}</div>
              <div className="g-mistake-why">{t("guides-fish-hiding.s160")}</div>
            </div>
            <div className="g-mistake">
              <div className="g-mistake-title">{t("guides-fish-hiding.s161")}</div>
              <div className="g-mistake-why">{t("guides-fish-hiding.s162")}</div>
            </div>
            <div className="g-mistake">
              <div className="g-mistake-title">{t("guides-fish-hiding.s163")}</div>
              <div className="g-mistake-why">{t("guides-fish-hiding.s164")}</div>
            </div>
            <div className="g-mistake">
              <div className="g-mistake-title">{t("guides-fish-hiding.s165")}</div>
              <div className="g-mistake-why">{t("guides-fish-hiding.s166")}</div>
            </div>
          </div>
        </section>

        {/* ── SECTION 10: شنو ترسل ── */}
        <section className="g-section">
          <h2 className="g-title">{t("guides-fish-hiding.s167")}</h2>
          <p className="g-section-intro">{t("guides-fish-hiding.s168")}</p>
          <div className="g-send-grid">
            <div className="g-send-card g-send-visual">
              <div className="g-send-card-title">{t("guides-fish-hiding.s169")}</div>
              <ul className="g-send-list-inner">
                <li>{t("guides-fish-hiding.s170")}</li>
                <li>{t("guides-fish-hiding.s171")}</li>
                <li>{t("guides-fish-hiding.s172")}</li>
              </ul>
            </div>
            <div className="g-send-card g-send-info">
              <div className="g-send-card-title">{t("guides-fish-hiding.s173")}</div>
              <ul className="g-send-list-inner">
                <li>{t("guides-fish-hiding.s174")}</li>
                <li>{t("guides-fish-hiding.s175")}</li>
                <li>{t("guides-fish-hiding.s176")}</li>
                <li>{t("guides-fish-hiding.s177")}</li>
              </ul>
            </div>
            <div className="g-send-card g-send-behavior">
              <div className="g-send-card-title">{t("guides-fish-hiding.s178")}</div>
              <ul className="g-send-list-inner">
                <li>{t("guides-fish-hiding.s179")}</li>
                <li>{t("guides-fish-hiding.s180")}</li>
                <li>{t("guides-fish-hiding.s181")}</li>
                <li>{t("guides-fish-hiding.s182")}</li>
              </ul>
            </div>
          </div>
          <div className="g-send-footer">{t("guides-fish-hiding.s183")}</div>
        </section>

        {/* ── CTA ── */}
        <section className="g-cta">
          <h2>{t("guides-fish-hiding.s184")}</h2>
          <p>{t("guides-fish-hiding.s185")}</p>
          <p>{t("guides-fish-hiding.s186")}</p>
        </section>

      </main>

      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{background:#0B1E28}
        .g-wrap{min-height:100vh;background:#0B1E28;color:#e8edf5;direction:rtl;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;line-height:1.7}
        .g-bar{position:sticky;top:0;z-index:50;height:60px;background:rgba(1,6,17,.96);border-bottom:1px solid rgba(11,147,166,.3);display:flex;align-items:center;justify-content:space-between;padding:0 20px;backdrop-filter:blur(10px)}
        .g-brand{color:#0B93A6;font-weight:800;letter-spacing:4px;font-size:17px;text-decoration:none}
        .g-bar-actions{display:flex;gap:10px;align-items:center}
        .g-main{max-width:760px;margin:0 auto;padding:0 16px 60px}
        .g-hero{padding:48px 0 36px;border-bottom:1px solid rgba(11,147,166,.15);margin-bottom:44px}
        .g-badge{display:inline-block;background:rgba(11,147,166,.12);color:#0B93A6;border:1px solid rgba(11,147,166,.3);border-radius:999px;padding:4px 14px;font-size:12px;font-weight:700;letter-spacing:.5px;margin-bottom:14px}
        .g-hero h1{font-size:clamp(28px,5.5vw,42px);font-weight:800;color:#fff;line-height:1.25;margin-bottom:10px}
        .g-sub{font-size:18px;color:#9ab5c8;margin-bottom:12px;font-weight:500}
        .g-intro{font-size:15px;color:#7a9ab0;max-width:620px;margin-bottom:18px;line-height:1.75}
        .g-meta-row{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}
        .g-meta-row span{font-size:12px;color:#6a8fa8;background:rgba(255,255,255,.04);padding:4px 10px;border-radius:6px}
        .g-pdf-tag{font-size:12px;padding:4px 10px;border-radius:6px;font-weight:600}
        .g-ready{background:rgba(11,147,166,.12);color:#0B93A6}
        .g-disclaimer{font-size:12px;color:rgba(255,255,255,.28);border-right:2px solid rgba(255,255,255,.08);padding-right:10px;line-height:1.6}
        .g-section{margin-bottom:52px}
        .g-title{font-size:19px;font-weight:700;color:#0B93A6;margin-bottom:18px;padding-bottom:9px;border-bottom:1px solid rgba(11,147,166,.2)}
        .g-title.g-title-inline{border-bottom:none;padding-bottom:0;margin-bottom:0;font-size:18px}
        .g-section-intro{font-size:14px;color:#8aa8bc;margin-bottom:18px;line-height:1.75}
        .g-cause-header{display:flex;align-items:baseline;gap:14px;margin-bottom:18px;border-bottom:1px solid rgba(11,147,166,.2);padding-bottom:10px}
        .g-cause-num-big{font-size:32px;font-weight:900;color:rgba(11,147,166,.3);line-height:1;flex-shrink:0}
        .g-cause-block{background:rgba(10,22,40,.5);border:1px solid rgba(11,147,166,.1);border-radius:12px;padding:18px 20px;margin-bottom:16px}
        .g-cause-sub{font-size:13px;font-weight:700;color:#0B93A6;letter-spacing:.5px;margin-bottom:8px}
        .g-cause-block p{font-size:14px;color:#9ab5c8;line-height:1.8}
        .g-two-col{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px}
        .g-col-box{border-radius:12px;padding:16px}
        .g-safe-box{background:rgba(11,147,166,.06);border:1px solid rgba(11,147,166,.2)}
        .g-warn-box{background:rgba(255,100,60,.05);border:1px solid rgba(255,100,60,.2)}
        .g-neutral-box{background:rgba(201,122,46,.04);border:1px solid rgba(201,122,46,.15)}
        .g-col-label{font-size:11px;font-weight:700;letter-spacing:.5px;margin-bottom:10px}
        .g-safe-box .g-col-label{color:#0B93A6}
        .g-warn-box .g-col-label{color:#ff6c47}
        .g-neutral-box .g-col-label{color:rgba(201,122,46,.7)}
        .g-simple-list{list-style:none;display:flex;flex-direction:column;gap:7px}
        .g-simple-list li{font-size:13px;color:#b0c8d8;padding-right:14px;position:relative;line-height:1.5}
        .g-safe-box .g-simple-list li::before{content:"—";position:absolute;right:0;color:rgba(11,147,166,.6)}
        .g-warn-box .g-simple-list li::before{content:"—";position:absolute;right:0;color:rgba(255,108,71,.6)}
        .g-neutral-box .g-simple-list li::before{content:"—";position:absolute;right:0;color:rgba(201,122,46,.4)}
        .g-diag-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        .g-diag{border-radius:12px;padding:18px}
        .g-safe{background:rgba(11,147,166,.06);border:1px solid rgba(11,147,166,.22)}
        .g-warn{background:rgba(255,100,60,.05);border:1px solid rgba(255,100,60,.22)}
        .g-diag-label{font-size:11px;font-weight:700;letter-spacing:.5px;margin-bottom:10px}
        .g-safe .g-diag-label{color:#0B93A6}
        .g-warn .g-diag-label{color:#ff6c47}
        .g-diag-list{list-style:none;display:flex;flex-direction:column;gap:7px}
        .g-diag-list li{font-size:13px;color:#b8ccd8;padding-right:14px;position:relative;line-height:1.5}
        .g-safe .g-diag-list li::before{content:"—";position:absolute;right:0;color:rgba(11,147,166,.6)}
        .g-warn .g-diag-list li::before{content:"—";position:absolute;right:0;color:rgba(255,108,71,.6)}
        .g-table-wrap{overflow-x:auto;border-radius:12px;border:1px solid rgba(11,147,166,.15)}
        .g-table{width:100%;border-collapse:collapse;font-size:13px;min-width:520px}
        .g-table th{background:rgba(11,147,166,.1);color:#0B93A6;padding:10px 14px;text-align:right;font-weight:700;font-size:12px;letter-spacing:.3px}
        .g-table td{padding:10px 14px;color:#b0c8d8;border-top:1px solid rgba(255,255,255,.05);vertical-align:top;line-height:1.5}
        .g-table tr:nth-child(even) td{background:rgba(255,255,255,.015)}
        .g-table tr:hover td{background:rgba(11,147,166,.04)}
        .g-td-safe{color:rgba(11,147,166,.85)!important;font-weight:600}
        .g-td-warn{color:rgba(255,108,71,.8)!important;font-weight:600}
        .g-td-neutral{color:rgba(201,122,46,.65)!important;font-weight:600}
        .g-action-box{background:rgba(10,22,40,.6);border:1px solid rgba(11,147,166,.18);border-radius:12px;padding:16px 20px;margin-bottom:12px}
        .g-action-label{font-size:11px;font-weight:700;color:#0B93A6;letter-spacing:.5px;margin-bottom:10px}
        .g-numbered{list-style:none;display:flex;flex-direction:column;gap:8px;counter-reset:steps}
        .g-numbered li{counter-increment:steps;display:flex;gap:12px;align-items:flex-start;font-size:13px;color:#b0c8d8;line-height:1.55}
        .g-numbered li::before{content:counter(steps);color:#0B93A6;font-weight:700;font-size:12px;min-width:18px;text-align:center;background:rgba(11,147,166,.12);border-radius:4px;padding:1px 5px;flex-shrink:0}
        .g-dont-inline{margin-top:4px}
        .g-dont-label{font-size:11px;font-weight:700;color:rgba(255,108,71,.7);letter-spacing:.5px;margin-bottom:8px}
        .g-dont-items{display:flex;flex-wrap:wrap;gap:8px}
        .g-dont-chip{background:rgba(255,100,60,.05);color:rgba(255,140,120,.8);border:1px solid rgba(255,100,60,.15);border-radius:20px;padding:5px 12px;font-size:12px}
        .g-info-note{background:rgba(11,147,166,.06);border-right:3px solid rgba(11,147,166,.5);border-radius:0 10px 10px 0;padding:12px 16px;font-size:13px;color:#8acad8;line-height:1.6;margin-top:14px}
        .g-important-note{background:rgba(201,122,46,.05);border-right:3px solid rgba(201,122,46,.4);border-radius:0 10px 10px 0;padding:12px 16px;font-size:13px;color:#C97A2E;line-height:1.6;margin-top:14px}
        .g-warn-full{background:rgba(255,100,60,.04);border:1px solid rgba(255,100,60,.18);border-radius:12px;padding:18px;margin-bottom:14px}
        .g-warn-full-label{font-size:11px;font-weight:700;color:#ff6c47;letter-spacing:.5px;margin-bottom:14px}
        .g-warn-signs-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
        .g-warn-sign{background:rgba(255,100,60,.05);border:1px solid rgba(255,100,60,.12);border-radius:8px;padding:12px}
        .g-sign-name{font-size:13px;font-weight:700;color:rgba(255,160,140,.85);margin-bottom:4px}
        .g-sign-desc{font-size:11px;color:rgba(255,180,160,.5);line-height:1.4}
        .g-mistakes{display:flex;flex-direction:column;gap:10px}
        .g-mistake{background:rgba(10,22,40,.5);border:1px solid rgba(255,100,60,.1);border-radius:12px;padding:16px 18px}
        .g-mistake-title{font-size:14px;font-weight:700;color:rgba(255,160,140,.8);margin-bottom:6px}
        .g-mistake-title::before{content:"✕  ";color:rgba(255,100,60,.5)}
        .g-mistake-why{font-size:13px;color:#8aa0b0;line-height:1.6}
        .g-send-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px}
        .g-send-card{border-radius:12px;padding:16px}
        .g-send-visual{background:rgba(11,147,166,.06);border:1px solid rgba(11,147,166,.2)}
        .g-send-info{background:rgba(201,122,46,.04);border:1px solid rgba(201,122,46,.15)}
        .g-send-behavior{background:rgba(120,160,200,.05);border:1px solid rgba(120,160,200,.15)}
        .g-send-card-title{font-size:12px;font-weight:700;color:#0B93A6;letter-spacing:.5px;margin-bottom:10px}
        .g-send-info .g-send-card-title{color:rgba(201,122,46,.7)}
        .g-send-behavior .g-send-card-title{color:#8aaac8}
        .g-send-list-inner{list-style:none;display:flex;flex-direction:column;gap:7px}
        .g-send-list-inner li{font-size:12px;color:#8aa8bc;line-height:1.5;padding-right:12px;position:relative}
        .g-send-list-inner li::before{content:"—";position:absolute;right:0;color:rgba(11,147,166,.35)}
        .g-send-footer{background:rgba(11,147,166,.08);border:1px solid rgba(11,147,166,.2);border-radius:10px;padding:12px 16px;font-size:14px;color:#0B93A6;font-weight:600;text-align:center}
        .g-cta{background:linear-gradient(135deg,rgba(11,147,166,.08),rgba(10,22,40,.8));border:1px solid rgba(11,147,166,.25);border-radius:16px;padding:36px 28px;text-align:center}
        .g-cta h2{font-size:22px;font-weight:800;color:#fff;margin-bottom:10px}
        .g-cta p{font-size:15px;color:#9ab5c8;margin-bottom:6px}
        @media(max-width:640px){
          .g-bar{padding:0 12px}
          .g-brand{font-size:14px;letter-spacing:2px}
          .g-hero{padding:32px 0 24px}
          .g-hero h1{font-size:clamp(24px,7vw,32px)}
          .g-diag-grid{grid-template-columns:1fr}
          .g-two-col{grid-template-columns:1fr}
          .g-warn-signs-grid{grid-template-columns:1fr 1fr}
          .g-send-grid{grid-template-columns:1fr}
          .g-cause-header{gap:10px}
          .g-cause-num-big{font-size:24px}
          .g-cta{padding:24px 16px}
          .g-table{font-size:12px}
          .g-table td,.g-table th{padding:8px 10px}
        }
        @media(max-width:400px){.g-warn-signs-grid{grid-template-columns:1fr}}
      `}</style>
    </div>
  );
}
