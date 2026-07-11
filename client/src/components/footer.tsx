import { useState, type FormEvent } from "react";
import { Link } from "wouter";
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

const shopLinks = [
  { href: "/products", label: "كل المنتجات" },
  { href: "/tank-builder", label: "اختار حسب حوضك" },
  { href: "/deals", label: "العروض المتوفرة" },
  { href: "/order-tracking", label: "تتبع طلبك" },
];

const learningLinks = [
  { href: "/guides", label: "كل الأدلة" },
  { href: "/guides/new-aquarium-setup-iraq", label: "تجهيز حوض جديد" },
  { href: "/guides/aquarium-filter-guide", label: "اختيار الفلتر" },
  { href: "/guides/aquarium-water-test-guide", label: "فحص ماء الحوض" },
];

const policyLinks = [
  { href: "/shipping", label: "التوصيل والدفع" },
  { href: "/return-policy", label: "الإرجاع والاستبدال" },
  { href: "/privacy-policy", label: "الخصوصية" },
  { href: "/terms", label: "الشروط والأحكام" },
  { href: "/faq", label: "الأسئلة الشائعة" },
];

const trustFacts = [
  { icon: Truck, title: "توصيل خلال 24 ساعة", detail: "لكل العراق" },
  { icon: WalletCards, title: "الدفع عند الاستلام", detail: "نقداً عند التوصيل" },
  { icon: PackageCheck, title: "نفحص ونعبّي الطلب", detail: "بنفس معيار العناية" },
  { icon: Clock3, title: "الدعم متوفر 24/7", detail: "للمساعدة قبل وبعد الطلب" },
];

export default function Footer() {
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
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setStatus("error");
        setMessage(data.message || "ما تم الاشتراك. جرّب مرة ثانية.");
        return;
      }

      setStatus("success");
      setMessage("تم الاشتراك بنجاح.");
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("تعذر الاشتراك هسه. جرّب مرة ثانية بعد شوي.");
    }
  };

  return (
    <footer className="mt-auto border-t border-white/10 bg-[color:var(--aqv-bg-dark)] text-white" dir="rtl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <section className="grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4" aria-label="معلومات الخدمة">
          {trustFacts.map((fact) => {
            const Icon = fact.icon;
            return (
              <div key={fact.title} className="flex min-h-24 items-center gap-3 bg-[color:var(--aqv-bg-dark)] px-4 py-5">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-primary/35 bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{fact.title}</p>
                  <p className="mt-1 text-xs text-white/60">{fact.detail}</p>
                </div>
              </div>
            );
          })}
        </section>

        <div className="grid gap-10 py-12 md:grid-cols-2 xl:grid-cols-[1.4fr_0.8fr_0.8fr_1.2fr]">
          <section aria-labelledby="footer-brand-title">
            <Link href="/" className="inline-flex" aria-label="AQUAVO - الصفحة الرئيسية">
              <img src="/brand/aquavo-v2-horizontal.svg" alt="AQUAVO" width="180" height="50" className="h-11 w-auto" />
            </Link>
            <h2 id="footer-brand-title" className="sr-only">عن AQUAVO</h2>
            <p className="mt-5 max-w-md text-sm leading-7 text-white/65">
              براند عراقي لمعدات ومستلزمات أحواض الزينة. نرتّب الاختيار بشكل عملي، ونخلي تفاصيل المنتج والتوصيل واضحة قبل ما تقرر.
            </p>
            <p className="mt-4 max-w-md border-s border-primary/50 ps-3 text-xs leading-6 text-white/55">
              AQUAVO هي العلامة التجارية الموجهة للزبون التابعة إلى محل المنبع — AL NABEA SHOP.
            </p>

            <div className="mt-6 flex items-center gap-2" aria-label="حسابات AQUAVO الرسمية">
              <a href="https://www.facebook.com/profile.php?id=61587249730248" target="_blank" rel="noopener noreferrer" aria-label="AQUAVO على فيسبوك" className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 text-white/65 hover:border-primary/45 hover:text-white">
                <Facebook className="h-4 w-4" aria-hidden="true" />
              </a>
              <a href="https://www.instagram.com/aquavo_iq" target="_blank" rel="noopener noreferrer" aria-label="AQUAVO على إنستغرام" className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 text-white/65 hover:border-primary/45 hover:text-white">
                <Instagram className="h-4 w-4" aria-hidden="true" />
              </a>
              <a href="https://www.tiktok.com/@aquavo.iq" target="_blank" rel="noopener noreferrer" aria-label="AQUAVO على تيك توك" className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 text-white/65 hover:border-primary/45 hover:text-white">
                <span className="font-interface text-sm font-bold" aria-hidden="true">Tk</span>
              </a>
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" aria-label="تواصل مع AQUAVO على واتساب" className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 text-white/65 hover:border-primary/45 hover:text-white">
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </section>

          <nav aria-labelledby="footer-shop-title">
            <h2 id="footer-shop-title" className="text-base font-bold">المتجر</h2>
            <ul className="mt-4 space-y-3">
              {shopLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-white/60 hover:text-white">{link.label}</Link>
                </li>
              ))}
            </ul>

            <h2 className="mt-8 text-base font-bold">تعلم قبل ما تختار</h2>
            <ul className="mt-4 space-y-3">
              {learningLinks.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="text-sm text-white/60 hover:text-white">{link.label}</a>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-labelledby="footer-support-title">
            <h2 id="footer-support-title" className="text-base font-bold">الدعم والسياسات</h2>
            <ul className="mt-4 space-y-3">
              {policyLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-white/60 hover:text-white">{link.label}</Link>
                </li>
              ))}
            </ul>

            <Link href="/verify-certificate/yee" className="mt-7 flex items-start gap-3 rounded-lg border border-white/10 p-3 hover:border-primary/45">
              <FileCheck2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <span>
                <span className="block text-sm font-bold text-white">وثيقة YEE</span>
                <span className="mt-1 block text-xs leading-5 text-white/55">شوف وثيقة المصدر بصفحة مستقلة</span>
              </span>
            </Link>
          </nav>

          <section aria-labelledby="footer-contact-title">
            <h2 id="footer-contact-title" className="text-base font-bold">تواصل ويانا</h2>
            <ul className="mt-4 space-y-3 text-sm text-white/65">
              <li>
                <a href={`tel:+${WHATSAPP_NUMBER}`} className="flex min-h-10 items-center gap-3 hover:text-white">
                  <Phone className="h-4 w-4 text-primary" aria-hidden="true" />
                  <span dir="ltr">+964 774 788 0673</span>
                </a>
              </li>
              <li>
                <a href="mailto:info@aquavoiq.com" className="flex min-h-10 items-center gap-3 hover:text-white">
                  <Mail className="h-4 w-4 text-primary" aria-hidden="true" />
                  <span className="font-interface">info@aquavoiq.com</span>
                </a>
              </li>
              <li className="flex min-h-10 items-center gap-3">
                <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
                بغداد — العراق
              </li>
            </ul>

            <form onSubmit={handleSubscribe} className="mt-7" aria-labelledby="newsletter-label">
              <label id="newsletter-label" htmlFor="footer-newsletter-email" className="block text-sm font-bold text-white">
                تحديثات المنتجات والأدلة
              </label>
              <p className="mt-1 text-xs leading-5 text-white/50">رسائل قليلة ومفيدة. تگدر تلغي الاشتراك بأي وقت.</p>
              <div className="mt-3 flex gap-2">
                <input
                  id="footer-newsletter-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="بريدك الإلكتروني"
                  autoComplete="email"
                  disabled={status === "loading"}
                  required
                  className="min-w-0 flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-primary focus:outline-none"
                />
                <button type="submit" disabled={status === "loading"} className="min-h-11 rounded-lg bg-primary px-4 text-sm font-bold text-white disabled:opacity-50">
                  {status === "loading" ? "جاري..." : "اشترك"}
                </button>
              </div>
              {message && (
                <p className={`mt-2 text-xs ${status === "error" ? "text-destructive" : "text-white/65"}`} role={status === "error" ? "alert" : "status"}>
                  {message}
                </p>
              )}
            </form>
          </section>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 py-6 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} AQUAVO / محل المنبع — AL NABEA SHOP</p>
          <p>طريقة الدفع المتوفرة هسه: الدفع النقدي عند الاستلام</p>
          <p>أجور التوصيل الثابتة: 5,000 د.ع</p>
        </div>
      </div>
    </footer>
  );
}
