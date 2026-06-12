import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

const SESSION_KEY = "aquavo_exit_shown";

export function ExitIntentModal() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return;

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY < 5) {
        setVisible(true);
        sessionStorage.setItem(SESSION_KEY, "1");
      }
    };

    document.addEventListener("mouseleave", handleMouseLeave);
    return () => document.removeEventListener("mouseleave", handleMouseLeave);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={() => setVisible(false)}
    >
      <div
        className="relative bg-[#0a1628] border border-primary/30 rounded-2xl p-8 max-w-md w-[90%] shadow-2xl shadow-primary/20 text-right animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-label="قبل المغادرة"
      >
        <button
          onClick={() => setVisible(false)}
          className="absolute top-4 left-4 text-white/40 hover:text-white/80 transition-colors"
          aria-label="إغلاق"
        >
          <X className="w-5 h-5" />
        </button>

        <p className="text-primary text-xs font-bold mb-2 tracking-widest uppercase">
          قبل ما تمشي
        </p>
        <h2 className="text-2xl font-extrabold text-white leading-snug mb-3">
          حوضك يستاهل أحسن من هذا
        </h2>
        <p className="text-white/60 text-sm leading-relaxed mb-6">
          عندنا منتجات أصلية — الدفع عند الاستلام، توصيل 5,000 د.ع لكل العراق.
        </p>

        <div className="flex gap-3">
          <Button
            className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold h-11"
            onClick={() => setVisible(false)}
            asChild
          >
            <a href="/products">أشوف المنتجات</a>
          </Button>
          <Button
            variant="ghost"
            className="text-white/40 hover:text-white/60 h-11 px-3 text-sm"
            onClick={() => setVisible(false)}
          >
            لا، شكراً
          </Button>
        </div>
      </div>
    </div>
  );
}
