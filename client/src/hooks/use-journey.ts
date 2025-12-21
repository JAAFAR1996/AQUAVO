import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { WizardData } from "@/types/journey";
import { INITIAL_WIZARD_DATA, STEPS } from "@/components/journey/constants";
import { addCsrfHeader } from "@/lib/csrf";
import { useToast } from "@/hooks/use-toast";
import { fetchProducts } from "@/lib/api";

export function useJourney() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // State Initialization
    const [currentStep, setCurrentStep] = useState(() => {
        const saved = localStorage.getItem("wizardStep");
        return saved ? parseInt(saved) : 0;
    });

    const [wizardData, setWizardData] = useState<WizardData>(() => {
        const saved = localStorage.getItem("wizardData");
        return saved ? JSON.parse(saved) : INITIAL_WIZARD_DATA;
    });

    // Queries
    const { data: productsData } = useQuery({
        queryKey: ["products"],
        queryFn: () => fetchProducts(),
    });

    const { data: savedPlan, isLoading: isLoadingSavedPlan } = useQuery({
        queryKey: ["journey-plan"],
        queryFn: async () => {
            const res = await fetch("/api/journey/plans");
            if (!res.ok) return null;
            const data = await res.json();
            return data.data;
        },
    });

    useEffect(() => {
        if (savedPlan) {
            setWizardData(savedPlan);
            // Optional: Restore step if saved in plan, for now we stick to local storage step
            // or maybe we want to ask user? For simplicity we keep current behavior.
        }
    }, [savedPlan]);

    // Mutations
    const savePlanMutation = useMutation({
        mutationFn: async (planData: WizardData & { currentStep: number }) => {
            const res = await fetch("/api/journey/plans", {
                method: "POST",
                headers: addCsrfHeader({ "Content-Type": "application/json" }),
                credentials: "include",
                body: JSON.stringify(planData),
            });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["journey-plan"] });
        },
    });

    const deletePlanMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch("/api/journey/plans", {
                method: "DELETE",
                headers: addCsrfHeader(),
                credentials: "include",
            });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["journey-plan"] });
        },
    });

    // Actions
    const updateData = useCallback(<K extends keyof WizardData>(key: K, value: WizardData[K]) => {
        setWizardData((prev) => {
            const newData = { ...prev, [key]: value };
            localStorage.setItem("wizardData", JSON.stringify(newData));
            return newData;
        });
    }, []);

    const nextStep = useCallback(() => {
        if (currentStep < STEPS.length - 1) {
            const next = currentStep + 1;
            setCurrentStep(next);
            localStorage.setItem("wizardStep", next.toString());
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    }, [currentStep]);

    const prevStep = useCallback(() => {
        if (currentStep > 0) {
            const prev = currentStep - 1;
            setCurrentStep(prev);
            localStorage.setItem("wizardStep", prev.toString());
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    }, [currentStep]);

    const resetJourney = useCallback(() => {
        if (confirm("هل أنت متأكد من البدء من جديد؟ سيتم فقدان جميع البيانات غير المحفوظة.")) {
            setWizardData(INITIAL_WIZARD_DATA);
            setCurrentStep(0);
            localStorage.removeItem("wizardData");
            localStorage.removeItem("wizardStep");
            deletePlanMutation.mutate();
        }
    }, [deletePlanMutation]);

    const saveJourney = useCallback(() => {
        savePlanMutation.mutate(
            { ...wizardData, currentStep },
            {
                onSuccess: () => {
                    toast({
                        title: "تم الحفظ!",
                        description: "تم حفظ خطتك بنجاح في حسابك.",
                    });
                },
                onError: () => {
                    toast({
                        title: "خطأ",
                        description: "يجب تسجيل الدخول لحفظ الخطة.",
                        variant: "destructive",
                    });
                },
            }
        );
    }, [savePlanMutation, wizardData, currentStep, toast]);

    return {
        currentStep,
        setCurrentStep,
        wizardData,
        savedPlan,
        isLoadingSavedPlan,
        products: productsData?.products || [],
        steps: STEPS,
        updateData,
        nextStep,
        prevStep,
        resetJourney,
        saveJourney,
        isSaving: savePlanMutation.isPending,
    };
}
