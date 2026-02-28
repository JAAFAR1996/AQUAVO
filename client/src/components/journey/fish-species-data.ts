/**
 * Comprehensive fish species database for the journey wizard.
 * Each species includes Arabic/English names, feeding info, tank requirements,
 * and product keyword mappings for intelligent recommendation matching.
 */

export interface FishSpeciesInfo {
    id: string;
    nameAr: string;
    nameEn: string;
    category: string; // matches fishTypes categories
    emoji: string;
    image?: string; // optional image URL
    difficulty: "easy" | "medium" | "hard";
    tankMinLiters: number;
    temperatureRange: string; // e.g. "22-28°C"
    phRange: string; // e.g. "6.5-7.5"
    maxSizeCm: number;
    lifespan: string; // e.g. "3-5 سنوات"
    schooling: boolean; // needs group?
    minGroupSize?: number;
    feedingInfo: {
        foodTypes: ("flakes" | "pellets" | "frozen" | "live" | "algae" | "vegetables" | "spirulina")[];
        frequencyPerDay: number;
        tips: string;
        productKeywords: string[]; // keywords to match store products
    };
    compatibilityNotes: string;
}

export interface FishCategory {
    id: string;
    nameAr: string;
    nameEn: string;
    emoji: string;
    description: string;
    color: string; // CSS color class for styling
    species: FishSpeciesInfo[];
}

export const FISH_CATEGORIES: FishCategory[] = [
    {
        id: "community",
        nameAr: "أسماك المجتمع",
        nameEn: "Community Fish",
        emoji: "🐠",
        description: "سلمية وسهلة التربية، مثالية للمبتدئين",
        color: "blue",
        species: [
            {
                id: "guppy",
                nameAr: "جوبي",
                nameEn: "Guppy",
                category: "community",
                emoji: "🐟",
                difficulty: "easy",
                tankMinLiters: 20,
                temperatureRange: "22-28°C",
                phRange: "6.8-7.8",
                maxSizeCm: 5,
                lifespan: "2-3 سنوات",
                schooling: true,
                minGroupSize: 3,
                feedingInfo: {
                    foodTypes: ["flakes", "pellets", "frozen"],
                    frequencyPerDay: 2,
                    tips: "أكل متنوع: فليكس يومي + بروتين مجمد مرتين أسبوعياً. لا تكثر الكمية - ما يأكلونه خلال دقيقتين يكفي",
                    productKeywords: ["guppy", "small fish", "flake", "tropical", "community"],
                },
                compatibilityNotes: "متوافق مع معظم الأسماك السلمية. تجنب الأسماك العدوانية",
            },
            {
                id: "molly",
                nameAr: "مولي",
                nameEn: "Molly",
                category: "community",
                emoji: "🐟",
                difficulty: "easy",
                tankMinLiters: 40,
                temperatureRange: "24-28°C",
                phRange: "7.0-8.5",
                maxSizeCm: 10,
                lifespan: "3-5 سنوات",
                schooling: true,
                minGroupSize: 3,
                feedingInfo: {
                    foodTypes: ["flakes", "pellets", "algae", "vegetables"],
                    frequencyPerDay: 2,
                    tips: "يحب التنوع! فليكس + خضروات مسلوقة (كوسة، سبانخ). يأكل الطحالب أيضاً",
                    productKeywords: ["molly", "tropical", "flake", "community", "spirulina"],
                },
                compatibilityNotes: "يفضل مياه قلوية قليلاً. يتوافق مع أسماك المجتمع",
            },
            {
                id: "platy",
                nameAr: "بلاتي",
                nameEn: "Platy",
                category: "community",
                emoji: "🐟",
                difficulty: "easy",
                tankMinLiters: 30,
                temperatureRange: "20-26°C",
                phRange: "7.0-8.0",
                maxSizeCm: 7,
                lifespan: "3-4 سنوات",
                schooling: true,
                minGroupSize: 3,
                feedingInfo: {
                    foodTypes: ["flakes", "pellets", "vegetables"],
                    frequencyPerDay: 2,
                    tips: "آكل نهم! فليكس أساسي + خضروات مسلوقة أسبوعياً. سهل التغذية جداً",
                    productKeywords: ["platy", "tropical", "flake", "community", "small fish"],
                },
                compatibilityNotes: "من أسهل الأسماك تربية. يتكاثر بسهولة",
            },
            {
                id: "swordtail",
                nameAr: "سورد تيل",
                nameEn: "Swordtail",
                category: "community",
                emoji: "🐟",
                difficulty: "easy",
                tankMinLiters: 50,
                temperatureRange: "22-28°C",
                phRange: "7.0-8.4",
                maxSizeCm: 14,
                lifespan: "3-5 سنوات",
                schooling: false,
                feedingInfo: {
                    foodTypes: ["flakes", "pellets", "frozen", "vegetables"],
                    frequencyPerDay: 2,
                    tips: "نظام غذائي متوازن: فليكس + بيليتس + خضروات. يحب البروتين المجمد كمكافأة",
                    productKeywords: ["swordtail", "tropical", "flake", "community"],
                },
                compatibilityNotes: "ذكور قد تكون عدوانية مع بعضها. احتفظ بذكر واحد أو 3+",
            },
        ],
    },
    {
        id: "cichlids",
        nameAr: "سيكليد",
        nameEn: "Cichlids",
        emoji: "🐡",
        description: "ملونة وذكية، تحتاج خبرة متوسطة",
        color: "orange",
        species: [
            {
                id: "angelfish",
                nameAr: "أنجل فيش",
                nameEn: "Angelfish",
                category: "cichlids",
                emoji: "👼",
                difficulty: "medium",
                tankMinLiters: 100,
                temperatureRange: "24-30°C",
                phRange: "6.0-7.5",
                maxSizeCm: 15,
                lifespan: "10-12 سنوات",
                schooling: false,
                feedingInfo: {
                    foodTypes: ["pellets", "flakes", "frozen", "live"],
                    frequencyPerDay: 2,
                    tips: "بيليتس عالي البروتين + أكل مجمد (دود الدم، أرتيميا). يحتاج تنوع أسبوعي",
                    productKeywords: ["angelfish", "cichlid", "pellet", "frozen", "bloodworm"],
                },
                compatibilityNotes: "قد يأكل الأسماك الصغيرة جداً. يتوافق مع أسماك متوسطة الحجم",
            },
            {
                id: "ram",
                nameAr: "رامريزي",
                nameEn: "German Blue Ram",
                category: "cichlids",
                emoji: "💙",
                difficulty: "medium",
                tankMinLiters: 60,
                temperatureRange: "26-30°C",
                phRange: "5.5-7.0",
                maxSizeCm: 7,
                lifespan: "3-4 سنوات",
                schooling: false,
                feedingInfo: {
                    foodTypes: ["pellets", "frozen", "live"],
                    frequencyPerDay: 2,
                    tips: "يحتاج بروتين عالي! بيليتس صغير + أكل مجمد يومياً. حساس لجودة الماء",
                    productKeywords: ["ram", "cichlid", "small pellet", "frozen", "dwarf cichlid"],
                },
                compatibilityNotes: "يحتاج مياه دافئة ونقية. سلمي نسبياً",
            },
            {
                id: "discus",
                nameAr: "ديسكس",
                nameEn: "Discus",
                category: "cichlids",
                emoji: "🟠",
                difficulty: "hard",
                tankMinLiters: 200,
                temperatureRange: "28-32°C",
                phRange: "5.0-7.0",
                maxSizeCm: 20,
                lifespan: "10-15 سنوات",
                schooling: true,
                minGroupSize: 5,
                feedingInfo: {
                    foodTypes: ["pellets", "frozen", "live"],
                    frequencyPerDay: 3,
                    tips: "ملك الأحواض! يحتاج أكل عالي الجودة 3 مرات يومياً. قلب لحم بقر مفروم + دود دم + بيليتس خاص",
                    productKeywords: ["discus", "cichlid", "premium", "frozen", "bloodworm", "high protein"],
                },
                compatibilityNotes: "يحتاج مجموعة 5+ ومياه دافئة ونقية جداً. للخبراء فقط",
            },
        ],
    },
    {
        id: "bottom-dwellers",
        nameAr: "أسماك القاع",
        nameEn: "Bottom Dwellers",
        emoji: "🦐",
        description: "تنظف القاع وتضيف حياة للحوض",
        color: "amber",
        species: [
            {
                id: "corydoras",
                nameAr: "كوريدوراس",
                nameEn: "Corydoras",
                category: "bottom-dwellers",
                emoji: "🐱",
                difficulty: "easy",
                tankMinLiters: 40,
                temperatureRange: "22-26°C",
                phRange: "6.0-7.5",
                maxSizeCm: 7,
                lifespan: "5-7 سنوات",
                schooling: true,
                minGroupSize: 6,
                feedingInfo: {
                    foodTypes: ["pellets", "frozen", "algae"],
                    frequencyPerDay: 1,
                    tips: "بيليتس غرقان (sinking pellets) أساسي! يأكل بالليل. أضف أكل مجمد مرة أسبوعياً",
                    productKeywords: ["corydoras", "sinking", "bottom", "pellet", "catfish", "tablet"],
                },
                compatibilityNotes: "سلمي جداً. يحتاج مجموعة 6+ ورمل ناعم (ليس حصى حاد)",
            },
            {
                id: "bristlenose-pleco",
                nameAr: "بريستلنوز بليكو",
                nameEn: "Bristlenose Pleco",
                category: "bottom-dwellers",
                emoji: "🐛",
                difficulty: "easy",
                tankMinLiters: 60,
                temperatureRange: "23-27°C",
                phRange: "6.0-7.5",
                maxSizeCm: 12,
                lifespan: "5-8 سنوات",
                schooling: false,
                feedingInfo: {
                    foodTypes: ["algae", "vegetables", "pellets"],
                    frequencyPerDay: 1,
                    tips: "آكل طحالب ممتاز! أضف رقائق سبيرولينا + كوسة مسلوقة + خشب (يحتاج خشب للهضم)",
                    productKeywords: ["pleco", "algae wafer", "spirulina", "sinking", "bottom feeder", "catfish"],
                },
                compatibilityNotes: "منظف ممتاز للحوض. يحتاج خشب (driftwood) للهضم",
            },
            {
                id: "kuhli-loach",
                nameAr: "كوهلي لوتش",
                nameEn: "Kuhli Loach",
                category: "bottom-dwellers",
                emoji: "🐍",
                difficulty: "medium",
                tankMinLiters: 40,
                temperatureRange: "24-30°C",
                phRange: "5.5-7.0",
                maxSizeCm: 10,
                lifespan: "10+ سنوات",
                schooling: true,
                minGroupSize: 4,
                feedingInfo: {
                    foodTypes: ["pellets", "frozen", "live"],
                    frequencyPerDay: 1,
                    tips: "يأكل بالليل! بيليتس غرقان + دود دم مجمد. يفضل الاختباء نهاراً",
                    productKeywords: ["loach", "sinking", "bottom", "frozen", "bloodworm", "tablet"],
                },
                compatibilityNotes: "يحتاج رمل ناعم وأماكن اختباء كثيرة. نشط ليلاً",
            },
        ],
    },
    {
        id: "schooling",
        nameAr: "أسماك السرب",
        nameEn: "Schooling Fish",
        emoji: "✨",
        description: "مجموعات ملونة تسبح معاً بشكل مذهل",
        color: "cyan",
        species: [
            {
                id: "neon-tetra",
                nameAr: "نيون تيترا",
                nameEn: "Neon Tetra",
                category: "schooling",
                emoji: "💎",
                difficulty: "easy",
                tankMinLiters: 40,
                temperatureRange: "20-26°C",
                phRange: "5.5-7.0",
                maxSizeCm: 3,
                lifespan: "5-8 سنوات",
                schooling: true,
                minGroupSize: 8,
                feedingInfo: {
                    foodTypes: ["flakes", "pellets", "frozen"],
                    frequencyPerDay: 2,
                    tips: "فليكس مكسر ناعم مرتين يومياً. أرتيميا مجمدة مرة أسبوعياً كمكافأة",
                    productKeywords: ["tetra", "small fish", "flake", "micro pellet", "tropical", "nano"],
                },
                compatibilityNotes: "يحتاج مجموعة 8+ للشعور بالأمان. لا يوضع مع أسماك كبيرة",
            },
            {
                id: "cardinal-tetra",
                nameAr: "كاردينال تيترا",
                nameEn: "Cardinal Tetra",
                category: "schooling",
                emoji: "❤️",
                difficulty: "medium",
                tankMinLiters: 50,
                temperatureRange: "24-28°C",
                phRange: "4.5-6.5",
                maxSizeCm: 4,
                lifespan: "4-5 سنوات",
                schooling: true,
                minGroupSize: 8,
                feedingInfo: {
                    foodTypes: ["flakes", "pellets", "frozen"],
                    frequencyPerDay: 2,
                    tips: "مثل النيون تيترا - فليكس ناعم + بروتين مجمد. يفضل مياه حمضية ناعمة",
                    productKeywords: ["tetra", "cardinal", "small fish", "flake", "micro pellet", "tropical"],
                },
                compatibilityNotes: "أجمل من النيون لكن يحتاج مياه أكثر حمضية",
            },
            {
                id: "harlequin-rasbora",
                nameAr: "هارلكوين راسبورا",
                nameEn: "Harlequin Rasbora",
                category: "schooling",
                emoji: "🔶",
                difficulty: "easy",
                tankMinLiters: 40,
                temperatureRange: "22-27°C",
                phRange: "6.0-7.5",
                maxSizeCm: 5,
                lifespan: "5-8 سنوات",
                schooling: true,
                minGroupSize: 8,
                feedingInfo: {
                    foodTypes: ["flakes", "pellets", "frozen"],
                    frequencyPerDay: 2,
                    tips: "سهل التغذية! فليكس عادي مرتين يومياً. دود دم مجمد مرة أسبوعياً",
                    productKeywords: ["rasbora", "small fish", "flake", "tropical", "community", "nano"],
                },
                compatibilityNotes: "من أفضل أسماك السرب للمبتدئين. سلمي جداً",
            },
        ],
    },
    {
        id: "centerpiece",
        nameAr: "سمكة مركزية",
        nameEn: "Centerpiece Fish",
        emoji: "👑",
        description: "نجم الحوض الرئيسي - لافت وجذاب",
        color: "purple",
        species: [
            {
                id: "betta",
                nameAr: "بيتا (سمكة المقاتل)",
                nameEn: "Betta",
                category: "centerpiece",
                emoji: "🥊",
                difficulty: "easy",
                tankMinLiters: 15,
                temperatureRange: "24-28°C",
                phRange: "6.5-7.5",
                maxSizeCm: 7,
                lifespan: "2-4 سنوات",
                schooling: false,
                feedingInfo: {
                    foodTypes: ["pellets", "frozen", "live"],
                    frequencyPerDay: 2,
                    tips: "بيليتس بيتا خاص مرتين يومياً (2-3 حبات كل مرة). دود دم مجمد مرة أسبوعياً. صوم يوم واحد أسبوعياً",
                    productKeywords: ["betta", "fighter", "pellet", "bloodworm", "frozen"],
                },
                compatibilityNotes: "⚠️ ذكر واحد فقط بالحوض! لا يوضع مع ذكور بيتا آخرين أو أسماك ذات زعانف طويلة",
            },
            {
                id: "dwarf-gourami",
                nameAr: "جورامي قزم",
                nameEn: "Dwarf Gourami",
                category: "centerpiece",
                emoji: "🌈",
                difficulty: "medium",
                tankMinLiters: 40,
                temperatureRange: "24-28°C",
                phRange: "6.0-7.5",
                maxSizeCm: 9,
                lifespan: "4-6 سنوات",
                schooling: false,
                feedingInfo: {
                    foodTypes: ["flakes", "pellets", "frozen", "live"],
                    frequencyPerDay: 2,
                    tips: "فليكس + بيليتس + أكل مجمد متنوع. يحب الأكل من السطح. تنوع مهم جداً",
                    productKeywords: ["gourami", "tropical", "flake", "pellet", "frozen"],
                },
                compatibilityNotes: "سلمي لكن ذكور قد تتقاتل. واحد لكل حوض. يحب نباتات عائمة",
            },
            {
                id: "pearl-gourami",
                nameAr: "جورامي لؤلؤي",
                nameEn: "Pearl Gourami",
                category: "centerpiece",
                emoji: "🫧",
                difficulty: "medium",
                tankMinLiters: 80,
                temperatureRange: "24-28°C",
                phRange: "6.0-7.5",
                maxSizeCm: 12,
                lifespan: "5-8 سنوات",
                schooling: false,
                feedingInfo: {
                    foodTypes: ["flakes", "pellets", "frozen", "algae"],
                    frequencyPerDay: 2,
                    tips: "آكل نهم! يقبل كل شيء تقريباً. فليكس أساسي + بروتين مجمد + خضار",
                    productKeywords: ["gourami", "tropical", "flake", "pellet", "medium fish"],
                },
                compatibilityNotes: "من أفضل الجورامي سلمياً. جميل ولامع",
            },
        ],
    },
    {
        id: "goldfish",
        nameAr: "جولد فيش",
        nameEn: "Goldfish",
        emoji: "🐡",
        description: "كلاسيكية ومحبوبة - مياه باردة",
        color: "yellow",
        species: [
            {
                id: "common-goldfish",
                nameAr: "جولد فيش عادي",
                nameEn: "Common Goldfish",
                category: "goldfish",
                emoji: "🐡",
                difficulty: "easy",
                tankMinLiters: 80,
                temperatureRange: "10-24°C",
                phRange: "7.0-8.4",
                maxSizeCm: 25,
                lifespan: "10-15 سنوات",
                schooling: false,
                feedingInfo: {
                    foodTypes: ["pellets", "flakes", "vegetables"],
                    frequencyPerDay: 2,
                    tips: "بيليتس جولد فيش مرتين يومياً. يحب الخضروات: بازلاء مقشرة، كوسة. ⚠️ لا تكثر - معدته صغيرة!",
                    productKeywords: ["goldfish", "gold fish", "koi", "cold water", "pellet", "sinking"],
                },
                compatibilityNotes: "⚠️ يحتاج حوض كبير 80+ لتر. لا يوضع مع أسماك استوائية (درجة حرارة مختلفة)",
            },
            {
                id: "oranda",
                nameAr: "أوراندا",
                nameEn: "Oranda Goldfish",
                category: "goldfish",
                emoji: "👑",
                difficulty: "medium",
                tankMinLiters: 80,
                temperatureRange: "15-24°C",
                phRange: "6.5-7.5",
                maxSizeCm: 20,
                lifespan: "10-15 سنوات",
                schooling: false,
                feedingInfo: {
                    foodTypes: ["pellets", "flakes", "vegetables", "frozen"],
                    frequencyPerDay: 2,
                    tips: "بيليتس غرقان (sinking) أفضل - يمنع ابتلاع الهواء. بازلاء مقشرة ممتازة للهضم",
                    productKeywords: ["goldfish", "oranda", "sinking pellet", "gold fish", "premium"],
                },
                compatibilityNotes: "يوضع مع أنواع جولد فيش فانسي فقط. لا يوضع مع جولد فيش عادي (سريع جداً)",
            },
            {
                id: "ranchu",
                nameAr: "رانشو",
                nameEn: "Ranchu",
                category: "goldfish",
                emoji: "🥇",
                difficulty: "medium",
                tankMinLiters: 80,
                temperatureRange: "15-24°C",
                phRange: "7.0-8.0",
                maxSizeCm: 18,
                lifespan: "10-15 سنوات",
                schooling: false,
                feedingInfo: {
                    foodTypes: ["pellets", "frozen", "vegetables"],
                    frequencyPerDay: 2,
                    tips: "بيليتس رانشو خاص غرقان + دود دم مجمد + بازلاء. أكل عالي الجودة مهم للنمو السليم",
                    productKeywords: ["ranchu", "goldfish", "hikari", "sinking", "gold fish", "premium pellet"],
                },
                compatibilityNotes: "من أغلى وأجمل الجولد فيش. يحتاج عناية خاصة",
            },
        ],
    },
    {
        id: "shrimp-snails",
        nameAr: "جمبري وحلزون",
        nameEn: "Shrimp & Snails",
        emoji: "🦐",
        description: "منظفات طبيعية وإضافة جمالية فريدة",
        color: "pink",
        species: [
            {
                id: "cherry-shrimp",
                nameAr: "جمبري شيري",
                nameEn: "Cherry Shrimp",
                category: "shrimp-snails",
                emoji: "🦐",
                difficulty: "easy",
                tankMinLiters: 10,
                temperatureRange: "20-28°C",
                phRange: "6.5-8.0",
                maxSizeCm: 3,
                lifespan: "1-2 سنوات",
                schooling: true,
                minGroupSize: 5,
                feedingInfo: {
                    foodTypes: ["algae", "pellets", "vegetables"],
                    frequencyPerDay: 1,
                    tips: "يأكل الطحالب بشكل طبيعي! أضف رقائق سبيرولينا + خضروات مسلوقة 2-3 مرات أسبوعياً فقط",
                    productKeywords: ["shrimp", "crystal", "mineral", "spirulina", "algae wafer", "biofilm"],
                },
                compatibilityNotes: "⚠️ لا يوضع مع أسماك كبيرة (تأكله!). ممتاز مع النيون تيترا والحلزون",
            },
            {
                id: "amano-shrimp",
                nameAr: "جمبري أمانو",
                nameEn: "Amano Shrimp",
                category: "shrimp-snails",
                emoji: "🦐",
                difficulty: "easy",
                tankMinLiters: 20,
                temperatureRange: "22-28°C",
                phRange: "6.5-7.5",
                maxSizeCm: 5,
                lifespan: "2-3 سنوات",
                schooling: true,
                minGroupSize: 3,
                feedingInfo: {
                    foodTypes: ["algae", "pellets", "vegetables"],
                    frequencyPerDay: 1,
                    tips: "ملك أكل الطحالب! بالكاد يحتاج أكل إضافي. رقائق طحالب مرة أسبوعياً كافي",
                    productKeywords: ["shrimp", "amano", "algae", "spirulina", "biofilm"],
                },
                compatibilityNotes: "أفضل منظف طحالب طبيعي. آمن مع معظم الأسماك السلمية",
            },
            {
                id: "nerite-snail",
                nameAr: "حلزون نيريتا",
                nameEn: "Nerite Snail",
                category: "shrimp-snails",
                emoji: "🐌",
                difficulty: "easy",
                tankMinLiters: 10,
                temperatureRange: "22-28°C",
                phRange: "7.0-8.5",
                maxSizeCm: 3,
                lifespan: "1-3 سنوات",
                schooling: false,
                feedingInfo: {
                    foodTypes: ["algae", "vegetables"],
                    frequencyPerDay: 0,
                    tips: "لا يحتاج أكل إضافي تقريباً! يأكل الطحالب من الزجاج والصخور. إذا نظف الحوض كله، أضف رقائق طحالب",
                    productKeywords: ["snail", "algae wafer", "calcium", "mineral"],
                },
                compatibilityNotes: "لا يتكاثر بالمياه العذبة. آمن مع كل الأسماك تقريباً",
            },
            {
                id: "mystery-snail",
                nameAr: "حلزون الغموض",
                nameEn: "Mystery Snail",
                category: "shrimp-snails",
                emoji: "🐌",
                difficulty: "easy",
                tankMinLiters: 20,
                temperatureRange: "20-28°C",
                phRange: "7.0-8.0",
                maxSizeCm: 6,
                lifespan: "1-2 سنوات",
                schooling: false,
                feedingInfo: {
                    foodTypes: ["algae", "vegetables", "pellets"],
                    frequencyPerDay: 1,
                    tips: "يحب الخضروات! كوسة، خس، سبانخ مسلوقة. يحتاج كالسيوم لقوقعته",
                    productKeywords: ["snail", "mystery", "algae wafer", "calcium", "vegetable"],
                },
                compatibilityNotes: "ملون وجميل. يحتاج كالسيوم إضافي للقوقعة",
            },
        ],
    },
];

/**
 * Get all species from all categories in a flat array
 */
export function getAllSpecies(): FishSpeciesInfo[] {
    return FISH_CATEGORIES.flatMap(cat => cat.species);
}

/**
 * Get species by ID or IDs
 */
export function getSpeciesById(ids: string[]): FishSpeciesInfo[] {
    const allSpecies = getAllSpecies();
    return allSpecies.filter(s => ids.includes(s.id));
}

/**
 * Get the category for a given species ID
 */
export function getCategoryForSpecies(speciesId: string): FishCategory | undefined {
    return FISH_CATEGORIES.find(cat => cat.species.some(s => s.id === speciesId));
}

/**
 * Get difficulty badge color utility
 */
export function getDifficultyColor(difficulty: "easy" | "medium" | "hard"): string {
    switch (difficulty) {
        case "easy": return "text-green-500 bg-green-500/10 border-green-500/20";
        case "medium": return "text-amber-500 bg-amber-500/10 border-amber-500/20";
        case "hard": return "text-red-500 bg-red-500/10 border-red-500/20";
    }
}

/**
 * Get difficulty label in Arabic
 */
export function getDifficultyLabel(difficulty: "easy" | "medium" | "hard"): string {
    switch (difficulty) {
        case "easy": return "سهل";
        case "medium": return "متوسط";
        case "hard": return "متقدم";
    }
}
