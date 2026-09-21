import { i18next } from "@/i18n";
// ─────────────────────────────────────────────────────────────────────────────
// Presentation helpers for the fulfillment admin UX.
//
// HARD RULE: this module performs NO arithmetic on money. It formats numbers the
// server already produced and turns `null` into the Arabic "unknown" label. There
// is deliberately no add/subtract/multiply/divide anywhere in this file — every
// monetary figure the UI shows must arrive verbatim from the API.
// ─────────────────────────────────────────────────────────────────────────────

/** What the UI shows in place of an amount the system does not know. */
export const UNKNOWN_LABEL = i18next.t("orders:fulfillment-format.s1");

const numberFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

/** Format a KNOWN amount. Callers must handle null via {@link formatAmount}. */
export function formatIqd(value: number): string {
  return i18next.t("orders:fulfillment-format.s2", { v0: numberFormatter.format(value) });
}

/**
 * The only safe way to render money in this feature: `null` means UNKNOWN and is
 * rendered as "غير معروف" — never as 0 د.ع.
 */
export function formatAmount(value: number | null | undefined): string {
  if (value == null) return UNKNOWN_LABEL;
  return formatIqd(value);
}

/** Signed presentation for a variance the server already calculated. */
export function formatVariance(value: number | null | undefined): string {
  if (value == null) return UNKNOWN_LABEL;
  const sign = value > 0 ? "+" : "";
  return i18next.t("orders:fulfillment-format.s3", { v0: sign, v1: numberFormatter.format(value) });
}

/** Quantities are counts, not money — plain number formatting with an optional unit. */
export function formatQuantity(quantity: number, unit?: string | null): string {
  const n = numberFormatter.format(quantity);
  return unit ? `${n} ${unit}` : n;
}

/**
 * Margin arrives from the server ALREADY as a percentage — the accounting engine
 * computes `Math.round((contributionProfit / revenue) * 100)`. We append the sign
 * and nothing else. Do NOT scale it here: multiplying again rendered 23% as 2300%.
 */
export function formatMargin(value: number | null | undefined): string {
  if (value == null) return UNKNOWN_LABEL;
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value)}%`;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ar-IQ", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// ── Status vocabulary ───────────────────────────────────────────────────────

export type CostStatusValue = "exact" | "estimated" | "incomplete" | "unknown";

export const COST_STATUS_LABELS: Record<CostStatusValue, string> = {
  exact: i18next.t("orders:fulfillment-format.s4"),
  estimated: i18next.t("orders:fulfillment-format.s5"),
  incomplete: i18next.t("orders:fulfillment-format.s6"),
  unknown: UNKNOWN_LABEL,
};

/** Tailwind classes per status — readable in light AND dark mode. */
export const COST_STATUS_CLASSES: Record<CostStatusValue, string> = {
  exact: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
  estimated: "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800",
  incomplete: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
  unknown: "bg-muted text-muted-foreground border-border",
};

export function costStatusLabel(status: string | null | undefined): string {
  if (status && status in COST_STATUS_LABELS) return COST_STATUS_LABELS[status as CostStatusValue];
  return UNKNOWN_LABEL;
}

export function costStatusClass(status: string | null | undefined): string {
  if (status && status in COST_STATUS_CLASSES) return COST_STATUS_CLASSES[status as CostStatusValue];
  return COST_STATUS_CLASSES.unknown;
}

export const EVENT_TYPE_LABELS: Record<string, string> = {
  original: i18next.t("orders:fulfillment-format.s7"),
  reshipment: i18next.t("orders:fulfillment-format.s8"),
  return_handling: i18next.t("orders:fulfillment-format.s9"),
  replacement: i18next.t("orders:fulfillment-format.s10"),
  adjustment: i18next.t("orders:fulfillment-format.s11"),
};

export function eventTypeLabel(type: string): string {
  return EVENT_TYPE_LABELS[type] ?? type;
}

export const WORKFLOW_STATE_LABELS: Record<string, string> = {
  confirmed: i18next.t("orders:fulfillment-format.s12"),
  reversed: i18next.t("orders:fulfillment-format.s13"),
  reversal: i18next.t("orders:fulfillment-format.s14"),
  draft: i18next.t("orders:fulfillment-format.s15"),
};

export function workflowStateLabel(state: string): string {
  return WORKFLOW_STATE_LABELS[state] ?? state;
}

export const DRAFT_STATE_LABELS: Record<string, string> = {
  suggested: i18next.t("orders:fulfillment-format.s16"),
  editing: i18next.t("orders:fulfillment-format.s17"),
  awaiting_confirmation: i18next.t("orders:fulfillment-format.s18"),
  consumed: i18next.t("orders:fulfillment-format.s12"),
  discarded: i18next.t("orders:fulfillment-format.s19"),
};

export function draftStateLabel(state: string): string {
  return DRAFT_STATE_LABELS[state] ?? state;
}
