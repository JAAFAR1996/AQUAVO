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

export const STEPS: JourneyStepDefinition[] = [
    { id: "tank", title: "اختيار الحوض", icon: Package },
    { id: "location", title: "الموقع", icon: MapPin },
    { id: "equipment", title: "المعدات", icon: Filter },
    { id: "decor", title: "الديكور", icon: Mountain },
    { id: "water", title: "المياه", icon: Droplets },
    { id: "cycling", title: "التدوير", icon: TestTube },
    { id: "fish", title: "الأسماك", icon: Fish },
    { id: "maintenance", title: "الصيانة", icon: Calendar },
    { id: "summary", title: "الملخص", icon: ShoppingCart }
];

export const INITIAL_WIZARD_DATA = {
    tankSize: "",
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
    stockingLevel: "",
    maintenancePreference: ""
};
