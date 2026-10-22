import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { navigate } from "wouter/use-browser-location";
import {
  getNavigationEntry,
  installListingNavigation,
  LISTING_ENTRY_KEY,
  readListingSnapshot,
  readListingState,
  saveListingSnapshot,
  subscribeBeforeNavigation,
} from "../listing-navigation";

let uninstall: () => void;
const unsubscribe: Array<() => void> = [];

function traverse(delta: number): Promise<void> {
  return new Promise(resolve => {
    window.addEventListener("popstate", () => resolve(), { once: true });
    window.history.go(delta);
  });
}

beforeEach(() => {
  window.sessionStorage.clear();
  window.history.replaceState({ routerField: "keep" }, "", "/products");
  uninstall = installListingNavigation();
});

afterEach(() => {
  unsubscribe.splice(0).forEach(stop => stop());
  uninstall();
  vi.restoreAllMocks();
});

describe("listing history ownership", () => {
  it("captures the old DOM before Wouter publishes its synchronous push event", () => {
    let visiblePage = "catalog";
    const captured: string[] = [];
    unsubscribe.push(subscribeBeforeNavigation(() => captured.push(visiblePage)));
    const onWouterNavigation = () => { visiblePage = "detail"; };
    window.addEventListener("pushState", onWouterNavigation);
    try {
      navigate("/products/test-product");
      expect(captured).toEqual(["catalog"]);
      expect(visiblePage).toBe("detail");
    } finally {
      window.removeEventListener("pushState", onWouterNavigation);
    }
  });

  it("restores separate visits to the same URL through Back and Forward", async () => {
    const first = getNavigationEntry();
    saveListingSnapshot(first, "products", { displayCount: 72, brand: "YEE" }, { y: 1800 });
    navigate("/products");
    const second = getNavigationEntry();
    expect(second.key).not.toBe(first.key);
    expect(readListingSnapshot("products")).toBeUndefined();
    saveListingSnapshot(second, "products", { displayCount: 24, brand: "SUNSUN" }, { y: 400 });
    navigate("/products/test-product");

    await traverse(-1);
    expect(readListingSnapshot("products")?.state).toEqual({ displayCount: 24, brand: "SUNSUN" });
    await traverse(-1);
    expect(readListingSnapshot("products")?.position.y).toBe(1800);
    expect(readListingSnapshot("products")?.state).toEqual({ displayCount: 72, brand: "YEE" });
    await traverse(1);
    expect(readListingSnapshot("products")?.position.y).toBe(400);
  });

  it("retains another history consumer's state fields on initialisation and replace", () => {
    const key = getNavigationEntry().key;
    expect(window.history.state).toEqual({ routerField: "keep", [LISTING_ENTRY_KEY]: key });
    window.history.replaceState({ extra: 9 }, "", "/products?category=filters");
    expect(window.history.state).toEqual({ routerField: "keep", extra: 9, [LISTING_ENTRY_KEY]: key });
    expect(getNavigationEntry()).toMatchObject({ key, type: "replace", url: "/products?category=filters" });
  });

  it("keeps the locale and full query as part of a saved entry's identity", async () => {
    navigate("/ckb/search?q=filter&type=products&page=3");
    const entry = getNavigationEntry();
    saveListingSnapshot(entry, "search", {}, { y: 880 });
    navigate("/ckb/products/test-product");
    await traverse(-1);
    expect(readListingSnapshot("search")?.position.y).toBe(880);
    expect(readListingSnapshot("products")).toBeUndefined();
    window.history.replaceState({}, "", "/en/search?q=filter&type=products&page=3");
    expect(readListingSnapshot("search")).toBeUndefined();
  });

  it("persists on pagehide and restores after a reload with the same history entry", () => {
    const entry = getNavigationEntry();
    saveListingSnapshot(entry, "products", { displayCount: 48 }, { y: 900 });
    window.dispatchEvent(new Event("pagehide"));
    uninstall();
    uninstall = installListingNavigation();
    expect(getNavigationEntry().key).toBe(entry.key);
    expect(readListingSnapshot("products")?.position.y).toBe(900);
  });

  it("continues in memory when sessionStorage is blocked", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Blocked"); });
    saveListingSnapshot(getNavigationEntry(), "products", { displayCount: 48 }, { y: 900 });
    expect(() => navigate("/products/test-product")).not.toThrow();
    await traverse(-1);
    expect(readListingSnapshot("products")?.position.y).toBe(900);
  });

  it("ignores corrupt stored data without preventing navigation", () => {
    uninstall();
    window.sessionStorage.setItem("aq_listing_history_v1", "{broken json");
    expect(() => { uninstall = installListingNavigation(); }).not.toThrow();
    expect(readListingSnapshot("products")).toBeUndefined();
    expect(() => navigate("/products/test-product")).not.toThrow();
  });

  it("discards a bad state and its position together", () => {
    saveListingSnapshot(getNavigationEntry(), "products", { displayCount: "invalid" }, { y: 900 });
    expect(readListingState("products", () => undefined)).toBeUndefined();
    expect(readListingSnapshot("products")).toBeUndefined();
  });

  it("does not let a failing optional capture block a product link", () => {
    unsubscribe.push(subscribeBeforeNavigation(() => { throw new Error("Capture failed"); }));
    expect(() => navigate("/products/test-product")).not.toThrow();
    expect(window.location.pathname).toBe("/products/test-product");
  });

  it("does not create a new entry for a same-URL metadata replacement", () => {
    const entry = getNavigationEntry();
    const capture = vi.fn();
    unsubscribe.push(subscribeBeforeNavigation(capture));
    window.history.replaceState({ analytics: true }, "");
    expect(getNavigationEntry()).toBe(entry);
    expect(capture).not.toHaveBeenCalled();
    expect(window.history.state.analytics).toBe(true);
  });
});
