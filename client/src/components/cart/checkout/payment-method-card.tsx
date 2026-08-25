import { CreditCard, Banknote, CheckCircle2 } from "lucide-react";

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
      onClick={() => onChange(method)}
      disabled={disabled}
      aria-pressed={isSelected}
      className={`w-full rounded-xl border p-4 text-right transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
        isSelected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border hover:border-primary/40 hover:bg-muted/20"
      } ${disabled ? "cursor-not-allowed opacity-55" : ""}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className={`grid h-9 w-9 place-items-center rounded-lg ${isSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
            {online ? <CreditCard className="h-5 w-5" /> : <Banknote className="h-5 w-5" />}
          </span>
          <div>
            <span className="block font-semibold">
              {online ? "الدفع الإلكتروني" : "الدفع عند الاستلام"}
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground" dir="ltr">
              {online ? "Secure Online Payment" : "Cash on Delivery"}
            </span>
          </div>
        </div>
        {isSelected && <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />}
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {online
          ? "ادفع بسهولة عبر بوابة الدفع الإلكتروني"
          : "ادفع نقداً عند استلام طلبك"}
      </p>
    </button>
  );
}
