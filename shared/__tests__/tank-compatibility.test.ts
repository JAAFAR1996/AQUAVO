import { describe, expect, it } from "vitest";
import { classifySpecs, expandCandidates, fitCatalogue, identifyFilterType, rangeCovers, type CandidateInput } from "../tank-compatibility";

const heater: CandidateInput = {
    id: "heater", name: "سخان 50 / 100 واط", category: "التحكم بالحرارة",
    hasVariants: true, stock: 99, price: 99000,
    variants: [
        { id: "50w", label: "50 واط", price: 12000, stock: 0, specifications: { مناسب: "20-50 لتر", القدرة: "50 واط" } },
        { id: "100w", label: "100 واط", price: 18000, stock: 3, specifications: { مناسب: "50-100 لتر", القدرة: "100 واط" } },
    ],
};

describe("catalogue tank compatibility", () => {
    it("uses the available variant's actual price, power and capacity rather than the parent", () => {
        const [group] = fitCatalogue([heater], 80);
        expect(group.fits).toHaveLength(1);
        expect(group.fits[0]).toMatchObject({ variantId: "100w", price: 18000, heaterWattage: 100, isHeater: true, range: { minL: 50, maxL: 100 } });
        expect(fitCatalogue([heater], 40)[0].fits).toEqual([]);
    });

    it("does not offer the parent when variants are missing or malformed", () => {
        expect(expandCandidates({ ...heater, variants: [] })).toEqual([]);
        expect(expandCandidates({ ...heater, variants: [null, "invalid"] })).toEqual([]);
        expect(expandCandidates({ ...heater, variants: [{ label: "100 واط", stock: 3, price: 15000 }] })).toEqual([]);
    });

    it("does not offer a variant with no positive price even when parent price and stock exist", () => {
        const product = { ...heater, variants: [{ id: "unpriced", label: "100 واط", stock: 4, price: null, specifications: { مناسب: "50-100 لتر" } }] };
        expect(fitCatalogue([product], 80)[0].fits).toEqual([]);
        expect(fitCatalogue([product], 80)[0].noSizeEvidence).toEqual([]);
    });

    it("keeps missing, contradictory and open-ended equipment capacities unconfirmed", () => {
        for (const value of ["أحواض صغيرة", "100-50 لتر", "50 واط: 20-50 لتر، 100 واط: 50-100 لتر", "300+ لتر"]) {
            expect(classifySpecs({ مناسب: value }).confidence).toBe("PARTIAL");
        }
        expect(classifySpecs({ مناسب: "حتى ١٠٠ لتر" })).toMatchObject({ confidence: "VERIFIED", range: { minL: null, maxL: 100 } });
        expect(classifySpecs({})).toMatchObject({ confidence: "NONE", range: null });
    });

    it("keeps ambiguous variant evidence rather than overriding it with a parent range", () => {
        const product = { ...heater, specifications: { مناسب: "20-100 لتر" }, variants: [{ id: "ambiguous", label: "100 واط", price: 15000, stock: 2, specifications: { مناسب: "أحواض متوسطة" } }] };
        expect(fitCatalogue([product], 80)[0].fits).toEqual([]);
        expect(fitCatalogue([product], 80)[0].noSizeEvidence[0].evidence).toBe("أحواض متوسطة");
    });

    it("rejects invalid volumes and does not infer size from wattage", () => {
        expect(rangeCovers({ minL: 20, maxL: 100 }, NaN)).toBe(false);
        expect(rangeCovers({ minL: 20, maxL: 100 }, -10)).toBe(false);
        expect(fitCatalogue([heater], Infinity)).toEqual([]);
        expect(classifySpecs({ القدرة: "100 واط" }).range).toBeNull();
    });

    it("recognizes complete filter types without turning media, accessories or medicines into devices", () => {
        expect(identifyFilterType({ name: "فلتر إسفنجي هوائي" })).toBe("sponge");
        expect(identifyFilterType({ name: "فلتر إسفنجي بمحرك مدمج" })).toBe("sponge");
        expect(identifyFilterType({ name: "فلتر معلق على الحافة" })).toBe("hob");
        expect(identifyFilterType({ name: "Canister filter" })).toBe("canister");
        for (const name of ["إسفنج فلترة أسود", "ميديا للفلتر الداخلي", "مشبك فلتر معلق", "دواء للاستخدام مع فلتر داخلي"]) {
            expect(identifyFilterType({ name })).toBeNull();
        }
    });
});
