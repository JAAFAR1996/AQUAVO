// Preview-only simulation for the AQUAVO Commerce-Motion redesign.
//
// Visual simulation ONLY — never creates a real order, never calls the order API,
// never mutates stock/DB. Safe AQUAVO fixtures. Non-production hosts only.

import { useEffect, useState } from "react";
import { Redirect } from "wouter";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { MetaTags } from "@/components/seo/meta-tags";
import { Button } from "@/components/ui/button";
import { CheckCircle2, RotateCcw, ShoppingBag } from "lucide-react";
import { OrderCalmConfirm } from "@/components/commerce-motion/order-calm-confirm";
import { SIMULATED_ORDER } from "@/lib/commerce-motion/order-fixtures";
import { formatIQD } from "@/lib/utils";
import {
  isCommerceMotionPreviewHost,
  getOrderConcept, setOrderConcept, type OrderConcept,
  getCartConcept, setCartConcept, type CartConcept,
  ADD_TO_CART_EVENT,
} from "@/lib/commerce-motion/preview-flags";

const CART_CHOICES: { value: CartConcept; label: string }[] = [
  { value: "current", label: "الحالي" },
  { value: "A", label: "الفكرة A — FlowLine Seal" },
  { value: "B", label: "الفكرة B — Facet Turn" },
];

const ORDER_CHOICES: { value: OrderConcept; label: string }[] = [
  { value: "current", label: "الحالي" },
  { value: "B", label: "الفكرة B — تأكيد هادئ" },
];

/** Static representation of the CURRENT production order-success baseline. */
function CurrentOrderBaseline() {
  const o = SIMULATED_ORDER;
  return (
    <div dir="rtl" className="mx-auto w-full max-w-lg overflow-hidden rounded-2xl border border-t-4 border-green-500 bg-card shadow-xl">
      <div className="bg-green-50/60 p-6 text-center dark:bg-green-950/20">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-green-100 dark:bg-green-900/40">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="mt-3 text-xl font-bold text-green-800 dark:text-green-300">شكراً لطلبك!</h2>
        <p className="mt-1 text-sm text-green-700 dark:text-green-400">تم استلام طلبك بنجاح</p>
      </div>
      <div className="space-y-3 p-5">
        <div className="rounded-lg bg-muted/40 p-3 text-center">
          <div className="text-xs text-muted-foreground">رقم الطلب</div>
          <div dir="ltr" className="font-mono text-lg font-bold">#{o.orderNumber}</div>
        </div>
        {o.items.map((it, i) => (
          <div key={i} className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate text-muted-foreground">{it.name} × {it.quantity}</span>
            <span className="font-mono">{formatIQD(it.price * it.quantity)}</span>
          </div>
        ))}
        <div className="flex items-center justify-between border-t border-border pt-2">
          <span className="font-bold">المبلغ الكلي</span>
          <span className="text-lg font-bold text-primary">{formatIQD(o.total)}</span>
        </div>
      </div>
    </div>
  );
}

export default function PreviewCommerceMotion() {
  const [orderConcept, setOrderConceptState] = useState<OrderConcept>("B");
  const [cartConcept, setCartConceptState] = useState<CartConcept>("A");
  const [replay, setReplay] = useState(0);

  useEffect(() => {
    // Default the sim to Idea B (the owner-locked direction) so it shows first.
    setOrderConceptState(getOrderConcept() === "current" ? "B" : getOrderConcept());
    setCartConceptState(getCartConcept() === "current" ? "A" : getCartConcept());
  }, []);

  if (!isCommerceMotionPreviewHost()) return <Redirect to="/" />;

  const chooseOrder = (v: OrderConcept) => { setOrderConceptState(v); setOrderConcept(v); setReplay((r) => r + 1); };
  const chooseCart = (v: CartConcept) => { setCartConceptState(v); setCartConcept(v); };
  const fireDemoAdd = () => window.dispatchEvent(new CustomEvent(ADD_TO_CART_EVENT, { detail: {
    id: "sim-demo",
    name: SIMULATED_ORDER.items[0].name,
    variantLabel: "قطعة فردية",
    quantity: 1,
    price: SIMULATED_ORDER.items[0].price,
    image: SIMULATED_ORDER.items[0].image,
  } }));

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans" dir="rtl">
      <MetaTags title="محاكاة حركة المتجر — AQUAVO" description="معاينة بصرية لتفاعلات المتجر" noIndex />
      <Navbar />
      <main className="flex-1 px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <div className="mb-6 rounded-xl border border-amber-400/40 bg-amber-50 p-3 text-center text-sm font-semibold text-amber-800 dark:bg-amber-950/20 dark:text-amber-300">
            محاكاة بصرية — لا يتم إنشاء طلب حقيقي
          </div>

          <h1 className="text-2xl font-bold text-foreground">معاينة حركة المتجر</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            للمعاينة فقط ولا تؤثر على الإنتاج ولا تنشئ أي طلب. تجربة الإضافة للسلة تظهر على صفحات المنتجات الحقيقية.
          </p>

          <section className="mt-8">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-foreground">تأكيد الطلب — تأكيد هادئ</h2>
              <Button variant="outline" size="sm" onClick={() => setReplay((r) => r + 1)} className="gap-1.5">
                <RotateCcw className="h-4 w-4" /> إعادة التشغيل
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {ORDER_CHOICES.map((c) => {
                const active = orderConcept === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => chooseOrder(c.value)}
                    aria-pressed={active}
                    className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                      active ? "border-[#0B93A6] bg-[#0B93A6] text-white" : "border-border bg-card text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-5" key={`${orderConcept}-${replay}`}>
              {orderConcept === "current"
                ? <CurrentOrderBaseline />
                : <OrderCalmConfirm order={SIMULATED_ORDER} replayKey={replay} />}
            </div>
          </section>

          <section className="mt-12">
            <h2 className="text-lg font-bold text-foreground">الإضافة للسلة</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              اختر فكرة ثم اضغط الزر لمعاينة التأكيد. على صفحات المنتجات الحقيقية تعمل نفس الفكرة ببيانات المنتج الفعلية.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {CART_CHOICES.map((c) => {
                const active = cartConcept === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => chooseCart(c.value)}
                    aria-pressed={active}
                    className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                      active ? "border-[#0B93A6] bg-[#0B93A6] text-white" : "border-border bg-card text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
            <Button onClick={fireDemoAdd} className="mt-4 gap-2" disabled={cartConcept === "current"}>
              <ShoppingBag className="h-4 w-4" />
              {cartConcept === "current" ? "اختر فكرة A أو B للمعاينة" : "أضف منتج تجريبي للسلة"}
            </Button>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
