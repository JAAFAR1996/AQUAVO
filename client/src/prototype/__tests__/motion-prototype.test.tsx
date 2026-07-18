/**
 * PREVIEW-ONLY motion prototype: isolation + gating tests.
 * Confirms the experimental control never appears on production domains, is
 * off by default, and that the demo route shows the "no real order" notice.
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  MotionPrototypeProvider,
  PrototypeControl,
  isPrototypeEnvironment,
} from "../motion-prototype";
import MotionPrototypeCheckout from "@/pages/motion-prototype-checkout";

// Real catalogue read is mocked so the demo route can be unit-tested offline.
vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/api")>()),
  fetchProducts: vi.fn(() =>
    Promise.resolve({
      products: [
        { id: "1", name: "فلتر تجريبي", price: 25000, image: "/img/1.png", slug: "p1" },
        { id: "2", name: "سخان تجريبي", price: 18000, image: "/img/2.png", slug: "p2" },
        { id: "3", name: "إضاءة تجريبية", price: 32000, image: "/img/3.png", slug: "p3" },
        { id: "4", name: "غذاء تجريبي", price: 9000, image: "/img/4.png", slug: "p4" },
      ],
    })
  ),
}));

function withQuery(node: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{node}</QueryClientProvider>;
}

function setHostname(host: string) {
  Object.defineProperty(window, "location", {
    value: { ...window.location, hostname: host },
    writable: true,
    configurable: true,
  });
}

afterEach(() => {
  try { sessionStorage.clear(); } catch { /* ignore */ }
});

describe("motion prototype isolation", () => {
  it("treats production domains as NOT a prototype environment", () => {
    setHostname("aquavoiq.com");
    expect(isPrototypeEnvironment()).toBe(false);
    setHostname("www.aquavoiq.com");
    expect(isPrototypeEnvironment()).toBe(false);
  });

  it("treats preview/other domains as a prototype environment", () => {
    setHostname("aquavo-abc123-jaafar1996s-projects.vercel.app");
    expect(isPrototypeEnvironment()).toBe(true);
  });

  it("hides the Preview control on production domains", () => {
    setHostname("aquavoiq.com");
    render(
      <MotionPrototypeProvider>
        <PrototypeControl />
      </MotionPrototypeProvider>
    );
    expect(screen.queryByText("الحركة التجريبية")).toBeNull();
    expect(screen.queryByText("الأصلي")).toBeNull();
  });

  it("shows Arabic Original/Motion toggle on a preview domain, Original active by default", () => {
    setHostname("aquavo-preview.vercel.app");
    render(
      <MotionPrototypeProvider>
        <PrototypeControl />
      </MotionPrototypeProvider>
    );
    const original = screen.getByRole("button", { name: "الأصلي" });
    const motion = screen.getByRole("button", { name: "الحركة التجريبية" });
    expect(original).toHaveAttribute("aria-pressed", "true");
    expect(motion).toHaveAttribute("aria-pressed", "false");
  });
});

describe("motion prototype checkout demo route", () => {
  it("shows the demo-only notice and reads REAL catalogue products", async () => {
    render(withQuery(<MotionPrototypeCheckout />));
    expect(screen.getByText("نسخة تجريبية — لا يتم إنشاء طلب حقيقي")).toBeInTheDocument();
    // a real (mocked-catalogue) product name is rendered in the selector
    expect(await screen.findByText("فلتر تجريبي")).toBeInTheDocument();
    expect(screen.getByText("سخان تجريبي")).toBeInTheDocument();
    // default selection is 3 real products (quantity total shown)
    expect(await screen.findByText(/المختار: 3 منتج/)).toBeInTheDocument();
  });

  it("uses the AQUAVO / مُغَلَّف بعناية seal copy (no SEALED / مختوم)", async () => {
    const { container } = render(withQuery(<MotionPrototypeCheckout />));
    await screen.findByText("فلتر تجريبي");
    const text = container.textContent || "";
    expect(text).toContain("مُغَلَّف");
    expect(text).toContain("بعناية");
    expect(text).not.toContain("SEALED");
    expect(text).not.toContain("مختوم");
  });
});
