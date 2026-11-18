import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startVisiblePresence } from "../visible-presence";

describe("visible presence lifecycle", () => {
  let visibility: DocumentVisibilityState;
  let cleanups: Array<() => void>;

  beforeEach(() => {
    vi.useFakeTimers();
    visibility = "visible";
    cleanups = [];
    vi.spyOn(document, "visibilityState", "get").mockImplementation(() => visibility);
  });

  afterEach(() => {
    for (const cleanup of cleanups) cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  function mount() {
    const callbacks = { enter: vi.fn(), heartbeat: vi.fn(), leave: vi.fn() };
    const cleanup = startVisiblePresence(callbacks);
    cleanups.push(cleanup);
    return { ...callbacks, cleanup };
  }

  function setVisibility(state: DocumentVisibilityState, dispatch = true) {
    visibility = state;
    if (dispatch) document.dispatchEvent(new Event("visibilitychange"));
  }

  function transition(type: "pagehide" | "pageshow", persisted = false) {
    const event = new Event(type);
    Object.defineProperty(event, "persisted", { value: persisted });
    window.dispatchEvent(event);
  }

  it("preserves the 300ms enter debounce and 20s heartbeat while visible", () => {
    const presence = mount();
    vi.advanceTimersByTime(299);
    expect(presence.enter).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(presence.enter).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(19_699);
    expect(presence.heartbeat).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(presence.heartbeat).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(20_000);
    expect(presence.heartbeat).toHaveBeenCalledTimes(2);
    expect(presence.leave).not.toHaveBeenCalled();
  });

  it("starts no presence requests or timers when initially hidden", () => {
    setVisibility("hidden", false);
    const presence = mount();
    vi.advanceTimersByTime(60_000);
    expect(vi.getTimerCount()).toBe(0);
    expect(presence.enter).not.toHaveBeenCalled();
    expect(presence.heartbeat).not.toHaveBeenCalled();
    expect(presence.leave).not.toHaveBeenCalled();

    setVisibility("visible");
    vi.advanceTimersByTime(300);
    expect(presence.enter).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(19_700);
    expect(presence.heartbeat).toHaveBeenCalledTimes(1);
  });

  it("cancels a pending enter when hidden before its debounce completes", () => {
    const presence = mount();
    vi.advanceTimersByTime(100);
    setVisibility("hidden");
    vi.advanceTimersByTime(60_000);
    expect(vi.getTimerCount()).toBe(0);
    expect(presence.enter).not.toHaveBeenCalled();
    expect(presence.heartbeat).not.toHaveBeenCalled();
    expect(presence.leave).toHaveBeenCalledTimes(1);
  });

  it("pauses on hide and resumes once despite duplicate visible/pageshow events", () => {
    const presence = mount();
    vi.advanceTimersByTime(300);
    setVisibility("hidden");
    setVisibility("hidden");
    vi.advanceTimersByTime(60_000);
    expect(presence.leave).toHaveBeenCalledTimes(1);
    expect(presence.heartbeat).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);

    setVisibility("visible");
    setVisibility("visible");
    transition("pageshow");
    transition("pageshow");
    vi.advanceTimersByTime(300);
    expect(presence.enter).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(19_700);
    expect(presence.heartbeat).toHaveBeenCalledTimes(1);
  });

  it("pauses in the back/forward cache and resumes only after pageshow", () => {
    const presence = mount();
    vi.advanceTimersByTime(300);
    transition("pagehide", true);
    // Some browsers keep visibilityState visible briefly during navigation.
    setVisibility("visible");
    vi.advanceTimersByTime(60_000);
    expect(presence.leave).toHaveBeenCalledTimes(1);
    expect(presence.heartbeat).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);

    transition("pageshow", true);
    vi.advanceTimersByTime(300);
    expect(presence.enter).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(19_700);
    expect(presence.heartbeat).toHaveBeenCalledTimes(1);
  });

  it("guards timer callbacks when visibility changes before its event arrives", () => {
    const presence = mount();
    setVisibility("hidden", false);
    vi.advanceTimersByTime(20_000);
    expect(presence.enter).not.toHaveBeenCalled();
    expect(presence.heartbeat).not.toHaveBeenCalled();
    expect(presence.leave).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("removes old route timers and listeners on cleanup without duplicate leave", () => {
    const oldRoute = mount();
    vi.advanceTimersByTime(300);
    oldRoute.cleanup();
    oldRoute.cleanup();
    expect(oldRoute.leave).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);

    const nextRoute = mount();
    transition("pageshow");
    setVisibility("visible");
    vi.advanceTimersByTime(20_000);
    expect(oldRoute.enter).toHaveBeenCalledTimes(1);
    expect(oldRoute.heartbeat).not.toHaveBeenCalled();
    expect(nextRoute.enter).toHaveBeenCalledTimes(1);
    expect(nextRoute.heartbeat).toHaveBeenCalledTimes(1);

    nextRoute.cleanup();
    setVisibility("hidden");
    transition("pagehide");
    setVisibility("visible");
    transition("pageshow");
    vi.advanceTimersByTime(60_000);
    expect(nextRoute.heartbeat).toHaveBeenCalledTimes(1);
    expect(nextRoute.leave).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
