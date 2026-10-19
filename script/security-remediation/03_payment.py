from pathlib import Path
root=Path('.')
def modify(path,old,new,count=1):
 p=root/path;s=p.read_text();n=s.count(old)
 if n!=count:raise RuntimeError(f'{path}: {n} not {count}: {old[:95]}')
 p.write_text(s.replace(old,new))
def block(path,start,end,new):
 p=root/path;s=p.read_text();i=s.index(start);j=s.index(end,i);p.write_text(s[:i]+new+s[j:])
p='server/services/wayl-order-payment.ts'
modify(p,'import { projectNewOrderCosts } from "./order-cost-projection.js";','import { projectNewOrderCosts } from "./order-cost-projection.js";\nimport { applyUnpaidWaylObservation } from "./wayl-state-transition.js";')
modify(p,'    await tx.execute(sql`SELECT id FROM payments WHERE order_id=${orderId} FOR UPDATE`);\n    const [order]', '    await tx.execute(sql`SELECT id FROM orders WHERE id=${orderId} FOR UPDATE`);\n    await tx.execute(sql`SELECT id FROM payments WHERE order_id=${orderId} FOR UPDATE`);\n    const [order]')
modify(p,'    await tx.execute(sql`SELECT id FROM payments WHERE id=${claim.paymentRowId} FOR UPDATE`);', '''    await tx.execute(sql`SELECT id FROM orders WHERE id=${claim.order.id} FOR UPDATE`);
    await tx.execute(sql`SELECT id FROM payments WHERE id=${claim.paymentRowId} FOR UPDATE`);
    const [currentOrder] = await tx.select().from(orders).where(eq(orders.id, claim.order.id)).limit(1);''')
modify(p,'    if (index === -1) return;','''    if (index === -1 || attempts[index].webhookSecret !== claim.webhookSecret || !currentOrder) return;
    const stateAlreadyResolved = payment.status === "completed" || payment.status === "refunded"
      || ["paid", "refunded"].includes(currentOrder.paymentStatus)
      || currentOrder.status === "cancelled" || attempts[index].status !== "creating";
    if (stateAlreadyResolved) {
      // A verified webhook can win the create-link race. Enrich metadata only.
      if ("link" in outcome) {
        attempts[index] = { ...attempts[index], linkId: outcome.link.id, url: outcome.link.url };
        await tx.update(payments).set({ providerResponse: { ...previous, attempts }, updatedAt: new Date() } as any).where(eq(payments.id, payment.id));
      }
      return;
    }''')
block(p,'    const isCurrentAttempt = payment.transactionId === referenceId;','\n  return {\n    orderId: finalOrder.id,', '''    const observed = await applyUnpaidWaylObservation(dbOrThrow(), {
      orderId: order.id, referenceId, amount, currency, providerStatus: context.status,
      mappedStatus,
    });
    finalOrder = { ...order, status: observed.orderStatus, paymentStatus: observed.paymentStatus } as Order;
  }
''')
modify(p,'paymentStatus: mappedStatus === "paid" ? "paid" : (finalOrder.paymentStatus as AquavoPaymentStatus) || mappedStatus,','paymentStatus: (finalOrder.paymentStatus as AquavoPaymentStatus) || mappedStatus,')
modify(p,'  const { order, payment } = await getOrderAndPayment(orderId);\n  const meta = safeProviderResponse(payment.providerResponse);\n  await db.transaction(async (tx) => {', '  await db.transaction(async (tx) => {')
modify(p,'    // Even a cancelled / out-of-stock paid order must have ledger evidence','''    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    const [payment] = await tx.select().from(payments).where(eq(payments.orderId, orderId)).limit(1);
    if (!order || !payment) throw new Error("Order payment unavailable");
    if ((order.paymentStatus === "paid" && payment.status === "completed") || order.paymentStatus === "refunded") return;
    const meta = safeProviderResponse(payment.providerResponse);
    // Even a cancelled / out-of-stock paid order must have ledger evidence''')
modify(p,'for (const line of lines) {\n      const product = await lockProductRowForUpdate','for (const line of [...lines].sort((a, b) => a.productId.localeCompare(b.productId))) {\n      const product = await lockProductRowForUpdate')
modify(p,'for (const line of lines) {\n        const product = await lockProductRowForUpdate','for (const line of [...lines].sort((a, b) => a.productId.localeCompare(b.productId))) {\n        const product = await lockProductRowForUpdate')
modify(p,'if (order.status === "cancelled" || order.paymentStatus === "cancelled") {','if (order.status === "cancelled") {')
modify(p,'if (order.status === "cancelled" || order.paymentStatus === "cancelled" || payment.status === "cancelled") {','if (order.status === "cancelled") {')
modify('server/storage/invoice-storage.ts','    const { orders, orderItems } = await import("../../shared/schema.js");', '    const { orders, orderItems } = await import("../../shared/schema.js");\n    const { projectNewOrderCosts } = await import("../services/order-cost-projection.js");')
modify('server/storage/invoice-storage.ts','      for (const item of invoiceLines) {','      for (const item of [...invoiceLines].sort((a, b) => String(a.productId).localeCompare(String(b.productId)))) {')
modify('server/storage/invoice-storage.ts','      await tx.insert(orders).values({\n        id: orderId,','      const [createdOrder] = await tx.insert(orders).values({\n        id: orderId,')
modify('server/storage/invoice-storage.ts','        updatedAt: new Date(),\n      });\n\n      // 3. Relational', '        updatedAt: new Date(),\n      }).returning();\n\n      // 3. Relational')
modify('server/storage/invoice-storage.ts','        // and is blocked when inventory_ledger_mode=enforce.\n      }','        // and is blocked when inventory_ledger_mode=enforce.\n      }\n      await projectNewOrderCosts(tx, createdOrder);')
