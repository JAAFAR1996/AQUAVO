import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import type { WizardData } from "@/types/journey";
import { STEPS } from "@/components/journey/constants";
import { clampJourneyStep, normalizeSavedPlan, normalizeWizardData } from "@/components/journey/utils";
import { addCsrfHeader } from "@/lib/csrf";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

function persistLocalPlan(data: WizardData, step: number): boolean {
    try {
        localStorage.setItem("wizardData", JSON.stringify(data));
        localStorage.setItem("wizardStep", String(step));
        return true;
    } catch { return false; }
}

async function requireMutationSuccess(response: Response): Promise<void> {
    if (!response.ok) throw new Error("Journey request failed");
    z.object({ success: z.literal(true) }).parse(await response.json());
}

export function useJourney() {
    const { t } = useTranslation(["pages", "tools"]);
    const { toast } = useToast();
    const queryClient = useQueryClient();
    // The current session exists independently of browser storage. Saving a partial
    // account plan must never replace answers the user has already entered in memory.
    const [hasActiveSession, setHasActiveSession] = useState(() => {
        try {
            return localStorage.getItem("wizardStep") !== null || localStorage.getItem("wizardData") !== null;
        } catch { return false; }
    });
    const [currentStep, setStepState] = useState(() => {
        try { return clampJourneyStep(localStorage.getItem("wizardStep")); } catch { return 0; }
    });
    const [wizardData, setWizardData] = useState<WizardData>(() => {
        try {
            const saved = localStorage.getItem("wizardData");
            if (saved) {
                return normalizeWizardData(JSON.parse(saved));
            }
        } catch { /* Corrupt or unavailable local storage starts an unanswered plan. */ }
        return normalizeWizardData({});
    });

    const { data: savedPlan, isLoading: isLoadingSavedPlan } = useQuery({
        queryKey: ["journey-plan"],
        queryFn: async () => {
            const response = await fetch("/api/journey/plans", { credentials: "include" });
            if (!response.ok) return null;
            const result = z.object({ data: z.unknown() }).parse(await response.json());
            return normalizeSavedPlan(result.data);
        },
    });

    const savePlanMutation = useMutation({
        mutationFn: async (data: WizardData & { currentStep: number }) => {
            await requireMutationSuccess(await fetch("/api/journey/plans", {
                method: "POST", headers: addCsrfHeader({ "Content-Type": "application/json" }),
                credentials: "include", body: JSON.stringify(data),
            }));
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["journey-plan"] }); },
    });
    const deletePlanMutation = useMutation({
        mutationFn: async () => {
            await requireMutationSuccess(await fetch("/api/journey/plans", {
                method: "DELETE", headers: addCsrfHeader(), credentials: "include",
            }));
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["journey-plan"] }); },
        onError: () => {
            queryClient.invalidateQueries({ queryKey: ["journey-plan"] });
            toast({ title: t("journey-review.resetError", { ns: "tools" }), variant: "destructive" });
        },
    });

    // All step controls, including the progress strip, persist the same clamped step.
    const setCurrentStep = useCallback((step: number) => {
        setHasActiveSession(true);
        const next = clampJourneyStep(step);
        setStepState(next);
        try { localStorage.setItem("wizardStep", String(next)); } catch { /* Storage may be unavailable. */ }
    }, []);

    const updateData = useCallback(<K extends keyof WizardData>(key: K, value: WizardData[K]) => {
        setHasActiveSession(true);
        setWizardData((previous) => {
            const next = normalizeWizardData({ ...previous, [key]: value });
            persistLocalPlan(next, currentStep);
            return next;
        });
    }, [currentStep]);

    const continueJourney = useCallback((data: WizardData, step: number) => {
        setHasActiveSession(true);
        const restored = normalizeWizardData(data);
        const restoredStep = clampJourneyStep(step);
        setWizardData(restored);
        setStepState(restoredStep);
        persistLocalPlan(restored, restoredStep);
    }, []);

    const nextStep = useCallback(() => setCurrentStep(currentStep + 1), [currentStep, setCurrentStep]);
    const prevStep = useCallback(() => setCurrentStep(currentStep - 1), [currentStep, setCurrentStep]);

    const resetJourney = useCallback(() => {
        if (!confirm(t("use-journey.s1"))) return;
        setHasActiveSession(false);
        setWizardData(normalizeWizardData({}));
        setStepState(0);
        try {
            localStorage.removeItem("wizardData");
            localStorage.removeItem("wizardStep");
        } catch { /* Storage may be unavailable. */ }
        queryClient.setQueryData(["journey-plan"], null);
        deletePlanMutation.mutate();
    }, [deletePlanMutation, queryClient, t]);

    const saveJourney = useCallback(() => {
        setHasActiveSession(true);
        const localSaved = persistLocalPlan(wizardData, currentStep);
        savePlanMutation.mutate({ ...wizardData, currentStep }, {
            onSuccess: () => {
                toast({
                    title: t("use-journey.s2"),
                    description: t(localSaved ? "journey-review.saveScope" : "journey-review.localSaveFailed", { ns: "tools" }),
                });
            },
            onError: () => {
                toast({ title: t("use-journey.s4"), description: t("use-journey.s5"), variant: "destructive" });
            },
        });
    }, [savePlanMutation, wizardData, currentStep, toast, t]);

    return {
        currentStep, setCurrentStep, wizardData, savedPlan, isLoadingSavedPlan, hasActiveSession,
        steps: STEPS, updateData, continueJourney, nextStep, prevStep, resetJourney, saveJourney,
        isSaving: savePlanMutation.isPending,
    };
}
