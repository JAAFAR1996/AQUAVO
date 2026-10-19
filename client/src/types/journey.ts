import { z } from "zod";

export interface WizardData {
    tankSize: string;
    tankLiters: number;
    tankLengthCm?: number;
    tankWidthCm?: number;
    tankHeightCm?: number;
    tankType: string;
    location: string[];
    filterType: string;
    heaterWattage: number;
    lightingType: string;
    substrateType: string;
    decorations: string[];
    waterSource: string;
    cyclingMethod: string;
    fishTypes: string[];
    selectedSpecies: string[];
    stockingLevel: string;
    maintenancePreference: string;
}

// Old and partial plans remain usable. Invalid/missing answers stay unanswered.
export const wizardDataSchema = z.object({
    tankSize: z.enum(["", "small", "medium", "large", "xlarge"]).catch(""),
    tankLiters: z.number().finite().min(0).max(2000).catch(0),
    tankLengthCm: z.number().finite().positive().max(2000).optional().catch(undefined),
    tankWidthCm: z.number().finite().positive().max(2000).optional().catch(undefined),
    tankHeightCm: z.number().finite().positive().max(2000).optional().catch(undefined),
    tankType: z.enum(["", "freshwater-community", "planted", "species-specific"]).catch(""),
    location: z.array(z.string().max(100)).max(20).catch([]),
    filterType: z.enum(["", "unknown", "hob", "canister", "sponge", "internal"]).catch(""),
    heaterWattage: z.number().finite().min(0).max(5000).catch(0),
    lightingType: z.enum(["", "basic-led", "planted-led", "rgb-smart", "none"]).catch(""),
    substrateType: z.enum(["", "gravel", "sand", "planted-substrate", "mixed"]).catch(""),
    decorations: z.array(z.enum(["live-plants", "driftwood", "rocks", "caves", "artificial-plants", "background"])).catch([]),
    waterSource: z.enum(["", "tap", "ro", "well"]).catch(""),
    cyclingMethod: z.enum(["", "fishless", "with-hardy-fish", "seeded", "bottled-bacteria"]).catch(""),
    fishTypes: z.array(z.enum(["community", "cichlids", "bottom-dwellers", "schooling", "centerpiece", "goldfish", "shrimp-snails"])).catch([]),
    selectedSpecies: z.array(z.string().min(1).max(100)).max(100).catch([]),
    stockingLevel: z.enum(["", "light", "moderate", "heavy"]).catch(""),
    maintenancePreference: z.enum(["", "minimal", "moderate", "intensive"]).catch(""),
});

export interface SavedJourneyPlan {
    data: WizardData;
    currentStep: number;
    createdAt: string | null;
}

export type JourneyStepId =
    | "tank"
    | "location"
    | "equipment"
    | "decor"
    | "water"
    | "cycling"
    | "fish"
    | "maintenance"
    | "summary";

export interface JourneyStepDefinition {
    id: JourneyStepId;
    title: string;
    icon: React.ElementType;
}
