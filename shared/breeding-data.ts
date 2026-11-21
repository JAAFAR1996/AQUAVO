// Breeding Calculator Data - Fish, Snails, and Shrimp

export interface FryGrowthStage {
    week: number;
    stage: string;
    stageAr: string;
    size: string;
    food: string;
    foodAr: string;
    tips: string;
}

export interface SupplyItem {
    id: string;
    name: string;
    nameAr: string;
    productName?: string; // Specific product from catalog
    productCode?: string; // SKU or Model
    category: 'equipment' | 'breeding' | 'food' | 'care' | 'decor' | 'water_care';
    priority: 'essential' | 'recommended' | 'optional';
}

export interface BreedingSpecies {
    id: string;
    name: string;
    arabicName: string;
    type: 'fish' | 'snail' | 'shrimp';
    method: 'live-bearer' | 'egg-layer' | 'egg-clutch' | 'bubble-nest' | 'mouth-brooder';
    difficulty: 'easy' | 'moderate' | 'difficult';
    sexualMaturityWeeks: number;
    breedingInterval: number; // days between breeding cycles
    gestationDays?: number; // for live-bearers
    eggHatchDays?: number; // for egg-layers
    avgFryCount: { min: number; max: number };
    optimalTemp: { min: number; max: number };
    optimalPH: { min: number; max: number };
    minTankSize: number; // liters
    supplies: SupplyItem[];
}

export const breedingSpecies: BreedingSpecies[] = [
    // ========== FISH - Live Bearers ==========
    {
        id: "guppy",
        name: "Guppy",
        arabicName: "غوبي",
        type: "fish",
        method: "live-bearer",
        difficulty: "easy",
        sexualMaturityWeeks: 8,
        breedingInterval: 28,
        gestationDays: 28,
        avgFryCount: { min: 20, max: 50 },
        optimalTemp: { min: 24, max: 28 },
        optimalPH: { min: 6.8, max: 7.8 },
        minTankSize: 40,
        supplies: [
            { id: "heater", name: "Heater 50W", nameAr: "سخان 50 واط", productName: "YEE Steel Heater 50W", productCode: "yee-3006", category: "equipment", priority: "essential" },
            { id: "air_pump", name: "Air Pump", nameAr: "مضخة هواء", productName: "YEE Quiet Pump 3W", productCode: "ytz-300", category: "equipment", priority: "essential" },
            { id: "breeding_box", name: "Breeding Box", nameAr: "حاضنة تعليق كبيرة", productName: "YEE Large Isolation Box", productCode: "c4-1008", category: "breeding", priority: "essential" },
            { id: "fry_food", name: "Micro Fry Food", nameAr: "طعام صغار (0.2 ملم)", productName: "YEE Micro Particles 0.2mm", productCode: "c1-1082", category: "food", priority: "essential" },
            { id: "net", name: "Fish Net", nameAr: "شبكة صيد", productName: "HOUYI Fine Net Small", productCode: "houyi-small-wholesale-aquarium-special-nylon-fishing-net", category: "care", priority: "essential" }
        ]
    },
    {
        id: "molly",
        name: "Molly",
        arabicName: "مولي",
        type: "fish",
        method: "live-bearer",
        difficulty: "easy",
        sexualMaturityWeeks: 12,
        breedingInterval: 30,
        gestationDays: 60,
        avgFryCount: { min: 20, max: 100 },
        optimalTemp: { min: 24, max: 28 },
        optimalPH: { min: 7.0, max: 8.5 },
        minTankSize: 75,
        supplies: [
            { id: "heater", name: "Heater 100W", nameAr: "سخان 100 واط", productName: "YEE Steel Heater 100W", productCode: "yee-3007", category: "equipment", priority: "essential" },
            { id: "breeding_box", name: "Breeding Box", nameAr: "حاضنة تعليق كبيرة", productName: "YEE Large Isolation Box", productCode: "c4-1008", category: "breeding", priority: "essential" },
            { id: "fry_food", name: "Fry Food", nameAr: "طعام صغار شامل", productName: "YEE All-in-One 0.6mm", productCode: "c1-1113", category: "food", priority: "essential" },
            { id: "salt", name: "Aquarium Salt", nameAr: "ملح حوض سمك", productName: "YEE Multivitamin Salt", productCode: "yan-804", category: "care", priority: "recommended" },
            { id: "cleaning", name: "Cleaning Tool", nameAr: "أداة تنظيف 5 في 1", productName: "HOUYI 5-in-1 Set", productCode: "houyi-aquarium-fish-tank-five-in-one-cleaning-tool-fish-net-scraper-algae-knife-aquatic-clip", category: "care", priority: "recommended" }
        ]
    },
    {
        id: "platy",
        name: "Platy",
        arabicName: "بلاتي",
        type: "fish",
        method: "live-bearer",
        difficulty: "easy",
        sexualMaturityWeeks: 12,
        breedingInterval: 28,
        gestationDays: 28,
        avgFryCount: { min: 20, max: 80 },
        optimalTemp: { min: 22, max: 26 },
        optimalPH: { min: 7.0, max: 8.0 },
        minTankSize: 40,
        supplies: [
            { id: "heater", name: "Heater 50W", nameAr: "سخان 50 واط", productName: "YEE Steel Heater 50W", productCode: "yee-3006", category: "equipment", priority: "essential" },
            { id: "breeding_box", name: "Breeding Box", nameAr: "حاضنة تعليق", productName: "YEE Large Isolation Box", productCode: "c4-1008", category: "breeding", priority: "essential" },
            { id: "plants", name: "Driftwood", nameAr: "خشب غاطس طبيعي", productName: "HOUYI Rhododendron Root", productCode: "houyi-aquatic-plants", category: "decor", priority: "recommended" }
        ]
    },
    {
        id: "swordtail",
        name: "Swordtail",
        arabicName: "سيف الذيل",
        type: "fish",
        method: "live-bearer",
        difficulty: "easy",
        sexualMaturityWeeks: 12,
        breedingInterval: 28,
        gestationDays: 28,
        avgFryCount: { min: 20, max: 100 },
        optimalTemp: { min: 22, max: 28 },
        optimalPH: { min: 7.0, max: 8.0 },
        minTankSize: 75,
        supplies: [
            { id: "heater", name: "Heater 100W", nameAr: "سخان 100 واط", productName: "YEE Steel Heater 100W", productCode: "yee-3007", category: "equipment", priority: "essential" },
            { id: "breeding_box", name: "Breeding Box", nameAr: "حاضنة كبيرة", productName: "YEE Large Isolation Box", productCode: "c4-1008", category: "breeding", priority: "essential" },
            { id: "lid", name: "Tank Lid", nameAr: "غطاء (يقفزون)", category: "equipment", priority: "essential" },
            { id: "cleaner", name: "Gravel Cleaner", nameAr: "شفاط تنظيف قاع", productName: "HOUYI Siphon 1.9m", productCode: "houyi-aquarium-fish-tank-five-in-one-cleaning-tool-fish-net-scraper-algae-knife-aquatic-clip", category: "care", priority: "recommended" }
        ]
    },
    {
        id: "endler",
        name: "Endler's Livebearer",
        arabicName: "إندلر",
        type: "fish",
        method: "live-bearer",
        difficulty: "easy",
        sexualMaturityWeeks: 6,
        breedingInterval: 23,
        gestationDays: 23,
        avgFryCount: { min: 5, max: 25 },
        optimalTemp: { min: 24, max: 28 },
        optimalPH: { min: 7.0, max: 8.0 },
        minTankSize: 30,
        supplies: [
            { id: "heater", name: "Heater 50W", nameAr: "سخان 50 واط", productName: "YEE Steel Heater 50W", productCode: "yee-3006", category: "equipment", priority: "essential" },
            { id: "fry_food", name: "Micro Food", nameAr: "طعام مايكرو", productName: "YEE Micro 0.2mm", productCode: "c1-1082", category: "food", priority: "essential" },
            { id: "net", name: "Nano Net", nameAr: "شبكة صيد", productName: "HOUYI Small Fish Net", productCode: "houyi-small-wholesale-aquarium-special-nylon-fishing-net", category: "care", priority: "essential" }
        ]
    },

    // ========== FISH - Egg Layers ==========
    {
        id: "betta",
        name: "Betta",
        arabicName: "بيتا",
        type: "fish",
        method: "bubble-nest",
        difficulty: "moderate",
        sexualMaturityWeeks: 16,
        breedingInterval: 14,
        eggHatchDays: 2,
        avgFryCount: { min: 30, max: 500 },
        optimalTemp: { min: 26, max: 28 },
        optimalPH: { min: 6.5, max: 7.5 },
        minTankSize: 40,
        supplies: [
            { id: "betta_food", name: "Betta Food", nameAr: "طعام بيتا متخصص", productName: "YEE Betta Food", productCode: "c1-1073", category: "food", priority: "essential" },
            { id: "heater", name: "Heater 50W", nameAr: "سخان 50 واط", productName: "YEE Steel Heater 50W", productCode: "yee-3006", category: "equipment", priority: "essential" },
            { id: "live_food", name: "Artemia", nameAr: "بيض ارتيميا", productName: "Yee Shelled Eggs", productCode: "yyy-078", category: "food", priority: "essential" },
            { id: "decor", name: "Driftwood", nameAr: "ديكور خشب", productName: "HOUYI Driftwood 30cm", productCode: undefined, category: "decor", priority: "recommended" }
        ]
    },
    {
        id: "angelfish",
        name: "Angelfish",
        arabicName: "أنجل فيش",
        type: "fish",
        method: "egg-layer",
        difficulty: "moderate",
        sexualMaturityWeeks: 26,
        breedingInterval: 14,
        eggHatchDays: 3,
        avgFryCount: { min: 100, max: 400 },
        optimalTemp: { min: 26, max: 30 },
        optimalPH: { min: 6.0, max: 7.5 },
        minTankSize: 150,
        supplies: [
            { id: "heater", name: "Heater 200W", nameAr: "سخان 200 واط", productName: "YEE Steel Heater 200W", productCode: "yee-3008", category: "equipment", priority: "essential" },
            { id: "meth_blue", name: "Methylene Blue", nameAr: "أزرق الميثيلين (للبيض)", productName: "Yee Methylene Blue", productCode: "yyh-207", category: "water_care", priority: "essential" },
            { id: "fry_food", name: "Artemia", nameAr: "ارتيميا", productName: "Yee Shelled Eggs", productCode: "yyy-078", category: "food", priority: "essential" },
            { id: "thermometer", name: "Thermometer", nameAr: "مقياس حرارة", productName: "HOUYI Chubby Thermometer", productCode: "houyi-chubby-thermometer", category: "care", priority: "essential" }
        ]
    },
    {
        id: "discus",
        name: "Discus",
        arabicName: "ديسكوس",
        type: "fish",
        method: "egg-layer",
        difficulty: "difficult",
        sexualMaturityWeeks: 52,
        breedingInterval: 14,
        eggHatchDays: 3,
        avgFryCount: { min: 50, max: 200 },
        optimalTemp: { min: 28, max: 32 },
        optimalPH: { min: 5.5, max: 6.5 },
        minTankSize: 200,
        supplies: [
            { id: "heater_strong", name: "Heater 300W", nameAr: "سخان 300 واط (يفضل 2)", productName: "YEE Black Warrior 300W", productCode: "c4-1103", category: "equipment", priority: "essential" },
            { id: "bacteria", name: "Nitrifying Bacteria", nameAr: "بكتيريا نافعة", productName: "YEE Nitrifying Bacteria", productCode: "c2-1005", category: "water_care", priority: "essential" },
            { id: "meth_blue", name: "Methylene Blue", nameAr: "أزرق الميثيلين", productName: "Yee Methylene Blue", productCode: "yyh-207", category: "water_care", priority: "recommended" },
            { id: "scraper", name: "Glass Scraper", nameAr: "مكشطة زجاج", productName: "HOUYI 5-in-1 Algae Scraper", productCode: "houyi-aquarium-fish-tank-five-in-one-cleaning-tool-fish-net-scraper-algae-knife-aquatic-clip", category: "care", priority: "recommended" }
        ]
    },
    {
        id: "corydoras",
        name: "Corydoras",
        arabicName: "كوريدوراس",
        type: "fish",
        method: "egg-layer",
        difficulty: "moderate",
        sexualMaturityWeeks: 20,
        breedingInterval: 7,
        eggHatchDays: 4,
        avgFryCount: { min: 20, max: 100 },
        optimalTemp: { min: 22, max: 26 },
        optimalPH: { min: 6.0, max: 7.5 },
        minTankSize: 75,
        supplies: [
            { id: "sand", name: "Soft Sand", nameAr: "رمل ناعم", productName: "HOUYI River Sand 1-2mm", productCode: "houyi-river-sand-1-2mm", category: "decor", priority: "essential" },
            { id: "shelled_eggs", name: "Shelled Eggs", nameAr: "بيوض مقشرة", productName: "Yee Shelled Eggs", productCode: "yyy-078", category: "food", priority: "recommended" },
            { id: "tubifex", name: "Tubifex Worms", nameAr: "ديدان مجففة", productName: "YEE FD Tubifex", productCode: "c1-1082", category: "food", priority: "recommended" }
        ]
    },
    {
        id: "neon-tetra",
        name: "Neon Tetra",
        arabicName: "نيون تيترا",
        type: "fish",
        method: "egg-layer",
        difficulty: "difficult",
        sexualMaturityWeeks: 16,
        breedingInterval: 14,
        eggHatchDays: 1,
        avgFryCount: { min: 50, max: 150 },
        optimalTemp: { min: 22, max: 25 },
        optimalPH: { min: 5.0, max: 6.5 },
        minTankSize: 40,
        supplies: [
            { id: "infusoria", name: "Micro Food", nameAr: "طعام دقيق جداً", productName: "YEE Micro 0.2mm", productCode: "c1-1082", category: "food", priority: "essential" },
            { id: "breeding_tank", name: "Small Tank", nameAr: "حوض تفريخ", productName: "YEE 35cm Tank", productCode: "yee-1090", category: "equipment", priority: "essential" },
            { id: "wood", name: "Driftwood", nameAr: "خشب طبيعي (PH)", productName: "HOUYI Rhododendron 30cm", productCode: undefined, category: "decor", priority: "recommended" }
        ]
    },
    {
        id: "goldfish",
        name: "Goldfish",
        arabicName: "السمكة الذهبية",
        type: "fish",
        method: "egg-layer",
        difficulty: "moderate",
        sexualMaturityWeeks: 52,
        breedingInterval: 14,
        eggHatchDays: 4,
        avgFryCount: { min: 500, max: 3000 },
        optimalTemp: { min: 18, max: 22 },
        optimalPH: { min: 7.0, max: 8.0 },
        minTankSize: 150,
        supplies: [
            { id: "goldfish_food", name: "Goldfish Food", nameAr: "طعام جولد فيش", productName: "Goldfish Spirulina Feed", productCode: "c1-1127", category: "food", priority: "essential" },
            { id: "strong_filter", name: "Filter Media", nameAr: "ميديا فلتر", productName: "YEE 16-in-1 Media", productCode: "ylc-410", category: "equipment", priority: "essential" },
            { id: "air_pump", name: "Air Pump", nameAr: "مضخة هواء قوية", productName: "YEE 3W Pump", productCode: "ytz-300", category: "equipment", priority: "essential" },
            { id: "siphon", name: "Gravel Cleaner", nameAr: "شفاط كبير", productName: "HOUYI Quick Siphon", productCode: undefined, category: "care", priority: "essential" }
        ]
    },
    {
        id: "zebra-danio",
        name: "Zebra Danio",
        arabicName: "زيبرا دانيو",
        type: "fish",
        method: "egg-layer",
        difficulty: "easy",
        sexualMaturityWeeks: 8,
        breedingInterval: 7,
        eggHatchDays: 2,
        avgFryCount: { min: 50, max: 300 },
        optimalTemp: { min: 22, max: 26 },
        optimalPH: { min: 6.5, max: 7.5 },
        minTankSize: 40,
        supplies: [
            { id: "marbles", name: "Marbles/Mesh", nameAr: "كرات زجاجية/حصى", productName: "HOUYI River Sand", productCode: "houyi-river-sand-1-2mm", category: "breeding", priority: "essential" },
            { id: "micro_food", name: "Micro Food", nameAr: "طعام مايكرو", productName: "YEE Micro 0.2mm", productCode: "c1-1082", category: "food", priority: "essential" }
        ]
    },

    // ========== SNAILS ==========
    {
        id: "mystery-snail",
        name: "Mystery Snail",
        arabicName: "حلزون الغموض",
        type: "snail",
        method: "egg-clutch",
        difficulty: "easy",
        sexualMaturityWeeks: 12,
        breedingInterval: 14,
        eggHatchDays: 21,
        avgFryCount: { min: 50, max: 200 },
        optimalTemp: { min: 22, max: 28 },
        optimalPH: { min: 7.0, max: 8.0 },
        minTankSize: 20,
        supplies: [
            { id: "calcium", name: "Calcium", nameAr: "كالسيوم", productName: "YEE Multivitamin Salt", productCode: "yan-804", category: "care", priority: "recommended" },
            { id: "veggies", name: "Vegetables", nameAr: "خضروات", category: "food", priority: "recommended" }
        ]
    },
    {
        id: "ramshorn-snail",
        name: "Ramshorn Snail",
        arabicName: "حلزون قرن الكبش",
        type: "snail",
        method: "egg-clutch",
        difficulty: "easy",
        sexualMaturityWeeks: 6,
        breedingInterval: 7,
        eggHatchDays: 14,
        avgFryCount: { min: 10, max: 50 },
        optimalTemp: { min: 20, max: 28 },
        optimalPH: { min: 7.0, max: 8.0 },
        minTankSize: 10,
        supplies: [
            { id: "calcium", name: "Calcium", nameAr: "كالسيوم", category: "care", priority: "recommended" }
        ]
    },
    {
        id: "nerite-snail",
        name: "Nerite Snail",
        arabicName: "حلزون نيرايت",
        type: "snail",
        method: "egg-clutch",
        difficulty: "difficult",
        sexualMaturityWeeks: 26,
        breedingInterval: 30,
        eggHatchDays: 21,
        avgFryCount: { min: 20, max: 50 },
        optimalTemp: { min: 22, max: 26 },
        optimalPH: { min: 7.5, max: 8.5 },
        minTankSize: 20,
        supplies: [
            { id: "salt", name: "Salt", nameAr: "ملح (للمياه الموالح)", productName: "YEE Multivitamin Salt", productCode: "yan-804", category: "water_care", priority: "essential" }
        ]
    },
    {
        id: "bladder-snail",
        name: "Bladder Snail",
        arabicName: "حلزون المثانة",
        type: "snail",
        method: "egg-clutch",
        difficulty: "easy",
        sexualMaturityWeeks: 4,
        breedingInterval: 7,
        eggHatchDays: 10,
        avgFryCount: { min: 20, max: 100 },
        optimalTemp: { min: 18, max: 28 },
        optimalPH: { min: 6.5, max: 8.0 },
        minTankSize: 5,
        supplies: []
    },

    // ========== SHRIMP ==========
    {
        id: "cherry-shrimp",
        name: "Cherry Shrimp",
        arabicName: "روبيان الكرز",
        type: "shrimp",
        method: "egg-layer",
        difficulty: "easy",
        sexualMaturityWeeks: 12,
        breedingInterval: 30,
        eggHatchDays: 21,
        avgFryCount: { min: 20, max: 30 },
        optimalTemp: { min: 22, max: 26 },
        optimalPH: { min: 6.5, max: 7.5 },
        minTankSize: 20,
        supplies: [
            { id: "shrimp_food", name: "Shrimp Food", nameAr: "طعام روبيان متخصص", productName: "YEE Shrimp Food", productCode: "c1-1066", category: "food", priority: "essential" },
            { id: "sponge_filter", name: "Sponge Filter", nameAr: "فلتر (ما يشفط الصغار)", category: "equipment", priority: "essential" },
            { id: "moss", name: "Moss/Driftwood", nameAr: "طحالب وأخشاب", productName: "HOUYI Driftwood 15-20cm", productCode: "houyi-white-sand", category: "decor", priority: "essential" }
        ]
    },
    {
        id: "amano-shrimp",
        name: "Amano Shrimp",
        arabicName: "روبيان أمانو",
        type: "shrimp",
        method: "egg-layer",
        difficulty: "difficult",
        sexualMaturityWeeks: 20,
        breedingInterval: 45,
        eggHatchDays: 28,
        avgFryCount: { min: 1000, max: 3000 },
        optimalTemp: { min: 22, max: 26 },
        optimalPH: { min: 6.5, max: 7.5 },
        minTankSize: 40,
        supplies: [
            { id: "salt", name: "Salt", nameAr: "ملح (للمياه الموالح)", productName: "YEE Multivitamin Salt", productCode: "yan-804", category: "water_care", priority: "essential" }
        ]
    },
    {
        id: "crystal-shrimp",
        name: "Crystal Red Shrimp",
        arabicName: "روبيان الكريستال",
        type: "shrimp",
        method: "egg-layer",
        difficulty: "moderate",
        sexualMaturityWeeks: 16,
        breedingInterval: 30,
        eggHatchDays: 21,
        avgFryCount: { min: 15, max: 25 },
        optimalTemp: { min: 20, max: 24 },
        optimalPH: { min: 5.8, max: 6.8 },
        minTankSize: 40,
        supplies: [
            { id: "shrimp_food", name: "Shrimp Food", nameAr: "طعام روبيان متخصص", productName: "YEE Shrimp Food", productCode: "c1-1066", category: "food", priority: "essential" },
            { id: "soil", name: "Volcanic Stone", nameAr: "أحجار بركانية", productName: "HOUYI Volcanic Black 3-5cm", productCode: "houyi-volcanic-black-red-35cm", category: "decor", priority: "essential" }
        ]
    },
    {
        id: "ghost-shrimp",
        name: "Ghost Shrimp",
        arabicName: "روبيان الشبح",
        type: "shrimp",
        method: "egg-layer",
        difficulty: "moderate",
        sexualMaturityWeeks: 8,
        breedingInterval: 30,
        eggHatchDays: 21,
        avgFryCount: { min: 20, max: 50 },
        optimalTemp: { min: 22, max: 28 },
        optimalPH: { min: 7.0, max: 8.0 },
        minTankSize: 20,
        supplies: [
            { id: "plants", name: "Plants", nameAr: "نباتات كثيفة", category: "decor", priority: "essential" },
            { id: "net", name: "Net", nameAr: "شبكة صيد", productName: "HOUYI Fish Net", productCode: "houyi-mesh-8cm", category: "equipment", priority: "essential" }
        ]
    }
];
