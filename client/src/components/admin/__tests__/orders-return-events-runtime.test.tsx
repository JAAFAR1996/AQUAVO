import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

type ChildrenProps = React.PropsWithChildren;
type OpenProps = React.PropsWithChildren<{ open?: boolean }>;
type ButtonProps = React.PropsWithChildren<{
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  title?: string;
}>;

vi.mock("@/components/ui/table", () => ({
  Table: ({ children }: ChildrenProps) => <table>{children}</table>,
  TableBody: ({ children }: ChildrenProps) => <tbody>{children}</tbody>,
  TableCell: ({ children, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => <td {...props}>{children}</td>,
  TableHead: ({ children, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => <th {...props}>{children}</th>,
  TableHeader: ({ children }: ChildrenProps) => <thead>{children}</thead>,
  TableRow: ({ children }: ChildrenProps) => <tr>{children}</tr>,
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: ChildrenProps) => <div>{children}</div>,
  SelectContent: ({ children }: ChildrenProps) => <div>{children}</div>,
  SelectItem: ({ children }: ChildrenProps) => <div>{children}</div>,
  SelectTrigger: ({ children }: ChildrenProps) => <div>{children}</div>,
  SelectValue: () => <span />,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: ChildrenProps) => <span>{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, title }: ButtonProps) => (
    <button type="button" onClick={onClick} disabled={disabled} title={title}>{children}</button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: OpenProps) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: ChildrenProps) => <div>{children}</div>,
  DialogDescription: ({ children }: ChildrenProps) => <div>{children}</div>,
  DialogHeader: ({ children }: ChildrenProps) => <div>{children}</div>,
  DialogTitle: ({ children }: ChildrenProps) => <h2>{children}</h2>,
}));

vi.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({ children, open }: OpenProps) => open ? <div>{children}</div> : null,
  AlertDialogAction: ({ children, onClick }: ButtonProps) => <button onClick={onClick}>{children}</button>,
  AlertDialogCancel: ({ children }: ChildrenProps) => <button>{children}</button>,
  AlertDialogContent: ({ children }: ChildrenProps) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: ChildrenProps) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: ChildrenProps) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: ChildrenProps) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: ChildrenProps) => <h2>{children}</h2>,
}));

vi.mock("lucide-react", () => ({
  Archive: () => <span>archive</span>,
  Package: () => <span>package</span>,
  Search: () => <span>search</span>,
  Eye: () => <span>view-order</span>,
  AlertTriangle: () => <span>alert</span>,
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

      if (url.startsWith("/api/admin/orders")) {
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
    expect(screen.getByText("confirmed return")).toBeInTheDocument();
    expect(screen.queryByText("preserved as disputed legacy record")).not.toBeInTheDocument();
  });
});
