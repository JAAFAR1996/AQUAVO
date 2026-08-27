/**
 * The admin dashboard's truth-card script ships in every page's HTML.
 *
 * Its fetch and its card writes were always guarded by isAdminPage(), but its
 * MutationObserver was not: a {childList, subtree, characterData} observer on
 * document.documentElement watched the whole tree on the homepage and on every
 * product page, queueing a requestAnimationFrame per mutation that then did
 * nothing. A Lighthouse pass attributed 128ms of script bootup to this file on
 * a product page.
 *
 * These tests run the real, shipped file — not a copy — so they cannot drift
 * from what the browser executes.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const SCRIPT = readFileSync(
  resolve(__dirname, "../../public/admin-dashboard-truth.js"),
  "utf8",
);

function runScriptAt(pathname: string) {
  window.history.replaceState({}, "", pathname);
  delete (window as unknown as Record<string, unknown>).__AQUAVO_ADMIN_TRUTH_BOOTSTRAP__;
  const observe = vi.fn();
  class FakeObserver {
    observe = observe;
    disconnect = vi.fn();
    takeRecords = vi.fn(() => []);
    constructor(_cb: unknown) {}
  }
  vi.stubGlobal("MutationObserver", FakeObserver);
  const setInterval = vi.fn(() => 1 as unknown as number);
  vi.stubGlobal("setInterval", setInterval);
  const fetchMock = vi.fn(async () => ({
    ok: true,
    json: async () => ({ success: true, data: { inventory: {}, orders: {} } }),
  }));
  vi.stubGlobal("fetch", fetchMock);
  // eslint-disable-next-line no-new-func
  new Function(SCRIPT)();
  return { observe, setInterval, fetchMock };
}

const realPushState = window.history.pushState;
const realReplaceState = window.history.replaceState;

beforeEach(() => {
  window.history.pushState = realPushState;
  window.history.replaceState = realReplaceState;
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.history.pushState = realPushState;
  window.history.replaceState = realReplaceState;
});

describe("the admin truth script stays off public pages", () => {
  it("observes nothing on the homepage", () => {
    const { observe, setInterval } = runScriptAt("/");
    expect(observe).not.toHaveBeenCalled();
    expect(setInterval).not.toHaveBeenCalled();
  });

  it("observes nothing on a product page", () => {
    const { observe, setInterval, fetchMock } = runScriptAt("/products/houyi-thermostat");
    expect(observe).not.toHaveBeenCalled();
    expect(setInterval).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("the admin truth script still works for admins", () => {
  it("arms the observer and the refresh timer on /admin", () => {
    const { observe, setInterval } = runScriptAt("/admin");
    expect(observe).toHaveBeenCalledTimes(1);
    expect(observe.mock.calls[0][1]).toMatchObject({ childList: true, subtree: true });
    expect(setInterval).toHaveBeenCalledTimes(1);
  });

  it("arms on a nested admin route too", () => {
    const { observe } = runScriptAt("/admin/finance");
    expect(observe).toHaveBeenCalledTimes(1);
  });

  it("arms when the client router pushes into /admin without a reload", () => {
    // The regression this guards: /admin is a wouter route, so a link into it
    // never reloads. Before, the always-on observer noticed incidentally.
    const { observe } = runScriptAt("/");
    expect(observe).not.toHaveBeenCalled();

    window.history.pushState({}, "", "/admin");
    expect(observe).toHaveBeenCalledTimes(1);
  });

  it("returns whatever the real pushState returns and does not swallow it", () => {
    runScriptAt("/");
    expect(() => window.history.pushState({}, "", "/products")).not.toThrow();
    expect(window.location.pathname).toBe("/products");
  });
});
