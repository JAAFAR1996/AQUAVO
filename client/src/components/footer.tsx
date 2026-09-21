import { useState, type FormEvent } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import {
  Clock3,
  Facebook,
  FileCheck2,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  PackageCheck,
  Phone,
  Truck,
  WalletCards,
} from "lucide-react";
import { addCsrfHeader } from "@/lib/csrf";
import { WHATSAPP_NUMBER, WHATSAPP_URL } from "@/lib/constants/shipping";
import { WhatsAppLink } from "@/components/whatsapp-link";
import { useLocale } from "@/i18n/locale-context";

const shopLinks = [
  { href: "/products", key: "links.allProducts" },
  { href: "/journey", key: "links.journey" },
  { href: "/deals", key: "links.deals" },
  { href: "/order-tracking", key: "links.orderTracking" },
] as const;

const learningLinks = [
  { href: "/guides", key: "links.allGuides" },
  // The blog had no inbound link anywhere on the site — see the note in
  // api/_seo-preview-shell.tsx. This is the browser-path half of that fix, so
  // the two footers stop diverging on what the site says it contains.
  { href: "/blog", key: "links.blog" },
  { href: "/guides/new-aquarium-setup-iraq", key: "footer.learn.newTank" },
  { href: "/guides/filter-choice", key: "footer.learn.filterChoice" },
  { href: "/guides/aquarium-water-test-guide", key: "footer.learn.waterTest" },
] as const;

const policyLinks = [
  { href: "/shipping", key: "footer.policies.shipping" },
  { href: "/return-policy", key: "footer.policies.returns" },
  { href: "/privacy-policy", key: "footer.policies.privacy" },
  { href: "/terms", key: "footer.policies.terms" },
  { href: "/faq", key: "footer.policies.faq" },
] as const;

const trustFacts = [
  { icon: Truck, title: "footer.trust.delivery", detail: "footer.trust.deliveryDetail" },
  { icon: WalletCards, title: "footer.trust.payment", detail: "footer.trust.paymentDetail" },
  { icon: PackageCheck, title: "footer.trust.packing", detail: "footer.trust.packingDetail" },
  { icon: Clock3, title: "footer.trust.support", detail: "footer.trust.supportDetail" },
] as const;

export default function Footer() {
  const { t } = useTranslation("nav");
  const { t: tc } = useTranslation("common");
  const { dir, href } = useLocale();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubscribe = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email) return;

    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: addCsrfHeader({ "Content-Type": "application/json" }),
        credentials: "include",
        body: JSON.stringify({ email }),
      });
      const data = (await response.json()) as { message?: string; code?: string };

      if (!response.ok) {
        setStatus("error");
        setMessage(t("footer.subscribeError"));
        return;
      }

      setStatus("success");
      setMessage(t("footer.subscribeSuccess"));
      setEmail("");
    } catch {
      setStatus("error");
      setMessage(t("footer.subscribeNetworkError"));
    }
  };

  return (
    <footer className="mt-auto border-t border-border bg-background text-foreground" dir={dir}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <section className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4" aria-label={t("footer.serviceInfo")}>
          {trustFacts.map((fact) => {
            const Icon = fact.icon;
            return (
              <div key={fact.title} className="flex min-h-24 items-center gap-3 bg-card px-4 py-5">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-primary/35 bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{t(fact.title)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t(fact.detail)}</p>
                </div>
              </div>
            );
          })}
        </section>

        <div className="grid gap-10 py-12 md:grid-cols-2 xl:grid-cols-[1.4fr_0.8fr_0.8fr_1.2fr]">
          <section aria-labelledby="footer-brand-title">
            <Link href="/" className="inline-flex" aria-label={t("homeLink")}>
              <img src="/brand/aquavo-v2-horizontal.svg" alt="AQUAVO" width="180" height="50" className="h-11 w-auto" />
            </Link>
            <h2 id="footer-brand-title" className="sr-only">{t("footer.aboutTitle")}</h2>
            <p className="mt-5 max-w-md text-sm leading-7 text-foreground/70">{t("footer.aboutText")}</p>
            <p className="mt-4 max-w-md border-s border-primary/50 ps-3 text-xs leading-6 text-muted-foreground">{t("footer.legalText")}</p>

            <div className="mt-6 flex items-center gap-2" aria-label={t("footer.socialLabel")}>
              <a href="https://www.facebook.com/profile.php?id=61587249730248" target="_blank" rel="noopener noreferrer" aria-label={t("footer.facebook")} className="grid h-10 w-10 place-items-center rounded-lg border border-border text-foreground/70 hover:border-primary/45 hover:text-foreground">
                <Facebook className="h-4 w-4" aria-hidden="true" />
              </a>
              <a href="https://www.instagram.com/aquavo_iq" target="_blank" rel="noopener noreferrer" aria-label={t("footer.instagram")} className="grid h-10 w-10 place-items-center rounded-lg border border-border text-foreground/70 hover:border-primary/45 hover:text-foreground">
                <Instagram className="h-4 w-4" aria-hidden="true" />
              </a>
              <a href="https://www.tiktok.com/@aquavo.iq" target="_blank" rel="noopener noreferrer" aria-label={t("footer.tiktok")} className="grid h-10 w-10 place-items-center rounded-lg border border-border text-foreground/70 hover:border-primary/45 hover:text-foreground">
                <span className="font-interface text-sm font-bold" aria-hidden="true">Tk</span>
              </a>
              <WhatsAppLink source="footer" aria-label={t("footer.whatsapp")} className="grid h-10 w-10 place-items-center rounded-lg border border-border text-foreground/70 hover:border-primary/45 hover:text-foreground">
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
              </WhatsAppLink>
            </div>
          </section>

          <nav aria-labelledby="footer-shop-title">
            <h2 id="footer-shop-title" className="text-base font-bold">{t("footer.shopTitle")}</h2>
            <ul className="mt-4 space-y-3">
              {shopLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground">{t(link.key)}</Link>
                </li>
              ))}
            </ul>

            <h2 className="mt-8 text-base font-bold">{t("footer.learnTitle")}</h2>
            <ul className="mt-4 space-y-3">
              {learningLinks.map((link) => (
                <li key={link.href}>
                  <a href={href(link.href)} className="text-sm text-muted-foreground hover:text-foreground">{t(link.key)}</a>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-labelledby="footer-support-title">
            <h2 id="footer-support-title" className="text-base font-bold">{t("footer.supportTitle")}</h2>
            <ul className="mt-4 space-y-3">
              {policyLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground">{t(link.key)}</Link>
                </li>
              ))}
            </ul>

            <Link href="/verify-certificate/yee" className="mt-7 flex items-start gap-3 rounded-lg border border-border p-3 hover:border-primary/45">
              <FileCheck2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <span>
                <span className="block text-sm font-bold text-foreground">{t("footer.certificate")}</span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">{t("footer.certificateHint")}</span>
              </span>
            </Link>
          </nav>

          <section aria-labelledby="footer-contact-title">
            <h2 id="footer-contact-title" className="text-base font-bold">{t("footer.contactTitle")}</h2>
            <ul className="mt-4 space-y-3 text-sm text-foreground/70">
              <li>
                <a href={`tel:+${WHATSAPP_NUMBER}`} className="flex min-h-10 items-center gap-3 hover:text-foreground">
                  <Phone className="h-4 w-4 text-primary" aria-hidden="true" />
                  <span dir="ltr">+964 774 788 0673</span>
                </a>
              </li>
              <li>
                <a href="mailto:info@aquavoiq.com" className="flex min-h-10 items-center gap-3 hover:text-foreground">
                  <Mail className="h-4 w-4 text-primary" aria-hidden="true" />
                  <span className="font-interface">info@aquavoiq.com</span>
                </a>
              </li>
              <li className="flex min-h-10 items-center gap-3">
                <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
                {tc("location")}
              </li>
            </ul>

            <form onSubmit={handleSubscribe} className="mt-7" aria-labelledby="newsletter-label">
              <label id="newsletter-label" htmlFor="footer-newsletter-email" className="block text-sm font-bold text-foreground">
                {t("footer.newsletterTitle")}
              </label>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{t("footer.newsletterHint")}</p>
              <div className="mt-3 flex gap-2">
                <input
                  id="footer-newsletter-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={t("footer.emailPlaceholder")}
                  autoComplete="email"
                  disabled={status === "loading"}
                  required
                  className="min-w-0 flex-1 rounded-lg border border-border bg-foreground/5 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
                <button type="submit" disabled={status === "loading"} className="min-h-11 rounded-lg bg-primary px-4 text-sm font-bold text-white disabled:opacity-50">
                  {status === "loading" ? tc("status.working") : t("footer.subscribe")}
                </button>
              </div>
              {message && (
                <p className={`mt-2 text-xs ${status === "error" ? "text-destructive" : "text-foreground/70"}`} role={status === "error" ? "alert" : "status"}>
                  {message}
                </p>
              )}
            </form>
          </section>
        </div>

        <div className="flex flex-col gap-3 border-t border-border py-6 text-xs text-foreground/70 sm:flex-row sm:items-center sm:justify-between">
          <p>{t("footer.copyright", { year: new Date().getFullYear() })}</p>
          <p>{t("footer.paymentMethods")}</p>
          <p>{tc("shipping.flatFee")}</p>
        </div>
      </div>
    </footer>
  );
}
