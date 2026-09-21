import { Download, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";

/*
  Sources — Researched May 2026:
  A: aquariumscience.org — nitrogen cycle, ammonia/nitrite toxicity, biological filtration
  A: aqueon.com — water quality, water changes, filtration truth vs myth
  B: aquariumcoop.com — water testing, common beginner mistakes, tank cycling
  B: fishkeepingworld.com — water chemistry, tank myths debunked
*/

const PDF_STATUS: "ready" | "draft" = "ready";
const PDF_URL = "/assets/guides/aquavo-water-myths-guide.pdf";

export default function GuideWaterMyths() {
  const { t } = useTranslation("guides");
  const pdfReady = PDF_STATUS === "ready";
  return (
    <div className="g-wrap">

      <header className="g-bar">
        <a href="/" className="g-brand">AQUAVO</a>
        <div className="g-bar-actions">
          {pdfReady ? (
            <>
              <a
                href={PDF_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[#E8EDF2] border border-primary/45 hover:bg-[#0B93A6]/10 text-xs sm:text-sm h-9 px-3 rounded-full font-bold transition-colors"
              >
                <span className="hidden sm:inline">{t("guides-water-myths.s1")}</span>
                <ExternalLink className="w-4 h-4" />
              </a>
              <a
                href={PDF_URL}
                download="aquavo-water-myths-guide.pdf"
                className="flex items-center gap-1.5 bg-primary text-foreground hover:bg-[#0B93A6]/85 text-xs sm:text-sm h-9 px-3 sm:px-4 rounded-full font-bold transition-colors"
              >
                <span>{t("guides-water-myths.s2")}</span>
                <Download className="w-4 h-4" />
              </a>
            </>
          ) : (
            <span className="g-btn-off">{t("guides-water-myths.s3")}</span>
          )}
        </div>
      </header>

      <main className="g-main">

        {/* ── Hero ── */}
        <section className="g-hero">
          <span className="g-badge">{t("guides-water-myths.s4")}</span>
          <h1>{t("guides-water-myths.s5")}</h1>
          <p className="g-sub">{t("guides-water-myths.s6")}</p>
          <p className="g-intro">
            {t("guides-water-myths.s7")}
          </p>
          <div className="g-meta-row">
            <span>{t("guides-water-myths.s8")}</span>
            <span>{t("guides-water-myths.s9")}</span>
            <span className={`g-pdf-tag ${pdfReady ? "g-ready" : "g-draft"}`}>
              PDF: {pdfReady ? t("guides-water-myths.s10") : t("guides-water-myths.s11")}
            </span>
          </div>
          <p className="g-disclaimer">
            {t("guides-water-myths.s12")}
          </p>
        </section>

        {/* ── Section: ليش الخرافات خطرة ── */}
        <section className="g-section">
          <h2 className="g-title">{t("guides-water-myths.s13")}</h2>
          <p className="g-section-intro">
            {t("guides-water-myths.s14")}
          </p>
          <div className="g-two-col">
            <div className="g-col-box g-warn-box">
              <div className="g-col-label">{t("guides-water-myths.s15")}</div>
              <ul className="g-simple-list">
                <li>{t("guides-water-myths.s16")}</li>
                <li>{t("guides-water-myths.s17")}</li>
                <li>{t("guides-water-myths.s18")}</li>
                <li>{t("guides-water-myths.s19")}</li>
                <li>{t("guides-water-myths.s20")}</li>
              </ul>
            </div>
            <div className="g-col-box g-safe-box">
              <div className="g-col-label">{t("guides-water-myths.s21")}</div>
              <ul className="g-simple-list">
                <li>{t("guides-water-myths.s22")}</li>
                <li>{t("guides-water-myths.s23")}</li>
                <li>{t("guides-water-myths.s24")}</li>
                <li>{t("guides-water-myths.s25")}</li>
                <li>{t("guides-water-myths.s26")}</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── خرافة ١ ── */}
        <section className="g-section">
          <div className="g-cause-header">
            <span className="g-cause-num-big">01</span>
            <h2 className="g-title g-title-inline">{t("guides-water-myths.s27")}</h2>
          </div>
          <div className="g-myth-badge g-myth-false">{t("guides-water-myths.s28")}</div>
          <div className="g-cause-block">
            <h3 className="g-cause-sub">{t("guides-water-myths.s29")}</h3>
            <p>
              {t("guides-water-myths.s30")}
            </p>
          </div>
          <div className="g-two-col">
            <div className="g-col-box g-warn-box">
              <div className="g-col-label">{t("guides-water-myths.s31")}</div>
              <ul className="g-simple-list">
                <li>{t("guides-water-myths.s32")}</li>
                <li>{t("guides-water-myths.s33")}</li>
                <li>{t("guides-water-myths.s34")}</li>
                <li>{t("guides-water-myths.s35")}</li>
                <li>{t("guides-water-myths.s36")}</li>
              </ul>
            </div>
            <div className="g-col-box g-safe-box">
              <div className="g-col-label">{t("guides-water-myths.s37")}</div>
              <ul className="g-simple-list">
                <li>{t("guides-water-myths.s38")}</li>
                <li>{t("guides-water-myths.s39")}</li>
                <li>{t("guides-water-myths.s40")}</li>
                <li>{t("guides-water-myths.s41")}</li>
                <li>{t("guides-water-myths.s42")}</li>
              </ul>
            </div>
          </div>
          <div className="g-important-note">
            {t("guides-water-myths.s43")}
          </div>
        </section>

        {/* ── خرافة ٢ ── */}
        <section className="g-section">
          <div className="g-cause-header">
            <span className="g-cause-num-big">02</span>
            <h2 className="g-title g-title-inline">{t("guides-water-myths.s44")}</h2>
          </div>
          <div className="g-myth-badge g-myth-false">{t("guides-water-myths.s45")}</div>
          <div className="g-cause-block">
            <h3 className="g-cause-sub">{t("guides-water-myths.s29")}</h3>
            <p>
              {t("guides-water-myths.s46")}
            </p>
            <p style={{ marginTop: "10px" }}>
              {t("guides-water-myths.s47")}
            </p>
          </div>
          <div className="g-action-box">
            <div className="g-action-label">{t("guides-water-myths.s48")}</div>
            <ol className="g-numbered">
              <li>{t("guides-water-myths.s49")}</li>
              <li>{t("guides-water-myths.s50")}</li>
              <li>{t("guides-water-myths.s51")}</li>
              <li>{t("guides-water-myths.s52")}</li>
              <li>{t("guides-water-myths.s53")}</li>
            </ol>
          </div>
          <div className="g-dont-inline">
            <div className="g-dont-label">{t("guides-water-myths.s54")}</div>
            <div className="g-dont-items">
              <span className="g-dont-chip">{t("guides-water-myths.s55")}</span>
              <span className="g-dont-chip">{t("guides-water-myths.s56")}</span>
              <span className="g-dont-chip">{t("guides-water-myths.s57")}</span>
            </div>
          </div>
        </section>

        {/* ── خرافة ٣ ── */}
        <section className="g-section">
          <div className="g-cause-header">
            <span className="g-cause-num-big">03</span>
            <h2 className="g-title g-title-inline">{t("guides-water-myths.s58")}</h2>
          </div>
          <div className="g-myth-badge g-myth-false">{t("guides-water-myths.s59")}</div>
          <div className="g-cause-block">
            <h3 className="g-cause-sub">{t("guides-water-myths.s29")}</h3>
            <p>
              {t("guides-water-myths.s60")}
            </p>
          </div>
          <div className="g-info-note">
            {t("guides-water-myths.s61")}
          </div>
          <div className="g-two-col">
            <div className="g-col-box g-warn-box">
              <div className="g-col-label">{t("guides-water-myths.s62")}</div>
              <ul className="g-simple-list">
                <li>{t("guides-water-myths.s63")}</li>
                <li>{t("guides-water-myths.s64")}</li>
                <li>{t("guides-water-myths.s65")}</li>
                <li>{t("guides-water-myths.s66")}</li>
              </ul>
            </div>
            <div className="g-col-box g-safe-box">
              <div className="g-col-label">{t("guides-water-myths.s67")}</div>
              <ul className="g-simple-list">
                <li>{t("guides-water-myths.s68")}</li>
                <li>{t("guides-water-myths.s69")}</li>
                <li>{t("guides-water-myths.s70")}</li>
                <li>{t("guides-water-myths.s71")}</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── خرافة ٤ ── */}
        <section className="g-section">
          <div className="g-cause-header">
            <span className="g-cause-num-big">04</span>
            <h2 className="g-title g-title-inline">{t("guides-water-myths.s72")}</h2>
          </div>
          <div className="g-myth-badge g-myth-partial">{t("guides-water-myths.s73")}</div>
          <div className="g-cause-block">
            <h3 className="g-cause-sub">{t("guides-water-myths.s29")}</h3>
            <p>
              {t("guides-water-myths.s74")}
            </p>
            <p style={{ marginTop: "10px" }}>
              {t("guides-water-myths.s75")}
            </p>
          </div>
          <div className="g-two-col">
            <div className="g-col-box g-safe-box">
              <div className="g-col-label">{t("guides-water-myths.s76")}</div>
              <ul className="g-simple-list">
                <li>{t("guides-water-myths.s77")}</li>
                <li>{t("guides-water-myths.s78")}</li>
                <li>{t("guides-water-myths.s79")}</li>
              </ul>
            </div>
            <div className="g-col-box g-warn-box">
              <div className="g-col-label">{t("guides-water-myths.s80")}</div>
              <ul className="g-simple-list">
                <li>{t("guides-water-myths.s81")}</li>
                <li>{t("guides-water-myths.s82")}</li>
                <li>{t("guides-water-myths.s83")}</li>
                <li>{t("guides-water-myths.s84")}</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── خرافة ٥ ── */}
        <section className="g-section">
          <div className="g-cause-header">
            <span className="g-cause-num-big">05</span>
            <h2 className="g-title g-title-inline">{t("guides-water-myths.s85")}</h2>
          </div>
          <div className="g-myth-badge g-myth-false">{t("guides-water-myths.s86")}</div>
          <div className="g-cause-block">
            <h3 className="g-cause-sub">{t("guides-water-myths.s29")}</h3>
            <p>
              {t("guides-water-myths.s87")}
            </p>
          </div>
          <div className="g-diag-grid">
            <div className="g-diag g-safe">
              <div className="g-diag-label">{t("guides-water-myths.s88")}</div>
              <ul className="g-diag-list">
                <li>{t("guides-water-myths.s89")}</li>
                <li>{t("guides-water-myths.s90")}</li>
                <li>{t("guides-water-myths.s91")}</li>
              </ul>
            </div>
            <div className="g-diag g-warn">
              <div className="g-diag-label">{t("guides-water-myths.s92")}</div>
              <ul className="g-diag-list">
                <li>{t("guides-water-myths.s93")}</li>
                <li>{t("guides-water-myths.s94")}</li>
                <li>{t("guides-water-myths.s95")}</li>
                <li>{t("guides-water-myths.s96")}</li>
              </ul>
            </div>
          </div>
          <div className="g-action-box">
            <div className="g-action-label">{t("guides-water-myths.s97")}</div>
            <ol className="g-numbered">
              <li>{t("guides-water-myths.s98")}</li>
              <li>{t("guides-water-myths.s99")}</li>
              <li>{t("guides-water-myths.s100")}</li>
              <li>{t("guides-water-myths.s101")}</li>
              <li>{t("guides-water-myths.s102")}</li>
            </ol>
          </div>
        </section>

        {/* ── خرافة ٦ ── */}
        <section className="g-section">
          <div className="g-cause-header">
            <span className="g-cause-num-big">06</span>
            <h2 className="g-title g-title-inline">{t("guides-water-myths.s103")}</h2>
          </div>
          <div className="g-myth-badge g-myth-false">{t("guides-water-myths.s104")}</div>
          <div className="g-cause-block">
            <h3 className="g-cause-sub">{t("guides-water-myths.s29")}</h3>
            <p>
              {t("guides-water-myths.s105")}
            </p>
          </div>
          <div className="g-two-col">
            <div className="g-col-box g-warn-box">
              <div className="g-col-label">{t("guides-water-myths.s106")}</div>
              <ul className="g-simple-list">
                <li>{t("guides-water-myths.s107")}</li>
                <li>{t("guides-water-myths.s108")}</li>
                <li>{t("guides-water-myths.s109")}</li>
                <li>{t("guides-water-myths.s110")}</li>
                <li>{t("guides-water-myths.s111")}</li>
              </ul>
            </div>
            <div className="g-col-box g-safe-box">
              <div className="g-col-label">{t("guides-water-myths.s112")}</div>
              <ul className="g-simple-list">
                <li>{t("guides-water-myths.s113")}</li>
                <li>{t("guides-water-myths.s114")}</li>
                <li>{t("guides-water-myths.s115")}</li>
                <li>{t("guides-water-myths.s116")}</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── شنو تراقب فعلياً ── */}
        <section className="g-section">
          <h2 className="g-title">{t("guides-water-myths.s117")}</h2>
          <p className="g-section-intro">
            {t("guides-water-myths.s118")}
          </p>
          <div className="g-send-grid">
            <div className="g-send-card g-send-visual">
              <div className="g-send-card-title">{t("guides-water-myths.s119")}</div>
              <ul className="g-send-list-inner">
                <li>{t("guides-water-myths.s120")}</li>
                <li>{t("guides-water-myths.s121")}</li>
                <li>{t("guides-water-myths.s122")}</li>
                <li>{t("guides-water-myths.s123")}</li>
              </ul>
            </div>
            <div className="g-send-card g-send-info">
              <div className="g-send-card-title">{t("guides-water-myths.s124")}</div>
              <ul className="g-send-list-inner">
                <li>{t("guides-water-myths.s125")}</li>
                <li>{t("guides-water-myths.s126")}</li>
                <li>{t("guides-water-myths.s127")}</li>
                <li>{t("guides-water-myths.s128")}</li>
              </ul>
            </div>
            <div className="g-send-card g-send-behavior">
              <div className="g-send-card-title">{t("guides-water-myths.s129")}</div>
              <ul className="g-send-list-inner">
                <li>{t("guides-water-myths.s130")}</li>
                <li>{t("guides-water-myths.s131")}</li>
                <li>{t("guides-water-myths.s132")}</li>
                <li>{t("guides-water-myths.s133")}</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── Checklist عملي ── */}
        <section className="g-section">
          <h2 className="g-title">{t("guides-water-myths.s134")}</h2>
          <p className="g-section-intro">
            {t("guides-water-myths.s135")}
          </p>
          <div className="g-mistakes">
            <div className="g-mistake g-check-item">
              <div className="g-mistake-title g-check-title">{t("guides-water-myths.s136")}</div>
              <div className="g-mistake-why">{t("guides-water-myths.s137")}</div>
            </div>
            <div className="g-mistake g-check-item">
              <div className="g-mistake-title g-check-title">{t("guides-water-myths.s138")}</div>
              <div className="g-mistake-why">{t("guides-water-myths.s139")}</div>
            </div>
            <div className="g-mistake g-check-item">
              <div className="g-mistake-title g-check-title">{t("guides-water-myths.s140")}</div>
              <div className="g-mistake-why">{t("guides-water-myths.s141")}</div>
            </div>
            <div className="g-mistake g-check-item">
              <div className="g-mistake-title g-check-title">{t("guides-water-myths.s142")}</div>
              <div className="g-mistake-why">{t("guides-water-myths.s143")}</div>
            </div>
            <div className="g-mistake g-check-item">
              <div className="g-mistake-title g-check-title">{t("guides-water-myths.s144")}</div>
              <div className="g-mistake-why">{t("guides-water-myths.s145")}</div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="g-cta">
          <h2>{t("guides-water-myths.s146")}</h2>
          <p>{t("guides-water-myths.s147")}</p>
          <p>{t("guides-water-myths.s148")}</p>
        </section>

      </main>

      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{background:#0B1E28}
        .g-wrap{min-height:100vh;background:#0B1E28;color:#e8edf5;direction:rtl;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;line-height:1.7}
        .g-bar{position:sticky;top:0;z-index:50;height:60px;background:rgba(1,6,17,.96);border-bottom:1px solid rgba(11,147,166,.3);display:flex;align-items:center;justify-content:space-between;padding:0 20px;backdrop-filter:blur(10px)}
        .g-brand{color:#0B93A6;font-weight:800;letter-spacing:4px;font-size:17px;text-decoration:none}
        .g-bar-actions{display:flex;gap:10px;align-items:center}
        .g-btn-off{background:rgba(11,147,166,.1);color:rgba(11,147,166,.45);padding:8px 16px;border-radius:999px;font-size:14px;font-weight:600;cursor:not-allowed;border:1px solid rgba(11,147,166,.15);white-space:nowrap}
        .g-main{max-width:760px;margin:0 auto;padding:0 16px 60px}
        .g-hero{padding:48px 0 36px;border-bottom:1px solid rgba(11,147,166,.15);margin-bottom:44px}
        .g-badge{display:inline-block;background:rgba(11,147,166,.12);color:#0B93A6;border:1px solid rgba(11,147,166,.3);border-radius:999px;padding:4px 14px;font-size:12px;font-weight:700;letter-spacing:.5px;margin-bottom:14px}
        .g-hero h1{font-size:clamp(28px,5.5vw,42px);font-weight:800;color:#fff;line-height:1.25;margin-bottom:10px}
        .g-sub{font-size:18px;color:#9ab5c8;margin-bottom:12px;font-weight:500}
        .g-intro{font-size:15px;color:#7a9ab0;max-width:620px;margin-bottom:18px;line-height:1.75}
        .g-meta-row{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}
        .g-meta-row span{font-size:12px;color:#6a8fa8;background:rgba(255,255,255,.04);padding:4px 10px;border-radius:6px}
        .g-pdf-tag{font-size:12px;padding:4px 10px;border-radius:6px;font-weight:600}
        .g-draft{background:rgba(201,122,46,.08);color:rgba(201,122,46,.6)}
        .g-ready{background:rgba(11,147,166,.12);color:#0B93A6}
        .g-disclaimer{font-size:12px;color:rgba(255,255,255,.28);border-right:2px solid rgba(255,255,255,.08);padding-right:10px;line-height:1.6}
        .g-section{margin-bottom:52px}
        .g-title{font-size:19px;font-weight:700;color:#0B93A6;margin-bottom:18px;padding-bottom:9px;border-bottom:1px solid rgba(11,147,166,.2)}
        .g-title.g-title-inline{border-bottom:none;padding-bottom:0;margin-bottom:0;font-size:18px}
        .g-section-intro{font-size:14px;color:#8aa8bc;margin-bottom:18px;line-height:1.75}
        .g-cause-header{display:flex;align-items:baseline;gap:14px;margin-bottom:12px;border-bottom:1px solid rgba(11,147,166,.2);padding-bottom:10px}
        .g-cause-num-big{font-size:32px;font-weight:900;color:rgba(11,147,166,.3);line-height:1;flex-shrink:0}
        .g-myth-badge{display:inline-block;border-radius:6px;padding:4px 12px;font-size:12px;font-weight:700;letter-spacing:.4px;margin-bottom:14px}
        .g-myth-false{background:rgba(255,80,60,.08);color:rgba(255,100,80,.8);border:1px solid rgba(255,80,60,.2)}
        .g-myth-partial{background:rgba(201,122,46,.07);color:rgba(214,148,74,.8);border:1px solid rgba(214,148,74,.2)}
        .g-cause-block{background:rgba(10,22,40,.5);border:1px solid rgba(11,147,166,.1);border-radius:12px;padding:18px 20px;margin-bottom:16px}
        .g-cause-sub{font-size:13px;font-weight:700;color:#0B93A6;letter-spacing:.5px;margin-bottom:8px}
        .g-cause-block p{font-size:14px;color:#9ab5c8;line-height:1.8}
        .g-two-col{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px}
        .g-col-box{border-radius:12px;padding:16px}
        .g-safe-box{background:rgba(11,147,166,.06);border:1px solid rgba(11,147,166,.2)}
        .g-warn-box{background:rgba(255,100,60,.05);border:1px solid rgba(255,100,60,.2)}
        .g-col-label{font-size:11px;font-weight:700;letter-spacing:.5px;margin-bottom:10px}
        .g-safe-box .g-col-label{color:#0B93A6}
        .g-warn-box .g-col-label{color:#ff6c47}
        .g-simple-list{list-style:none;display:flex;flex-direction:column;gap:7px}
        .g-simple-list li{font-size:13px;color:#b0c8d8;padding-right:14px;position:relative;line-height:1.5}
        .g-safe-box .g-simple-list li::before{content:"—";position:absolute;right:0;color:rgba(11,147,166,.6)}
        .g-warn-box .g-simple-list li::before{content:"—";position:absolute;right:0;color:rgba(255,108,71,.6)}
        .g-diag-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px}
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
        .g-action-box{background:rgba(10,22,40,.6);border:1px solid rgba(11,147,166,.18);border-radius:12px;padding:16px 20px;margin-bottom:12px}
        .g-action-label{font-size:11px;font-weight:700;color:#0B93A6;letter-spacing:.5px;margin-bottom:10px}
        .g-numbered{list-style:none;display:flex;flex-direction:column;gap:8px;counter-reset:steps}
        .g-numbered li{counter-increment:steps;display:flex;gap:12px;align-items:flex-start;font-size:13px;color:#b0c8d8;line-height:1.55}
        .g-numbered li::before{content:counter(steps);color:#0B93A6;font-weight:700;font-size:12px;min-width:18px;text-align:center;background:rgba(11,147,166,.12);border-radius:4px;padding:1px 5px;flex-shrink:0}
        .g-dont-inline{margin-top:4px}
        .g-dont-label{font-size:11px;font-weight:700;color:rgba(255,108,71,.7);letter-spacing:.5px;margin-bottom:8px}
        .g-dont-items{display:flex;flex-wrap:wrap;gap:8px}
        .g-dont-chip{background:rgba(255,100,60,.05);color:rgba(255,140,120,.8);border:1px solid rgba(255,100,60,.15);border-radius:20px;padding:5px 12px;font-size:12px}
        .g-info-note{background:rgba(11,147,166,.06);border-right:3px solid rgba(11,147,166,.5);border-radius:0 10px 10px 0;padding:12px 16px;font-size:13px;color:#8acad8;line-height:1.6;margin-bottom:14px}
        .g-important-note{background:rgba(201,122,46,.05);border-right:3px solid rgba(201,122,46,.4);border-radius:0 10px 10px 0;padding:12px 16px;font-size:13px;color:#C97A2E;line-height:1.6;margin-top:14px}
        .g-mistakes{display:flex;flex-direction:column;gap:10px}
        .g-mistake{background:rgba(10,22,40,.5);border:1px solid rgba(255,100,60,.1);border-radius:12px;padding:16px 18px}
        .g-check-item{border-color:rgba(11,147,166,.15)!important}
        .g-mistake-title{font-size:14px;font-weight:700;color:rgba(255,160,140,.8);margin-bottom:6px}
        .g-mistake-title::before{content:"✕  ";color:rgba(255,100,60,.5)}
        .g-check-title{color:rgba(11,147,166,.9)!important}
        .g-check-title::before{content:"✓  "!important;color:rgba(11,147,166,.6)!important}
        .g-mistake-why{font-size:13px;color:#8aa0b0;line-height:1.6}
        .g-send-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px}
        .g-send-card{border-radius:12px;padding:16px}
        .g-send-visual{background:rgba(11,147,166,.06);border:1px solid rgba(11,147,166,.2)}
        .g-send-info{background:rgba(201,122,46,.04);border:1px solid rgba(201,122,46,.15)}
        .g-send-behavior{background:rgba(255,100,60,.04);border:1px solid rgba(255,100,60,.15)}
        .g-send-card-title{font-size:12px;font-weight:700;color:#0B93A6;letter-spacing:.5px;margin-bottom:10px}
        .g-send-info .g-send-card-title{color:rgba(201,122,46,.7)}
        .g-send-behavior .g-send-card-title{color:#ff6c47}
        .g-send-list-inner{list-style:none;display:flex;flex-direction:column;gap:7px}
        .g-send-list-inner li{font-size:12px;color:#8aa8bc;line-height:1.5;padding-right:12px;position:relative}
        .g-send-list-inner li::before{content:"—";position:absolute;right:0;color:rgba(11,147,166,.35)}
        .g-cta{background:linear-gradient(135deg,rgba(11,147,166,.08),rgba(10,22,40,.8));border:1px solid rgba(11,147,166,.25);border-radius:16px;padding:36px 28px;text-align:center}
        .g-cta h2{font-size:22px;font-weight:800;color:#fff;margin-bottom:10px}
        .g-cta p{font-size:15px;color:#9ab5c8;margin-bottom:6px}
        @media(max-width:640px){
          .g-bar{padding:0 12px}
          .g-brand{font-size:14px;letter-spacing:2px}
          .g-hero{padding:32px 0 24px}
          .g-hero h1{font-size:clamp(24px,7vw,32px)}
          .g-diag-grid,.g-two-col{grid-template-columns:1fr}
          .g-send-grid{grid-template-columns:1fr}
          .g-cause-header{gap:10px}
          .g-cause-num-big{font-size:24px}
          .g-cta{padding:24px 16px}
        }
      `}</style>
    </div>
  );
}
