import { useRef, useEffect } from "react";
import { ArrowRight, ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/loaders";
import { MetaTags } from "@/components/seo/meta-tags";

import { useJourney } from "@/hooks/use-journey";
import { JourneyProgress } from "@/components/journey/journey-progress";
import { SavedPlanView } from "@/components/journey/saved-plan-view";
import { STEPS } from "@/components/journey/constants";
import {
  JourneyFirstVisitIntro,
  JourneyTankVisualizer,
} from "@/components/journey/journey-experience";

import { TankSelection } from "@/components/journey/tank-selection";
import { LocationSetup } from "@/components/journey/location-setup";
import { EquipmentSelection } from "@/components/journey/equipment-selection";
import { DecorationSetup } from "@/components/journey/decoration-setup";
import { WaterParameters } from "@/components/journey/water-parameters";
import { NitrogenCycle } from "@/components/journey/nitrogen-cycle";
import { FishSelection } from "@/components/journey/fish-selection";
import { MaintenanceSchedule } from "@/components/journey/maintenance-schedule";
import { JourneySummary } from "@/components/journey/journey-summary";

function readWizardStep(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem("wizardStep");
  } catch {
    return null;
  }
}

function scrollBehavior(): ScrollBehavior {
  if (typeof window === "undefined") return "auto";
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

export default function JourneyPage() {
  const topRef = useRef<HTMLDivElement>(null);

  const {
    currentStep,
    setCurrentStep,
    wizardData,
    updateData,
    nextStep,
    prevStep,
    saveJourney,
    resetJourney,
    savedPlan,
    isLoadingSavedPlan,
    isSaving,
    products
  } = useJourney();

  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: scrollBehavior() });
  }, [currentStep]);

  if (isLoadingSavedPlan) return <PageLoader />;

  const localStep = readWizardStep();

  if (savedPlan && currentStep === 0 && JSON.stringify(wizardData).length < 200) {
    if (!localStep) {
      return (
        <SavedPlanView
          plan={savedPlan}
          onContinue={(data) => {
            Object.entries(data).forEach(([key, value]) => {
              updateData(key as any, value);
            });
          }}
          onDelete={resetJourney}
        />
      );
    }
  }

  const hasLocalSession = localStep !== null;
  const showSavedPlan = savedPlan && !hasLocalSession && currentStep === 0;

  if (showSavedPlan) {
    return (
      <SavedPlanView
        plan={savedPlan}
        onContinue={(data) => {
          Object.keys(data).forEach(key => updateData(key as any, data[key]));
        }}
        onDelete={resetJourney}
      />
    );
  }

  const renderStep = () => {
    const commonProps = { wizardData, updateData };

    switch (currentStep) {
      case 0: return <TankSelection {...commonProps} />;
      case 1: return <LocationSetup {...commonProps} />;
      case 2: return <EquipmentSelection {...commonProps} />;
      case 3: return <DecorationSetup {...commonProps} />;
      case 4: return <WaterParameters {...commonProps} />;
      case 5: return <NitrogenCycle {...commonProps} />;
      case 6: return <FishSelection {...commonProps} />;
      case 7: return <MaintenanceSchedule {...commonProps} />;
      case 8: return <JourneySummary wizardData={wizardData} products={products} />;
      default: return <TankSelection {...commonProps} />;
    }
  };

  const currentLabel = `الخطوة ${currentStep + 1} من ${STEPS.length} — ${STEPS[currentStep]?.title ?? "رحلة الحوض"}`;

  return (
    <div className="flex-1 overflow-x-hidden bg-background" ref={topRef} data-aqv-motion="journey">
      <MetaTags
        title="رحلتي مع الحوض"
        description="خطط لإعداد حوضك المثالي خطوة بخطوة مع دليل AQUAVO التفاعلي - من اختيار الحوض حتى إضافة الأسماك"
        keywords={["إعداد حوض الأسماك", "خطوات إنشاء حوض", "دليل مبتدئين", "AQUAVO"]}
      />
      <JourneyFirstVisitIntro />

      <div className="bg-primary/5 border-b border-primary/10 py-8 md:py-12 mb-8 pt-24">
        <div className="container text-center">
          <h1 className="text-3xl md:text-5xl font-black text-primary mb-4">
            رحلة إنشاء حوضك
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            خطوة بخطوة نحو حوض أحلامك. كل اختيار راح ينعكس مباشرة على المعاينة.
          </p>
        </div>
      </div>

      <div className="container max-w-5xl mx-auto px-4">
        <div className="aqv-journey-tank-shell">
          <JourneyTankVisualizer
            data={wizardData}
            currentStep={currentStep}
            total={STEPS.length}
            label={currentLabel}
          />
        </div>

        <div data-tour="journey-progress" data-aqv-membrane>
          <JourneyProgress
            steps={STEPS}
            currentStep={currentStep}
            setCurrentStep={setCurrentStep}
          />
        </div>

        <div
          key={currentStep}
          className="aqv-journey-step-panel"
          data-tour="journey-content"
          data-aqv-membrane
        >
          {renderStep()}
        </div>

        {currentStep < 8 && (
          <div className="flex justify-between items-center mt-8 gap-4" data-tour="journey-nav" data-aqv-motion="journey-controls">
            <Button
              variant="outline"
              size="lg"
              onClick={prevStep}
              disabled={currentStep === 0}
              className="min-w-[120px] aqv-press"
            >
              <ArrowRight className="ml-2 h-4 w-4" />
              السابق
            </Button>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={saveJourney}
                disabled={isSaving}
                className="flex text-primary hover:text-primary hover:bg-primary/10 aqv-press"
              >
                <Save className="ml-2 h-4 w-4" />
                {isSaving ? "جاري الحفظ..." : "حفظ المسودة"}
              </Button>

              <Button
                size="lg"
                onClick={nextStep}
                className="min-w-[140px] font-bold aqv-press"
              >
                {currentStep === 7 ? "إنهاء وعرض الخطة" : "التالي"}
                <ArrowLeft className="mr-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
