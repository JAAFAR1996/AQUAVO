import { describe, expect, it } from "vitest";
import { manualInvoiceShare } from "../services/manual-invoice-share.js";
import { updateManualInvoiceSchema } from "../../shared/schema.js";

const invoice = {
  token: "EXAMPLE", invoiceNo: "FH-TEST", customerName: "Test",
  customerPhone: "٠٧٧٠١٢٣٤٥٦٧", total: "10250.00", expiresAt: new Date("2026-01-02T03:04:00Z"),
};

describe("manual invoice sharing", () => {
  it.each([
    ["ckb", "/ckb/invoice/EXAMPLE", "پسووڵە", "بە کاتی بەغدا"],
    ["ar", "/invoice/EXAMPLE", "فاتورتك", "بتوقيت بغداد"],
  ] as const)("shares the saved %s language and exact expiry", (invoiceLocale, path, wording, zone) => {
    const result = manualInvoiceShare({ ...invoice, invoiceLocale }, "https://example.test");
    expect(result.customerLink).toBe("https://example.test" + path);
    const whatsapp = new URL(result.whatsappUrl);
    expect(whatsapp.pathname).toBe("/9647701234567");
    const message = whatsapp.searchParams.get("text") ?? "";
    for (const term of [wording, zone, result.customerLink, invoice.invoiceNo, "10", "250"]) expect(message).toContain(term);
    expect(message).not.toContain("48");
  });

  it("patches only supplied fields and rejects an unsupported language", () => {
    expect(updateManualInvoiceSchema.parse({ customerName: "Test" })).toEqual({ customerName: "Test" });
    expect(updateManualInvoiceSchema.parse({ invoiceLocale: "ckb" })).toEqual({ invoiceLocale: "ckb" });
    expect(updateManualInvoiceSchema.safeParse({ invoiceLocale: "en" }).success).toBe(false);
  });
});
