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
        minTankSize: 40
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
        minTankSize: 75
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
        minTankSize: 40
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
        minTankSize: 75
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
        minTankSize: 30
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
        minTankSize: 40
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
        minTankSize: 150
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
        minTankSize: 200
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
        minTankSize: 75
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
        minTankSize: 40
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
        minTankSize: 150
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
        minTankSize: 40
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
        minTankSize: 20
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
        minTankSize: 10
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
        minTankSize: 20
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
        minTankSize: 5
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
        minTankSize: 20
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
        minTankSize: 40
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
        minTankSize: 40
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
        minTankSize: 20
    }
];
