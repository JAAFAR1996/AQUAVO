import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Check, Cake } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { springSnappy } from "@/lib/motion";

interface BirthdayStatus {
  isBirthday: boolean;
  discount?: number;
  coupon?: { code: string; endDate?: string | null };
}

const BALLOON_COLORS = ["#0B93A6", "#0B64A6", "#C97A2E", "#34d399", "#a78bfa"];

// Birthday gift card (2026): if today is the logged-in user's birthday, fire
// confetti + balloons and reveal their one-time 10% coupon. Shows once per year
// (guarded by localStorage). Honours prefers-reduced-motion for the confetti.
export function BirthdayCelebration() {
  const { user } = useAuth();
  const [status, setStatus] = useState<BirthdayStatus | null>(null);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    const year = new Date().getFullYear();
    const seenKey = `aquavo_bday_seen_${year}`;
    if (localStorage.getItem(seenKey)) return;

    let cancelled = false;
    const t = window.setTimeout(() => {
      fetch("/api/birthday/status", { credentials: "include" })
        .then((r) => (r.ok ? r.json() : null))
        .then((data: BirthdayStatus | null) => {
          if (cancelled || !data?.isBirthday) return;
          setStatus(data);
          setOpen(true);
          localStorage.setItem(seenKey, "1");
        })
        .catch(() => {});
    }, 1800);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [user]);

  // Confetti burst when the card opens.
  useEffect(() => {
    if (!open) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    import("canvas-confetti").then((m) => {
      const confetti = m.default;
      const fire = (particleRatio: number, opts: Record<string, unknown>) =>
        confetti({
          origin: { y: 0.6 },
          particleCount: Math.floor(180 * particleRatio),
          colors: BALLOON_COLORS,
          ...opts,
        });
      fire(0.25, { spread: 26, startVelocity: 55 });
      fire(0.2, { spread: 60 });
      fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
      fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
      fire(0.1, { spread: 120, startVelocity: 45 });
    });
  }, [open]);

  const code = status?.coupon?.code;
  const discount = status?.discount ?? 10;

  const copyCode = () => {
    if (!code) return;
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const firstName = user?.fullName?.split(" ")[0] ?? "";

  return (
    <AnimatePresence>
      {open && status?.isBirthday && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setOpen(false)}
        >
          {/* Floating balloons */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden" aria-hidden="true">
            {BALLOON_COLORS.concat(BALLOON_COLORS).map((c, i) => (
              <motion.div
                key={i}
                className="absolute bottom-[-80px] rounded-full"
                style={{
                  left: `${6 + i * 9}%`,
                  width: 36,
                  height: 46,
                  background: c,
                  boxShadow: `inset -6px -8px 0 rgba(0,0,0,0.12)`,
                }}
                initial={{ y: 0 }}
                animate={{ y: "-120vh", x: [0, 14, -10, 0] }}
                transition={{
                  duration: 7 + (i % 4),
                  delay: i * 0.25,
                  repeat: Infinity,
                  ease: "easeIn",
                }}
              />
            ))}
          </div>

          <motion.div
            className="relative w-full max-w-md rounded-3xl border border-primary/30 bg-card dark:bg-[#0B1E28] p-8 text-center shadow-2xl shadow-primary/20"
            dir="rtl"
            role="dialog"
            aria-modal="true"
            aria-label="عيد ميلاد سعيد"
            initial={{ scale: 0.8, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={springSnappy}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 left-4 text-foreground dark:text-white/40 hover:text-white/80 transition-colors press"
              aria-label="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>

            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ ...springSnappy, delay: 0.15 }}
              className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent shadow-lg"
            >
              <Cake className="h-10 w-10 text-foreground dark:text-white" />
            </motion.div>

            <h2 className="mb-2 text-3xl font-extrabold text-foreground dark:text-white">
              عيد ميلاد سعيد{firstName ? ` يا ${firstName}` : ""}! 🎉
            </h2>
            <p className="mb-6 text-foreground dark:text-white/60 leading-relaxed">
              من كل قلبنا بـ AQUAVO — هديتنا إلك خصم{" "}
              <span className="font-bold text-primary">{discount}%</span> على طلبك،
              صالح لمدة أسبوعين.
            </p>

            {code && (
              <button
                onClick={copyCode}
                className="press group mb-5 flex w-full items-center justify-between gap-3 rounded-2xl border-2 border-dashed border-primary/50 bg-primary/10 px-5 py-4"
              >
                <span className="font-mono text-xl font-bold tracking-wider text-foreground dark:text-white">{code}</span>
                <span className="flex items-center gap-1.5 text-sm font-bold text-primary">
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" /> تم النسخ
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" /> انسخ
                    </>
                  )}
                </span>
              </button>
            )}

            <Button
              className="h-12 w-full rounded-2xl text-base font-bold shadow-lg shadow-primary/20"
              asChild
            >
              <a href="/products">أبدأ التسوّق</a>
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
