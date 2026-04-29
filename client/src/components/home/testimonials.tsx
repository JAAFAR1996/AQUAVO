import { ShieldCheck, Truck, HeadphonesIcon, Award } from "lucide-react";

export function Testimonials() {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16" dir="rtl">
          <h2 className="text-4xl font-bold mb-4 text-foreground">
            لماذا تختار AQUAVO؟
          </h2>
          <p className="text-xl text-muted-foreground">
            نحن نلتزم بتقديم أفضل تجربة لعشاق أحواض الأسماك
          </p>
        </div>

        {/* Trust Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 text-center" dir="rtl">
          <div className="flex flex-col items-center gap-4 p-6 bg-background rounded-2xl shadow-sm border border-border/50 hover:border-primary/50 transition-colors">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary">
              <Truck className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold">توصيل سريع وموثوق</h3>
            <p className="text-muted-foreground text-sm">شحن آمن لجميع معدات وأحواض الأسماك القابلة للكسر لكافة المحافظات.</p>
          </div>

          <div className="flex flex-col items-center gap-4 p-6 bg-background rounded-2xl shadow-sm border border-border/50 hover:border-primary/50 transition-colors">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold">دفع إلكتروني آمن</h3>
            <p className="text-muted-foreground text-sm">وسائل دفع متعددة ومحمية بالكامل لضمان راحة بالك أثناء التسوق.</p>
          </div>

          <div className="flex flex-col items-center gap-4 p-6 bg-background rounded-2xl shadow-sm border border-border/50 hover:border-primary/50 transition-colors">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary">
              <Award className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold">منتجات أصلية 100%</h3>
            <p className="text-muted-foreground text-sm">نحن وكلاء معتمدون لأكبر العلامات التجارية العالمية في عالم الأسماك.</p>
          </div>

          <div className="flex flex-col items-center gap-4 p-6 bg-background rounded-2xl shadow-sm border border-border/50 hover:border-primary/50 transition-colors">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary">
              <HeadphonesIcon className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold">استشارات واستفسارات</h3>
            <p className="text-muted-foreground text-sm">فريق متخصص للإجابة عن أسئلتك ومساعدتك في بناء حوضك المثالي.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

