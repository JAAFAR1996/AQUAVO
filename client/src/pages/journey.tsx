import { Link } from "wouter";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronDown, ChevronUp, Eye, Save } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/loaders";
import { MetaTags } from "@/components/seo/meta-tags";
import { useJourney } from "@/hooks/use-journey";
import { JourneyProgress } from "@/components/journey/journey-progress";
import { SavedPlanView } from "@/components/journey/saved-plan-view";
import { STEPS } from "@/components/journey/constants";
import { JourneyTankVisualizer } from "@/components/journey/journey-experience";
import { AquascapeStyles } from "@/components/journey/aquascape-styles";
import { TankSelection } from "@/components/journey/tank-selection";
import { LocationSetup } from "@/components/journey/location-setup";
import { EquipmentSelection } from "@/components/journey/equipment-selection";
import { DecorationSetup } from "@/components/journey/decoration-setup";
import { WaterParameters } from "@/components/journey/water-parameters";
import { NitrogenCycle } from "@/components/journey/nitrogen-cycle";
import { FishSelection } from "@/components/journey/fish-selection";
import { MaintenanceSchedule } from "@/components/journey/maintenance-schedule";
import { JourneySummary } from "@/components/journey/journey-summary";
import type { WizardData } from "@/types/journey";
import "@/styles/journey-fonts.css";
import "./journey-layout.css";

// A few static marks mirror actual choices without mounting a second scene.
function PreviewVignette({ data }: { data: WizardData }) {
  const decor = data.decorations;
  const floor = data.substrateType;
  const floorColor = floor === "planted-substrate" ? "#79685c" : floor === "gravel" ? "#a69e91" : "#cfb88a";
  const light = Boolean(data.lightingType && data.lightingType !== "none");
  return <svg className="aqv-journey-preview-vignette" viewBox="0 0 84 54" fill="none" aria-hidden="true" focusable="false">
    <path d="M5 9 64 6l14 6-2 29-13 5-57-2Z" fill="#7b9395" fillOpacity=".13" stroke="#789596" strokeWidth="1.5" strokeLinejoin="round" />
    {decor.includes("background") && <path data-layer="background" d="m8 12 55-3v31L8 41Z" fill="#445354" />}
    {data.waterSource && <g data-layer="water">
      <path d="m8 15 55-2v29L8 41Z" fill="#35757b" fillOpacity=".78" />
      <path d="m63 13 12-2-2 28-10 3Z" fill="#28585e" fillOpacity=".8" />
      <path d="M8 16c12 1 21-2 31-1s16-1 24-1" stroke="#8bd0cb" strokeWidth="1.25" />
    </g>}
    {floor && <g data-layer="substrate" fill={floorColor}>
      <path d="M8 36c11-3 16-2 25 1s18 2 30-1v6L8 41Z" /><path d="m63 36 10-4v7l-10 3Z" opacity=".75" />
      {floor === "mixed" && <path d="m8 36 20-1 7 5-27 1Z" fill="#ac9781" />}
    </g>}
    <g transform={floor ? undefined : "translate(0 4)"}>
      {(decor.includes("live-plants") || decor.includes("artificial-plants")) && <path data-layer="plants" d="M15 35c-1-5-4-8-5-9 4 0 7 3 8 7-1-6 0-11 2-14 1 5 1 8 0 14 2-4 5-7 8-8-1 4-4 8-7 10Z" fill="#90ba88" />}
      {decor.includes("driftwood") && <path data-layer="wood" d="m34 37 4-7 7-6m-8 8-4-6m7 3 6-1" stroke="#ac876a" strokeWidth="2.7" strokeLinecap="round" />}
      {decor.includes("rocks") && <g data-layer="rocks"><path d="m29 37 6-9 6-1 6 10Z" fill="#536f71" /><path d="m29 37 6-9 6-1-4 8Z" fill="#8aa09a" /></g>}
      {decor.includes("caves") && <path data-layer="cave" d="M47 38c0-10 14-12 15 0h-4c-1-5-6-5-7 0Z" fill="#9f937e" />}
    </g>
    <path d="M7 10 63 8l12 4M63 8v35M9 46l54 2 11-4" stroke="#a1c0bc" strokeOpacity=".7" strokeLinecap="round" strokeLinejoin="round" />
    <path d="m13 20 5-6m-4 11 8-10" stroke="#adc3c2" strokeOpacity=".55" strokeLinecap="round" />
    {light ? <path data-layer="light" d="m17 6 38-2" stroke="#cecaab" strokeWidth="3" strokeLinecap="round" />
      : data.filterType && data.filterType !== "unknown" ? <rect data-layer="filter" x="54" y="11" width="5" height="12" rx="1.2" fill="#647d80" />
      : data.heaterWattage > 0 && <path data-layer="heater" d="m58 14-1 14" stroke="#839799" strokeWidth="2" strokeLinecap="round" />}
  </svg>;
}

function focusPreviewControl(control: HTMLButtonElement | null, block: ScrollLogicalPosition = "start") {
  control?.focus({ preventScroll: true });
  control?.scrollIntoView({ block, behavior: "instant" });
}

export default function JourneyPage() {
  const { t } = useTranslation("tools");
  const panelRef = useRef<HTMLElement>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const previewToggleRef = useRef<HTMLButtonElement>(null);
  const previewJumpRef = useRef<HTMLButtonElement>(null);
  const previewOpener = useRef<"toggle" | "jump">("toggle");
  const restorePreviewFocus = useRef(false);
  const {
    currentStep, setCurrentStep, wizardData, updateData, continueJourney,
    nextStep, prevStep, saveJourney, resetJourney, savedPlan,
    hasActiveSession, isLoadingSavedPlan, isSaving,
  } = useJourney();
  const lastStep = useRef(currentStep);
  const isSummary = currentStep === STEPS.length - 1;
  const capacity = wizardData.tankLiters > 0 ? t("journey-experience.s19", { v0: wizardData.tankLiters }) : null;

  const closePreview = () => {
    restorePreviewFocus.current = true;
    setPreviewOpen(false);
  };

  const openPreviewFromStep = () => {
    previewOpener.current = "jump";
    setPreviewOpen(true);
    focusPreviewControl(previewToggleRef.current);
  };

  useEffect(() => {
    if (previewOpen || !restorePreviewFocus.current) return;
    restorePreviewFocus.current = false;
    if (previewOpener.current === "jump") focusPreviewControl(previewJumpRef.current, "center");
    else focusPreviewControl(previewToggleRef.current);
  }, [previewOpen]);

  const exploreStep = (step: number) => {
    if (step !== currentStep) {
      setCurrentStep(step);
      return;
    }
    const heading = panelRef.current?.querySelector("h2");
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
    panelRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
  };

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
      case 8: return <JourneySummary wizardData={wizardData} onReset={resetJourney} onSave={saveJourney} isSaving={isSaving} onEditStep={exploreStep} />;
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
          <div>
            <span className="aqv-journey-eyebrow">{t("journey-layout.eyebrow")}</span>
            <h1>{t("journey-layout.title")}</h1>
            <p>{t("journey-layout.description")}</p>
          </div>
          <div className="aqv-journey-header-note">
            <span aria-hidden="true">{String(currentStep + 1).padStart(2, "0")} / {String(STEPS.length).padStart(2, "0")}</span>
            <span>{t("journey-layout.stepByStep")}</span>
          </div>
        </header>

        <div className="aqv-journey-workspace">
          <aside className="aqv-journey-aside" aria-label={t("journey-layout.preview")}>
            <button
              ref={previewToggleRef}
              type="button"
              className="aqv-journey-preview-toggle"
              aria-expanded={previewOpen}
              aria-controls="journey-live-preview"
              onClick={() => {
                if (previewOpen) closePreview();
                else {
                  previewOpener.current = "toggle";
                  setPreviewOpen(true);
                }
              }}
            >
              <PreviewVignette data={wizardData} />
              <span className="aqv-journey-preview-copy">
                <strong>{t(previewOpen ? "journey-layout.previewClose" : "journey-layout.previewOpen")}</strong>
                <span>{capacity ? <>{t("journey-layout.volume")}: <bdi>{capacity}</bdi></> : t("journey-layout.previewSizePending")}</span>
              </span>
              <ChevronDown aria-hidden="true" size={18} className="aqv-journey-chevron" />
            </button>
            <div id="journey-live-preview" className="aqv-journey-aside-body" data-expanded={previewOpen}>
              <div className="aqv-journey-aside-title">
                <div><Eye aria-hidden="true" size={18} /><h2>{t("journey-layout.preview")}</h2></div>
                <span className="aqv-journey-live-label"><i aria-hidden="true" />{t("journey-layout.live")}</span>
              </div>
              <JourneyTankVisualizer data={wizardData} currentStep={currentStep} total={STEPS.length} onExploreStep={exploreStep} />
              <div className="aqv-journey-measurements">
                <div>
                  <span>{t("journey-layout.volume")}</span>
                  <strong>{capacity ?? t("journey-layout.notChosen")}</strong>
                </div>
                <div>
                  <span>{t("tank-dimensions.title")}</span>
                  <strong>{wizardData.tankLengthCm && wizardData.tankWidthCm && wizardData.tankHeightCm
                    ? <bdi dir="ltr">{wizardData.tankLengthCm} × {wizardData.tankWidthCm} × {wizardData.tankHeightCm}</bdi>
                    : t("journey-layout.addDimensions")}</strong>
                </div>
              </div>
              <AquascapeStyles data={wizardData} updateData={updateData} />
              <p className="aqv-journey-preview-caption">{t("journey-layout.previewNote")}</p>
              <button type="button" className="aqv-journey-preview-close" onClick={closePreview} aria-controls="journey-live-preview">
                <ChevronUp size={16} aria-hidden="true" />{t("journey-layout.previewClose")}
              </button>
            </div>
          </aside>

          <JourneyProgress steps={STEPS} currentStep={currentStep} setCurrentStep={setCurrentStep} />

          <section className="aqv-journey-main" ref={panelRef}>
            <div key={currentStep} className="aqv-journey-step-panel" data-tour="journey-content">
              {renderStep()}
            </div>
            <button type="button" className="aqv-journey-preview-jump" ref={previewJumpRef} onClick={openPreviewFromStep} aria-controls="journey-live-preview">
              <Eye size={17} aria-hidden="true" />{t("journey-layout.preview")}
            </button>
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
