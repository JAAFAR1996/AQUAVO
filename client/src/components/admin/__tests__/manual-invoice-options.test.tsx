import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
    fireEvent.click(screen.getByRole("button", { name: /قياس كبير/ }));
    expect(screen.getByText("حوض اختبار — قياس كبير")).toBeInTheDocument();
    expect(screen.getByText("53,000 د.ع / قطعة")).toBeInTheDocument();
  });

  it("shows a genuine empty search and survives the optional semantic service failing", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.includes("smart-search")) return new Response(null, { status: 503 });
      if (url.includes("product-search")) return Response.json({ products: url.includes("empty") ? [] : [product] });
      return Response.json([]);
    }));
    render(<ManualInvoiceCreator onClose={() => {}} />);
    const search = screen.getByPlaceholderText("ابحث باسم المنتج، الفئة، أو الماركة...");
    fireEvent.change(search, { target: { value: "empty" } });
    expect(await screen.findByText('لا توجد نتائج لـ "empty"')).toBeInTheDocument();
    fireEvent.change(search, { target: { value: "حوض" } });
    expect(await screen.findByText(product.name)).toBeInTheDocument();
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
});
