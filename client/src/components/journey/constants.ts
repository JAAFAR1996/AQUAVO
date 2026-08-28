import {
    Package,
    MapPin,
    Filter,
    Mountain,
    Droplets,
    TestTube,
    Fish,
    Calendar,
    ShoppingCart,
} from "lucide-react";
import { JourneyStepDefinition } from "@/types/journey";
import { JOURNEY_STEPS } from "@shared/journey-steps";

/**
 * Icons for the shared step outline. The ids and titles live in
 * shared/journey-steps.ts so the crawler page and this wizard describe the same
 * steps; only the icon is a UI concern and stays here.
 */
const STEP_ICONS: Record<string, JourneyStepDefinition["icon"]> = {
    tank: Package,
    location: MapPin,
    equipment: Filter,
    decor: Mountain,
    water: Droplets,
    cycling: TestTube,
    fish: Fish,
    maintenance: Calendar,
    summary: ShoppingCart,
};

export const STEPS: JourneyStepDefinition[] = JOURNEY_STEPS.map((step) => ({
    id: step.id as JourneyStepDefinition["id"],
    title: step.title,
    icon: STEP_ICONS[step.id],
}));

export const INITIAL_WIZARD_DATA = {
    tankSize: "",
    tankLiters: 0,
    tankType: "",
    location: [],
    filterType: "",
    heaterWattage: 0,
    lightingType: "",
    substrateType: "",
    decorations: [],
    waterSource: "",
    cyclingMethod: "",
    fishTypes: [],
    selectedSpecies: [],
    stockingLevel: "",
    maintenancePreference: ""
};
