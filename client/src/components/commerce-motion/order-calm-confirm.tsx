// OS-4 "Calm Confirm Beat" — Preview concept B for Order Success.
//
// One confident beat (the AQUAVO mark forms with a soft spring + a single subtle
// ring), then the full real order card is simply present. Minimal motion, maximum
// trust. Fastest and most accessible; a deliberate contrast to OS-1 Assembly.

import { motion } from "framer-motion";
import { Truck, MapPin, Wallet, Package, StickyNote } from "lucide-react";
import { formatIQD } from "@/lib/utils";
import type { OrderSuccessView } from "@/lib/commerce-motion/order-fixtures";

interface Props {
  order: OrderSuccessView;
  reducedMotion: boolean;
}

export function OrderCalmConfirm({ order, reducedMotion }: Props) {
  return (
    <motion.div
      dir="rtl"
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="relative mx-auto w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-xl"
    >
      <div className="h-1.5 w-full bg-gradient-to-l from-[#0B93A6] to-[#0B64A6]" />

      <div className="p-5 sm:p-6">
        <div className="flex flex-col items-center text-center">
          <div className="relative grid h-16 w-16 place-items-center">
            {!reducedMotion && (
              <motion.span
                initial={{ scale: 0.6, opacity: 0.6 }}
                animate={{ scale: 1.8, opacity: 0 }}
                transition={{ duration: 0.9, ease: "easeOut" }}
                className="absolute inset-0 rounded-full bg-[#0B93A6]/30"
              />
            )}
            <motion.img
              src="/brand/aquavo-v2-icon.svg"
              alt="AQUAVO"
              initial={reducedMotion ? false : { scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="relative h-12 w-auto"
            />
          </div>
          <h2 className="mt-3 text-xl font-bold text-foreground">تم إنشاء طلبك</h2>
          <p className="mt-1 text-sm text-muted-foreground">شكراً لطلبك — تم استلامه بنجاح</p>
        </div>

        <div className="mt-5 rounded-xl border border-[#0B93A6]/25 bg-[#0B93A6]/5 p-4 text-center">
          <div className="text-xs text-muted-foreground">رقم الطلب</div>
          <div dir="ltr" className="mt-1 font-mono text-lg font-bold tracking-wider text-[#0B93A6]">#{order.orderNumber}</div>
        </div>

        <div className="mt-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Package className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{order.items.length} منتجات</span>
          </div>
          {order.items.map((it, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/60 p-2.5">
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
            </div>
          ))}
        </div>

        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between rounded-xl bg-muted/50 p-4">
            <span className="text-sm font-semibold text-foreground">المبلغ الكلي</span>
            <span className="text-2xl font-bold text-[#0B93A6]">{formatIQD(order.total)}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Fact icon={<Wallet className="h-4 w-4" />} label="الدفع" value={order.paymentMethod} />
            <Fact icon={<MapPin className="h-4 w-4" />} label="المحافظة" value={order.province} />
            <Fact icon={<Truck className="h-4 w-4" />} label="حالة الطلب" value={order.status} />
            <Fact icon={<Package className="h-4 w-4" />} label="المستلم" value={order.customerName} />
          </div>
          {order.notes && (
            <div className="flex items-start gap-2 rounded-xl border border-border/70 p-3 text-xs text-muted-foreground">
              <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{order.notes}</span>
            </div>
          )}
        </div>
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
