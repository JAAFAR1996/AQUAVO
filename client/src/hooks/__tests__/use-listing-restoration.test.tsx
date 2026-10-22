import { StrictMode, useState } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Link, Route, Switch } from "wouter";
import { navigate } from "wouter/use-browser-location";
import { ListingNavigationBoundary, NavigationScrollReset } from "@/components/listing-navigation";
import { getNavigationEntry, installListingNavigation, readListingState } from "@/lib/listing-navigation";
import { useListingRestoration } from "../use-listing-restoration";

let uninstall: () => void;
let scrollY = 0;
let pageHeight = 6000;
let itemTop = 1600;
const resizeCallbacks = new Set<ResizeObserverCallback>();
const descriptors: Array<{ object: object; key: string; descriptor: PropertyDescriptor | undefined }> = [];

function overrideProperty(object: object, key: string, descriptor: PropertyDescriptor) {
  descriptors.push({ object, key, descriptor: Object.getOwnPropertyDescriptor(object, key) });
  Object.defineProperty(object, key, { configurable: true, ...descriptor });
}

function Catalog({ ready, showItem = true }: { ready: boolean; showItem?: boolean }) {
  const [count, setCount] = useState(() => readListingState("products", value =>
    typeof value === "number" ? value : undefined) ?? 24);
  const { containerRef, isRestoring } = useListingRestoration({
    kind: "products", state: count, ready, contentKey: ready && showItem ? "product:target" : "",
  });
  return <div ref={containerRef}>
    <output data-testid="count">{count}</output>
    <output data-testid="restoration">{isRestoring ? "pending" : "settled"}</output>
    <button onClick={() => setCount(value => value + 24)}>Load more</button>
    {ready && showItem ? <article data-listing-item="product:target">
      <Link href="/products/target">Open product</Link>
    </article> : <p>Waiting for products</p>}
  </div>;
}

function Harness({ ready = true, showItem = true }: { ready?: boolean; showItem?: boolean }) {
  return <>
    <NavigationScrollReset />
    <Switch>
      <Route path="/products"><ListingNavigationBoundary><Catalog ready={ready} showItem={showItem} /></ListingNavigationBoundary></Route>
      <Route path="/products/target"><p>Product detail</p></Route>
    </Switch>
  </>;
}

async function back() {
  await act(async () => {
    await new Promise<void>(resolve => {
      window.addEventListener("popstate", () => resolve(), { once: true });
      window.history.back();
    });
  });
}

function openProductAt(y = 1450) {
  scrollY = y;
  fireEvent.click(screen.getByText("Open product"));
  expect(screen.getByText("Product detail")).toBeInTheDocument();
  expect(scrollY).toBe(0);
}

beforeEach(() => {
  scrollY = 0;
  pageHeight = 6000;
  itemTop = 1600;
  window.sessionStorage.clear();
  window.history.replaceState({}, "", "/products");
  overrideProperty(window, "scrollY", { get: () => scrollY });
  overrideProperty(window, "innerHeight", { value: 800 });
  overrideProperty(document.documentElement, "scrollHeight", { get: () => pageHeight });
  overrideProperty(document.body, "scrollHeight", { get: () => pageHeight });
  vi.mocked(window.scrollTo).mockImplementation((options?: ScrollToOptions | number, y?: number) => {
    const requested = typeof options === "number" ? y ?? 0 : options?.top ?? 0;
    scrollY = Math.min(Math.max(0, requested), Math.max(0, pageHeight - window.innerHeight));
  });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    const top = this.dataset.listingItem ? itemTop - scrollY : 0;
    return new DOMRect(0, top, 300, 300);
  });
  vi.stubGlobal("ResizeObserver", class {
    constructor(private readonly callback: ResizeObserverCallback) { resizeCallbacks.add(callback); }
    observe() {}
    unobserve() {}
    disconnect() { resizeCallbacks.delete(this.callback); }
  });
  uninstall = installListingNavigation();
});

afterEach(() => {
  cleanup();
  uninstall();
  resizeCallbacks.clear();
  for (const { object, key, descriptor } of descriptors.splice(0).reverse()) {
    if (descriptor) Object.defineProperty(object, key, descriptor);
    else Reflect.deleteProperty(object, key);
  }
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("listing scroll restoration with real Wouter history", () => {
  it("restores loaded state and the clicked card's viewport offset, including repeated Back", async () => {
    render(<StrictMode><Harness /></StrictMode>);
    fireEvent.click(screen.getByText("Load more"));
    openProductAt();
    itemTop = 1900;
    await back();
    await waitFor(() => expect(screen.getByTestId("restoration")).toHaveTextContent("settled"));
    expect(screen.getByTestId("count")).toHaveTextContent("48");
    expect(scrollY).toBe(1750);

    openProductAt(1800);
    itemTop = 2200;
    await back();
    await waitFor(() => expect(screen.getByTestId("restoration")).toHaveTextContent("settled"));
    expect(scrollY).toBe(2100);
  });

  it("waits for slow results before restoring, without a delayed global reset", async () => {
    const view = render(<Harness />);
    openProductAt();
    view.rerender(<Harness ready={false} />);
    await back();
    expect(screen.getByTestId("restoration")).toHaveTextContent("pending");
    expect(scrollY).toBe(0);
    itemTop = 1900;
    view.rerender(<Harness ready />);
    await waitFor(() => expect(screen.getByTestId("restoration")).toHaveTextContent("settled"));
    expect(scrollY).toBe(1750);
  });

  it.each(["wheel", "touchmove", "pointerdown", "Enter"])("respects %s intent while a return is waiting", async intent => {
    const view = render(<Harness />);
    openProductAt();
    view.rerender(<Harness ready={false} />);
    await back();
    if (intent === "Enter") fireEvent.keyDown(window, { key: "Enter" });
    else fireEvent(window, new Event(intent));
    scrollY = 180;
    view.rerender(<Harness ready />);
    await waitFor(() => expect(screen.getByTestId("restoration")).toHaveTextContent("settled"));
    expect(scrollY).toBe(180);
  });

  it("retries when real document height grows instead of consuming an unreachable position", async () => {
    render(<Harness />);
    openProductAt();
    pageHeight = 1000;
    await back();
    expect(screen.getByTestId("restoration")).toHaveTextContent("pending");
    expect(scrollY).toBe(200);
    pageHeight = 6000;
    act(() => {
      for (const callback of resizeCallbacks) callback([], {} as ResizeObserver);
    });
    await waitFor(() => expect(screen.getByTestId("restoration")).toHaveTextContent("settled"));
    expect(scrollY).toBe(1450);
  });

  it("falls back to the saved offset if the product disappeared", async () => {
    const view = render(<Harness />);
    openProductAt();
    view.rerender(<Harness showItem={false} />);
    await back();
    await waitFor(() => expect(screen.getByTestId("restoration")).toHaveTextContent("settled"));
    expect(scrollY).toBe(1450);
  });

  it("starts a new PUSH to the same URL at the top with fresh local state", () => {
    render(<Harness />);
    fireEvent.click(screen.getByText("Load more"));
    const oldKey = getNavigationEntry().key;
    scrollY = 1450;
    act(() => navigate("/products"));
    expect(getNavigationEntry().key).not.toBe(oldKey);
    expect(screen.getByTestId("count")).toHaveTextContent("24");
    expect(scrollY).toBe(0);
  });

  it("preserves local state on same-entry URL replace and saves against the updated URL", async () => {
    render(<Harness />);
    fireEvent.click(screen.getByText("Load more"));
    scrollY = 1450;
    act(() => navigate("/products?food=betta", { replace: true }));
    expect(screen.getByTestId("count")).toHaveTextContent("48");
    expect(scrollY).toBe(1450);
    openProductAt();
    await back();
    await waitFor(() => expect(screen.getByTestId("restoration")).toHaveTextContent("settled"));
    expect(window.location.search).toBe("?food=betta");
    expect(screen.getByTestId("count")).toHaveTextContent("48");
    expect(scrollY).toBe(1450);
  });

  it("cancels a pending observer when navigating away before the list grows", async () => {
    render(<Harness />);
    openProductAt();
    pageHeight = 1000;
    await back();
    act(() => navigate("/products/target"));
    expect(resizeCallbacks.size).toBe(0);
    pageHeight = 6000;
    expect(scrollY).toBe(0);
  });
});
