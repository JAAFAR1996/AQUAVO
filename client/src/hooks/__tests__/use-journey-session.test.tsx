import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useJourney } from "../use-journey";
import { normalizeWizardData } from "@/components/journey/utils";

vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

function blockLocalStorage() {
    const unavailable = () => { throw new DOMException("Storage unavailable", "SecurityError"); };
    vi.spyOn(window.localStorage, "getItem").mockImplementation(unavailable);
    vi.spyOn(window.localStorage, "setItem").mockImplementation(unavailable);
}

function createWrapper() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    return ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const jsonResponse = (data: unknown) => new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });

afterEach(() => { vi.restoreAllMocks(); });

describe("journey session without browser storage", () => {
    it("preserves in-memory answers at step zero after saving and refetching a partial account plan", async () => {
        blockLocalStorage();
        let remotePlan: Record<string, unknown> | null = null;
        vi.stubGlobal("fetch", vi.fn(async (_input: RequestInfo | URL, options?: RequestInit) => {
            if (options?.method === "POST") {
                // The current account schema does not retain litres, dimensions or exact species.
                remotePlan = { tankSize: "medium", tankType: "freshwater-community", currentStep: 0 };
                return jsonResponse({ success: true, data: remotePlan });
            }
            return jsonResponse({ success: true, data: remotePlan });
        }));

        const { result } = renderHook(() => useJourney(), { wrapper: createWrapper() });
        await waitFor(() => expect(result.current.isLoadingSavedPlan).toBe(false));
        expect(result.current.hasActiveSession).toBe(false);

        act(() => {
            result.current.updateData("tankLiters", 81);
            result.current.updateData("tankLengthCm", 60);
            result.current.updateData("tankWidthCm", 30);
            result.current.updateData("tankHeightCm", 45);
            result.current.updateData("selectedSpecies", ["betta"]);
        });
        act(() => { result.current.saveJourney(); });
        await waitFor(() => expect(result.current.savedPlan).not.toBeNull());
        await waitFor(() => expect(result.current.isSaving).toBe(false));

        expect(result.current.savedPlan?.data.tankLiters).toBe(0);
        expect(result.current.hasActiveSession).toBe(true);
        expect(result.current.currentStep).toBe(0);
        expect(result.current.wizardData).toMatchObject({
            tankLiters: 81, tankLengthCm: 60, tankWidthCm: 30, tankHeightCm: 45, selectedSpecies: ["betta"],
        });
    });

    it("starts an in-memory session when continuing a saved plan at step zero", async () => {
        blockLocalStorage();
        vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ success: true, data: { tankType: "planted", currentStep: 0 } })));
        const { result } = renderHook(() => useJourney(), { wrapper: createWrapper() });
        await waitFor(() => expect(result.current.isLoadingSavedPlan).toBe(false));

        act(() => { result.current.continueJourney(normalizeWizardData({ tankLiters: 60, tankType: "planted" }), 0); });

        expect(result.current.hasActiveSession).toBe(true);
        expect(result.current.currentStep).toBe(0);
        expect(result.current.wizardData.tankLiters).toBe(60);
    });
});
