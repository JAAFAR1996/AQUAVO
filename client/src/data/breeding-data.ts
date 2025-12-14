import type { LucideIcon } from "lucide-react";
// We don't import icons here to keep data pure, but types are useful

export interface BreedingSpecies {
  id: string;
  name: string;
  arabicName: string;
  type: 'fish' | 'snail' | 'shrimp';
  method: 'live-bearer' | 'egg-layer' | 'bubble-nest' | 'mouth-brooder' | 'egg-clutch';
  difficulty: 'easy' | 'moderate' | 'difficult';
  sexualMaturityWeeks: number;
  gestationDays?: number; // For live-bearers
  eggHatchDays?: number; // For egg-layers
  avgFryCount: { min: number; max: number };
  breedingInterval: number; // Days between spawns
  minTankSize: number; // Liters
  optimalTemp: { min: number; max: number };
  optimalPH: { min: number; max: number };
  image?: string;
  notes?: string;
}

export const breedingSpecies: BreedingSpecies[] = [
  // --- Livebearers ---
  {
    id: "guppy",
    name: "Guppy",
    arabicName: "جوبي",
    type: 'fish',
    method: "live-bearer",
    difficulty: "easy",
    sexualMaturityWeeks: 12,
    gestationDays: 28,
    avgFryCount: { min: 20, max: 50 },
    breedingInterval: 30,
    minTankSize: 20,
    optimalTemp: { min: 24, max: 28 },
    optimalPH: { min: 7.0, max: 8.0 }
  },
  {
    id: "molly",
    name: "Molly",
    arabicName: "مولي",
    type: 'fish',
    method: "live-bearer",
    difficulty: "easy",
    sexualMaturityWeeks: 14,
    gestationDays: 60,
    avgFryCount: { min: 30, max: 80 },
    breedingInterval: 60,
    minTankSize: 40,
    optimalTemp: { min: 24, max: 28 },
    optimalPH: { min: 7.5, max: 8.5 }
  },
  {
    id: "platy",
    name: "Platy",
    arabicName: "بلاتي",
    type: 'fish',
    method: "live-bearer",
    difficulty: "easy",
    sexualMaturityWeeks: 16,
    gestationDays: 28,
    avgFryCount: { min: 20, max: 40 },
    breedingInterval: 30,
    minTankSize: 30,
    optimalTemp: { min: 20, max: 26 },
    optimalPH: { min: 7.0, max: 8.0 }
  },
  {
    id: "swordtail",
    name: "Swordtail",
    arabicName: "سوردتيل (سمكة السيف)",
    type: 'fish',
    method: "live-bearer",
    difficulty: "easy",
    sexualMaturityWeeks: 16,
    gestationDays: 28,
    avgFryCount: { min: 20, max: 80 },
    breedingInterval: 30,
    minTankSize: 60,
    optimalTemp: { min: 22, max: 28 },
    optimalPH: { min: 7.0, max: 8.2 }
  },

  // --- Egg Layers ---
  {
    id: "betta",
    name: "Betta",
    arabicName: "بيتا (المقاتل السيامي)",
    type: 'fish',
    method: "bubble-nest",
    difficulty: "moderate",
    sexualMaturityWeeks: 16,
    eggHatchDays: 2,
    avgFryCount: { min: 100, max: 300 },
    breedingInterval: 14,
    minTankSize: 40,
    optimalTemp: { min: 26, max: 28 },
    optimalPH: { min: 6.5, max: 7.5 }
  },
  {
    id: "dwarf-gourami",
    name: "Dwarf Gourami",
    arabicName: "جورامي قزم",
    type: 'fish',
    method: "bubble-nest",
    difficulty: "moderate",
    sexualMaturityWeeks: 20,
    eggHatchDays: 2,
    avgFryCount: { min: 300, max: 600 },
    breedingInterval: 21,
    minTankSize: 40,
    optimalTemp: { min: 27, max: 28 },
    optimalPH: { min: 6.0, max: 7.5 }
  },
  {
    id: "angelfish",
    name: "Angelfish",
    arabicName: "سمكة الملاك",
    type: 'fish',
    method: "egg-layer",
    difficulty: "moderate",
    sexualMaturityWeeks: 24,
    eggHatchDays: 3,
    avgFryCount: { min: 200, max: 400 },
    breedingInterval: 12,
    minTankSize: 150,
    optimalTemp: { min: 26, max: 28 },
    optimalPH: { min: 6.5, max: 7.0 }
  },
  {
    id: "discus",
    name: "Discus",
    arabicName: "ديسكس",
    type: 'fish',
    method: "egg-layer",
    difficulty: "difficult",
    sexualMaturityWeeks: 52,
    eggHatchDays: 3,
    avgFryCount: { min: 100, max: 200 },
    breedingInterval: 14,
    minTankSize: 200,
    optimalTemp: { min: 28, max: 30 },
    optimalPH: { min: 6.0, max: 6.5 }
  },
  {
    id: "neon-tetra",
    name: "Neon Tetra",
    arabicName: "نيون تيترا",
    type: 'fish',
    method: "egg-layer",
    difficulty: "difficult",
    sexualMaturityWeeks: 30,
    eggHatchDays: 1,
    avgFryCount: { min: 60, max: 130 },
    breedingInterval: 14,
    minTankSize: 40,
    optimalTemp: { min: 25, max: 26 },
    optimalPH: { min: 5.0, max: 6.0 },
    notes: "Requires darkness for eggs."
  },
  {
    id: "cardinal-tetra",
    name: "Cardinal Tetra",
    arabicName: "تيترا كاردينال",
    type: 'fish',
    method: "egg-layer",
    difficulty: "difficult", // Actually expert
    sexualMaturityWeeks: 36,
    eggHatchDays: 1, // 24 hours
    avgFryCount: { min: 100, max: 500 }, // Can be high but survival low
    breedingInterval: 21,
    minTankSize: 40,
    optimalTemp: { min: 26, max: 28 },
    optimalPH: { min: 4.5, max: 6.0 }
  },
  {
    id: "goldfish",
    name: "Goldfish",
    arabicName: "السمكة الذهبية",
    type: 'fish',
    method: "egg-layer",
    difficulty: "moderate",
    sexualMaturityWeeks: 52,
    eggHatchDays: 4,
    avgFryCount: { min: 500, max: 1000 },
    breedingInterval: 30, // Seasonally usually
    minTankSize: 100,
    optimalTemp: { min: 18, max: 22 }, // Spawning temp
    optimalPH: { min: 7.0, max: 7.5 }
  },
  {
    id: "zebra-danio",
    name: "Zebra Danio",
    arabicName: "زيبرا دانيو",
    type: 'fish',
    method: "egg-layer",
    difficulty: "easy",
    sexualMaturityWeeks: 12,
    eggHatchDays: 2,
    avgFryCount: { min: 300, max: 500 },
    breedingInterval: 10,
    minTankSize: 40,
    optimalTemp: { min: 24, max: 26 },
    optimalPH: { min: 6.5, max: 7.0 }
  },
  {
    id: "corydoras-paleatus",
    name: "Peppered Corydoras",
    arabicName: "كوريدوراس (منظف القاع)",
    type: 'fish',
    method: "egg-layer",
    difficulty: "easy",
    sexualMaturityWeeks: 36,
    eggHatchDays: 3,
    avgFryCount: { min: 20, max: 100 },
    breedingInterval: 14,
    minTankSize: 60,
    optimalTemp: { min: 22, max: 24 }, // Slightly cooler triggers spawning
    optimalPH: { min: 6.5, max: 7.2 }
  },
  {
    id: "black-skirt-tetra",
    name: "Black Skirt Tetra",
    arabicName: "تيترا التنورة السوداء",
    type: 'fish',
    method: "egg-layer",
    difficulty: "moderate",
    sexualMaturityWeeks: 36,
    eggHatchDays: 1, // 24-36 hrs
    avgFryCount: { min: 200, max: 500 },
    breedingInterval: 14,
    minTankSize: 60,
    optimalTemp: { min: 26, max: 28 },
    optimalPH: { min: 6.5, max: 7.0 }
  },

  // --- Shrimp ---
  {
    id: "cherry-shrimp", // Neocaridina
    name: "Cherry Shrimp",
    arabicName: "روبيان الكرز",
    type: 'shrimp',
    method: "live-bearer", // Effectively (eggs carried until hatch)
    difficulty: "easy",
    sexualMaturityWeeks: 12,
    gestationDays: 20, // Egg carrying time
    avgFryCount: { min: 20, max: 30 },
    breedingInterval: 30,
    minTankSize: 20,
    optimalTemp: { min: 22, max: 26 },
    optimalPH: { min: 6.8, max: 7.5 }
  },
  {
    id: "amano-shrimp",
    name: "Amano Shrimp",
    arabicName: "روبيان أمانو",
    type: 'shrimp',
    method: "egg-layer",
    difficulty: "difficult", // Larvae need brackish water
    sexualMaturityWeeks: 20,
    eggHatchDays: 35, // Larval stage duration roughly
    avgFryCount: { min: 1000, max: 2000 },
    breedingInterval: 60,
    minTankSize: 40,
    optimalTemp: { min: 22, max: 28 },
    optimalPH: { min: 6.5, max: 8.0 },
    notes: "Requires brackish water for larvae."
  },

  // --- Snails (NEW) ---
  {
    id: "mystery-snail",
    name: "Mystery Snail",
    arabicName: "حلزون التفاح (الغامض)",
    type: 'snail',
    method: "egg-clutch",
    difficulty: "easy",
    sexualMaturityWeeks: 24, // 3-6 months depending on temp
    eggHatchDays: 14, // 2-4 weeks
    avgFryCount: { min: 50, max: 200 },
    breedingInterval: 14, // Can lay frequently if fed well
    minTankSize: 40,
    optimalTemp: { min: 24, max: 27 },
    optimalPH: { min: 7.6, max: 8.4 }, // Needs calcium/alkaline
    notes: "Lays pink egg clutches above water line. Needs 1-2 inches air gap."
  },
  {
    id: "ramshorn-snail",
    name: "Ramshorn Snail",
    arabicName: "حلزون رامزهورن",
    type: 'snail',
    method: "egg-clutch", // Gelatinous mass
    difficulty: "easy",
    sexualMaturityWeeks: 6, // Very fast
    eggHatchDays: 10, // 10-20 days
    avgFryCount: { min: 10, max: 30 }, // Per clutch, but frequent
    breedingInterval: 5, // Very frequent
    minTankSize: 20,
    optimalTemp: { min: 21, max: 26 },
    optimalPH: { min: 7.0, max: 8.0 },
    notes: "Hermaphroditic. Can become a pest if overfed."
  },
  {
    id: "nerite-snail",
    name: "Nerite Snail",
    arabicName: "حلزون نيريت",
    type: 'snail',
    method: "egg-layer",
    difficulty: "difficult", // Cannot breed in freshwater (eggs won't hatch)
    sexualMaturityWeeks: 52, // Unknown/irrelevant for FW breeding
    eggHatchDays: 0, // Won't hatch in FW
    avgFryCount: { min: 0, max: 0 },
    breedingInterval: 0,
    minTankSize: 20,
    optimalTemp: { min: 22, max: 26 },
    optimalPH: { min: 7.0, max: 8.5 },
    notes: "Excellent algae eater. Lays white eggs that never hatch in freshwater."
  },
  {
    id: "bladder-snail",
    name: "Bladder Snail",
    arabicName: "حلزون المثانة (Bladder)",
    type: 'snail',
    method: "egg-clutch",
    difficulty: "easy", // "Too easy" - often considered pest
    sexualMaturityWeeks: 4,
    eggHatchDays: 7,
    avgFryCount: { min: 20, max: 100 }, // Explosion possible
    breedingInterval: 3, // Constantly
    minTankSize: 4, // Any puddle
    optimalTemp: { min: 18, max: 28 },
    optimalPH: { min: 6.5, max: 8.5 },
    notes: "Common hitchhiker. Reproduces extremely fast."
  }
];

export interface FryGrowthStage {
  week: number;
  stage: string;
  stageAr: string;
  size: string;
  food: string;
  foodAr: string;
  tips: string;
}
