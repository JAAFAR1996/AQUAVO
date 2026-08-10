import { useEffect, type ReactNode } from 'react';
import { Images, MessageCircle, ShoppingBag } from 'lucide-react';
import { trackBioLinkClick } from '@/lib/analytics';
import { WHATSAPP_URL } from '@/lib/constants/shipping';

const WORKS_URL = 'https://instagram.com/aquavo_iq';
const CONTACT_URL = `${WHATSAPP_URL}?text=${encodeURIComponent('مرحبا، جيت من كارت AQUAVO وأريد أعرف أكثر عن المنتجات أو الخدمات.')}`;

function PlanToWaterVisual() {
  return (
    <div className="aq-qr-visual" aria-hidden="true">
      <div className="aq-qr-blueprint" />
      <div className="aq-qr-tank-outline">
        <span className="aq-qr-plan-label">AQUAVO / PLAN</span>
        <span className="aq-qr-system-label">SYSTEM</span>
      </div>
      <div className="aq-qr-water" />
      <div className="aq-qr-caustics" />
      <div className="aq-qr-waterline" />

      <span className="aq-qr-plant aq-qr-plant-1" />
      <span className="aq-qr-plant aq-qr-plant-2" />
      <span className="aq-qr-plant aq-qr-plant-3" />

      <span className="aq-qr-rock aq-qr-rock-1" />
      <span className="aq-qr-rock aq-qr-rock-2" />
      <span className="aq-qr-rock aq-qr-rock-3" />

      <span className="aq-qr-fish aq-qr-fish-1" />
      <span className="aq-qr-fish aq-qr-fish-2" />

      <span className="aq-qr-visual-caption">PLAN → WATER</span>
    </div>
  );
}

function ActionCard({
  id,
  href,
  title,
  subtitle,
  icon,
  primary = false,
  external = false,
}: {
  id: string;
  href: string;
  title: string;
  subtitle: string;
  icon: ReactNode;
  primary?: boolean;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      className={`aq-qr-action${primary ? ' aq-qr-action-primary' : ''}`}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      onClick={() => trackBioLinkClick(id)}
      aria-label={`${title} — ${subtitle}`}
    >
      <span className="aq-qr-action-copy">
        <strong>{title}</strong>
        <small>{subtitle}</small>
      </span>
      <span className="aq-qr-action-icon">{icon}</span>
    </a>
  );
}

export default function LinksPage() {
  useEffect(() => {
    document.title = 'AQUAVO | من القطعة إلى الحوض الكامل';
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', '#07161f');
  }, []);

  return (
    <main className="aq-qr-page" dir="rtl">
      <div className="aq-qr-noise" aria-hidden="true" />

      <div className="aq-qr-shell">
        <header className="aq-qr-brand" aria-label="AQUAVO">
          <img
            src="/assets/brand/AQUAVO-logo-full-color.svg"
            alt="AQUAVO"
            className="aq-qr-logo"
          />
        </header>

        <section className="aq-qr-intro" aria-labelledby="aq-qr-title">
          <p className="aq-qr-kicker">معدات • تصميم • تنفيذ • صيانة</p>
          <h1 id="aq-qr-title">من القطعة إلى الحوض الكامل.</h1>
          <p className="aq-qr-subtitle">حلول أحواض مائية للأفراد والأعمال في العراق</p>
        </section>

        <PlanToWaterVisual />

        <nav className="aq-qr-actions" aria-label="روابط AQUAVO الرئيسية">
          <ActionCard
            id="whatsapp"
            href={CONTACT_URL}
            title="تواصل معنا"
            subtitle="مشروع • صيانة • طلبات جملة"
            icon={<MessageCircle size={19} strokeWidth={1.8} />}
            primary
            external
          />

          <ActionCard
            id="works"
            href={WORKS_URL}
            title="شاهد أعمالنا"
            subtitle="تصاميم وتنفيذ"
            icon={<Images size={18} strokeWidth={1.7} />}
            external
          />

          <ActionCard
            id="shop"
            href="/products"
            title="المتجر"
            subtitle="معدات ومنتجات"
            icon={<ShoppingBag size={18} strokeWidth={1.7} />}
          />
        </nav>

        <p className="aq-qr-signature">AQUAVO · IRAQ</p>
      </div>

      <style>{` .aq-qr-page{--aq-bg:#07161f;--aq-panel:#0a1c25;--aq-cyan:#20a7b8;--aq-cyan-soft:#68d5dc;--aq-text:#f1f8fa;--aq-muted:#91a7af;min-height:100svh;width:100%;overflow:hidden;position:relative;background:radial-gradient(110% 58% at 50% -8%,rgba(32,167,184,0.17),transparent 54%),linear-gradient(180deg,#081a23 0%,var(--aq-bg) 56%,#050e13 100%);color:var(--aq-text)}.aq-qr-noise{position:fixed;inset:0;pointer-events:none;opacity:0.025;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.7'/%3E%3C/svg%3E");z-index:0}.aq-qr-shell{position:relative;z-index:1;width:min(100%,430px);min-height:100svh;margin:0 auto;padding:28px 20px 24px;display:flex;flex-direction:column}.aq-qr-brand{min-height:36px;display:flex;align-items:center;justify-content:flex-start;direction:ltr}.aq-qr-logo{display:block;width:auto;height:34px;max-width:154px;object-fit:contain}.aq-qr-intro{margin-top:34px}.aq-qr-kicker{margin:0;color:var(--aq-cyan-soft);font-size:12px;line-height:1.7;font-weight:700;letter-spacing:0.01em}.aq-qr-intro h1{margin:8px 0 0;max-width:360px;color:var(--aq-text);font-size:clamp(38px,10.5vw,50px);line-height:1.12;font-weight:800;letter-spacing:-0.045em;text-wrap:balance}.aq-qr-subtitle{margin:10px 0 0;color:#adc0c7;font-size:14px;line-height:1.75;font-weight:500}.aq-qr-visual{position:relative;height:286px;margin-top:22px;overflow:hidden;isolation:isolate;border:1px solid rgba(255,255,255,0.11);border-radius:30px;background:var(--aq-panel);box-shadow:0 28px 72px rgba(0,0,0,0.32),inset 0 1px 0 rgba(255,255,255,0.06)}.aq-qr-visual::after{content:'';position:absolute;inset:0;z-index:9;pointer-events:none;border-radius:inherit;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.025),inset 0 -72px 94px rgba(0,0,0,0.28)}.aq-qr-blueprint{position:absolute;inset:0 0 42% 0;z-index:0;background:linear-gradient(rgba(104,213,220,0.055) 1px,transparent 1px),linear-gradient(90deg,rgba(104,213,220,0.055) 1px,transparent 1px),linear-gradient(180deg,#0b222c,#0a1d26);background-size:22px 22px,22px 22px,auto}.aq-qr-tank-outline{position:absolute;z-index:2;top:43px;right:39px;left:39px;height:126px;border:1px solid rgba(104,213,220,0.48);border-radius:5px}.aq-qr-tank-outline::before,.aq-qr-tank-outline::after{content:'';position:absolute;top:-12px;width:36px;border-top:1px solid rgba(104,213,220,0.38)}.aq-qr-tank-outline::before{left:0}.aq-qr-tank-outline::after{right:0}.aq-qr-plan-label,.aq-qr-system-label,.aq-qr-visual-caption{position:absolute;direction:ltr;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;text-transform:uppercase;letter-spacing:0.12em;white-space:nowrap}.aq-qr-plan-label{top:-31px;left:7px;color:rgba(104,213,220,0.78);font-size:9px}.aq-qr-system-label{top:42px;right:-30px;color:rgba(104,213,220,0.6);font-size:8px;transform:rotate(-90deg);transform-origin:right top}.aq-qr-water{position:absolute;z-index:1;right:0;bottom:0;left:0;height:59%;background:radial-gradient(100% 72% at 78% 7%,rgba(94,218,224,0.18),transparent 60%),radial-gradient(90% 74% at 18% 92%,rgba(15,128,146,0.22),transparent 65%),linear-gradient(180deg,#0c4b5a 0%,#0a313d 44%,#071c26 100%)}.aq-qr-waterline{position:absolute;z-index:4;top:40.6%;right:-4%;left:-4%;height:12px;border-top:1px solid rgba(108,229,234,0.9);border-radius:50%;filter:drop-shadow(0 0 8px rgba(32,167,184,0.55));transform:rotate(-1.4deg)}.aq-qr-caustics{position:absolute;z-index:2;inset:42% 0 0;opacity:0.25;background:radial-gradient(ellipse at 20% 20%,transparent 0 20%,rgba(183,255,255,0.15) 21% 24%,transparent 25% 100%),radial-gradient(ellipse at 70% 10%,transparent 0 17%,rgba(183,255,255,0.14) 18% 21%,transparent 22% 100%);background-size:120px 70px,160px 85px}.aq-qr-rock{position:absolute;z-index:5;bottom:-7px;display:block;background:#08171d;border:1px solid rgba(255,255,255,0.035);filter:drop-shadow(0 -12px 18px rgba(0,0,0,0.14))}.aq-qr-rock-1{left:18px;width:92px;height:46px;border-radius:48% 42% 16% 20%;transform:rotate(8deg)}.aq-qr-rock-2{left:90px;bottom:-17px;width:138px;height:55px;border-radius:48% 42% 16% 20%;transform:rotate(-4deg)}.aq-qr-rock-3{right:-6px;bottom:-11px;width:94px;height:49px;border-radius:48% 42% 16% 20%;transform:rotate(6deg)}.aq-qr-plant{position:absolute;z-index:4;bottom:17px;width:2px;display:block;background:#1d5960;border-radius:20px;transform-origin:bottom}.aq-qr-plant-1{left:56px;height:60px;transform:rotate(-17deg)}.aq-qr-plant-2{left:72px;height:72px;transform:rotate(11deg)}.aq-qr-plant-3{right:70px;height:48px;transform:rotate(19deg)}.aq-qr-fish{position:absolute;z-index:6;display:block;width:34px;height:14px;border-radius:60% 45% 45% 60%;background:linear-gradient(90deg,rgba(184,237,237,0.8),rgba(61,159,171,0.75));box-shadow:0 0 14px rgba(98,214,220,0.12)}.aq-qr-fish::after{content:'';position:absolute;top:2px;right:-9px;border-left:10px solid rgba(80,173,184,0.7);border-top:5px solid transparent;border-bottom:5px solid transparent}.aq-qr-fish-1{right:58px;top:190px;transform:scale(0.9)}.aq-qr-fish-2{left:104px;top:227px;opacity:0.62;transform:scale(0.6) rotate(2deg)}.aq-qr-visual-caption{z-index:7;left:18px;bottom:16px;color:rgba(207,241,243,0.62);font-size:8px}.aq-qr-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:20px}.aq-qr-action{min-height:66px;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px;color:var(--aq-text);text-decoration:none;border:1px solid rgba(255,255,255,0.105);border-radius:18px;background:rgba(255,255,255,0.035);-webkit-tap-highlight-color:transparent;transition:border-color 160ms ease,background-color 160ms ease,transform 160ms ease}.aq-qr-action:active{transform:scale(0.985)}.aq-qr-action:focus-visible{outline:2px solid var(--aq-cyan-soft);outline-offset:3px}@media (hover:hover){.aq-qr-action:hover{border-color:rgba(104,213,220,0.3);background:rgba(255,255,255,0.055)}}.aq-qr-action-primary{grid-column:1 / -1;min-height:72px;color:#07161f;border-color:#edfafa;background:#edfafa;box-shadow:0 16px 40px rgba(0,0,0,0.2)}@media (hover:hover){.aq-qr-action-primary:hover{border-color:#ffffff;background:#ffffff}}.aq-qr-action-copy{min-width:0;display:block;text-align:right}.aq-qr-action-copy strong{display:block;font-size:15px;line-height:1.45;font-weight:800}.aq-qr-action-copy small{display:block;margin-top:3px;color:#78929b;font-size:10px;line-height:1.45;font-weight:500;white-space:nowrap}.aq-qr-action-primary .aq-qr-action-copy small{color:#74878e}.aq-qr-action-icon{width:34px;height:34px;flex:0 0 34px;display:grid;place-items:center;color:var(--aq-cyan-soft);border:1px solid rgba(255,255,255,0.1);border-radius:999px}.aq-qr-action-primary .aq-qr-action-icon{color:#07161f;border-color:rgba(7,22,31,0.12)}.aq-qr-signature{margin:18px 0 0;color:#5d7680;text-align:center;direction:ltr;font-size:10px;line-height:1;letter-spacing:0.08em}@media (max-width:360px){.aq-qr-shell{padding-inline:16px}.aq-qr-intro h1{font-size:37px}.aq-qr-action{padding-inline:13px}.aq-qr-action-copy small{font-size:9px}}@media (max-height:760px){.aq-qr-shell{padding-top:20px}.aq-qr-intro{margin-top:22px}.aq-qr-visual{height:248px;margin-top:17px}.aq-qr-actions{margin-top:14px}.aq-qr-fish-1{top:164px}.aq-qr-fish-2{top:198px}.aq-qr-tank-outline{top:35px;height:111px}}@media (prefers-reduced-motion:reduce){.aq-qr-action{transition:none}}`}</style>
    </main>
  );
}
