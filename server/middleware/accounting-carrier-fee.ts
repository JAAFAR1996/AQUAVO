import type { NextFunction, Request, RequestHandler, Response } from "express";
import { sql } from "drizzle-orm";
import { getDb } from "../db.js";

interface OrderItemFact {
  productId?: string;
  quantity?: number | string;
  priceAtPurchase?: number | string;
}

export interface AccountingOrderFact {
  id: string;
  orderNumber: string | null;
  createdAt: Date | string;
  status: string | null;
  financiallyCounted: boolean | null;
  codReceived: boolean | null;
  total: number | string;
  roundedTotal: number | string | null;
  shippingCost: number | string;
  carrierFee: number | string | null;
  items: OrderItemFact[] | null;
  source: string | null;
}

interface CanonicalSettlement {
  id: string;
  settlementNumber: string;
  carrier: string;
  status: string;
  netAmount: number | string;
  notes: string | null;
  createdAt: Date | string;
}

interface PeriodRange {
  start: Date;
  end: Date;
}

const REALIZED_STATUSES = new Set(["delivered"]);
const PATCHED_GET_PATHS = new Set([
  "/summary",
  "/orders",
  "/products",
  "/report-timeseries",
  "/cod-summary",
  "/cod-details",
  "/report",
  "/ledger",
  "/periods",
  "/whatsapp-invoices",
]);

function toNumber(value: unknown): number {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (
    result &&
    typeof result === "object" &&
    Array.isArray((result as { rows?: unknown[] }).rows)
  ) {
    return (result as { rows: T[] }).rows;
  }
  return [];
}

function roundMoney(value: number): number {
  return Math.round(value);
}

function recalcMargin(profit: number, revenue: number): number {
  return revenue > 0 ? Math.round((profit / revenue) * 100) : 0;
}

function orderCollectedAmount(order: AccountingOrderFact): number {
  if (order.roundedTotal != null) return toNumber(order.roundedTotal);
  return Math.round(toNumber(order.total) / 250) * 250;
}

export function carrierFeeForOrder(order: AccountingOrderFact): number {
  return order.carrierFee == null
    ? toNumber(order.shippingCost)
    : toNumber(order.carrierFee);
}

export function carrierFeeCorrection(order: AccountingOrderFact): number {
  return carrierFeeForOrder(order) - toNumber(order.shippingCost);
}

function isRealized(order: AccountingOrderFact): boolean {
  if (order.financiallyCounted === false) return false;
  if (order.financiallyCounted === true) return true;
  return REALIZED_STATUSES.has(order.status ?? "");
}

function getPeriodRange(req: Request): PeriodRange {
  const period = typeof req.query.period === "string" ? req.query.period : "month";
  const from = typeof req.query.from === "string" ? req.query.from : undefined;
  const to = typeof req.query.to === "string" ? req.query.to : undefined;
  const now = new Date();

  if (period === "custom" && from && to) {
    const start = new Date(from);
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  if (period === "day") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  if (period === "week") {
    const diffToSaturday = (now.getDay() + 1) % 7;
    const start = new Date(now);
    start.setDate(now.getDate() - diffToSaturday);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  if (period === "year") {
    return {
      start: new Date(now.getFullYear(), 0, 1),
      end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
    };
  }

  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
  };
}

function periodKeyRange(periodKey: string): PeriodRange | null {
  const match = /^(\d{4})-(\d{2})$/.exec(periodKey);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  if (month < 0 || month > 11) return null;
  return {
    start: new Date(year, month, 1, 0, 0, 0, 0),
    end: new Date(year, month + 1, 0, 23, 59, 59, 999),
  };
}

async function loadOrderFacts(range?: PeriodRange): Promise<AccountingOrderFact[]> {
  const db = getDb();
  if (!db) return [];

  const result = range
    ? await db.execute(sql`
        SELECT
          id,
          order_number AS "orderNumber",
          created_at AS "createdAt",
          status,
          financially_counted AS "financiallyCounted",
          cod_received AS "codReceived",
          total,
          rounded_total AS "roundedTotal",
          shipping_cost AS "shippingCost",
          carrier_fee AS "carrierFee",
          items,
          source
        FROM orders
        WHERE created_at >= ${range.start}
          AND created_at <= ${range.end}
      `)
    : await db.execute(sql`
        SELECT
          id,
          order_number AS "orderNumber",
          created_at AS "createdAt",
          status,
          financially_counted AS "financiallyCounted",
          cod_received AS "codReceived",
          total,
          rounded_total AS "roundedTotal",
          shipping_cost AS "shippingCost",
          carrier_fee AS "carrierFee",
          items,
          source
        FROM orders
      `);

  return rowsOf<AccountingOrderFact>(result);
}

async function loadCanonicalSettlements(): Promise<CanonicalSettlement[]> {
  const db = getDb();
  if (!db) return [];
  const result = await db.execute(sql`
    SELECT
      id,
      settlement_number AS "settlementNumber",
      carrier,
      status,
      net_amount AS "netAmount",
      notes,
      created_at AS "createdAt"
    FROM cash_settlements
    WHERE status NOT IN ('draft','cancelled','reversed','disputed')
    ORDER BY created_at DESC
  `);
  return rowsOf<CanonicalSettlement>(result);
}

async function loadWhatsappCarrierCost(range: PeriodRange): Promise<number> {
  const db = getDb();
  if (!db) return 0;
  const result = await db.execute(sql`
    SELECT COALESCE(SUM(COALESCE(o.carrier_fee,o.shipping_cost)),0) AS amount
    FROM manual_invoices mi
    JOIN orders o ON o.id=mi.order_id
    WHERE mi.created_at >= ${range.start}
      AND mi.created_at <= ${range.end}
      AND o.status='delivered'
  `);
  return toNumber(rowsOf<{ amount: unknown }>(result)[0]?.amount);
}

function totalCorrection(orders: AccountingOrderFact[]): number {
  return orders.reduce((sum, order) => sum + carrierFeeCorrection(order), 0);
}

export function patchOrderProfitRow(
  row: Record<string, unknown>,
  order: AccountingOrderFact,
): Record<string, unknown> {
  const correction = carrierFeeCorrection(order);
  const revenue = toNumber(row.revenue) - correction;
  const netProfit = toNumber(row.netProfit) - correction;

  return {
    ...row,
    revenue: roundMoney(revenue),
    shipping: roundMoney(carrierFeeForOrder(order)),
    netProfit: roundMoney(netProfit),
    margin: recalcMargin(netProfit, revenue),
  };
}

export function allocateCarrierCorrections(
  orders: AccountingOrderFact[],
): Map<string, number> {
  const corrections = new Map<string, number>();

  for (const order of orders) {
    const correction = carrierFeeCorrection(order);
    if (correction === 0) continue;
    const items = Array.isArray(order.items) ? order.items : [];
    const weightedItems = items
      .filter((item) => typeof item.productId === "string" && item.productId.length > 0)
      .map((item) => {
        const quantity = Math.max(1, toNumber(item.quantity ?? 1));
        return {
          productId: item.productId as string,
          gross: toNumber(item.priceAtPurchase) * quantity,
        };
      });
    const subtotal = weightedItems.reduce((sum, item) => sum + item.gross, 0);
    if (subtotal <= 0) continue;

    for (const item of weightedItems) {
      corrections.set(
        item.productId,
        (corrections.get(item.productId) ?? 0) + correction * (item.gross / subtotal),
      );
    }
  }

  return corrections;
}

function patchProductRow(
  row: Record<string, unknown>,
  correction: number,
): Record<string, unknown> {
  if (correction === 0) return row;

  const revenue = toNumber(row.revenue) - correction;
  const netProfit = toNumber(row.netProfit) - correction;
  const grossProfit = Object.prototype.hasOwnProperty.call(row, "grossProfit")
    ? toNumber(row.grossProfit) - correction
    : undefined;
  const adjustedGrossProfit = Object.prototype.hasOwnProperty.call(row, "adjustedGrossProfit")
    ? toNumber(row.adjustedGrossProfit) - correction
    : undefined;
  const adjustedNetProfit = Object.prototype.hasOwnProperty.call(row, "adjustedNetProfit")
    ? toNumber(row.adjustedNetProfit) - correction
    : undefined;

  return {
    ...row,
    revenue: roundMoney(revenue),
    netProfit: roundMoney(netProfit),
    margin: recalcMargin(netProfit, revenue),
    ...(grossProfit == null
      ? {}
      : {
          grossProfit: roundMoney(grossProfit),
          grossMargin: recalcMargin(grossProfit, revenue),
        }),
    ...(adjustedGrossProfit == null
      ? {}
      : { adjustedGrossProfit: roundMoney(adjustedGrossProfit) }),
    ...(adjustedNetProfit == null
      ? {}
      : {
          adjustedNetProfit: roundMoney(adjustedNetProfit),
          adjustedMargin: recalcMargin(adjustedNetProfit, revenue),
        }),
  };
}

export function patchSummaryData(
  data: Record<string, unknown>,
  correction: number,
): Record<string, unknown> {
  const totalRevenue = toNumber(data.totalRevenue) - correction;
  const netProfit = toNumber(data.netProfit) - correction;
  const netProfitBeforeReturns = toNumber(data.netProfitBeforeReturns) - correction;
  const netProfitAfterReturns = toNumber(data.netProfitAfterReturns) - correction;
  const deliveredCount = toNumber(data.deliveredCount);

  return {
    ...data,
    totalRevenue: roundMoney(totalRevenue),
    netProfit: roundMoney(netProfit),
    netProfitBeforeReturns: roundMoney(netProfitBeforeReturns),
    netProfitAfterReturns: roundMoney(netProfitAfterReturns),
    aov: deliveredCount > 0 ? Math.round(totalRevenue / deliveredCount) : 0,
    margin: recalcMargin(netProfit, totalRevenue),
    marginBeforeReturns: recalcMargin(netProfitBeforeReturns, totalRevenue),
    marginAfterReturns: recalcMargin(netProfitAfterReturns, totalRevenue),
  };
}

function patchReportSummary(
  summary: Record<string, unknown>,
  correction: number,
): Record<string, unknown> {
  const revenue = toNumber(summary.revenue) - correction;
  const grossProfit = toNumber(summary.grossProfit) - correction;
  const netProfitBeforeReturns = toNumber(summary.netProfitBeforeReturns) - correction;
  const netProfitAfterReturns = toNumber(summary.netProfitAfterReturns) - correction;
  const finalNetProfit = toNumber(summary.finalNetProfit) - correction;
  const deliveredOrders = toNumber(summary.deliveredOrders);

  return {
    ...summary,
    revenue: roundMoney(revenue),
    grossProfit: roundMoney(grossProfit),
    grossMargin: recalcMargin(grossProfit, revenue),
    netProfitBeforeReturns: roundMoney(netProfitBeforeReturns),
    netProfitAfterReturns: roundMoney(netProfitAfterReturns),
    finalNetProfit: roundMoney(finalNetProfit),
    marginAfterReturns: recalcMargin(netProfitAfterReturns, revenue),
    marginAfterExpenses: recalcMargin(finalNetProfit, revenue),
    averageOrderValue: deliveredOrders > 0 ? Math.round(revenue / deliveredOrders) : 0,
  };
}

function patchTopProductLists(
  topProducts: Record<string, unknown>,
  corrections: Map<string, number>,
): Record<string, unknown> {
  const patchList = (value: unknown): Record<string, unknown>[] =>
    Array.isArray(value)
      ? value.map((row) => {
          const item = row as Record<string, unknown>;
          return patchProductRow(item, corrections.get(String(item.productId)) ?? 0);
        })
      : [];

  const topByRevenue = patchList(topProducts.topByRevenue)
    .sort((a, b) => toNumber(b.revenue) - toNumber(a.revenue));
  const topByGrossProfit = patchList(topProducts.topByGrossProfit)
    .sort((a, b) => toNumber(b.grossProfit) - toNumber(a.grossProfit));
  const weakMarginProducts = patchList(topProducts.weakMarginProducts)
    .sort((a, b) => toNumber(a.grossMargin) - toNumber(b.grossMargin));

  return {
    ...topProducts,
    topByRevenue,
    topByGrossProfit,
    weakMarginProducts,
  };
}

function patchLedger(
  data: Record<string, unknown>,
  orders: AccountingOrderFact[],
): Record<string, unknown> {
  const cashCorrection = orders
    .filter((order) => order.codReceived === true)
    .reduce((sum, order) => sum + carrierFeeCorrection(order), 0);
  const receivableCorrection = orders
    .filter((order) => order.codReceived !== true)
    .reduce((sum, order) => sum + carrierFeeCorrection(order), 0);
  const correction = cashCorrection + receivableCorrection;

  const trialBalance = Array.isArray(data.trialBalance)
    ? data.trialBalance.map((raw) => {
        const row = { ...(raw as Record<string, unknown>) };
        const code = String(row.code ?? "");
        if (code === "1000") row.debit = toNumber(row.debit) - cashCorrection;
        if (code === "1100") row.debit = toNumber(row.debit) - receivableCorrection;
        if (code === "3000") row.credit = toNumber(row.credit) - correction;
        const normalCredit = code === "3000";
        row.balance = roundMoney(
          normalCredit
            ? toNumber(row.credit) - toNumber(row.debit)
            : toNumber(row.debit) - toNumber(row.credit),
        );
        row.debit = roundMoney(toNumber(row.debit));
        row.credit = roundMoney(toNumber(row.credit));
        return row;
      })
    : [];

  const totalDebit = trialBalance.reduce((sum, row) => sum + toNumber(row.debit), 0);
  const totalCredit = trialBalance.reduce((sum, row) => sum + toNumber(row.credit), 0);
  const income = { ...((data.incomeStatement ?? {}) as Record<string, unknown>) };
  income.revenue = toNumber(income.revenue) - correction;
  income.netRevenue = toNumber(income.netRevenue) - correction;
  income.grossProfit = toNumber(income.grossProfit) - correction;
  income.netIncome = toNumber(income.netIncome) - correction;

  const integrity = { ...((data.integrity ?? {}) as Record<string, unknown>) };
  integrity.ledgerNetIncome = toNumber(integrity.ledgerNetIncome) - correction;
  integrity.computedFinalNetProfit =
    toNumber(integrity.computedFinalNetProfit) - correction;
  integrity.difference =
    toNumber(integrity.ledgerNetIncome) - toNumber(integrity.computedFinalNetProfit);
  integrity.matches = toNumber(integrity.difference) === 0;

  return {
    ...data,
    trialBalance,
    totals: {
      totalDebit: roundMoney(totalDebit),
      totalCredit: roundMoney(totalCredit),
      difference: roundMoney(totalDebit - totalCredit),
      balanced: roundMoney(totalDebit - totalCredit) === 0,
    },
    incomeStatement: income,
    integrity,
  };
}

async function mirrorLegacySettlement(body: unknown): Promise<void> {
  const response = body as { success?: boolean; data?: Record<string, unknown> };
  if (!response?.success || !response.data?.id) return;
  const db = getDb();
  if (!db) return;

  const sourceId = String(response.data.id);
  const carrier = String(response.data.carrier ?? "شركة توصيل");
  const amount = toNumber(response.data.amount);
  const notes = response.data.notes == null ? null : String(response.data.notes);
  const createdAt = response.data.createdAt
    ? new Date(String(response.data.createdAt))
    : new Date();

  await db.execute(sql`
    INSERT INTO cash_settlements(
      id,settlement_number,carrier,status,
      gross_amount,fees_amount,net_amount,currency,
      received_at,evidence,notes,created_by,created_at,updated_at
    )
    VALUES(
      ${`legacy-ui:${sourceId}`},
      ${`UI-${sourceId}`},
      ${carrier},
      'reconciled',
      ${String(amount)},'0',${String(amount)},'IQD',
      ${createdAt},
      ${JSON.stringify({
        mirrored_from: "shipping_settlements",
        source_id: sourceId,
        amount_is_net_received: true,
      })}::jsonb,
      ${notes},'admin-accounting-ui',${createdAt},now()
    )
    ON CONFLICT(id) DO NOTHING
  `);
}

async function patchAccountingPayload(req: Request, body: unknown): Promise<unknown> {
  const response = body as { success?: boolean; data?: unknown };
  if (!response?.success || response.data == null) return body;

  const path = req.path;
  const range = getPeriodRange(req);

  if (path === "/summary") {
    const orders = (await loadOrderFacts(range)).filter(isRealized);
    const patched = patchSummaryData(
      response.data as Record<string, unknown>,
      totalCorrection(orders),
    );
    const whatsappCarrierCost = await loadWhatsappCarrierCost(range);
    const whatsappInvoices = patched.whatsappInvoices as Record<string, unknown> | undefined;
    if (whatsappInvoices) {
      patched.whatsappInvoices = {
        ...whatsappInvoices,
        profit: roundMoney(toNumber(whatsappInvoices.profit) - whatsappCarrierCost),
      };
    }
    response.data = patched;
    return response;
  }

  if (path === "/orders") {
    const orderMap = new Map(
      (await loadOrderFacts(range)).map((order) => [order.id, order]),
    );
    response.data = Array.isArray(response.data)
      ? response.data.map((raw) => {
          const row = raw as Record<string, unknown>;
          const order = orderMap.get(String(row.orderId));
          return order ? patchOrderProfitRow(row, order) : row;
        })
      : response.data;
    return response;
  }

  if (path === "/products") {
    const orders = (await loadOrderFacts(range)).filter(isRealized);
    const corrections = allocateCarrierCorrections(orders);
    response.data = Array.isArray(response.data)
      ? response.data.map((raw) => {
          const row = raw as Record<string, unknown>;
          return patchProductRow(row, corrections.get(String(row.productId)) ?? 0);
        })
      : response.data;
    return response;
  }

  if (path === "/report-timeseries") {
    const orders = (await loadOrderFacts(range)).filter(isRealized);
    const data = response.data as Record<string, unknown>;
    const granularity = data.granularity === "month" ? "month" : "day";
    const correctionByBucket = new Map<string, number>();
    for (const order of orders) {
      const date = new Date(order.createdAt);
      const key = granularity === "month"
        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
        : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      correctionByBucket.set(
        key,
        (correctionByBucket.get(key) ?? 0) + carrierFeeCorrection(order),
      );
    }
    data.series = Array.isArray(data.series)
      ? data.series.map((raw) => {
          const row = { ...(raw as Record<string, unknown>) };
          const correction = correctionByBucket.get(String(row.date)) ?? 0;
          row.revenue = roundMoney(toNumber(row.revenue) - correction);
          row.grossProfit = roundMoney(toNumber(row.grossProfit) - correction);
          row.netProfit = roundMoney(toNumber(row.netProfit) - correction);
          return row;
        })
      : data.series;
    response.data = data;
    return response;
  }

  if (path === "/cod-summary") {
    const allOrders = await loadOrderFacts();
    const delivered = allOrders.filter((order) => order.status === "delivered");
    const inTransit = allOrders.filter((order) => order.status === "shipped");
    const settlements = await loadCanonicalSettlements();
    const totalDelivered = delivered.reduce(
      (sum, order) => sum + orderCollectedAmount(order) - carrierFeeForOrder(order),
      0,
    );
    const totalInTransit = inTransit.reduce(
      (sum, order) => sum + orderCollectedAmount(order) - carrierFeeForOrder(order),
      0,
    );
    const totalReceived = settlements.reduce(
      (sum, settlement) => sum + toNumber(settlement.netAmount),
      0,
    );
    const data = response.data as Record<string, unknown>;
    const approvedReturnDeductions = toNumber(data.approvedReturnDeductions);
    response.data = {
      ...data,
      totalCod: roundMoney(totalDelivered),
      totalDelivered: roundMoney(totalDelivered),
      totalInTransit: roundMoney(totalInTransit),
      totalReceived: roundMoney(totalReceived),
      totalPending: roundMoney(
        Math.max(0, totalDelivered - totalReceived - approvedReturnDeductions),
      ),
      settlements: settlements.map((settlement) => ({
        id: settlement.id,
        carrier: settlement.carrier,
        amount: toNumber(settlement.netAmount),
        notes: settlement.notes,
        createdAt: new Date(settlement.createdAt).toISOString(),
      })),
    };
    return response;
  }

  if (path === "/cod-details") {
    const factMap = new Map((await loadOrderFacts()).map((order) => [order.id, order]));
    const settlements = await loadCanonicalSettlements();
    const data = response.data as Record<string, unknown>;
    const deliveredRows = Array.isArray(data.deliveredOrders)
      ? data.deliveredOrders.map((raw) => {
          const row = { ...(raw as Record<string, unknown>) };
          const fact = factMap.get(String(row.orderId));
          if (!fact) return row;
          row.shippingCost = roundMoney(carrierFeeForOrder(fact));
          row.netAmount = roundMoney(orderCollectedAmount(fact) - carrierFeeForOrder(fact));
          return row;
        })
      : [];
    const totalDelivered = deliveredRows.reduce(
      (sum, row) => sum + toNumber(row.netAmount),
      0,
    );
    const totalReceived = settlements.reduce(
      (sum, settlement) => sum + toNumber(settlement.netAmount),
      0,
    );
    const approvedReturnDeductions = toNumber(data.approvedReturnDeductions);
    response.data = {
      ...data,
      deliveredOrders: deliveredRows,
      totalDelivered: roundMoney(totalDelivered),
      totalReceived: roundMoney(totalReceived),
      totalPending: roundMoney(
        Math.max(0, totalDelivered - totalReceived - approvedReturnDeductions),
      ),
    };
    return response;
  }

  if (path === "/report") {
    const orders = (await loadOrderFacts(range)).filter(isRealized);
    const correction = totalCorrection(orders);
    const corrections = allocateCarrierCorrections(orders);
    const data = response.data as Record<string, unknown>;
    response.data = {
      ...data,
      summary: patchReportSummary(
        (data.summary ?? {}) as Record<string, unknown>,
        correction,
      ),
      topProducts: patchTopProductLists(
        (data.topProducts ?? {}) as Record<string, unknown>,
        corrections,
      ),
    };
    return response;
  }

  if (path === "/ledger") {
    const orders = (await loadOrderFacts(range)).filter(isRealized);
    response.data = patchLedger(response.data as Record<string, unknown>, orders);
    return response;
  }

  if (path === "/periods" && req.method === "GET") {
    const rows = Array.isArray(response.data) ? response.data : [];
    const patchedRows = [];
    for (const raw of rows) {
      const row = { ...(raw as Record<string, unknown>) };
      const rangeForPeriod = periodKeyRange(String(row.periodKey));
      if (!rangeForPeriod) {
        patchedRows.push(row);
        continue;
      }
      const correction = totalCorrection(
        (await loadOrderFacts(rangeForPeriod)).filter(isRealized),
      );
      const live = { ...((row.live ?? {}) as Record<string, unknown>) };
      live.revenue = toNumber(live.revenue) - correction;
      live.grossProfit = toNumber(live.grossProfit) - correction;
      live.finalNetProfit = toNumber(live.finalNetProfit) - correction;
      const frozen = (row.frozen ?? {}) as Record<string, unknown>;
      const drift = {
        revenue: toNumber(live.revenue) - toNumber(frozen.revenue),
        finalNetProfit:
          toNumber(live.finalNetProfit) - toNumber(frozen.finalNetProfit),
      };
      patchedRows.push({
        ...row,
        live,
        drift,
        hasDrift: drift.revenue !== 0 || drift.finalNetProfit !== 0,
      });
    }
    response.data = patchedRows;
    return response;
  }

  if (path === "/periods/close" && req.method === "POST") {
    const data = response.data as Record<string, unknown>;
    const periodKey = String(data.periodKey ?? "");
    const closeRange = periodKeyRange(periodKey);
    if (!closeRange) return response;
    const correction = totalCorrection(
      (await loadOrderFacts(closeRange)).filter(isRealized),
    );
    const patched = {
      ...data,
      revenue: roundMoney(toNumber(data.revenue) - correction),
      grossProfit: roundMoney(toNumber(data.grossProfit) - correction),
      finalNetProfit: roundMoney(toNumber(data.finalNetProfit) - correction),
    };
    const db = getDb();
    if (db) {
      await db.execute(sql`
        UPDATE accounting_period_closes
        SET revenue=${String(patched.revenue)},
            gross_profit=${String(patched.grossProfit)},
            final_net_profit=${String(patched.finalNetProfit)},
            snapshot_json=${JSON.stringify(patched)}::jsonb
        WHERE period_key=${periodKey}
      `);
    }
    response.data = patched;
    return response;
  }

  if (path === "/whatsapp-invoices") {
    const factMap = new Map((await loadOrderFacts(range)).map((order) => [order.id, order]));
    const data = response.data as Record<string, unknown>;
    let totalCarrierCost = 0;
    const invoices = Array.isArray(data.invoices)
      ? data.invoices.map((raw) => {
          const row = { ...(raw as Record<string, unknown>) };
          const fact = factMap.get(String(row.orderId));
          if (!fact || row.orderStatus !== "delivered") return row;
          const fee = carrierFeeForOrder(fact);
          totalCarrierCost += fee;
          row.profit = roundMoney(toNumber(row.profit) - fee);
          return row;
        })
      : [];
    const summary = { ...((data.summary ?? {}) as Record<string, unknown>) };
    summary.profit = roundMoney(toNumber(summary.profit) - totalCarrierCost);
    response.data = { ...data, summary, invoices };
    return response;
  }

  return response;
}

export const accountingCarrierFeeMiddleware: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const shouldPatchGet = req.method === "GET" && PATCHED_GET_PATHS.has(req.path);
  const shouldPatchPeriodClose = req.method === "POST" && req.path === "/periods/close";
  const shouldMirrorSettlement = req.method === "POST" && req.path === "/settlements";

  if (!shouldPatchGet && !shouldPatchPeriodClose && !shouldMirrorSettlement) {
    next();
    return;
  }

  const originalJson = res.json.bind(res);
  let handled = false;

  res.json = ((body: unknown) => {
    if (handled) return res;
    handled = true;

    void (async () => {
      if (shouldMirrorSettlement) await mirrorLegacySettlement(body);
      const patched = shouldMirrorSettlement
        ? body
        : await patchAccountingPayload(req, body);
      originalJson(patched);
    })().catch(next);

    return res;
  }) as Response["json"];

  next();
};
