import { describe, it, expect } from "vitest";
import {
  isRealizedStatus,
  isCancelledStatus,
  isInProgressStatus,
  toMoney,
  roundCollected,
  orderCollectedAmount,
  REALIZED_STATUSES,
  CANCELLED_STATUSES,
} from "../../shared/order-financials.js";

describe("order status classification", () => {
  it("treats only delivered as realized revenue", () => {
    expect(isRealizedStatus("delivered")).toBe(true);
    expect(isRealizedStatus("Delivered")).toBe(true); // case-insensitive
    expect(isRealizedStatus(" delivered ")).toBe(true); // trims
    expect(isRealizedStatus("pending")).toBe(false);
    expect(isRealizedStatus("shipped")).toBe(false);
  });

  it("excludes cancelled/rejected/returned from revenue", () => {
    for (const s of CANCELLED_STATUSES) expect(isCancelledStatus(s)).toBe(true);
    expect(isCancelledStatus("delivered")).toBe(false);
    expect(isCancelledStatus("pending")).toBe(false);
  });

  it("classifies in-progress statuses", () => {
    expect(isInProgressStatus("pending")).toBe(true);
    expect(isInProgressStatus("shipped")).toBe(true);
    expect(isInProgressStatus("delivered")).toBe(false);
    expect(isInProgressStatus("cancelled")).toBe(false);
  });

  it("has no overlap between realized and cancelled sets", () => {
    const realized = new Set<string>(REALIZED_STATUSES);
    for (const c of CANCELLED_STATUSES) expect(realized.has(c)).toBe(false);
  });

  it("handles null/undefined/garbage status safely", () => {
    expect(isRealizedStatus(null)).toBe(false);
    expect(isRealizedStatus(undefined)).toBe(false);
    expect(isCancelledStatus("")).toBe(false);
  });
});

describe("money coercion", () => {
  it("coerces numeric strings from Neon", () => {
    expect(toMoney("12500")).toBe(12500);
    expect(toMoney(12500)).toBe(12500);
    expect(toMoney("12500.75")).toBe(12500.75);
  });

  it("never returns NaN — garbage becomes 0", () => {
    expect(toMoney(null)).toBe(0);
    expect(toMoney(undefined)).toBe(0);
    expect(toMoney("abc")).toBe(0);
    expect(toMoney(NaN)).toBe(0);
    expect(toMoney(Infinity)).toBe(0);
  });
});

describe("collected amount (COD)", () => {
  it("rounds raw totals to the nearest 250 IQD", () => {
    expect(roundCollected(10000)).toBe(10000);
    expect(roundCollected(10100)).toBe(10000);
    expect(roundCollected(10125)).toBe(10250);
    expect(roundCollected(10200)).toBe(10250);
  });

  it("prefers persisted roundedTotal when present", () => {
    expect(orderCollectedAmount({ total: "10100", roundedTotal: "10250" })).toBe(10250);
  });

  it("falls back to rounding total when roundedTotal is null (WhatsApp orders)", () => {
    expect(orderCollectedAmount({ total: "10100", roundedTotal: null })).toBe(10000);
    expect(orderCollectedAmount({ total: "10100" })).toBe(10000);
  });

  it("treats roundedTotal of 0 as a real persisted value, not missing", () => {
    expect(orderCollectedAmount({ total: "5000", roundedTotal: "0" })).toBe(0);
  });
});
