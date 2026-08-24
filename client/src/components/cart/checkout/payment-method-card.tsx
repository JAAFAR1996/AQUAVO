import { CreditCard, Banknote, ShieldCheck } from "lucide-react";

interface PaymentMethodCardProps {
  method: "cod" | "online";
  selected: "cod" | "online";
  onChange: (method: "cod" | "online") => void;
}

export function PaymentMethodCard({ method, selected, onChange }: PaymentMethodCardProps) {
  const online = method === "online";

  return (
    <button
      type="button"
      onClick={() => onChange(method)}
      className={`w-full rounded-xl border p-4 text-right transition ${
        selected === method
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/40"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {online ? <CreditCard className="h-5 w-5" /> : <Banknote className="h-5 w-5" />}
          <span className="font-semibold">
            {online ? "الدفع الإلكتروني" : "الدفع عند الاستلام"}
          </span>
        </div>
        {selected === method && <ShieldCheck className="h-5 w-5 text-primary" />}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        {online
          ? "دفع آمن عبر بوابة الدفع الإلكترونية"
          : "الدفع نقداً عند استلام الطلب"}
      </p>
    </button>
  );
}
