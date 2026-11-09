import { Link } from "wouter";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronDown, Eye, Save } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/loaders";
import { MetaTags } from "@/components/seo/meta-tags";
import { useJourney } from "@/hooks/use-journey";
import { JourneyProgress } from "@/components/journey/journey-progress";
import { SavedPlanView } from "@/components/journey/saved-plan-view";
import { STEPS } from "@/components/journey/constants";
import { JourneyTankVisualizer } from "@/components/journey/journey-experience";
import { TankSelection } from "@/components/journey/tank-selection";
import { LocationSetup } from "@/components/journey/location-setup";
import { EquipmentSelection } from "@/components/journey/equipment-selection";
import { DecorationSetup } from "@/components/journey/decoration-setup";
import { WaterParameters } from "@/components/journey/water-parameters";
import { NitrogenCycle } from "@/components/journey/nitrogen-cycle";
import { FishSelection } from "@/components/journey/fish-selection";
import { MaintenanceSchedule } from "@/components/journey/maintenance-schedule";
import { JourneySummary } from "@/components/journey/journey-summary";
import "./journey-layout.css";

export default function JourneyPage() {
  const { t } = useTranslation("tools");
  const panelRef = useRef<HTMLElement>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const {
    currentStep, setCurrentStep, wizardData, updateData, continueJourney,
    nextStep, prevStep, saveJourney, resetJourney, savedPlan,
    hasActiveSession, isLoadingSavedPlan, isSaving,
  } = useJourney();
  const lastStep = useRef(currentStep);
  const isSummary = currentStep === STEPS.length - 1;

  useEffect(() => {
    if (lastStep.current === currentStep) return;
    lastStep.current = currentStep;
    const panel = panelRef.current;
    const heading = panel?.querySelector("h2");
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
    panel?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [currentStep]);

  if (isLoadingSavedPlan && !hasActiveSession) return <PageLoader />;

  if (savedPlan && !hasActiveSession && currentStep === 0) {
    return <SavedPlanView plan={savedPlan} onContinue={continueJourney} onDelete={resetJourney} />;
  }

  const renderStep = () => {
    const commonProps = { wizardData, updateData };
    switch (currentStep) {
      case 1: return <LocationSetup {...commonProps} />;
      case 2: return <EquipmentSelection {...commonProps} />;
      case 3: return <DecorationSetup {...commonProps} />;
      case 4: return <WaterParameters {...commonProps} />;
      case 5: return <NitrogenCycle {...commonProps} />;
      case 6: return <FishSelection {...commonProps} />;
      case 7: return <MaintenanceSchedule {...commonProps} />;
      case 8: return <JourneySummary wizardData={wizardData} onReset={resetJourney} onSave={saveJourney} isSaving={isSaving} />;
      default: return <TankSelection {...commonProps} />;
    }
  };

  return (
    <div className="aqv-journey-layout" data-aqv-motion="journey">
      <MetaTags
        title={t("journey.s2")}
        description={t("journey.s3")}
        keywords={[t("journey.s4"), t("journey.s5"), t("journey.s6"), "AQUAVO"]}
      />
      <div className="aqv-journey-wrap">
        <header className="aqv-journey-header">
          <h1>{t("journey-layout.title")}</h1>
          <p>{t("journey-layout.description")}</p>
        </header>

        <div className="aqv-journey-workspace">
          <JourneyProgress steps={STEPS} currentStep={currentStep} setCurrentStep={setCurrentStep} />

          <aside className="aqv-journey-aside" aria-label={t("journey-layout.preview")}>
            <button
              type="button"
              className="aqv-journey-preview-toggle"
              aria-expanded={previewOpen}
              aria-controls="journey-live-preview"
              onClick={() => setPreviewOpen(!previewOpen)}
            >
              <Eye aria-hidden="true" size={18} />
              <span>{t("journey-layout.preview")}</span>
              <ChevronDown aria-hidden="true" size={18} className="aqv-journey-chevron" />
            </button>
            <div id="journey-live-preview" className="aqv-journey-aside-body" data-expanded={previewOpen}>
              <div className="aqv-journey-aside-title">
                <Eye aria-hidden="true" size={18} />
                <h2>{t("journey-layout.preview")}</h2>
              </div>
              <JourneyTankVisualizer data={wizardData} currentStep={currentStep} total={STEPS.length} />
              <p className="aqv-journey-preview-caption">{t("journey-layout.previewNote")}</p>
            </div>
          </aside>

          <section className="aqv-journey-main" ref={panelRef}>
            <div key={currentStep} className="aqv-journey-step-panel" data-tour="journey-content">
              {renderStep()}
            </div>
            <div className="aqv-journey-actions" data-tour="journey-nav">
              {currentStep > 0 && (
                <Button type="button" variant="outline" onClick={prevStep} className="aqv-journey-back">
                  <ArrowLeft aria-hidden="true" />{t("journey.s9")}
                </Button>
              )}
              {!isSummary && (
                <>
                  <Button type="button" variant="ghost" onClick={saveJourney} disabled={isSaving} className="aqv-journey-save">
                    <Save aria-hidden="true" />{isSaving ? t("journey.s10") : t("journey.s11")}
                  </Button>
                  <Button type="button" onClick={nextStep} className="aqv-journey-next">
                    {currentStep === STEPS.length - 2 ? t("journey.s12") : t("journey.s13")}
                    <ArrowLeft aria-hidden="true" />
                  </Button>
                </>
              )}
            </div>
          </section>
        </div>

        <footer className="aqv-journey-footer">
          <Link href="/products">{t("journey.existingTank")}</Link>
        </footer>
      </div>
    </div>
  );
}
