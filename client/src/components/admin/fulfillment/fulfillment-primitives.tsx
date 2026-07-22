// Shared presentational atoms for the fulfillment panel.
// None of these compute anything — they render server figures and statuses.
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  UNKNOWN_LABEL, costStatusClass, costStatusLabel, formatAmount, formatVariance,
} from "@/lib/fulfillment-format";

/** A cost/data status rendered as a visible badge (دقيق / تقديري / ناقص / غير معروف). */
export function CostStatusBadge({ status, className }: { status: string | null | undefined; className?: string }) {
  return (
    <span
      data-testid="cost-status-badge"
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold whitespace-nowrap",
        costStatusClass(status), className,
      )}
    >
      {costStatusLabel(status)}
    </span>
  );
}

/**
 * The only money renderer in this feature. `null` renders as "غير معروف" with a
 * muted/warning treatment — it is never shown as 0 د.ع.
 */
export function Amount({
  value, className, testId, variance = false,
}: {
  value: number | null | undefined;
  className?: string;
  testId?: string;
  variance?: boolean;
}) {
  const unknown = value == null;
  return (
    <span
      data-testid={testId}
      data-unknown={unknown ? "true" : "false"}
      className={cn(
        "tabular-nums",
        unknown
          ? "text-amber-700 dark:text-amber-400 italic font-medium"
          : "font-semibold text-foreground",
        className,
      )}
      title={unknown ? "لا توجد كلفة معتمدة لهذا البند" : undefined}
    >
      {variance ? formatVariance(value) : formatAmount(value)}
    </span>
  );
}

/** A labelled figure that can be clicked to reveal what produced it. */
export function DrilldownRow({
  label, value, status, open, onToggle, children, emphasis = false, hint,
}: {
  label: string;
  value: number | null | undefined;
  status?: string | null;
  open?: boolean;
  onToggle?: () => void;
  children?: ReactNode;
  emphasis?: boolean;
  hint?: string;
}) {
  const clickable = !!onToggle;
  return (
    <div className={cn("border-b border-border/60 last:border-b-0", emphasis && "bg-muted/40 rounded-md")}>
      <button
        type="button"
        onClick={onToggle}
        disabled={!clickable}
        aria-expanded={clickable ? !!open : undefined}
        className={cn(
          "w-full flex items-center justify-between gap-3 px-2 py-2 text-right",
          clickable && "hover:bg-muted/60 rounded-md cursor-pointer",
          !clickable && "cursor-default",
        )}
      >
        <span className={cn("text-sm", emphasis ? "font-bold" : "text-muted-foreground")}>
          {label}
          {clickable && <span className="text-xs text-muted-foreground mr-1">{open ? "▲" : "▼"}</span>}
        </span>
        <span className="flex items-center gap-2">
          {status && <CostStatusBadge status={status} />}
          <Amount value={value} className={emphasis ? "text-base" : "text-sm"} />
        </span>
      </button>
      {hint && <p className="px-2 pb-1 text-xs text-muted-foreground">{hint}</p>}
      {clickable && open && (
        <div className="px-2 pb-3 pt-1 text-xs space-y-1 bg-muted/30 rounded-md">
          {children ?? <p className="text-muted-foreground">لا توجد بنود تفصيلية لهذا المبلغ</p>}
        </div>
      )}
    </div>
  );
}

export function SectionCard({
  title, action, children, className,
}: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border border-border bg-card text-card-foreground p-3 sm:p-4", className)}>
      <header className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <h4 className="font-bold text-sm sm:text-base">{title}</h4>
        {action}
      </header>
      {children}
    </section>
  );
}

export function LoadingState({ label = "جاري التحميل..." }: { label?: string }) {
  return (
    <div data-testid="fulfillment-loading" className="py-6 text-center text-sm text-muted-foreground">
      <div className="mx-auto mb-2 h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
      {label}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      data-testid="fulfillment-error"
      role="alert"
      className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
    >
      <p className="font-semibold mb-1">تعذر تحميل البيانات</p>
      <p className="text-xs opacity-90 break-words">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 rounded-md border border-destructive/40 px-3 py-1 text-xs font-medium hover:bg-destructive/10"
        >
          إعادة المحاولة
        </button>
      )}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <p data-testid="fulfillment-empty" className="py-6 text-center text-sm text-muted-foreground">
      {message}
    </p>
  );
}

export { UNKNOWN_LABEL };
