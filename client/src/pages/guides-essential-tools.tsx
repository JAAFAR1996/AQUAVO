import { Download, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";

/*
  Sources — Researched May 2026:
  A: aquariumscience.org — filtration types, biological media, heater sizing
  A: aqueon.com — beginner equipment guide, tank setup essentials
  B: aquariumcoop.com — beginner fish keeping, equipment reviews, filter media
  B: fishkeepingworld.com — essential equipment lists, beginner mistakes
*/

const PDF_STATUS: "ready" | "draft" = "ready";
const PDF_URL = "/assets/guides/aquavo-essential-tools-guide.pdf";

export default function GuideEssentialTools() {
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
                <span className="hidden sm:inline">{t("guides-essential-tools.s1")}</span>
                <ExternalLink className="w-4 h-4" />
              </a>
              <a
                href={PDF_URL}
                download="aquavo-essential-tools-guide.pdf"
                className="flex items-center gap-1.5 bg-primary text-foreground hover:bg-[#0B93A6]/85 text-xs sm:text-sm h-9 px-3 sm:px-4 rounded-full font-bold transition-colors"
              >
                <span>{t("guides-essential-tools.s2")}</span>
                <Download className="w-4 h-4" />
              </a>
            </>
          ) : (
            <span className="g-btn-off">{t("guides-essential-tools.s3")}</span>
          )}
        </div>
      </header>

      <main className="g-main">

        {/* ── Hero ── */}
        <section className="g-hero">
          <span className="g-badge">{t("guides-essential-tools.s4")}</span>
          <h1>{t("guides-essential-tools.s5")}</h1>
          <p className="g-sub">{t("guides-essential-tools.s6")}</p>
          <p className="g-intro">
            {t("guides-essential-tools.s7")}
          </p>
          <div className="g-meta-row">
            <span>{t("guides-essential-tools.s8")}</span>
            <span>{t("guides-essential-tools.s9")}</span>
            <span className={`g-pdf-tag ${pdfReady ? "g-ready" : "g-draft"}`}>
              PDF: {pdfReady ? t("guides-essential-tools.s10") : t("guides-essential-tools.s11")}
            </span>
          </div>
          <p className="g-disclaimer">
            {t("guides-essential-tools.s12")}
          </p>
        </section>

        {/* ── شنو يعني أدوات أساسية ── */}
        <section className="g-section">
          <h2 className="g-title">{t("guides-essential-tools.s13")}</h2>
          <p className="g-section-intro">
            {t("guides-essential-tools.s14")}
          </p>
          <div className="g-two-col">
            <div className="g-col-box g-warn-box">
              <div className="g-col-label">{t("guides-essential-tools.s15")}</div>
              <ul className="g-simple-list">
                <li>{t("guides-essential-tools.s16")}</li>
                <li>{t("guides-essential-tools.s17")}</li>
                <li>{t("guides-essential-tools.s18")}</li>
                <li>{t("guides-essential-tools.s19")}</li>
                <li>{t("guides-essential-tools.s20")}</li>
              </ul>
            </div>
            <div className="g-col-box g-safe-box">
              <div className="g-col-label">{t("guides-essential-tools.s21")}</div>
              <ul className="g-simple-list">
                <li>{t("guides-essential-tools.s22")}</li>
                <li>{t("guides-essential-tools.s23")}</li>
                <li>{t("guides-essential-tools.s24")}</li>
                <li>{t("guides-essential-tools.s25")}</li>
                <li>{t("guides-essential-tools.s26")}</li>
              </ul>
            </div>
          </div>
          <div className="g-important-note">
            {t("guides-essential-tools.s27")}
          </div>
        </section>

        {/* ── الفلتر ── */}
        <section className="g-section">
          <div className="g-cause-header">
            <span className="g-cause-num-big">01</span>
            <h2 className="g-title g-title-inline">{t("guides-essential-tools.s28")}</h2>
          </div>
          <div className="g-tool-priority g-priority-must">{t("guides-essential-tools.s29")}</div>
          <div className="g-cause-block">
            <h3 className="g-cause-sub">{t("guides-essential-tools.s30")}</h3>
            <p>
              {t("guides-essential-tools.s31")}
            </p>
            <p style={{ marginTop: "10px" }}>
              {t("guides-essential-tools.s32")}
            </p>
          </div>
          <div className="g-two-col">
            <div className="g-col-box g-safe-box">
              <div className="g-col-label">{t("guides-essential-tools.s33")}</div>
              <ul className="g-simple-list">
                <li>{t("guides-essential-tools.s34")}</li>
                <li>{t("guides-essential-tools.s35")}</li>
                <li>{t("guides-essential-tools.s36")}</li>
              </ul>
            </div>
            <div className="g-col-box g-warn-box">
              <div className="g-col-label">{t("guides-essential-tools.s37")}</div>
              <ul className="g-simple-list">
                <li>{t("guides-essential-tools.s38")}</li>
                <li>{t("guides-essential-tools.s39")}</li>
                <li>{t("guides-essential-tools.s40")}</li>
                <li>{t("guides-essential-tools.s41")}</li>
              </ul>
            </div>
          </div>
          <div className="g-action-box">
            <div className="g-action-label">{t("guides-essential-tools.s42")}</div>
            <ol className="g-numbered">
              <li>{t("guides-essential-tools.s43")}</li>
              <li>{t("guides-essential-tools.s44")}</li>
              <li>{t("guides-essential-tools.s45")}</li>
              <li>{t("guides-essential-tools.s46")}</li>
            </ol>
          </div>
        </section>

        {/* ── الهيتر ── */}
        <section className="g-section">
          <div className="g-cause-header">
            <span className="g-cause-num-big">02</span>
            <h2 className="g-title g-title-inline">{t("guides-essential-tools.s47")}</h2>
          </div>
          <div className="g-tool-priority g-priority-must">{t("guides-essential-tools.s48")}</div>
          <div className="g-cause-block">
            <h3 className="g-cause-sub">{t("guides-essential-tools.s49")}</h3>
            <p>
              {t("guides-essential-tools.s50")}
            </p>
          </div>
          <div className="g-two-col">
            <div className="g-col-box g-safe-box">
              <div className="g-col-label">{t("guides-essential-tools.s51")}</div>
              <ul className="g-simple-list">
                <li>{t("guides-essential-tools.s52")}</li>
                <li>{t("guides-essential-tools.s53")}</li>
                <li>{t("guides-essential-tools.s54")}</li>
                <li>{t("guides-essential-tools.s55")}</li>
              </ul>
            </div>
            <div className="g-col-box g-warn-box">
              <div className="g-col-label">{t("guides-essential-tools.s56")}</div>
              <ul className="g-simple-list">
                <li>{t("guides-essential-tools.s57")}</li>
                <li>{t("guides-essential-tools.s58")}</li>
                <li>{t("guides-essential-tools.s59")}</li>
                <li>{t("guides-essential-tools.s60")}</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── مزيل الكلور ── */}
        <section className="g-section">
          <div className="g-cause-header">
            <span className="g-cause-num-big">03</span>
            <h2 className="g-title g-title-inline">{t("guides-essential-tools.s61")}</h2>
          </div>
          <div className="g-tool-priority g-priority-must">{t("guides-essential-tools.s62")}</div>
          <div className="g-cause-block">
            <h3 className="g-cause-sub">{t("guides-essential-tools.s63")}</h3>
            <p>
              {t("guides-essential-tools.s64")}
            </p>
          </div>
          <div className="g-info-note">
            {t("guides-essential-tools.s65")}
          </div>
        </section>

        {/* ── كيت الفحص ── */}
        <section className="g-section">
          <div className="g-cause-header">
            <span className="g-cause-num-big">04</span>
            <h2 className="g-title g-title-inline">{t("guides-essential-tools.s19")}</h2>
          </div>
          <div className="g-tool-priority g-priority-must">{t("guides-essential-tools.s66")}</div>
          <div className="g-cause-block">
            <h3 className="g-cause-sub">{t("guides-essential-tools.s63")}</h3>
            <p>
              {t("guides-essential-tools.s67")}
            </p>
          </div>
          <div className="g-two-col">
            <div className="g-col-box g-safe-box">
              <div className="g-col-label">{t("guides-essential-tools.s68")}</div>
              <ul className="g-simple-list">
                <li>{t("guides-essential-tools.s69")}</li>
                <li>{t("guides-essential-tools.s70")}</li>
                <li>{t("guides-essential-tools.s71")}</li>
                <li>{t("guides-essential-tools.s72")}</li>
              </ul>
            </div>
            <div className="g-col-box g-warn-box">
              <div className="g-col-label">{t("guides-essential-tools.s73")}</div>
              <ul className="g-simple-list">
                <li>{t("guides-essential-tools.s74")}</li>
                <li>{t("guides-essential-tools.s75")}</li>
                <li>{t("guides-essential-tools.s76")}</li>
                <li>{t("guides-essential-tools.s77")}</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── شبكة وسيفون ── */}
        <section className="g-section">
          <div className="g-cause-header">
            <span className="g-cause-num-big">05</span>
            <h2 className="g-title g-title-inline">{t("guides-essential-tools.s78")}</h2>
          </div>
          <div className="g-tool-priority g-priority-good">{t("guides-essential-tools.s79")}</div>
          <div className="g-cause-block">
            <h3 className="g-cause-sub">{t("guides-essential-tools.s80")}</h3>
            <p>
              {t("guides-essential-tools.s81")}
            </p>
          </div>
          <div className="g-action-box">
            <div className="g-action-label">{t("guides-essential-tools.s82")}</div>
            <ol className="g-numbered">
              <li>{t("guides-essential-tools.s83")}</li>
              <li>{t("guides-essential-tools.s84")}</li>
              <li>{t("guides-essential-tools.s85")}</li>
              <li>{t("guides-essential-tools.s86")}</li>
            </ol>
          </div>
        </section>

        {/* ── الإضاءة ── */}
        <section className="g-section">
          <div className="g-cause-header">
            <span className="g-cause-num-big">06</span>
            <h2 className="g-title g-title-inline">{t("guides-essential-tools.s87")}</h2>
          </div>
          <div className="g-tool-priority g-priority-good">{t("guides-essential-tools.s88")}</div>
          <div className="g-cause-block">
            <h3 className="g-cause-sub">{t("guides-essential-tools.s89")}</h3>
            <p>
              {t("guides-essential-tools.s90")}
            </p>
          </div>
          <div className="g-two-col">
            <div className="g-col-box g-safe-box">
              <div className="g-col-label">{t("guides-essential-tools.s91")}</div>
              <ul className="g-simple-list">
                <li>{t("guides-essential-tools.s92")}</li>
                <li>{t("guides-essential-tools.s93")}</li>
                <li>{t("guides-essential-tools.s94")}</li>
                <li>{t("guides-essential-tools.s95")}</li>
              </ul>
            </div>
            <div className="g-col-box g-warn-box">
              <div className="g-col-label">{t("guides-essential-tools.s37")}</div>
              <ul className="g-simple-list">
                <li>{t("guides-essential-tools.s96")}</li>
                <li>{t("guides-essential-tools.s97")}</li>
                <li>{t("guides-essential-tools.s98")}</li>
                <li>{t("guides-essential-tools.s99")}</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── الأكل ── */}
        <section className="g-section">
          <div className="g-cause-header">
            <span className="g-cause-num-big">07</span>
            <h2 className="g-title g-title-inline">{t("guides-essential-tools.s100")}</h2>
          </div>
          <div className="g-tool-priority g-priority-must">{t("guides-essential-tools.s101")}</div>
          <div className="g-cause-block">
            <h3 className="g-cause-sub">{t("guides-essential-tools.s102")}</h3>
            <p>
              {t("guides-essential-tools.s103")}
            </p>
          </div>
          <div className="g-action-box">
            <div className="g-action-label">{t("guides-essential-tools.s104")}</div>
            <ol className="g-numbered">
              <li>{t("guides-essential-tools.s105")}</li>
              <li>{t("guides-essential-tools.s106")}</li>
              <li>{t("guides-essential-tools.s107")}</li>
              <li>{t("guides-essential-tools.s108")}</li>
            </ol>
          </div>
          <div className="g-dont-inline">
            <div className="g-dont-label">{t("guides-essential-tools.s109")}</div>
            <div className="g-dont-items">
              <span className="g-dont-chip">{t("guides-essential-tools.s110")}</span>
              <span className="g-dont-chip">{t("guides-essential-tools.s111")}</span>
              <span className="g-dont-chip">{t("guides-essential-tools.s112")}</span>
            </div>
          </div>
        </section>

        {/* ── الميديا ── */}
        <section className="g-section">
          <div className="g-cause-header">
            <span className="g-cause-num-big">08</span>
            <h2 className="g-title g-title-inline">{t("guides-essential-tools.s113")}</h2>
          </div>
          <div className="g-tool-priority g-priority-good">{t("guides-essential-tools.s114")}</div>
          <div className="g-cause-block">
            <h3 className="g-cause-sub">{t("guides-essential-tools.s115")}</h3>
            <p>
              {t("guides-essential-tools.s116")}
            </p>
            <p style={{ marginTop: "10px" }}>
              {t("guides-essential-tools.s117")}
            </p>
          </div>
          <div className="g-info-note">
            {t("guides-essential-tools.s118")}
          </div>
        </section>

        {/* ── شنو تشتري أولاً ── */}
        <section className="g-section">
          <h2 className="g-title">{t("guides-essential-tools.s119")}</h2>
          <p className="g-section-intro">
            {t("guides-essential-tools.s120")}
          </p>
          <div className="g-mistakes">
            <div className="g-mistake g-check-item">
              <div className="g-mistake-title g-check-title">{t("guides-essential-tools.s121")}</div>
              <div className="g-mistake-why">{t("guides-essential-tools.s122")}</div>
            </div>
            <div className="g-mistake g-check-item">
              <div className="g-mistake-title g-check-title">{t("guides-essential-tools.s123")}</div>
              <div className="g-mistake-why">{t("guides-essential-tools.s124")}</div>
            </div>
            <div className="g-mistake g-check-item">
              <div className="g-mistake-title g-check-title">{t("guides-essential-tools.s125")}</div>
              <div className="g-mistake-why">{t("guides-essential-tools.s126")}</div>
            </div>
            <div className="g-mistake">
              <div className="g-mistake-title">{t("guides-essential-tools.s127")}</div>
              <div className="g-mistake-why">{t("guides-essential-tools.s128")}</div>
            </div>
          </div>
        </section>

        {/* ── Checklist ── */}
        <section className="g-section">
          <h2 className="g-title">{t("guides-essential-tools.s129")}</h2>
          <div className="g-send-grid">
            <div className="g-send-card g-send-visual">
              <div className="g-send-card-title">{t("guides-essential-tools.s130")}</div>
              <ul className="g-send-list-inner">
                <li>{t("guides-essential-tools.s131")}</li>
                <li>{t("guides-essential-tools.s132")}</li>
                <li>{t("guides-essential-tools.s133")}</li>
                <li>{t("guides-essential-tools.s134")}</li>
                <li>{t("guides-essential-tools.s135")}</li>
              </ul>
            </div>
            <div className="g-send-card g-send-info">
              <div className="g-send-card-title">{t("guides-essential-tools.s136")}</div>
              <ul className="g-send-list-inner">
                <li>{t("guides-essential-tools.s137")}</li>
                <li>{t("guides-essential-tools.s138")}</li>
                <li>{t("guides-essential-tools.s139")}</li>
                <li>{t("guides-essential-tools.s140")}</li>
                <li>{t("guides-essential-tools.s141")}</li>
              </ul>
            </div>
            <div className="g-send-card g-send-behavior">
              <div className="g-send-card-title">{t("guides-essential-tools.s142")}</div>
              <ul className="g-send-list-inner">
                <li>{t("guides-essential-tools.s143")}</li>
                <li>{t("guides-essential-tools.s144")}</li>
                <li>{t("guides-essential-tools.s145")}</li>
                <li>{t("guides-essential-tools.s146")}</li>
                <li>{t("guides-essential-tools.s147")}</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="g-cta">
          <h2>{t("guides-essential-tools.s148")}</h2>
          <p>{t("guides-essential-tools.s149")}</p>
          <p>{t("guides-essential-tools.s150")}</p>
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
        .g-hero h1{font-size:clamp(26px,5vw,40px);font-weight:800;color:#fff;line-height:1.25;margin-bottom:10px}
        .g-sub{font-size:17px;color:#9ab5c8;margin-bottom:12px;font-weight:500}
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
        .g-tool-priority{display:inline-block;border-radius:6px;padding:4px 12px;font-size:12px;font-weight:700;letter-spacing:.4px;margin-bottom:14px}
        .g-priority-must{background:rgba(255,80,60,.08);color:rgba(255,100,80,.8);border:1px solid rgba(255,80,60,.2)}
        .g-priority-good{background:rgba(201,122,46,.07);color:rgba(214,148,74,.8);border:1px solid rgba(214,148,74,.2)}
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
        .g-send-behavior{background:rgba(120,160,200,.05);border:1px solid rgba(120,160,200,.15)}
        .g-send-card-title{font-size:12px;font-weight:700;color:#0B93A6;letter-spacing:.5px;margin-bottom:10px}
        .g-send-info .g-send-card-title{color:rgba(201,122,46,.7)}
        .g-send-behavior .g-send-card-title{color:#8aaac8}
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
          .g-hero h1{font-size:clamp(22px,6.5vw,32px)}
          .g-two-col{grid-template-columns:1fr}
          .g-send-grid{grid-template-columns:1fr}
          .g-cause-header{gap:10px}
          .g-cause-num-big{font-size:24px}
          .g-cta{padding:24px 16px}
        }
      `}</style>
    </div>
  );
}
