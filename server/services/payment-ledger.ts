import { sql } from "drizzle-orm";
import { getDb } from "../db.js";
import {
  paymentEvents,
  cashSettlements,
  cashSettlementItems,
} from "../../shared/operations-schema.js";
import { orders } from "../../shared/schema.js";

export function isPaymentLedgerEnabled(): boolean {
  return String(process.env.PAYMENT_LEDGER_ENABLED ?? "false").toLowerCase() === "true";
}

function requireDb() {
  const db = getDb();
  if (!db) throw new Error("Database is not connected");
  return db;
}

export async function recordPaymentEvent(args: {
  orderId: string;
  eventType: "authorization" | "capture" | "cod_received" | "refund" | "chargeback" | "adjustment" | "void";
  status: "pending" | "completed" | "failed" | "cancelled" | "reversed";
  amount: number;
  method: string;
  idempotencyKey: string;
  provider?: string;
  providerTransactionId?: string;
  occurredAt?: Date;
  evidence?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  actor?: string;
  reversesEventId?: string;
}): Promise<{ recorded: boolean; eventId?: string }> {
  if (!isPaymentLedgerEnabled()) return { recorded: false };
  if (!Number.isFinite(args.amount) || args.amount < 0) {
    throw new Error("Payment event amount must be a non-negative number");
  }
  if (!args.idempotencyKey.trim()) {
    throw new Error("Payment event idempotency key is required");
  }

  const db = requireDb();
  const [event] = await db.insert(paymentEvents).values({
    orderId: args.orderId,
    eventType: args.eventType,
    status: args.status,
    amount: String(args.amount),
    currency: "IQD",
    method: args.method,
    provider: args.provider,
    providerTransactionId: args.providerTransactionId,
    idempotencyKey: args.idempotencyKey,
    occurredAt: args.occurredAt ?? new Date(),
    evidence: args.evidence ?? {},
    metadata: args.metadata ?? {},
    createdBy: args.actor ?? "system",
    reversesEventId: args.reversesEventId,
  } as any)
    .onConflictDoNothing({ target: paymentEvents.idempotencyKey })
    .returning({ id: paymentEvents.id });

  if (event?.id) return { recorded: true, eventId: event.id };

  const existing = await db.execute(sql`
    SELECT id FROM payment_events
    WHERE idempotency_key = ${args.idempotencyKey}
    LIMIT 1
  `);
  const rows = Array.isArray(existing) ? existing : (existing?.rows ?? []);
  return { recorded: false, eventId: rows[0]?.id ? String(rows[0].id) : undefined };
}

export async function recordVerifiedCodCollection(args: {
  orderId: string;
  amount: number;
  carrier: string;
  evidenceReference: string;
  collectedAt: Date;
  actor: string;
  evidence?: Record<string, unknown>;
}): Promise<{ paymentEventId: string; recorded: boolean }> {
  if (!isPaymentLedgerEnabled()) {
    throw new Error("Payment ledger is disabled");
  }
  if (!args.evidenceReference.trim()) {
    throw new Error("COD collection requires a carrier or settlement evidence reference");
  }

  const db = requireDb();
  return db.transaction(async (tx) => {
    const orderResult = await tx.execute(sql`
      SELECT id, total, status, payment_status
      FROM orders
      WHERE id = ${args.orderId}
      FOR UPDATE
    `);
    const orderRows = Array.isArray(orderResult) ? orderResult : (orderResult?.rows ?? []);
    const order = orderRows[0];
    if (!order) throw new Error("Order was not found");

    const idempotencyKey = `cod:${args.carrier}:${args.evidenceReference}:${args.orderId}`;
    const inserted = await tx.insert(paymentEvents).values({
      orderId: args.orderId,
      eventType: "cod_received",
      status: "completed",
      amount: String(args.amount),
      currency: "IQD",
      method: "cash_on_delivery",
      provider: args.carrier,
      providerTransactionId: args.evidenceReference,
      idempotencyKey,
      occurredAt: args.collectedAt,
      evidence: args.evidence ?? { reference: args.evidenceReference },
      metadata: { legacyOrderTotal: Number(order.total) },
      createdBy: args.actor,
    } as any)
      .onConflictDoNothing({ target: paymentEvents.idempotencyKey })
      .returning({ id: paymentEvents.id });

    let eventId = inserted[0]?.id;
    const recorded = Boolean(eventId);
    if (!eventId) {
      const existing = await tx.execute(sql`
        SELECT id FROM payment_events
        WHERE idempotency_key = ${idempotencyKey}
        LIMIT 1
      `);
      const existingRows = Array.isArray(existing) ? existing : (existing?.rows ?? []);
      eventId = existingRows[0]?.id ? String(existingRows[0].id) : undefined;
    }
    if (!eventId) throw new Error("Unable to resolve COD payment event");

    await tx.update(orders)
      .set({
        paymentStatus: "paid",
        codReceived: true,
        updatedAt: new Date(),
      } as any)
      .where(sql`${orders.id} = ${args.orderId}`);

    return { paymentEventId: eventId, recorded };
  });
}

export async function createCashSettlement(args: {
  settlementNumber: string;
  carrier: string;
  grossAmount: number;
  feesAmount: number;
  netAmount: number;
  receivedAt: Date;
  actor: string;
  bankReference?: string;
  evidence?: Record<string, unknown>;
  items: Array<{
    orderId: string;
    paymentEventId?: string;
    grossAmount: number;
    feeAmount: number;
    netAmount: number;
  }>;
}): Promise<string> {
  if (!isPaymentLedgerEnabled()) throw new Error("Payment ledger is disabled");
  const db = requireDb();

  return db.transaction(async (tx) => {
    const [settlement] = await tx.insert(cashSettlements).values({
      settlementNumber: args.settlementNumber,
      carrier: args.carrier,
      status: "received",
      grossAmount: String(args.grossAmount),
      feesAmount: String(args.feesAmount),
      netAmount: String(args.netAmount),
      currency: "IQD",
      receivedAt: args.receivedAt,
      bankReference: args.bankReference,
      evidence: args.evidence ?? {},
      createdBy: args.actor,
    } as any).returning({ id: cashSettlements.id });

    if (!settlement) throw new Error("Failed to create cash settlement");

    if (args.items.length > 0) {
      await tx.insert(cashSettlementItems).values(args.items.map((item) => ({
        settlementId: settlement.id,
        orderId: item.orderId,
        paymentEventId: item.paymentEventId,
        grossAmount: String(item.grossAmount),
        feeAmount: String(item.feeAmount),
        netAmount: String(item.netAmount),
        reconciliationStatus: "matched",
        metadata: {},
      })) as any);
    }

    const totals = await tx.execute(sql`
      SELECT
        COALESCE(SUM(gross_amount),0) AS gross,
        COALESCE(SUM(fee_amount),0) AS fees,
        COALESCE(SUM(net_amount),0) AS net
      FROM cash_settlement_items
      WHERE settlement_id = ${settlement.id}
    `);
    const rows = Array.isArray(totals) ? totals : (totals?.rows ?? []);
    const actualGross = Number(rows[0]?.gross ?? 0);
    const actualFees = Number(rows[0]?.fees ?? 0);
    const actualNet = Number(rows[0]?.net ?? 0);

    if (
      actualGross !== args.grossAmount
      || actualFees !== args.feesAmount
      || actualNet !== args.netAmount
    ) {
      throw new Error("Settlement header does not match settlement items");
    }

    await tx.update(cashSettlements)
      .set({ status: "reconciled", updatedAt: new Date() } as any)
      .where(sql`${cashSettlements.id} = ${settlement.id}`);

    return settlement.id;
  });
}

export async function paymentLedgerHealth(): Promise<{
  enabled: boolean;
  paymentEvents: number;
  unresolvedOrders: number;
  unresolvedInvoices: number;
}> {
  const db = requireDb();
  const result = await db.execute(sql`
    SELECT
      (SELECT COUNT(*) FROM payment_events)::bigint AS payment_events,
      (SELECT COUNT(*) FROM order_financial_reconciliation_queue)::bigint AS unresolved_orders,
      (SELECT COUNT(*) FROM manual_invoice_reconciliation_queue)::bigint AS unresolved_invoices
  `);
  const rows = Array.isArray(result) ? result : (result?.rows ?? []);
  return {
    enabled: isPaymentLedgerEnabled(),
    paymentEvents: Number(rows[0]?.payment_events ?? 0),
    unresolvedOrders: Number(rows[0]?.unresolved_orders ?? 0),
    unresolvedInvoices: Number(rows[0]?.unresolved_invoices ?? 0),
  };
}
