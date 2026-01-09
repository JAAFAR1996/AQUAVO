export interface BreedingInfo {
  difficulty: 'easy' | 'moderate' | 'difficult' | 'expert';
  method: 'egg-layer' | 'live-bearer' | 'bubble-nest' | 'mouth-brooder';
  sexualDimorphism: string;
  spawningTriggers: string[];
  breedingSetup: {
    tankSize: string;
    waterConditions: string;
    temperature: string;
    equipment: string[];
  };
  spawningBehavior: string;
  eggCare: string;
  fryInfo: {
    firstFood: string;
    growthRate: string;
    adulthoodTime: string;
  };
  tips: string[];
}

export interface FishSpecies {
  id: string;
  commonName: string;
  arabicName: string;
  scientificName: string;
  family: string;
  origin: string;
  minSize: number; // cm
  maxSize: number; // cm
  lifespan: number; // years
  temperament: 'peaceful' | 'semi-aggressive' | 'aggressive';
  careLevel: 'beginner' | 'intermediate' | 'advanced';
  minTankSize: number; // liters
  waterParameters: {
    tempMin: number; // celsius
    tempMax: number;
    phMin: number;
    phMax: number;
    hardness: 'soft' | 'medium' | 'hard';
  };
  diet: string[];
  breeding: string | BreedingInfo;
  schooling: boolean;
  minimumGroup: number;
  compatibility: {
    goodWith: string[];
    avoidWith: string[];
  };
  description: string;
  careTips: string[];
  image: string;
  category: 'community' | 'cichlid' | 'catfish' | 'tetra' | 'livebearer' | 'betta' | 'gourami' | 'goldfish' | 'invertebrate' | 'other';
}

export const freshwaterFish: FishSpecies[] = [
  {
    id: 'neon-tetra',
    commonName: 'Neon Tetra',
    arabicName: 'تترا نيون',
    scientificName: 'Paracheirodon innesi',
    family: 'Characidae',
    origin: 'أمريكا الجنوبية - نهر الأمازون',
    minSize: 2.5,
    maxSize: 4,
    lifespan: 8,
    temperament: 'peaceful',
    careLevel: 'beginner',
    minTankSize: 40,
    waterParameters: {
      tempMin: 21,
      tempMax: 28,
      phMin: 6.0,
      phMax: 7.0,
      hardness: 'soft',
    },
    diet: ['Flakes', 'Micro pellets', 'Frozen bloodworms', 'Brine shrimp'],
    breeding: {
      difficulty: 'difficult',
      method: 'egg-layer',
      sexualDimorphism: 'الإناث أكثر استدارة وامتلاءً، خاصة عند الحمل بالبيض. الخط الأزرق في الإناث قد يبدو منحنياً أكثر.',
      spawningTriggers: [
        'تعتيم الحوض (يحتاج لظلام شبه تام)',
        'مياه ناعمة جداً وحمضية (pH 5.0-6.0)',
        'تغذية بالأطعمة الحية',
        'ضوء الصباح الخافت يحفز التزاوج'
      ],
      breedingSetup: {
        tankSize: '20-40 لتر (منفصل)',
        waterConditions: 'pH 5.5-6.0، ماء ناعم جداً (< 2 dGH)',
        temperature: '25-26°م',
        equipment: ['فلتر إسفنجي ضعيف', 'نباتات كثيفة (Java Moss)', 'شبكة في القاع لحماية البيض']
      },
      spawningBehavior: 'يحدث التزاوج عادة في الصباح الباكر. يسبح الزوج جنباً إلى جنب وينثران البيض فوق النباتات.',
      eggCare: 'البيض حساس جداً للضوء! يجب تغطية الحوض تماماً لمنع الضوء. يفقس بعد 24 ساعة.',
      fryInfo: {
        firstFood: 'Infusoria (إنفوزوريا) و Paramecium',
        growthRate: 'بطيء في البداية',
        adulthoodTime: '6-8 أشهر'
      },
      tips: [
        'أهم عامل هو الظلام - الضوء يقتل البيض واليرقات',
        'جودة المياه يجب أن تكون مثالية',
        'جهز مزارع الإنفوزوريا قبل أسبوعين',
        'اعزل الوالدين فوراً بعد وضع البيض'
      ]
    },
    schooling: true,
    minimumGroup: 6,
    compatibility: {
      goodWith: ['Cardinal Tetra', 'Harlequin Rasbora', 'Guppy', 'Corydoras', 'Dwarf Gourami'],
      avoidWith: ['Cichlids', 'Angelfish (adults)', 'Large Barbs'],
    },
    description: 'سمكة جميلة ذات لون أزرق نيون لامع مع خط أحمر. مثالية للمبتدئين وتضيف لمسة رائعة للأحواض المزروعة.',
    careTips: [
      'تفضل العيش في مجموعات لا تقل عن 6 أسماك',
      'تحتاج إلى إضاءة خافتة ومياه نظيفة',
      'حساسة لتغيرات المياه المفاجئة',
      'تتغذى بشكل أفضل في طبقات المياه الوسطى',
    ],
    image: '/fish/neon-tetra.png',
    category: 'tetra',
  },
  {
    id: 'betta-splendens',
    commonName: 'Betta Fish',
    arabicName: 'سمكة البيتا / السيامي المقاتل',
    scientificName: 'Betta splendens',
    family: 'Osphronemidae',
    origin: 'جنوب شرق آسيا - تايلاند',
    minSize: 5,
    maxSize: 7,
    lifespan: 3,
    temperament: 'aggressive',
    careLevel: 'beginner',
    minTankSize: 20,
    waterParameters: {
      tempMin: 24,
      tempMax: 28,
      phMin: 6.5,
      phMax: 7.5,
      hardness: 'soft',
    },
    diet: ['Betta pellets', 'Bloodworms', 'Brine shrimp', 'Daphnia'],
    breeding: {
      difficulty: 'moderate',
      method: 'bubble-nest',
      sexualDimorphism: 'الذكور ذو ألوان زاهية وزعانف طويلة جداً. الإناث أصغر وألوانها باهتة مع زعانف قصيرة.',
      spawningTriggers: [
        'رفع درجة الحرارة إلى 27-28°م',
        'تغذية مكثفة بالأطعمة الحية (بلودورم)',
        'خفض مستوى الماء إلى 15-20 سم',
        'إضافة نباتات طافية'
      ],
      breedingSetup: {
        tankSize: '20-40 لتر (منفصل)',
        waterConditions: 'pH 7.0، ماء ناعم، نظيف جداً',
        temperature: '27-28°م',
        equipment: ['سخان', 'نباتات طافية (Indian Almond leaves)', 'مخبأ للأنثى', 'بدون فلتر قوي']
      },
      spawningBehavior: 'الذكر يبني عش فقاعات على السطح. يحضن الذكر ويطارد الأنثى تحت العش. يلتف حولها ويضغط لإخراج البيض.',
      eggCare: 'الذكر يجمع البيض ويضعه في عش الفقاعات. احفظ الذكر مع البيض. أزل الأنثى فوراً! الذكر يحرس البيض 24-48 ساعة حتى يفقس.',
      fryInfo: {
        firstFood: 'Infusoria لمدة 3-4 أيام، ثم baby brine shrimp',
        growthRate: 'متوسط - تبدأ الألوان بعد 8-10 أسابيع',
        adulthoodTime: '3-4 أشهر للنضج الكامل'
      },
      tips: [
        'البيض يطفو في عش الفقاعات - لا تحرك الماء!',
        'الذكر أب ممتاز - لا تزيله حتى تسبح الصغار بحرية (48 ساعة)',
        'أزل الأنثى فوراً! الذكر قد يقتلها',
        'الصغار حساسون جداً للتيار - استخدم فلتر إسفنجي خفيف',
        'ورق اللوز الهندي يحسن الخصوبة ويمنع الفطريات'
      ]
    },
    schooling: false,
    minimumGroup: 1,
    compatibility: {
      goodWith: ['Corydoras', 'Kuhli Loach', 'Mystery Snail', 'African Dwarf Frog'],
      avoidWith: ['Other Bettas (males)', 'Guppies', 'Neon Tetras', 'Fin-nippers'],
    },
    description: 'سمكة شهيرة بألوانها الزاهية وزعانفها الطويلة الجميلة. الذكور عدوانية تجاه بعضها.',
    careTips: [
      'الذكور يجب أن يُربوا منفردين',
      'يحتاج لسطح مياه هادئ للتنفس',
      'يفضل النباتات الحية',
      'تجنب الزعانف الطويلة مع أسماك عدوانية',
    ],
    image: '/fish/betta-splendens.png',
    category: 'betta',
  },
  {
    id: 'guppy',
    commonName: 'Guppy',
    arabicName: 'سمكة الجوبي',
    scientificName: 'Poecilia reticulata',
    family: 'Poeciliidae',
    origin: 'أمريكا الجنوبية',
    minSize: 3,
    maxSize: 6,
    lifespan: 2,
    temperament: 'peaceful',
    careLevel: 'beginner',
    minTankSize: 40,
    waterParameters: {
      tempMin: 18,
      tempMax: 28,
      phMin: 6.8,
      phMax: 7.8,
      hardness: 'medium',
    },
    diet: ['Flakes', 'Algae', 'Vegetables', 'Live foods'],
    breeding: {
      difficulty: 'easy',
      method: 'live-bearer',
      sexualDimorphism: 'الذكور أصغر حجماً وأكثر ألواناً مع زعانف طويلة. الإناث أكبر وأقل لوناً مع بطن منتفخ.',
      spawningTriggers: [
        'درجة حرارة 26-28 درجة',
        'تغذية جيدة بالأطعمة الحية',
        'نسبة 1 ذكر لكل 2-3 إناث'
      ],
      breedingSetup: {
        tankSize: '20-40 لتر للتكاثر',
        waterConditions: 'pH 7.0-7.5، ماء متوسط الصلابة',
        temperature: '26-28°م',
        equipment: ['فلتر إسفنجي', 'نباتات كثيفة (Java moss)', 'صندوق ولادة اختياري']
      },
      spawningBehavior: 'الذكر يطارد الأنثى ويحدث التخصيب داخلياً. فترة الحمل 21-30 يوم.',
      eggCare: 'لا توجد بيوض - ولادة مباشرة! الصغار يسبحون فوراً. انقل الصغار أو الأم لحمايتهم.',
      fryInfo: {
        firstFood: 'Infusoria، brine shrimp حديث الفقس، طعام سائل للصغار',
        growthRate: 'سريع - ينضجون في 3-4 أشهر',
        adulthoodTime: '3-6 أشهر حسب الظروف'
      },
      tips: [
        'تأكل الصغار! افصلهم فوراً أو استخدم نباتات كثيفة',
        'Java moss و Guppy grass ممتازان لاختباء الصغار',
        'الأنثى تلد 20-50 صغير كل شهر!',
        'تجنب التهجين الداخلي - أضف دماء جديدة كل 3-4 أجيال'
      ]
    },
    schooling: false,
    minimumGroup: 3,
    compatibility: {
      goodWith: ['Platy', 'Molly', 'Swordtail', 'Tetra', 'Corydoras'],
      avoidWith: ['Bettas', 'Large Cichlids', 'Aggressive fish'],
    },
    description: 'سمكة ملونة صغيرة سهلة التربية. مثالية للمبتدئين وتتكاثر بسرعة.',
    careTips: [
      'يتكاثر بسرعة - راقب أعداد الصغار',
      'تحتاج لنباتات كثيفة لحماية الصغار',
      'تفضل المياه الصلبة قليلاً',
      'الذكور أكثر ألواناً من الإناث',
    ],
    image: '/fish/guppy.png',
    category: 'livebearer',
  },
  {
    id: 'angelfish',
    commonName: 'Angelfish',
    arabicName: 'سمكة الملاك',
    scientificName: 'Pterophyllum scalare',
    family: 'Cichlidae',
    origin: 'أمريكا الجنوبية - الأمازون',
    minSize: 15,
    maxSize: 25,
    lifespan: 10,
    temperament: 'semi-aggressive',
    careLevel: 'intermediate',
    minTankSize: 200,
    waterParameters: {
      tempMin: 25,
      tempMax: 28,
      phMin: 6.5,
      phMax: 7.5,
      hardness: 'soft',
    },
    diet: ['Flakes', 'Pellets', 'Bloodworms', 'Brine shrimp', 'Vegetables'],
    breeding: {
      difficulty: 'moderate',
      method: 'egg-layer',
      sexualDimorphism: 'صعب التفريق! عند النضج: الذكور لديهم جبهة منحنية أكثر. الإناث بطن أكبر وأنبوب تناسلي أوضح عند التكاثر.',
      spawningTriggers: [
        'زوج ناضج يربط ببعضه (pair bonding)',
        'تغذية مكثفة بالديدان الحية',
        'تغيير ماء كبير (50%) بماء أبرد قليلاً',
        'إضافة سطح أملس للبيض (ورقة نبات، أنبوب PVC)'
      ],
      breedingSetup: {
        tankSize: '150-200 لتر للتكاثر',
        waterConditions: 'pH 6.5-6.9، ماء ناعم جداً (GH < 5)',
        temperature: '27-28°م',
        equipment: ['سخان', 'فلتر إسفنجي', 'سطح أملس للبيض', 'نباتات كبيرة']
      },
      spawningBehavior: 'الزوج ينظف السطح لمدة يومين. الأنثى تضع 200-400 بيضة في صفوف. الذكر يخصب البيض. كلاهما يحرس ويهوي البيض بزعانفه.',
      eggCare: 'الوالدان يحرسان البيض 60 ساعة. يزيلان البيض الأبيض (الميت). بعد الفقس، ينقلان الصغار بأفواههما لحفرة أخرى. إذا أكلا الصغار، ازرع بيض صناعي مع aerator.',
      fryInfo: {
        firstFood: 'Baby brine shrimp بعد 5 أيام من الفقس',
        growthRate: 'متوسط - يصلون 3-4 سم في 3 أشهر',
        adulthoodTime: '6-8 أشهر للنضج الجنسي'
      },
      tips: [
        'دع الزوج يختار بعضه - لا تجبرهما!',
        'البيض برتقالي/بني صحي، أبيض = ميت أو غير مخصب',
        'معظم الأزواج يأكلون أول 2-3 مرات - هذا طبيعي!',
        'ضع سيراميك أو ورقة Amazon Sword كسطح تبيض',
        'خفف الإضاءة - Angelfish تحب الظلام عند التكاثر',
        'افصلهما في حوض آخر - سيصبحان عدوانيين جداً!'
      ]
    },
    schooling: false,
    minimumGroup: 2,
    compatibility: {
      goodWith: ['Large Tetras', 'Corydoras', 'Pleco', 'Large Rasbora'],
      avoidWith: ['Small fish (will eat them)', 'Fin-nippers', 'Aggressive Cichlids'],
    },
    description: 'سمكة أنيقة ومميزة بشكلها المثلث. تحتاج لحوض عالي وواسع.',
    careTips: [
      'تحتاج لحوض ارتفاعه 50 سم على الأقل',
      'قد تأكل الأسماك الصغيرة',
      'تصبح إقليمية أثناء التكاثر',
      'تحتاج لتغذية متنوعة',
    ],
    image: '/fish/angelfish.png',
    category: 'cichlid',
  },
  {
    id: 'corydoras-paleatus',
    commonName: 'Peppered Corydoras',
    arabicName: 'كوريدوراس مفلفل',
    scientificName: 'Corydoras paleatus',
    family: 'Callichthyidae',
    origin: 'أمريكا الجنوبية',
    minSize: 5,
    maxSize: 7,
    lifespan: 5,
    temperament: 'peaceful',
    careLevel: 'beginner',
    minTankSize: 80,
    waterParameters: {
      tempMin: 20,
      tempMax: 25,
      phMin: 6.5,
      phMax: 7.5,
      hardness: 'medium',
    },
    diet: ['Sinking pellets', 'Wafers', 'Bloodworms', 'Leftover food'],
    breeding: {
      difficulty: 'easy',
      method: 'egg-layer',
      sexualDimorphism: 'الإناث أكبر وأكثر استدارة من الأعلى. الذكور أصغر وأنحف مع زعانف صدرية مدببة أكثر.',
      spawningTriggers: [
        'انخفاض درجة الحرارة 2-3 درجات (محاكاة موسم الأمطار)',
        'تغيير ماء كبير بماء أبرد',
        'تغذية مكثفة بالديدان الحية',
        'نسبة 2 ذكور لكل أنثى'
      ],
      breedingSetup: {
        tankSize: '40-60 لتر',
        waterConditions: 'pH 7.0، ماء نظيف جداً',
        temperature: '22-24°م',
        equipment: ['فلتر إسفنجي', 'نباتات عريضة الأوراق', 'رمل ناعم']
      },
      spawningBehavior: 'الأنثى تجمع الحيوانات المنوية في فمها ثم تضع البيض اللاصق على الزجاج والنباتات. تضع 20-100 بيضة.',
      eggCare: 'البيض يفقس في 3-5 أيام. يمكن نقل البيض لحوض منفصل للحماية من الأكل.',
      fryInfo: {
        firstFood: 'صفار بيض مسلوق مطحون، ثم artemia',
        growthRate: 'متوسط - 1 سم شهرياً',
        adulthoodTime: '8-12 شهر'
      },
      tips: [
        'الماء البارد يحفز التكاثر',
        'البيض لزج جداً ويلتصق بالزجاج',
        'الوالدان قد يأكلان البيض - انقله إذا أمكن',
        'الصغار متينة نسبياً'
      ]
    },
    schooling: true,
    minimumGroup: 6,
    compatibility: {
      goodWith: ['Most peaceful fish', 'Tetra', 'Guppy', 'Angelfish'],
      avoidWith: ['Large aggressive Cichlids'],
    },
    description: 'سمكة قاع نشطة ولطيفة. ممتازة لتنظيف الحوض من بقايا الطعام.',
    careTips: [
      'تعيش في القاع - تحتاج لرمل ناعم',
      'تفضل العيش في مجموعات',
      'نشطة جداً وممتعة للمراقبة',
      'تحتاج لطعام يغرق للقاع',
    ],
    image: '/fish/corydoras-paleatus.png',
    category: 'catfish',
  },
  {
    id: 'goldfish',
    commonName: 'Goldfish',
    arabicName: 'سمكة ذهبية',
    scientificName: 'Carassius auratus',
    family: 'Cyprinidae',
    origin: 'شرق آسيا - الصين',
    minSize: 10,
    maxSize: 30,
    lifespan: 20,
    temperament: 'peaceful',
    careLevel: 'beginner',
    minTankSize: 150,
    waterParameters: {
      tempMin: 18,
      tempMax: 24,
      phMin: 7.0,
      phMax: 8.0,
      hardness: 'medium',
    },
    diet: ['Goldfish pellets', 'Vegetables', 'Bloodworms', 'Algae'],
    breeding: {
      difficulty: 'easy',
      method: 'egg-layer',
      sexualDimorphism: 'الذكور يطورون "درنات التزاوج" (نقاك بيضاء صغيرة) على أغطية الخياشيم والزعانف الصدرية. الإناث تصبح ممتلئة وغير متناظرة من الأعلى.',
      spawningTriggers: [
        'ارتفاع درجة الحرارة تدريجياً (محاكاة الربيع)',
        'تغييرات ماء كبيرة',
        'تغذية عالية البروتين',
        'إطالة فترة الإضاءة'
      ],
      breedingSetup: {
        tankSize: '100+ لتر',
        waterConditions: 'نظيف جداً، pH 7.0-7.5',
        temperature: '20-23°م',
        equipment: ['مماسح تزاوج (Spawning Mops)', 'نباتات كثيفة', 'تهوية جيدة']
      },
      spawningBehavior: 'الذكور يطاردون الإناث ويدفعون بطونهم (المطاردة). تطلق الأنثى البيض ويخصبه الذكر فوراً.',
      eggCare: 'البيض لزج ويلتصق بالنباتات. يفقس في 2-7 أيام حسب الحرارة. يجب إزالة الأبوين أو البيض.',
      fryInfo: {
        firstFood: 'صفار بيض مسلوق، طعام سائل، ارتيميا',
        growthRate: 'سريع مع التغذية الجيدة',
        adulthoodTime: '1 سنة'
      },
      tips: [
        'السمك الذهبي يأكل بيضه بشراهة!',
        'نظافة الماء ضرورية للصغار',
        'الصغار تحتاج مساحة كبيرة للنمو السليم',
        'افحص البيض وأزل الأبيض منه (الفاسد) لتجنب الفطر'
      ]
    },
    schooling: false,
    minimumGroup: 2,
    compatibility: {
      goodWith: ['Other Goldfish', 'White Cloud Mountain Minnow', 'Hillstream Loach'],
      avoidWith: ['Tropical fish', 'Small fish', 'Aggressive fish'],
    },
    description: 'سمكة تقليدية شهيرة. تحتاج لحوض كبير ومياه باردة.',
    careTips: [
      'تنتج فضلات كثيرة - تحتاج لفلتر قوي',
      'تنمو كبيرة جداً - تحتاج لأحواض 200+ لتر',
      'لا تحتاج لسخان (مياه باردة)',
      'تعيش لسنوات طويلة مع العناية الصحيحة',
    ],
    image: '/fish/goldfish.png',
    category: 'goldfish',
  },
  {
    id: 'platy',
    commonName: 'Platy',
    arabicName: 'سمكة البلاتي',
    scientificName: 'Xiphophorus maculatus',
    family: 'Poeciliidae',
    origin: 'أمريكا الوسطى والجنوبية',
    minSize: 4,
    maxSize: 7,
    lifespan: 3,
    temperament: 'peaceful',
    careLevel: 'beginner',
    minTankSize: 40,
    waterParameters: {
      tempMin: 18,
      tempMax: 28,
      phMin: 7.0,
      phMax: 8.3,
      hardness: 'hard',
    },
    diet: ['Flakes', 'Pellets', 'Vegetables', 'Live foods'],
    breeding: {
      difficulty: 'easy',
      method: 'live-bearer',
      sexualDimorphism: 'الذكور أصغر وأكثر ألواناً مع زعانف طويلة. الإناث أكبر حجماً مع بطن منتفخ واضح.',
      spawningTriggers: [
        'درجة حرارة مستقرة 24-26°م',
        'تغذية جيدة بالأطعمة الحية',
        'نسبة 1 ذكر لكل 2-3 إناث',
        'جودة ماء جيدة'
      ],
      breedingSetup: {
        tankSize: '40+ لتر',
        waterConditions: 'pH 7.0-8.0، ماء متوسط إلى صلب',
        temperature: '24-26°م',
        equipment: ['فلتر إسفنجي', 'نباتات كثيفة', 'صندوق ولادة (اختياري)']
      },
      spawningBehavior: 'الذكر يطارد الأنثى. التخصيب داخلي. فترة الحمل 24-30 يوم.',
      eggCare: 'لا توجد بيوض - ولادة مباشرة! الصغار يسبحون فوراً. انقل الصغار أو الأم.',
      fryInfo: {
        firstFood: 'طعام سائل، رقائق مطحونة ناعم، baby brine shrimp',
        growthRate: 'سريع - جاهزون للبيع في 8-10 أسابيع',
        adulthoodTime: '4-5 أشهر'
      },
      tips: [
        'تأكل الصغار - افصلهم فوراً!',
        'نباتات Java Moss تحمي الصغار',
        'تلد 20-40 صغير كل شهر',
        'تتزاوج مع Swordtail - تجنب التهجين إذا أردت سلالات نقية'
      ]
    },
    schooling: false,
    minimumGroup: 3,
    compatibility: {
      goodWith: ['Guppy', 'Molly', 'Swordtail', 'Tetra', 'Corydoras'],
      avoidWith: ['Bettas', 'Large aggressive Cichlids'],
    },
    description: 'سمكة ملونة صلبة وسهلة التربية. متوفرة بألوان عديدة.',
    careTips: [
      'تحب المياه الصلبة قليلاً',
      'تتكاثر بسهولة',
      'ألوان متنوعة (أحمر، أصفر، برتقالي)',
      'نشطة وودودة',
    ],
    image: '/fish/platy.png',
    category: 'livebearer',
  },
  {
    id: 'cardinal-tetra',
    commonName: 'Cardinal Tetra',
    arabicName: 'تترا كاردينال',
    scientificName: 'Paracheirodon axelrodi',
    family: 'Characidae',
    origin: 'أمريكا الجنوبية - الأمازون',
    minSize: 3,
    maxSize: 5,
    lifespan: 5,
    temperament: 'peaceful',
    careLevel: 'beginner',
    minTankSize: 80,
    waterParameters: {
      tempMin: 21,
      tempMax: 28,
      phMin: 5.5,
      phMax: 7.0,
      hardness: 'soft',
    },
    diet: ['Micro pellets', 'Flakes', 'Frozen foods', 'Live foods'],
    breeding: {
      difficulty: 'expert',
      method: 'egg-layer',
      sexualDimorphism: 'الإناث أكثر استدارة وامتلاءً. الذكور أنحف قليلاً.',
      spawningTriggers: [
        'مياه حمضية جداً (pH 5.0-5.5)',
        'ظلام شبه تام',
        'مياه ناعمة جداً (GH < 2)',
        'تغذية بالأطعمة الحية'
      ],
      breedingSetup: {
        tankSize: '20-30 لتر (مظلم تماماً)',
        waterConditions: 'pH 5.0-5.5، GH < 2',
        temperature: '25-26°م',
        equipment: ['ماء مطر أو RO', 'Java Moss', 'تغطية كاملة من الضوء']
      },
      spawningBehavior: 'يتزاوجون في ظلام دامس. ينثران البيض الصغير جداً بين النباتات.',
      eggCare: 'البيض حساس جداً للضوء ويفقس في 24-36 ساعة. الظلام ضروري!',
      fryInfo: {
        firstFood: 'Infusoria وparamecium لمدة أسبوع',
        growthRate: 'بطيء جداً',
        adulthoodTime: '9-12 شهر'
      },
      tips: [
        'صعب جداً في الأحواض المنزلية',
        'يحتاج لماء خاص (RO أو ماء مطر)',
        'الضوء قاتل للبيض والصغار',
        'لا ينصح به للمبتدئين'
      ]
    },
    schooling: true,
    minimumGroup: 10,
    compatibility: {
      goodWith: ['Neon Tetra', 'Harlequin Rasbora', 'Corydoras', 'Discus'],
      avoidWith: ['Large Cichlids', 'Angelfish', 'Aggressive fish'],
    },
    description: 'مشابه للنيون تترا لكن أكثر ألواناً. الخط الأحمر يمتد لكامل الجسم.',
    careTips: [
      'يحتاج لمجموعة كبيرة (10+)',
      'يفضل الماء الناعم والحمضي',
      'جميل جداً في الأحواض المزروعة',
      'حساس لجودة المياه',
    ],
    image: '/fish/cardinal-tetra.png',
    category: 'tetra',
  },
  {
    id: 'molly',
    commonName: 'Molly',
    arabicName: 'سمكة مولي',
    scientificName: 'Poecilia sphenops',
    family: 'Poeciliidae',
    origin: 'أمريكا الوسطى والجنوبية',
    minSize: 6,
    maxSize: 12,
    lifespan: 5,
    temperament: 'peaceful',
    careLevel: 'beginner',
    minTankSize: 80,
    waterParameters: {
      tempMin: 22,
      tempMax: 28,
      phMin: 7.5,
      phMax: 8.5,
      hardness: 'hard',
    },
    diet: ['Algae', 'Vegetables', 'Flakes', 'Live foods'],
    breeding: {
      difficulty: 'easy',
      method: 'live-bearer',
      sexualDimorphism: 'الذكور أصغر مع زعنفة شرجية معدلة (gonopodium). الإناث أكبر وأكثر استدارة.',
      spawningTriggers: [
        'درجة حرارة 26-28°م',
        'إضافة ملح مائي قليل (1 ملعقة/10 لتر)',
        'تغذية بالطحالب والخضروات',
        'نسبة 1 ذكر : 2-3 إناث'
      ],
      breedingSetup: {
        tankSize: '80+ لتر',
        waterConditions: 'pH 7.5-8.5، ماء صلب، ملح اختياري',
        temperature: '26-28°م',
        equipment: ['فلتر قوي', 'نباتات طويلة', 'صندوق ولادة كبير']
      },
      spawningBehavior: 'الذكر يطارد الأنثى بنشاط. التخصيب داخلي. فترة الحمل 60-70 يوم.',
      eggCare: 'ولادة مباشرة - لا بيض! تلد حتى 100 صغير. انقلهم فوراً للحماية.',
      fryInfo: {
        firstFood: 'رقائق مطحونة، spirulina، baby brine shrimp',
        growthRate: 'متوسط - تكبر ببطء لكنها قوية',
        adulthoodTime: '5-6 أشهر'
      },
      tips: [
        'الملح يحسن الصحة لكنه اختياري',
        'تحب أكل الطحالب - مفيدة للحوض',
        'تلد عدد كبير - خطط لمكان الصغار',
        'الأهل يأكلون الصغار بكثرة!'
      ]
    },
    schooling: false,
    minimumGroup: 3,
    compatibility: {
      goodWith: ['Platy', 'Guppy', 'Swordtail', 'Larger Tetras'],
      avoidWith: ['Bettas', 'Aggressive Cichlids', 'Fin-nippers'],
    },
    description: 'سمكة قوية ونشطة. متوفرة بألوان متعددة (أسود، ذهبي، رخامي).',
    careTips: [
      'تحب أكل الطحالب والنباتات',
      'يمكن إضافة ملح مائي قليل',
      'تنمو كبيرة نسبياً',
      'تحتاج لحوض واسع',
    ],
    image: '/fish/molly.png',
    category: 'livebearer',
  },
  {
    id: 'dwarf-gourami',
    commonName: 'Dwarf Gourami',
    arabicName: 'جورامي قزم',
    scientificName: 'Trichogaster lalius',
    family: 'Osphronemidae',
    origin: 'جنوب آسيا - الهند وبنغلاديش',
    minSize: 5,
    maxSize: 9,
    lifespan: 4,
    temperament: 'peaceful',
    careLevel: 'beginner',
    minTankSize: 40,
    waterParameters: {
      tempMin: 22,
      tempMax: 28,
      phMin: 6.0,
      phMax: 8.0,
      hardness: 'soft',
    },
    diet: ['Flakes', 'Pellets', 'Live foods', 'Frozen foods'],
    breeding: {
      difficulty: 'moderate',
      method: 'bubble-nest',
      sexualDimorphism: 'الذكور ألوانهم زاهية جداً (أحمر وأزرق) مع زعانف أطول. الإناث رمادية باهتة وأصغر حجماً.',
      spawningTriggers: [
        'رفع درجة الحرارة إلى 28°م',
        'خفض مستوى الماء إلى 15-20 سم',
        'إضافة نباتات طافية',
        'تغذية مكثفة بالأطعمة الحية'
      ],
      breedingSetup: {
        tankSize: '30-40 لتر',
        waterConditions: 'pH 6.5-7.0، ماء ناعم',
        temperature: '27-28°م',
        equipment: ['نباتات طافية', 'مخبأ للأنثى', 'سخان', 'لا تيار قوي']
      },
      spawningBehavior: 'الذكر يبني عش فقاعات كبير تحت النباتات الطافية. يحضن الأنثى تحت العش ويلتف حولها.',
      eggCare: 'الذكر يحرس العش والبيض. أزل الأنثى بعد وضع البيض. البيض يفقس في 24-48 ساعة.',
      fryInfo: {
        firstFood: 'Infusoria ثم baby brine shrimp',
        growthRate: 'متوسط',
        adulthoodTime: '4-5 أشهر'
      },
      tips: [
        'الذكر يبني عش رائع من الفقاعات',
        'أزل الأنثى فوراً بعد التكاثر',
        'الذكر أب ممتاز - لا تزيله',
        'الصغار صغيرة جداً في البداية'
      ]
    },
    schooling: false,
    minimumGroup: 1,
    compatibility: {
      goodWith: ['Tetra', 'Rasbora', 'Corydoras', 'Peaceful fish'],
      avoidWith: ['Bettas', 'Aggressive fish', 'Large Cichlids'],
    },
    description: 'سمكة جميلة بألوان زاهية. هادئة ومثالية للأحواض المجتمعية.',
    careTips: [
      'يحتاج للتنفس من السطح',
      'ألوان الذكور أجمل من الإناث',
      'خجول في البداية',
      'يفضل النباتات الطافية',
    ],
    image: '/fish/dwarf-gourami.png',
    category: 'gourami',
  },
  {
    id: 'black-skirt-tetra',
    commonName: 'Black Skirt Tetra',
    arabicName: 'تترا التنورة السوداء',
    scientificName: 'Gymnocorymbus ternetzi',
    family: 'Characidae',
    origin: 'أمريكا الجنوبية',
    minSize: 5,
    maxSize: 7,
    lifespan: 5,
    temperament: 'peaceful',
    careLevel: 'beginner',
    minTankSize: 80,
    waterParameters: {
      tempMin: 21,
      tempMax: 29,
      phMin: 6.0,
      phMax: 8.0,
      hardness: 'medium',
    },
    diet: ['Flakes', 'Pellets', 'Live foods', 'Frozen foods'],
    breeding: {
      difficulty: 'moderate',
      method: 'egg-layer',
      sexualDimorphism: 'الإناث أكبر وأكثر استدارة. الذكور أصغر مع زعانف أكثر سواداً.',
      spawningTriggers: [
        'رفع درجة الحرارة تدريجياً',
        'تغذية مكثفة بالأطعمة الحية',
        'تغيير ماء جزئي',
        'إضافة نباتات ناعمة كثيفة'
      ],
      breedingSetup: {
        tankSize: '40-60 لتر',
        waterConditions: 'pH 6.5-7.0، ماء ناعم إلى متوسط',
        temperature: '26-28°م',
        equipment: ['Java Moss كثيف', 'شبكة في القاع', 'إضاءة خافتة']
      },
      spawningBehavior: 'يتزاوجون في الصباح الباكر. ينثران البيض بين النباتات.',
      eggCare: 'أزل الوالدين فوراً - يأكلان البيض! يفقس في 24-36 ساعة.',
      fryInfo: {
        firstFood: 'Infusoria ثم baby brine shrimp',
        growthRate: 'متوسط',
        adulthoodTime: '5-6 أشهر'
      },
      tips: [
        'أزل الوالدين مباشرة بعد وضع البيض',
        'الإضاءة الخافتة تساعد',
        'استخدم شبكة لحماية البيض',
        'الصغار قد تأكل بعضها'
      ]
    },
    schooling: true,
    minimumGroup: 6,
    compatibility: {
      goodWith: ['Tetra', 'Rasbora', 'Corydoras', 'Platy', 'Guppy'],
      avoidWith: ['Long-finned fish (may nip)', 'Very small fish'],
    },
    description: 'سمكة نشطة بلون أسود مميز. سهلة التربية وقوية.',
    careTips: [
      'تحب السباحة في مجموعات',
      'قد تقضم الزعانف الطويلة',
      'نشطة جداً',
      'تحتاج لمساحة سباحة',
    ],
    image: '/fish/black-skirt-tetra.png',
    category: 'tetra',
  },
  {
    id: 'swordtail',
    commonName: 'Swordtail',
    arabicName: 'سمكة السيف',
    scientificName: 'Xiphophorus hellerii',
    family: 'Poeciliidae',
    origin: 'أمريكا الوسطى والجنوبية',
    minSize: 10,
    maxSize: 15,
    lifespan: 5,
    temperament: 'peaceful',
    careLevel: 'beginner',
    minTankSize: 80,
    waterParameters: {
      tempMin: 18,
      tempMax: 28,
      phMin: 7.0,
      phMax: 8.5,
      hardness: 'hard',
    },
    diet: ['Flakes', 'Pellets', 'Vegetables', 'Live foods'],
    breeding: {
      difficulty: 'easy',
      method: 'live-bearer',
      sexualDimorphism: 'الذكور لديهم "سيف" طويل في الذيل و gonopodium. الإناث أكبر بدون سيف.',
      spawningTriggers: [
        'درجة حرارة 24-27°م',
        'تغذية جيدة ومتنوعة',
        'نباتات كثيفة للأمان',
        'نسبة 1 ذكر : 3 إناث (الذكور عدوانيون)'
      ],
      breedingSetup: {
        tankSize: '80+ لتر (حجم مهم)',
        waterConditions: 'pH 7.0-8.0، ماء متوسط إلى صلب',
        temperature: '24-27°م',
        equipment: ['فلتر جيد', 'نباتات طويلة', 'غطاء (يقفزون!)', 'صندوق ولادة']
      },
      spawningBehavior: 'الذكر يطارد الأنثى بعدوانية. التخصيب داخلي. فترة الحمل 28 يوم.',
      eggCare: 'ولادة مباشرة. تلد 20-100 صغير. الوالدان يأكلان الصغار - افصلهم!',
      fryInfo: {
        firstFood: 'رقائق مطحونة، brine shrimp، طعام سائل',
        growthRate: 'سريع - ينمو السيف في 3-4 أشهر',
        adulthoodTime: '4-6 أشهر'
      },
      tips: [
        'السيف يظهر عند النضج فقط',
        'الذكور عدوانيون - 1 ذكر أفضل',
        'يقفزون - غطي الحوض دائماً!',
        'ينتجون عدد كبير - خطط مسبقاً'
      ]
    },
    schooling: false,
    minimumGroup: 2,
    compatibility: {
      goodWith: ['Platy', 'Molly', 'Guppy', 'Tetra', 'Corydoras'],
      avoidWith: ['Bettas', 'Aggressive Cichlids'],
    },
    description: 'سمكة نشطة مميزة بذيل السيف عند الذكور. متوفرة بألوان عديدة.',
    careTips: [
      'ذكور السيف طويلة ومميزة',
      'قد يكون الذكور عدوانيين قليلاً',
      'يحب القفز - غطي الحوض',
      'نشط وسهل التربية',
    ],
    image: '/fish/swordtail.png',
    category: 'livebearer',
  },
  {
    id: 'zebra-danio',
    commonName: 'Zebra Danio',
    arabicName: 'دانيو زيبرا',
    scientificName: 'Danio rerio',
    family: 'Cyprinidae',
    origin: 'جنوب آسيا',
    minSize: 4,
    maxSize: 6,
    lifespan: 5,
    temperament: 'peaceful',
    careLevel: 'beginner',
    minTankSize: 40,
    waterParameters: {
      tempMin: 18,
      tempMax: 26,
      phMin: 6.5,
      phMax: 7.5,
      hardness: 'medium',
    },
    diet: ['Flakes', 'Micro pellets', 'Live foods', 'Frozen foods'],
    breeding: {
      difficulty: 'easy',
      method: 'egg-layer',
      sexualDimorphism: 'الإناث أكبر وأكثر استدارة مع بطن ممتلئ. الذكور أنحف وأكثر لوناً.',
      spawningTriggers: [
        'ضوء الصباح',
        'رفع الحرارة قليلاً',
        'تغذية جيدة',
        'مجموعة من الذكور والإناث'
      ],
      breedingSetup: {
        tankSize: '20-40 لتر',
        waterConditions: 'pH 6.5-7.5، ماء نظيف',
        temperature: '24-26°م',
        equipment: ['شبكة في القاع أو رخام', 'نباتات ناعمة', 'فلتر إسفنجي']
      },
      spawningBehavior: 'يتزاوجون في الصباح الباكر. الذكور يطاردون الإناث وينثرون البيض.',
      eggCare: 'يأكلون البيض! استخدم شبكة أو رخام لحمايته. يفقس في 48-72 ساعة.',
      fryInfo: {
        firstFood: 'Infusoria ثم baby brine shrimp',
        growthRate: 'سريع',
        adulthoodTime: '3-4 أشهر'
      },
      tips: [
        'من أسهل الأسماك للتكاثر',
        'الشبكة أو الرخام يحمي البيض من الأكل',
        'ينتجون كميات كبيرة من البيض',
        'مثالي للمبتدئين في التكاثر'
      ]
    },
    schooling: true,
    minimumGroup: 6,
    compatibility: {
      goodWith: ['Tetra', 'Rasbora', 'Guppy', 'Platy', 'Corydoras'],
      avoidWith: ['Slow-moving fish', 'Long-finned fish'],
    },
    description: 'سمكة صلبة جداً وسريعة. مثالية للمبتدئين ولتدوير الحوض.',
    careTips: [
      'نشطة جداً وسريعة',
      'تحتاج لمساحة سباحة',
      'صلبة وتتحمل ظروف متنوعة',
      'مثالية لبداية الحوض',
    ],
    image: '/fish/zebra-danio.png',
    category: 'other',
  },
  {
    id: 'tiger-barb',
    commonName: 'Tiger Barb',
    arabicName: 'بارب النمر',
    scientificName: 'Puntigrus tetrazona',
    family: 'Cyprinidae',
    origin: 'جنوب شرق آسيا',
    minSize: 5,
    maxSize: 7,
    lifespan: 6,
    temperament: 'semi-aggressive',
    careLevel: 'beginner',
    minTankSize: 80,
    waterParameters: {
      tempMin: 21,
      tempMax: 28,
      phMin: 6.0,
      phMax: 8.0,
      hardness: 'medium',
    },
    diet: ['Flakes', 'Pellets', 'Live foods', 'Vegetables'],
    breeding: {
      difficulty: 'moderate',
      method: 'egg-layer',
      sexualDimorphism: 'الذكور أكثر ألواناً مع زعانف حمراء زاهية. الإناث أكبر وباهتة اللون.',
      spawningTriggers: [
        'رفع الحرارة لـ 27°م',
        'تغذية بالديدان الحية',
        'ضوء الصباح',
        'تغيير ماء كبير'
      ],
      breedingSetup: {
        tankSize: '60-80 لتر',
        waterConditions: 'pH 6.5-7.0، ماء ناعم إلى متوسط',
        temperature: '26-28°م',
        equipment: ['Java Moss كثيف', 'شبكة في القاع', 'فلتر إسفنجي']
      },
      spawningBehavior: 'الذكور يطاردون الإناث بنشاط. ينثرون البيض بين النباتات.',
      eggCare: 'يأكلون البيض بشراهة! أزلهم فوراً. يفقس في 36-48 ساعة.',
      fryInfo: {
        firstFood: 'Infusoria ثم baby brine shrimp',
        growthRate: 'سريع',
        adulthoodTime: '6-8 أشهر للألوان الكاملة'
      },
      tips: [
        'الوالدان يأكلان البيض - احميه!',
        'استخدم مجموعة كبيرة للتكاثر',
        'الألوان تظهر مع النضج',
        'الصغار سريعة النمو'
      ]
    },
    schooling: true,
    minimumGroup: 6,
    compatibility: {
      goodWith: ['Other Barbs', 'Fast swimming fish', 'Large Tetras'],
      avoidWith: ['Bettas', 'Angelfish', 'Gourami', 'Long-finned fish'],
    },
    description: 'سمكة نشطة بألوان جميلة. قد تقضم الزعانف.',
    careTips: [
      'يجب تربيتها في مجموعات كبيرة',
      'قد تقضم الزعانف الطويلة',
      'نشطة جداً',
      'تحتاج لرفقاء سريعين',
    ],
    image: '/fish/tiger-barb.png',
    category: 'other',
  },
  {
    id: 'pearl-gourami',
    commonName: 'Pearl Gourami',
    arabicName: 'جورامي اللؤلؤ',
    scientificName: 'Trichopodus leerii',
    family: 'Osphronemidae',
    origin: 'جنوب شرق آسيا',
    minSize: 10,
    maxSize: 12,
    lifespan: 5,
    temperament: 'peaceful',
    careLevel: 'beginner',
    minTankSize: 100,
    waterParameters: {
      tempMin: 24,
      tempMax: 28,
      phMin: 6.0,
      phMax: 8.0,
      hardness: 'soft',
    },
    diet: ['Flakes', 'Pellets', 'Live foods', 'Vegetables'],
    breeding: {
      difficulty: 'moderate',
      method: 'bubble-nest',
      sexualDimorphism: 'الذكور لديهم صدر برتقالي/أحمر وزعانف ظهرية أطول ومدببة. الإناث أصغر وباهتة.',
      spawningTriggers: [
        'رفع الحرارة لـ 28°م',
        'خفض مستوى الماء',
        'إضافة نباتات طافية',
        'تغذية بالأطعمة الحية'
      ],
      breedingSetup: {
        tankSize: '80-100 لتر',
        waterConditions: 'pH 6.5-7.0، ماء ناعم',
        temperature: '27-28°م',
        equipment: ['نباتات طافية كثيفة', 'مخابئ للأنثى', 'لا تيار']
      },
      spawningBehavior: 'الذكر يبني عش فقاعات كبير. يحضن الأنثى تحت العش في رقصة جميلة.',
      eggCare: 'الذكر يحرس العش. أزل الأنثى بعد وضع البيض. يفقس في 24-48 ساعة.',
      fryInfo: {
        firstFood: 'Infusoria ثم baby brine shrimp',
        growthRate: 'متوسط',
        adulthoodTime: '6-8 أشهر'
      },
      tips: [
        'من أجمل الأسماك في التكاثر',
        'الذكر يبني عش ضخم',
        'أزل الأنثى فوراً بعد التكاثر',
        'الصغار تحتاج طعام صغير جداً'
      ]
    },
    schooling: false,
    minimumGroup: 1,
    compatibility: {
      goodWith: ['Tetra', 'Rasbora', 'Corydoras', 'Peaceful Cichlids'],
      avoidWith: ['Aggressive fish', 'Fin-nippers'],
    },
    description: 'سمكة جميلة بنقاط لؤلؤية لامعة. هادئة ورائعة.',
    careTips: [
      'يحتاج لسطح هادئ للتنفس',
      'جميل جداً عند النضج',
      'خجول قليلاً',
      'يحب النباتات الكثيفة',
    ],
    image: '/fish/pearl-gourami.png',
    category: 'gourami',
  },
  {
    id: 'bristlenose-pleco',
    commonName: 'Bristlenose Pleco',
    arabicName: 'بليكو شوكي الأنف',
    scientificName: 'Ancistrus sp.',
    family: 'Loricariidae',
    origin: 'أمريكا الجنوبية',
    minSize: 10,
    maxSize: 15,
    lifespan: 12,
    temperament: 'peaceful',
    careLevel: 'beginner',
    minTankSize: 100,
    waterParameters: {
      tempMin: 23,
      tempMax: 28,
      phMin: 6.0,
      phMax: 7.8,
      hardness: 'medium',
    },
    diet: ['Algae wafers', 'Vegetables', 'Wood', 'Sinking pellets'],
    breeding: {
      difficulty: 'easy',
      method: 'egg-layer',
      sexualDimorphism: 'الذكور لديهم شوارب (bristles) كبيرة على الأنف والوجه. الإناث شواربها صغيرة أو معدومة.',
      spawningTriggers: [
        'توفير كهف مناسب',
        'تغيير ماء كبير بماء أبرد',
        'تغذية بالخضروات',
        'جودة ماء ممتازة'
      ],
      breedingSetup: {
        tankSize: '80-100 لتر',
        waterConditions: 'pH 6.5-7.5، ماء نظيف',
        temperature: '24-26°م',
        equipment: ['كهوف من الفخار أو PVC', 'خشب طافي', 'فلتر جيد']
      },
      spawningBehavior: 'الذكر يجذب الأنثى للكهف. تضع البيض داخله ويحرسه الذكر.',
      eggCare: 'الذكر يحرس البيض ويهويه بزعانفه. لا تزله! يفقس في 4-10 أيام.',
      fryInfo: {
        firstFood: 'طحالب، خضروات مسلوقة، wafers مطحون',
        growthRate: 'بطيء',
        adulthoodTime: '12-18 شهر'
      },
      tips: [
        'الذكر أب ممتاز - لا تزعجه',
        'الكهف هو المفتاح للتكاثر',
        'الصغار تأكل الطحالب فوراً',
        'سهل نسبياً للمبتدئين'
      ]
    },
    schooling: false,
    minimumGroup: 1,
    compatibility: {
      goodWith: ['Most peaceful and semi-aggressive fish'],
      avoidWith: ['Very aggressive Cichlids'],
    },
    description: 'سمكة ممتازة لأكل الطحالب. لها شوارب مميزة.',
    careTips: [
      'يحتاج لخشب في الحوض',
      'ليلي النشاط',
      'يحتاج لكهوف ومخابئ',
      'ممتاز لتنظيف الطحالب',
    ],
    image: '/fish/bristlenose-pleco.png',
    category: 'catfish',
  },
  {
    id: 'kuhli-loach',
    commonName: 'Kuhli Loach',
    arabicName: 'كولي لوتش / ثعبان الكولي',
    scientificName: 'Pangio kuhlii',
    family: 'Cobitidae',
    origin: 'جنوب شرق آسيا',
    minSize: 8,
    maxSize: 12,
    lifespan: 10,
    temperament: 'peaceful',
    careLevel: 'beginner',
    minTankSize: 80,
    waterParameters: {
      tempMin: 23,
      tempMax: 29,
      phMin: 5.5,
      phMax: 7.5,
      hardness: 'soft',
    },
    diet: ['Sinking pellets', 'Bloodworms', 'Brine shrimp', 'Leftover food'],
    breeding: {
      difficulty: 'expert',
      method: 'egg-layer',
      sexualDimorphism: 'صعب جداً التفريق. الإناث الناضجة أكثر امتلاءً قليلاً.',
      spawningTriggers: [
        'مجموعة كبيرة (10+)',
        'مياه ناعمة جداً',
        'انخفاض الضغط الجوي (عواصف)',
        'نباتات طافية كثيفة'
      ],
      breedingSetup: {
        tankSize: '80-100 لتر',
        waterConditions: 'pH 6.0-6.5، ماء ناعم جداً',
        temperature: '26-28°م',
        equipment: ['رمل ناعم', 'نباتات طافية', 'مخابئ كثيرة']
      },
      spawningBehavior: 'يتزاوجون عند السطح بين النباتات الطافية. ينثرون بيض أخضر لامع.',
      eggCare: 'البيض يطفو بين النباتات. يفقس في 24 ساعة. نادر الحدوث في الأسر.',
      fryInfo: {
        firstFood: 'Infusoria صغير جداً',
        growthRate: 'بطيء جداً',
        adulthoodTime: '18-24 شهر'
      },
      tips: [
        'نادر جداً في الأحواض المنزلية',
        'يحتاج لظروف مثالية',
        'معظم الكولي لوتش تأتي من الطبيعة',
        'لا تحاول إلا إذا كنت خبيراً'
      ]
    },
    schooling: true,
    minimumGroup: 5,
    compatibility: {
      goodWith: ['Peaceful fish', 'Tetra', 'Rasbora', 'Guppy'],
      avoidWith: ['Large aggressive fish'],
    },
    description: 'سمكة قاع طويلة كالثعبان. خجولة وليلية.',
    careTips: [
      'يحتاج لرمل ناعم',
      'خجول - نشط ليلاً',
      'يحب الاختباء',
      'ممتع للمراقبة',
    ],
    image: '/fish/kuhli-loach.png',
    category: 'other',
  },
  {
    id: 'harlequin-rasbora',
    commonName: 'Harlequin Rasbora',
    arabicName: 'رازبورا هارليكوين',
    scientificName: 'Trigonostigma heteromorpha',
    family: 'Cyprinidae',
    origin: 'جنوب شرق آسيا',
    minSize: 4,
    maxSize: 5,
    lifespan: 6,
    temperament: 'peaceful',
    careLevel: 'beginner',
    minTankSize: 40,
    waterParameters: {
      tempMin: 23,
      tempMax: 28,
      phMin: 6.0,
      phMax: 7.5,
      hardness: 'soft',
    },
    diet: ['Flakes', 'Micro pellets', 'Live foods', 'Frozen foods'],
    breeding: {
      difficulty: 'moderate',
      method: 'egg-layer',
      sexualDimorphism: 'الإناث أكبر وأكثر استدارة. الذكور العلامة السوداء أكثر حدة وامتداداً.',
      spawningTriggers: [
        'مياه ناعمة وحمضية',
        'نباتات عريضة الأوراق (Cryptocoryne)',
        'تغذية بالأطعمة الحية',
        'ضوء الصباح الخافت'
      ],
      breedingSetup: {
        tankSize: '30-40 لتر',
        waterConditions: 'pH 5.5-6.5، ماء ناعم (GH < 4)',
        temperature: '26-28°م',
        equipment: ['نباتات عريضة الأوراق', 'إضاءة خافتة', 'فلتر إسفنجي']
      },
      spawningBehavior: 'الزوج يسبح مقلوباً تحت ورقة ويلصقان البيض على الجانب السفلي.',
      eggCare: 'أزل الوالدين. البيض يفقس في 24-28 ساعة.',
      fryInfo: {
        firstFood: 'Infusoria ثم baby brine shrimp',
        growthRate: 'متوسط',
        adulthoodTime: '6-8 أشهر'
      },
      tips: [
        'يضعون البيض تحت الأوراق - فريد!',
        'الماء الناعم ضروري',
        'الأوراق العريضة مهمة جداً',
        'متوسط الصعوبة للهواة'
      ]
    },
    schooling: true,
    minimumGroup: 8,
    compatibility: {
      goodWith: ['Tetra', 'Corydoras', 'Dwarf Gourami', 'Small peaceful fish'],
      avoidWith: ['Large aggressive fish'],
    },
    description: 'سمكة جميلة بعلامة برتقالية مثلثة. مثالية للأحواض المزروعة.',
    careTips: [
      'تحب المياه الناعمة',
      'تحتاج لمجموعة كبيرة',
      'نشطة في النهار',
      'جميلة في الأحواض المزروعة',
    ],
    image: '/fish/harlequin-rasbora.png',
    category: 'other',
  },
  {
    id: 'cherry-barb',
    commonName: 'Cherry Barb',
    arabicName: 'بارب الكرز',
    scientificName: 'Puntius titteya',
    family: 'Cyprinidae',
    origin: 'سري لانكا',
    minSize: 4,
    maxSize: 5,
    lifespan: 6,
    temperament: 'peaceful',
    careLevel: 'beginner',
    minTankSize: 80,
    waterParameters: {
      tempMin: 23,
      tempMax: 27,
      phMin: 6.0,
      phMax: 7.5,
      hardness: 'soft',
    },
    diet: ['Flakes', 'Pellets', 'Live foods', 'Vegetables'],
    breeding: {
      difficulty: 'easy',
      method: 'egg-layer',
      sexualDimorphism: 'الذكور حمراء زاهية جداً خاصة عند التكاثر. الإناث أكبر وذهبية/بنية.',
      spawningTriggers: [
        'ضوء الصباح',
        'تغذية بالأطعمة الحية',
        'رفع الحرارة قليلاً',
        'نباتات ناعمة كثيفة'
      ],
      breedingSetup: {
        tankSize: '40-60 لتر',
        waterConditions: 'pH 6.0-7.0، ماء ناعم',
        temperature: '25-27°م',
        equipment: ['Java Moss كثيف', 'نباتات ناعمة', 'فلتر إسفنجي']
      },
      spawningBehavior: 'الذكر يطارد الأنثى ويلتف حولها. ينثران البيض بين النباتات.',
      eggCare: 'أزل الوالدين - يأكلان البيض. يفقس في 24-48 ساعة.',
      fryInfo: {
        firstFood: 'Infusoria ثم baby brine shrimp',
        growthRate: 'متوسط',
        adulthoodTime: '6-8 أشهر للألوان الكاملة'
      },
      tips: [
        'من أسهل أسماك البارب للتكاثر',
        'الذكور تصبح حمراء جداً',
        'النباتات الكثيفة ضرورية',
        'مناسب للمبتدئين'
      ]
    },
    schooling: true,
    minimumGroup: 6,
    compatibility: {
      goodWith: ['Tetra', 'Rasbora', 'Corydoras', 'Dwarf Gourami', 'Platy'],
      avoidWith: ['Large aggressive fish', 'Very small fish'],
    },
    description: 'سمكة صغيرة جميلة. الذكور حمراء زاهية.',
    careTips: [
      'الذكور أكثر احمراراً',
      'هادئة ومسالمة',
      'تحب النباتات الكثيفة',
      'سهلة التربية',
    ],
    image: '/fish/cherry-barb.png',
    category: 'other',
  },
  {
    id: 'german-blue-ram',
    commonName: 'German Blue Ram',
    arabicName: 'رام أزرق ألماني',
    scientificName: 'Mikrogeophagus ramirezi',
    family: 'Cichlidae',
    origin: 'أمريكا الجنوبية',
    minSize: 5,
    maxSize: 7,
    lifespan: 3,
    temperament: 'peaceful',
    careLevel: 'intermediate',
    minTankSize: 80,
    waterParameters: {
      tempMin: 26,
      tempMax: 30,
      phMin: 6.0,
      phMax: 7.5,
      hardness: 'soft',
    },
    diet: ['Pellets', 'Flakes', 'Live foods', 'Frozen foods'],
    breeding: {
      difficulty: 'moderate',
      method: 'egg-layer',
      sexualDimorphism: 'الذكور أكبر مع زعانف ممتدة وألوان أزهى. الإناث بطن وردي/أحمر.',
      spawningTriggers: [
        'درجة حرارة عالية (28-30°م)',
        'مياه ناعمة وحمضية',
        'سطح مستوٍ للبيض',
        'تغذية بالأطعمة الحية'
      ],
      breedingSetup: {
        tankSize: '40-60 لتر',
        waterConditions: 'pH 5.5-6.5، ماء ناعم جداً',
        temperature: '28-30°م',
        equipment: ['صخرة مسطحة أو ورقة', 'فلتر إسفنجي', 'سخان موثوق']
      },
      spawningBehavior: 'الزوج ينظف سطحاً مستوياً. تضع الأنثى البيض ويخصبه الذكر. كلاهما يحرس.',
      eggCare: 'الوالدان يحرسان البيض ويهويانه. يفقس في 48-72 ساعة.',
      fryInfo: {
        firstFood: 'Baby brine shrimp',
        growthRate: 'بطيء',
        adulthoodTime: '4-6 أشهر'
      },
      tips: [
        'الحرارة العالية ضرورية',
        'جودة الماء يجب أن تكون مثالية',
        'الوالدان قد يأكلان الصغار أول مرة',
        'حساسون - للهواة المتوسطين'
      ]
    },
    schooling: false,
    minimumGroup: 2,
    compatibility: {
      goodWith: ['Tetra', 'Corydoras', 'Peaceful fish'],
      avoidWith: ['Aggressive fish', 'Large Cichlids'],
    },
    description: 'سيكلد قزم جميل جداً بألوان زرقاء وصفراء. حساس قليلاً.',
    careTips: [
      'يحتاج لمياه دافئة',
      'حساس لجودة المياه',
      'جميل جداً',
      'يحتاج لرفاق هادئين',
    ],
    image: '/fish/german-blue-ram.png',
    category: 'cichlid',
  },
  {
    id: 'otocinclus',
    commonName: 'Otocinclus Catfish',
    arabicName: 'أوتوسينكلوس / سمكة التنظيف القزمة',
    scientificName: 'Otocinclus sp.',
    family: 'Loricariidae',
    origin: 'أمريكا الجنوبية',
    minSize: 3,
    maxSize: 5,
    lifespan: 5,
    temperament: 'peaceful',
    careLevel: 'intermediate',
    minTankSize: 40,
    waterParameters: {
      tempMin: 22,
      tempMax: 26,
      phMin: 6.0,
      phMax: 7.5,
      hardness: 'soft',
    },
    diet: ['Algae', 'Algae wafers', 'Vegetables', 'Biofilm'],
    breeding: {
      difficulty: 'difficult',
      method: 'egg-layer',
      sexualDimorphism: 'صعب التفريق. الإناث أكبر وأكثر استدارة من الأعلى.',
      spawningTriggers: [
        'تغيير ماء كبير بماء أبرد',
        'مياه ناعمة ونظيفة',
        'وفرة الطحالب والبيوفيلم',
        'مجموعة كبيرة (6+)'
      ],
      breedingSetup: {
        tankSize: '40-60 لتر ناضج',
        waterConditions: 'pH 6.5-7.0، ماء ناعم، نظيف جداً',
        temperature: '24-26°م',
        equipment: ['حوض ناضج مع طحالب', 'نباتات كثيفة', 'فلتر إسفنجي']
      },
      spawningBehavior: 'يضعون البيض الصغير على الزجاج والنباتات. عادة في الصباح.',
      eggCare: 'البيض يفقس في 48-72 ساعة. لا يأكلون البيض عادة.',
      fryInfo: {
        firstFood: 'طحالب، بيوفيلم، spirulina مطحون',
        growthRate: 'بطيء',
        adulthoodTime: '8-12 شهر'
      },
      tips: [
        'يحتاجون حوض ناضج بطحالب',
        'صعب في الأحواض الجديدة',
        'الماء النظيف ضروري',
        'ليس للمبتدئين'
      ]
    },
    schooling: true,
    minimumGroup: 6,
    compatibility: {
      goodWith: ['Shrimp', 'Small peaceful fish', 'Tetra'],
      avoidWith: ['Large aggressive fish'],
    },
    description: 'سمكة صغيرة ممتازة لأكل الطحالب. لطيفة ونشطة.',
    careTips: [
      'يحتاج لحوض مستقر وناضج',
      'ممتاز لأكل الطحالب الخضراء',
      'حساس قليلاً',
      'يحب المجموعات',
    ],
    image: '/fish/otocinclus.png',
    category: 'catfish',
  },
  {
    id: 'discus',
    commonName: 'Discus',
    arabicName: 'سمكة الديسكس',
    scientificName: 'Symphysodon spp.',
    family: 'Cichlidae',
    origin: 'أمريكا الجنوبية - الأمازون',
    minSize: 15,
    maxSize: 25,
    lifespan: 10,
    temperament: 'peaceful',
    careLevel: 'advanced',
    minTankSize: 200,
    waterParameters: {
      tempMin: 28,
      tempMax: 31,
      phMin: 6.0,
      phMax: 7.6,
      hardness: 'soft',
    },
    diet: ['Special discus food', 'Bloodworms', 'Beef heart', 'Vegetables'],
    breeding: {
      difficulty: 'expert',
      method: 'egg-layer',
      sexualDimorphism: 'صعب جداً التفريق. الخبراء يلاحظون فروقات طفيفة في شكل الرأس والأنبوب التناسلي.',
      spawningTriggers: [
        'زوج مترابط (pair bonding)',
        'مياه ناعمة جداً وحمضية',
        'درجة حرارة عالية (30°م)',
        'هدوء وخصوصية'
      ],
      breedingSetup: {
        tankSize: '150-200 لتر',
        waterConditions: 'pH 5.5-6.5، GH < 3، ماء نقي جداً',
        temperature: '29-31°م',
        equipment: ['مخروط تكاثر أو سطح عمودي', 'فلتر إسفنجي', 'إضاءة خافتة']
      },
      spawningBehavior: 'الزوج ينظف سطحاً عمودياً. تضع الأنثى البيض ويخصبه الذكر. كلاهما يعتني.',
      eggCare: 'الوالدان يحرسان البيض. يفقس في 48-60 ساعة. الصغار تتغذى من جلد الوالدين!',
      fryInfo: {
        firstFood: 'مخاط جلد الوالدين (فريد!) ثم baby brine shrimp',
        growthRate: 'بطيء',
        adulthoodTime: '12-18 شهر'
      },
      tips: [
        'الصغار تتغذى من جلد الوالدين - لا تفصلهم!',
        'يحتاج لخبرة عالية',
        'جودة الماء حرجة جداً',
        'للخبراء فقط'
      ]
    },
    schooling: false,
    minimumGroup: 5,
    compatibility: {
      goodWith: ['Cardinal Tetra', 'Corydoras', 'German Blue Ram'],
      avoidWith: ['Aggressive fish', 'Fast eaters', 'Cold water fish'],
    },
    description: 'ملك أحواض المياه العذبة. جميل جداً لكن يحتاج لعناية خاصة.',
    careTips: [
      'يحتاج لماء عالي الجودة',
      'درجة حرارة عالية 28-31°',
      'غالي الثمن',
      'للهواة المتقدمين فقط',
    ],
    image: '/fish/discus.png',
    category: 'cichlid',
  },
  {
    id: 'rummy-nose-tetra',
    commonName: 'Rummy Nose Tetra',
    arabicName: 'تترا الأنف الأحمر',
    scientificName: 'Hemigrammus rhodostomus',
    family: 'Characidae',
    origin: 'أمريكا الجنوبية - الأمازون',
    minSize: 4,
    maxSize: 5,
    lifespan: 8,
    temperament: 'peaceful',
    careLevel: 'intermediate',
    minTankSize: 80,
    waterParameters: {
      tempMin: 24,
      tempMax: 29,
      phMin: 5.5,
      phMax: 7.0,
      hardness: 'soft',
    },
    diet: ['Flakes', 'Micro pellets', 'Frozen bloodworms', 'Brine shrimp'],
    breeding: {
      difficulty: 'difficult',
      method: 'egg-layer',
      sexualDimorphism: 'الإناث أكثر استدارة وامتلاءً. الذكور أنحف قليلاً ولونهم الأحمر أكثر كثافة.',
      spawningTriggers: [
        'مياه ناعمة جداً وحمضية (pH 5.5-6.0)',
        'تغذية مكثفة بالأطعمة الحية',
        'تغيير ماء كبير بماء أبرد',
        'ظلام شبه تام'
      ],
      breedingSetup: {
        tankSize: '30-40 لتر (منفصل، مظلم)',
        waterConditions: 'pH 5.5-6.0، ماء ناعم جداً (GH < 4)',
        temperature: '26-28°م',
        equipment: ['Java Moss كثيف', 'فلتر إسفنجي', 'تغطية للحوض من الضوء']
      },
      spawningBehavior: 'يتزاوجون في الصباح الباكر في ظلام. ينثران البيض بين النباتات الناعمة.',
      eggCare: 'البيض حساس للضوء جداً. يفقس في 24-36 ساعة. أزل الوالدين فوراً.',
      fryInfo: {
        firstFood: 'Infusoria ثم baby brine shrimp',
        growthRate: 'بطيء',
        adulthoodTime: '6-8 أشهر'
      },
      tips: [
        'صعب جداً - للخبراء فقط',
        'الظلام والماء الناعم ضروريان',
        'اللون الأحمر مؤشر على الصحة',
        'جودة الماء حرجة'
      ]
    },
    schooling: true,
    minimumGroup: 10,
    compatibility: {
      goodWith: ['Cardinal Tetra', 'Neon Tetra', 'Corydoras', 'Discus'],
      avoidWith: ['Large Cichlids', 'Aggressive fish'],
    },
    description: 'سمكة جميلة تتميز برأس أحمر لامع. مؤشر ممتاز على جودة المياه - اللون يبهت عند التوتر.',
    careTips: [
      'اللون الأحمر مؤشر على صحة الماء',
      'تحتاج لمجموعة كبيرة (10+)',
      'حساسة لتغيرات المياه',
      'تسبح في تناسق جميل',
    ],
    image: '/fish/rummy-nose-tetra.png',
    category: 'tetra',
  },
  {
    id: 'congo-tetra',
    commonName: 'Congo Tetra',
    arabicName: 'تترا الكونغو',
    scientificName: 'Phenacogrammus interruptus',
    family: 'Alestiidae',
    origin: 'أفريقيا - حوض نهر الكونغو',
    minSize: 6,
    maxSize: 8,
    lifespan: 5,
    temperament: 'peaceful',
    careLevel: 'beginner',
    minTankSize: 120,
    waterParameters: {
      tempMin: 23,
      tempMax: 28,
      phMin: 6.0,
      phMax: 7.5,
      hardness: 'soft',
    },
    diet: ['Flakes', 'Pellets', 'Live foods', 'Frozen foods'],
    breeding: {
      difficulty: 'moderate',
      method: 'egg-layer',
      sexualDimorphism: 'الذكور أكبر مع زعانف ظهرية ممتدة وألوان أكثر كثافة. الإناث أصغر وباهتة.',
      spawningTriggers: [
        'رفع درجة الحرارة تدريجياً',
        'تغذية مكثفة بالأطعمة الحية',
        'إضاءة صباحية',
        'نباتات ناعمة كثيفة'
      ],
      breedingSetup: {
        tankSize: '80-100 لتر',
        waterConditions: 'pH 6.0-6.5، ماء ناعم',
        temperature: '26-28°م',
        equipment: ['Java Moss كثيف', 'فلتر إسفنجي', 'إضاءة خافتة']
      },
      spawningBehavior: 'الذكور يعرضون زعانفهم ويطاردون الإناث. ينثرون البيض بين النباتات.',
      eggCare: 'البيض يفقس في 6 أيام. أزل الوالدين لحماية البيض.',
      fryInfo: {
        firstFood: 'Infusoria ثم baby brine shrimp',
        growthRate: 'متوسط',
        adulthoodTime: '4-6 أشهر'
      },
      tips: [
        'الذكور ألوانهم أجمل مع النضج',
        'النباتات الناعمة ضرورية للبيض',
        'حوض كبير يحفز التكاثر',
        'اليرقات تحتاج طعام صغير جداً'
      ]
    },
    schooling: true,
    minimumGroup: 6,
    compatibility: {
      goodWith: ['Tetra', 'Rainbowfish', 'Corydoras', 'Peaceful Cichlids'],
      avoidWith: ['Fin-nippers', 'Very small fish'],
    },
    description: 'سمكة أفريقية كبيرة بألوان قوس قزح متلألئة. الذكور لديهم زعانف طويلة جميلة.',
    careTips: [
      'تحتاج لحوض واسع',
      'الذكور ألوانهم أجمل',
      'سباحة نشطة',
      'تحب الإضاءة الخافتة',
    ],
    image: '/fish/congo-tetra.png',
    category: 'tetra',
  },
  {
    id: 'endlers-livebearer',
    commonName: "Endler's Livebearer",
    arabicName: 'إندلر',
    scientificName: 'Poecilia wingei',
    family: 'Poeciliidae',
    origin: 'فنزويلا',
    minSize: 2,
    maxSize: 3.5,
    lifespan: 3,
    temperament: 'peaceful',
    careLevel: 'beginner',
    minTankSize: 20,
    waterParameters: {
      tempMin: 22,
      tempMax: 28,
      phMin: 7.0,
      phMax: 8.5,
      hardness: 'hard',
    },
    diet: ['Flakes', 'Micro pellets', 'Live foods', 'Algae'],
    breeding: {
      difficulty: 'easy',
      method: 'live-bearer',
      sexualDimorphism: 'الذكور صغيرة جداً وملونة بشكل مذهل مع gonopodium. الإناث أكبر وباهتة.',
      spawningTriggers: [
        'درجة حرارة 25-27°م',
        'تغذية جيدة',
        'نسبة 1 ذكر لكل 2-3 إناث'
      ],
      breedingSetup: {
        tankSize: '20+ لتر',
        waterConditions: 'pH 7.0-8.0، ماء متوسط الصلابة',
        temperature: '25-27°م',
        equipment: ['نباتات كثيفة للصغار', 'فلتر إسفنجي']
      },
      spawningBehavior: 'التخصيب داخلي. الذكر يطارد الأنثى. فترة الحمل 21-28 يوم.',
      eggCare: 'ولادة مباشرة! الصغار يسبحون فوراً ويحتاجون للاختباء.',
      fryInfo: {
        firstFood: 'طعام سائل، رقائق مطحونة، baby brine shrimp',
        growthRate: 'سريع جداً',
        adulthoodTime: '2-3 أشهر'
      },
      tips: [
        'أسهل من Guppy للتكاثر',
        'لا تخلط مع Guppy للحفاظ على السلالة',
        'النباتات تحمي الصغار من الأكل',
        'تلد 5-25 صغير كل 3-4 أسابيع'
      ]
    },
    schooling: false,
    minimumGroup: 3,
    compatibility: {
      goodWith: ['Shrimp', 'Corydoras', 'Small Tetras', 'Otocinclus'],
      avoidWith: ['Large fish', 'Guppies (hybridize)'],
    },
    description: 'قريب للجوبي لكن أصغر وألوانه أكثر كثافة. مثالي للأحواض النانو.',
    careTips: [
      'لا تخلط مع Guppy للحفاظ على السلالة',
      'يتكاثر بسرعة كبيرة',
      'مثالي للأحواض الصغيرة',
      'ألوان الذكور مذهلة',
    ],
    image: '/fish/endlers-livebearer.png',
    category: 'livebearer',
  },
  {
    id: 'honey-gourami',
    commonName: 'Honey Gourami',
    arabicName: 'جورامي العسل',
    scientificName: 'Trichogaster chuna',
    family: 'Osphronemidae',
    origin: 'جنوب آسيا - الهند وبنغلاديش',
    minSize: 4,
    maxSize: 6,
    lifespan: 5,
    temperament: 'peaceful',
    careLevel: 'beginner',
    minTankSize: 40,
    waterParameters: {
      tempMin: 22,
      tempMax: 28,
      phMin: 6.0,
      phMax: 7.5,
      hardness: 'soft',
    },
    diet: ['Flakes', 'Pellets', 'Live foods', 'Frozen foods'],
    breeding: {
      difficulty: 'moderate',
      method: 'bubble-nest',
      sexualDimorphism: 'الذكور لونهم عسلي ذهبي زاهي مع زعنفة ظهرية مدببة. الإناث باهتة وأصغر.',
      spawningTriggers: [
        'رفع درجة الحرارة إلى 27-28°م',
        'خفض مستوى الماء إلى 15-20 سم',
        'إضافة نباتات طافية',
        'تغذية بالأطعمة الحية'
      ],
      breedingSetup: {
        tankSize: '30-40 لتر',
        waterConditions: 'pH 6.5-7.0، ماء ناعم',
        temperature: '27-28°م',
        equipment: ['نباتات طافية', 'لا تيار قوي', 'مخبأ للأنثى']
      },
      spawningBehavior: 'الذكر يبني عش فقاعات صغير تحت النباتات. يلتف حول الأنثى ويضغط لإخراج البيض.',
      eggCare: 'الذكر يحرس العش والبيض. أزل الأنثى بعد وضع البيض. يفقس في 24-36 ساعة.',
      fryInfo: {
        firstFood: 'Infusoria ثم baby brine shrimp',
        growthRate: 'متوسط',
        adulthoodTime: '4-5 أشهر'
      },
      tips: [
        'الذكر يصبح برتقالي لامع عند التكاثر',
        'أزل الأنثى بعد وضع البيض',
        'الذكر أب ممتاز',
        'أكثر صحة من Dwarf Gourami'
      ]
    },
    schooling: false,
    minimumGroup: 1,
    compatibility: {
      goodWith: ['Tetra', 'Rasbora', 'Corydoras', 'Small peaceful fish'],
      avoidWith: ['Aggressive fish', 'Large Cichlids'],
    },
    description: 'سمكة هادئة بلون عسلي ذهبي. أكثر خجلاً من Dwarf Gourami.',
    careTips: [
      'خجول جداً - يحتاج لمخابئ',
      'يحب النباتات الكثيفة',
      'أكثر صحة من Dwarf Gourami',
      'لون الذكر يصبح برتقالي عند التكاثر',
    ],
    image: '/fish/honey-gourami.png',
    category: 'gourami',
  },
  {
    id: 'white-cloud-mountain-minnow',
    commonName: 'White Cloud Mountain Minnow',
    arabicName: 'مينو السحابة البيضاء',
    scientificName: 'Tanichthys albonubes',
    family: 'Cyprinidae',
    origin: 'الصين',
    minSize: 3,
    maxSize: 4,
    lifespan: 5,
    temperament: 'peaceful',
    careLevel: 'beginner',
    minTankSize: 40,
    waterParameters: {
      tempMin: 15,
      tempMax: 22,
      phMin: 6.0,
      phMax: 8.0,
      hardness: 'medium',
    },
    diet: ['Flakes', 'Micro pellets', 'Live foods'],
    breeding: {
      difficulty: 'easy',
      method: 'egg-layer',
      sexualDimorphism: 'الذكور أنحف وأكثر ألواناً. الإناث أكبر وأكثر استدارة.',
      spawningTriggers: [
        'رفع درجة الحرارة تدريجياً',
        'ضوء الصباح',
        'تغذية جيدة',
        'نباتات ناعمة'
      ],
      breedingSetup: {
        tankSize: '30-40 لتر',
        waterConditions: 'pH 6.5-7.5، ماء متوسط',
        temperature: '18-22°م',
        equipment: ['Java Moss كثيف', 'فلتر إسفنجي']
      },
      spawningBehavior: 'الذكور يطاردون الإناث. تنثر البيض بين النباتات.',
      eggCare: 'البيض يفقس في 36-48 ساعة. الوالدان لا يأكلان البيض عادة.',
      fryInfo: {
        firstFood: 'Infusoria ثم baby brine shrimp',
        growthRate: 'متوسط',
        adulthoodTime: '4-6 أشهر'
      },
      tips: [
        'من أسهل الأسماك للتكاثر',
        'لا تحتاج لسخان',
        'مثالية للمبتدئين',
        'تتكاثر في الحوض المجتمعي'
      ]
    },
    schooling: true,
    minimumGroup: 6,
    compatibility: {
      goodWith: ['Other cold water fish', 'Hillstream Loach', 'Goldfish (small)'],
      avoidWith: ['Tropical fish', 'Large aggressive fish'],
    },
    description: 'سمكة مياه باردة جميلة. مثالية للأحواض بدون سخان.',
    careTips: [
      'لا تحتاج لسخان - مياه باردة',
      'تتحمل درجات حرارة منخفضة',
      'صلبة جداً للمبتدئين',
      'ألوانها أجمل في الماء البارد',
    ],
    image: '/fish/white-cloud-mountain-minnow.png',
    category: 'other',
  },
  {
    id: 'celestial-pearl-danio',
    commonName: 'Celestial Pearl Danio',
    arabicName: 'دانيو اللؤلؤ السماوي / جالاكسي رازبورا',
    scientificName: 'Danio margaritatus',
    family: 'Cyprinidae',
    origin: 'ميانمار',
    minSize: 1.5,
    maxSize: 2.5,
    lifespan: 5,
    temperament: 'peaceful',
    careLevel: 'intermediate',
    minTankSize: 40,
    waterParameters: {
      tempMin: 22,
      tempMax: 26,
      phMin: 6.5,
      phMax: 7.5,
      hardness: 'medium',
    },
    diet: ['Micro pellets', 'Crushed flakes', 'Baby brine shrimp', 'Daphnia'],
    breeding: {
      difficulty: 'easy',
      method: 'egg-layer',
      sexualDimorphism: 'الذكور أكثر ألواناً مع زعانف برتقالية/حمراء. الإناث باهتة.',
      spawningTriggers: [
        'نباتات كثيفة (Java Moss)',
        'تغذية بالأطعمة الحية',
        'ضوء الصباح'
      ],
      breedingSetup: {
        tankSize: '30-40 لتر',
        waterConditions: 'pH 6.5-7.5، ماء متوسط',
        temperature: '22-24°م',
        equipment: ['Java Moss كثيف', 'فلتر إسفنجي', 'إضاءة خافتة']
      },
      spawningBehavior: 'الذكور يطاردون الإناث. تضع بيض صغير بين النباتات.',
      eggCare: 'البيض يفقس في 3-4 أيام. الوالدان لا يأكلان البيض عادة.',
      fryInfo: {
        firstFood: 'Infusoria ثم طعام سائل للصغار',
        growthRate: 'بطيء',
        adulthoodTime: '4-6 أشهر'
      },
      tips: [
        'سهل التكاثر في الأحواض المزروعة',
        'الصغار صغيرة جداً',
        'الJava Moss ضروري',
        'تتكاثر باستمرار في الحوض المزروع'
      ]
    },
    schooling: true,
    minimumGroup: 8,
    compatibility: {
      goodWith: ['Small Rasbora', 'Shrimp', 'Otocinclus', 'Small Tetras'],
      avoidWith: ['Large or aggressive fish'],
    },
    description: 'سمكة صغيرة مذهلة بنقاط لؤلؤية كالنجوم. مثالية للأحواض المزروعة النانو.',
    careTips: [
      'صغيرة جداً - تحتاج لطعام صغير',
      'جميلة في الأحواض المزروعة',
      'خجولة قليلاً',
      'تحب الحرارة المعتدلة',
    ],
    image: '/fish/celestial-pearl-danio.png',
    category: 'other',
  },
  {
    id: 'boesemani-rainbow',
    commonName: 'Boesemani Rainbow',
    arabicName: 'رينبو بوسماني',
    scientificName: 'Melanotaenia boesemani',
    family: 'Melanotaeniidae',
    origin: 'إندونيسيا - بابوا غينيا الجديدة',
    minSize: 8,
    maxSize: 12,
    lifespan: 8,
    temperament: 'peaceful',
    careLevel: 'beginner',
    minTankSize: 150,
    waterParameters: {
      tempMin: 23,
      tempMax: 28,
      phMin: 7.0,
      phMax: 8.5,
      hardness: 'hard',
    },
    diet: ['Flakes', 'Pellets', 'Live foods', 'Vegetables'],
    breeding: {
      difficulty: 'moderate',
      method: 'egg-layer',
      sexualDimorphism: 'الذكور أكثر ألواناً مع ظهر مرتفع. الإناث باهتة وأكثر استدارة.',
      spawningTriggers: [
        'رفع درجة الحرارة',
        'تغذية بالأطعمة الحية',
        'ضوء الصباح',
        'مجموعة كبيرة'
      ],
      breedingSetup: {
        tankSize: '100-150 لتر',
        waterConditions: 'pH 7.0-8.0، ماء متوسط الصلابة',
        temperature: '26-28°م',
        equipment: ['Java Moss أو Spawning Mop', 'فلتر إسفنجي']
      },
      spawningBehavior: 'الذكور يعرضون ألوانهم الزاهية. تضع البيض في الصباح على النباتات.',
      eggCare: 'البيض يفقس في 7-12 يوم. أزل الوالدين لحماية البيض.',
      fryInfo: {
        firstFood: 'Infusoria ثم baby brine shrimp',
        growthRate: 'متوسط',
        adulthoodTime: '6-8 أشهر للألوان الكاملة'
      },
      tips: [
        'الألوان تتحسن مع العمر',
        'تحتاج لحوض واسع',
        'الصغار تنمو ببطء',
        'ممكن لكن ليس سهلاً'
      ]
    },
    schooling: true,
    minimumGroup: 6,
    compatibility: {
      goodWith: ['Other Rainbowfish', 'Corydoras', 'Large Tetras', 'Loaches'],
      avoidWith: ['Very small fish', 'Slow moving fish'],
    },
    description: 'سمكة مذهلة بنصفين لونين - أزرق وبرتقالي. من أجمل أسماك الرينبو.',
    careTips: [
      'تحتاج لحوض واسع',
      'ألوانها تتحسن مع العمر',
      'نشطة جداً',
      'تحب القفز - غطي الحوض',
    ],
    image: '/fish/boesemani-rainbow.png',
    category: 'other',
  },
  {
    id: 'panda-corydoras',
    commonName: 'Panda Corydoras',
    arabicName: 'كوريدوراس الباندا',
    scientificName: 'Corydoras panda',
    family: 'Callichthyidae',
    origin: 'أمريكا الجنوبية - البيرو',
    minSize: 4,
    maxSize: 5,
    lifespan: 10,
    temperament: 'peaceful',
    careLevel: 'beginner',
    minTankSize: 80,
    waterParameters: {
      tempMin: 20,
      tempMax: 25,
      phMin: 6.0,
      phMax: 7.8,
      hardness: 'soft',
    },
    diet: ['Sinking pellets', 'Wafers', 'Bloodworms', 'Leftover food'],
    breeding: {
      difficulty: 'moderate',
      method: 'egg-layer',
      sexualDimorphism: 'الإناث أكبر وأكثر استدارة من الأعلى. الذكور أنحف.',
      spawningTriggers: [
        'انخفاض درجة الحرارة 2-3 درجات',
        'تغيير ماء كبير بماء أبرد',
        'تغذية بالديدان الحية',
        'نسبة 2 ذكور لكل أنثى'
      ],
      breedingSetup: {
        tankSize: '40-60 لتر',
        waterConditions: 'pH 6.5-7.0، ماء ناعم',
        temperature: '20-22°م (بارد)',
        equipment: ['رمل ناعم', 'نباتات عريضة الأوراق', 'فلتر إسفنجي']
      },
      spawningBehavior: 'الأنثى تحمل البيض بزعانفها البطنية وتلصقه على الزجاج والنباتات.',
      eggCare: 'البيض يفقس في 3-5 أيام. الوالدان قد يأكلان البيض.',
      fryInfo: {
        firstFood: 'صفار بيض مسلوق مطحون، baby brine shrimp',
        growthRate: 'متوسط',
        adulthoodTime: '8-12 شهر'
      },
      tips: [
        'الماء البارد يحفز التكاثر',
        'البيض لزج',
        'يمكن نقل البيض لحوض منفصل',
        'الصغار قوية نسبياً'
      ]
    },
    schooling: true,
    minimumGroup: 6,
    compatibility: {
      goodWith: ['Most peaceful fish', 'Tetra', 'Guppy', 'Rasbora'],
      avoidWith: ['Large aggressive Cichlids'],
    },
    description: 'سمكة قاع لطيفة بنمط أسود وأبيض كالباندا. من أشهر الكوريدوراس.',
    careTips: [
      'تفضل الماء البارد قليلاً',
      'تحتاج لرمل ناعم',
      'تحب المجموعات',
      'نشطة ومسلية للمراقبة',
    ],
    image: '/fish/panda-corydoras.png',
    category: 'catfish',
  },
  {
    id: 'siamese-algae-eater',
    commonName: 'Siamese Algae Eater',
    arabicName: 'آكل الطحالب السيامي',
    scientificName: 'Crossocheilus oblongus',
    family: 'Cyprinidae',
    origin: 'جنوب شرق آسيا',
    minSize: 12,
    maxSize: 16,
    lifespan: 10,
    temperament: 'peaceful',
    careLevel: 'beginner',
    minTankSize: 120,
    waterParameters: {
      tempMin: 22,
      tempMax: 27,
      phMin: 6.5,
      phMax: 8.0,
      hardness: 'medium',
    },
    diet: ['Algae', 'Algae wafers', 'Vegetables', 'Sinking pellets'],
    breeding: {
      difficulty: 'expert',
      method: 'egg-layer',
      sexualDimorphism: 'صعب جداً التفريق. الإناث أكبر وأكثر استدارة عند النضج.',
      spawningTriggers: [
        'لم يتم توثيقها جيداً',
        'مياه نظيفة جداً',
        'تغذية طبيعية'
      ],
      breedingSetup: {
        tankSize: 'غير معروف',
        waterConditions: 'غير معروفة',
        temperature: '24-26°م',
        equipment: ['حوض كبير ناضج']
      },
      spawningBehavior: 'لم يتم توثيقه في الأسر.',
      eggCare: 'غير معروف.',
      fryInfo: {
        firstFood: 'غير معروف',
        growthRate: 'غير معروف',
        adulthoodTime: 'غير معروف'
      },
      tips: [
        'لم يتم تكاثرها في الأحواض المنزلية',
        'معظمها تأتي من الطبيعة أو مزارع الهرمونات',
        'لا تحاول التكاثر',
        'ركز على العناية فقط'
      ]
    },
    schooling: false,
    minimumGroup: 1,
    compatibility: {
      goodWith: ['Most community fish', 'Rainbowfish', 'Large Tetras'],
      avoidWith: ['Very small fish (when adult)', 'Aggressive fish'],
    },
    description: 'من أفضل آكلي الطحالب! يأكل حتى الطحالب الصعبة مثل Black Beard Algae.',
    careTips: [
      'ينمو كبيراً - خطط للحجم',
      'يأكل Black Beard Algae',
      'نشط جداً',
      'يحتاج لحوض واسع',
    ],
    image: '/fish/siamese-algae-eater.png',
    category: 'other',
  },
  {
    id: 'keyhole-cichlid',
    commonName: 'Keyhole Cichlid',
    arabicName: 'سيكلد ثقب المفتاح',
    scientificName: 'Cleithracara maronii',
    family: 'Cichlidae',
    origin: 'أمريكا الجنوبية',
    minSize: 8,
    maxSize: 12,
    lifespan: 8,
    temperament: 'peaceful',
    careLevel: 'beginner',
    minTankSize: 100,
    waterParameters: {
      tempMin: 22,
      tempMax: 28,
      phMin: 6.0,
      phMax: 7.5,
      hardness: 'soft',
    },
    diet: ['Pellets', 'Flakes', 'Live foods', 'Frozen foods'],
    breeding: {
      difficulty: 'moderate',
      method: 'egg-layer',
      sexualDimorphism: 'الذكور أكبر مع زعانف أطول. الإناث أصغر وأكثر استدارة.',
      spawningTriggers: [
        'زوج مترابط',
        'سطح مستوٍ للبيض',
        'تغذية جيدة',
        'هدوء'
      ],
      breedingSetup: {
        tankSize: '80-100 لتر',
        waterConditions: 'pH 6.5-7.0، ماء ناعم',
        temperature: '26-28°م',
        equipment: ['صخرة مسطحة', 'نباتات كثيفة', 'مخابئ']
      },
      spawningBehavior: 'الزوج ينظف صخرة ويضع البيض عليها. كلاهما يحرس.',
      eggCare: 'الوالدان يحرسان البيض والصغار. يفقس في 3-4 أيام.',
      fryInfo: {
        firstFood: 'Baby brine shrimp',
        growthRate: 'متوسط',
        adulthoodTime: '6-8 أشهر'
      },
      tips: [
        'من أسلم السيكلد',
        'الوالدان ممتازان',
        'خجول - يحتاج لمخابئ',
        'اللون يتغير حسب المزاج'
      ]
    },
    schooling: false,
    minimumGroup: 2,
    compatibility: {
      goodWith: ['Tetra', 'Corydoras', 'Angelfish', 'Other peaceful Cichlids'],
      avoidWith: ['Aggressive Cichlids', 'Very small fish'],
    },
    description: 'سيكلد سلمي جداً بعلامة مميزة كثقب المفتاح. مثالي للمجتمع.',
    careTips: [
      'من أسلم السيكلد',
      'خجول قليلاً - يحتاج لمخابئ',
      'لون يتغير حسب المزاج',
      'مناسب للمبتدئين',
    ],
    image: '/fish/keyhole-cichlid.png',
    category: 'cichlid',
  },
  {
    id: 'clown-loach',
    commonName: 'Clown Loach',
    arabicName: 'لوتش المهرج',
    scientificName: 'Chromobotia macracanthus',
    family: 'Botiidae',
    origin: 'إندونيسيا - بورنيو وسومطرة',
    minSize: 15,
    maxSize: 30,
    lifespan: 25,
    temperament: 'peaceful',
    careLevel: 'intermediate',
    minTankSize: 300,
    waterParameters: {
      tempMin: 25,
      tempMax: 30,
      phMin: 6.0,
      phMax: 7.5,
      hardness: 'soft',
    },
    diet: ['Sinking pellets', 'Bloodworms', 'Snails', 'Vegetables'],
    breeding: {
      difficulty: 'expert',
      method: 'egg-layer',
      sexualDimorphism: 'صعب جداً التفريق. الإناث أكثر استدارة قليلاً.',
      spawningTriggers: [
        'لم يتم توثيقها في الأحواض المنزلية',
        'تغييرات موسمية',
        'مياه ناعمة جداً'
      ],
      breedingSetup: {
        tankSize: 'غير معروف - غالباً كبير جداً',
        waterConditions: 'غير معروفة',
        temperature: '28-30°م',
        equipment: ['أحواض ضخمة']
      },
      spawningBehavior: 'لم يتم توثيقه في الأسر المنزلية.',
      eggCare: 'غير معروف.',
      fryInfo: {
        firstFood: 'غير معروف',
        growthRate: 'بطيء جداً',
        adulthoodTime: 'سنوات'
      },
      tips: [
        'لم يتم تكاثرها في الأحواض المنزلية',
        'معظمها تأتي من مزارع الهرمونات',
        'لا تحاول',
        'ركز على توفير حياة طويلة وسعيدة'
      ]
    },
    schooling: true,
    minimumGroup: 5,
    compatibility: {
      goodWith: ['Large community fish', 'Rainbowfish', 'Large Tetras'],
      avoidWith: ['Very small fish', 'Aggressive fish'],
    },
    description: 'سمكة كبيرة جميلة بخطوط برتقالية وسوداء. تأكل الحلزونات وتحتاج لحوض كبير جداً.',
    careTips: [
      'تنمو كبيرة جداً - 30+ سم',
      'تحتاج لمجموعة (5+)',
      'تأكل الحلزونات',
      'تعيش لعقود مع العناية الصحيحة',
    ],
    image: '/fish/clown-loach.png',
    category: 'other',
  },
  {
    id: 'yoyo-loach',
    commonName: 'Yoyo Loach',
    arabicName: 'لوتش يويو',
    scientificName: 'Botia almorhae',
    family: 'Botiidae',
    origin: 'جنوب آسيا - الهند',
    minSize: 10,
    maxSize: 15,
    lifespan: 10,
    temperament: 'peaceful',
    careLevel: 'beginner',
    minTankSize: 120,
    waterParameters: {
      tempMin: 24,
      tempMax: 28,
      phMin: 6.5,
      phMax: 7.5,
      hardness: 'soft',
    },
    diet: ['Sinking pellets', 'Bloodworms', 'Snails', 'Vegetables'],
    breeding: {
      difficulty: 'difficult',
      method: 'egg-layer',
      sexualDimorphism: 'الإناث أكبر وأكثر استدارة. صعب التفريق.',
      spawningTriggers: [
        'مياه ناعمة',
        'تغييرات ماء كبيرة',
        'انخفاض الضغط الجوي'
      ],
      breedingSetup: {
        tankSize: '100+ لتر',
        waterConditions: 'pH 6.0-7.0، ماء ناعم',
        temperature: '26-28°م',
        equipment: ['رمل ناعم', 'مخابئ كثيرة', 'نباتات']
      },
      spawningBehavior: 'تنثر البيض بين النباتات.',
      eggCare: 'البيض صغير وأخضر. يفقس في 24 ساعة.',
      fryInfo: {
        firstFood: 'Infusoria',
        growthRate: 'بطيء',
        adulthoodTime: '12+ شهر'
      },
      tips: [
        'نادر في الأسر المنزلية',
        'يحتاج لظروف مثالية',
        'للخبراء فقط',
        'معظمها من الطبيعة'
      ]
    },
    schooling: true,
    minimumGroup: 5,
    compatibility: {
      goodWith: ['Most community fish', 'Tetras', 'Rainbowfish'],
      avoidWith: ['Very small fish', 'Slow fish'],
    },
    description: 'سمكة نشطة بنمط يشبه Y-O-Y-O. ممتازة للتخلص من الحلزونات.',
    careTips: [
      'نشطة جداً ومسلية',
      'تأكل الحلزونات',
      'تحتاج لرمل ناعم',
      'تحب المخابئ',
    ],
    image: '/fish/yoyo-loach.png',
    category: 'other',
  },
  {
    id: 'ember-tetra',
    commonName: 'Ember Tetra',
    arabicName: 'تترا الجمر',
    scientificName: 'Hyphessobrycon amandae',
    family: 'Characidae',
    origin: 'البرازيل',
    minSize: 1.5,
    maxSize: 2,
    lifespan: 4,
    temperament: 'peaceful',
    careLevel: 'beginner',
    minTankSize: 30,
    waterParameters: {
      tempMin: 23,
      tempMax: 29,
      phMin: 5.5,
      phMax: 7.0,
      hardness: 'soft',
    },
    diet: ['Micro pellets', 'Crushed flakes', 'Baby brine shrimp'],
    breeding: {
      difficulty: 'easy',
      method: 'egg-layer',
      sexualDimorphism: 'الذكور أكثر ألواناً. الإناث أكبر وأكثر استدارة.',
      spawningTriggers: [
        'نباتات كثيفة',
        'تغذية بالأطعمة الحية',
        'ضوء الصباح'
      ],
      breedingSetup: {
        tankSize: '20-30 لتر',
        waterConditions: 'pH 6.0-7.0، ماء ناعم',
        temperature: '25-28°م',
        equipment: ['Java Moss كثيف', 'فلتر إسفنجي']
      },
      spawningBehavior: 'تنثر البيض بين النباتات. الوالدان لا يأكلان البيض عادة.',
      eggCare: 'البيض يفقس في 24-36 ساعة.',
      fryInfo: {
        firstFood: 'Infusoria ثم طعام سائل',
        growthRate: 'متوسط',
        adulthoodTime: '3-4 أشهر'
      },
      tips: [
        'سهل في الأحواض المزروعة',
        'الصغار صغيرة جداً',
        'الJava Moss ضروري',
        'تتكاثر باستمرار في الحوض المزروع'
      ]
    },
    schooling: true,
    minimumGroup: 8,
    compatibility: {
      goodWith: ['Small Tetras', 'Shrimp', 'Rasbora', 'Otocinclus'],
      avoidWith: ['Large fish', 'Aggressive fish'],
    },
    description: 'سمكة صغيرة بلون برتقالي جمري مذهل. مثالية للأحواض النانو المزروعة.',
    careTips: [
      'صغيرة جداً - تحتاج لطعام صغير',
      'لونها جميل في الأحواض المزروعة',
      'تحب المجموعات الكبيرة',
      'مثالية للنانو',
    ],
    image: '/fish/ember-tetra.png',
    category: 'tetra',
  },
  {
    id: 'bleeding-heart-tetra',
    commonName: 'Bleeding Heart Tetra',
    arabicName: 'تترا القلب النازف',
    scientificName: 'Hyphessobrycon erythrostigma',
    family: 'Characidae',
    origin: 'أمريكا الجنوبية',
    minSize: 5,
    maxSize: 7,
    lifespan: 5,
    temperament: 'peaceful',
    careLevel: 'beginner',
    minTankSize: 80,
    waterParameters: {
      tempMin: 23,
      tempMax: 28,
      phMin: 6.0,
      phMax: 7.5,
      hardness: 'soft',
    },
    diet: ['Flakes', 'Pellets', 'Live foods', 'Frozen foods'],
    breeding: {
      difficulty: 'moderate',
      method: 'egg-layer',
      sexualDimorphism: 'الذكور لهم زعانف ظهرية أطول ومدببة. الإناث أكبر وممتلئة.',
      spawningTriggers: [
        'رفع درجة الحرارة',
        'تغذية بالأطعمة الحية',
        'نباتات ناعمة كثيفة'
      ],
      breedingSetup: {
        tankSize: '60-80 لتر',
        waterConditions: 'pH 6.0-7.0، ماء ناعم',
        temperature: '26-28°م',
        equipment: ['Java Moss', 'فلتر إسفنجي', 'إضاءة خافتة']
      },
      spawningBehavior: 'تنثر البيض بين النباتات. الذكور يطاردون الإناث.',
      eggCare: 'أزل الوالدين - قد يأكلان البيض. يفقس في 24-36 ساعة.',
      fryInfo: {
        firstFood: 'Infusoria ثم baby brine shrimp',
        growthRate: 'متوسط',
        adulthoodTime: '5-6 أشهر'
      },
      tips: [
        'الذكور زعانفهم أجمل',
        'النباتات الكثيفة تحمي البيض',
        'ممكن للهواة المتوسطين',
        'البقعة الحمراء مميزة'
      ]
    },
    schooling: true,
    minimumGroup: 6,
    compatibility: {
      goodWith: ['Other Tetras', 'Corydoras', 'Rasbora', 'Gouramis'],
      avoidWith: ['Fin-nippers', 'Aggressive fish'],
    },
    description: 'سمكة جميلة ببقعة حمراء على الصدر تشبه القلب النازف.',
    careTips: [
      'البقعة الحمراء مميزة جداً',
      'تحتاج لمجموعة',
      'زعانف الذكور أطول',
      'تحب الأحواض المزروعة',
    ],
    image: '/fish/bleeding-heart-tetra.png',
    category: 'tetra',
  },
  {
    id: 'chili-rasbora',
    commonName: 'Chili Rasbora',
    arabicName: 'رازبورا الفلفل الحار',
    scientificName: 'Boraras brigittae',
    family: 'Cyprinidae',
    origin: 'إندونيسيا - بورنيو',
    minSize: 1.5,
    maxSize: 2,
    lifespan: 6,
    temperament: 'peaceful',
    careLevel: 'intermediate',
    minTankSize: 20,
    waterParameters: {
      tempMin: 20,
      tempMax: 28,
      phMin: 4.0,
      phMax: 7.0,
      hardness: 'soft',
    },
    diet: ['Micro pellets', 'Crushed flakes', 'Daphnia', 'Baby brine shrimp'],
    breeding: {
      difficulty: 'moderate',
      method: 'egg-layer',
      sexualDimorphism: 'الذكور أكثر احمراراً وأنحف. الإناث أكبر وأقل لوناً.',
      spawningTriggers: [
        'نباتات كثيفة (Java Moss)',
        'مياه ناعمة وحمضية',
        'تغذية بالأطعمة الحية'
      ],
      breedingSetup: {
        tankSize: '20-30 لتر',
        waterConditions: 'pH 5.0-6.5، ماء ناعم جداً',
        temperature: '24-26°م',
        equipment: ['Java Moss كثيف', 'فلتر إسفنجي', 'إضاءة خافتة']
      },
      spawningBehavior: 'تضع بيض صغير جداً بين النباتات.',
      eggCare: 'البيض يفقس في 2-3 أيام.',
      fryInfo: {
        firstFood: 'Infusoria صغير جداً',
        growthRate: 'بطيء',
        adulthoodTime: '4-6 أشهر'
      },
      tips: [
        'الصغار صغيرة جداً - تحتاج طعام دقيق',
        'الماء الناعم ضروري',
        'تتكاثر في الأحواض المزروعة',
        'متوسط الصعوبة'
      ]
    },
    schooling: true,
    minimumGroup: 10,
    compatibility: {
      goodWith: ['Shrimp', 'Small Tetras', 'Otocinclus', 'Celestial Pearl Danio'],
      avoidWith: ['Any large fish'],
    },
    description: 'من أصغر الأسماك بلون أحمر كالفلفل الحار. مثالية للأحواض النانو.',
    careTips: [
      'صغيرة جداً - 2 سم فقط',
      'تحتاج لعدد كبير (10+)',
      'مثالية للنانو',
      'حساسة لجودة المياه',
    ],
    image: '/fish/chili-rasbora.png',
    category: 'other',
  },
  {
    id: 'scarlet-badis',
    commonName: 'Scarlet Badis',
    arabicName: 'باديس القرمزي',
    scientificName: 'Dario dario',
    family: 'Badidae',
    origin: 'الهند',
    minSize: 1.5,
    maxSize: 2,
    lifespan: 4,
    temperament: 'peaceful',
    careLevel: 'intermediate',
    minTankSize: 30,
    waterParameters: {
      tempMin: 21,
      tempMax: 28,
      phMin: 6.5,
      phMax: 7.5,
      hardness: 'soft',
    },
    diet: ['Frozen foods only', 'Bloodworms', 'Daphnia', 'Brine shrimp'],
    breeding: {
      difficulty: 'moderate',
      method: 'egg-layer',
      sexualDimorphism: 'الذكور ملونون بشكل مذهل (أحمر وأزرق). الإناث رمادية باهتة.',
      spawningTriggers: [
        'كهف صغير',
        'تغذية بالأطعمة الحية',
        'ماء نظيف'
      ],
      breedingSetup: {
        tankSize: '20-30 لتر',
        waterConditions: 'pH 6.5-7.5، ماء ناعم',
        temperature: '22-24°م',
        equipment: ['كهف صغير أو قشرة جوز', 'نباتات', 'فلتر إسفنجي']
      },
      spawningBehavior: 'الذكر يجذب الأنثى للكهف. تضع البيض ويحرسه الذكر.',
      eggCare: 'الذكر يحرس البيض والصغار. يفقس في 2-3 أيام.',
      fryInfo: {
        firstFood: 'Infusoria ثم baby brine shrimp',
        growthRate: 'بطيء',
        adulthoodTime: '3-4 أشهر'
      },
      tips: [
        'الذكر أب ممتاز',
        'الكهف ضروري',
        'لا تأكل الطعام الجاف',
        'الصغار صغيرة جداً'
      ]
    },
    schooling: false,
    minimumGroup: 1,
    compatibility: {
      goodWith: ['Shrimp (large)', 'Small peaceful fish', 'Otocinclus'],
      avoidWith: ['Large fish', 'Aggressive fish', 'Fish that compete for food'],
    },
    description: 'سمكة صغيرة ملونة جداً. الذكور حمراء وزرقاء مذهلة.',
    careTips: [
      'لا تأكل الطعام الجاف غالباً',
      'الذكور أكثر ألواناً',
      'خجولة - تحتاج لمخابئ',
      'حساسة للتغذية',
    ],
    image: '/fish/scarlet-badis.png',
    category: 'other',
  },
  {
    id: 'peacock-gudgeon',
    commonName: 'Peacock Gudgeon',
    arabicName: 'غادجون الطاووس',
    scientificName: 'Tateurndina ocellicauda',
    family: 'Eleotridae',
    origin: 'بابوا غينيا الجديدة',
    minSize: 5,
    maxSize: 7,
    lifespan: 5,
    temperament: 'peaceful',
    careLevel: 'beginner',
    minTankSize: 80,
    waterParameters: {
      tempMin: 22,
      tempMax: 26,
      phMin: 6.5,
      phMax: 7.5,
      hardness: 'medium',
    },
    diet: ['Frozen foods', 'Pellets', 'Bloodworms', 'Brine shrimp'],
    breeding: {
      difficulty: 'easy',
      method: 'egg-layer',
      sexualDimorphism: 'الذكور أكثر ألواناً مع رأس محدب. الإناث باهتة.',
      spawningTriggers: [
        'كهف صغير',
        'تغذية جيدة',
        'ماء نظيف'
      ],
      breedingSetup: {
        tankSize: '40-60 لتر',
        waterConditions: 'pH 6.5-7.5، ماء متوسط',
        temperature: '24-26°م',
        equipment: ['كهف صغير أو أنبوب PVC', 'نباتات', 'فلتر إسفنجي']
      },
      spawningBehavior: 'الزوج يدخل الكهف. الذكر يحرس البيض.',
      eggCare: 'الذكر يحرس البيض. يفقس في 7-10 أيام.',
      fryInfo: {
        firstFood: 'Baby brine shrimp',
        growthRate: 'متوسط',
        adulthoodTime: '4-6 أشهر'
      },
      tips: [
        'سهل التكاثر للمبتدئين',
        'الذكر أب ممتاز',
        'الكهف ضروري',
        'الصغار قوية نسبياً'
      ]
    },
    schooling: false,
    minimumGroup: 2,
    compatibility: {
      goodWith: ['Small peaceful fish', 'Corydoras', 'Tetras', 'Rasbora'],
      avoidWith: ['Large aggressive fish'],
    },
    description: 'سمكة ملونة بنقاط ملونة كالطاووس. سهلة التكاثر.',
    careTips: [
      'جميلة جداً وملونة',
      'تحب الكهوف للتكاثر',
      'هادئة ومسالمة',
      'الذكور أكثر ألواناً',
    ],
    image: '/fish/peacock-gudgeon.png',
    category: 'other',
  },
  {
    id: 'golden-wonder-killifish',
    commonName: 'Golden Wonder Killifish',
    arabicName: 'كيلي فيش الذهبي',
    scientificName: 'Aplocheilus lineatus',
    family: 'Aplocheilidae',
    origin: 'الهند وسريلانكا',
    minSize: 8,
    maxSize: 10,
    lifespan: 4,
    temperament: 'semi-aggressive',
    careLevel: 'beginner',
    minTankSize: 80,
    waterParameters: {
      tempMin: 18,
      tempMax: 28,
      phMin: 6.0,
      phMax: 7.5,
      hardness: 'soft',
    },
    diet: ['Floating pellets', 'Live foods', 'Insects', 'Bloodworms'],
    breeding: {
      difficulty: 'easy',
      method: 'egg-layer',
      sexualDimorphism: 'الذكور أكثر ألواناً بحواف حمراء. الإناث باهتة.',
      spawningTriggers: [
        'نباتات طافية',
        'تغذية بالحشرات',
        'ماء نظيف'
      ],
      breedingSetup: {
        tankSize: '60-80 لتر',
        waterConditions: 'pH 6.5-7.5، ماء ناعم',
        temperature: '24-26°م',
        equipment: ['نباتات طافية كثيفة', 'غطاء محكم']
      },
      spawningBehavior: 'تضع البيض بين جذور النباتات الطافية.',
      eggCare: 'البيض يفقس في 10-14 يوم.',
      fryInfo: {
        firstFood: 'Baby brine shrimp وحشرات صغيرة',
        growthRate: 'سريع',
        adulthoodTime: '3-4 أشهر'
      },
      tips: [
        'سهل التكاثر',
        'قافزة - غطِّ الحوض!',
        'تأكل الصغار - افصلهم',
        'النباتات الطافية ضرورية'
      ]
    },
    schooling: false,
    minimumGroup: 1,
    compatibility: {
      goodWith: ['Large peaceful fish', 'Bottom dwellers'],
      avoidWith: ['Small fish (will eat them)', 'Fin-nippers'],
    },
    description: 'سمكة سطحية ذهبية جميلة. تأكل الحشرات والأسماك الصغيرة.',
    careTips: [
      'تعيش عند السطح',
      'تأكل الأسماك الصغيرة!',
      'قافزة - غطي الحوض',
      'تأكل البعوض',
    ],
    image: '/fish/golden-wonder-killifish.png',
    category: 'other',
  },
  {
    id: 'bolivian-ram',
    commonName: 'Bolivian Ram',
    arabicName: 'رام بوليفي',
    scientificName: 'Mikrogeophagus altispinosus',
    family: 'Cichlidae',
    origin: 'بوليفيا والبرازيل',
    minSize: 6,
    maxSize: 8,
    lifespan: 5,
    temperament: 'peaceful',
    careLevel: 'beginner',
    minTankSize: 80,
    waterParameters: {
      tempMin: 22,
      tempMax: 26,
      phMin: 6.0,
      phMax: 7.5,
      hardness: 'soft',
    },
    diet: ['Pellets', 'Flakes', 'Live foods', 'Frozen foods'],
    breeding: {
      difficulty: 'moderate',
      method: 'egg-layer',
      sexualDimorphism: 'الذكور أكبر مع زعانف أطول. الإناث أصغر مع بطن وردي.',
      spawningTriggers: [
        'زوج مترابط',
        'صخرة مسطحة',
        'تغذية بالأطعمة الحية'
      ],
      breedingSetup: {
        tankSize: '60-80 لتر',
        waterConditions: 'pH 6.5-7.5، ماء ناعم',
        temperature: '24-26°م',
        equipment: ['صخرة مسطحة', 'نباتات', 'مخابئ']
      },
      spawningBehavior: 'الزوج ينظف صخرة ويضع البيض. كلاهما يحرس.',
      eggCare: 'الوالدان يحرسان البيض والصغار. يفقس في 3-4 أيام.',
      fryInfo: {
        firstFood: 'Baby brine shrimp',
        growthRate: 'متوسط',
        adulthoodTime: '6-8 أشهر'
      },
      tips: [
        'أصلب من German Blue Ram',
        'الوالدان ممتازان',
        'مناسب للمبتدئين',
        'يتحمل درجات حرارة أقل'
      ]
    },
    schooling: false,
    minimumGroup: 2,
    compatibility: {
      goodWith: ['Tetra', 'Corydoras', 'Rasbora', 'Other peaceful fish'],
      avoidWith: ['Aggressive Cichlids'],
    },
    description: 'سيكلد قزم أكثر صلابة من German Blue Ram. مثالي للمبتدئين.',
    careTips: [
      'أصلب من German Blue Ram',
      'يتحمل درجات حرارة أقل',
      'مناسب للمبتدئين',
      'سلمي ومثالي للمجتمع',
    ],
    image: '/fish/bolivian-ram.png',
    category: 'cichlid',
  },
  {
    id: 'apistogramma-cacatuoides',
    commonName: 'Cockatoo Dwarf Cichlid',
    arabicName: 'أبيستوغراما الكوكاتو',
    scientificName: 'Apistogramma cacatuoides',
    family: 'Cichlidae',
    origin: 'أمريكا الجنوبية - الأمازون',
    minSize: 5,
    maxSize: 8,
    lifespan: 5,
    temperament: 'peaceful',
    careLevel: 'intermediate',
    minTankSize: 80,
    waterParameters: {
      tempMin: 24,
      tempMax: 28,
      phMin: 6.0,
      phMax: 8.0,
      hardness: 'soft',
    },
    diet: ['Pellets', 'Flakes', 'Live foods', 'Frozen foods'],
    breeding: {
      difficulty: 'moderate',
      method: 'egg-layer',
      sexualDimorphism: 'الذكور أكبر وأكثر ألواناً مع زعانف ممتدة. الإناث أصغر.',
      spawningTriggers: [
        'كهف صغير',
        'تغذية بالأطعمة الحية',
        'ماء ناعم وحمضي'
      ],
      breedingSetup: {
        tankSize: '60 لتر',
        waterConditions: 'pH 6.0-7.0، ماء ناعم',
        temperature: '26-28°م',
        equipment: ['كهف صغير أو قشرة جوز', 'نباتات', 'فلتر إسفنجي']
      },
      spawningBehavior: 'الأنثى تضع البيض في الكهف وتحرسه.',
      eggCare: 'الأنثى تحرس البيض والصغار. الذكر يحرس المنطقة.',
      fryInfo: {
        firstFood: 'Baby brine shrimp',
        growthRate: 'متوسط',
        adulthoodTime: '4-6 أشهر'
      },
      tips: [
        'الأنثى تصبح صفراء عند الحراسة',
        'الكهف ضروري',
        'ذكر واحد مع عدة إناث',
        'أم ممتازة'
      ]
    },
    schooling: false,
    minimumGroup: 2,
    compatibility: {
      goodWith: ['Tetra', 'Corydoras', 'Rasbora', 'Otocinclus'],
      avoidWith: ['Other male Apistogramma', 'Aggressive fish'],
    },
    description: 'سيكلد قزم بزعانف مميزة كالكوكاتو. ألوان الذكور مذهلة.',
    careTips: [
      'الذكور لهم زعانف طويلة',
      'يحتاج لكهوف للتكاثر',
      'الإناث تصبح صفراء عند الحراسة',
      'أفضل ذكر واحد مع عدة إناث',
    ],
    image: '/fish/apistogramma-cacatuoides.png',
    category: 'cichlid',
  },
  {
    id: 'kribensis',
    commonName: 'Kribensis',
    arabicName: 'كريبنسيس / سيكلد قوس قزح',
    scientificName: 'Pelvicachromis pulcher',
    family: 'Cichlidae',
    origin: 'أفريقيا - نيجيريا',
    minSize: 8,
    maxSize: 10,
    lifespan: 5,
    temperament: 'peaceful',
    careLevel: 'beginner',
    minTankSize: 80,
    waterParameters: {
      tempMin: 24,
      tempMax: 28,
      phMin: 6.0,
      phMax: 8.0,
      hardness: 'soft',
    },
    diet: ['Pellets', 'Flakes', 'Live foods', 'Vegetables'],
    breeding: {
      difficulty: 'easy',
      method: 'egg-layer',
      sexualDimorphism: 'الإناث لها بطن وردي/أحمر جميل. الذكور أكبر وأقل لوناً.',
      spawningTriggers: [
        'كهف صغير',
        'تغذية جيدة',
        'ماء نظيف'
      ],
      breedingSetup: {
        tankSize: '80 لتر',
        waterConditions: 'pH 6.5-7.5، ماء ناعم',
        temperature: '25-27°م',
        equipment: ['كهف صغير أو أنبوب', 'نباتات']
      },
      spawningBehavior: 'الأنثى تضع البيض في الكهف. كلا الوالدين يحرسان.',
      eggCare: 'الوالدان يحرسان البيض والصغار بشكل ممتاز. يفقس في 3-5 أيام.',
      fryInfo: {
        firstFood: 'Baby brine shrimp',
        growthRate: 'سريع نسبياً',
        adulthoodTime: '4-6 أشهر'
      },
      tips: [
        'من أسهل السيكلد للتكاثر',
        'والدان ممتازان',
        'الإناث بطنها وردي جميل',
        'يصبحان إقليميين عند التكاثر'
      ]
    },
    schooling: false,
    minimumGroup: 2,
    compatibility: {
      goodWith: ['Tetra', 'Corydoras', 'Rainbowfish', 'Most community fish'],
      avoidWith: ['Bottom dwellers during breeding', 'Aggressive fish'],
    },
    description: 'من أسهل السيكلد للتربية والتكاثر. الإناث لها بطن وردي جميل.',
    careTips: [
      'سهل التكاثر للمبتدئين',
      'الإناث بطنها وردي',
      'يحتاج لكهف',
      'يصبحان إقليميين عند التكاثر',
    ],
    image: '/fish/kribensis.png',
    category: 'cichlid',
  },
  {
    id: 'electric-blue-acara',
    commonName: 'Electric Blue Acara',
    arabicName: 'أكارا أزرق كهربائي',
    scientificName: 'Andinoacara pulcher',
    family: 'Cichlidae',
    origin: 'أمريكا الجنوبية (سلالة مستزرعة)',
    minSize: 12,
    maxSize: 18,
    lifespan: 10,
    temperament: 'peaceful',
    careLevel: 'beginner',
    minTankSize: 120,
    waterParameters: {
      tempMin: 18,
      tempMax: 28,
      phMin: 6.5,
      phMax: 8.0,
      hardness: 'medium',
    },
    diet: ['Pellets', 'Flakes', 'Live foods', 'Frozen foods'],
    breeding: {
      difficulty: 'easy',
      method: 'egg-layer',
      sexualDimorphism: 'الذكور أكبر مع زعانف أطول. الإناث أصغر وأكثر استدارة.',
      spawningTriggers: [
        'زوج مترابط',
        'صخرة مسطحة',
        'تغذية جيدة'
      ],
      breedingSetup: {
        tankSize: '100-120 لتر',
        waterConditions: 'pH 6.5-7.5، ماء متوسط',
        temperature: '25-28°م',
        equipment: ['صخرة مسطحة', 'نباتات']
      },
      spawningBehavior: 'الزوج ينظف صخرة ويضع البيض. كلاهما يحرس.',
      eggCare: 'الوالدان يحرسان البيض والصغار. يفقس في 3-4 أيام.',
      fryInfo: {
        firstFood: 'Baby brine shrimp',
        growthRate: 'متوسط',
        adulthoodTime: '6-8 أشهر'
      },
      tips: [
        'سلمي جداً للسيكلد',
        'والدان ممتازان',
        'لون أزرق مذهل',
        'سهل للمبتدئين'
      ]
    },
    schooling: false,
    minimumGroup: 2,
    compatibility: {
      goodWith: ['Large Tetras', 'Corydoras', 'Rainbowfish', 'Severum'],
      avoidWith: ['Very small fish', 'Aggressive Cichlids'],
    },
    description: 'سيكلد أزرق لامع مذهل. سلمي بشكل استثنائي لحجمه.',
    careTips: [
      'سلمي جداً للسيكلد',
      'لون أزرق كهربائي مذهل',
      'صلب ومتسامح',
      'ينمو كبيراً نسبياً',
    ],
    image: '/fish/electric-blue-acara.png',
    category: 'cichlid',
  },
  {
    id: 'glass-catfish',
    commonName: 'Glass Catfish',
    arabicName: 'سمكة القط الزجاجية',
    scientificName: 'Kryptopterus vitreolus',
    family: 'Siluridae',
    origin: 'تايلاند',
    minSize: 8,
    maxSize: 15,
    lifespan: 8,
    temperament: 'peaceful',
    careLevel: 'intermediate',
    minTankSize: 100,
    waterParameters: {
      tempMin: 24,
      tempMax: 28,
      phMin: 6.5,
      phMax: 7.5,
      hardness: 'soft',
    },
    diet: ['Frozen foods', 'Live foods', 'Flakes (sometimes)'],
    breeding: {
      difficulty: 'expert',
      method: 'egg-layer',
      sexualDimorphism: 'صعب جداً التفريق. الإناث أكثر امتلاءً عند الحمل.',
      spawningTriggers: [
        'لم يتم توثيقها جيداً',
        'تغييرات موسمية',
        'مياه ناعمة'
      ],
      breedingSetup: {
        tankSize: 'غير معروف',
        waterConditions: 'ماء ناعم وحمضي',
        temperature: '26-28°م',
        equipment: ['حوض كبير هادئ']
      },
      spawningBehavior: 'لم يتم توثيقه في الأسر المنزلية.',
      eggCare: 'غير معروف.',
      fryInfo: {
        firstFood: 'غير معروف',
        growthRate: 'غير معروف',
        adulthoodTime: 'غير معروف'
      },
      tips: [
        'لم يتم تكاثرها في الأسر المنزلية',
        'معظمها من الطبيعة',
        'لا تحاول',
        'ركز على العناية فقط'
      ]
    },
    schooling: true,
    minimumGroup: 6,
    compatibility: {
      goodWith: ['Peaceful fish', 'Tetras', 'Rasbora', 'Corydoras'],
      avoidWith: ['Aggressive fish', 'Large fish'],
    },
    description: 'سمكة شفافة يمكن رؤية هيكلها وأعضائها! فريدة ومذهلة.',
    careTips: [
      'شفافة تماماً - يمكن رؤية العظام!',
      'تحتاج لمجموعة (6+)',
      'خجولة - تحتاج لإضاءة خافتة',
      'حساسة لجودة المياه',
    ],
    image: '/fish/glass-catfish.png',
    category: 'catfish',
  },
  {
    id: 'sterbai-corydoras',
    commonName: 'Sterbai Corydoras',
    arabicName: 'كوريدوراس ستيرباي',
    scientificName: 'Corydoras sterbai',
    family: 'Callichthyidae',
    origin: 'البرازيل - نهر غوابوري',
    minSize: 5,
    maxSize: 7,
    lifespan: 15,
    temperament: 'peaceful',
    careLevel: 'beginner',
    minTankSize: 80,
    waterParameters: {
      tempMin: 24,
      tempMax: 28,
      phMin: 6.0,
      phMax: 8.0,
      hardness: 'soft',
    },
    diet: ['Sinking pellets', 'Wafers', 'Bloodworms', 'Brine shrimp'],
    breeding: {
      difficulty: 'moderate',
      method: 'egg-layer',
      sexualDimorphism: 'الإناث أكبر وأكثر استدارة. الذكور أنحف.',
      spawningTriggers: [
        'تغيير ماء كبير بماء أبرد',
        'تغذية بالديدان الحية',
        'نسبة 2 ذكور لكل أنثى'
      ],
      breedingSetup: {
        tankSize: '40-60 لتر',
        waterConditions: 'pH 6.5-7.5، ماء ناعم',
        temperature: '25-27°م',
        equipment: ['رمل ناعم', 'نباتات', 'فلتر إسفنجي']
      },
      spawningBehavior: 'مشابه للكوريدوراس الآخرين. الأنثى تلصق البيض على الزجاج.',
      eggCare: 'البيض يفقس في 4-5 أيام.',
      fryInfo: {
        firstFood: 'Baby brine shrimp',
        growthRate: 'متوسط',
        adulthoodTime: '8-12 شهر'
      },
      tips: [
        'يتحمل درجات حرارة عالية',
        'مثالي مع Discus',
        'الماء البارد يحفز التكاثر',
        'الصغار قوية'
      ]
    },
    schooling: true,
    minimumGroup: 6,
    compatibility: {
      goodWith: ['Most peaceful fish', 'Discus', 'German Blue Ram', 'Tetras'],
      avoidWith: ['Large aggressive fish'],
    },
    description: 'كوريدوراس مميز بنقاط بيضاء وزعانف صدرية برتقالية. يتحمل الحرارة العالية.',
    careTips: [
      'يتحمل درجات حرارة عالية',
      'مثالي مع Discus',
      'زعانف صدرية برتقالية جميلة',
      'قوي وطويل العمر',
    ],
    image: '/fish/sterbai-corydoras.png',
    category: 'catfish',
  },
  {
    id: 'odessa-barb',
    commonName: 'Odessa Barb',
    arabicName: 'بارب أوديسا',
    scientificName: 'Pethia padamya',
    family: 'Cyprinidae',
    origin: 'ميانمار',
    minSize: 4,
    maxSize: 5,
    lifespan: 5,
    temperament: 'peaceful',
    careLevel: 'beginner',
    minTankSize: 80,
    waterParameters: {
      tempMin: 22,
      tempMax: 26,
      phMin: 6.5,
      phMax: 7.5,
      hardness: 'medium',
    },
    diet: ['Flakes', 'Pellets', 'Live foods', 'Vegetables'],
    breeding: {
      difficulty: 'easy',
      method: 'egg-layer',
      sexualDimorphism: 'الذكور لهم شريط أحمر لامع على الجسم. الإناث باهتة.',
      spawningTriggers: [
        'رفع درجة الحرارة',
        'تغذية بالأطعمة الحية',
        'نباتات ناعمة كثيفة'
      ],
      breedingSetup: {
        tankSize: '60-80 لتر',
        waterConditions: 'pH 6.5-7.5، ماء متوسط',
        temperature: '24-26°م',
        equipment: ['Java Moss كثيف', 'فلتر إسفنجي']
      },
      spawningBehavior: 'الذكور يطاردون الإناث. تنثر البيض بين النباتات.',
      eggCare: 'أزل الوالدين - يأكلان البيض. يفقس في 24-36 ساعة.',
      fryInfo: {
        firstFood: 'Infusoria ثم baby brine shrimp',
        growthRate: 'سريع',
        adulthoodTime: '4-6 أشهر'
      },
      tips: [
        'أقل عدوانية من Tiger Barb',
        'الذكور لونهم مذهل',
        'سهل للمبتدئين',
        'يحتاج لمجموعة'
      ]
    },
    schooling: true,
    minimumGroup: 6,
    compatibility: {
      goodWith: ['Other Barbs', 'Rainbowfish', 'Tetras', 'Loaches'],
      avoidWith: ['Slow fish with long fins'],
    },
    description: 'بارب جميل بشريط أحمر لامع على الذكور. لا يقضم الزعانف مثل Tiger Barb.',
    careTips: [
      'أقل عدوانية من Tiger Barb',
      'الذكور لهم شريط أحمر مذهل',
      'يحتاج لمجموعة',
      'صلب وسهل العناية',
    ],
    image: '/fish/odessa-barb.png',
    category: 'other',
  },
  {
    id: 'denison-barb',
    commonName: 'Denison Barb',
    arabicName: 'بارب دينيسون / روزلاين شارك',
    scientificName: 'Sahyadria denisonii',
    family: 'Cyprinidae',
    origin: 'الهند - كيرالا',
    minSize: 10,
    maxSize: 15,
    lifespan: 5,
    temperament: 'peaceful',
    careLevel: 'intermediate',
    minTankSize: 200,
    waterParameters: {
      tempMin: 18,
      tempMax: 26,
      phMin: 6.5,
      phMax: 7.8,
      hardness: 'medium',
    },
    diet: ['Flakes', 'Pellets', 'Live foods', 'Vegetables'],
    breeding: {
      difficulty: 'expert',
      method: 'egg-layer',
      sexualDimorphism: 'صعب التفريق. الإناث أكثر استدارة عند النضج.',
      spawningTriggers: [
        'لم يتم توثيقها في الأسر',
        'تغييرات موسمية من الرياح الموسمية',
        'تيار قوي'
      ],
      breedingSetup: {
        tankSize: 'غير معروف',
        waterConditions: 'غير معروفة',
        temperature: '20-24°م',
        equipment: ['حوض كبير مع تيار']
      },
      spawningBehavior: 'لم يتم توثيقه في الأسر المنزلية.',
      eggCare: 'غير معروف.',
      fryInfo: {
        firstFood: 'غير معروف',
        growthRate: 'غير معروف',
        adulthoodTime: 'غير معروف'
      },
      tips: [
        'لم يتم تكاثرها في الأسر المنزلية',
        'مهددة بالانقراض في الطبيعة',
        'تحتاج لظروف خاصة',
        'لا تحاول'
      ]
    },
    schooling: true,
    minimumGroup: 6,
    compatibility: {
      goodWith: ['Large peaceful fish', 'Rainbowfish', 'Large Tetras'],
      avoidWith: ['Very small fish', 'Aggressive fish'],
    },
    description: 'سمكة رائعة بخط أحمر وأسود. تحتاج لتيار قوي وأكسجين عالي.',
    careTips: [
      'تحتاج لتيار ماء قوي',
      'تفضل الماء البارد نسبياً',
      'مهددة بالانقراض في الطبيعة',
      'تحتاج لحوض كبير',
    ],
    image: '/fish/denison-barb.png',
    category: 'other',
  },
  {
    id: 'forktail-rainbowfish',
    commonName: 'Forktail Blue Eye Rainbowfish',
    arabicName: 'رينبو العين الزرقاء',
    scientificName: 'Pseudomugil furcatus',
    family: 'Pseudomugilidae',
    origin: 'بابوا غينيا الجديدة',
    minSize: 4,
    maxSize: 5,
    lifespan: 3,
    temperament: 'peaceful',
    careLevel: 'beginner',
    minTankSize: 40,
    waterParameters: {
      tempMin: 24,
      tempMax: 28,
      phMin: 7.0,
      phMax: 8.0,
      hardness: 'medium',
    },
    diet: ['Flakes', 'Micro pellets', 'Live foods'],
    breeding: {
      difficulty: 'easy',
      method: 'egg-layer',
      sexualDimorphism: 'الذكور أكثر ألواناً مع زعانف صفراء زاهية ممتدة. الإناث باهتة وأصغر حجماً.',
      spawningTriggers: [
        'نباتات ناعمة (Java Moss)',
        'ضوء الصباح',
        'تغذية بالأطعمة الحية',
        'درجة حرارة 26-27°م'
      ],
      breedingSetup: {
        tankSize: '20-40 لتر',
        waterConditions: 'pH 7.0-8.0، ماء متوسط الصلابة',
        temperature: '26-28°م',
        equipment: ['Java Moss أو Spawning Mop', 'فلتر إسفنجي', 'إضاءة خافتة']
      },
      spawningBehavior: 'الذكور يعرضون زعانفهم الصفراء الجميلة. تضع البيض الصغير بين النباتات الناعمة يومياً.',
      eggCare: 'البيض صغير جداً ويفقس في 7-10 أيام. يمكن ترك البيض في الحوض مع النباتات الكثيفة.',
      fryInfo: {
        firstFood: 'Infusoria صغير جداً لمدة أسبوع، ثم baby brine shrimp',
        growthRate: 'بطيء نسبياً',
        adulthoodTime: '3-4 أشهر'
      },
      tips: [
        'يتكاثرون يومياً تقريباً في الحوض المزروع',
        'الصغار صغيرة جداً - تحتاج طعام دقيق',
        'Java Moss ضروري لحماية البيض',
        'لا تحتاج لحوض منفصل إذا كان الحوض مزروعاً بكثافة',
        'العيون الزرقاء تظهر بعد أسابيع قليلة'
      ]
    },
    schooling: true,
    minimumGroup: 6,
    compatibility: {
      goodWith: ['Small peaceful fish', 'Shrimp', 'Tetras', 'Rasbora'],
      avoidWith: ['Large fish', 'Aggressive fish'],
    },
    description: 'رينبو صغير بعيون زرقاء لامعة وزعانف صفراء. مثالي للأحواض الصغيرة.',
    careTips: [
      'عيون زرقاء لامعة مميزة',
      'سهل التكاثر',
      'يحب النباتات',
      'مناسب للأحواض الصغيرة',
    ],
    image: '/fish/forktail-rainbowfish.png',
    category: 'other',
  },
  {
    id: 'clown-killifish',
    commonName: 'Clown Killifish',
    arabicName: 'كيلي فيش المهرج',
    scientificName: 'Epiplatys annulatus',
    family: 'Nothobranchiidae',
    origin: 'غرب أفريقيا',
    minSize: 3,
    maxSize: 4,
    lifespan: 3,
    temperament: 'peaceful',
    careLevel: 'intermediate',
    minTankSize: 20,
    waterParameters: {
      tempMin: 22,
      tempMax: 26,
      phMin: 6.0,
      phMax: 7.0,
      hardness: 'soft',
    },
    diet: ['Micro foods', 'Live foods', 'Frozen foods'],
    breeding: {
      difficulty: 'easy',
      method: 'egg-layer',
      sexualDimorphism: 'الذكور لديهم ذيل كالصاروخ (شوكي) بألوان أحمر وأزرق مميزة. الإناث ذيلها مستدير وألوانها باهتة.',
      spawningTriggers: [
        'نباتات طافية (Salvinia, Frogbit)',
        'ماء ناعم وحمضي قليلاً',
        'تغذية بالأطعمة الحية الصغيرة',
        'درجة حرارة 24-25°م'
      ],
      breedingSetup: {
        tankSize: '10-20 لتر (نانو)',
        waterConditions: 'pH 6.0-7.0، ماء ناعم (GH 2-5)',
        temperature: '24-26°م',
        equipment: ['نباتات طافية كثيفة', 'فلتر إسفنجي ضعيف', 'إضاءة خافتة']
      },
      spawningBehavior: 'الذكور يعرضون ذيولهم المميزة. تضع الأنثى بيضة أو اثنتين يومياً بين جذور النباتات الطافية.',
      eggCare: 'البيض يفقس في 10-14 يوم. الوالدان لا يأكلان البيض عادة إذا كانت التغذية جيدة.',
      fryInfo: {
        firstFood: 'Infusoria وparamecium لأسبوع، ثم baby brine shrimp',
        growthRate: 'متوسط',
        adulthoodTime: '3-4 أشهر'
      },
      tips: [
        'تتكاثر باستمرار في الحوض المناسب',
        'النباتات الطافية ضرورية',
        'تعيش عند السطح - الطعام يجب أن يطفو',
        'ذيل الذكر المميز هو علامة النضج',
        'لا تحتاج لحوض منفصل مع النباتات الكثيفة'
      ]
    },
    schooling: false,
    minimumGroup: 3,
    compatibility: {
      goodWith: ['Small peaceful fish', 'Shrimp', 'Ember Tetra'],
      avoidWith: ['Large fish', 'Fast aggressive fish'],
    },
    description: 'سمكة صغيرة جميلة بخطوط ملونة وذيل كالصاروخ. مثالية للنانو.',
    careTips: [
      'صغيرة جداً - مثالية للنانو',
      'ذيل الذكر كالصاروخ',
      'تعيش عند السطح',
      'سهلة التكاثر نسبياً',
    ],
    image: '/fish/clown-killifish.png',
    category: 'other',
  },
  {
    id: 'pygmy-corydoras',
    commonName: 'Pygmy Corydoras',
    arabicName: 'كوريدوراس قزم',
    scientificName: 'Corydoras pygmaeus',
    family: 'Callichthyidae',
    origin: 'البرازيل - نهر ماديرا',
    minSize: 2,
    maxSize: 3,
    lifespan: 3,
    temperament: 'peaceful',
    careLevel: 'beginner',
    minTankSize: 30,
    waterParameters: {
      tempMin: 22,
      tempMax: 26,
      phMin: 6.5,
      phMax: 7.5,
      hardness: 'soft',
    },
    diet: ['Micro pellets', 'Crushed flakes', 'Baby brine shrimp'],
    breeding: {
      difficulty: 'moderate',
      method: 'egg-layer',
      sexualDimorphism: 'الإناث أكبر وأكثر استدارة عند النظر من الأعلى. الذكور أنحف وأصغر قليلاً.',
      spawningTriggers: [
        'تغيير ماء كبير (50%) بماء أبرد بدرجتين',
        'تغذية مكثفة بالأطعمة الحية',
        'انخفاض الضغط الجوي',
        'نسبة 2 ذكور لكل أنثى'
      ],
      breedingSetup: {
        tankSize: '20-30 لتر',
        waterConditions: 'pH 6.5-7.0، ماء ناعم (GH 2-6)',
        temperature: '23-25°م',
        equipment: ['رمل ناعم جداً', 'Java Moss', 'نباتات ناعمة', 'فلتر إسفنجي']
      },
      spawningBehavior: 'مشابه للكوريدوراس الآخرين لكن أصغر. الأنثى تحمل البيض بين زعانفها البطنية وتلصقه على النباتات والزجاج.',
      eggCare: 'البيض صغير جداً (1-2 مم). يفقس في 3-4 أيام. يمكن نقل البيض لحوض صغار.',
      fryInfo: {
        firstFood: 'Infusoria صغير جداً أو طعام سائل للصغار، ثم baby brine shrimp حديث الفقس',
        growthRate: 'بطيء - تبقى صغيرة جداً',
        adulthoodTime: '6-8 أشهر'
      },
      tips: [
        'البيض والصغار صغيرة جداً - صعب رؤيتها!',
        'الماء البارد يحفز التكاثر كما في الكوريدوراس الآخرين',
        'يمكن أن تتكاثر في الحوض المجتمعي مع نباتات كثيفة',
        'الصغار تسبح في الوسط وليس القاع',
        'أصعب قليلاً من الكوريدوراس العادية بسبب صغر حجم الصغار'
      ]
    },
    schooling: true,
    minimumGroup: 8,
    compatibility: {
      goodWith: ['Small peaceful fish', 'Shrimp', 'Ember Tetra', 'Chili Rasbora'],
      avoidWith: ['Any large fish'],
    },
    description: 'أصغر الكوريدوراس! يسبح في منتصف الحوض وليس القاع فقط.',
    careTips: [
      'أصغر كوريدوراس - 3 سم فقط',
      'يسبح في الوسط أيضاً',
      'يحتاج لعدد كبير (8+)',
      'مثالي للنانو',
    ],
    image: '/fish/pygmy-corydoras.png',
    category: 'catfish',
  },
  // === INVERTEBRATES (القشريات واللافقاريات) ===
  {
    id: 'cherry-shrimp',
    commonName: 'Cherry Shrimp',
    arabicName: 'جمبري الكرز',
    scientificName: 'Neocaridina davidi',
    family: 'Atyidae',
    origin: 'تايوان',
    minSize: 1.5,
    maxSize: 3,
    lifespan: 2,
    temperament: 'peaceful',
    careLevel: 'beginner',
    minTankSize: 20,
    waterParameters: {
      tempMin: 18,
      tempMax: 28,
      phMin: 6.5,
      phMax: 8.0,
      hardness: 'medium',
    },
    diet: ['Algae', 'Biofilm', 'Shrimp pellets', 'Blanched vegetables', 'Decaying plant matter'],
    breeding: {
      difficulty: 'easy',
      method: 'egg-layer',
      sexualDimorphism: 'الإناث أكبر وأكثر لوناً مع منحنى في البطن (سرج البيض). الذكور أصغر وأقل لوناً.',
      spawningTriggers: [
        'جودة ماء ممتازة',
        'درجة حرارة مستقرة 22-25°م',
        'وجود ذكور وإناث ناضجين',
        'تغذية متنوعة'
      ],
      breedingSetup: {
        tankSize: '20+ لتر',
        waterConditions: 'pH 7.0-7.5، GH 6-8',
        temperature: '22-25°م',
        equipment: ['فلتر إسفنجي (ضروري!)', 'نباتات كثيفة', 'طحالب Java Moss']
      },
      spawningBehavior: 'الأنثى تحمل البيض الأخضر/الأصفر تحت بطنها لمدة 3-4 أسابيع.',
      eggCare: 'الأنثى تهوي البيض بأرجلها. لا تحتاج لتدخل. الصغار mini versions من الكبار.',
      fryInfo: {
        firstFood: 'طحالب، biofilm، طعام الكبار المطحون ناعماً',
        growthRate: 'بطيء - 1-2 شهر للوصول لحجم مرئي',
        adulthoodTime: '3-5 أشهر'
      },
      tips: [
        'الفلتر الإسفنجي ضروري لحماية الصغار!',
        'لا تستخدم فلاتر قوية - ستسحب الصغار',
        'Java Moss الأفضل لاختباء الصغار',
        'تتكاثر بسرعة في الظروف الجيدة'
      ]
    },
    schooling: true,
    minimumGroup: 10,
    compatibility: {
      goodWith: ['Other shrimp', 'Snails', 'Nano fish', 'Otocinclus'],
      avoidWith: ['Any fish big enough to eat them', 'Bettas', 'Gouramis', 'Cichlids'],
    },
    description: 'جمبري أحمر زاهي ممتاز لتنظيف الطحالب والبقايا. سهل التربية والتكاثر.',
    careTips: [
      'حساس للنحاس - تجنب أدوية السمك',
      'يحتاج لفلتر إسفنجي لحماية الصغار',
      'يأكل الطحالب ويحافظ على نظافة الحوض',
      'يتكاثر بسرعة في الظروف الجيدة',
    ],
    image: '/fish/cherry-shrimp.png',
    category: 'invertebrate',
  },
  {
    id: 'amano-shrimp',
    commonName: 'Amano Shrimp',
    arabicName: 'جمبري أمانو',
    scientificName: 'Caridina multidentata',
    family: 'Atyidae',
    origin: 'اليابان، تايوان',
    minSize: 3,
    maxSize: 6,
    lifespan: 3,
    temperament: 'peaceful',
    careLevel: 'beginner',
    minTankSize: 40,
    waterParameters: {
      tempMin: 18,
      tempMax: 26,
      phMin: 6.5,
      phMax: 7.5,
      hardness: 'medium',
    },
    diet: ['Algae', 'Biofilm', 'Shrimp pellets', 'Dead plant matter', 'Soft algae'],
    breeding: {
      difficulty: 'expert',
      method: 'egg-layer',
      sexualDimorphism: 'الإناث أكبر بكثير مع خطوط منقطة. الذكور أصغر مع خطوط متصلة.',
      spawningTriggers: [
        'ظروف مائية مثالية',
        'تغذية عالية الجودة',
        'إناث ناضجة'
      ],
      breedingSetup: {
        tankSize: 'حوض ماء عذب للوالدين + حوض ماء مالح للصغار',
        waterConditions: 'المياه العذبة للوالدين، الماء المالح للصغار',
        temperature: '22-24°م',
        equipment: ['ملح بحري', 'مضخة هواء', 'طعام planktonic']
      },
      spawningBehavior: 'الأنثى تحمل البيض 5-6 أسابيع. تطلق اليرقات التي تحتاج للماء المالح.',
      eggCare: 'اليرقات تحتاج للماء المالح للنمو! صعب جداً في المنزل.',
      fryInfo: {
        firstFood: 'Phytoplankton، طحالب مجهرية',
        growthRate: 'بطيء جداً',
        adulthoodTime: '4-6 أشهر في الماء المالح'
      },
      tips: [
        'تكاثره شبه مستحيل في المنزل',
        'اليرقات تحتاج لانتقال تدريجي للماء المالح',
        'معظم الناس يشترون بدلاً من التكاثر',
        'أحد أفضل آكلي الطحالب'
      ]
    },
    schooling: true,
    minimumGroup: 6,
    compatibility: {
      goodWith: ['Peaceful fish', 'Other shrimp', 'Snails'],
      avoidWith: ['Large Cichlids', 'Bettas', 'Aggressive fish'],
    },
    description: 'أفضل جمبري لأكل الطحالب! قوي وكبير الحجم نسبياً.',
    careTips: [
      'ملك آكلي الطحالب',
      'أكبر من Cherry Shrimp',
      'لا يتكاثر في الماء العذب',
      'يمكنه القفز - غطِّ الحوض!',
    ],
    image: '/fish/amano-shrimp.png',
    category: 'invertebrate',
  },
  {
    id: 'blue-dream-shrimp',
    commonName: 'Blue Dream Shrimp',
    arabicName: 'جمبري الحلم الأزرق',
    scientificName: 'Neocaridina davidi var. Blue',
    family: 'Atyidae',
    origin: 'تايوان (تربية انتقائية)',
    minSize: 1.5,
    maxSize: 3,
    lifespan: 2,
    temperament: 'peaceful',
    careLevel: 'beginner',
    minTankSize: 20,
    waterParameters: {
      tempMin: 18,
      tempMax: 28,
      phMin: 6.5,
      phMax: 8.0,
      hardness: 'medium',
    },
    diet: ['Algae', 'Biofilm', 'Shrimp pellets', 'Blanched vegetables'],
    breeding: {
      difficulty: 'easy',
      method: 'egg-layer',
      sexualDimorphism: 'الإناث أكبر وأكثر لوناً. الذكور أصغر.',
      spawningTriggers: [
        'جودة ماء ممتازة',
        'درجة حرارة مستقرة',
        'تغذية جيدة'
      ],
      breedingSetup: {
        tankSize: '20+ لتر',
        waterConditions: 'pH 7.0-7.5، GH 6-8',
        temperature: '22-25°م',
        equipment: ['فلتر إسفنجي', 'Java Moss']
      },
      spawningBehavior: 'مثل Cherry Shrimp - الأنثى تحمل البيض 3-4 أسابيع.',
      eggCare: 'لا تحتاج لتدخل. الصغار نسخ مصغرة.',
      fryInfo: {
        firstFood: 'Biofilm، طحالب',
        growthRate: 'بطيء',
        adulthoodTime: '3-5 أشهر'
      },
      tips: [
        'لا تخلط مع ألوان أخرى من Neocaridina',
        'التهجين يعطي لون بني/بري',
        'سهل التربية مثل Cherry Shrimp'
      ]
    },
    schooling: true,
    minimumGroup: 10,
    compatibility: {
      goodWith: ['Other shrimp (same color!)', 'Snails', 'Nano fish'],
      avoidWith: ['Different colored shrimp', 'Predatory fish'],
    },
    description: 'لون أزرق مذهل! نفس متطلبات Cherry Shrimp.',
    careTips: [
      'لون أزرق رائع',
      'لا تخلط مع ألوان أخرى',
      'سهل التربية',
      'يأكل الطحالب',
    ],
    image: '/fish/blue-dream-shrimp.png',
    category: 'invertebrate',
  },
  {
    id: 'crystal-red-shrimp',
    commonName: 'Crystal Red Shrimp',
    arabicName: 'جمبري الكريستال الأحمر',
    scientificName: 'Caridina cantonensis',
    family: 'Atyidae',
    origin: 'الصين، هونغ كونغ',
    minSize: 2,
    maxSize: 3,
    lifespan: 2,
    temperament: 'peaceful',
    careLevel: 'advanced',
    minTankSize: 20,
    waterParameters: {
      tempMin: 18,
      tempMax: 24,
      phMin: 5.8,
      phMax: 6.8,
      hardness: 'soft',
    },
    diet: ['Biofilm', 'Shrimp pellets', 'Blanched vegetables', 'Mineral supplements'],
    breeding: {
      difficulty: 'moderate',
      method: 'egg-layer',
      sexualDimorphism: 'الإناث أكبر مع سرج بيض مرئي.',
      spawningTriggers: [
        'ماء ناعم وحمضي مستقر',
        'درجة حرارة ثابتة 20-22°م',
        'تغذية عالية الجودة'
      ],
      breedingSetup: {
        tankSize: '40+ لتر',
        waterConditions: 'pH 6.0-6.5، GH 4-6، TDS 100-150',
        temperature: '20-22°م',
        equipment: ['ماء RO مع تمعدن', 'فلتر إسفنجي', 'قاع نشط (active substrate)']
      },
      spawningBehavior: 'الأنثى تحمل 20-30 بيضة لمدة 4-5 أسابيع.',
      eggCare: 'حساس جداً لتقلبات المياه. استقرار المعلمات ضروري.',
      fryInfo: {
        firstFood: 'Biofilm، مسحوق غذائي خاص',
        growthRate: 'بطيء جداً',
        adulthoodTime: '4-6 أشهر'
      },
      tips: [
        'حساس جداً للتغيرات المائية',
        'يحتاج لماء RO مع تمعدن',
        'لا للنحاس أو المعادن الثقيلة!',
        'التربية تحتاج لخبرة'
      ]
    },
    schooling: true,
    minimumGroup: 10,
    compatibility: {
      goodWith: ['Other Caridina', 'Snails', 'Peaceful nano fish'],
      avoidWith: ['Neocaridina', 'Any fish', 'Fluctuating parameters'],
    },
    description: 'جمبري فاخر بنمط أبيض وأحمر مذهل. يحتاج لخبرة.',
    careTips: [
      'يحتاج لماء ناعم وحمضي',
      'حساس جداً للتغيرات',
      'لا للنحاس!',
      'ثمنه مرتفع نسبياً',
    ],
    image: '/fish/crystal-red-shrimp.png',
    category: 'invertebrate',
  },
  {
    id: 'blue-crayfish',
    commonName: 'Blue Crayfish / Blue Lobster',
    arabicName: 'جراد البحر الأزرق / اللوبستر الأزرق',
    scientificName: 'Procambarus alleni',
    family: 'Cambaridae',
    origin: 'فلوريدا، الولايات المتحدة',
    minSize: 10,
    maxSize: 15,
    lifespan: 5,
    temperament: 'aggressive',
    careLevel: 'intermediate',
    minTankSize: 80,
    waterParameters: {
      tempMin: 18,
      tempMax: 26,
      phMin: 6.5,
      phMax: 8.0,
      hardness: 'hard',
    },
    diet: ['Sinking pellets', 'Vegetables', 'Protein (fish, shrimp)', 'Calcium supplements'],
    breeding: {
      difficulty: 'moderate',
      method: 'egg-layer',
      sexualDimorphism: 'الذكور لديهم مخالب أكبر وأرجل تناسلية معدلة. الإناث لديهن بطن أوسع.',
      spawningTriggers: [
        'ذكر وأنثى ناضجين',
        'تغذية عالية البروتين',
        'ارتفاع طفيف في الحرارة',
        'جودة ماء جيدة'
      ],
      breedingSetup: {
        tankSize: '100+ لتر',
        waterConditions: 'pH 7.0-7.5، ماء صلب للصدفة',
        temperature: '22-24°م',
        equipment: ['مخابئ كثيرة', 'كالسيوم', 'فلتر قوي']
      },
      spawningBehavior: 'التزاوج قد يكون عنيفاً. الأنثى تحمل البيض تحت ذيلها لمدة 4-6 أسابيع.',
      eggCare: 'الأنثى تحرس البيض. اعزلها لحماية الصغار.',
      fryInfo: {
        firstFood: 'طعام الكبار المطحون، خضروات مسلوقة',
        growthRate: 'متوسط - يحتاجون للانسلاخ',
        adulthoodTime: '6-12 شهر'
      },
      tips: [
        'الذكور قد يقتلون بعضهم!',
        'الكالسيوم ضروري لصحة الصدفة',
        'أثناء الانسلاخ يكونون ضعفاء جداً',
        'قد يأكلون الأسماك البطيئة!'
      ]
    },
    schooling: false,
    minimumGroup: 1,
    compatibility: {
      goodWith: ['Large fast fish (with caution)', 'Giant Danios'],
      avoidWith: ['Small fish', 'Shrimp', 'Snails', 'Bottom dwellers', 'Other crayfish'],
    },
    description: 'كائن مثير بلون أزرق كهربائي! عدواني ويحتاج لحوض منفرد.',
    careTips: [
      'عدواني - يأكل أي شيء يمسكه!',
      'يحتاج للكالسيوم للصدفة',
      'يحفر ويعيد ترتيب الحوض',
      'يهرب - غطِّ الحوض جيداً!',
    ],
    image: '/fish/blue-crayfish.png',
    category: 'invertebrate',
  },
  {
    id: 'dwarf-orange-crayfish',
    commonName: 'Dwarf Orange Crayfish',
    arabicName: 'جراد قزم برتقالي',
    scientificName: 'Cambarellus patzcuarensis',
    family: 'Cambaridae',
    origin: 'المكسيك',
    minSize: 3,
    maxSize: 5,
    lifespan: 2,
    temperament: 'semi-aggressive',
    careLevel: 'beginner',
    minTankSize: 40,
    waterParameters: {
      tempMin: 18,
      tempMax: 26,
      phMin: 6.5,
      phMax: 8.0,
      hardness: 'medium',
    },
    diet: ['Sinking pellets', 'Vegetables', 'Algae wafers', 'Occasional protein'],
    breeding: {
      difficulty: 'moderate',
      method: 'egg-layer',
      sexualDimorphism: 'الذكور أنحف مع مخالب أطول. الإناث أوسع في منطقة البطن.',
      spawningTriggers: [
        'درجة حرارة مستقرة',
        'تغذية عالية البروتين',
        'جودة ماء جيدة'
      ],
      breedingSetup: {
        tankSize: '40+ لتر',
        waterConditions: 'pH 7.0-8.0، ماء متوسط الصلابة',
        temperature: '22-24°م',
        equipment: ['مخابئ صغيرة', 'نباتات كثيفة', 'فلتر إسفنجي']
      },
      spawningBehavior: 'الأنثى تحمل 20-40 بيضة لمدة 3-4 أسابيع.',
      eggCare: 'اعزل الأنثى الحامل. الصغار مستقلون فوراً.',
      fryInfo: {
        firstFood: 'طعام الكبار المطحون',
        growthRate: 'سريع نسبياً',
        adulthoodTime: '3-4 أشهر'
      },
      tips: [
        'أقل عدوانية من الجراد الكبير',
        'يمكن تربيته مع أسماك سريعة',
        'لا يزعج النباتات كثيراً',
        'لون برتقالي جميل'
      ]
    },
    schooling: false,
    minimumGroup: 1,
    compatibility: {
      goodWith: ['Fast mid-level fish', 'Large shrimp (with caution)'],
      avoidWith: ['Small shrimp', 'Slow fish', 'Other crayfish'],
    },
    description: 'جراد صغير برتقالي لطيف! أقل عدوانية من الأنواع الكبيرة.',
    careTips: [
      'صغير وملون',
      'أقل تدميراً من الجراد الكبير',
      'يحتاج لمخابئ',
      'لا تضع أكثر من واحد',
    ],
    image: '/fish/dwarf-orange-crayfish.png',
    category: 'invertebrate',
  },
  {
    id: 'mystery-snail',
    commonName: 'Mystery Snail / Apple Snail',
    arabicName: 'حلزون الغموض / حلزون التفاح',
    scientificName: 'Pomacea bridgesii',
    family: 'Ampullariidae',
    origin: 'أمريكا الجنوبية',
    minSize: 3,
    maxSize: 6,
    lifespan: 2,
    temperament: 'peaceful',
    careLevel: 'beginner',
    minTankSize: 40,
    waterParameters: {
      tempMin: 20,
      tempMax: 28,
      phMin: 7.0,
      phMax: 8.5,
      hardness: 'hard',
    },
    diet: ['Algae', 'Vegetables', 'Calcium supplements', 'Leftover fish food', 'Algae wafers'],
    breeding: {
      difficulty: 'easy',
      method: 'egg-layer',
      sexualDimorphism: 'صعب التفريق. يحتاج لمراقبة السلوك أو فحص الفتحة التناسلية.',
      spawningTriggers: [
        'درجة حرارة 24-28°م',
        'تغذية جيدة بالكالسيوم',
        'مستوى ماء منخفض قليلاً (للبيض)'
      ],
      breedingSetup: {
        tankSize: '40+ لتر',
        waterConditions: 'pH 7.5+، ماء صلب (كالسيوم ضروري!)',
        temperature: '24-28°م',
        equipment: ['فراغ 5-10 سم فوق الماء للبيض', 'كالسيوم']
      },
      spawningBehavior: 'الأنثى تضع كتلة بيض وردية/بيضاء فوق مستوى الماء.',
      eggCare: 'البيض يحتاج للهواء الرطب. لا تغمره! يفقس في 2-4 أسابيع.',
      fryInfo: {
        firstFood: 'طحالب، خضروات مسلوقة',
        growthRate: 'متوسط',
        adulthoodTime: '2-4 أشهر'
      },
      tips: [
        'البيض يجب أن يكون فوق الماء!',
        'لا تلمس البيض كثيراً',
        'الصغار صغيرة جداً في البداية',
        'كثير منهم يعني الكثير من الحلزونات!'
      ]
    },
    schooling: false,
    minimumGroup: 1,
    compatibility: {
      goodWith: ['Most peaceful fish', 'Shrimp', 'Other snails'],
      avoidWith: ['Pufferfish', 'Loaches (eat snails)', 'Assassin snails'],
    },
    description: 'حلزون كبير ملون (ذهبي، أزرق، بنفسجي). ينظف الطحالب ولا يأكل النباتات.',
    careTips: [
      'يحتاج للكالسيوم لصحة الصدفة',
      'لا يأكل النباتات الحية السليمة',
      'يتنفس الهواء - يصعد للسطح',
      'ألوان متعددة متاحة',
    ],
    image: '/fish/mystery-snail.png',
    category: 'invertebrate',
  },
  {
    id: 'nerite-snail',
    commonName: 'Nerite Snail',
    arabicName: 'حلزون نيريت',
    scientificName: 'Neritina sp.',
    family: 'Neritidae',
    origin: 'أفريقيا، آسيا',
    minSize: 1.5,
    maxSize: 3,
    lifespan: 2,
    temperament: 'peaceful',
    careLevel: 'beginner',
    minTankSize: 20,
    waterParameters: {
      tempMin: 18,
      tempMax: 28,
      phMin: 7.0,
      phMax: 8.5,
      hardness: 'hard',
    },
    diet: ['Algae (primary)', 'Biofilm', 'Algae wafers'],
    breeding: {
      difficulty: 'expert',
      method: 'egg-layer',
      sexualDimorphism: 'لا يوجد فرق مرئي.',
      spawningTriggers: [
        'ظروف مائية جيدة',
        'طحالب كافية'
      ],
      breedingSetup: {
        tankSize: 'يضع بيض في الماء العذب',
        waterConditions: 'يحتاج لماء مالح/قليل الملوحة للفقس',
        temperature: '24-26°م',
        equipment: ['ماء مالح منفصل للفقس']
      },
      spawningBehavior: 'يضع بيض أبيض صلب على الزجاج والديكور.',
      eggCare: 'البيض لا يفقس في الماء العذب! يحتاج لماء قليل الملوحة.',
      fryInfo: {
        firstFood: 'Phytoplankton',
        growthRate: 'بطيء جداً',
        adulthoodTime: 'أشهر عديدة'
      },
      tips: [
        'لا يتكاثر في الماء العذب عادةً',
        'البيض يظل ملتصقاً لأسابيع/أشهر',
        'البيض غير ضار لكنه غير جمالي',
        'أفضل آكل طحالب!'
      ]
    },
    schooling: false,
    minimumGroup: 2,
    compatibility: {
      goodWith: ['All peaceful fish', 'Shrimp', 'Other snails'],
      avoidWith: ['Pufferfish', 'Loaches'],
    },
    description: 'أفضل حلزون لأكل الطحالب! لا يتكاثر في الماء العذب.',
    careTips: [
      'ملك آكلي الطحالب',
      'لا يتكاثر في الماء العذب',
      'أنماط صدفة جميلة ومتنوعة',
      'يحتاج لماء صلب للصدفة',
    ],
    image: '/fish/nerite-snail.png',
    category: 'invertebrate',
  },
  {
    id: 'ramshorn-snail',
    commonName: 'Ramshorn Snail',
    arabicName: 'حلزون قرن الكبش',
    scientificName: 'Planorbella duryi',
    family: 'Planorbidae',
    origin: 'أمريكا الشمالية (منتشر عالمياً)',
    minSize: 0.5,
    maxSize: 3,
    lifespan: 1,
    temperament: 'peaceful',
    careLevel: 'beginner',
    minTankSize: 10,
    waterParameters: {
      tempMin: 18,
      tempMax: 28,
      phMin: 6.5,
      phMax: 8.0,
      hardness: 'medium',
    },
    diet: ['Algae', 'Dead plant matter', 'Leftover food', 'Vegetables'],
    breeding: {
      difficulty: 'easy',
      method: 'egg-layer',
      sexualDimorphism: 'خنثى - كل حلزون ذكر وأنثى معاً!',
      spawningTriggers: [
        'وجود حلزون آخر',
        'طعام كافي',
        'ظروف دافئة'
      ],
      breedingSetup: {
        tankSize: 'أي حجم',
        waterConditions: 'أي معلمات مقبولة',
        temperature: '22-26°م',
        equipment: ['لا شيء خاص!']
      },
      spawningBehavior: 'كل حلزون يمكنه وضع البيض! يضع كتل جيلاتينية شفافة.',
      eggCare: 'لا تحتاج رعاية. يفقس في 2-3 أسابيع.',
      fryInfo: {
        firstFood: 'طحالب، فضلات',
        growthRate: 'سريع جداً',
        adulthoodTime: '4-6 أسابيع'
      },
      tips: [
        'يتكاثر بسرعة مجنونة!',
        'قد يصبح آفة إذا أفرطت بالتغذية',
        'تحكم بالأعداد عبر التغذية',
        'طعام رائع للبوفر واللوتش!'
      ]
    },
    schooling: false,
    minimumGroup: 2,
    compatibility: {
      goodWith: ['Everything'],
      avoidWith: ['Pufferfish', 'Loaches', 'Assassin snails'],
    },
    description: 'حلزون صغير جميل بألوان متنوعة. قد يتكاثر بكثرة!',
    careTips: [
      'يتكاثر بسرعة - تحكم بالتغذية!',
      'ألوان: أحمر، أزرق، وردي، بني',
      'منظف ممتاز للفضلات',
      'خنثى - أي اثنين ينتجان صغار',
    ],
    image: '/fish/ramshorn-snail.png',
    category: 'invertebrate',
  },
  {
    id: 'assassin-snail',
    commonName: 'Assassin Snail',
    arabicName: 'حلزون القاتل',
    scientificName: 'Clea helena',
    family: 'Buccinidae',
    origin: 'جنوب شرق آسيا',
    minSize: 2,
    maxSize: 3,
    lifespan: 3,
    temperament: 'semi-aggressive',
    careLevel: 'beginner',
    minTankSize: 30,
    waterParameters: {
      tempMin: 18,
      tempMax: 28,
      phMin: 6.5,
      phMax: 8.0,
      hardness: 'medium',
    },
    diet: ['Other snails', 'Protein foods', 'Sinking pellets', 'Dead fish/shrimp'],
    breeding: {
      difficulty: 'moderate',
      method: 'egg-layer',
      sexualDimorphism: 'لا يوجد فرق مرئي. يحتاج لذكر وأنثى (ليس خنثى).',
      spawningTriggers: [
        'تغذية جيدة بالبروتين',
        'درجة حرارة 25-27°م',
        'وجود زوج (ذكر وأنثى)'
      ],
      breedingSetup: {
        tankSize: '30+ لتر',
        waterConditions: 'pH 7.0-7.5، ماء متوسط الصلابة',
        temperature: '25-27°م',
        equipment: ['قاع رملي للحفر', 'فلتر إسفنجي']
      },
      spawningBehavior: 'يضع بيضة واحدة في كبسولة صلبة مربعة الشكل.',
      eggCare: 'البيض يفقس في 4-8 أسابيع. الصغار يختبئون في القاع.',
      fryInfo: {
        firstFood: 'حلزونات صغيرة، بقايا بروتينية',
        growthRate: 'بطيء جداً',
        adulthoodTime: '6-8 أشهر'
      },
      tips: [
        'بطيء في التكاثر - جيد!',
        'كل بيضة منفصلة في كبسولة',
        'الصغار يبقون مدفونين لأسابيع',
        'لا يتكاثر بشكل مزعج'
      ]
    },
    schooling: false,
    minimumGroup: 3,
    compatibility: {
      goodWith: ['Fish', 'Shrimp', 'Large snails (Mystery, Nerite)'],
      avoidWith: ['Small pest snails (will eat them)', 'Trumpet snails'],
    },
    description: 'الحل الطبيعي لمشكلة الحلزونات! يصطاد ويأكل الحلزونات الصغيرة.',
    careTips: [
      'يأكل الحلزونات المزعجة',
      'يحتاج لقاع رملي للحفر',
      'بطيء الحركة والتكاثر',
      'إذا نفدت الحلزونات يأكل البروتين',
    ],
    image: '/fish/assassin-snail.png',
    category: 'invertebrate',
  },
  {
    id: 'malaysian-trumpet-snail',
    commonName: 'Malaysian Trumpet Snail',
    arabicName: 'حلزون البوق الماليزي',
    scientificName: 'Melanoides tuberculata',
    family: 'Thiaridae',
    origin: 'أفريقيا وآسيا',
    minSize: 1,
    maxSize: 3,
    lifespan: 2,
    temperament: 'peaceful',
    careLevel: 'beginner',
    minTankSize: 10,
    waterParameters: {
      tempMin: 18,
      tempMax: 30,
      phMin: 6.5,
      phMax: 8.5,
      hardness: 'medium',
    },
    diet: ['Detritus', 'Algae', 'Dead plant matter', 'Leftover food'],
    breeding: {
      difficulty: 'easy',
      method: 'live-bearer',
      sexualDimorphism: 'يتكاثر بالتوالد العذري - الأنثى تنتج نسخ منها بدون ذكر!',
      spawningTriggers: [
        'وجود طعام كافي',
        'درجة حرارة دافئة',
        'قاع ناعم للحفر'
      ],
      breedingSetup: {
        tankSize: 'أي حجم',
        waterConditions: 'أي معلمات تقريباً',
        temperature: '24-28°م',
        equipment: ['لا شيء خاص']
      },
      spawningBehavior: 'تلد أنثى مستنسخة جاهزة! لا يحتاج لذكر.',
      eggCare: 'لا بيض - ولادة مباشرة لصغار كاملين.',
      fryInfo: {
        firstFood: 'فضلات وطحالب من القاع',
        growthRate: 'متوسط',
        adulthoodTime: '2-3 أشهر'
      },
      tips: [
        'سيتكاثر بجنون إذا كان هناك طعام زائد!',
        'تحكم بالأعداد عبر تقليل الطعام',
        'مفيد جداً لصحة القاع',
        'يحفر القاع ويمنع الغازات السامة'
      ]
    },
    schooling: false,
    minimumGroup: 5,
    compatibility: {
      goodWith: ['All peaceful fish', 'Shrimp', 'Plants'],
      avoidWith: ['Assassin snails', 'Loaches', 'Pufferfish'],
    },
    description: 'فريق تنظيف مجاني! يحفر القاع ويأكل الفضلات. قد يتكاثر بكثرة.',
    careTips: [
      'يعيش في القاع ويحفره',
      'يمنع تراكم الغازات السامة',
      'ليلي - يختبئ نهاراً',
      'قد يصبح آفة - تحكم بالتغذية!',
    ],
    image: '/fish/malaysian-trumpet-snail.png',
    category: 'invertebrate',
  },
  {
    id: 'japanese-trapdoor-snail',
    commonName: 'Japanese Trapdoor Snail',
    arabicName: 'الحلزون الياباني',
    scientificName: 'Cipangopaludina japonica',
    family: 'Viviparidae',
    origin: 'اليابان وشرق آسيا',
    minSize: 4,
    maxSize: 6,
    lifespan: 5,
    temperament: 'peaceful',
    careLevel: 'beginner',
    minTankSize: 40,
    waterParameters: {
      tempMin: 10,
      tempMax: 26,
      phMin: 6.5,
      phMax: 8.0,
      hardness: 'medium',
    },
    diet: ['Algae', 'Dead plant matter', 'Algae wafers', 'Vegetables'],
    breeding: {
      difficulty: 'moderate',
      method: 'live-bearer',
      sexualDimorphism: 'الذكور أصغر مع فتحة معدلة على الأنتينا اليمنى.',
      spawningTriggers: [
        'درجة حرارة 20-24°م',
        'تغذية جيدة',
        'فترة راحة شتوية (اختياري)'
      ],
      breedingSetup: {
        tankSize: '40+ لتر',
        waterConditions: 'pH 7.0-8.0، ماء متوسط الصلابة',
        temperature: '20-24°م',
        equipment: ['نباتات', 'كالسيوم']
      },
      spawningBehavior: 'تلد صغار كاملين (1-20 صغير في السنة).',
      eggCare: 'لا بيض - ولادة مباشرة. الصغار نسخ مصغرة.',
      fryInfo: {
        firstFood: 'طحالب وفضلات',
        growthRate: 'بطيء جداً',
        adulthoodTime: '1-2 سنة'
      },
      tips: [
        'بطيء جداً في التكاثر - لن يصبح آفة!',
        'يحتاج لماء بارد نسبياً',
        'طويل العمر مقارنة بالحلزونات الأخرى',
        'ممتاز للأحواض الباردة'
      ]
    },
    schooling: false,
    minimumGroup: 2,
    compatibility: {
      goodWith: ['Goldfish', 'Koi', 'Peaceful community fish'],
      avoidWith: ['Tropical fish (too warm)', 'Loaches', 'Pufferfish'],
    },
    description: 'حلزون هادئ وكبير. مثالي للأحواض الباردة مع الأسماك الذهبية.',
    careTips: [
      'يتحمل البرد - مثالي للأحواض غير المُدفأة',
      'لا يتكاثر بكثرة أبداً',
      'يغلق بابه عند الخطر (trapdoor)',
      'طويل العمر (5+ سنوات)',
    ],
    image: '/fish/japanese-trapdoor-snail.png',
    category: 'invertebrate',
  },
  {
    id: 'rabbit-snail',
    commonName: 'Rabbit Snail',
    arabicName: 'حلزون الأرنب',
    scientificName: 'Tylomelania sp.',
    family: 'Pachychilidae',
    origin: 'إندونيسيا (سولاويسي)',
    minSize: 5,
    maxSize: 12,
    lifespan: 3,
    temperament: 'peaceful',
    careLevel: 'intermediate',
    minTankSize: 80,
    waterParameters: {
      tempMin: 26,
      tempMax: 30,
      phMin: 7.5,
      phMax: 8.5,
      hardness: 'hard',
    },
    diet: ['Algae', 'Vegetables', 'Sinking pellets', 'Calcium supplements'],
    breeding: {
      difficulty: 'moderate',
      method: 'live-bearer',
      sexualDimorphism: 'صعب التفريق. الإناث قد تكون أكبر قليلاً.',
      spawningTriggers: [
        'درجة حرارة 28-30°م',
        'ماء صلب وقلوي',
        'تغذية جيدة بالكالسيوم'
      ],
      breedingSetup: {
        tankSize: '80+ لتر',
        waterConditions: 'pH 8.0+، ماء صلب جداً',
        temperature: '28-30°م',
        equipment: ['كالسيوم', 'قاع رملي', 'خشب']
      },
      spawningBehavior: 'تلد صغير واحد كبير كل 4-6 أسابيع.',
      eggCare: 'لا بيض - الصغير يولد كبيراً وجاهزاً.',
      fryInfo: {
        firstFood: 'طعام الكبار',
        growthRate: 'بطيء',
        adulthoodTime: '1-2 سنة'
      },
      tips: [
        'تلد صغير واحد فقط كل شهر!',
        'الصغار كبيرون عند الولادة (1 سم)',
        'تحتاج لماء دافئ وصلب',
        'بطيئة الحركة ولطيفة جداً'
      ]
    },
    schooling: false,
    minimumGroup: 2,
    compatibility: {
      goodWith: ['Peaceful tropical fish', 'Shrimp', 'Other snails'],
      avoidWith: ['Cold water fish', 'Loaches', 'Pufferfish'],
    },
    description: 'حلزون فريد بوجه يشبه الأرنب! ألوان متنوعة (أصفر، برتقالي، شوكولاتة).',
    careTips: [
      'وجه مميز يشبه الأرنب',
      'يحتاج لماء دافئ جداً (26-30°م)',
      'بطيء ولطيف وممتع للمشاهدة',
      'ألوان متعددة متاحة',
    ],
    image: '/fish/rabbit-snail.png',
    category: 'invertebrate',
  },
];

export function getFishById(id: string): FishSpecies | undefined {
  return freshwaterFish.find(fish => fish.id === id);
}

export function getFishByCategory(category: string): FishSpecies[] {
  return freshwaterFish.filter(fish => fish.category === category);
}

export function getFishByCareLevel(careLevel: string): FishSpecies[] {
  return freshwaterFish.filter(fish => fish.careLevel === careLevel);
}

export function checkCompatibility(fish1Id: string, fish2Id: string): boolean {
  const fish1 = getFishById(fish1Id);
  const fish2 = getFishById(fish2Id);

  if (!fish1 || !fish2) return false;

  // Check if fish2 is in fish1's avoid list
  if (fish1.compatibility.avoidWith.some(name =>
    fish2.commonName.includes(name) || fish2.scientificName.includes(name) || fish2.arabicName.includes(name)
  )) {
    return false;
  }

  // Check if fish1 is in fish2's avoid list
  if (fish2.compatibility.avoidWith.some(name =>
    fish1.commonName.includes(name) || fish1.scientificName.includes(name) || fish1.arabicName.includes(name)
  )) {
    return false;
  }

  return true;
}

export function getTankSizeForFish(fishIds: string[]): number {
  let maxTankSize = 0;

  fishIds.forEach(id => {
    const fish = getFishById(id);
    if (fish && fish.minTankSize > maxTankSize) {
      maxTankSize = fish.minTankSize;
    }
  });

  return maxTankSize;
}

export function getWaterParameterRange(fishIds: string[]): {
  tempMin: number;
  tempMax: number;
  phMin: number;
  phMax: number;
} {
  const fishes = fishIds.map(id => getFishById(id)).filter(Boolean) as FishSpecies[];

  if (fishes.length === 0) {
    return { tempMin: 24, tempMax: 26, phMin: 7, phMax: 7.5 };
  }

  return {
    tempMin: Math.max(...fishes.map(f => f.waterParameters.tempMin)),
    tempMax: Math.min(...fishes.map(f => f.waterParameters.tempMax)),
    phMin: Math.max(...fishes.map(f => f.waterParameters.phMin)),
    phMax: Math.min(...fishes.map(f => f.waterParameters.phMax)),
  };
}
