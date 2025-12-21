import { useLocation } from "wouter";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { ErrorState, errorMessages } from "@/components/ui/error-state";
import { MetaTags } from "@/components/seo/meta-tags";
import { ShrimpMascot } from "@/components/gamification/shrimp-mascot";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MetaTags
        title="الصفحة غير موجودة | 404"
        description="عذراً، الصفحة التي تبحث عنها غير موجودة."
      />
      <Navbar />

      <main id="main-content" className="flex-1 container mx-auto px-4 py-20 flex items-center justify-center">
        <div className="max-w-2xl mx-auto w-full">
          <ErrorState
            title={errorMessages.notFound.title}
            description={errorMessages.notFound.description}
            showRetry={false}
          >
            <div className="pt-12 space-y-4" dir="rtl">
              <p className="text-sm text-muted-foreground text-center">ربما تبحث عن:</p>
              <div className="flex flex-wrap gap-3 justify-center">
                {[
                  { label: "موسوعة الأسماك", path: "/fish-encyclopedia" },

                  { label: "بدء رحلتك", path: "/journey" },
                  { label: "العروض", path: "/deals" },
                  { label: "الرئيسية", path: "/" },
                  { label: "المنتجات", path: "/products" },
                ].map((link) => (
                  <button
                    key={link.path}
                    onClick={() => setLocation(link.path)}
                    className="px-4 py-2 text-sm bg-primary/10 hover:bg-primary/20 text-primary rounded-full transition-colors"
                  >
                    {link.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Animated 404 with Shrimp Mascot */}
            <div className="relative mt-8 flex flex-col items-center justify-center space-y-4">
              <h1 className="text-9xl font-black text-center select-none text-primary/20">404</h1>
              <div className="absolute inset-0 flex items-center justify-center -mt-8">
                <ShrimpMascot mood="sad" size="xl" animate />
              </div>
              <p className="text-xl font-bold text-muted-foreground animate-pulse">الجمبري ضيع الطريق... 🦐</p>
            </div>
          </ErrorState>
        </div>
      </main>

      <Footer />
    </div>
  );
}
