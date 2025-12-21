import { Product } from "@/types";
import { WizardData } from "@/types/journey";

export function getJourneyRecommendations(products: Product[] = [], wizardData: WizardData): Product[] {
    if (!products.length) return [];

    const recommendations: Product[] = [];

    // 1. Tank based on size/type
    if (wizardData.tankSize) {
        const tankSizeKeywords = {
            small: ["20", "30", "40", "50", "60", "small", "nano"],
            medium: ["80", "100", "120", "medium"],
            large: ["150", "200", "250", "large"],
            xlarge: ["300", "400", "500", "xl"]
        };

        const keywords = tankSizeKeywords[wizardData.tankSize as keyof typeof tankSizeKeywords] || [];
        const tanks = products.filter(p =>
            (p.category.toLowerCase().includes("tank") || p.category.toLowerCase().includes("aquarium")) &&
            keywords.some(k => p.name.toLowerCase().includes(k))
        );

        if (tanks.length > 0) recommendations.push(tanks[0]);
    }

    // 2. Heater based on wattage
    if (wizardData.heaterWattage) {
        const heaters = products.filter(p =>
            p.category?.toLowerCase().includes("heater") ||
            p.subcategory?.toLowerCase().includes("heater") ||
            p.name?.toLowerCase().includes("heater")
        );
        if (heaters.length) recommendations.push(heaters[0]);
    }

    // 3. Lighting based on type
    if (wizardData.lightingType && wizardData.lightingType !== "none") {
        const lights = products.filter(p =>
            p.category?.toLowerCase().includes("light") ||
            p.subcategory?.toLowerCase().includes("light") ||
            p.name?.toLowerCase().includes("led")
        );

        if (wizardData.lightingType === "planted-led") {
            const plantLight = lights.find(p =>
                p.name?.toLowerCase().includes("plant") ||
                (p.specifications as any)?.forPlants
            );
            if (plantLight) recommendations.push(plantLight);
            else if (lights[0]) recommendations.push(lights[0]);
        } else if (lights[0]) {
            recommendations.push(lights[0]);
        }
    }

    // 4. Substrate based on type
    if (wizardData.substrateType) {
        const substrates = products.filter(p =>
            p.category?.toLowerCase().includes("substrate") ||
            p.subcategory?.toLowerCase().includes("substrate") ||
            p.name?.toLowerCase().includes("gravel") ||
            p.name?.toLowerCase().includes("sand")
        );
        if (substrates[0]) recommendations.push(substrates[0]);
    }

    // 5. Plants for planted tank or live-plants decoration
    if (wizardData.tankType === "planted" || wizardData.decorations.includes("live-plants")) {
        const plants = products.filter(p =>
            p.category?.toLowerCase().includes("plant") ||
            p.name?.toLowerCase().includes("anubias") ||
            p.name?.toLowerCase().includes("java")
        );
        recommendations.push(...plants.slice(0, 2));
    }

    // 6. Water conditioner - essential for everyone
    const conditioners = products.filter(p =>
        p.category?.toLowerCase().includes("water") ||
        p.name?.toLowerCase().includes("prime") ||
        p.name?.toLowerCase().includes("seachem") ||
        p.name?.toLowerCase().includes("conditioner")
    );
    if (conditioners[0]) recommendations.push(conditioners[0]);

    // 7. Decorations
    if (wizardData.decorations.includes("driftwood")) {
        const driftwood = products.find(p =>
            p.name?.toLowerCase().includes("driftwood") ||
            p.name?.toLowerCase().includes("wood")
        );
        if (driftwood) recommendations.push(driftwood);
    }

    if (wizardData.decorations.includes("rocks")) {
        const rocks = products.find(p =>
            p.name?.toLowerCase().includes("rock") ||
            p.name?.toLowerCase().includes("stone")
        );
        if (rocks) recommendations.push(rocks);
    }

    // Remove duplicates and limit to 8 products
    const uniqueRecommendations = Array.from(new Map(recommendations.map(p => [p.id, p])).values());
    return uniqueRecommendations.slice(0, 8);
}
