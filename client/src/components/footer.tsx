import { Link } from "wouter";
import { Facebook, Instagram, Phone, Mail, MapPin, Fish, CreditCard, Truck, Shield, Clock, ChevronLeft, Youtube, MessageCircle, Lock, Award, Heart } from "lucide-react";
import { useState } from "react";
import { addCsrfHeader } from "@/lib/csrf";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: addCsrfHeader({
          'Content-Type': 'application/json',
        }),
        credentials: 'include',
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSubscribed(true);
        setEmail("");
        setTimeout(() => setSubscribed(false), 5000);
      } else {
        setError(data.message || "حدث خطأ أثناء الاشتراك");
        setTimeout(() => setError(""), 5000);
      }
    } catch (err) {
      setError("حدث خطأ أثناء الاشتراك. يرجى المحاولة مرة أخرى");
      setTimeout(() => setError(""), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const quickLinks = [
    { href: "/", label: "الرئيسية" },
    { href: "/products", label: "المنتجات" },
    { href: "/calculators", label: "الحاسبات" },
    { href: "/journey", label: "رحلتك" },
  ];

  const supportLinks = [
    { href: "/shipping", label: "معلومات التوصيل" },
    { href: "/sustainability", label: "الاستدامة البيئية" },
    { href: "/guides/eco-friendly", label: "دليل العناية" },
    { href: "/return-policy", label: "سياسة الإرجاع" },
    { href: "/faq", label: "الأسئلة الشائعة" },
    { href: "/order-tracking", label: "تتبع الطلب" },
    { href: "/blog", label: "المدونة" },
  ];

  return (
    <footer className="bg-slate-900 dark:bg-gradient-to-b dark:from-slate-900 dark:to-slate-950 text-slate-200 mt-auto relative overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10 w-32 h-32 bg-primary rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-blue-500 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-8 border-b border-slate-800/50">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-800/60 hover:bg-slate-800/80 transition-colors">
            <div className="p-2 bg-primary/20 rounded-full">
              <Truck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-white text-sm">توصيل سريع</p>
              <p className="text-xs text-slate-400">لجميع أنحاء العراق</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-800/60 hover:bg-slate-800/80 transition-colors">
            <div className="p-2 bg-green-500/20 rounded-full">
              <Shield className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="font-medium text-white text-sm">ضمان الجودة</p>
              <p className="text-xs text-slate-400">منتجات أصلية 100%</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-800/60 hover:bg-slate-800/80 transition-colors">
            <div className="p-2 bg-amber-500/20 rounded-full">
              <CreditCard className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="font-medium text-white text-sm">الدفع عند الاستلام</p>
              <p className="text-xs text-slate-400">أو التحويل البنكي</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-800/60 hover:bg-slate-800/80 transition-colors">
            <div className="p-2 bg-blue-500/20 rounded-full">
              <Clock className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="font-medium text-white text-sm">دعم على مدار الساعة</p>
              <p className="text-xs text-slate-400">نحن هنا لمساعدتك</p>
            </div>
          </div>
        </div>

        {/* Trust Badges Section */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-8 border-b border-slate-800/50">
          <div className="flex flex-col items-center p-4 rounded-lg bg-slate-800/20 text-center">
            <div className="p-2 bg-blue-500/20 rounded-full mb-2">
              <Lock className="h-5 w-5 text-blue-500" />
            </div>
            <p className="font-medium text-white text-xs">SSL Certified</p>
            <p className="text-[10px] text-slate-400">موقع آمن</p>
          </div>
          <div className="flex flex-col items-center p-4 rounded-lg bg-slate-800/20 text-center">
            <div className="p-2 bg-green-500/20 rounded-full mb-2">
              <Award className="h-5 w-5 text-green-500" />
            </div>
            <p className="font-medium text-white text-xs">Money-back Guarantee</p>
            <p className="text-[10px] text-slate-400">ضمان استرجاع المال</p>
          </div>
          <div className="flex flex-col items-center p-4 rounded-lg bg-slate-800/20 text-center">
            <div className="p-2 bg-amber-500/20 rounded-full mb-2">
              <Shield className="h-5 w-5 text-amber-500" />
            </div>
            <p className="font-medium text-white text-xs">Authentic Products</p>
            <p className="text-[10px] text-slate-400">منتجات أصلية</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 py-12">
          <div className="space-y-5 lg:col-span-1">
            <Link href="/">
              <div className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <img
                    src="/logo_aquavo_icon.png"
                    alt="AQUAVO"
                    className="h-10 w-10 object-contain"
                  />
                </div>
                <span className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-400 font-sans tracking-tighter">
                  AQUAVO
                </span>
              </div>
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed">
              وجهتك الأولى لمستلزمات أحواض الأسماك في العراق. نوفر أفضل المنتجات العالمية لضمان بيئة صحية وسعيدة لأسماكك.
            </p>
            <div className="flex gap-3 pt-2">
              <a
                href="https://www.facebook.com/profile.php?id=61586032750706"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="تابعنا على فيسبوك"
                className="p-2.5 bg-slate-800 hover:bg-blue-600 rounded-full transition-all hover:scale-110"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href="https://instagram.com/aquavo.iq"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="تابعنا على إنستغرام"
                className="p-2.5 bg-slate-800 hover:bg-gradient-to-br hover:from-purple-600 hover:to-pink-500 rounded-full transition-all hover:scale-110"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href="https://www.tiktok.com/@aquavo.iq"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="تابعنا على تيكتوك"
                className="p-2.5 bg-slate-800 hover:bg-black rounded-full transition-all hover:scale-110"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                </svg>
              </a>
              <a
                href="https://wa.me/9647747880673"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="تواصل معنا على واتساب"
                className="p-2.5 bg-slate-800 hover:bg-green-600 rounded-full transition-all hover:scale-110"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Our Story Section */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white flex items-center gap-2">
              <Heart className="h-4 w-4 text-red-400 animate-pulse" />
              قصتنا
            </h4>
            <div className="text-slate-400 text-sm leading-relaxed space-y-3">
              <p className="font-medium text-white text-base">
                💔 سمكة صغيرة... غيّرت كل شي
              </p>
              <p className="italic border-r-2 border-primary/50 pr-3">
                "في يوم ميلادي، أهداني أبي سمكة ذهبية صغيرة. كانت أول صديق حقيقي لي. سميتها 'نور' لأنها كانت تضيء غرفتي بحركتها..."
              </p>
              <p>
                بعد أسبوع واحد فقط، ماتت نور. 😢
              </p>
              <p>
                السبب؟ <span className="text-red-400 font-semibold">منتجات رديئة</span> من بائع لم يهتم. فلتر لا يعمل، طعام منتهي الصلاحية، ونصائح خاطئة.
              </p>
              <p className="font-medium text-white">
                لم أنسَ ذلك الألم أبداً. 🔥
              </p>
              <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                <p className="text-white font-semibold mb-2">لهذا أسسنا AQUAVO:</p>
                <p className="text-slate-300">
                  لنتأكد أن لا طفل آخر يفقد صديقه... ولا عائلة تخسر سمكتها المحبوبة بسبب منتج رديء أو نصيحة خاطئة.
                </p>
              </div>
              <div className="pt-2">
                <p className="font-medium text-primary mb-2 flex items-center gap-2">
                  <span className="text-lg">🎯</span> وعدنا لكم:
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-0.5">✓</span>
                    <span><strong className="text-white">منتجات نختبرها بأيدينا</strong> - لا نبيع شيئاً لم نستخدمه</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-0.5">✓</span>
                    <span><strong className="text-white">أسعار عادلة وشفافة</strong> - لا استغلال أبداً</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-0.5">✓</span>
                    <span><strong className="text-white">دعم حقيقي على مدار الساعة</strong> - نجيب حتى في 3 صباحاً</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-0.5">✓</span>
                    <span><strong className="text-white">نصائح صادقة</strong> - حتى لو لم تشترِ شيئاً</span>
                  </li>
                </ul>
              </div>
              <p className="text-primary font-bold pt-2 text-base flex items-center gap-2">
                <Fish className="h-4 w-4" />
                لسنا مجرد متجر - نحن عائلة تحب الأسماك مثلك
              </p>
              <p className="text-xs text-slate-500 border-t border-slate-700 pt-2 mt-2">

              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white flex items-center gap-2">
              <ChevronLeft className="h-4 w-4 text-primary" />
              الدعم والمساعدة
            </h4>
            <ul className="space-y-2.5 text-sm">
              {supportLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} onClick={handleLinkClick}>
                    <span className="text-slate-400 hover:text-primary hover:translate-x-1 transition-all inline-block cursor-pointer">
                      {link.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-5">
            <h4 className="text-lg font-semibold text-white flex items-center gap-2">
              <ChevronLeft className="h-4 w-4 text-primary" />
              تواصل معنا
            </h4>
            <ul className="space-y-3 text-sm text-slate-400">
              <li>
                <a
                  href="tel:+9647747880673"
                  className="flex items-center gap-3 hover:text-primary transition-colors group"
                >
                  <div className="p-2 bg-slate-800 group-hover:bg-primary/20 rounded-full transition-colors">
                    <Phone className="h-4 w-4 text-primary" />
                  </div>
                  <span dir="ltr">+964 772 609 0012</span>
                </a>
              </li>
              <li>
                <a
                  href="mailto:info@aquavoiq.com"
                  className="flex items-center gap-3 hover:text-primary transition-colors group"
                >
                  <div className="p-2 bg-slate-800 group-hover:bg-primary/20 rounded-full transition-colors">
                    <Mail className="h-4 w-4 text-primary" />
                  </div>
                  <span>info@aquavoiq.com</span>
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/9647747880673"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 hover:text-green-500 transition-colors group"
                >
                  <div className="p-2 bg-slate-800 group-hover:bg-green-500/20 rounded-full transition-colors">
                    <MessageCircle className="h-4 w-4 text-green-500" />
                  </div>
                  <span>واتس آب</span>
                </a>
              </li>
              <li className="flex items-start gap-3">
                <div className="p-2 bg-slate-800 rounded-full">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                <span>بغداد – العراق<br />شارع الكرادة الرئيسي</span>
              </li>
            </ul>

            {/* Business Hours */}
            <div className="pt-2 border-t border-slate-700">
              <p className="text-slate-400 text-sm font-semibold mb-2">ساعات العمل:</p>
              <p className="text-xs text-slate-400">
                <span className="block">السبت - الخميس: 9:00 ص - 10:00 م</span>
                <span className="block">الجمعة: 10:00 ص - 10:00 م</span>
              </p>
            </div>

            <div className="pt-2">
              <p className="text-slate-400 text-sm mb-3">اشترك للحصول على آخر العروض:</p>
              <form onSubmit={handleSubscribe} className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="البريد الإلكتروني"
                  disabled={loading}
                  required
                  className="bg-slate-800/80 border border-slate-700 rounded-lg px-4 py-2.5 text-sm w-full focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-all hover:scale-105 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "..." : subscribed ? "✓" : "اشتراك"}
                </button>
              </form>
              {subscribed && (
                <p className="text-green-400 text-xs mt-2 animate-pulse">تم الاشتراك بنجاح! ستصلك آخر العروض والتحديثات</p>
              )}
              {error && (
                <p className="text-red-400 text-xs mt-2">{error}</p>
              )}
            </div>
          </div>
        </div>
        {/* Invest With Us Section */}
        <div className="py-8 border-b border-slate-800/50">
          <div className="bg-gradient-to-r from-primary/10 via-slate-800/50 to-blue-500/10 rounded-2xl p-6 md:p-8 border border-primary/20">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-center md:text-right flex-1">
                <h3 className="text-xl md:text-2xl font-bold text-white mb-2 flex items-center justify-center md:justify-start gap-2">
                  <span className="text-2xl">🚀</span> استثمر معنا
                </h3>
                <p className="text-slate-400 text-sm md:text-base mb-4">
                  انضم لنا في بناء أكبر منصة لأحواض السمك في العراق
                </p>
                <div className="flex flex-wrap justify-center md:justify-start gap-4 text-xs md:text-sm">
                  <div className="flex items-center gap-1 bg-slate-800/60 px-3 py-1.5 rounded-full">
                    <span className="text-primary font-bold">$60M</span>
                    <span className="text-slate-400">حجم السوق</span>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-800/60 px-3 py-1.5 rounded-full">
                    <span className="text-green-400 font-bold">40%</span>
                    <span className="text-slate-400">هامش الربح</span>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-800/60 px-3 py-1.5 rounded-full">
                    <span className="text-amber-400 font-bold">18 شهر</span>
                    <span className="text-slate-400">استرداد الاستثمار</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/invest">
                  <button className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg font-medium transition-all hover:scale-105 flex items-center gap-2 whitespace-nowrap">
                    <span>📊</span> العرض التقديمي
                  </button>
                </Link>
                <a href="https://wa.me/9647747880673?text=مرحباً، أريد الاستثمار في AQUAVO" target="_blank" rel="noopener noreferrer">
                  <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-all hover:scale-105 flex items-center gap-2 whitespace-nowrap">
                    <MessageCircle className="w-4 h-4" /> تواصل معنا
                  </button>
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800/50 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
              &copy; {new Date().getFullYear()} AQUAVO. جميع الحقوق محفوظة.
            </p>
            <div className="flex items-center gap-6 text-xs text-slate-500">
              <Link href="/privacy-policy">
                <span className="hover:text-primary transition-colors cursor-pointer">سياسة الخصوصية</span>
              </Link>
              <Link href="/terms">
                <span className="hover:text-primary transition-colors cursor-pointer">الشروط والأحكام</span>
              </Link>
              <Link href="/return-policy">
                <span className="hover:text-primary transition-colors cursor-pointer">سياسة الإرجاع</span>
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">طرق الدفع:</span>
              <div className="flex gap-1">
                <div className="bg-slate-800 px-2 py-1 rounded text-xs flex items-center gap-1">كي كارد <span className="text-amber-400 text-[10px]">(قريباً)</span></div>
                <div className="bg-slate-800 px-2 py-1 rounded text-xs flex items-center gap-1">زين كاش <span className="text-amber-400 text-[10px]">(قريباً)</span></div>
                <div className="bg-slate-800 px-2 py-1 rounded text-xs flex items-center gap-1">نقدي <span className="text-amber-400 text-[10px]">(قريباً)</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
