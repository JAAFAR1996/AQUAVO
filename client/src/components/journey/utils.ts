import { Product } from "@/types";
import { WizardData } from "@/types/journey";
import { getSpeciesById, type FishSpeciesInfo } from "./fish-species-data";

export function getJourneyRecommendations(products: Product[] = [], wizardData: WizardData): Product[] {
    if (!products.length) return [];

    const recommendations: Product[] = [];

    // 1. Tank based on size/type
    if (wizardData.tankSize) {
        const tankSizeKeywords: Record<string, string[]> = {
            small: ["20", "30", "40", "50", "60", "small", "nano"],
            medium: ["80", "100", "120", "medium"],
            large: ["150", "200", "250", "large"],
            xlarge: ["300", "400", "500", "xl"]
        };

        const keywords = tankSizeKeywords[wizardData.tankSize] || [];
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

    // 8. Species-specific food recommendations (NEW - based on selectedSpecies)
    const speciesFood = getSpeciesFoodRecommendations(products, wizardData);
    recommendations.push(...speciesFood);

    // 9. Species-specific filter recommendations
    const filterRecs = getFilterRecommendations(products, wizardData);
    recommendations.push(...filterRecs);

    // Remove duplicates and limit to 12 products
    const uniqueRecommendations = Array.from(new Map(recommendations.map(p => [p.id, p])).values());
    return uniqueRecommendations.slice(0, 12);
}

/**
 * Get food recommendations based on selected fish species (species-specific matching)
 */
export function getSpeciesFoodRecommendations(products: Product[] = [], wizardData: WizardData): Product[] {
    const selectedSpecies = getSpeciesById(wizardData.selectedSpecies || []);
    if (!products.length || selectedSpecies.length === 0) {
        // Fallback to generic food matching
        return getFoodRecommendations(products, wizardData);
    }

    // Collect all unique product keywords from selected species
    const allKeywords = new Set<string>();
    selectedSpecies.forEach(species => {
        species.feedingInfo.productKeywords.forEach(kw => allKeywords.add(kw.toLowerCase()));
    });

    // Find food products matching species keywords
    const foodProducts = products.filter(p => {
        const name = (p.name || "").toLowerCase();
        const cat = (p.category || "").toLowerCase();
        const subcat = (p.subcategory || "").toLowerCase();
        const searchable = `${name} ${cat} ${subcat}`;

        // Must be a food/feed product
        const isFood = cat.includes("food") || cat.includes("feed") || cat.includes("أغذية") ||
            cat.includes("أعلاف") || subcat.includes("food") || subcat.includes("feed") ||
            name.includes("food") || name.includes("feed") || name.includes("pellet") ||
            name.includes("flake") || name.includes("algae wafer") || name.includes("spirulina");

        if (!isFood) return false;

        // Check if any species keyword matches
        return Array.from(allKeywords).some(kw => searchable.includes(kw));
    });

    // If keyword matching finds results, use them; otherwise fallback to all food
    if (foodProducts.length > 0) {
        return foodProducts
            .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0))
            .slice(0, 4);
    }

    // Broader fallback: return any food products
    return getFoodRecommendations(products, wizardData);
}

/**
 * Get food recommendations based on fish types selected (generic fallback)
 */
export function getFoodRecommendations(products: Product[] = [], wizardData: WizardData): Product[] {
    if (!products.length) return [];

    const fishTypes = wizardData.fishTypes || [];
    const selectedSpecies = wizardData.selectedSpecies || [];

    // If no fish selected at all, no food recs
    if (fishTypes.length === 0 && selectedSpecies.length === 0) return [];

    const foodProducts = products.filter(p => {
        const cat = (p.category || "").toLowerCase();
        const subcat = (p.subcategory || "").toLowerCase();
        const name = (p.name || "").toLowerCase();
        return cat.includes("food") || cat.includes("feed") || cat.includes("أغذية") || cat.includes("أعلاف") ||
            subcat.includes("food") || subcat.includes("feed") ||
            name.includes("food") || name.includes("feed") || name.includes("pellet") || name.includes("flake");
    });

    // Sort by rating, return top 3
    return foodProducts
        .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0))
        .slice(0, 3);
}

/**
 * Get filter recommendations based on tank size
 */
export function getFilterRecommendations(products: Product[] = [], wizardData: WizardData): Product[] {
    if (!products.length) return [];

    const filterProducts = products.filter(p => {
        const cat = (p.category || "").toLowerCase();
        const subcat = (p.subcategory || "").toLowerCase();
        const name = (p.name || "").toLowerCase();
        return cat.includes("filtration") || cat.includes("filter") || cat.includes("فلتر") ||
            subcat.includes("filter") ||
            name.includes("filter") || name.includes("فلتر");
    });

    // Sort by rating, return top 2
    return filterProducts
        .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0))
        .slice(0, 2);
}
