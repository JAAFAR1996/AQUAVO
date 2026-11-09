import { useRef } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { JourneyStepDefinition } from "@/types/journey";

const PHASES = [
  { key: "planning", from: 0, to: 2 },
  { key: "setup", from: 2, to: 6 },
  { key: "care", from: 6, to: 9 },
] as const;

interface JourneyProgressProps {
  steps: JourneyStepDefinition[];
  currentStep: number;
  setCurrentStep: (step: number) => void;
}

export function JourneyProgress({ steps, currentStep, setCurrentStep }: JourneyProgressProps) {
  const { t, i18n } = useTranslation("tools");
  const mapRef = useRef<HTMLDetailsElement>(null);
  const current = steps[currentStep] ?? steps[0];
  const phase = PHASES.find(({ from, to }) => currentStep >= from && currentStep < to) ?? PHASES[0];
  const title = (step: JourneyStepDefinition) => i18n.language.startsWith("ar")
    ? step.title
    : t(`journey-layout.steps.${step.id}`, { defaultValue: step.title });

  return (
    <div className="aqv-journey-progress" data-tour="journey-progress">
      <div className="aqv-journey-progress-heading">
        <span>{t(`journey-layout.phases.${phase.key}`)}</span>
        <strong>{t("journey.s1", { v0: currentStep + 1, v1: steps.length, v2: title(current) })}</strong>
      </div>
      <div className="aqv-journey-stage-track" aria-hidden="true">
        {PHASES.map(({ key, from, to }) => (
          <div key={key} data-active={key === phase.key}>
            {steps.slice(from, to).map((step, offset) => (
              <i key={step.id} data-current={from + offset === currentStep} />
            ))}
          </div>
        ))}
      </div>
      <details ref={mapRef} className="aqv-journey-map">
        <summary>
          {t("journey-layout.map")}
          <ChevronDown className="aqv-journey-chevron" aria-hidden="true" size={16} />
        </summary>
        <nav aria-label={t("journey-layout.map")}>
          {PHASES.map(({ key, from, to }) => (
            <div key={key} className="aqv-journey-map-group">
              <h3>{t(`journey-layout.phases.${key}`)}</h3>
              <ol start={from + 1}>
                {steps.slice(from, to).map((step, offset) => {
                  const index = from + offset;
                  return (
                    <li key={step.id}>
                      <button
                        type="button"
                        aria-current={index === currentStep ? "step" : undefined}
                        aria-label={t("journey-progress.s1", { v0: index + 1, v1: title(step) })}
                        onClick={() => {
                          if (index === currentStep) return;
                          if (mapRef.current) mapRef.current.open = false;
                          setCurrentStep(index);
                        }}
                      >
                        <span aria-hidden="true">{index + 1}</span>{title(step)}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </nav>
      </details>
    </div>
  );
}
