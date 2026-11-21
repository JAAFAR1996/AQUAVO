import { type PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/lib/queryClient";
import { useCreateCarton, useCreatePreparationCost, type CartonInput } from "../use-packaging";

vi.mock("@/lib/queryClient", () => ({ apiRequest: vi.fn() }));
vi.mock("@/i18n", () => ({ i18next: { t: (key: string) => key } }));

beforeEach(() => { vi.mocked(apiRequest).mockReset(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function wrapper() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } });
  return ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function success(id = "synthetic-material") {
  return new Response(JSON.stringify({ id }), { status: 201, headers: { "content-type": "application/json" } });
}

function recordedKey(call: number): string {
  const payload = vi.mocked(apiRequest).mock.calls[call][2] as Record<string, unknown>;
  expect(typeof payload.idempotencyKey).toBe("string");
  return String(payload.idempotencyKey);
}

function verifyCreateHook<TInput extends { name: string }>(
  label: string,
  useCreate: () => { mutateAsync(input: TInput): Promise<unknown> },
  input: TInput,
  endpoint: string,
) {
  describe(label, () => {
    it("reuses the same key after a lost response and rotates after a confirmed identical new creation", async () => {
      vi.mocked(apiRequest).mockRejectedValueOnce(new Error("response lost after commit"))
        .mockImplementation(async () => success());
      const { result, rerender } = renderHook(useCreate, { wrapper: wrapper() });
      const paddedInput = { ...input, name: `  ${input.name}  ` };
      await act(async () => {
        await expect(result.current.mutateAsync(paddedInput)).rejects.toThrow("response lost");
      });
      const uncertainKey = recordedKey(0);
      expect(apiRequest).toHaveBeenCalledWith("POST", endpoint, { ...paddedInput, idempotencyKey: uncertainKey });

      rerender();
      // The server trims these fields and ignores property order; a retry of
      // that same payload must keep its original write receipt.
      const reordered = Object.fromEntries(Object.entries(input).reverse()) as TInput;
      await act(async () => { await result.current.mutateAsync(reordered); });
      expect(recordedKey(1)).toBe(uncertainKey);
      await act(async () => { await result.current.mutateAsync(input); });
      expect(recordedKey(2)).not.toBe(uncertainKey);
    });

    it("rotates for a changed payload and retains its key across an invalid success body", async () => {
      vi.mocked(apiRequest).mockRejectedValueOnce(new Error("offline"))
        .mockResolvedValueOnce(new Response("{}", { status: 201 }))
        .mockImplementation(async () => success());
      const { result } = renderHook(useCreate, { wrapper: wrapper() });
      await act(async () => { await expect(result.current.mutateAsync(input)).rejects.toThrow("offline"); });
      const firstKey = recordedKey(0);
      const changed = { ...input, name: `${input.name} changed` };
      await act(async () => { await expect(result.current.mutateAsync(changed)).rejects.toThrow(); });
      const changedKey = recordedKey(1);
      expect(changedKey).not.toBe(firstKey);
      await act(async () => { await result.current.mutateAsync(changed); });
      expect(recordedKey(2)).toBe(changedKey);
    });

    it("does not let an older success clear a newer uncertain attempt and stores no attempt in browser storage", async () => {
      const storageWrite = vi.spyOn(Storage.prototype, "setItem");
      let finishFirst: (value: Response) => void = () => { throw new Error("first request not started"); };
      vi.mocked(apiRequest).mockImplementationOnce(() => new Promise<Response>(resolve => { finishFirst = resolve; }))
        .mockRejectedValueOnce(new Error("response lost"))
        .mockImplementation(async () => success("second-material"));
      const { result } = renderHook(useCreate, { wrapper: wrapper() });
      let first: Promise<unknown> = Promise.resolve();
      await act(async () => { first = result.current.mutateAsync(input); });
      const changed = { ...input, name: `${input.name} changed` };
      await act(async () => { await expect(result.current.mutateAsync(changed)).rejects.toThrow("response lost"); });
      const secondKey = recordedKey(1);
      await act(async () => { finishFirst(success("first-material")); await first; });
      await act(async () => { await result.current.mutateAsync(changed); });
      expect(recordedKey(2)).toBe(secondKey);
      expect(recordedKey(0)).not.toBe(secondKey);
      expect(storageWrite).not.toHaveBeenCalled();
    });
  });
}

verifyCreateHook<CartonInput>("carton creation", useCreateCarton, {
  name: "Synthetic carton", sku: "BOX-FIXTURE", internalLengthCm: 20,
  internalWidthCm: 30, internalHeightCm: 40, maxWeightKg: 5,
  safetyPaddingCm: 0, lowStockThreshold: 0,
}, "/api/admin/packaging/cartons");

verifyCreateHook("preparation material creation", useCreatePreparationCost, {
  name: "Synthetic wrapping", sku: "WRAP-FIXTURE", calculationBasis: "per_order" as const,
}, "/api/admin/packaging/preparation-costs");
