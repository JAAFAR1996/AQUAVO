import { describe, expect, it } from "vitest";
import { fitCatalogue } from "@shared/tank-compatibility";
import { i18next } from "@/i18n";
import { buildJourneySupportMessage, clampJourneyStep, filterJourneyFitGroups, journeyLabel, missingJourneyDecisions, normalizeSavedPlan, normalizeWizardData } from "../utils";

describe("journey decisions", () => {
    it("constrains filter candidates by the selected approach, not just litres", () => {
        const products = ["فلتر إسفنجي هوائي", "فلتر كانستر خارجي", "ميديا للفلتر", "دواء للماء"].map((name, index) => ({ id: String(index), name, category: "الفلترة والتنقية", stock: 2, price: 5000, specifications: { مناسب: "20-100 لتر" } }));
        const groups = fitCatalogue(products, 80);
        const selected = filterJourneyFitGroups(groups, normalizeWizardData({ tankLiters: 80, filterType: "sponge" }));
        expect(selected.flatMap((group) => group.fits).map((candidate) => candidate.name)).toEqual(["فلتر إسفنجي هوائي"]);
        expect(filterJourneyFitGroups(groups, normalizeWizardData({ tankLiters: 80, filterType: "unknown" }))).toEqual([]);
    });

    it("keeps a selected heater wattage from silently changing to another variant", () => {
        const groups = fitCatalogue([{ id: "heater", name: "سخان", category: "التحكم بالحرارة", variants: [
            { id: "100w", label: "100 واط", stock: 2, price: 15000, specifications: { مناسب: "50-100 لتر" } },
            { id: "200w", label: "200 واط", stock: 3, price: 18000, specifications: { مناسب: "50-200 لتر" } },
        ] }], 80);
        const selected = filterJourneyFitGroups(groups, normalizeWizardData({ tankLiters: 80, heaterWattage: 100 }));
        expect(selected.flatMap((group) => group.fits).map((candidate) => candidate.variantId)).toEqual(["100w"]);
    });

    it("restores flat and historical wrapped plans while leaving missing decisions unknown", () => {
        const flat = normalizeSavedPlan({ tankLiters: 80, filterType: "sponge", currentStep: 8, selectedSpecies: ["betta"] });
        expect(flat).toMatchObject({ currentStep: 8, data: { tankLiters: 80, filterType: "sponge", selectedSpecies: ["betta"], heaterWattage: 0 } });
        expect(normalizeSavedPlan({ data: JSON.stringify({ tankType: "planted", currentStep: 3 }) })).toMatchObject({ currentStep: 3, data: { tankType: "planted", tankLiters: 0 } });
        expect(normalizeSavedPlan({ data: "broken JSON" })).toMatchObject({ currentStep: 0, data: { tankLiters: 0, selectedSpecies: [] } });
        expect(normalizeSavedPlan(null)).toBeNull();
        expect(missingJourneyDecisions(normalizeWizardData({}))).toContain("heating");
    });

    it("clamps damaged progress state and removes invalid enum values", () => {
        expect(clampJourneyStep("oops")).toBe(0);
        expect(clampJourneyStep(999)).toBe(8);
        expect(clampJourneyStep(-1)).toBe(0);
        expect(normalizeWizardData({ filterType: "invented", selectedSpecies: null, tankLiters: Infinity })).toMatchObject({ filterType: "", selectedSpecies: [], tankLiters: 0 });
    });

    it("prepares a localized support message containing the actual tank and choices", () => {
        const t = i18next.getFixedT("ar", "tools");
        const data = normalizeWizardData({ tankLiters: 80, tankLengthCm: 60, tankWidthCm: 30, tankHeightCm: 45, tankType: "freshwater-community", filterType: "hob", lightingType: "basic-led", substrateType: "gravel", selectedSpecies: ["betta"] });
        const message = buildJourneySupportMessage(data, t, "ar");
        expect(message).toContain("80");
        expect(message).toContain("60 × 30 × 45");
        expect(message).toContain("بيتا");
        expect(message).toContain("معلّق");
        expect(message).not.toContain("freshwater-community");
        expect(message).not.toContain("basic-led");
        for (const language of ["ar", "en", "ckb"]) {
            const label = journeyLabel(i18next.getFixedT(language, "tools"), "filterType", "sponge");
            expect(label).not.toBe("sponge");
            expect(label).not.toContain("journey-labels");
        }
    });
});
