import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  isPostPaymentWaylStatus,
  isTerminalNonPaidWaylStatus,
  isVerifiedPaymentContext,
  mapWaylLinkStatus,
} from "../services/wayl-order-payment.js";

const service = readFileSync("server/services/wayl-order-payment.ts", "utf8");
const route = readFileSync("server/routes/wayl.ts", "utf8");
const vercelEntry = readFileSync("api/index.ts", "utf8");
const localEntry = readFileSync("server/index.ts", "utf8");

describe("Wayl status mapping (documented lifecycle only)", () => {
  it.each([
    ["Created", "pending"],
    ["Pending", "pending"],
    ["Processing", "pending"],
    ["Complete", "paid"],
    ["Delivered", "pending"],
    ["Returned", "pending"],
    ["Cancelled", "cancelled"],
    ["Rejected", "failed"],
  ])("maps %s → %s", (provider, local) => {
    expect(mapWaylLinkStatus(provider)).toBe(local);
  });

  it("only treats the documented Complete status as paid, case-insensitively, and never guesses", () => {
    expect(mapWaylLinkStatus("complete")).toBe("paid");
    expect(mapWaylLinkStatus("Completed")).toBe("pending");
    expect(mapWaylLinkStatus("Paid")).toBe("pending");
    expect(mapWaylLinkStatus("Succeeded")).toBe("pending");
    expect(mapWaylLinkStatus("")).toBe("pending");
    expect(mapWaylLinkStatus("SomeFutureStatusWeHaveNeverSeen")).toBe("pending");
  });

  it("classifies Cancelled/Rejected as terminal non-paid and Delivered/Returned as post-payment", () => {
    expect(isTerminalNonPaidWaylStatus("Cancelled")).toBe(true);
    expect(isTerminalNonPaidWaylStatus("Rejected")).toBe(true);
    for (const status of ["Created", "Pending", "Processing", "Complete", "Delivered", "Returned", "Expired", ""]) {
      expect(isTerminalNonPaidWaylStatus(status)).toBe(false);
    }
    expect(isPostPaymentWaylStatus("Delivered")).toBe(true);
    expect(isPostPaymentWaylStatus("Returned")).toBe(true);
    expect(isPostPaymentWaylStatus("Complete")).toBe(false);
  });
});

describe("verification context", () => {
  const expected = { referenceId: "order-123", amount: 12_500, currency: "IQD" };

  it("requires referenceId, amount and currency to all match", () => {
    expect(isVerifiedPaymentContext({ referenceId: "order-123", amount: 12_500, currency: "IQD" }, expected)).toBe(true);
    expect(isVerifiedPaymentContext({ referenceId: "order-123", amount: 12_500, currency: "iqd" }, expected)).toBe(true);
    expect(isVerifiedPaymentContext({ referenceId: "other", amount: 12_500, currency: "IQD" }, expected)).toBe(false);
    expect(isVerifiedPaymentContext({ referenceId: "order-123", amount: 12_000, currency: "IQD" }, expected)).toBe(false);
    expect(isVerifiedPaymentContext({ referenceId: "order-123", amount: 12_500, currency: "USD" }, expected)).toBe(false);
  });
});

describe("server-side verification contract", () => {
  it("re-reads the link from Wayl and matches it against the stored payment before any state change", () => {
    expect(service).toContain("const link = await getWaylLinkByReferenceId(referenceId);");
    expect(service).toContain("if (!isVerifiedPaymentContext(context, { referenceId, amount, currency })) {");
    expect(service.indexOf("getWaylLinkByReferenceId(referenceId)")).toBeLessThan(service.indexOf("finalizePaidOrder(order.id, referenceId, context)"));
  });

  it("keeps a verified paid order paid regardless of later provider statuses (monotonic)", () => {
    expect(service).toContain('const locallyPaid = order.paymentStatus === "paid" && payment.status === "completed";');
    expect(service).toContain("if (locallyPaid) {");
    expect(service).toContain('paymentStatus: "paid",\n      providerStatus: context.status,');
    expect(service.indexOf("if (locallyPaid) {")).toBeLessThan(service.indexOf('if (mappedStatus === "paid") {'));
  });

  it("flags a second Complete link on an already-paid order as a possible double charge", () => {
    expect(service).toContain("payment.transactionId !== referenceId");
    expect(service).toContain("احتمال دفع مكرر عبر Wayl");
  });

  it("never finalizes on Delivered/Returned without a prior Complete; it asks for review instead", () => {
    expect(service).toContain("if (isPostPaymentWaylStatus(context.status)) {");
    expect(service).toContain("حالة Wayl بعد الدفع بدون تأكيد سابق");
  });
});

describe("retry / double-charge protection", () => {
  it("only creates a new link after live re-verification shows Cancelled or Rejected", () => {
    expect(service).toContain("const verified = await verifyAndSyncWaylPayment(currentPaymentId, orderId);");
    expect(service).toContain("if (!isTerminalNonPaidWaylStatus(verified.providerStatus)) {");
    expect(service).toContain("return startWaylPaymentForOrder(orderId, urls, { forceNew: true });");
  });

  it("refuses forceNew in the claim step unless the current link is terminal non-paid (defense in depth)", () => {
    expect(service).toContain("options.forceNew && currentAttempt.url && !isTerminalNonPaidWaylStatus(String(currentAttempt.status || \"\"))");
  });

  it("reuses the existing link for a repeated checkout instead of creating a second one", () => {
    expect(service).toContain("} else if (!options.forceNew && currentAttempt.url) {");
    expect(service).toContain("reused: true,");
  });

  it("gives each attempt a unique referenceId that still resolves to the same AQUAVO order", () => {
    expect(service).toContain("`${order.id}#r${attempts.length}`");
    expect(service).toContain("function orderIdFromReferenceId(referenceId: string): string {");
  });
});

describe("database locking contract", () => {
  it("never holds a transaction or FOR UPDATE lock across the Wayl HTTP call", () => {
    const claimEnd = service.indexOf("async function recordLinkAttempt(");
    const startFn = service.indexOf("export async function startWaylPaymentForOrder(");
    const httpCall = service.indexOf("link = await createWaylLink({", startFn);
    expect(httpCall).toBeGreaterThan(startFn);
    const startBody = service.slice(startFn, service.indexOf("\n}\n", httpCall));
    expect(startBody).not.toContain("db.transaction(");
    expect(startBody).not.toContain("FOR UPDATE");
    expect(claimEnd).toBeGreaterThan(0);
  });

  it("claims the attempt (with its webhook secret) before the call so an early webhook can still be verified", () => {
    expect(service).toContain('status: "creating",');
    expect(service).toContain("webhookSecret,\n      status: \"creating\",");
    expect(service).toContain("if (\"link\" in outcome) {");
  });

  it("rejects a concurrent second creation while a live claim exists and reclaims abandoned ones", () => {
    expect(service).toContain("const LINK_CREATION_CLAIM_TTL_MS = 45_000;");
    expect(service).toContain("now - claimedAt < LINK_CREATION_CLAIM_TTL_MS");
    expect(service).toContain("جاري تجهيز رابط الدفع لهذا الطلب");
  });
});

describe("webhook route contract", () => {
  it("verifies HMAC over req.rawBody only and refuses when the raw body is unavailable", () => {
    expect(route).toContain("const rawBody = req.rawBody;");
    expect(route).toContain('message: "raw_body_unavailable"');
    expect(route).not.toContain("JSON.stringify(req.body");
    expect(route).toContain("verifyWaylWebhookSignature(rawBody, signatureHeader, bound.secret)");
  });

  it("re-verifies with Wayl after the signature check and never acts on the webhook body alone", () => {
    expect(route).toContain("const state = await verifyAndSyncWaylPayment(referenceId);");
    expect(route).not.toContain("payload.paymentStatus");
    expect(route).not.toContain("payload.total");
  });

  it("never echoes the webhook secret or provider payloads to clients", () => {
    expect(route).not.toContain("webhookSecret");
    expect(route).not.toContain("providerResponse");
  });

  // Production regression (2026-09-18): Wayl POSTs server-to-server with no
  // Origin/Referer, and the Vercel entrypoint's CSRF guard answered 403
  // ("[Security] Blocked mutating request with missing origin") before the
  // router ever ran. Both entrypoints must exempt exactly this path.
  it("is exempt from the browser-origin CSRF guard in BOTH the Vercel and the local entrypoint", () => {
    expect(vercelEntry).toContain('realRoute === "/api/payments/wayl/webhook"');
    expect(localEntry).toContain('"/api/payments/wayl/webhook"');
  });
});

describe("availability route contract", () => {
  it("answers from the layered readiness check and exposes only { available } publicly", () => {
    expect(route).toContain("const readiness = await checkWaylReadiness();");
    expect(route).toContain("res.json({ available: readiness.available });");
    expect(route).not.toMatch(/res\.json\(\{[^}]*reason/);
    expect(route).not.toMatch(/res\.json\(\{[^}]*checks/);
  });

  it("logs the readiness reason server-side only", () => {
    expect(route).toContain('console.log(`[AQUAVO Wayl] availability: ${readiness.reason}');
  });

  it("fails closed with a customer-safe Arabic message when Wayl refuses links for an unverified store", () => {
    expect(route).toContain("if (isWaylStoreVerificationError(error)) {");
    expect(route).toContain("noteWaylStoreVerificationFailure();");
    expect(route).toContain("res.status(503).json({ message: \"الدفع الإلكتروني غير متاح حالياً. اختر الدفع عند الاستلام وراح نكمل طلبك.\" });");
  });
});
