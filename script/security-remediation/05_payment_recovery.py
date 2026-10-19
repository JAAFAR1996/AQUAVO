from pathlib import Path
r=Path('.')
p=r/'server/services/wayl-order-payment.ts';s=p.read_text()
s=s.replace('"pending" | "paid" | "failed" | "cancelled" | "expired";','"pending" | "paid" | "failed" | "cancelled" | "expired" | "refunded";',1)
s=s.replace('export function mapWaylLinkStatus(status: string): AquavoPaymentStatus {','export function mapWaylLinkStatus(status: string): Exclude<AquavoPaymentStatus, "refunded"> {')
s=s.replace('    const lines = Array.isArray(order.items) ? order.items : [];','    if (["paid", "refunded"].includes(order.paymentStatus)) return;\n    const lines = Array.isArray(order.items) ? order.items : [];',1)
s=s.replace('    if (order.paymentStatus === "paid" || payment.status === "completed") {','    if (["paid", "refunded"].includes(order.paymentStatus) || ["completed", "refunded"].includes(payment.status)) {',1)
s=s.replace('      if (order.paymentStatus === "paid" && payment.status === "completed") {','      if ((order.paymentStatus === "paid" && payment.status === "completed") || order.paymentStatus === "refunded" || payment.status === "refunded") {',1)
s=s.replace('  const locallyPaid = order.paymentStatus === "paid" && payment.status === "completed";','''  // A verified historical Complete must never undo a documented refund.
  if (order.paymentStatus === "refunded" || payment.status === "refunded") {
    return { orderId: order.id, orderNumber: order.orderNumber || order.id, amount, currency,
      paymentId: payment.transactionId || referenceId, paymentStatus: "refunded", providerStatus: context.status,
      orderStatus: order.status, inventoryReview: false, newlyFinalized: false };
  }
  const locallyPaid = order.paymentStatus === "paid" && payment.status === "completed";''')
s=s.replace('  if (verified.paymentStatus === "paid") return verified;','  if (["paid", "refunded"].includes(verified.paymentStatus)) return verified;')
s=s.replace('  webhookSecret: string;\n}\n\n/**\n * Link creation','  webhookSecret: string;\n  recovering?: boolean;\n}\n\n/**\n * Link creation',1)
s=s.replace('''        // Abandoned claim: the previous process died between claim and record.
        attempts.splice(attempts.indexOf(currentAttempt), 1);''','''        // A timeout is not proof that Wayl failed to create a link. Preserve
        // its reference and signing secret, then reconcile outside this lock.
        if (typeof currentAttempt.webhookSecret !== "string" || !currentAttempt.webhookSecret) {
          throw Object.assign(new Error("محاولة الدفع تحتاج مراجعة آمنة قبل إعادة المحاولة."), { status: 409 });
        }
        currentAttempt.claimedAt = new Date(now).toISOString();
        await tx.update(payments).set({ providerResponse: { ...previous, attempts }, updatedAt: new Date() } as any)
          .where(eq(payments.id, payment.id));
        return { order, paymentRowId: payment.id, amount, currency, referenceId: currentAttempt.referenceId,
          webhookSecret: currentAttempt.webhookSecret, recovering: true };''')
s=s.replace('''    const restoreTo = attempts[index].previousTransactionId ?? null;
    attempts.splice(index, 1);
    await tx.update(payments).set({
      transactionId: restoreTo,
      providerResponse: { ...previous, attempts },
      updatedAt: new Date(),
    } as any).where(eq(payments.id, payment.id));''','''    // Keep uncertain claims. Recovery first reads this same provider reference.
    attempts[index] = { ...attempts[index], lastCreateFailureAt: new Date().toISOString() };
    await tx.update(payments).set({ providerResponse: { ...previous, attempts }, updatedAt: new Date() } as any)
      .where(eq(payments.id, payment.id));''')
s=s.replace('''  let link: WaylLink;
  try {
    link = await createWaylLink({''','''  let link: WaylLink | undefined;
  try {
    if (claimed.recovering) {
      try { link = await getWaylLinkByReferenceId(claimed.referenceId); }
      catch (error) {
        if (!(error instanceof WaylApiError) || error.status !== 404) throw error;
      }
    }
    link ??= await createWaylLink({''')
s=s.replace('  createWaylLink,\n  getWaylLinkByReferenceId,','  createWaylLink,\n  WaylApiError,\n  getWaylLinkByReferenceId,')
s=s.replace('  await recordLinkAttempt(claimed, { link });','''  if (!link || !isVerifiedPaymentContext({ referenceId: link.referenceId, amount: Number(link.total), currency: link.currency }, claimed)) {
    throw Object.assign(new Error("Payment creation response does not match its claim"), { status: 502 });
  }
  await recordLinkAttempt(claimed, { link });''')
s=s.replace(''' *   3. record (tx, FOR UPDATE)  – store id/url/status on the placeholder, or drop
 *                                the placeholder and restore the previous
 *                                transactionId if the call failed.''',''' *   3. record (tx, FOR UPDATE)  – merge link metadata without regressing verified
 *                                payment state. Preserve uncertain claims.''')
s=s.replace(' * mid-call) and is replaced.',' * mid-call) and is reconciled by its existing reference, never silently replaced.')
p.write_text(s)
p=r/'server/routes/payment-pages.ts';s=p.read_text().replace('["failed", "cancelled", "expired"]','["failed", "cancelled", "expired", "refunded"]')
s=s.replace('function failedPage(state: VerifiedOnlinePaymentState): string {','''function failedPage(state: VerifiedOnlinePaymentState): string {
  if (state.paymentStatus === "refunded") {
    return shell("تم تسجيل استرجاع المبلغ", `<section class="card"><h1>تم تسجيل استرجاع المبلغ</h1><p class="lead">هذه العملية مسترجعة حسب السجل المالي. لا تعِد الدفع لهذا الطلب. تواصل معنا لتفاصيل الاسترجاع.</p><a class="btn" href="/contact">تواصل معنا</a></section>`);
  }''');p.write_text(s)
p=r/'server/routes/wayl.ts';s=p.read_text().replace('["failed", "cancelled", "expired"]','["failed", "cancelled", "expired", "refunded"]');p.write_text(s)
