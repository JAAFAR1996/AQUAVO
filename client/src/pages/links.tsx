/**
 * AQUAVO Links Page — permanent QR landing page.
 *
 * Design principles:
 * - one dominant action for the most common high-intent task (support)
 * - related actions grouped to reduce decision complexity
 * - secondary contact methods progressively disclosed
 * - social profiles visually secondary
 * - no urgency, fake scarcity, counters, or decorative motion
 */

import { useEffect, type ComponentType } from "react";
import {
  ChevronDown,
  ChevronLeft,
  CircleHelp,
  Facebook,
  Globe2,
  Instagram,
  Mail,
  MessageCircle,
  Music2,
  PackageSearch,
  Phone,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { MetaTags } from "@/components/seo/meta-tags";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { useLocale } from "@/i18n/locale-context";
import { trackBioLinkClick } from "@/lib/analytics";
import { WHATSAPP_URL } from "@/lib/constants/shipping";
import { trackWhatsAppHandoff } from "@/lib/whatsapp";

type LinkItem = {
  id: string;
  label: string;
  sublabel: string;
  url: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  external?: boolean;
  featured?: boolean;
};

function WhatsAppIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function trackLinkClick(item: LinkItem) {
  trackBioLinkClick(item.id);
  if (item.id === "whatsapp") trackWhatsAppHandoff({ source: "links" });
}

function ActionCard({ item }: { item: LinkItem }) {
  const Icon = item.icon;
  const isWhatsApp = item.id === "whatsapp";
  const { dir } = useLocale();

  return (
    <a
      href={item.url}
      onClick={() => trackLinkClick(item)}
      target={item.external ? "_blank" : undefined}
      rel={item.external ? "noopener noreferrer" : undefined}
      className={
        item.featured
          ? "group flex min-h-[76px] w-full items-center gap-3 rounded-2xl bg-[#0B93A6] px-4 py-3 text-[#0B1E28] shadow-[0_8px_24px_rgba(11,147,166,0.16)] transition hover:shadow-[0_10px_28px_rgba(11,147,166,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1E28] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F6F4EF]"
          : "group flex min-h-[72px] w-full items-center gap-3 rounded-2xl border border-[#0B93A6]/20 bg-white/[0.72] px-4 py-3 text-[#232323] transition hover:border-[#0B93A6]/[0.45] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B93A6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F6F4EF]"
      }
    >
      <span
        className={
          item.featured
            ? "grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#F6F4EF]/[0.55] text-[#0B1E28]"
            : "grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#0B93A6]/[0.09] text-[#0B93A6]"
        }
      >
        {isWhatsApp ? <WhatsAppIcon /> : <Icon className="h-5 w-5" aria-hidden />}
      </span>

      <span className="min-w-0 flex-1">
        <span className={item.featured ? "block text-base font-bold leading-6" : "block text-sm font-bold leading-6"}>
          {item.label}
        </span>
        <span className={item.featured ? "mt-0.5 block text-xs font-medium leading-5 text-[#0B1E28]" : "mt-0.5 block text-xs leading-5 text-[#232323]/70"}>
          {item.sublabel}
        </span>
      </span>

      <ChevronLeft
        className={item.featured ? "h-4 w-4 shrink-0 text-[#0B1E28]" : "h-4 w-4 shrink-0 text-[#0B93A6]"}
        style={{ transform: dir === "ltr" ? "rotate(180deg)" : undefined }}
        aria-hidden
      />
    </a>
  );
}

function CompactLinkCard({ item }: { item: LinkItem }) {
  const Icon = item.icon;

  return (
    <a
      href={item.url}
      onClick={() => trackLinkClick(item)}
      target={item.external ? "_blank" : undefined}
      rel={item.external ? "noopener noreferrer" : undefined}
      className="flex min-h-[92px] flex-col items-start justify-between rounded-2xl border border-[#0B93A6]/[0.18] bg-white/[0.62] p-3.5 text-[#232323] transition hover:border-[#0B93A6]/[0.45] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B93A6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F6F4EF]"
    >
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#0B93A6]/[0.09] text-[#0B93A6]">
        <Icon className="h-[18px] w-[18px]" aria-hidden />
      </span>
      <span className="mt-3 min-w-0">
        <span className="block text-sm font-bold leading-5">{item.label}</span>
        <span className="mt-0.5 block truncate text-[11px] leading-4 text-[#232323]/[0.65]">
          {item.sublabel}
        </span>
      </span>
    </a>
  );
}

export default function LinksPage() {
  const { t } = useTranslation("pages");
  const { dir, href } = useLocale();

  useEffect(() => {
    const theme = document.querySelector('meta[name="theme-color"]');
    const previous = theme?.getAttribute("content") ?? null;
    theme?.setAttribute("content", "#F6F4EF");
    return () => {
      if (!theme) return;
      if (previous === null) theme.removeAttribute("content");
      else theme.setAttribute("content", previous);
    };
  }, []);

  const services: LinkItem[] = [
    {
      id: "whatsapp",
      label: t("links.s4"),
      sublabel: t("links.s5"),
      url: `${WHATSAPP_URL}?text=${encodeURIComponent(t("links.s6"))}`,
      icon: MessageCircle,
      external: true,
      featured: true,
    },
    {
      id: "tracking",
      label: t("links.s19"),
      sublabel: t("links.s20"),
      url: href("/order-tracking"),
      icon: PackageSearch,
    },
    {
      id: "faq",
      label: t("links.s21"),
      sublabel: t("links.s22"),
      url: href("/faq"),
      icon: CircleHelp,
    },
    {
      id: "shop",
      label: t("links.s2"),
      sublabel: t("links.s3"),
      url: href("/products"),
      icon: ShoppingBag,
    },
  ];

  const officialLinks: LinkItem[] = [
    {
      id: "instagram",
      label: t("links.s7"),
      sublabel: t("links.s8"),
      url: "https://instagram.com/aquavo_iq",
      icon: Instagram,
      external: true,
    },
    {
      id: "tiktok",
      label: t("links.s9"),
      sublabel: t("links.s10"),
      url: "https://tiktok.com/@aquavo.iq",
      icon: Music2,
      external: true,
    },
    {
      id: "facebook",
      label: t("links.s11"),
      sublabel: t("links.s12"),
      url: "https://www.facebook.com/profile.php?id=61587249730248",
      icon: Facebook,
      external: true,
    },
    {
      id: "website",
      label: t("links.s13"),
      sublabel: "aquavoiq.com",
      url: href("/"),
      icon: Globe2,
    },
  ];

  return (
    <>
      <MetaTags title={t("links.s14")} description={t("links.s18")} />
      <main className="min-h-screen bg-[#F6F4EF] font-sans text-[#232323]" dir={dir}>
        <div className="h-1 w-full bg-[#0B93A6]" aria-hidden />

        <div className="mx-auto flex min-h-[calc(100vh-4px)] w-full max-w-md flex-col px-4 pb-8 pt-4 sm:px-5">
          <div className="flex min-h-11 items-center justify-end">
            <LanguageSwitcher variant="compact" />
          </div>

          <header className="flex flex-col items-center px-3 pb-7 pt-2 text-center">
            <img
              src="/brand/aquavo-v2-horizontal.svg"
              alt="AQUAVO"
              width="180"
              height="50"
              className="h-12 w-auto max-w-[190px]"
            />

            <div className="mt-5 h-px w-16 bg-[#0B93A6]/[0.55]" aria-hidden />

            <p className="mt-5 text-sm font-semibold text-[#0B1E28]">{t("links.s1")}</p>
            <h1 className="mt-2 text-[26px] font-bold leading-[1.45] tracking-[-0.02em] text-[#232323]">
              {t("links.s17")}
            </h1>
            <p className="mt-3 max-w-sm text-sm leading-7 text-[#232323]/75">
              {t("links.s18")}
            </p>

            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#0B93A6]/20 bg-white/[0.65] px-3 py-2 text-xs font-semibold text-[#232323]/75">
              <ShieldCheck className="h-4 w-4 text-[#0B93A6]" aria-hidden />
              <span>{t("links.s15")}</span>
            </div>
          </header>

          <section aria-labelledby="links-services-title">
            <h2 id="links-services-title" className="mb-3 px-1 text-xs font-bold text-[#232323]/70">
              {t("links.s23")}
            </h2>
            <div className="space-y-2.5">
              {services.map((item) => <ActionCard key={item.id} item={item} />)}
            </div>

            <p className="mt-3 border-s-2 border-[#0B93A6]/[0.45] ps-3 text-xs leading-6 text-[#232323]/70">
              {t("links.s29")}
            </p>
          </section>

          <details className="group mt-6 rounded-2xl border border-[#0B93A6]/[0.18] bg-white/[0.45]">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-[#232323] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B93A6] [&::-webkit-details-marker]:hidden">
              <span>{t("links.s26")}</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-[#0B93A6] transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <div className="grid grid-cols-1 gap-2 px-3 pb-3 sm:grid-cols-2">
              <a
                href="tel:+9647747880673"
                onClick={() => trackBioLinkClick("phone")}
                className="flex min-h-14 items-center gap-3 rounded-xl bg-white/75 px-3 py-2.5 text-[#232323] transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B93A6]"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#0B93A6]/[0.09] text-[#0B93A6]">
                  <Phone className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold">{t("links.s27")}</span>
                  <span dir="ltr" className="mt-0.5 block text-xs text-[#232323]/[0.65]">+964 774 788 0673</span>
                </span>
              </a>

              <a
                href="mailto:info@aquavoiq.com"
                onClick={() => trackBioLinkClick("email")}
                className="flex min-h-14 items-center gap-3 rounded-xl bg-white/75 px-3 py-2.5 text-[#232323] transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B93A6]"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#0B93A6]/[0.09] text-[#0B93A6]">
                  <Mail className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold">{t("links.s28")}</span>
                  <span dir="ltr" className="mt-0.5 block truncate text-xs text-[#232323]/[0.65]">info@aquavoiq.com</span>
                </span>
              </a>
            </div>
          </details>

          <section className="mt-7" aria-labelledby="links-official-title">
            <h2 id="links-official-title" className="mb-3 px-1 text-xs font-bold text-[#232323]/70">
              {t("links.s24")}
            </h2>
            <div className="grid grid-cols-2 gap-2.5">
              {officialLinks.map((item) => <CompactLinkCard key={item.id} item={item} />)}
            </div>
          </section>

          <footer className="mt-8 border-t border-[#0B93A6]/[0.16] pt-5 text-center">
            <p className="text-xs leading-6 text-[#232323]/[0.65]">{t("links.s25")}</p>
            <p className="mt-1 text-[11px] font-semibold text-[#0B1E28]/[0.65]">
              {t("links.s16")}
            </p>
          </footer>
        </div>
      </main>
    </>
  );
}
