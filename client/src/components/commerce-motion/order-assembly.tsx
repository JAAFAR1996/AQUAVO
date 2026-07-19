// OS-1 "AQUAVO Order Assembly" — Preview concept A for Order Success.
//
// The real ordered products assemble into a premium AQUAVO summary card; the flow
// mark completes the frame; the order NUMBER appears early and stays; then totals,
// payment, province and status settle. No box, no tape, no stamp, no confetti.
// Reduced motion / animation failure → the same card, static and immediate.

import { motion, type Variants } from "framer-motion";
import { Package, Truck, MapPin, Wallet, StickyNote } from "lucide-react";
import { formatIQD } from "@/lib/utils";
import type { OrderSuccessView } from "@/lib/commerce-motion/order-fixtures";

interface Props {
  order: OrderSuccessView;
  reducedMotion: boolean;
}

export function OrderAssembly({ order, reducedMotion }: Props) {
  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reducedMotion ? 0 : 0.08, delayChildren: reducedMotion ? 0 : 0.12 } },
  };
  const rise: Variants = reducedMotion
    ? { hidden: { opacity: 1 }, show: { opacity: 1 } }
    : { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 380, damping: 30 } } };

  return (
    <motion.div
      dir="rtl"
      initial={reducedMotion ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="relative mx-auto w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-xl"
    >
      {/* Top accent bar draws across = the mark completing the card frame */}
      <motion.div
        initial={reducedMotion ? false : { scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
        style={{ transformOrigin: "center" }}
        className="h-1.5 w-full bg-gradient-to-l from-[#0B93A6] via-[#0B93A6] to-[#0B64A6]"
      />

      <div className="p-5 sm:p-6">
        {/* Header */}
        <div className="flex flex-col items-center text-center">
          <motion.img
            src="/brand/aquavo-v2-icon.svg"
            alt="AQUAVO"
            initial={reducedMotion ? false : { scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18, delay: reducedMotion ? 0 : 0.05 }}
            className="h-12 w-auto"
          />
          <h2 className="mt-3 text-xl font-bold text-foreground">تم إنشاء طلبك</h2>
          <p className="mt-1 text-sm text-muted-foreground">هذه منتجاتك — هذا رقم طلبك</p>
        </div>

        {/* Order number — appears early and stays */}
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reducedMotion ? 0 : 0.15, type: "spring", stiffness: 320, damping: 26 }}
          className="mt-5 rounded-xl border border-[#0B93A6]/25 bg-[#0B93A6]/5 p-4 text-center"
        >
          <div className="text-xs text-muted-foreground">رقم الطلب</div>
          <div dir="ltr" className="mt-1 font-mono text-lg font-bold tracking-wider text-[#0B93A6]">
            #{order.orderNumber}
          </div>
        </motion.div>

        {/* Products assemble */}
        <motion.div variants={container} initial="hidden" animate="show" className="mt-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Package className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{order.items.length} منتجات</span>
          </div>
          {order.items.map((it, i) => (
            <motion.div
              key={i}
              variants={rise}
              className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/60 p-2.5"
            >
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                <img src={it.image} alt={it.name} className="h-full w-full object-cover" loading="lazy" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{it.name}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                  {it.variantLabel && <span className="rounded bg-muted px-1.5 py-0.5">{it.variantLabel}</span>}
                  <span>الكمية: {it.quantity}</span>
                </div>
              </div>
              <span className="shrink-0 font-mono text-sm text-foreground">{formatIQD(it.price * it.quantity)}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Facts settle in */}
        <motion.div variants={container} initial="hidden" animate="show" className="mt-5 space-y-3">
          <motion.div variants={rise} className="flex items-center justify-between rounded-xl bg-muted/50 p-4">
            <span className="text-sm font-semibold text-foreground">المبلغ الكلي</span>
            <span className="text-2xl font-bold text-[#0B93A6]">{formatIQD(order.total)}</span>
          </motion.div>

          <motion.div variants={rise} className="grid grid-cols-2 gap-2 text-sm">
            <Fact icon={<Wallet className="h-4 w-4" />} label="الدفع" value={order.paymentMethod} />
            <Fact icon={<MapPin className="h-4 w-4" />} label="المحافظة" value={order.province} />
            <Fact icon={<Truck className="h-4 w-4" />} label="حالة الطلب" value={order.status} />
            <Fact icon={<Package className="h-4 w-4" />} label="المستلم" value={order.customerName} />
          </motion.div>

          {order.notes && (
            <motion.div variants={rise} className="flex items-start gap-2 rounded-xl border border-border/70 p-3 text-xs text-muted-foreground">
              <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{order.notes}</span>
            </motion.div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/60 p-2.5">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#0B93A6]/10 text-[#0B93A6]">{icon}</span>
      <div className="min-w-0">
        <div className="text-[11px] text-muted-foreground">{label}</div>
        <div className="truncate text-xs font-medium text-foreground">{value}</div>
      </div>
    </div>
  );
}
