import { afterEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { bootstrapI18n, i18next } from "@/i18n";
import { Route, Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import InvoiceView from "../invoice-view";

const invoice = {
  invoiceNo: "FH-TEST", customerName: "Test", status: "sent",
  items: [{ productId: "p1", name: "Test filter", quantity: 2, unitPrice: 5000, total: 10000 }],
  total: 10000, subtotal: 10000, discount: 0, delivery: 0,
};
function openReceipt() {
  render(<Router hook={memoryLocation({ path: "/invoice/test" }).hook}>
    <Route path="/invoice/:token"><InvoiceView /></Route>
  </Router>);
}

afterEach(async () => {
  vi.restoreAllMocks();
  await bootstrapI18n("ar");
});

it("renders and prints a Sorani snapshot on an Arabic storefront and retains the receipt on confirmation", async () => {
  await bootstrapI18n("ar");
  const print = vi.fn();
  vi.stubGlobal("print", print);
  vi.stubGlobal("confirm", vi.fn(() => true));
  const fetch = vi.fn(async (url: string) => Response.json(url.endsWith("/confirm")
    ? { success: true, orderId: "internal-id" }
    : { success: true, data: { ...invoice, invoiceLocale: "ckb" } }));
  vi.stubGlobal("fetch", fetch);
  openReceipt();
  expect(await screen.findByText("چاوەڕێی وەڵامی تۆین")).toBeInTheDocument();
  expect(screen.getByText(invoice.customerName).closest("[lang]")).toHaveAttribute("lang", "ckb");
  expect(i18next.language).toBe("ar");
  fireEvent.click(screen.getByRole("button", { name: "چاپکردنی پسووڵە" }));
  expect(print).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole("button", { name: "قبوڵکردنی داواکاری" }));
  expect(await screen.findByRole("link", { name: /چاودێری/ })).toHaveAttribute("href", "/ckb/order-tracking");
  expect(screen.getByRole("button", { name: "چاپکردنی پسووڵە" })).toBeInTheDocument();
});

it("uses Arabic for an older invoice with no chosen language on a Kurdish storefront", async () => {
  await bootstrapI18n("ckb");
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ success: true, data: invoice })));
  openReceipt();
  expect(await screen.findByText(invoice.customerName)).toBeInTheDocument();
  expect(screen.getByText(invoice.customerName).closest("[lang]")).toHaveAttribute("lang", "ar");
  expect(screen.getByRole("button", { name: i18next.getFixedT("ar", "orders")("order-confirmation.s74") })).toBeInTheDocument();
  expect(i18next.language).toBe("ckb");
});
