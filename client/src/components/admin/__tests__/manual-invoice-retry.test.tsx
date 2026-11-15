import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import ManualInvoiceCreator from "../manual-invoice-creator";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("recovers a lost create response, edits the same draft and retries sharing", async () => {
  const requests: { url: string; method: string; body?: string; key?: string | null }[] = [];
  const product = { id: "test", name: "فلتر اختبار", price: "4000", stock: 3 };
  let creates = 0;
  let sends = 0;
  const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit = {}) => {
    if (url.includes("product-search")) return json({ products: [product] });
    if (url.includes("smart-search")) return json({ products: [] });
    if (!init.method) return json([]);
    requests.push({ url, method: init.method, body: init.body as string, key: new Headers(init.headers).get("Idempotency-Key") });
    if (url === "/api/admin/invoices" && ++creates === 1) throw new Error("offline");
    if (url.endsWith("/send")) {
      if (++sends === 1) return json({ success: false, message: "busy" }, 503);
      return json({ success: true, data: { invoiceNo: "FH-TEST" }, customerLink: "/invoice/test", whatsappUrl: "#share" });
    }
    return json({ success: true, data: { id: "draft", invoiceNo: "FH-TEST" } });
  }));
  render(<ManualInvoiceCreator onClose={() => {}} />);
  fireEvent.change(screen.getByPlaceholderText("أحمد محمد"), { target: { value: "اختبار" } });
  fireEvent.change(screen.getByPlaceholderText("07xxxxxxxxx"), { target: { value: "07700000000" } });
  fireEvent.change(screen.getByPlaceholderText("ابحث باسم المنتج، الفئة، أو الماركة..."), { target: { value: "فلتر" } });
  fireEvent.click(await screen.findByText(product.name));
  const send = screen.getByRole("button", { name: /إرسال للعميل/ });
  fireEvent.click(send);
  await waitFor(() => expect(send).toBeEnabled());
  fireEvent.change(screen.getByPlaceholderText("أحمد محمد"), { target: { value: "اختبار معدل" } });
  fireEvent.click(send);
  await waitFor(() => expect(sends).toBe(1));
  await waitFor(() => expect(send).toBeEnabled());
  fireEvent.click(send);
  expect(await screen.findByRole("link", { name: /واتساب/ })).toBeInTheDocument();
  expect(requests.map(r => [r.method, r.url])).toEqual([
    ["POST", "/api/admin/invoices"], ["POST", "/api/admin/invoices"],
    ["PATCH", "/api/admin/invoices/draft"], ["POST", "/api/admin/invoices/draft/send"],
    ["POST", "/api/admin/invoices/draft/send"],
  ]);
  expect(requests[0].key).toBeTruthy();
  expect(requests[0].key).toBe(requests[1].key);
  expect(requests[0].body).toBe(requests[1].body);
  expect(JSON.parse(requests[2].body!)).toMatchObject({ customerName: "اختبار معدل", invoiceLocale: "ar" });
});
