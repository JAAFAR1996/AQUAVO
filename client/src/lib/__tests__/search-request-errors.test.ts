import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchSmartSearch, searchProducts } from "../api";

afterEach(() => vi.restoreAllMocks());

describe("search request error handling", () => {
  it("keeps empty fallbacks for existing callers", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(fetch).mockRejectedValue(new Error("Offline"));
    await expect(searchProducts("pump")).resolves.toEqual([]);
    await expect(fetchSmartSearch("pump")).resolves.toEqual({ products: [], semantic: false });
  });

  it("reports failures when the result page needs to validate saved pagination", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("Offline"));
    await expect(searchProducts("pump", { throwOnError: true })).rejects.toThrow("Offline");
    await expect(fetchSmartSearch("pump", { throwOnError: true })).rejects.toThrow("Offline");
  });

  it("still accepts a successful empty result as a completed search", async () => {
    vi.mocked(fetch).mockImplementation(async () => new Response(
      JSON.stringify({ products: [], semantic: false }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ));
    await expect(searchProducts("pump", { throwOnError: true })).resolves.toEqual([]);
    await expect(fetchSmartSearch("pump", { throwOnError: true })).resolves.toEqual({ products: [], semantic: false });
  });
});
