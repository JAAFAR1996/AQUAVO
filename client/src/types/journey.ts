export interface WizardData {
    tankSize: string;
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
    stockingLevel: string;
    maintenancePreference: string;
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
