/* eslint-disable jsx-a11y/alt-text */
import React from "react";
import {
  Circle,
  Document,
  Font,
  Line,
  Page,
  Path,
  Rect,
  StyleSheet,
  Svg,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";

type AnyRow = Record<string, any>;
export type AccountantPdfProgress = {
  current: number;
  total: number;
  stage: "preparing" | "rendering" | "saving";
};

const C = {
  navy: "#0B1E28",
  navy2: "#14384A",
  teal: "#0B93A6",
  teal2: "#45B8C4",
  tealSoft: "#E9F7F8",
  cream: "#F6F4EF",
  paper: "#FFFFFF",
  text: "#1F2933",
  muted: "#6B7280",
  subtle: "#94A3B8",
  border: "#D9E2E7",
  grid: "#E9EEF1",
  green: "#187B61",
  greenSoft: "#EAF7F2",
  red: "#B23A48",
  redSoft: "#FDEEEF",
  amber: "#6B7280",
  amberSoft: "#F4F6F7",
  blueSoft: "#EDF5FA",
  graySoft: "#F4F6F7",
};

const REQUIRED_BALANCE_CODES = ["1000", "1010", "1100", "1200", "3100"] as const;
const REQUIRED_SUMMARY_FIELDS = [
  "product_revenue",
  "rounding_adjustment",
  "merchant_net",
  "cogs",
  "fulfillment_cost",
  "verified_expenses",
  "fx_net_expense",
  "journal_difference",
  "realized_orders",
] as const;

let fontsRegistered = false;
function registerFonts(): void {
  if (fontsRegistered) return;
  Font.register({
    family: "AqArabic",
    fonts: [
      {
        src: "/fonts/aquavo-noto-sans-arabic-400.woff",
        fontWeight: 400,
      },
      {
        src: "/fonts/aquavo-noto-sans-arabic-700.woff",
        fontWeight: 700,
      },
    ],
  });
  Font.registerHyphenationCallback((word) => [word]);
  fontsRegistered = true;
}
registerFonts();

function finiteNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function iqd(value: unknown): string {
  const n = finiteNumber(value);
  return n == null ? "غير متوفر" : Math.round(n).toLocaleString("en-US") + " د.ع";
}

function compactMoney(value: unknown): string {
  const n = finiteNumber(value);
  if (n == null) return "—";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(abs >= 10_000_000 ? 1 : 2) + "م";
  if (abs >= 1_000) return (n / 1_000).toFixed(abs >= 100_000 ? 0 : 1) + "ألف";
  return Math.round(n).toLocaleString("en-US");
}

function numberValue(value: unknown): string {
  const n = finiteNumber(value);
  return n == null ? "غير متوفر" : Math.round(n).toLocaleString("en-US");
}

function percent(value: unknown, digits = 1): string {
  const n = finiteNumber(value);
  return n == null ? "غير متوفر" : n.toFixed(digits) + "%";
}

function ratio(numerator: unknown, denominator: unknown): number | null {
  const n = finiteNumber(numerator);
  const d = finiteNumber(denominator);
  if (n == null || d == null || d === 0) return null;
  return (n / d) * 100;
}

function deltaNumber(current: unknown, previous: unknown): number | null {
  const c = finiteNumber(current);
  const p = finiteNumber(previous);
  if (c == null || p == null || p === 0) return null;
  return ((c - p) / Math.abs(p)) * 100;
}

function dateBaghdad(value: unknown): string {
  if (!value) return "—";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-GB", {
    timeZone: "Asia/Baghdad",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dateOnly(value: unknown): string {
  if (!value) return "—";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-GB", {
    timeZone: "Asia/Baghdad",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function periodLabel(periodKey: string): string {
  const [year, month] = periodKey.split("-").map(Number);
  if (!year || !month) return periodKey;
  const d = new Date(Date.UTC(year, month - 1, 1));
  return new Intl.DateTimeFormat("ar-IQ", { month: "long", year: "numeric", timeZone: "UTC" }).format(d);
}

function generatedPeriod(value: unknown): string | null {
  if (!value) return null;
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Baghdad",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(d);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return map.year && map.month ? map.year + "-" + map.month : null;
}

function safeArray(value: unknown): AnyRow[] {
  if (Array.isArray(value)) return value as AnyRow[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function safeObject(value: unknown): AnyRow {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as AnyRow;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

function sumKnown(rows: AnyRow[], field: string): number | null {
  let found = false;
  let total = 0;
  for (const row of rows) {
    const n = finiteNumber(row?.[field]);
    if (n == null) continue;
    found = true;
    total += n;
  }
  return found ? total : null;
}

function chunks<T>(items: T[], size: number): T[][] {
  if (!items.length) return [];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function canonicalNetProfit(summary: AnyRow): number | null {
  const fields = [
    "product_revenue",
    "rounding_adjustment",
    "cogs",
    "fulfillment_cost",
    "delivery_subsidy",
    "sales_returns",
    "actual_return_loss",
    "verified_expenses",
    "fx_net_expense",
  ];
  const values = Object.fromEntries(fields.map((field) => [field, finiteNumber(summary[field])]));
  if (Object.values(values).some((value) => value == null)) return null;
  return Number(values.product_revenue)
    + Number(values.rounding_adjustment)
    - Number(values.cogs)
    - Number(values.fulfillment_cost)
    - Number(values.delivery_subsidy)
    - Number(values.sales_returns)
    - Number(values.actual_return_loss)
    - Number(values.verified_expenses)
    - Number(values.fx_net_expense);
}

function grossProfit(summary: AnyRow): number | null {
  const revenue = finiteNumber(summary.product_revenue);
  const cogs = finiteNumber(summary.cogs);
  return revenue == null || cogs == null ? null : revenue - cogs;
}

function flattenJournal(entries: AnyRow[]): AnyRow[] {
  const rows: AnyRow[] = [];
  for (const entry of entries) {
    const lines = safeArray(entry.lines);
    if (!lines.length) {
      rows.push({
        ...entry,
        accountCode: "—",
        accountName: "قيد بلا سطور",
        debit: null,
        credit: null,
        memo: entry.memo ?? entry.description ?? "—",
      });
      continue;
    }
    for (const line of lines) rows.push({ ...entry, ...line });
  }
  return rows;
}

type ProductAggregate = {
  key: string;
  productName: string;
  variantLabel: string;
  quantity: number;
  revenue: number;
  revenueKnown: boolean;
  orders: Set<string>;
};
type ProductAggregateView = ProductAggregate & { orderCount: number };

function aggregateProducts(sales: AnyRow[]): ProductAggregateView[] {
  const map = new Map<string, ProductAggregate>();
  for (const order of sales) {
    for (const item of safeArray(order.items)) {
      const key = String(item.productId ?? "unknown") + "::" + String(item.variantId ?? "");
      const quantity = finiteNumber(item.quantity) ?? 0;
      const unitPrice = finiteNumber(item.priceAtPurchase);
      const lineTotal = finiteNumber(item.lineTotal) ?? (unitPrice == null ? null : unitPrice * quantity);
      const current = map.get(key) ?? {
        key,
        productName: String(item.productName ?? item.productId ?? "منتج غير مسمى"),
        variantLabel: String(item.variantLabel ?? ""),
        quantity: 0,
        revenue: 0,
        revenueKnown: false,
        orders: new Set<string>(),
      };
      current.quantity += quantity;
      if (lineTotal != null) {
        current.revenue += lineTotal;
        current.revenueKnown = true;
      }
      current.orders.add(String(order.order_number ?? order.order_id ?? "—"));
      map.set(key, current);
    }
  }
  return Array.from(map.values())
    .map((row) => ({ ...row, orderCount: row.orders.size }))
    .sort((a, b) => (b.revenueKnown ? b.revenue : -1) - (a.revenueKnown ? a.revenue : -1));
}

function verifiedRestockCogs(returns: AnyRow[]): number {
  let total = 0;
  for (const row of returns) {
    if (String(row.status ?? "").toLowerCase() !== "verified") continue;
    if (row.restocked !== true) continue;
    if (String(row.type ?? "").toLowerCase() === "rejected_delivery") continue;
    for (const item of safeArray(row.affected_items)) {
      total += (finiteNumber(item.qty) ?? 0) * (finiteNumber(item.cogsAtTime) ?? 0);
    }
  }
  return total;
}

function orderPeriodContribution(order: AnyRow): number | null {
  const revenue = finiteNumber(order.product_revenue);
  const cogs = finiteNumber(order.cogs_amount);
  const subsidy = finiteNumber(order.delivery_subsidy);
  const fulfillment = finiteNumber(order.fulfillment_cost);
  if (revenue == null || cogs == null || subsidy == null || fulfillment == null) return null;
  return revenue - cogs - subsidy - fulfillment;
}

function validateAccountantPayload(payload: AnyRow): void {
  if (!payload?.manifest?.periodKey) throw new Error("حزمة المحاسب لا تحتوي الفترة المحاسبية");
  const archive = payload.manifest?.archive === true
    || String(payload.manifest?.packageVersion ?? "").startsWith("historical-");
  if (archive) return;
  if (!payload.readiness || typeof payload.readiness !== "object") {
    throw new Error("حزمة المحاسب لا تحتوي ملخص الجاهزية");
  }
  const missingSummary = REQUIRED_SUMMARY_FIELDS.filter((field) => finiteNumber(payload.readiness[field]) == null);
  if (missingSummary.length) {
    throw new Error("لا يمكن إنشاء PDF: أرقام الملخص ناقصة (" + missingSummary.join(", ") + ")");
  }
  if (!Array.isArray(payload.liveBalances)) throw new Error("حزمة المحاسب لا تحتوي أرصدة دفتر الأستاذ");
  const balanceCodes = new Set(
    payload.liveBalances
      .filter((row: AnyRow) => finiteNumber(row?.balance) != null)
      .map((row: AnyRow) => String(row.code)),
  );
  const missingBalances = REQUIRED_BALANCE_CODES.filter((code) => !balanceCodes.has(code));
  if (missingBalances.length) {
    throw new Error("لا يمكن إنشاء PDF: حسابات دفتر الأستاذ ناقصة (" + missingBalances.join(", ") + ")");
  }
  if (!Array.isArray(payload.journal)) throw new Error("حزمة المحاسب لا تحتوي دفتر اليومية");
}

const styles = StyleSheet.create({
  page: {
    fontFamily: "AqArabic",
    backgroundColor: C.cream,
    color: C.text,
    paddingTop: 30,
    paddingHorizontal: 34,
    paddingBottom: 34,
    fontSize: 9,
  },
  header: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  brandWrap: {
    flexDirection: "row-reverse",
    alignItems: "center",
  },
  brandMark: {
    fontFamily: "Helvetica-Bold",
    fontSize: 20,
    color: C.navy,
    letterSpacing: -0.6,
  },
  brandBar: {
    width: 28,
    height: 4,
    backgroundColor: C.teal,
    borderRadius: 3,
    marginRight: 8,
  },
  headerMeta: {
    alignItems: "flex-start",
  },
  period: {
    fontSize: 13,
    fontWeight: 700,
    color: C.navy,
    textAlign: "left",
  },
  smallMuted: {
    fontSize: 7.7,
    color: C.muted,
  },
  topRule: {
    height: 3,
    flexDirection: "row",
    marginBottom: 10,
  },
  topRuleTeal: {
    width: "24%",
    backgroundColor: C.teal,
  },
  topRuleNavy: {
    width: "76%",
    backgroundColor: C.navy,
  },
  pageTitleRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 10,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: C.navy,
    textAlign: "right",
  },
  pageSubtitle: {
    fontSize: 8.2,
    color: C.muted,
    textAlign: "right",
    marginTop: 3,
  },
  sectionPill: {
    backgroundColor: C.tealSoft,
    color: C.teal,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 7,
    fontWeight: 700,
  },
  footer: {
    position: "absolute",
    left: 34,
    right: 34,
    bottom: 12,
    borderTopWidth: 0.7,
    borderTopColor: C.border,
    paddingTop: 4,
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    fontSize: 6.9,
    color: C.muted,
  },
  pageNumber: {
    fontFamily: "Helvetica",
    fontSize: 6.5,
    color: C.subtle,
  },
  hero: {
    backgroundColor: C.navy,
    borderRadius: 15,
    padding: 16,
    marginBottom: 10,
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    minHeight: 92,
  },
  heroCopy: {
    width: "68%",
  },
  heroEyebrow: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    color: "#8DDCE4",
    letterSpacing: 1.1,
    marginBottom: 7,
    textAlign: "right",
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: "#FFFFFF",
    lineHeight: 1.4,
    textAlign: "right",
  },
  heroNote: {
    fontSize: 7.8,
    color: "#CDE5E8",
    lineHeight: 1.6,
    marginTop: 6,
    textAlign: "right",
  },
  heroStatus: {
    width: "27%",
    backgroundColor: "#123747",
    borderRadius: 12,
    padding: 11,
    justifyContent: "center",
  },
  heroStatusLabel: {
    fontSize: 7,
    color: "#A7D6DB",
    textAlign: "right",
  },
  heroStatusValue: {
    fontSize: 16,
    fontWeight: 700,
    color: "#FFFFFF",
    textAlign: "right",
    marginTop: 4,
  },
  kpiRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  kpiCard: {
    width: "16%",
    backgroundColor: C.paper,
    borderWidth: 0.7,
    borderColor: C.border,
    borderRadius: 10,
    padding: 9,
    minHeight: 64,
  },
  kpiLabel: {
    fontSize: 7.2,
    color: C.muted,
    textAlign: "right",
  },
  kpiValue: {
    fontFamily: "AqArabic",
    fontWeight: 700,
    fontSize: 14,
    color: C.navy,
    marginTop: 5,
    textAlign: "right",
  },
  kpiUnit: {
    fontSize: 6.5,
    color: C.muted,
  },
  deltaRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    marginTop: 5,
  },
  deltaText: {
    fontFamily: "AqArabic",
    fontWeight: 700,
    fontSize: 6.5,
    marginRight: 3,
  },
  deltaNote: {
    fontSize: 6,
    color: C.subtle,
    marginRight: 4,
  },
  twoCol: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
  },
  chartCard: {
    backgroundColor: C.paper,
    borderWidth: 0.7,
    borderColor: C.border,
    borderRadius: 12,
    padding: 10,
  },
  chartTitle: {
    fontSize: 10.5,
    fontWeight: 700,
    color: C.navy,
    textAlign: "right",
    marginBottom: 3,
  },
  chartSubtitle: {
    fontSize: 6.8,
    color: C.muted,
    textAlign: "right",
    marginBottom: 7,
  },
  insightGrid: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    marginTop: 9,
  },
  insightCard: {
    width: "24%",
    minHeight: 54,
    backgroundColor: C.paper,
    borderWidth: 0.7,
    borderColor: C.border,
    borderRadius: 9,
    padding: 8,
    borderRightWidth: 3,
    borderRightColor: C.teal,
  },
  insightTitle: {
    fontSize: 7,
    color: C.muted,
    textAlign: "right",
  },
  insightText: {
    fontSize: 8.2,
    color: C.navy,
    fontWeight: 700,
    textAlign: "right",
    marginTop: 4,
    lineHeight: 1.5,
  },
  sectionHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 7,
    marginTop: 4,
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: C.navy,
    textAlign: "right",
  },
  sectionHeaderNote: {
    fontSize: 6.8,
    color: C.muted,
  },
  compareGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  compareCard: {
    width: "24%",
    backgroundColor: C.paper,
    borderWidth: 0.7,
    borderColor: C.border,
    borderRadius: 10,
    padding: 9,
    marginBottom: 8,
    minHeight: 77,
  },
  compareLabel: {
    fontSize: 7.6,
    color: C.muted,
    textAlign: "right",
  },
  compareCurrent: {
    fontFamily: "AqArabic",
    fontWeight: 700,
    fontSize: 12,
    color: C.navy,
    textAlign: "right",
    marginTop: 4,
  },
  comparePrevious: {
    fontFamily: "AqArabic",
    fontSize: 7.5,
    color: C.subtle,
    textAlign: "right",
    marginTop: 3,
  },
  barRow: {
    marginBottom: 7,
  },
  barTop: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  barLabel: {
    fontSize: 7.5,
    color: C.navy,
    fontWeight: 700,
  },
  barValue: {
    fontFamily: "AqArabic",
    fontWeight: 700,
    fontSize: 7.2,
    color: C.muted,
  },
  barTrack: {
    height: 7,
    backgroundColor: C.grid,
    borderRadius: 4,
  },
  barFill: {
    height: 7,
    borderRadius: 4,
  },
  callout: {
    borderWidth: 0.7,
    borderColor: C.border,
    backgroundColor: C.paper,
    borderRadius: 10,
    padding: 9,
  },
  calloutTitle: {
    fontSize: 9,
    fontWeight: 700,
    color: C.navy,
    textAlign: "right",
  },
  calloutText: {
    fontSize: 7.5,
    color: C.text,
    lineHeight: 1.55,
    textAlign: "right",
    marginTop: 4,
  },
  flowRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 9,
  },
  flowBox: {
    width: 112,
    backgroundColor: C.paper,
    borderWidth: 0.8,
    borderColor: C.border,
    borderRadius: 9,
    padding: 8,
    minHeight: 56,
    justifyContent: "center",
  },
  flowLabel: {
    fontSize: 7.2,
    color: C.muted,
    textAlign: "center",
  },
  flowValue: {
    fontFamily: "AqArabic",
    fontWeight: 700,
    fontSize: 11,
    color: C.navy,
    textAlign: "center",
    marginTop: 3,
  },
  balanceHero: {
    width: "38%",
    backgroundColor: C.navy,
    borderRadius: 12,
    padding: 13,
    justifyContent: "center",
  },
  balanceHeroLabel: {
    fontSize: 8,
    color: "#A9D5DA",
    textAlign: "right",
  },
  balanceHeroValue: {
    fontFamily: "AqArabic",
    fontWeight: 700,
    fontSize: 20,
    color: "#FFFFFF",
    textAlign: "right",
    marginTop: 4,
  },
  miniBalanceGrid: {
    width: "59%",
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  miniBalance: {
    width: "49%",
    backgroundColor: C.paper,
    borderWidth: 0.7,
    borderColor: C.border,
    borderRadius: 9,
    padding: 8,
    marginBottom: 7,
  },
  miniBalanceLabel: {
    fontSize: 6.8,
    color: C.muted,
    textAlign: "right",
  },
  miniBalanceValue: {
    fontFamily: "AqArabic",
    fontWeight: 700,
    fontSize: 11,
    color: C.navy,
    textAlign: "right",
    marginTop: 3,
  },
  rankRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    marginBottom: 7,
  },
  rankNo: {
    width: 28,
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    color: C.teal,
    textAlign: "center",
  },
  rankMain: {
    flexGrow: 1,
  },
  rankLabelRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
  },
  rankLabel: {
    fontSize: 7.5,
    fontWeight: 700,
    color: C.navy,
    textAlign: "right",
    maxWidth: 360,
  },
  rankMeta: {
    fontSize: 6.5,
    color: C.muted,
  },
  rankTrack: {
    height: 6,
    backgroundColor: C.grid,
    borderRadius: 3,
    marginTop: 4,
  },
  rankFill: {
    height: 6,
    backgroundColor: C.teal,
    borderRadius: 3,
  },
  rankValue: {
    width: 78,
    fontFamily: "AqArabic",
    fontWeight: 700,
    fontSize: 7.5,
    color: C.navy,
    textAlign: "left",
    marginRight: 8,
  },
  checkGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  checkCard: {
    width: "32.3%",
    backgroundColor: C.paper,
    borderWidth: 0.7,
    borderColor: C.border,
    borderRadius: 9,
    padding: 9,
    marginBottom: 7,
    minHeight: 58,
  },
  checkTop: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  checkLabel: {
    fontSize: 7.3,
    fontWeight: 700,
    color: C.navy,
    textAlign: "right",
    maxWidth: 140,
  },
  checkBadge: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    fontSize: 6.2,
    fontWeight: 700,
  },
  checkValue: {
    fontFamily: "AqArabic",
    fontWeight: 700,
    fontSize: 9.5,
    color: C.text,
    textAlign: "right",
    marginTop: 5,
  },
  ganttTrack: {
    height: 24,
    flexDirection: "row-reverse",
    borderRadius: 8,
    overflow: "hidden",
    marginTop: 8,
    marginBottom: 8,
  },
  ganttLegend: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
  },
  ganttPhase: {
    width: "24%",
    backgroundColor: C.paper,
    borderWidth: 0.7,
    borderColor: C.border,
    borderRadius: 8,
    padding: 7,
  },
  ganttPhaseNo: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: C.teal,
    textAlign: "right",
  },
  ganttPhaseTitle: {
    fontSize: 7.6,
    fontWeight: 700,
    color: C.navy,
    textAlign: "right",
    marginTop: 2,
  },
  ganttPhaseDate: {
    fontFamily: "Helvetica",
    fontSize: 6.2,
    color: C.muted,
    textAlign: "right",
    marginTop: 2,
  },
  table: {
    width: "100%",
    borderWidth: 0.7,
    borderColor: C.border,
    borderRadius: 7,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row-reverse",
    backgroundColor: "#E8F0F2",
    borderBottomWidth: 0.7,
    borderBottomColor: C.border,
    minHeight: 25,
    alignItems: "center",
  },
  tableRow: {
    flexDirection: "row-reverse",
    minHeight: 24,
    alignItems: "stretch",
    borderBottomWidth: 0.5,
    borderBottomColor: C.grid,
  },
  tableRowAlt: {
    backgroundColor: "#FBFCFC",
  },
  tableCell: {
    borderLeftWidth: 0.4,
    borderLeftColor: C.grid,
    paddingHorizontal: 5,
    paddingVertical: 4,
    justifyContent: "center",
  },
  tableHeaderText: {
    fontSize: 8.5,
    fontWeight: 700,
    color: C.navy,
    textAlign: "right",
  },
  tableText: {
    fontSize: 8.2,
    color: C.text,
    lineHeight: 1.4,
    textAlign: "right",
  },
  tableNumber: {
    fontFamily: "AqArabic",
    fontSize: 8.1,
    color: C.text,
    textAlign: "right",
  },
  orderCard: {
    backgroundColor: C.paper,
    borderWidth: 0.8,
    borderColor: C.border,
    borderRadius: 10,
    padding: 9,
    marginBottom: 8,
  },
  orderHead: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: C.navy,
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 6,
    marginBottom: 6,
  },
  orderNo: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: "#FFFFFF",
  },
  orderCustomer: {
    fontSize: 8,
    fontWeight: 700,
    color: "#FFFFFF",
    textAlign: "left",
  },
  orderMetaRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  orderMeta: {
    width: "24%",
    backgroundColor: C.graySoft,
    borderRadius: 6,
    padding: 5,
  },
  orderMetaLabel: {
    fontSize: 6.4,
    color: C.muted,
    textAlign: "right",
  },
  orderMetaValue: {
    fontSize: 7.2,
    fontWeight: 700,
    color: C.navy,
    textAlign: "right",
    marginTop: 2,
  },
  orderFinanceRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  orderFinance: {
    width: "15.8%",
    borderRightWidth: 2,
    borderRightColor: C.teal,
    paddingRight: 5,
  },
  orderFinanceLabel: {
    fontSize: 6.2,
    color: C.muted,
    textAlign: "right",
  },
  orderFinanceValue: {
    fontFamily: "AqArabic",
    fontWeight: 700,
    fontSize: 7.9,
    color: C.navy,
    textAlign: "right",
    marginTop: 2,
  },
  noteBox: {
    backgroundColor: C.blueSoft,
    borderRadius: 8,
    padding: 8,
    marginBottom: 7,
  },
  noteText: {
    fontSize: 7,
    color: C.text,
    lineHeight: 1.5,
    textAlign: "right",
  },
  definitionRow: {
    flexDirection: "row-reverse",
    backgroundColor: C.paper,
    borderBottomWidth: 0.5,
    borderBottomColor: C.grid,
    minHeight: 33,
  },
  definitionTerm: {
    width: "24%",
    padding: 6,
    fontSize: 7.3,
    fontWeight: 700,
    color: C.navy,
    textAlign: "right",
    backgroundColor: C.tealSoft,
  },
  definitionText: {
    width: "76%",
    padding: 6,
    fontSize: 7.1,
    color: C.text,
    lineHeight: 1.45,
    textAlign: "right",
  },
});

function Header({ payload, section }: { payload: AnyRow; section: string }) {
  const period = String(payload.manifest?.periodKey ?? "—");
  return (
    <>
      <View style={styles.header}>
        <View style={styles.brandWrap}>
          <Text style={styles.brandMark}>AQUAVO</Text>
          <View style={styles.brandBar} />
        </View>
        <View style={styles.headerMeta}>
          <Text style={styles.period}>{periodLabel(period)}</Text>
          <Text style={styles.smallMuted}>تقرير مالي وإداري شهري · {section}</Text>
          <Text style={styles.smallMuted}>توليد: {dateBaghdad(payload.manifest?.generatedAt)}</Text>
        </View>
      </View>
      <View style={styles.topRule}>
        <View style={styles.topRuleTeal} />
        <View style={styles.topRuleNavy} />
      </View>
    </>
  );
}

function Footer({ payload }: { payload: AnyRow }) {
  const taxFinal = payload.manifest?.taxFinal === true;
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>
        {taxFinal
          ? "فترة موسومة TAX FINAL في النظام"
          : "تقرير إدارة ومحاسبة داخلي غير مدقق — لا يُعد إقراراً ضريبياً أو قوائم مالية مدققة"}
      </Text>
      <Text
        style={styles.pageNumber}
        render={({ pageNumber, totalPages }) => String(pageNumber) + " / " + String(totalPages)}
      />
    </View>
  );
}

function ReportPage({
  payload,
  section,
  title,
  subtitle,
  children,
}: {
  payload: AnyRow;
  section: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Page size="A4" orientation="landscape" style={styles.page}>
      <Header payload={payload} section={section} />
      <View style={styles.pageTitleRow}>
        <View style={{ width: "78%" }}>
          <Text style={styles.pageTitle}>{title}</Text>
          {subtitle ? <Text style={styles.pageSubtitle}>{subtitle}</Text> : null}
        </View>
        <Text style={styles.sectionPill}>{section}</Text>
      </View>
      {children}
      <Footer payload={payload} />
    </Page>
  );
}

function ArrowGlyph({ direction = "left", color = C.teal }: { direction?: "left" | "up" | "down"; color?: string }) {
  if (direction === "up" || direction === "down") {
    const up = direction === "up";
    return (
      <Svg width={8} height={9} viewBox="0 0 8 9">
        <Line x1="4" y1={up ? "8" : "1"} x2="4" y2={up ? "2" : "7"} stroke={color} strokeWidth={1.3} />
        <Path d={up ? "M1 4 L4 1 L7 4 Z" : "M1 5 L4 8 L7 5 Z"} fill={color} />
      </Svg>
    );
  }
  return (
    <Svg width={24} height={12} viewBox="0 0 24 12">
      <Line x1="22" y1="6" x2="5" y2="6" stroke={color} strokeWidth={1.4} />
      <Path d="M5 2 L1 6 L5 10 Z" fill={color} />
    </Svg>
  );
}

function Delta({
  current,
  previous,
  invert = false,
}: {
  current: unknown;
  previous: unknown;
  invert?: boolean;
}) {
  const d = deltaNumber(current, previous);
  if (d == null) return <Text style={[styles.deltaText, { color: C.subtle }]}>بدون مقارنة</Text>;
  const good = invert ? d <= 0 : d >= 0;
  const color = d === 0 ? C.subtle : good ? C.green : C.red;
  return (
    <View style={styles.deltaRow}>
      <ArrowGlyph direction={d >= 0 ? "up" : "down"} color={color} />
      <Text style={[styles.deltaText, { color }]}>{Math.abs(d).toFixed(1)}%</Text>
      <Text style={styles.deltaNote}>عن السابق</Text>
    </View>
  );
}

function KpiCard({
  label,
  value,
  note,
  current,
  previous,
  invert = false,
}: {
  label: string;
  value: string;
  note?: string;
  current?: unknown;
  previous?: unknown;
  invert?: boolean;
}) {
  return (
    <View style={styles.kpiCard}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
      {current !== undefined && previous !== undefined ? (
        <Delta current={current} previous={previous} invert={invert} />
      ) : note ? (
        <Text style={[styles.deltaNote, { marginTop: 5, textAlign: "right" }]}>{note}</Text>
      ) : null}
    </View>
  );
}

function polar(cx: number, cy: number, r: number, angle: number) {
  const a = ((angle - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function donutPath(cx: number, cy: number, outer: number, inner: number, start: number, end: number): string {
  const startOuter = polar(cx, cy, outer, end);
  const endOuter = polar(cx, cy, outer, start);
  const startInner = polar(cx, cy, inner, start);
  const endInner = polar(cx, cy, inner, end);
  const large = end - start <= 180 ? 0 : 1;
  return [
    "M", startOuter.x, startOuter.y,
    "A", outer, outer, 0, large, 0, endOuter.x, endOuter.y,
    "L", startInner.x, startInner.y,
    "A", inner, inner, 0, large, 1, endInner.x, endInner.y,
    "Z",
  ].join(" ");
}

type DonutSegment = { label: string; value: number; color: string };

function DonutChart({
  segments,
  centerLabel,
  centerValue,
}: {
  segments: DonutSegment[];
  centerLabel: string;
  centerValue: string;
}) {
  const usable = segments.filter((s) => Number.isFinite(s.value) && s.value > 0);
  const total = usable.reduce((sum, s) => sum + s.value, 0);
  let angle = 0;
  const paths = usable.map((s) => {
    const span = total > 0 ? (s.value / total) * 360 : 0;
    const d = donutPath(60, 60, 47, 29, angle, angle + span);
    angle += span;
    return { ...s, d, pct: total > 0 ? (s.value / total) * 100 : 0 };
  });
  return (
    <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }}>
      <View style={{ width: 145, alignItems: "center" }}>
        <Svg width={120} height={120} viewBox="0 0 120 120">
          <Circle cx="60" cy="60" r="47" fill="#EEF2F3" />
          {paths.map((s) => <Path key={s.label} d={s.d} fill={s.color} />)}
          <Circle cx="60" cy="60" r="29" fill={C.paper} />
        </Svg>
        <View style={{ position: "absolute", top: 42, left: 18, width: 109, alignItems: "center" }}>
          <Text style={{ fontFamily: "AqArabic", fontWeight: 700, fontSize: 11, color: C.navy }}>{centerValue}</Text>
          <Text style={{ fontSize: 6.5, color: C.muted, marginTop: 2 }}>{centerLabel}</Text>
        </View>
      </View>
      <View style={{ width: 175 }}>
        {paths.map((s) => (
          <View key={s.label} style={{ flexDirection: "row-reverse", alignItems: "center", marginBottom: 5 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: s.color, marginLeft: 6 }} />
            <View style={{ flexGrow: 1 }}>
              <Text style={{ fontSize: 6.8, color: C.text, textAlign: "right" }}>{s.label}</Text>
            </View>
            <Text style={{ fontFamily: "Helvetica", fontSize: 6.5, color: C.muted, marginRight: 5 }}>
              {s.pct.toFixed(1)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

type WaterfallItem = {
  label: string;
  start: number;
  end: number;
  delta: number;
  color: string;
  total?: boolean;
};

function buildWaterfall(summary: AnyRow, net: number | null): WaterfallItem[] {
  const revenue = finiteNumber(summary.product_revenue) ?? 0;
  const cogs = finiteNumber(summary.cogs) ?? 0;
  const fulfillment = finiteNumber(summary.fulfillment_cost) ?? 0;
  const delivery = finiteNumber(summary.delivery_subsidy) ?? 0;
  const rounding = finiteNumber(summary.rounding_adjustment) ?? 0;
  const returns = (finiteNumber(summary.sales_returns) ?? 0)
    + (finiteNumber(summary.actual_return_loss) ?? 0)
    + (finiteNumber(summary.verified_expenses) ?? 0)
    + (finiteNumber(summary.fx_net_expense) ?? 0);

  let cursor = revenue;
  const out: WaterfallItem[] = [
    { label: "المبيعات", start: 0, end: revenue, delta: revenue, color: C.navy, total: true },
  ];
  const push = (label: string, delta: number, color: string) => {
    const start = cursor;
    cursor += delta;
    out.push({ label, start, end: cursor, delta, color });
  };
  push("COGS", -cogs, C.red);
  push("التجهيز", -fulfillment, "#D96B5F");
  push("دعم التوصيل", -delivery, "#E58A68");
  if (rounding !== 0) push("التقريب", rounding, rounding >= 0 ? C.teal2 : "#C47B68");
  if (returns !== 0) push("راجعات/مصاريف", -returns, "#B98670");
  out.push({ label: "الصافي", start: 0, end: net ?? cursor, delta: net ?? cursor, color: C.teal, total: true });
  return out;
}

function WaterfallChart({ summary, net }: { summary: AnyRow; net: number | null }) {
  const items = buildWaterfall(summary, net);
  const chartWidth = 410;
  const chartHeight = 150;
  const top = 8;
  const bottom = 18;
  const plotHeight = chartHeight - top - bottom;
  const allValues = items.flatMap((i) => [i.start, i.end, 0]);
  const min = Math.min(...allValues);
  const max = Math.max(...allValues, 1);
  const span = max - min || 1;
  const y = (v: number) => top + ((max - v) / span) * plotHeight;
  const count = items.length;
  const barW = 34;
  const gap = (chartWidth - 20 - count * barW) / Math.max(1, count - 1);
  const xs = items.map((_, idx) => 10 + idx * (barW + gap));

  return (
    <>
      <Svg width={chartWidth} height={chartHeight} viewBox={"0 0 " + chartWidth + " " + chartHeight}>
        <Line x1="8" y1={y(0)} x2={chartWidth - 6} y2={y(0)} stroke="#C9D4D9" strokeWidth={0.8} />
        {items.map((item, idx) => {
          const high = Math.max(item.start, item.end);
          const low = Math.min(item.start, item.end);
          const rectY = y(high);
          const rectH = Math.max(2, y(low) - y(high));
          const level = item.end;
          const nextX = idx < count - 1 ? xs[idx + 1] : xs[idx];
          return (
            <React.Fragment key={item.label + idx}>
              {!item.total && (
                <Line
                  x1={xs[idx - 1] + barW}
                  y1={y(item.start)}
                  x2={xs[idx]}
                  y2={y(item.start)}
                  stroke="#AFC0C6"
                  strokeWidth={0.7}
                  strokeDasharray="2 2"
                />
              )}
              <Rect x={xs[idx]} y={rectY} width={barW} height={rectH} rx="3" fill={item.color} />
              {idx < count - 1 && (
                <Line
                  x1={xs[idx] + barW}
                  y1={y(level)}
                  x2={nextX}
                  y2={y(level)}
                  stroke="#AFC0C6"
                  strokeWidth={0.6}
                  strokeDasharray="2 2"
                />
              )}
            </React.Fragment>
          );
        })}
      </Svg>
      <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 3, marginTop: -8 }}>
        {items.map((item) => (
          <View key={item.label} style={{ width: 53, alignItems: "center" }}>
            <Text style={{ fontSize: 5.8, color: C.muted, textAlign: "center" }}>{item.label}</Text>
            <Text style={{ fontFamily: "AqArabic", fontWeight: 700, fontSize: 6.1, color: C.navy, marginTop: 2 }}>
              {item.total
                ? compactMoney(item.end)
                : (item.delta < 0 ? "−" : "+") + compactMoney(Math.abs(item.delta))}
            </Text>
          </View>
        ))}
      </View>
    </>
  );
}

function SimpleBars({
  rows,
}: {
  rows: Array<{ label: string; value: number; valueLabel?: string; color?: string; meta?: string }>;
}) {
  const max = Math.max(1, ...rows.map((r) => Math.max(0, r.value)));
  return (
    <View>
      {rows.map((r) => (
        <View key={r.label} style={styles.barRow}>
          <View style={styles.barTop}>
            <Text style={styles.barLabel}>{r.label}</Text>
            <Text style={styles.barValue}>{r.valueLabel ?? iqd(r.value)}{r.meta ? " · " + r.meta : ""}</Text>
          </View>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: Math.max(r.value > 0 ? 4 : 0, (r.value / max) * 100) + "%", backgroundColor: r.color ?? C.teal }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

function SectionHeader({ title, note }: { title: string; note?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderTitle}>{title}</Text>
      {note ? <Text style={styles.sectionHeaderNote}>{note}</Text> : <View />}
    </View>
  );
}

function FlowArrow() {
  return (
    <View style={{ width: 26, alignItems: "center" }}>
      <ArrowGlyph direction="left" />
    </View>
  );
}

function FlowBox({ label, value, tone }: { label: string; value: unknown; tone?: "teal" | "red" | "navy" }) {
  const color = tone === "red" ? C.red : tone === "teal" ? C.teal : C.navy;
  return (
    <View style={[styles.flowBox, { borderTopWidth: 3, borderTopColor: color }]}>
      <Text style={styles.flowLabel}>{label}</Text>
      <Text style={[styles.flowValue, { color }]}>{iqd(value)}</Text>
    </View>
  );
}

function AccountingFlow({ summary, gross, net }: { summary: AnyRow; gross: number | null; net: number | null }) {
  return (
    <View style={styles.flowRow}>
      <FlowBox label="مبيعات المنتجات" value={summary.product_revenue} tone="navy" />
      <FlowArrow />
      <FlowBox label="كلفة المنتجات" value={summary.cogs} tone="red" />
      <FlowArrow />
      <FlowBox label="الربح الإجمالي" value={gross} tone="teal" />
      <FlowArrow />
      <FlowBox label="تشغيل + توصيل + مصاريف" value={
        (finiteNumber(summary.fulfillment_cost) ?? 0)
        + (finiteNumber(summary.delivery_subsidy) ?? 0)
        + (finiteNumber(summary.sales_returns) ?? 0)
        + (finiteNumber(summary.actual_return_loss) ?? 0)
        + (finiteNumber(summary.verified_expenses) ?? 0)
        + (finiteNumber(summary.fx_net_expense) ?? 0)
      } tone="red" />
      <FlowArrow />
      <FlowBox label="صافي النتيجة" value={net} tone="teal" />
    </View>
  );
}

type TableColumn = { label: string; width: number; numeric?: boolean };

function DataTable({
  columns,
  rows,
}: {
  columns: TableColumn[];
  rows: Array<Array<string | number | null | undefined>>;
}) {
  return (
    <View style={styles.table}>
      <View style={styles.tableHeader} fixed>
        {columns.map((col) => (
          <View key={col.label} style={[styles.tableCell, { width: col.width + "%" }]}>
            <Text style={styles.tableHeaderText}>{col.label}</Text>
          </View>
        ))}
      </View>
      {rows.length ? rows.map((row, rowIndex) => (
        <View key={String(rowIndex)} style={[styles.tableRow, rowIndex % 2 ? styles.tableRowAlt : {}]} wrap={false}>
          {columns.map((col, colIndex) => (
            <View key={col.label + colIndex} style={[styles.tableCell, { width: col.width + "%" }]}>
              <Text style={col.numeric ? styles.tableNumber : styles.tableText}>
                {row[colIndex] == null || row[colIndex] === "" ? "—" : String(row[colIndex])}
              </Text>
            </View>
          ))}
        </View>
      )) : (
        <View style={[styles.tableRow, { minHeight: 34, justifyContent: "center" }]}>
          <View style={{ width: "100%", padding: 8 }}>
            <Text style={[styles.tableText, { textAlign: "center", color: C.muted }]}>لا توجد بيانات</Text>
          </View>
        </View>
      )}
    </View>
  );
}

function CompareCard({
  label,
  current,
  previous,
  formatter,
  invert = false,
}: {
  label: string;
  current: unknown;
  previous: unknown;
  formatter: (v: unknown) => string;
  invert?: boolean;
}) {
  return (
    <View style={styles.compareCard}>
      <Text style={styles.compareLabel}>{label}</Text>
      <Text style={styles.compareCurrent}>{formatter(current)}</Text>
      <Text style={styles.comparePrevious}>السابق: {formatter(previous)}</Text>
      <Delta current={current} previous={previous} invert={invert} />
    </View>
  );
}

function GanttTimeline({ periodKey }: { periodKey: string }) {
  const [year, month] = periodKey.split("-").map(Number);
  const days = year && month ? new Date(Date.UTC(year, month, 0)).getUTCDate() : 30;
  const phases = [
    { no: "01", title: "تجميع المبيعات", from: 1, to: 10, color: C.navy },
    { no: "02", title: "التسويات والكلف", from: 11, to: 20, color: C.teal },
    { no: "03", title: "المراجعة والمطابقة", from: 21, to: Math.max(21, days - 2), color: "#4E8CAD" },
    { no: "04", title: "الإقفال وإصدار التقرير", from: Math.max(22, days - 1), to: days, color: C.green },
  ];
  return (
    <>
      <View style={styles.ganttTrack}>
        {phases.map((p) => {
          const width = Math.max(4, ((p.to - p.from + 1) / days) * 100);
          return <View key={p.no} style={{ width: width + "%", backgroundColor: p.color }} />;
        })}
      </View>
      <View style={styles.ganttLegend}>
        {phases.map((p) => (
          <View key={p.no} style={styles.ganttPhase}>
            <Text style={styles.ganttPhaseNo}>{p.no}</Text>
            <Text style={styles.ganttPhaseTitle}>{p.title}</Text>
            <Text style={styles.ganttPhaseDate}>{String(p.from).padStart(2, "0")}–{String(p.to).padStart(2, "0")}</Text>
          </View>
        ))}
      </View>
    </>
  );
}

function CheckCard({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  const bg = ok ? C.greenSoft : C.redSoft;
  const fg = ok ? C.green : C.red;
  return (
    <View style={styles.checkCard}>
      <View style={styles.checkTop}>
        <Text style={styles.checkLabel}>{label}</Text>
        <Text style={[styles.checkBadge, { backgroundColor: bg, color: fg }]}>{ok ? "مطابق" : "مراجعة"}</Text>
      </View>
      <Text style={styles.checkValue}>{value}</Text>
    </View>
  );
}

type OrderPart = { order: AnyRow; items: AnyRow[]; partIndex: number; partCount: number; weight: number };

function splitOrder(order: AnyRow): OrderPart[] {
  const groups = chunks(safeArray(order.items), 5);
  if (!groups.length) {
    return [{ order, items: [], partIndex: 0, partCount: 1, weight: 3.4 }];
  }
  return groups.map((items, index) => ({
    order,
    items,
    partIndex: index,
    partCount: groups.length,
    weight: (index === 0 ? 3.4 : 2.0) + Math.max(1, items.length) * 0.62,
  }));
}

function groupOrderParts(sales: AnyRow[]): OrderPart[][] {
  const parts = sales.flatMap(splitOrder);
  const groups: OrderPart[][] = [];
  let current: OrderPart[] = [];
  let weight = 0;
  for (const part of parts) {
    if (current.length && (current.length >= 2 || weight + part.weight > 9.5)) {
      groups.push(current);
      current = [];
      weight = 0;
    }
    current.push(part);
    weight += part.weight;
  }
  if (current.length) groups.push(current);
  return groups;
}

function OrderCard({ part }: { part: OrderPart }) {
  const order = part.order;
  const address = safeObject(order.shipping_address);
  const orderNo = String(order.order_number ?? order.order_id ?? "—");
  const contribution = orderPeriodContribution(order);
  const allItems = safeArray(order.items);
  const itemRows = part.items.map((item) => {
    const qty = finiteNumber(item.quantity);
    const unitPrice = finiteNumber(item.priceAtPurchase);
    const lineTotal = finiteNumber(item.lineTotal) ?? (qty != null && unitPrice != null ? qty * unitPrice : null);
    return [
      String(item.productName ?? item.productId ?? "—"),
      String(item.variantLabel ?? "—"),
      numberValue(qty),
      iqd(unitPrice),
      iqd(lineTotal),
      iqd(item.costPrice),
      String(item.costStatus ?? "غير متوفر"),
    ];
  });

  return (
    <View style={styles.orderCard} wrap={false}>
      <View style={styles.orderHead}>
        <Text style={styles.orderNo}>
          {orderNo}{part.partCount > 1 ? " · " + String(part.partIndex + 1) + "/" + String(part.partCount) : ""}
        </Text>
        <Text style={styles.orderCustomer}>{String(order.customer_name ?? "عميل غير مسجل")}</Text>
      </View>

      {part.partIndex === 0 ? (
        <>
          <View style={styles.orderMetaRow}>
            {[
              ["المصدر / الحالة", String(order.source ?? "—") + " · " + String(order.status ?? "—")],
              ["الدفع / التسوية", String(order.payment_status ?? "—") + " · " + String(order.settlement_status ?? "—")],
              ["الناقل / المدينة", String(order.accounting_carrier ?? order.operational_carrier ?? "—") + " · " + String(address.city ?? "—")],
              ["التاريخ / البنود", dateOnly(order.order_created_at) + " · " + numberValue(allItems.length)],
            ].map(([label, value]) => (
              <View key={label} style={styles.orderMeta}>
                <Text style={styles.orderMetaLabel}>{label}</Text>
                <Text style={styles.orderMetaValue}>{value}</Text>
              </View>
            ))}
          </View>
          <View style={styles.orderFinanceRow}>
            {[
              ["مبيعات", order.product_revenue],
              ["COD", order.gross_collected],
              ["توصيل", order.customer_delivery_fee],
              ["أجرة ناقل", order.carrier_fee],
              ["COGS", order.cogs_amount],
              ["مساهمة", contribution],
            ].map(([label, value]) => (
              <View key={String(label)} style={styles.orderFinance}>
                <Text style={styles.orderFinanceLabel}>{String(label)}</Text>
                <Text style={styles.orderFinanceValue}>{iqd(value)}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      <DataTable
        columns={[
          { label: "المنتج", width: 30 },
          { label: "الخيار", width: 16 },
          { label: "الكمية", width: 8, numeric: true },
          { label: "سعر الوحدة", width: 12, numeric: true },
          { label: "إجمالي السطر", width: 12, numeric: true },
          { label: "كلفة/وحدة", width: 12, numeric: true },
          { label: "حالة الكلفة", width: 10 },
        ]}
        rows={itemRows}
      />

      {part.partIndex === 0 ? (
        <Text style={[styles.smallMuted, { textAlign: "right", marginTop: 5 }]}>
          تحقق الإيراد: {dateBaghdad(order.recognized_at)} · الإجمالي عند الإنشاء: {iqd(order.order_total)}
          {" · "}بعد التقريب: {iqd(order.rounded_total)} · الخصم: {iqd(order.discount_total)}
          {" · "}خصم النقاط: {iqd(order.points_discount)}
        </Text>
      ) : null}
    </View>
  );
}

function AppendixTablePages({
  payload,
  section,
  title,
  subtitle,
  columns,
  rows,
  pageSize,
}: {
  payload: AnyRow;
  section: string;
  title: string;
  subtitle: string;
  columns: TableColumn[];
  rows: Array<Array<string | number | null | undefined>>;
  pageSize: number;
}) {
  if (!rows.length) return null;
  const groups = chunks(rows, pageSize);
  return (
    <>
      {groups.map((group, index) => (
        <ReportPage
          key={section + index}
          payload={payload}
          section={section}
          title={title}
          subtitle={subtitle + (groups.length > 1 ? " · جزء " + String(index + 1) + " من " + String(groups.length) : "")}
        >
          <DataTable columns={columns} rows={group} />
        </ReportPage>
      ))}
    </>
  );
}

function AccountantPdfDocument({ payload }: { payload: AnyRow }) {
  const summary: AnyRow = payload.readiness ?? {};
  const previous: AnyRow | null = payload.previousReadiness ?? null;
  const balances: AnyRow[] = Array.isArray(payload.liveBalances) ? payload.liveBalances : [];
  const sales: AnyRow[] = Array.isArray(payload.sales) ? payload.sales : [];
  const journal: AnyRow[] = Array.isArray(payload.journal) ? payload.journal : [];
  const expenses: AnyRow[] = Array.isArray(payload.expenses) ? payload.expenses : [];
  const returns: AnyRow[] = Array.isArray(payload.returns) ? payload.returns : [];
  const settlements: AnyRow[] = Array.isArray(payload.settlements) ? payload.settlements : [];
  const openingInventory: AnyRow[] = Array.isArray(payload.openingInventory) ? payload.openingInventory : [];
  const monthlyPositions: AnyRow[] = Array.isArray(payload.monthlyPositions) ? payload.monthlyPositions : [];
  const evidenceIndex: AnyRow[] = Array.isArray(payload.evidenceIndex) ? payload.evidenceIndex : [];
  const blockers: AnyRow[] = Array.isArray(summary.blockers) ? summary.blockers : [];
  const profile: AnyRow = payload.profile ?? {};
  const close: AnyRow = payload.close ?? {};
  const periodKey = String(payload.manifest?.periodKey ?? "—");
  const closeStatus = String(close.status ?? "").toLowerCase();
  const currentOpenPeriod = generatedPeriod(payload.manifest?.generatedAt) === periodKey
    && !["closed", "tax_final"].includes(closeStatus);

  const balanceMap = new Map<string, number>();
  for (const row of balances) {
    const value = finiteNumber(row?.balance);
    if (value != null) balanceMap.set(String(row.code), value);
  }

  const net = canonicalNetProfit(summary);
  const gross = grossProfit(summary);
  const grossMargin = ratio(gross, summary.product_revenue);
  const netMargin = ratio(net, summary.product_revenue);
  const orderCount = finiteNumber(summary.realized_orders);
  const avgOrder = orderCount && orderCount > 0 && finiteNumber(summary.product_revenue) != null
    ? Number(summary.product_revenue) / orderCount
    : null;

  const settledCount = sales.filter((row) =>
    ["matched", "reconciled", "closed"].includes(String(row.settlement_status ?? "").toLowerCase()),
  ).length;
  const unsettledCount = sales.length - settledCount;
  const webOrders = sales.filter((row) => String(row.source ?? "").toLowerCase() === "website").length;
  const whatsappOrders = sales.filter((row) => String(row.source ?? "").toLowerCase() === "whatsapp").length;
  const otherOrders = Math.max(0, sales.length - webOrders - whatsappOrders);
  const settleRate = sales.length ? (settledCount / sales.length) * 100 : null;

  const products = aggregateProducts(sales);
  const topProducts = products.filter((row) => row.revenueKnown).slice(0, 8);
  const totalItemRevenue = products.filter((row) => row.revenueKnown).reduce((sum, row) => sum + row.revenue, 0);
  const topProductShare = topProducts[0] && totalItemRevenue > 0 ? (topProducts[0].revenue / totalItemRevenue) * 100 : null;

  const biggestCost = [
    { label: "كلفة المنتجات", value: finiteNumber(summary.cogs) ?? 0 },
    { label: "كلفة التجهيز", value: finiteNumber(summary.fulfillment_cost) ?? 0 },
    { label: "دعم التوصيل", value: finiteNumber(summary.delivery_subsidy) ?? 0 },
    {
      label: "الراجعات والخسائر",
      value: (finiteNumber(summary.sales_returns) ?? 0) + (finiteNumber(summary.actual_return_loss) ?? 0),
    },
    { label: "المصاريف الموثقة", value: finiteNumber(summary.verified_expenses) ?? 0 },
  ].sort((a, b) => b.value - a.value)[0];

  const costDistribution: DonutSegment[] = [
    { label: "كلفة المنتجات", value: Math.max(0, finiteNumber(summary.cogs) ?? 0), color: C.navy },
    { label: "كلفة التجهيز", value: Math.max(0, finiteNumber(summary.fulfillment_cost) ?? 0), color: "#4E8CAD" },
    { label: "دعم التوصيل", value: Math.max(0, finiteNumber(summary.delivery_subsidy) ?? 0), color: "#9AB9C5" },
    {
      label: "راجعات ومصاريف",
      value: Math.max(
        0,
        (finiteNumber(summary.sales_returns) ?? 0)
          + (finiteNumber(summary.actual_return_loss) ?? 0)
          + (finiteNumber(summary.verified_expenses) ?? 0)
          + (finiteNumber(summary.fx_net_expense) ?? 0),
      ),
      color: "#C98475",
    },
  ];

  const liquidSegments: DonutSegment[] = [
    { label: "الصندوق", value: Math.max(0, balanceMap.get("1000") ?? 0), color: C.teal },
    { label: "البنك", value: Math.max(0, balanceMap.get("1010") ?? 0), color: "#4E8CAD" },
    { label: "COD لدى الشركات", value: Math.max(0, balanceMap.get("1100") ?? 0), color: C.navy },
  ];

  const sourceSegments: DonutSegment[] = [
    { label: "الموقع", value: webOrders, color: C.teal },
    { label: "واتساب", value: whatsappOrders, color: C.navy },
    { label: "مصادر أخرى", value: otherOrders, color: "#9AB9C5" },
  ];

  const salesDelta = previous ? deltaNumber(summary.product_revenue, previous.product_revenue) : null;
  const codRatio = ratio(balanceMap.get("1100"), summary.product_revenue);

  const accountantNotes = [
    orderCount != null
      ? "تحقق " + numberValue(orderCount) + " طلباً بمتوسط " + iqd(avgOrder) + " للطلب."
      : "عدد الطلبات المتحققة غير متوفر.",
    grossMargin != null
      ? "كلفة المنتجات تركت هامشاً إجمالياً قدره " + percent(grossMargin) + "."
      : "الهامش الإجمالي غير قابل للحساب.",
    biggestCost && biggestCost.value > 0
      ? "أكبر بند تكلفة في الفترة هو " + biggestCost.label + " بقيمة " + iqd(biggestCost.value) + "."
      : "لا يوجد بند تكلفة رئيسي مسجل.",
    unsettledCount > 0
      ? "يوجد " + numberValue(unsettledCount) + " طلباً يحتاج متابعة تسوية."
      : "كل الطلبات الظاهرة تحمل حالة تسوية مطابقة/مغلقة.",
  ];

  const completedSettlements = settlements.filter((row) =>
    ["reconciled", "closed"].includes(String(row.status ?? "").toLowerCase()),
  );
  const pendingSettlements = settlements.length - completedSettlements.length;

  const orderRevenueTotal = sumKnown(sales, "product_revenue");
  const orderCogsTotal = sumKnown(sales, "cogs_amount");
  const orderFulfillmentTotal = sumKnown(sales, "fulfillment_cost");
  const restockCogs = verifiedRestockCogs(returns);
  const expectedPeriodCogs = orderCogsTotal == null ? null : orderCogsTotal - restockCogs;
  const revenueDiff = finiteNumber(summary.product_revenue) != null && orderRevenueTotal != null
    ? Number(summary.product_revenue) - orderRevenueTotal
    : null;
  const cogsDiff = finiteNumber(summary.cogs) != null && expectedPeriodCogs != null
    ? Number(summary.cogs) - expectedPeriodCogs
    : null;
  const fulfillmentDiff = finiteNumber(summary.fulfillment_cost) != null && orderFulfillmentTotal != null
    ? Number(summary.fulfillment_cost) - orderFulfillmentTotal
    : null;

  const checks = [
    {
      label: "ميزان اليومية",
      value: iqd(summary.journal_difference),
      ok: Math.abs(finiteNumber(summary.journal_difference) ?? Infinity) < 0.5,
    },
    {
      label: "عدد الطلبات",
      value: numberValue(summary.realized_orders) + " / " + numberValue(sales.length),
      ok: finiteNumber(summary.realized_orders) === sales.length,
    },
    {
      label: "إيراد المنتجات",
      value: iqd(revenueDiff),
      ok: revenueDiff != null && Math.abs(revenueDiff) < 0.5,
    },
    {
      label: "COGS بعد الراجعات",
      value: iqd(cogsDiff),
      ok: cogsDiff != null && Math.abs(cogsDiff) < 0.5,
    },
    {
      label: "كلفة التجهيز",
      value: iqd(fulfillmentDiff),
      ok: fulfillmentDiff != null && Math.abs(fulfillmentDiff) < 0.5,
    },
    {
      label: "موانع الإغلاق",
      value: numberValue(blockers.length),
      ok: blockers.length === 0,
    },
  ];

  const orderIndexRows = sales.map((row) => [
    String(row.order_number ?? row.order_id ?? "—"),
    dateBaghdad(row.recognized_at),
    String(row.source ?? "—"),
    iqd(row.product_revenue),
    iqd(row.cogs_amount),
    iqd(row.fulfillment_cost),
    iqd(orderPeriodContribution(row)),
    String(row.settlement_status ?? "—"),
  ]);

  const expenseRows = expenses.map((row) => [
    dateBaghdad(row.expense_occurred_at ?? row.expense_date),
    String(row.category ?? "—"),
    String(row.vendor_name ?? "—"),
    String(row.description ?? "—"),
    iqd(row.amount),
    String(row.accounting_status ?? "—"),
    String(row.tax_treatment ?? "pending"),
  ]);

  const returnRows = returns.map((row) => [
    String(row.order_id ?? "—"),
    String(row.type ?? "—"),
    String(row.status ?? "—"),
    iqd(row.refund_amount),
    iqd(row.packaging_loss),
    iqd(row.product_write_off_amount),
    row.restocked ? "نعم" : "لا",
    dateBaghdad(row.updated_at),
  ]);

  const settlementRows = settlements.map((row) => [
    String(row.settlement_number ?? row.id ?? "—"),
    String(row.carrier ?? "—"),
    dateBaghdad(row.received_at ?? row.updated_at),
    iqd(row.gross_amount),
    iqd(row.fees_amount),
    iqd(row.net_amount),
    String(row.status ?? "—"),
  ]);

  const journalRows = flattenJournal(journal).map((row) => [
    String(row.entry_number ?? "—"),
    dateBaghdad(row.entry_date),
    String(row.source_type ?? "—") + "/" + String(row.event_kind ?? "—"),
    String(row.accountCode ?? "—") + " " + String(row.accountName ?? ""),
    String(row.memo ?? row.description ?? "—"),
    iqd(row.debit),
    iqd(row.credit),
  ]);

  const inventoryRows = openingInventory.map((row) => [
    String(row.product_id ?? "—"),
    String(row.variant_id ?? "—"),
    numberValue(row.quantity ?? row.stock),
    iqd(row.unit_cost_iqd ?? row.unit_cost ?? row.cost_price),
    iqd(row.value_iqd ?? row.total_cost ?? row.total_value ?? row.inventory_value),
    String(row.cost_source ?? row.cost_status ?? row.source ?? "—"),
  ]);

  const evidenceRows = evidenceIndex.map((row) => [
    String(row.document_type ?? "—"),
    String(row.issuer ?? "—"),
    String(row.document_number ?? "—"),
    String(row.document_date ?? "—"),
    iqd(row.amount),
    String(row.storage_provider ?? "—"),
  ]);

  const orderPartGroups = groupOrderParts(sales);

  return (
    <Document
      title={"AQUAVO Monthly Accounting " + periodKey}
      author="AQUAVO"
      subject="Monthly professional management accounting report - VECTOR V6"
      keywords="AQUAVO, accounting, monthly report, finance"
    >
      <ReportPage
        payload={payload}
        section="01 · الملخص التنفيذي"
        title={"التحليل المالي الشهري — " + periodLabel(periodKey)}
        subtitle="صفحة قراءة سريعة: الأداء، الربحية، اتجاه الشهر، وأهم الملاحظات قبل التفاصيل"
      >
        <View style={styles.hero}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroEyebrow}>AQUAVO · MONTHLY MANAGEMENT ACCOUNTING · VECTOR V6</Text>
            <Text style={styles.heroTitle}>ملخص الأداء المالي: من المبيعات إلى صافي النتيجة.</Text>
            <Text style={styles.heroNote}>
              تقرير بصري مبني على دفتر الأستاذ، حقائق الطلبات، التسويات والمصاريف الموثقة. الأرقام الناقصة تبقى ظاهرة ولا تتحول تلقائياً إلى صفر.
            </Text>
          </View>
          <View style={styles.heroStatus}>
            <Text style={styles.heroStatusLabel}>حالة الإغلاق</Text>
            <Text style={styles.heroStatusValue}>
              {payload.manifest?.taxFinal ? "TAX FINAL" : blockers.length ? "يحتاج مراجعة" : "جاهز إدارياً"}
            </Text>
            <Text style={[styles.heroStatusLabel, { marginTop: 5 }]}>
              {blockers.length ? numberValue(blockers.length) + " مانع/نوع" : "لا توجد موانع مسجلة"}
            </Text>
          </View>
        </View>

        <View style={styles.kpiRow}>
          <KpiCard
            label="مبيعات المنتجات"
            value={iqd(summary.product_revenue)}
            current={summary.product_revenue}
            previous={previous?.product_revenue}
          />
          <KpiCard
            label="كلفة المنتجات"
            value={iqd(summary.cogs)}
            current={summary.cogs}
            previous={previous?.cogs}
            invert
          />
          <KpiCard label="الربح الإجمالي" value={iqd(gross)} note={"هامش " + percent(grossMargin)} />
          <KpiCard label="صافي النتيجة" value={iqd(net)} note={"هامش " + percent(netMargin)} />
          <KpiCard
            label="الطلبات"
            value={numberValue(summary.realized_orders)}
            current={summary.realized_orders}
            previous={previous?.realized_orders}
          />
          <KpiCard label="متوسط الطلب" value={iqd(avgOrder)} note={"تسوية " + percent(settleRate)} />
        </View>

        <View style={styles.twoCol}>
          <View style={[styles.chartCard, { width: "58%" }]}>
            <Text style={styles.chartTitle}>جسر الربحية — من المبيعات إلى صافي النتيجة</Text>
            <Text style={styles.chartSubtitle}>كل عمود يوضح أثر البند على الرصيد التراكمي للفترة</Text>
            <WaterfallChart summary={summary} net={net} />
          </View>
          <View style={[styles.chartCard, { width: "40%" }]}>
            <Text style={styles.chartTitle}>توزيع نتيجة الشهر وبنود التكلفة</Text>
            <Text style={styles.chartSubtitle}>الدائرة توزع بنود التكلفة فقط؛ صافي النتيجة يظهر كمؤشر مستقل حتى لا تختلط الربحية بالمصروفات.</Text>
            <DonutChart
              segments={costDistribution}
              centerLabel="إجمالي التكلفة"
              centerValue={compactMoney(costDistribution.reduce((sum, item) => sum + item.value, 0))}
            />
          </View>
        </View>

        <View style={styles.insightGrid}>
          {accountantNotes.map((note, index) => (
            <View key={String(index)} style={styles.insightCard}>
              <Text style={styles.insightTitle}>ملاحظة {String(index + 1).padStart(2, "0")}</Text>
              <Text style={styles.insightText}>{note}</Text>
            </View>
          ))}
        </View>
      </ReportPage>

      <ReportPage
        payload={payload}
        section="02 · تحليل الربحية"
        title="قراءة الربح والتكاليف"
        subtitle="تحليل يوضح نسبة كل تكلفة من المبيعات والتسلسل المحاسبي الذي أنتج صافي النتيجة"
      >
        <AccountingFlow summary={summary} gross={gross} net={net} />

        <View style={styles.twoCol}>
          <View style={[styles.chartCard, { width: "55%" }]}>
            <Text style={styles.chartTitle}>وزن بنود التكلفة من المبيعات</Text>
            <Text style={styles.chartSubtitle}>النسبة تحت كل بند = البند ÷ مبيعات المنتجات</Text>
            <SimpleBars
              rows={[
                {
                  label: "كلفة المنتجات",
                  value: Math.max(0, finiteNumber(summary.cogs) ?? 0),
                  valueLabel: iqd(summary.cogs),
                  meta: percent(ratio(summary.cogs, summary.product_revenue)),
                  color: C.navy,
                },
                {
                  label: "كلفة التجهيز",
                  value: Math.max(0, finiteNumber(summary.fulfillment_cost) ?? 0),
                  valueLabel: iqd(summary.fulfillment_cost),
                  meta: percent(ratio(summary.fulfillment_cost, summary.product_revenue)),
                  color: C.teal,
                },
                {
                  label: "دعم التوصيل",
                  value: Math.max(0, finiteNumber(summary.delivery_subsidy) ?? 0),
                  valueLabel: iqd(summary.delivery_subsidy),
                  meta: percent(ratio(summary.delivery_subsidy, summary.product_revenue)),
                  color: "#4E8CAD",
                },
                {
                  label: "الراجعات والخسائر",
                  value: Math.max(
                    0,
                    (finiteNumber(summary.sales_returns) ?? 0) + (finiteNumber(summary.actual_return_loss) ?? 0),
                  ),
                  valueLabel: iqd(
                    (finiteNumber(summary.sales_returns) ?? 0) + (finiteNumber(summary.actual_return_loss) ?? 0),
                  ),
                  meta: "أثر مباشر",
                  color: "#C98475",
                },
                {
                  label: "المصاريف الموثقة",
                  value: Math.max(0, finiteNumber(summary.verified_expenses) ?? 0),
                  valueLabel: iqd(summary.verified_expenses),
                  meta: percent(ratio(summary.verified_expenses, summary.product_revenue)),
                  color: C.red,
                },
              ]}
            />
          </View>

          <View style={[styles.chartCard, { width: "43%" }]}>
            <Text style={styles.chartTitle}>قراءة المحاسب</Text>
            <View style={styles.callout}>
              <Text style={styles.calloutTitle}>الهامش الإجمالي</Text>
              <Text style={styles.calloutText}>
                مبيعات المنتجات {iqd(summary.product_revenue)} ناقص COGS {iqd(summary.cogs)} = ربح إجمالي {iqd(gross)}، بهامش {percent(grossMargin)}.
              </Text>
            </View>
            <View style={[styles.callout, { marginTop: 7 }]}>
              <Text style={styles.calloutTitle}>صافي النتيجة الإدارية</Text>
              <Text style={styles.calloutText}>
                بعد التجهيز ودعم التوصيل والراجعات والمصاريف وفروقات العملة، النتيجة المسجلة هي {iqd(net)}، أي {percent(netMargin)} من مبيعات المنتجات.
              </Text>
            </View>
            <View style={[styles.callout, { marginTop: 7 }]}>
              <Text style={styles.calloutTitle}>فرق التقريب</Text>
              <Text style={styles.calloutText}>
                حساب 3050 مستقل بقيمة {iqd(summary.rounding_adjustment)}؛ يظهر منفصلاً حتى لا يختلط بالمبيعات أو المصاريف.
              </Text>
            </View>
          </View>
        </View>

        <SectionHeader title="المعادلة المحاسبية المختصرة" />
        <View style={styles.noteBox}>
          <Text style={styles.noteText}>
            صافي النتيجة = مبيعات المنتجات + فرق التقريب − كلفة المنتجات − كلفة التجهيز − دعم التوصيل − مرتجعات المبيعات − خسارة الراجع − المصاريف الموثقة − صافي فرق العملة.
          </Text>
        </View>
      </ReportPage>

      <ReportPage
        payload={payload}
        section="03 · المقارنة الشهرية"
        title="هذا الشهر مقابل الشهر السابق"
        subtitle="هذا الشهر مقابل الشهر السابق؛ المقارنة الاتجاهية لا تُعامل كفارق نهائي إذا كان الشهر الحالي ما زال مفتوحاً"
      >
        {currentOpenPeriod && previous ? (
          <View style={styles.noteBox}>
            <Text style={styles.noteText}>
              تنبيه مهني: الفترة الحالية ما زالت مفتوحة، بينما الفترة السابقة قد تمثل شهراً كاملاً. لذلك تُقرأ نسب التغير أدناه كمؤشرات اتجاهية فقط، لا كتحليل نمو نهائي أو مقارنة like-for-like.
            </Text>
          </View>
        ) : null}
        {previous ? (
          <>
            <View style={styles.compareGrid}>
              <CompareCard label="مبيعات المنتجات" current={summary.product_revenue} previous={previous.product_revenue} formatter={iqd} />
              <CompareCard label="عدد الطلبات" current={summary.realized_orders} previous={previous.realized_orders} formatter={numberValue} />
              <CompareCard label="كلفة المنتجات" current={summary.cogs} previous={previous.cogs} formatter={iqd} invert />
              <CompareCard label="كلفة التجهيز" current={summary.fulfillment_cost} previous={previous.fulfillment_cost} formatter={iqd} invert />
              <CompareCard label="دعم التوصيل" current={summary.delivery_subsidy} previous={previous.delivery_subsidy} formatter={iqd} invert />
              <CompareCard label="المصاريف الموثقة" current={summary.verified_expenses} previous={previous.verified_expenses} formatter={iqd} invert />
              <CompareCard label="الراجعات" current={summary.sales_returns} previous={previous.sales_returns} formatter={iqd} invert />
              <CompareCard label="صافي النتيجة" current={net} previous={canonicalNetProfit(previous)} formatter={iqd} />
            </View>

            <View style={[styles.twoCol, { marginTop: 5 }]}>
              <View style={[styles.chartCard, { width: "62%" }]}>
                <Text style={styles.chartTitle}>حجم الحركة بين الشهرين</Text>
                <SimpleBars
                  rows={[
                    { label: "المبيعات الحالية", value: finiteNumber(summary.product_revenue) ?? 0, valueLabel: iqd(summary.product_revenue), color: C.teal },
                    { label: "المبيعات السابقة", value: finiteNumber(previous.product_revenue) ?? 0, valueLabel: iqd(previous.product_revenue), color: "#9AB9C5" },
                    { label: "صافي النتيجة الحالية", value: Math.max(0, net ?? 0), valueLabel: iqd(net), color: C.navy },
                    { label: "صافي النتيجة السابقة", value: Math.max(0, canonicalNetProfit(previous) ?? 0), valueLabel: iqd(canonicalNetProfit(previous)), color: "#4E8CAD" },
                  ]}
                />
              </View>
              <View style={[styles.callout, { width: "36%" }]}>
                <Text style={styles.calloutTitle}>الخلاصة</Text>
                <Text style={styles.calloutText}>
                  {salesDelta == null
                    ? "لا يمكن حساب نسبة تغير المبيعات بسبب غياب خط أساس صالح."
                    : "المبيعات " + (salesDelta >= 0 ? "ارتفعت " : "انخفضت ") + Math.abs(salesDelta).toFixed(1) + "% عن الشهر السابق."}
                  {" "}المقارنة تصف الحركة فقط؛ تفسير السبب يرجع لصفحات المنتجات والطلبات والمصاريف.
                </Text>
              </View>
            </View>
          </>
        ) : (
          <View style={[styles.callout, { marginTop: 20 }]}>
            <Text style={styles.calloutTitle}>لا توجد فترة سابقة صالحة للمقارنة</Text>
            <Text style={styles.calloutText}>
              التقرير لا يخلط بيانات أرشيفية مختلفة ولا يخترع baseline وهمياً. عند توفر شهر سابق متجانس تظهر المقارنة تلقائياً.
            </Text>
          </View>
        )}
      </ReportPage>

      <ReportPage
        payload={payload}
        section="04 · التحصيل والأرصدة"
        title="التحصيل والأرصدة التشغيلية — أين تتركز الأرصدة؟"
        subtitle="السيولة والتحصيل — أين تتركز الأرصدة؟ قراءة للأرصدة الحية من دفتر الأستاذ، وليست قائمة تدفقات نقدية مكتملة"
      >
        <View style={styles.twoCol}>
          <View style={styles.balanceHero}>
            <Text style={styles.balanceHeroLabel}>COD لدى شركات التوصيل · 1100</Text>
            <Text style={styles.balanceHeroValue}>{iqd(balanceMap.get("1100"))}</Text>
            <Text style={[styles.balanceHeroLabel, { marginTop: 5 }]}>
              يمثل {percent(codRatio)} من مبيعات المنتجات الحالية كمرجع للحجم، وليس كنسبة تحصيل نهائية.
            </Text>
          </View>
          <View style={styles.miniBalanceGrid}>
            <View style={styles.miniBalance}>
              <Text style={styles.miniBalanceLabel}>الصندوق · 1000</Text>
              <Text style={styles.miniBalanceValue}>{iqd(balanceMap.get("1000"))}</Text>
            </View>
            <View style={styles.miniBalance}>
              <Text style={styles.miniBalanceLabel}>البنك · 1010</Text>
              <Text style={styles.miniBalanceValue}>{iqd(balanceMap.get("1010"))}</Text>
            </View>
            <View style={styles.miniBalance}>
              <Text style={styles.miniBalanceLabel}>مخزون المنتجات · 1200</Text>
              <Text style={styles.miniBalanceValue}>{iqd(balanceMap.get("1200"))}</Text>
            </View>
            <View style={styles.miniBalance}>
              <Text style={styles.miniBalanceLabel}>رأس المال · 3100</Text>
              <Text style={styles.miniBalanceValue}>{iqd(balanceMap.get("3100"))}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.twoCol, { marginTop: 9 }]}>
          <View style={[styles.chartCard, { width: "42%" }]}>
            <Text style={styles.chartTitle}>تركيب أرصدة التحصيل والتوفر النقدي</Text>
            <DonutChart segments={liquidSegments} centerLabel="سيولة + COD" centerValue={compactMoney(
              (balanceMap.get("1000") ?? 0) + (balanceMap.get("1010") ?? 0) + (balanceMap.get("1100") ?? 0),
            )} />
          </View>
          <View style={[styles.chartCard, { width: "56%" }]}>
            <Text style={styles.chartTitle}>تحصيلات شركات التوصيل المسجلة</Text>
            <SimpleBars
              rows={[
                { label: "إجمالي COD بالتسويات", value: Math.max(0, sumKnown(completedSettlements, "gross_amount") ?? 0), valueLabel: iqd(sumKnown(completedSettlements, "gross_amount")), color: C.navy },
                { label: "أجور الشركات", value: Math.max(0, sumKnown(completedSettlements, "fees_amount") ?? 0), valueLabel: iqd(sumKnown(completedSettlements, "fees_amount")), color: C.red },
                { label: "الصافي المستلم", value: Math.max(0, sumKnown(completedSettlements, "net_amount") ?? 0), valueLabel: iqd(sumKnown(completedSettlements, "net_amount")), color: C.teal },
              ]}
            />
            <Text style={[styles.smallMuted, { textAlign: "right", marginTop: 6 }]}>
              سجلات منجزة: {numberValue(completedSettlements.length)} · سجلات تحتاج متابعة: {numberValue(pendingSettlements)}
            </Text>
          </View>
        </View>

        <View style={[styles.noteBox, { marginTop: 8 }]}>
          <Text style={styles.noteText}>
            هذا القسم لا يُسمّى Statement of Cash Flows وفق IAS 7؛ الحزمة الحالية لا تصنّف كل حركة نقدية إلى تشغيلية واستثمارية وتمويلية. لذلك نعرض النقد والبنك وCOD والتسويات كما هي، من دون اختراع قائمة تدفقات ناقصة.
          </Text>
        </View>

        {monthlyPositions.length ? (
          <>
            <SectionHeader title="آخر المراكز الشهرية المؤكدة" />
            <DataTable
              columns={[
                { label: "النوع", width: 18 },
                { label: "شركة التوصيل", width: 24 },
                { label: "المبلغ", width: 15, numeric: true },
                { label: "الإجمالي", width: 15, numeric: true },
                { label: "الأجور", width: 14, numeric: true },
                { label: "استقطاع آخر", width: 14, numeric: true },
              ]}
              rows={monthlyPositions.slice(0, 7).map((row) => [
                String(row.position_type ?? "—"),
                String(row.delivery_company_name ?? "—"),
                iqd(row.amount),
                iqd(row.gross_amount),
                iqd(row.fee_amount),
                iqd(row.other_deduction_amount),
              ])}
            />
          </>
        ) : null}
      </ReportPage>

      <ReportPage
        payload={payload}
        section="05 · المبيعات والمنتجات"
        title="تحليل المبيعات والمنتجات ومصادر الطلبات"
        subtitle="ترتيب المنتجات حسب إيراد بنود الطلبات، مع توزيع مصادر الطلبات وحالة التسوية"
      >
        <View style={styles.twoCol}>
          <View style={[styles.chartCard, { width: "65%" }]}>
            <Text style={styles.chartTitle}>أعلى المنتجات/الخيارات بالإيراد</Text>
            <Text style={styles.chartSubtitle}>الإيراد مأخوذ من سعر الشراء التاريخي داخل بنود الطلبات</Text>
            {topProducts.length ? topProducts.map((row, index) => {
              const max = topProducts[0]?.revenue || 1;
              return (
                <View key={row.key} style={styles.rankRow}>
                  <Text style={styles.rankNo}>{String(index + 1).padStart(2, "0")}</Text>
                  <View style={styles.rankMain}>
                    <View style={styles.rankLabelRow}>
                      <Text style={styles.rankLabel}>{row.productName}{row.variantLabel ? " — " + row.variantLabel : ""}</Text>
                      <Text style={styles.rankMeta}>{numberValue(row.quantity)} وحدة · {numberValue(row.orderCount)} طلب</Text>
                    </View>
                    <View style={styles.rankTrack}>
                      <View style={[styles.rankFill, { width: Math.max(5, (row.revenue / max) * 100) + "%" }]} />
                    </View>
                  </View>
                  <Text style={styles.rankValue}>{iqd(row.revenue)}</Text>
                </View>
              );
            }) : (
              <Text style={[styles.calloutText, { textAlign: "center", marginTop: 20 }]}>لا توجد مبيعات منتجات قابلة للترتيب.</Text>
            )}
          </View>

          <View style={[styles.chartCard, { width: "33%" }]}>
            <Text style={styles.chartTitle}>مصدر الطلبات</Text>
            <DonutChart segments={sourceSegments} centerLabel="إجمالي الطلبات" centerValue={numberValue(sales.length)} />
            <View style={[styles.callout, { marginTop: 7 }]}>
              <Text style={styles.calloutTitle}>تركيز المنتج الأول</Text>
              <Text style={styles.calloutText}>
                {topProducts[0]
                  ? topProducts[0].productName + " يمثل " + percent(topProductShare) + " من إيراد البنود المجمعة في التحليل."
                  : "لا توجد بيانات كافية."}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.insightGrid}>
          <View style={styles.insightCard}>
            <Text style={styles.insightTitle}>Website</Text>
            <Text style={styles.insightText}>{numberValue(webOrders)} طلب</Text>
          </View>
          <View style={styles.insightCard}>
            <Text style={styles.insightTitle}>WhatsApp</Text>
            <Text style={styles.insightText}>{numberValue(whatsappOrders)} طلب</Text>
          </View>
          <View style={styles.insightCard}>
            <Text style={styles.insightTitle}>مسوّى</Text>
            <Text style={styles.insightText}>{numberValue(settledCount)} طلب · {percent(settleRate)}</Text>
          </View>
          <View style={styles.insightCard}>
            <Text style={styles.insightTitle}>يحتاج متابعة</Text>
            <Text style={styles.insightText}>{numberValue(unsettledCount)} طلب</Text>
          </View>
        </View>
      </ReportPage>

      <ReportPage
        payload={payload}
        section="06 · الإقفال والمطابقة"
        title="مسار الإقفال الشهري وفحوص المطابقة"
        subtitle="الـGantt يوضح مراحل العمل، والفحوص تحسم هل الأرقام مترابطة داخل النظام"
      >
        <View style={[styles.chartCard, { marginBottom: 9 }]}>
          <Text style={styles.chartTitle}>Gantt — إطار عمل الإقفال الشهري</Text>
          <Text style={styles.chartSubtitle}>تقسيم إجرائي للفترة وليس ادعاءً بأن كل مرحلة اكتملت تلقائياً</Text>
          <GanttTimeline periodKey={periodKey} />
        </View>

        <SectionHeader title="اختبارات المطابقة" note="فرق قريب من الصفر = مطابقة رقمية ضمن الهامش" />
        <View style={styles.checkGrid}>
          {checks.map((check) => (
            <CheckCard key={check.label} label={check.label} value={check.value} ok={check.ok} />
          ))}
        </View>

        <View style={styles.twoCol}>
          <View style={[styles.callout, { width: "48%" }]}>
            <Text style={styles.calloutTitle}>موانع الإغلاق</Text>
            <Text style={styles.calloutText}>
              {blockers.length
                ? "يوجد " + numberValue(blockers.length) + " نوع من الموانع. راجع الجدول التفصيلي في صفحات الملحقات قبل اعتبار الفترة مكتملة."
                : "لا توجد موانع إغلاق مسجلة في جاهزية الفترة الحالية."}
            </Text>
          </View>
          <View style={[styles.callout, { width: "48%" }]}>
            <Text style={styles.calloutTitle}>COGS والراجعات</Text>
            <Text style={styles.calloutText}>
              كلفة البضاعة المعادة للمخزون من راجعات موثقة = {iqd(restockCogs)}. هذه القيمة تدخل في فحص المطابقة حتى لا تُقرأ كفرق خاطئ.
            </Text>
          </View>
        </View>
      </ReportPage>

      <AppendixTablePages
        payload={payload}
        section="07 · خريطة الطلبات"
        title="كل الطلبات المتحققة خلال الشهر"
        subtitle="كل صف يمثل طلباً دخل المحاسبة عند تحقق الإيراد"
        pageSize={15}
        columns={[
          { label: "الطلب", width: 16 },
          { label: "التحقق", width: 16 },
          { label: "المصدر", width: 10 },
          { label: "المبيعات", width: 12, numeric: true },
          { label: "COGS", width: 12, numeric: true },
          { label: "التجهيز", width: 11, numeric: true },
          { label: "المساهمة", width: 12, numeric: true },
          { label: "التسوية", width: 11 },
        ]}
        rows={orderIndexRows}
      />

      {orderPartGroups.map((group, index) => (
        <ReportPage
          key={"order-detail-" + index}
          payload={payload}
          section="08 · تدقيق الطلبات"
          title="تفاصيل الطلبات — سجل التدقيق"
          subtitle={"جزء " + String(index + 1) + " من " + String(orderPartGroups.length) + " · السعر والكلفة والخصم وحالة التسوية محفوظة على مستوى الطلب"}
        >
          {group.map((part, partIndex) => <OrderCard key={String(partIndex) + String(part.order.order_id)} part={part} />)}
        </ReportPage>
      ))}

      <AppendixTablePages
        payload={payload}
        section="09 · المصاريف"
        title="تحليل المصروفات"
        subtitle="الموثق والمعلق يظهران كل واحد بحالته الأصلية"
        pageSize={14}
        columns={[
          { label: "التاريخ", width: 14 },
          { label: "الفئة", width: 14 },
          { label: "الجهة", width: 15 },
          { label: "الوصف", width: 24 },
          { label: "المبلغ", width: 12, numeric: true },
          { label: "الحالة", width: 11 },
          { label: "ضريبي", width: 10 },
        ]}
        rows={expenseRows}
      />

      <AppendixTablePages
        payload={payload}
        section="10 · الراجعات"
        title="المرتجعات وأثرها المالي"
        subtitle="رد المبلغ منفصل عن خسارة التغليف وشطب المنتج وإعادة المخزون"
        pageSize={15}
        columns={[
          { label: "الطلب", width: 16 },
          { label: "النوع", width: 14 },
          { label: "الحالة", width: 12 },
          { label: "رد المبلغ", width: 12, numeric: true },
          { label: "التغليف", width: 11, numeric: true },
          { label: "شطب المنتج", width: 12, numeric: true },
          { label: "إعادة مخزون", width: 10 },
          { label: "التحديث", width: 13 },
        ]}
        rows={returnRows}
      />

      <AppendixTablePages
        payload={payload}
        section="11 · التحصيل"
        title="تسويات شركات التوصيل والتحصيل"
        subtitle="Gross وFees وNet تبقى منفصلة حتى يمكن مراجعة كل تسوية"
        pageSize={16}
        columns={[
          { label: "التسوية", width: 18 },
          { label: "الشركة", width: 16 },
          { label: "التاريخ", width: 16 },
          { label: "الإجمالي", width: 14, numeric: true },
          { label: "الأجور", width: 12, numeric: true },
          { label: "الصافي", width: 14, numeric: true },
          { label: "الحالة", width: 10 },
        ]}
        rows={settlementRows}
      />

      <AppendixTablePages
        payload={payload}
        section="12 · اليومية"
        title="دفتر اليومية — أثر كل حركة"
        subtitle="كل سطر يوضح الحساب والمصدر والمدين والدائن بدون تحويل الصفحة إلى صورة"
        pageSize={15}
        columns={[
          { label: "القيد", width: 11 },
          { label: "التاريخ", width: 15 },
          { label: "المصدر", width: 13 },
          { label: "الحساب", width: 18 },
          { label: "البيان", width: 23 },
          { label: "مدين", width: 10, numeric: true },
          { label: "دائن", width: 10, numeric: true },
        ]}
        rows={journalRows}
      />

      <AppendixTablePages
        payload={payload}
        section="13 · المخزون"
        title="المخزون الافتتاحي — نقطة البداية"
        subtitle="مرجع القطع المحاسبي مع الكمية والكلفة والقيمة ومصدر الكلفة؛ لا يمثل وحده اختبار صافي القيمة القابلة للتحقق للمخزون"
        pageSize={16}
        columns={[
          { label: "المنتج", width: 24 },
          { label: "المتغير", width: 17 },
          { label: "الكمية", width: 10, numeric: true },
          { label: "كلفة الوحدة", width: 15, numeric: true },
          { label: "القيمة", width: 16, numeric: true },
          { label: "مصدر الكلفة", width: 18 },
        ]}
        rows={inventoryRows}
      />

      <AppendixTablePages
        payload={payload}
        section="14 · الأدلة"
        title="فهرس المستندات والأدلة"
        subtitle="المستندات تبقى قابلة للتتبع ولا يتم استبدالها بوصف عام"
        pageSize={16}
        columns={[
          { label: "النوع", width: 18 },
          { label: "الجهة", width: 22 },
          { label: "رقم المستند", width: 18 },
          { label: "التاريخ", width: 14 },
          { label: "المبلغ", width: 14, numeric: true },
          { label: "المصدر", width: 14 },
        ]}
        rows={evidenceRows}
      />

      <ReportPage
        payload={payload}
        section="15 · الاعتماد والمنهجية"
        title="بيانات المنشأة، الاعتماد، وتعريفات التقرير"
        subtitle="الحقول الناقصة تبقى ناقصة صراحةً؛ ولا يتم اختراع رقم مكلف أو اعتماد محاسب"
      >
        <View style={styles.kpiRow}>
          <KpiCard label="حالة الملف" value={String(profile.status ?? "غير متوفر")} />
          <KpiCard label="رقم المكلف" value={String(profile.taxpayer_number ?? "غير متوفر")} />
          <KpiCard label="الفرع الضريبي" value={String(profile.tax_branch ?? "غير متوفر")} />
          <KpiCard label="العنوان المسجل" value={String(profile.registered_address ?? "غير متوفر")} />
          <KpiCard label="إجازة المحاسب" value={String(profile.accountant_license_number ?? "غير متوفر")} />
          <KpiCard label="حالة التقرير" value={payload.manifest?.taxFinal ? "TAX FINAL" : "إدارة/مراجعة"} />
        </View>

        <SectionHeader title="تعريفات القراءة" />
        <View style={{ borderWidth: 0.7, borderColor: C.border, borderRadius: 8, overflow: "hidden" }}>
          {[
            ["الطلبات المتحققة", "طلبات دخلت المحاسبة عند تحقق الاعتراف بالإيراد، وليس كل طلب منشأ على الموقع."],
            ["مبيعات المنتجات", "إيراد المنتجات من حساب الأستاذ 3000، منفصل عن أجور التوصيل."],
            ["كلفة المنتجات COGS", "كلفة البضاعة المرتبطة بالمبيعات من حساب 4000 وفق snapshot/ledger."],
            ["كلفة التجهيز", "مواد التجهيز والتغليف المسجلة محاسبياً في حساب 5100."],
            ["دعم التوصيل", "ما تتحمله AQUAVO عندما تكون أجرة الناقل أعلى من المبلغ المحصل من الزبون."],
            ["مساهمة الطلب", "مبيعات الطلب ناقص COGS ودعم التوصيل وكلفة التجهيز ضمن فترة التقرير."],
            ["COD لدى شركات التوصيل", "رصيد دفتر أستاذ للمبالغ التي ما زالت بعهدة شركات التوصيل."],
            ["صافي النتيجة الإدارية", "مقياس إدارة داخلي حسب المعادلة الموضحة في التقرير؛ وليس تسمية IFRS مستقلة."],
            ["حدود IFRS", "هذا الملف تقرير إدارة ومراجعة داخلية غير مدقق. لا يصف نفسه كقوائم IFRS مكتملة، ولا كقائمة تدفقات نقدية IAS 7، ولا يثبت بمفرده اختبار IAS 2 لصافي القيمة القابلة للتحقق للمخزون."],
          ].map(([term, meaning]) => (
            <View key={term} style={styles.definitionRow}>
              <Text style={styles.definitionTerm}>{term}</Text>
              <Text style={styles.definitionText}>{meaning}</Text>
            </View>
          ))}
        </View>

        <SectionHeader title="منهجية الجودة" />
        <View style={styles.noteBox}>
          <Text style={styles.noteText}>
            هذا الملف مولد كـPDF متجهي: النصوص والجداول والدوائر والمخططات عناصر PDF حقيقية قابلة للتكبير بدون تغبيش، وليست صور JPEG لكل صفحة. الأرقام المهمة تربط الملخص بالطلبات والقيود والتسويات، والبيانات المفقودة تبقى «غير متوفر» بدلاً من تحويلها إلى صفر.
          </Text>
        </View>

        {blockers.length ? (
          <>
            <SectionHeader title="موانع الإغلاق الحالية" />
            <DataTable
              columns={[
                { label: "الفحص", width: 28 },
                { label: "الوصف", width: 56 },
                { label: "العدد", width: 16, numeric: true },
              ]}
              rows={blockers.slice(0, 8).map((row) => [
                String(row.key ?? "—"),
                String(row.label ?? "—"),
                numberValue(row.count),
              ])}
            />
          </>
        ) : null}
      </ReportPage>
    </Document>
  );
}

function nextPaint(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

export async function downloadAccountantPdfV2(
  payload: AnyRow,
  onProgress?: (progress: AccountantPdfProgress) => void,
): Promise<void> {
  validateAccountantPayload(payload);
  registerFonts();

  onProgress?.({ current: 0, total: 3, stage: "preparing" });
  await nextPaint();

  onProgress?.({ current: 1, total: 3, stage: "rendering" });
  const instance = pdf(<AccountantPdfDocument payload={payload} />);
  const blob = await instance.toBlob();

  onProgress?.({ current: 2, total: 3, stage: "saving" });
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = "AQUAVO-Accounting-VECTOR-V6-" + String(payload.manifest?.periodKey ?? "period") + ".pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  onProgress?.({ current: 3, total: 3, stage: "saving" });
}
