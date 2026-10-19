import type { TFunction } from "i18next";
import { z } from "zod";
import { JOURNEY_STEPS } from "@shared/journey-steps";
import type { CategoryFit, FitCandidate } from "@shared/tank-compatibility";
import { wizardDataSchema, type SavedJourneyPlan, type WizardData } from "@/types/journey";
import { getSpeciesById } from "./fish-species-data";

const labelValues = {
    tankSize: ["small", "medium", "large", "xlarge"],
    tankType: ["freshwater-community", "planted", "species-specific"],
    filterType: ["hob", "canister", "sponge", "internal"],
    lightingType: ["basic-led", "planted-led", "rgb-smart", "none"],
    substrateType: ["gravel", "sand", "planted-substrate", "mixed"],
    decorations: ["live-plants", "driftwood", "rocks", "caves", "artificial-plants", "background"],
    waterSource: ["tap", "ro", "well"],
    cyclingMethod: ["fishless", "with-hardy-fish", "seeded", "bottled-bacteria"],
    stockingLevel: ["light", "moderate", "heavy"],
    maintenancePreference: ["minimal", "moderate", "intensive"],
    fishTypes: ["community", "cichlids", "bottom-dwellers", "schooling", "centerpiece", "goldfish", "shrimp-snails"],
    foodTypes: ["flakes", "pellets", "frozen", "live", "algae", "vegetables", "spirulina"],
} satisfies Record<string, readonly string[]>;

export function journeyLabel(t: TFunction<"tools">, group: keyof typeof labelValues, value: string): string {
    return labelValues[group].includes(value)
        ? t(`journey-labels.${group}.${value}`, { defaultValue: t("journey-labels.unknown") })
        : t("journey-labels.unknown");
}

export function normalizeWizardData(value: unknown): WizardData {
    const input = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    return wizardDataSchema.parse(input);
}

export function clampJourneyStep(value: unknown): number {
    const number = typeof value === "number" || typeof value === "string" ? Number(value) : 0;
    return Number.isFinite(number) ? Math.max(0, Math.min(JOURNEY_STEPS.length - 1, Math.trunc(number))) : 0;
}

/** Both historical {data: JSON} plans and current flat API rows are supported. */
export function normalizeSavedPlan(value: unknown): SavedJourneyPlan | null {
    const result = z.record(z.unknown()).safeParse(value);
    if (!result.success) return null;
    const record = result.data;
    let data: unknown = record.data ?? record;
    if (typeof data === "string") {
        try { data = JSON.parse(data); } catch { data = {}; }
    }
    const inner = z.record(z.unknown()).safeParse(data);
    const createdAt = typeof record.createdAt === "string" && Number.isFinite(Date.parse(record.createdAt))
        ? record.createdAt : null;
    return {
        data: normalizeWizardData(data),
        currentStep: clampJourneyStep(record.currentStep ?? (inner.success ? inner.data.currentStep : 0)),
        createdAt,
    };
}

export function journeySpeciesNames(data: WizardData, language: string): string[] {
    return getSpeciesById(data.selectedSpecies).map((species) => language.startsWith("en") ? species.nameEn : species.nameAr);
}

type MissingDecision = "volume" | "tankType" | "filter" | "heating" | "lighting" | "substrate" | "water" | "cycling" | "species";

export function missingJourneyDecisions(data: WizardData): MissingDecision[] {
    const missing: MissingDecision[] = [];
    if (!(data.tankLiters >= 10 && data.tankLiters <= 2000)) missing.push("volume");
    if (!data.tankType) missing.push("tankType");
    if (!labelValues.filterType.includes(data.filterType)) missing.push("filter");
    if (!(data.heaterWattage > 0)) missing.push("heating");
    if (!data.lightingType) missing.push("lighting");
    if (!data.substrateType) missing.push("substrate");
    if (!data.waterSource) missing.push("water");
    if (!data.cyclingMethod) missing.push("cycling");
    if (!getSpeciesById(data.selectedSpecies).length) missing.push("species");
    return missing;
}

/** A litre match alone cannot replace the chosen filter approach or heater variant. */
export function filterJourneyFitGroups(groups: CategoryFit[], data?: WizardData): CategoryFit[] {
    const allowed = (candidate: FitCandidate): boolean => {
        if (!candidate.inStock || candidate.price === null || candidate.price <= 0) return false;
        if (candidate.filterType) return !data || candidate.filterType === data.filterType;
        if (candidate.isHeater) {
            return !data || data.heaterWattage <= 0 || candidate.heaterWattage === data.heaterWattage;
        }
        return false;
    };
    return groups.map((group) => ({
        ...group,
        fits: group.fits.filter(allowed),
        ratedButUnsuitable: group.ratedButUnsuitable.filter(allowed),
        noSizeEvidence: group.noSizeEvidence.filter(allowed),
    })).filter((group) => group.fits.length || group.noSizeEvidence.length || group.ratedButUnsuitable.length);
}

export function buildJourneySupportMessage(data: WizardData, t: TFunction<"tools">, language: string): string {
    const unknown = t("journey-labels.unknown");
    const species = journeySpeciesNames(data, language);
    const fish = species.length ? species.join("، ") : data.fishTypes.map((value) => journeyLabel(t, "fishTypes", value)).join("، ") || unknown;
    const dimensions = [data.tankLengthCm, data.tankWidthCm, data.tankHeightCm];
    return [
        t("journey-review.supportMessage"),
        `${t("journey-summary.s6")} ${data.tankLiters > 0 ? t("journey-summary.s7", { v0: data.tankLiters }) : unknown}`,
        ...(dimensions.every((value) => typeof value === "number" && value > 0)
            ? [t("journey-review.dimensions", { value: dimensions.join(" × ") })] : []),
        `${t("journey-summary.s12")} ${journeyLabel(t, "tankType", data.tankType)}`,
        `${t("journey-summary.s18")} ${journeyLabel(t, "filterType", data.filterType)}`,
        `${t("journey-summary.s19")} ${data.heaterWattage > 0 ? t("journey-review.selectedWattage", { value: data.heaterWattage }) : unknown}`,
        `${t("journey-summary.s22")} ${journeyLabel(t, "lightingType", data.lightingType)}`,
        `${t("journey-summary.s25")} ${journeyLabel(t, "substrateType", data.substrateType)}`,
        `${t("journey-summary.s29")} ${fish}`,
        `${t("journey-review.waterSource")} ${journeyLabel(t, "waterSource", data.waterSource)}`,
        `${t("journey-review.cyclingMethod")} ${journeyLabel(t, "cyclingMethod", data.cyclingMethod)}`,
        t("journey-review.supportQuestion"),
    ].join("\n");
}
