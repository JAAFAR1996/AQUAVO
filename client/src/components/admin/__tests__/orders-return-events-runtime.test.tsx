import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("@/components/ui/table", () => ({
  Table: ({ children }: any) => <table>{children}</table>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableCell: ({ children, ...props }: any) => <td {...props}>{children}</td>,
  TableHead: ({ children, ...props }: any) => <th {...props}>{children}</th>,
  TableHeader: ({ children }: any) => <thead>{children}</thead>,
  TableRow: ({ children }: any) => <tr>{children}</tr>,
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children }: any) => <div>{children}</div>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: () => <span />,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, title }: any) => (
    <button type="button" onClick={onClick} disabled={disabled} title={title}>{children}</button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogDescription: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
}));

vi.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({ children, open }: any) => open ? <div>{children}</div> : null,
  AlertDialogAction: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
  AlertDialogCancel: ({ children }: any) => <button>{children}</button>,
  AlertDialogContent: ({ children }: any) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: any) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: any) => <h2>{children}</h2>,
}));

vi.mock("lucide-react", () => ({
  Package: () => <span>package</span>,
  Search: () => <span>search</span>,
  Eye: () => <span>view-order</span>,
  AlertTriangle: () => <span>alert</span>,
  Trash2: () => <span>trash</span>,
  ReceiptText: () => <span>receipt</span>,
  RotateCcw: () => <span>rotate</span>,
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/csrf", () => ({
  addCsrfHeader: (headers: Record<string, string>) => headers,
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@/components/admin/order-return-adjustment-modal", () => ({
  OrderReturnAdjustmentModal: () => null,
}));

vi.mock("@/components/admin/order-ship-carrier-dialog", () => ({
  OrderShipCarrierDialog: () => null,
}));

vi.mock("@/components/admin/fulfillment", () => ({
  OrderFulfillmentPanel: () => null,
}));

import { OrdersManagement } from "../orders-management";

const order = {
  id: "order-a",
  userId: "user-a",
  customerName: "Runtime Customer",
  customerEmail: "runtime@example.com",
  customerPhone: "07700000000",
  items: [{ productId: "p1", productName: "Runtime Product", quantity: 1, price: 13000 }],
  total: 18000,
  status: "delivered",
  orderNumber: "FH-RUNTIME-A",
  shippingCost: 5000,
  createdAt: "2026-08-07T10:00:00.000Z",
  updatedAt: "2026-08-07T10:00:00.000Z",
};

const verifiedEvent = {
  id: "verified-a",
  type: "customer_return",
  status: "verified",
  note: "confirmed return",
  refundAmount: 13000,
  deliveryCostLoss: 0,
  returnShippingCost: 0,
  packagingLoss: 0,
  productWriteOffAmount: 0,
  cogsLoss: 0,
  createdAt: "2026-08-07T11:00:00.000Z",
};

const disputedEvent = {
  ...verifiedEvent,
  id: "disputed-a",
  status: "disputed",
  note: "preserved as disputed legacy record",
  refundAmount: 18000,
};

describe("OrdersManagement operational return events runtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requests verified events for the selected order and renders only that response", async () => {
    const requestedUrls: string[] = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      requestedUrls.push(url);

      if (url === "/api/admin/orders") {
        return new Response(JSON.stringify([order]), { status: 200, headers: { "Content-Type": "application/json" } });
      }

      if (url.startsWith("/api/admin/accounting/return-events")) {
        const data = url.includes("orderId=order-a") && url.includes("status=verified")
          ? [verifiedEvent]
          : [verifiedEvent, disputedEvent];
        return new Response(JSON.stringify({ success: true, data }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<OrdersManagement />);

    await screen.findByText("FH-RUNTIME-A");
    fireEvent.click(screen.getByText("view-order"));

    await waitFor(() => {
      expect(requestedUrls).toContain(
        "/api/admin/accounting/return-events?orderId=order-a&period=year&status=verified",
      );
    });

    expect(await screen.findByText("تعديلات الفاتورة / الراجعات (1)")).toBeInTheDocument();
    expect(screen.getByText(/13,000/)).toBeInTheDocument();
    expect(screen.queryByText(/18,000/)).not.toBeInTheDocument();
    expect(screen.queryByText("preserved as disputed legacy record")).not.toBeInTheDocument();
  });
});
