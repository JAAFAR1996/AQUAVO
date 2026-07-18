/**
 * PREVIEW-ONLY motion prototype: isolation + gating tests.
 * Confirms the experimental control never appears on production domains, is
 * off by default, and that the demo route shows the "no real order" notice.
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  MotionPrototypeProvider,
  PrototypeControl,
  isPrototypeEnvironment,
} from "../motion-prototype";
import MotionPrototypeCheckout from "@/pages/motion-prototype-checkout";

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
    expect(screen.queryByText("Motion Prototype")).toBeNull();
    expect(screen.queryByText("Original")).toBeNull();
  });

  it("shows Original/Motion toggle on a preview domain, Original active by default", () => {
    setHostname("aquavo-preview.vercel.app");
    render(
      <MotionPrototypeProvider>
        <PrototypeControl />
      </MotionPrototypeProvider>
    );
    const original = screen.getByRole("button", { name: "Original" });
    const motion = screen.getByRole("button", { name: "Motion Prototype" });
    expect(original).toHaveAttribute("aria-pressed", "true");
    expect(motion).toHaveAttribute("aria-pressed", "false");
  });
});

describe("motion prototype checkout demo route", () => {
  it("renders the demo-only notice and never implies a real order", () => {
    render(<MotionPrototypeCheckout />);
    expect(screen.getByText("نسخة تجريبية — لا يتم إنشاء طلب حقيقي")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ابدأ العرض/ })).toBeInTheDocument();
  });
});
