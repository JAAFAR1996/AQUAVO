import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startFirstDiveIntro } from "../first-dive-intro";

describe("first-visit reveal during bootstrap", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    document.body.innerHTML = '<div id="root"><h1>Server-rendered home</h1></div>';
    vi.spyOn(window, "matchMedia").mockReturnValue({ matches: false } as MediaQueryList);
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("finishes without waiting for React and never replaces or covers the home again", () => {
    const serverHeading = document.querySelector("h1");
    startFirstDiveIntro();
    expect(document.querySelector("#root .aqv-first-dive")).toBeNull();
    expect(document.querySelector(".aqv-first-dive")).toHaveAttribute("aria-hidden", "true");
    expect(document.querySelector(".aqv-first-dive img")).toHaveAttribute("src", "/brand/aquavo-v2-icon.svg");
    startFirstDiveIntro();
    expect(document.querySelectorAll(".aqv-first-dive")).toHaveLength(1);
    vi.advanceTimersByTime(920);
    expect(document.querySelector(".aqv-first-dive")).toBeNull();
    expect(document.querySelector("h1")).toBe(serverHeading);
    startFirstDiveIntro();
    expect(document.querySelector(".aqv-first-dive")).toBeNull();
  });

  it("honours reduced motion without delaying the home", () => {
    vi.mocked(window.matchMedia).mockReturnValue({ matches: true } as MediaQueryList);
    startFirstDiveIntro();
    expect(document.querySelector(".aqv-first-dive")).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps the home usable when browser storage is unavailable", () => {
    vi.spyOn(window.localStorage, "getItem").mockImplementation(() => { throw new Error("Storage blocked"); });
    expect(startFirstDiveIntro).not.toThrow();
    expect(document.querySelector(".aqv-first-dive")).toBeNull();
    expect(document.querySelector("h1")).toHaveTextContent("Server-rendered home");
  });
});
