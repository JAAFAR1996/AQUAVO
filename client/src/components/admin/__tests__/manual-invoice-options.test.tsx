import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import ManualInvoiceCreator from "../manual-invoice-creator";

const product = {
  id: "tank", name: "حوض اختبار", price: "9000", hasVariants: true,
  variants: [
    { id: "small", label: "قياس صغير", price: null, priceStatus: "pending", stock: 4 },
    { id: "medium", label: "قياس وسط", price: 49000, stock: 0 },
    { id: "large", label: "قياس كبير", price: 53000, stock: 2 },
  ],
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("manual invoice product options", () => {
  it("adds the chosen priced variant by touch without substituting the parent price", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => Response.json(
      url.includes("product-search") ? { products: [product] } : url.includes("smart-search") ? { products: [] } : []
    )));
    render(<ManualInvoiceCreator onClose={() => {}} />);
    const search = screen.getByPlaceholderText("ابحث باسم المنتج، الفئة، أو الماركة...");
    fireEvent.change(search, { target: { value: "حوض" } });
    fireEvent.click(await screen.findByText(product.name));
    fireEvent.click(screen.getByRole("button", { name: /↳ قياس كبير/ }));
    expect(screen.getByText("حوض اختبار — قياس كبير")).toBeInTheDocument();
    expect(screen.getByText("53,000 د.ع / قطعة")).toBeInTheDocument();
  });

  it("shows an empty search and prevents fallback to a storefront quantity if the warehouse search fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.includes("smart-search")) return Response.json({ products: [product] });
      if (url.includes("outage")) return new Response(null, { status: 503 });
      if (url.includes("product-search")) return Response.json({ products: url.includes("empty") ? [] : [product] });
      return Response.json([]);
    }));
    render(<ManualInvoiceCreator onClose={() => {}} />);
    const search = screen.getByPlaceholderText("ابحث باسم المنتج، الفئة، أو الماركة...");
    fireEvent.change(search, { target: { value: "empty" } });
    expect(await screen.findByText('لا توجد نتائج لـ "empty"')).toBeInTheDocument();
    fireEvent.change(search, { target: { value: "حوض" } });
    expect(await screen.findByText(product.name)).toBeInTheDocument();
    fireEvent.change(search, { target: { value: "outage" } });
    expect(await screen.findByText("تعذّر تحميل المنتجات. جرّب البحث مرة ثانية.")).toBeInTheDocument();
    expect(screen.queryByText(product.name)).not.toBeInTheDocument();
    expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).includes("smart-search"))).toBe(false);
  });

  it("opens pending prices safely and only adds an available exact option by keyboard", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      const data = url.includes("product-search") ? { products: [product] }
        : url.includes("smart-search") ? { products: [] } : [];
      return new Response(JSON.stringify(data), { status: 200 });
    }));
    render(<ManualInvoiceCreator onClose={() => {}} />);
    const search = screen.getByPlaceholderText("ابحث باسم المنتج، الفئة، أو الماركة...");
    fireEvent.change(search, { target: { value: "حوض" } });
    fireEvent.click(await screen.findByText(product.name));
    expect(screen.getByRole("button", { name: /قياس صغير/ })).toBeDisabled();
    expect(screen.getByText("بانتظار التسعير")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /قياس وسط/ })).toBeDisabled();
    fireEvent.keyDown(search, { key: "ArrowDown" });
    fireEvent.keyDown(search, { key: "Enter" });
    expect(screen.getByText("حوض اختبار — قياس كبير")).toBeInTheDocument();
    expect(screen.getByText("53,000 د.ع / قطعة")).toBeInTheDocument();
  });
  it("stops at each option's own stock in the line, dropdown and keyboard, while allowing another size", async () => {
    const small = { id: "xs", label: "قياس ثاني", price: 1000, stock: 1 };
    vi.stubGlobal("fetch", vi.fn(async (url: string) => Response.json(url.includes("product-search")
      ? { products: [{ ...product, stock: 100, variants: [...product.variants, small] }] } : [])));
    render(<ManualInvoiceCreator onClose={() => {}} />);
    const search = screen.getByPlaceholderText("ابحث باسم المنتج، الفئة، أو الماركة...");
    const listOptions = async () => {
      fireEvent.change(search, { target: { value: "حوض" } });
      fireEvent.click(await screen.findByText(product.name));
    };
    await listOptions();
    fireEvent.click(screen.getByRole("button", { name: /↳ قياس كبير/ }));
    await listOptions();
    fireEvent.click(screen.getByRole("button", { name: /↳ قياس كبير/ }));
    const increase = screen.getByRole("button", { name: "زيادة كمية حوض اختبار — قياس كبير" });
    expect(increase).toBeDisabled();
    expect(screen.getByText("المتوفر بالمخزن: 2")).toBeInTheDocument();
    await listOptions();
    expect(screen.getByRole("button", { name: /قياس كبير.*أضفت كل الكمية/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /↳ قياس ثاني/ })).toBeEnabled();
    fireEvent.keyDown(search, { key: "ArrowDown" });
    fireEvent.keyDown(search, { key: "Enter" });
    expect(screen.getByRole("button", { name: "زيادة كمية حوض اختبار — قياس ثاني" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "تقليل كمية حوض اختبار — قياس كبير" }));
    expect(increase).toBeEnabled();
    fireEvent.click(increase);
    expect(increase).toBeDisabled();
  });

  it("shows a stock decrease on the selected line and requires its removal when the warehouse is empty", async () => {
    const simple = { id: "sand", name: "رمل اختبار", price: "2000", stock: 1 };
    let stock = 1;
    vi.stubGlobal("fetch", vi.fn(async (url: string) => Response.json(url.includes("product-search")
      ? { products: [{ ...simple, stock }] } : [])));
    render(<ManualInvoiceCreator onClose={() => {}} />);
    const search = screen.getByPlaceholderText("ابحث باسم المنتج، الفئة، أو الماركة...");
    fireEvent.change(search, { target: { value: "رمل" } });
    fireEvent.click(await screen.findByRole("button", { name: /رمل اختبار/ }));
    stock = 0;
    fireEvent.change(search, { target: { value: "رمل" } });
    expect(await screen.findByText(/المتوفر بالمخزن: 0.*احذف المنتج/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /رمل اختبار.*غير متوفر/ })).toBeDisabled();
    fireEvent.keyDown(search, { key: "ArrowDown" });
    fireEvent.keyDown(search, { key: "Enter" });
    expect(screen.getByRole("button", { name: "مسودة" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "حذف رمل اختبار" }));
    expect(screen.getByText("ابحث عن منتج وأضفه للفاتورة")).toBeInTheDocument();
  });

  it("keeps a draft editable after a live stock conflict and sends the corrected amount with a fresh key", async () => {
    const simple = { id: "filter", name: "فلتر اختبار", price: "6000", stock: 2 };
    const submitted: { key: string | null; items: Array<Record<string, unknown>> }[] = [];
    const onClose = vi.fn();
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit = {}) => {
      if (url.includes("product-search")) return Response.json({ products: [simple] });
      if (init.method !== "POST") return Response.json([]);
      submitted.push({ key: new Headers(init.headers).get("Idempotency-Key"), items: JSON.parse(String(init.body)).items });
      if (submitted.length === 1) return Response.json({ success: false, code: "INVOICE_STOCK_UNAVAILABLE",
        productId: simple.id, variantId: null, available: 1, message: "المتوفر من الفلتر 1" }, { status: 409 });
      return Response.json({ success: true, data: { id: "draft", invoiceNo: "TEST" } });
    }));
    render(<ManualInvoiceCreator onClose={onClose} />);
    fireEvent.change(screen.getByPlaceholderText("أحمد محمد"), { target: { value: "اختبار" } });
    fireEvent.change(screen.getByPlaceholderText("07xxxxxxxxx"), { target: { value: "07700000000" } });
    fireEvent.change(screen.getByPlaceholderText("ابحث باسم المنتج، الفئة، أو الماركة..."), { target: { value: "فلتر" } });
    fireEvent.click(await screen.findByText(simple.name));
    const increase = screen.getByRole("button", { name: "زيادة كمية فلتر اختبار" });
    fireEvent.click(increase);
    expect(increase).toBeDisabled();
    const save = screen.getByRole("button", { name: "مسودة" });
    fireEvent.click(save);
    expect(await screen.findByText(/المتوفر بالمخزن: 1.*قلّل الكمية/)).toBeInTheDocument();
    expect(save).toBeDisabled();
    expect(screen.getByRole("button", { name: /إرسال للعميل/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "تقليل كمية فلتر اختبار" }));
    expect(save).toBeEnabled();
    fireEvent.click(save);
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(submitted.map(request => request.items[0].quantity)).toEqual([2, 1]);
    expect(submitted[1].key).not.toBe(submitted[0].key);
    expect(submitted[1].items[0]).not.toHaveProperty("stockLimit");
  });

});
