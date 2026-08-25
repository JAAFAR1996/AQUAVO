import { Banknote, CheckCircle2, LockKeyhole, ShieldCheck } from "lucide-react";

interface PaymentMethodCardProps {
  method: "cod" | "online";
  selected: "cod" | "online";
  onChange: (method: "cod" | "online") => void;
  disabled?: boolean;
}

export function PaymentMethodCard({ method, selected, onChange, disabled = false }: PaymentMethodCardProps) {
  const online = method === "online";
  const isSelected = selected === method;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      onClick={() => onChange(method)}
      disabled={disabled}
      className={`group relative w-full overflow-hidden rounded-2xl border p-4 text-right transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2 ${
        isSelected
          ? "border-primary/70 bg-primary/[0.055] shadow-[0_10px_30px_rgba(8,105,114,0.10)]"
          : "border-border/80 bg-background hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-sm"
      } ${disabled ? "cursor-not-allowed opacity-50 hover:translate-y-0 hover:shadow-none" : ""}`}
    >
      {isSelected && <span className="absolute inset-y-0 right-0 w-1 bg-primary" aria-hidden="true" />}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${
            isSelected
              ? "border-primary/15 bg-primary/10 text-primary"
              : "border-border/70 bg-muted/55 text-muted-foreground"
          }`}>
            {online ? <ShieldCheck className="h-5 w-5" /> : <Banknote className="h-5 w-5" />}
          </span>
          <div className="min-w-0">
            <span className="block text-[15px] font-bold leading-6 text-foreground">
              {online ? "الدفع الإلكتروني الآمن" : "الدفع عند الاستلام"}
            </span>
            <span className="mt-0.5 block text-xs font-medium text-muted-foreground">
              {online ? "عبر بوابة Al-Qaseh" : "نقداً عند وصول الطلب"}
            </span>
          </div>
        </div>
        <span className={`mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full border transition ${
          isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"
        }`} aria-hidden="true">
          {isSelected && <CheckCircle2 className="h-4 w-4" />}
        </span>
      </div>

      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {online
          ? "سيتم تحويلك إلى صفحة دفع مستضافة وآمنة لإدخال بيانات البطاقة ثم إعادتك تلقائياً إلى AQUAVO."
          : "أكمل الطلب الآن وادفع المبلغ نقداً عند الاستلام."}
      </p>

      {online && (
        <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-medium text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/80 px-2 py-1">
            <LockKeyhole className="h-3 w-3" /> اتصال آمن
          </span>
          <span className="rounded-full border border-border/70 bg-background/80 px-2 py-1">لا نخزن بيانات البطاقة</span>
        </div>
      )}
    </button>
  );
}
