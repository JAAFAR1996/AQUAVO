import { StrictMode, type PropsWithChildren } from "react";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { recordProductView } from "@/lib/api";
import { getClientSessionId } from "@/lib/client-session";
import { isTrackingAllowed } from "@/lib/tracking-environment";
import { useProductView } from "../use-product-view";

vi.mock("@/lib/api", () => ({ recordProductView: vi.fn() }));
vi.mock("@/lib/client-session", () => ({ getClientSessionId: vi.fn() }));
vi.mock("@/lib/tracking-environment", () => ({ isTrackingAllowed: vi.fn() }));

let visibility: DocumentVisibilityState;

function changeVisibility(value: DocumentVisibilityState) {
  visibility = value;
  act(() => document.dispatchEvent(new Event("visibilitychange")));
}

beforeEach(() => {
  vi.clearAllMocks();
  visibility = "visible";
  vi.spyOn(document, "visibilityState", "get").mockImplementation(() => visibility);
  vi.mocked(recordProductView).mockResolvedValue(undefined);
  vi.mocked(getClientSessionId).mockReturnValue("cs_test_tab");
  vi.mocked(isTrackingAllowed).mockReturnValue(true);
});

afterEach(() => vi.restoreAllMocks());

describe("visible product page views", () => {
  it("waits for a product, then records once across effect replays and data refreshes", () => {
    const { rerender } = renderHook<void, { id: string | undefined }>(({ id }) => useProductView(id), {
      initialProps: { id: undefined },
      wrapper: ({ children }: PropsWithChildren) => <StrictMode>{children}</StrictMode>,
    });
    expect(recordProductView).not.toHaveBeenCalled();

    rerender({ id: "product-1" });
    rerender({ id: "product-1" });
    changeVisibility("hidden");
    changeVisibility("visible");

    expect(recordProductView).toHaveBeenCalledExactlyOnceWith("product-1", "cs_test_tab");
  });

  it("does not count a product opened in a background tab until it becomes visible", () => {
    visibility = "hidden";
    renderHook(() => useProductView("product-1"));
    expect(recordProductView).not.toHaveBeenCalled();

    changeVisibility("visible");
    expect(recordProductView).toHaveBeenCalledExactlyOnceWith("product-1", "cs_test_tab");
  });

  it("does not record an unmounted background page later", () => {
    visibility = "hidden";
    const { unmount } = renderHook(() => useProductView("product-1"));
    unmount();
    changeVisibility("visible");
    expect(recordProductView).not.toHaveBeenCalled();
  });

  it("records the next product when navigation reuses the detail component", () => {
    const { rerender } = renderHook(({ id }) => useProductView(id), { initialProps: { id: "product-1" } });
    rerender({ id: "product-2" });
    changeVisibility("hidden");
    changeVisibility("visible");
    expect(recordProductView).toHaveBeenCalledTimes(2);
    expect(recordProductView).toHaveBeenLastCalledWith("product-2", "cs_test_tab");
  });

  it.each(["cs_unavailable", "unknown", "cs_" + "x".repeat(65)])("ignores unusable session %s", (sessionId) => {
    vi.mocked(getClientSessionId).mockReturnValue(sessionId);
    renderHook(() => useProductView("product-1"));
    expect(recordProductView).not.toHaveBeenCalled();
  });

  it("keeps preview deployments out of storefront popularity", () => {
    vi.mocked(isTrackingAllowed).mockReturnValue(false);
    renderHook(() => useProductView("product-1"));
    expect(recordProductView).not.toHaveBeenCalled();
  });

  it("tolerates a failed event and retries when the page next becomes visible", async () => {
    vi.mocked(recordProductView).mockRejectedValueOnce(new Error("offline"));
    renderHook(() => useProductView("product-1"));
    await act(async () => {});

    changeVisibility("hidden");
    changeVisibility("visible");
    expect(recordProductView).toHaveBeenCalledTimes(2);
  });
});
