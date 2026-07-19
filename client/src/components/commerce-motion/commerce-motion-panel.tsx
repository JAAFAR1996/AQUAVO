// Floating Preview control for the AQUAVO Commerce-Motion redesign.
//
// Appears ONLY on non-production hosts. Add-to-Cart toggle (الحالي / الفكرة A /
// الفكرة B) and Order-confirmation toggle (الحالي / الفكرة B — تأكيد هادئ, owner-locked).
// Selection is sessionStorage-only.

import { useEffect, useState } from "react";
import { Link } from "wouter";
import { SlidersHorizontal, X, FlaskConical } from "lucide-react";
import {
  isCommerceMotionPreviewHost,
  getCartConcept, setCartConcept, type CartConcept,
  getOrderConcept, setOrderConcept, type OrderConcept,
} from "@/lib/commerce-motion/preview-flags";

function Segmented<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string; title?: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex overflow-hidden rounded-lg border border-border">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            title={o.title}
            aria-pressed={active}
            className={`flex-1 px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
              active ? "bg-[#0B93A6] text-white" : "bg-card text-muted-foreground hover:bg-muted"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function CommerceMotionPanel() {
  const [open, setOpen] = useState(false);
  const [cart, setCart] = useState<CartConcept>("current");
  const [order, setOrder] = useState<OrderConcept>("current");

  useEffect(() => {
    setCart(getCartConcept());
    setOrder(getOrderConcept());
  }, []);

  if (!isCommerceMotionPreviewHost()) return null;

  const onCart = (v: CartConcept) => { setCart(v); setCartConcept(v); };
  const onOrder = (v: OrderConcept) => { setOrder(v); setOrderConcept(v); };

  return (
    <div dir="rtl" className="fixed left-3 top-1/2 z-[85] -translate-y-1/2">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs font-bold text-[#0B93A6] shadow-lg hover:bg-muted"
          aria-label="فتح لوحة معاينة حركة المتجر"
        >
          <SlidersHorizontal className="h-4 w-4" />
          معاينة الحركة
        </button>
      ) : (
        <div className="w-64 rounded-2xl border border-border bg-card p-3 shadow-2xl">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-sm font-bold text-foreground">
              <FlaskConical className="h-4 w-4 text-[#0B93A6]" />
              معاينة حركة المتجر
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="إغلاق" className="rounded-md p-1 text-muted-foreground hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-muted-foreground">الإضافة للسلة</div>
            <Segmented<CartConcept>
              options={[
                { value: "current", label: "الحالي", title: "السلوك الحالي" },
                { value: "A", label: "الفكرة A" },
                { value: "B", label: "الفكرة B" },
              ]}
              value={cart}
              onChange={onCart}
            />
          </div>

          <div className="mt-3 space-y-1.5">
            <div className="text-xs font-semibold text-muted-foreground">تأكيد الطلب</div>
            <Segmented<OrderConcept>
              options={[
                { value: "current", label: "الحالي", title: "السلوك الحالي" },
                { value: "B", label: "تأكيد هادئ" },
              ]}
              value={order}
              onChange={onOrder}
            />
          </div>

          <Link
            href="/preview/commerce-motion"
            className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-[#0B93A6] px-3 py-2 text-xs font-semibold text-white hover:bg-[#0B93A6]/90"
            onClick={() => setOpen(false)}
          >
            محاكاة تأكيد الطلب
          </Link>

          <p className="mt-2 text-center text-[10px] text-muted-foreground">للمعاينة فقط — لا يؤثر على الإنتاج</p>
        </div>
      )}
    </div>
  );
}
