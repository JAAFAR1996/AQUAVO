import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("wouter", () => ({
  useParams: () => ({ id: "yee" }),
  Link: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("@/components/navbar", () => ({ default: () => <nav data-testid="navbar" /> }));
vi.mock("@/components/footer", () => ({ default: () => <footer data-testid="footer" /> }));

import VerifyCertificate from "../verify-certificate";

describe("YEE certificate page", () => {
  it("scopes the document to YEE and separates it from warranty", () => {
    render(<VerifyCertificate />);

    expect(screen.getByRole("heading", { level: 1, name: "وثيقة أصالة منتجات YEE" })).toBeInTheDocument();
    expect(screen.getByText(/خاص بمنتجات YEE/)).toBeInTheDocument();
    expect(screen.getByText(/مو ضمان AQUAVO/)).toBeInTheDocument();
    expect(screen.queryByText(/YEE-AQ-2026-VERIFIED/)).not.toBeInTheDocument();
  });

  it("exposes the original image and PDF without a remote fallback", () => {
    render(<VerifyCertificate />);

    expect(screen.getByRole("img", { name: "وثيقة أصالة YEE الموردة إلى AQUAVO العراق" }))
      .toHaveAttribute("src", "/certificates/yee-certificate.jpg");
    expect(screen.getByRole("link", { name: /افتح ملف PDF/ }))
      .toHaveAttribute("href", "/certificates/yee-certificate.pdf");
  });

  it("opens an accessible viewer with zoom controls", async () => {
    const user = userEvent.setup();
    render(<VerifyCertificate />);

    await user.click(screen.getByRole("button", { name: "افتح الشهادة بحجم أكبر" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "تكبير الشهادة" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "تصغير الشهادة" })).toBeInTheDocument();
    expect(screen.getByText("100%", { selector: "output" })).toBeInTheDocument();
  });
});
