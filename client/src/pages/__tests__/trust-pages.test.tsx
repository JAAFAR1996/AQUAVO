import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("wouter", () => ({
  Link: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...props}>{children}</a>,
}));
vi.mock("@/components/navbar", () => ({ default: () => <nav data-testid="navbar" /> }));
vi.mock("@/components/footer", () => ({ default: () => <footer data-testid="footer" /> }));
vi.mock("@/components/back-to-top", () => ({ BackToTop: () => null }));
vi.mock("@/lib/analytics", () => ({ trackBioLinkClick: vi.fn() }));

import About from "../about";
import Contact from "../contact";
import FAQ from "../faq";
import LinksPage from "../links";
import ReturnPolicy from "../return-policy";
import Shipping from "../shipping";
import WhyAquavo from "../why-aquavo";

afterEach(cleanup);

describe("customer trust pages", () => {
  it("keeps contact support available 24/7 without nested controls", () => {
    const { container } = render(<Contact />);
    expect(screen.getByRole("heading", { level: 1, name: "تواصل ويانه" })).toBeInTheDocument();
    expect(screen.getByText(/الدعم متوفر 24\/7/)).toBeInTheDocument();
    expect(screen.queryByText(/ساعات العمل|10:00 ص|9:00 م/)).not.toBeInTheDocument();
    expect(container.querySelector("a button, button a")).toBeNull();
  });

  it("limits FAQ answers to verified business facts", async () => {
    const user = userEvent.setup();
    render(<FAQ />);
    expect(screen.getByRole("heading", { level: 1, name: "أسئلة واضحة، أجوبة مباشرة" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "شلون أدفع؟" }));
    expect(screen.getByText(/نقداً عند الاستلام، أو إلكترونياً/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "شنو يبيع AQUAVO؟" }));
    expect(screen.getByText(/ما نبيع أسماك حية/)).toBeInTheDocument();
    expect(screen.queryByText(/جميع المعدات الإلكترونية.*ضمان/)).not.toBeInTheDocument();
    expect(screen.queryByText(/زيارات منزلية/)).not.toBeInTheDocument();
  });

  it("states the authoritative shipping promise without restrictive exceptions", () => {
    render(<Shipping />);
    expect(screen.getByRole("heading", { level: 1, name: "توصيل لكل العراق خلال 24 ساعة" })).toBeInTheDocument();
    expect(screen.getAllByText(/5,000 د\.ع/).length).toBeGreaterThan(0);
    expect(screen.getByText(/الدفع عند الاستلام/)).toBeInTheDocument();
    expect(screen.queryByText(/المناطق النائية|أيام الجمعة|العطل الرسمية/)).not.toBeInTheDocument();
  });

  it("separates delivery issues from disabled-by-default limited warranty", () => {
    render(<ReturnPolicy />);
    expect(screen.getByRole("heading", { level: 1, name: "مشاكل الاستلام والضمان المحدود" })).toBeInTheDocument();
    expect(screen.getByText(/فقط إذا صفحة المنتج تذكره بوضوح/)).toBeInTheDocument();
    expect(screen.getByText(/AQUAVO \/ محل المنبع/)).toBeInTheDocument();
    expect(screen.queryByText(/48 ساعة|استرداد بنكي/)).not.toBeInTheDocument();
  });

  it("explains AQUAVO with evidence instead of competitor or import claims", () => {
    render(<WhyAquavo />);
    expect(screen.getByRole("heading", { level: 1, name: "ليش AQUAVO؟" })).toBeInTheDocument();
    expect(screen.getByText(/براند عراقي بمواصفات عالمية لمعدات الأحواض البريميوم/)).toBeInTheDocument();
    expect(screen.queryByText(/مستوردة من الشركات المصنعة مباشرة|ضمان الأصالة 100%/)).not.toBeInTheDocument();
  });

  it("about page has no restrictive posted business hours and states 24/7 support instead", () => {
    render(<About />);
    expect(screen.queryByText(/9 صباحاً|9 مساءً|السبت - الخميس/)).not.toBeInTheDocument();
    expect(screen.getByText(/الدعم متوفر 24\/7/)).toBeInTheDocument();
  });

  it("about page does not imply a visitable showroom via posted hours next to the address", () => {
    render(<About />);
    // City reference is fine (matches other trust pages); a Clock icon + specific
    // opening/closing hours next to it is what implies a physical showroom.
    expect(screen.queryByText(/\d{1,2}\s*(صباحاً|مساءً)/)).not.toBeInTheDocument();
  });

  it("links page has no Google Maps showroom link", () => {
    render(<LinksPage />);
    expect(screen.queryByRole("link", { name: /موقعنا/ })).not.toBeInTheDocument();
    const mapsLinks = screen.queryAllByRole("link").filter((el) =>
      (el as HTMLAnchorElement).href.includes("maps.google.com")
    );
    expect(mapsLinks).toHaveLength(0);
  });

  it('links page does not contain the "first store in Iraq" superlative', () => {
    render(<LinksPage />);
    expect(screen.queryByText(/أول متجر/)).not.toBeInTheDocument();
  });
});
